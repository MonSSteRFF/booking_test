import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import { Slot } from "../../slots/schemas/slot.schema";
import { SlotsClickhouseSyncService } from "../../slots/services/slots-clickhouse-sync.service";
import { Booking } from "../schemas/booking.schema";
import { BookingsService } from "./bookings.service";
import { BookingsClickhouseSyncService } from "./bookings-clickhouse-sync.service";

function makeSession() {
	return {
		startTransaction: jest.fn(),
		commitTransaction: jest.fn().mockResolvedValue(undefined),
		abortTransaction: jest.fn().mockResolvedValue(undefined),
		endSession: jest.fn(),
	};
}

describe("BookingsService", () => {
	let service: BookingsService;
	let bookingModel: any;
	let slotModel: any;
	let syncService: jest.Mocked<BookingsClickhouseSyncService>;
	let slotsSyncService: jest.Mocked<SlotsClickhouseSyncService>;
	let session: ReturnType<typeof makeSession>;

	const mockBookingData = {
		_id: "64f1a2b3c4d5e6f7a8b9c0d2",
		slotId: "64f1a2b3c4d5e6f7a8b9c0d1",
		slotTitle: "Йога",
		slotStartsAt: new Date("2026-07-10T09:00:00Z"),
		clientName: "Иван",
		clientEmail: "ivan@example.com",
		status: "ACTIVE",
		chSyncPending: false,
		createdAt: new Date("2026-07-06T10:30:00Z"),
		updatedAt: new Date("2026-07-06T10:30:00Z"),
	};

	const mockSlotData = {
		_id: "64f1a2b3c4d5e6f7a8b9c0d1",
		title: "Йога",
		startsAt: new Date("2026-07-10T09:00:00Z"),
		capacity: 10,
		bookedCount: 3,
		isActive: true,
	};

	function createBookingDoc(data: any) {
		return {
			...data,
			save: jest.fn().mockResolvedValue(data),
		};
	}

	beforeEach(async () => {
		session = makeSession();

		syncService = {
			syncOnWrite: jest.fn().mockResolvedValue(undefined),
			fetchBookings: jest.fn().mockResolvedValue({
				data: [mockBookingData],
				totalCount: 1,
			}),
		} as any;

		slotsSyncService = {
			syncOnWrite: jest.fn().mockResolvedValue(undefined),
		} as any;

		const mockBookingModel: any = jest.fn().mockImplementation((data) =>
			createBookingDoc({
				...mockBookingData,
				...data,
			}),
		);
		mockBookingModel.findById = jest.fn();
		mockBookingModel.findOne = jest.fn();
		mockBookingModel.find = jest.fn().mockResolvedValue([]);
		mockBookingModel.findByIdAndUpdate = jest.fn();
		mockBookingModel.db = {
			startSession: jest.fn().mockResolvedValue(session),
		};

		bookingModel = mockBookingModel;

		const mockSlotModel: any = jest.fn().mockImplementation((data) => ({
			...mockSlotData,
			...data,
			save: jest.fn(),
		}));
		mockSlotModel.findById = jest.fn();
		mockSlotModel.findByIdAndUpdate = jest.fn();
		slotModel = mockSlotModel;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BookingsService,
				{ provide: getModelToken(Booking.name), useValue: mockBookingModel },
				{ provide: getModelToken(Slot.name), useValue: mockSlotModel },
				{
					provide: BookingsClickhouseSyncService,
					useValue: syncService,
				},
				{
					provide: SlotsClickhouseSyncService,
					useValue: slotsSyncService,
				},
			],
		}).compile();

		service = module.get<BookingsService>(BookingsService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("findById", () => {
		it("should return a booking by id", async () => {
			bookingModel.findById.mockResolvedValue(mockBookingData);
			const result = await service.findById("some-id");
			expect(bookingModel.findById).toHaveBeenCalledWith("some-id");
			expect(result).toEqual(mockBookingData);
		});

		it("should return null when not found", async () => {
			bookingModel.findById.mockResolvedValue(null);
			const result = await service.findById("nonexistent");
			expect(result).toBeNull();
		});
	});

	describe("cancel", () => {
		it("should cancel and decrement bookedCount", async () => {
			const bookingDoc = createBookingDoc({ ...mockBookingData });
			bookingModel.findById.mockResolvedValue(bookingDoc);
			const updatedSlot = { ...mockSlotData, bookedCount: 2 };
			slotModel.findByIdAndUpdate.mockResolvedValue(updatedSlot);

			const result = await service.cancel("some-id");
			expect(result.status).toBe("CANCELLED");
			expect(result.chSyncPending).toBe(true);
			expect(bookingDoc.save).toHaveBeenCalled();
			expect(slotModel.findByIdAndUpdate).toHaveBeenCalledWith(
				mockBookingData.slotId,
				{ $inc: { bookedCount: -1 }, chSyncPending: true },
				{ new: true, session },
			);
			expect(session.commitTransaction).toHaveBeenCalled();
			expect(syncService.syncOnWrite).toHaveBeenCalled();
			expect(slotsSyncService.syncOnWrite).toHaveBeenCalled();
		});

		it("should be idempotent when booking is already cancelled", async () => {
			const cancelledDoc = createBookingDoc({
				...mockBookingData,
				status: "CANCELLED",
			});
			bookingModel.findById.mockResolvedValue(cancelledDoc);

			const result = await service.cancel("some-id");
			expect(result.status).toBe("CANCELLED");
			expect(slotModel.findByIdAndUpdate).not.toHaveBeenCalled();
			expect(session.commitTransaction).not.toHaveBeenCalled();
		});

		it("should throw 404 if booking not found", async () => {
			bookingModel.findById.mockResolvedValue(null);
			await expect(service.cancel("nonexistent")).rejects.toThrow(
				NotFoundException,
			);
		});

		it("should work even if sync fails", async () => {
			syncService.syncOnWrite.mockRejectedValue(new Error("CH down"));
			const bookingDoc = createBookingDoc({ ...mockBookingData });
			bookingModel.findById.mockResolvedValue(bookingDoc);
			slotModel.findByIdAndUpdate.mockResolvedValue({
				...mockSlotData,
				bookedCount: 2,
			});

			const result = await service.cancel("some-id");
			expect(result.status).toBe("CANCELLED");
		});
	});

	describe("fetchMany", () => {
		it("should delegate to sync service", async () => {
			const dto = {
				pageIndex: 0,
				pageSize: 20,
				sorting: [{ id: "createdAt", desc: true }],
				columnFilters: [],
			} as any;

			const result = await service.fetchMany(dto);
			expect(syncService.fetchBookings).toHaveBeenCalledWith(dto);
			expect(result.data).toHaveLength(1);
			expect(result.totalCount).toBe(1);
		});
	});
});
