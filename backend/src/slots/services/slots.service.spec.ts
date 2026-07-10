import { ConflictException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import { Booking } from "../../bookings/schemas/booking.schema";
import { BookingsClickhouseSyncService } from "../../bookings/services/bookings-clickhouse-sync.service";
import { Slot } from "../schemas/slot.schema";
import { SlotsService } from "./slots.service";
import { SlotsClickhouseSyncService } from "./slots-clickhouse-sync.service";

function makeSession() {
	const abortTransaction = jest.fn().mockResolvedValue(undefined);
	return {
		startTransaction: jest.fn(),
		commitTransaction: jest.fn().mockResolvedValue(undefined),
		abortTransaction,
		endSession: jest.fn(),
	};
}

describe("SlotsService", () => {
	let service: SlotsService;
	let slotModel: any;
	let bookingModel: any;
	let syncService: jest.Mocked<SlotsClickhouseSyncService>;
	let bookingSyncService: jest.Mocked<BookingsClickhouseSyncService>;
	let session: ReturnType<typeof makeSession>;

	const mockSlotData = {
		_id: "64f1a2b3c4d5e6f7a8b9c0d1",
		title: "Йога",
		startsAt: new Date("2026-07-10T09:00:00Z"),
		capacity: 10,
		bookedCount: 0,
		isActive: true,
		chSyncPending: true,
		createdAt: new Date("2026-07-01T12:00:00Z"),
		updatedAt: new Date("2026-07-01T12:00:00Z"),
	};

	const mockBookingData = {
		_id: "64f1a2b3c4d5e6f7a8b9c0d2",
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

	function createMockDocument(data: any) {
		data.save = jest.fn().mockResolvedValue(data);
		return data;
	}

	beforeEach(async () => {
		session = makeSession();

		syncService = {
			syncOnWrite: jest.fn().mockResolvedValue(undefined),
			backgroundSync: jest.fn().mockResolvedValue(undefined),
			fetchSlots: jest.fn().mockResolvedValue({
				data: [mockSlotData],
				totalCount: 1,
			}),
			onModuleInit: jest.fn().mockResolvedValue(undefined),
		} as any;

		bookingSyncService = {
			syncOnWrite: jest.fn().mockResolvedValue(undefined),
			backgroundSync: jest.fn().mockResolvedValue(undefined),
			fetchBookings: jest.fn().mockResolvedValue({
				data: [mockBookingData],
				totalCount: 1,
			}),
			onModuleInit: jest.fn().mockResolvedValue(undefined),
		} as any;

		const mockBookingModel: any = jest.fn().mockImplementation((data) =>
			createMockDocument({
				...mockBookingData,
				...data,
				_id: "64f1a2b3c4d5e6f7a8b9c0d2",
			}),
		);
		mockBookingModel.findById = jest.fn();
		mockBookingModel.findOne = jest.fn();
		mockBookingModel.find = jest.fn().mockResolvedValue([]);
		mockBookingModel.findByIdAndUpdate = jest.fn();
		mockBookingModel.findOneAndUpdate = jest.fn();

		const mockSlotModel: any = jest.fn().mockImplementation((data) =>
			createMockDocument({
				...mockSlotData,
				...data,
				_id: "64f1a2b3c4d5e6f7a8b9c0d1",
			}),
		);
		mockSlotModel.findById = jest.fn();
		mockSlotModel.findByIdAndUpdate = jest.fn();
		mockSlotModel.findOneAndUpdate = jest.fn();
		mockSlotModel.findOne = jest.fn();
		mockSlotModel.find = jest.fn().mockResolvedValue([]);
		mockSlotModel.db = { startSession: jest.fn().mockResolvedValue(session) };

		slotModel = mockSlotModel;
		bookingModel = mockBookingModel;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SlotsService,
				{ provide: getModelToken(Slot.name), useValue: mockSlotModel },
				{ provide: getModelToken(Booking.name), useValue: mockBookingModel },
				{ provide: SlotsClickhouseSyncService, useValue: syncService },
				{
					provide: BookingsClickhouseSyncService,
					useValue: bookingSyncService,
				},
			],
		}).compile();

		service = module.get<SlotsService>(SlotsService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("findById", () => {
		it("should return a slot by id", async () => {
			slotModel.findById.mockResolvedValue(mockSlotData);
			const result = await service.findById("some-id");
			expect(slotModel.findById).toHaveBeenCalledWith("some-id");
			expect(result).toEqual(mockSlotData);
		});

		it("should return null when slot not found", async () => {
			slotModel.findById.mockResolvedValue(null);
			const result = await service.findById("nonexistent");
			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("should create a slot and sync", async () => {
			const dto = {
				title: "Новый слот",
				startsAt: "2026-08-01T10:00:00Z",
				capacity: 20,
			};
			const saved = await service.create(dto);
			expect(saved.title).toBe(dto.title);
			expect(saved.capacity).toBe(dto.capacity);
			expect(syncService.syncOnWrite).toHaveBeenCalled();
		});

		it("should create slot even if sync fails", async () => {
			syncService.syncOnWrite.mockRejectedValue(new Error("CH down"));
			const dto = {
				title: "Новый слот",
				startsAt: "2026-08-01T10:00:00Z",
				capacity: 20,
			};
			const saved = await service.create(dto);
			expect(saved.title).toBe(dto.title);
		});
	});

	describe("update", () => {
		it("should update a slot", async () => {
			const existing = { ...mockSlotData, bookedCount: 3 };
			slotModel.findById.mockResolvedValue(createMockDocument(existing));

			const dto = { capacity: 5 };
			const result = await service.update("some-id", dto as any);
			expect(result.capacity).toBe(5);
			expect(result.chSyncPending).toBe(true);
			expect(syncService.syncOnWrite).toHaveBeenCalled();
		});

		it("should throw 404 if slot not found", async () => {
			slotModel.findById.mockResolvedValue(null);
			await expect(
				service.update("nonexistent", { title: "x" } as any),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw CAPACITY_BELOW_BOOKED if capacity below bookedCount", async () => {
			const existing = { ...mockSlotData, bookedCount: 8 };
			slotModel.findById.mockResolvedValue(createMockDocument(existing));

			await expect(
				service.update("some-id", { capacity: 5 } as any),
			).rejects.toThrow(ConflictException);

			try {
				await service.update("some-id", { capacity: 5 } as any);
			} catch (e: any) {
				expect(e.response.details.code).toBe("CAPACITY_BELOW_BOOKED");
			}
		});

		it("should update slot even if sync fails", async () => {
			syncService.syncOnWrite.mockRejectedValue(new Error("CH down"));
			slotModel.findById.mockResolvedValue(
				createMockDocument({ ...mockSlotData }),
			);
			const result = await service.update("some-id", {
				title: "Updated",
			} as any);
			expect(result.title).toBe("Updated");
		});
	});

	describe("deactivate", () => {
		it("should deactivate a slot", async () => {
			const updated = { ...mockSlotData, isActive: false };
			slotModel.findByIdAndUpdate.mockResolvedValue(
				createMockDocument(updated),
			);

			const result = await service.deactivate("some-id");
			expect(result.isActive).toBe(false);
			expect(slotModel.findByIdAndUpdate).toHaveBeenCalledWith(
				"some-id",
				{ isActive: false, chSyncPending: true },
				{ new: true },
			);
			expect(syncService.syncOnWrite).toHaveBeenCalled();
		});

		it("should throw 404 if slot not found", async () => {
			slotModel.findByIdAndUpdate.mockResolvedValue(null);
			await expect(service.deactivate("nonexistent")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("bookSlot", () => {
		const bookDto = {
			clientName: "Иван Иванов",
			clientEmail: "ivan@example.com",
		};

		it("should create a booking successfully", async () => {
			const slotDoc = createMockDocument({ ...mockSlotData, bookedCount: 2 });
			slotModel.findById.mockResolvedValue(slotDoc);
			bookingModel.findOne.mockResolvedValue(null);
			slotModel.findOneAndUpdate.mockResolvedValue(
				createMockDocument({ ...mockSlotData, bookedCount: 3 }),
			);

			const result = await service.bookSlot(
				"64f1a2b3c4d5e6f7a8b9c0d1",
				bookDto,
			);
			expect(result.clientName).toBe("Иван Иванов");
			expect(result.clientEmail).toBe("ivan@example.com");
			expect(result.status).toBe("ACTIVE");
			expect(session.commitTransaction).toHaveBeenCalled();
			expect(syncService.syncOnWrite).toHaveBeenCalled();
			expect(bookingSyncService.syncOnWrite).toHaveBeenCalled();
		});

		it("should throw 404 if slot not found", async () => {
			slotModel.findById.mockResolvedValue(null);
			await expect(service.bookSlot("nonexistent", bookDto)).rejects.toThrow(
				NotFoundException,
			);
		});

		it("should throw SLOT_FULL when slot is full", async () => {
			const slotDoc = createMockDocument({
				...mockSlotData,
				bookedCount: 10,
				capacity: 10,
			});
			slotModel.findById.mockResolvedValue(slotDoc);

			try {
				await service.bookSlot("some-id", bookDto);
			} catch (e: any) {
				expect(e.response.details.code).toBe("SLOT_FULL");
			}
		});

		it("should throw SLOT_INACTIVE when slot is inactive", async () => {
			const slotDoc = createMockDocument({
				...mockSlotData,
				bookedCount: 2,
				capacity: 10,
				isActive: false,
			});
			slotModel.findById.mockResolvedValue(slotDoc);

			try {
				await service.bookSlot("some-id", bookDto);
			} catch (e: any) {
				expect(e.response.details.code).toBe("SLOT_INACTIVE");
			}
		});

		it("should throw ALREADY_BOOKED when client already has active booking", async () => {
			const slotDoc = createMockDocument({ ...mockSlotData, bookedCount: 2 });
			slotModel.findById.mockResolvedValue(slotDoc);
			bookingModel.findOne.mockResolvedValue(mockBookingData);

			try {
				await service.bookSlot("some-id", bookDto);
			} catch (e: any) {
				expect(e.response.details.code).toBe("ALREADY_BOOKED");
			}
		});

		it("should check 409 codes in correct order: SLOT_FULL > SLOT_INACTIVE > ALREADY_BOOKED", async () => {
			const slotDoc = createMockDocument({
				...mockSlotData,
				bookedCount: 10,
				capacity: 10,
				isActive: false,
			});
			slotModel.findById.mockResolvedValue(slotDoc);

			try {
				await service.bookSlot("some-id", bookDto);
				fail("Should have thrown");
			} catch (e: any) {
				expect(e.response.details.code).toBe("SLOT_FULL");
			}
		});

		it("should handle race condition where slot becomes full between check and update", async () => {
			const slotDoc = createMockDocument({
				...mockSlotData,
				bookedCount: 9,
				capacity: 10,
			});
			slotModel.findById.mockResolvedValue(slotDoc);
			bookingModel.findOne.mockResolvedValue(null);
			slotModel.findOneAndUpdate.mockResolvedValue(null);
			slotModel.findById.mockResolvedValueOnce(slotDoc).mockResolvedValueOnce({
				...mockSlotData,
				bookedCount: 10,
				capacity: 10,
				isActive: true,
			});

			try {
				await service.bookSlot("some-id", bookDto);
				fail("Should have thrown");
			} catch (e: any) {
				expect(e.response.details.code).toBe("SLOT_FULL");
				expect(session.abortTransaction).toHaveBeenCalled();
			}
		});

		it("should handle race condition where slot becomes inactive between check and update", async () => {
			const slotDoc = createMockDocument({
				...mockSlotData,
				bookedCount: 5,
				capacity: 10,
			});
			slotModel.findById.mockResolvedValue(slotDoc);
			bookingModel.findOne.mockResolvedValue(null);
			slotModel.findOneAndUpdate.mockResolvedValue(null);
			slotModel.findById.mockResolvedValueOnce(slotDoc).mockResolvedValueOnce({
				...mockSlotData,
				bookedCount: 5,
				capacity: 10,
				isActive: false,
			});

			try {
				await service.bookSlot("some-id", bookDto);
				fail("Should have thrown");
			} catch (e: any) {
				expect(e.response.details.code).toBe("SLOT_INACTIVE");
				expect(session.abortTransaction).toHaveBeenCalled();
			}
		});

		it("should lowercase client email on booking", async () => {
			const slotDoc = createMockDocument({ ...mockSlotData, bookedCount: 2 });
			slotModel.findById.mockResolvedValue(slotDoc);
			bookingModel.findOne.mockResolvedValue(null);
			slotModel.findOneAndUpdate.mockResolvedValue(
				createMockDocument({ ...mockSlotData, bookedCount: 3 }),
			);

			const result = await service.bookSlot("some-id", {
				clientName: "Иван",
				clientEmail: "IVAN@EXAMPLE.COM",
			});
			expect(result.clientEmail).toBe("ivan@example.com");
		});

		it("should abort transaction on error", async () => {
			const slotDoc = createMockDocument({ ...mockSlotData, bookedCount: 2 });
			slotModel.findById.mockResolvedValue(slotDoc);
			bookingModel.findOne.mockResolvedValue(null);
			slotModel.findOneAndUpdate.mockRejectedValue(new Error("DB error"));

			await expect(service.bookSlot("some-id", bookDto)).rejects.toThrow(
				"DB error",
			);
			expect(session.abortTransaction).toHaveBeenCalled();
		});
	});

	describe("fetchMany", () => {
		it("should delegate to sync service", async () => {
			const fetchDto = {
				pageIndex: 0,
				pageSize: 10,
				sorting: [{ id: "createdAt", desc: true }],
				columnFilters: [],
			} as any;

			const result = await service.fetchMany(fetchDto);
			expect(syncService.fetchSlots).toHaveBeenCalledWith(fetchDto);
			expect(result.data).toHaveLength(1);
			expect(result.totalCount).toBe(1);
		});
	});
});
