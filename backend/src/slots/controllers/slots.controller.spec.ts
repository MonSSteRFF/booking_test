import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { SlotsService } from "../services/slots.service";
import { SlotsController } from "./slots.controller";

describe("SlotsController", () => {
	let controller: SlotsController;
	let slotsService: jest.Mocked<SlotsService>;

	const mockSlot = {
		mongoId: "64f1a2b3c4d5e6f7a8b9c0d1",
		title: "Йога",
		startsAt: "2026-07-10T09:00:00Z",
		capacity: 10,
		bookedCount: 3,
		isActive: true,
		createdAt: "2026-07-01T12:00:00Z",
		updatedAt: "2026-07-05T08:30:00Z",
	};

	beforeEach(async () => {
		slotsService = {
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			deactivate: jest.fn(),
			bookSlot: jest.fn(),
			fetchMany: jest.fn(),
		} as any;

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SlotsController],
			providers: [
				{
					provide: SlotsService,
					useValue: slotsService,
				},
			],
		}).compile();

		controller = module.get<SlotsController>(SlotsController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("fetchMany", () => {
		it("should return paginated slots", async () => {
			const dto = {
				pageIndex: 0,
				pageSize: 10,
				sorting: [{ id: "createdAt", desc: true }],
				columnFilters: [],
			} as any;
			const expected = { data: [mockSlot], totalCount: 1 };
			slotsService.fetchMany.mockResolvedValue(expected);

			const result = await controller.fetchMany(dto);
			expect(result).toEqual(expected);
			expect(slotsService.fetchMany).toHaveBeenCalledWith(dto);
		});
	});

	describe("fetchOne", () => {
		it("should return a slot by id", async () => {
			slotsService.findById.mockResolvedValue(mockSlot as any);

			const result = await controller.fetchOne("some-id");
			expect(result).toEqual(mockSlot);
			expect(slotsService.findById).toHaveBeenCalledWith("some-id");
		});

		it("should throw 404 if slot not found", async () => {
			slotsService.findById.mockResolvedValue(null);

			await expect(controller.fetchOne("nonexistent")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("create", () => {
		it("should create a slot", async () => {
			const dto = {
				title: "Новый слот",
				startsAt: "2026-08-01T10:00:00Z",
				capacity: 20,
			};
			slotsService.create.mockResolvedValue(mockSlot as any);

			const result = await controller.create(dto);
			expect(result).toEqual(mockSlot);
			expect(slotsService.create).toHaveBeenCalledWith(dto);
		});
	});

	describe("update", () => {
		it("should update a slot", async () => {
			const dto = { capacity: 15 };
			slotsService.update.mockResolvedValue({
				...mockSlot,
				capacity: 15,
			} as any);

			const result = await controller.update("some-id", dto as any);
			expect(result.capacity).toBe(15);
			expect(slotsService.update).toHaveBeenCalledWith("some-id", dto);
		});
	});

	describe("deactivate", () => {
		it("should deactivate a slot", async () => {
			slotsService.deactivate.mockResolvedValue({
				...mockSlot,
				isActive: false,
			} as any);

			const result = await controller.deactivate("some-id");
			expect(result.isActive).toBe(false);
			expect(slotsService.deactivate).toHaveBeenCalledWith("some-id");
		});
	});

	describe("book", () => {
		it("should create a booking on a slot", async () => {
			const dto = {
				clientName: "Иван",
				clientEmail: "ivan@example.com",
			};
			slotsService.bookSlot.mockResolvedValue({
				mongoId: "booking-id",
				slotId: "slot-id",
				slotTitle: "Йога",
				slotStartsAt: "2026-07-10T09:00:00Z",
				clientName: "Иван",
				clientEmail: "ivan@example.com",
				status: "ACTIVE",
				createdAt: "2026-07-06T10:30:00Z",
				updatedAt: "2026-07-06T10:30:00Z",
			} as any);

			const result = await controller.book("slot-id", dto);
			expect(result.status).toBe("ACTIVE");
			expect(slotsService.bookSlot).toHaveBeenCalledWith("slot-id", dto);
		});
	});
});
