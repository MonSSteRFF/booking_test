import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import { Booking } from "../schemas/booking.schema";

jest.mock("@clickhouse/client", () => ({
	createClient: jest.fn(() => ({
		exec: jest.fn().mockResolvedValue(undefined),
		insert: jest.fn().mockResolvedValue(undefined),
		query: jest.fn(),
		close: jest.fn(),
	})),
}));

jest.mock("ioredis", () => {
	return jest.fn(() => ({
		set: jest.fn(),
		del: jest.fn(),
		get: jest.fn(),
	}));
});

import { BookingsClickhouseSyncService } from "./bookings-clickhouse-sync.service";

describe("BookingsClickhouseSyncService", () => {
	let service: BookingsClickhouseSyncService;
	let chClient: any;
	let redis: any;
	let bookingModel: any;

	const mockBookingData = {
		_id: { toString: () => "64f1a2b3c4d5e6f7a8b9c0d2" },
		slotId: "64f1a2b3c4d5e6f7a8b9c0d1",
		slotTitle: "Йога",
		slotStartsAt: new Date("2026-07-10T09:00:00Z"),
		clientName: "Иван",
		clientEmail: "ivan@example.com",
		status: "ACTIVE",
		chSyncPending: true,
		createdAt: new Date("2026-07-06T10:30:00Z"),
		updatedAt: new Date("2026-07-06T10:30:00Z"),
	};

	beforeEach(async () => {
		bookingModel = {
			find: jest.fn(),
			findById: jest.fn(),
			updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
			updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BookingsClickhouseSyncService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string) => {
							if (key === "clickhouseUrl") return "http://clickhouse:8123";
							if (key === "redisUrl") return "redis://redis:6379";
							return undefined;
						}),
					},
				},
				{ provide: getModelToken(Booking.name), useValue: bookingModel },
			],
		}).compile();

		service = module.get<BookingsClickhouseSyncService>(
			BookingsClickhouseSyncService,
		);

		chClient = (service as any).chClient;
		redis = (service as any).redis;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("onModuleInit", () => {
		it("should create database and bookings table", async () => {
			await service.onModuleInit();
			expect(chClient.exec).toHaveBeenCalledWith({
				query: "CREATE DATABASE IF NOT EXISTS booking_app",
			});
			expect(chClient.exec).toHaveBeenCalledWith({
				query: expect.stringContaining(
					"CREATE TABLE IF NOT EXISTS booking_app.bookings",
				),
			});
		});
	});

	describe("syncOnWrite", () => {
		it("should insert booking data and reset flag on success", async () => {
			await service.syncOnWrite(mockBookingData as any);
			expect(chClient.insert).toHaveBeenCalledWith({
				table: "booking_app.bookings",
				values: [
					{
						mongo_id: "64f1a2b3c4d5e6f7a8b9c0d2",
						slot_mongo_id: "64f1a2b3c4d5e6f7a8b9c0d1",
						slot_title: "Йога",
						slot_starts_at: mockBookingData.slotStartsAt,
						client_name: "Иван",
						client_email: "ivan@example.com",
						status: "ACTIVE",
						created_at: mockBookingData.createdAt,
						updated_at: mockBookingData.updatedAt,
					},
				],
				format: "JSONEachRow",
			});
			expect(bookingModel.updateOne).toHaveBeenCalledWith(
				{ _id: mockBookingData._id },
				{ chSyncPending: false },
			);
		});

		it("should not reset flag on CH error", async () => {
			chClient.insert.mockRejectedValue(new Error("CH error"));
			await service.syncOnWrite(mockBookingData as any);
			expect(bookingModel.updateOne).not.toHaveBeenCalled();
		});

		it("should sync cancelled status", async () => {
			await service.syncOnWrite({
				...mockBookingData,
				status: "CANCELLED",
			} as any);
			const insertedValue = chClient.insert.mock.calls[0][0].values[0];
			expect(insertedValue.status).toBe("CANCELLED");
		});
	});

	describe("backgroundSync", () => {
		it("should skip if lock not acquired", async () => {
			redis.set.mockResolvedValue(null);
			await service.backgroundSync();
			expect(bookingModel.find).not.toHaveBeenCalled();
		});

		it("should sync pending bookings", async () => {
			redis.set.mockResolvedValue("OK");
			bookingModel.find.mockReturnValue({
				exec: jest.fn().mockResolvedValue([mockBookingData]),
			});

			await service.backgroundSync();
			expect(chClient.insert).toHaveBeenCalled();
			expect(bookingModel.updateMany).toHaveBeenCalled();
		});

		it("should do nothing if no pending bookings", async () => {
			redis.set.mockResolvedValue("OK");
			bookingModel.find.mockReturnValue({
				exec: jest.fn().mockResolvedValue([]),
			});
			await service.backgroundSync();
			expect(chClient.insert).not.toHaveBeenCalled();
		});
	});

	describe("fetchBookings", () => {
		function mockChQuery(resultData: any[]) {
			chClient.query.mockImplementation(async ({ query }: any) => {
				const isCount = query.includes("count()");
				return {
					json: async () => ({
						data: isCount ? [{ total: String(resultData.length) }] : resultData,
					}),
				};
			});
		}

		const bookingRow = {
			mongo_id: "64f1a2b3c4d5e6f7a8b9c0d2",
			slot_mongo_id: "64f1a2b3c4d5e6f7a8b9c0d1",
			slot_title: "Йога",
			slot_starts_at: "2026-07-10T09:00:00Z",
			client_name: "Иван",
			client_email: "ivan@example.com",
			status: "ACTIVE",
			created_at: "2026-07-06T10:30:00Z",
			updated_at: "2026-07-06T10:30:00Z",
		};

		it("should return mapped bookings", async () => {
			mockChQuery([bookingRow]);
			const result = await (service as any).fetchBookings({
				pageIndex: 0,
				pageSize: 20,
				sorting: [{ id: "createdAt", desc: true }],
				columnFilters: [],
			});
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toEqual({
				mongoId: "64f1a2b3c4d5e6f7a8b9c0d2",
				slotId: "64f1a2b3c4d5e6f7a8b9c0d1",
				slotTitle: "Йога",
				slotStartsAt: "2026-07-10T09:00:00Z",
				clientName: "Иван",
				clientEmail: "ivan@example.com",
				status: "ACTIVE",
				createdAt: "2026-07-06T10:30:00Z",
				updatedAt: "2026-07-06T10:30:00Z",
			});
			expect(result.totalCount).toBe(1);
		});

		it("should apply status filter", async () => {
			mockChQuery([bookingRow]);
			await (service as any).fetchBookings({
				pageIndex: 0,
				pageSize: 20,
				sorting: [],
				columnFilters: [{ id: "status", value: ["ACTIVE"], filterFn: "in" }],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain("status = {p0:String}");
			expect(queryCall[0].query_params.p0).toBe("ACTIVE");
		});

		it("should apply clientEmail filter", async () => {
			mockChQuery([bookingRow]);
			await (service as any).fetchBookings({
				pageIndex: 0,
				pageSize: 20,
				sorting: [],
				columnFilters: [
					{
						id: "clientEmail",
						value: "ivan@example.com",
						filterFn: "contains",
					},
				],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain(
				"client_email LIKE {p0:String}",
			);
			expect(queryCall[0].query_params.p0).toBe("%ivan@example.com%");
		});

		it("should apply dateRange filter on created_at", async () => {
			mockChQuery([bookingRow]);
			await (service as any).fetchBookings({
				pageIndex: 0,
				pageSize: 20,
				sorting: [],
				columnFilters: [],
				dateRange: {
					from: "2026-07-01T00:00:00Z",
					to: "2026-07-06T23:59:59Z",
					field: "created_at",
				},
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain(
				"created_at >= {p0:DateTime}",
			);
			expect(queryCall[0].query).toContain(
				"created_at <= {p1:DateTime}",
			);
			expect(queryCall[0].query_params.p0).toBe("2026-07-01T00:00:00Z");
			expect(queryCall[0].query_params.p1).toBe("2026-07-06T23:59:59Z");
		});

		it("should use FINAL modifier", async () => {
			mockChQuery([bookingRow]);
			await (service as any).fetchBookings({
				pageIndex: 0,
				pageSize: 20,
				sorting: [],
				columnFilters: [],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain("FINAL");
		});

		it("should paginate correctly", async () => {
			mockChQuery([]);
			await (service as any).fetchBookings({
				pageIndex: 1,
				pageSize: 10,
				sorting: [],
				columnFilters: [],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain("LIMIT {limit:UInt32} OFFSET {offset:UInt32}");
			expect(queryCall[0].query_params.limit).toBe(10);
			expect(queryCall[0].query_params.offset).toBe(10);
		});
	});
});
