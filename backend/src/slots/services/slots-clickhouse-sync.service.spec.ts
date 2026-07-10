import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import { Slot } from "../schemas/slot.schema";

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

import { SlotsClickhouseSyncService } from "./slots-clickhouse-sync.service";

describe("SlotsClickhouseSyncService", () => {
	let service: SlotsClickhouseSyncService;
	let chClient: any;
	let redis: any;
	let slotModel: any;

	const mockSlotData = {
		_id: { toString: () => "64f1a2b3c4d5e6f7a8b9c0d1" },
		title: "Йога",
		startsAt: new Date("2026-07-10T09:00:00Z"),
		capacity: 10,
		bookedCount: 3,
		isActive: true,
		chSyncPending: true,
		createdAt: new Date("2026-07-01T12:00:00Z"),
		updatedAt: new Date("2026-07-05T08:30:00Z"),
	};

	beforeEach(async () => {
		slotModel = {
			find: jest.fn(),
			findById: jest.fn(),
			updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
			updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SlotsClickhouseSyncService,
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
				{ provide: getModelToken(Slot.name), useValue: slotModel },
			],
		}).compile();

		service = module.get<SlotsClickhouseSyncService>(
			SlotsClickhouseSyncService,
		);

		// Use the service's internal CH client and Redis instances (created via jest.mock)
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
		it("should create database and table", async () => {
			await service.onModuleInit();
			expect(chClient.exec).toHaveBeenCalledWith({
				query: "CREATE DATABASE IF NOT EXISTS booking_app",
			});
			expect(chClient.exec).toHaveBeenCalledWith({
				query: expect.stringContaining(
					"CREATE TABLE IF NOT EXISTS booking_app.slots",
				),
			});
		});
	});

	describe("syncOnWrite", () => {
		it("should insert slot data and reset flag on success", async () => {
			await service.syncOnWrite(mockSlotData as any);
			expect(chClient.insert).toHaveBeenCalledWith({
				table: "booking_app.slots",
				values: [
					{
						mongo_id: "64f1a2b3c4d5e6f7a8b9c0d1",
						title: "Йога",
						starts_at: mockSlotData.startsAt,
						capacity: 10,
						booked_count: 3,
						is_active: 1,
						created_at: mockSlotData.createdAt,
						updated_at: mockSlotData.updatedAt,
					},
				],
				format: "JSONEachRow",
			});
			expect(slotModel.updateOne).toHaveBeenCalledWith(
				{ _id: mockSlotData._id },
				{ chSyncPending: false },
			);
		});

		it("should not reset flag on CH error", async () => {
			chClient.insert.mockRejectedValue(new Error("CH error"));
			await service.syncOnWrite(mockSlotData as any);
			expect(slotModel.updateOne).not.toHaveBeenCalled();
		});

		it("should set is_active to 0 for inactive slot", async () => {
			await service.syncOnWrite({
				...mockSlotData,
				isActive: false,
			} as any);
			const insertCall = chClient.insert.mock.calls[0][0];
			const insertedValue = insertCall.values[0];
			expect(insertedValue.is_active).toBe(0);
		});
	});

	describe("backgroundSync", () => {
		it("should skip if lock not acquired", async () => {
			redis.set.mockResolvedValue(null);
			await service.backgroundSync();
			expect(slotModel.find).not.toHaveBeenCalled();
		});

		it("should sync pending slots and reset flags", async () => {
			redis.set.mockResolvedValue("OK");
			slotModel.find.mockReturnValue({
				exec: jest.fn().mockResolvedValue([mockSlotData]),
			});

			await service.backgroundSync();
			expect(chClient.insert).toHaveBeenCalled();
			expect(slotModel.updateMany).toHaveBeenCalled();
		});

		it("should do nothing if no pending slots", async () => {
			redis.set.mockResolvedValue("OK");
			slotModel.find.mockReturnValue({
				exec: jest.fn().mockResolvedValue([]),
			});

			await service.backgroundSync();
			expect(chClient.insert).not.toHaveBeenCalled();
		});
	});

	describe("fetchSlots", () => {
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

		const slotRow = {
			mongo_id: "64f1a2b3c4d5e6f7a8b9c0d1",
			title: "Йога",
			starts_at: "2026-07-10T09:00:00Z",
			capacity: "10",
			booked_count: "3",
			is_active: 1,
			created_at: "2026-07-01T12:00:00Z",
			updated_at: "2026-07-05T08:30:00Z",
		};

		it("should return empty result", async () => {
			mockChQuery([]);
			const result = await (service as any).fetchSlots({
				pageIndex: 0,
				pageSize: 10,
				sorting: [],
				columnFilters: [],
			});
			expect(result.data).toEqual([]);
			expect(result.totalCount).toBe(0);
		});

		it("should return mapped slots", async () => {
			mockChQuery([slotRow]);
			const result = await (service as any).fetchSlots({
				pageIndex: 0,
				pageSize: 10,
				sorting: [{ id: "createdAt", desc: true }],
				columnFilters: [],
			});
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toEqual({
				mongoId: "64f1a2b3c4d5e6f7a8b9c0d1",
				title: "Йога",
				startsAt: "2026-07-10T09:00:00Z",
				capacity: "10",
				bookedCount: "3",
				isActive: true,
				createdAt: "2026-07-01T12:00:00Z",
				updatedAt: "2026-07-05T08:30:00Z",
			});
			expect(result.totalCount).toBe(1);
		});

		it("should apply isActive filter", async () => {
			mockChQuery([slotRow]);
			await (service as any).fetchSlots({
				pageIndex: 0,
				pageSize: 10,
				sorting: [],
				columnFilters: [{ id: "isActive", value: ["true"], filterFn: "in" }],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain("is_active = {p0:UInt8}");
			expect(queryCall[0].query_params.p0).toBe(1);
		});

		it("should apply title contains filter", async () => {
			mockChQuery([slotRow]);
			await (service as any).fetchSlots({
				pageIndex: 0,
				pageSize: 10,
				sorting: [],
				columnFilters: [{ id: "title", value: "йога", filterFn: "contains" }],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain("title LIKE {p0:String}");
			expect(queryCall[0].query_params.p0).toBe("%йога%");
		});

		it("should apply dateRange filter", async () => {
			mockChQuery([slotRow]);
			await (service as any).fetchSlots({
				pageIndex: 0,
				pageSize: 10,
				sorting: [],
				columnFilters: [],
				dateRange: {
					from: "2026-07-01T00:00:00Z",
					to: "2026-07-06T23:59:59Z",
					field: "created_at",
					timezone: "Europe/Moscow",
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
			mockChQuery([slotRow]);
			await (service as any).fetchSlots({
				pageIndex: 0,
				pageSize: 10,
				sorting: [],
				columnFilters: [],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain("FINAL");
		});

		it("should paginate with LIMIT and OFFSET", async () => {
			mockChQuery([]);
			await (service as any).fetchSlots({
				pageIndex: 2,
				pageSize: 5,
				sorting: [],
				columnFilters: [],
			});
			const queryCall = chClient.query.mock.calls.find(
				(c: any) => !c[0].query.includes("count()"),
			);
			expect(queryCall[0].query).toContain("LIMIT {limit:UInt32} OFFSET {offset:UInt32}");
			expect(queryCall[0].query_params.limit).toBe(5);
			expect(queryCall[0].query_params.offset).toBe(10);
		});
	});
});
