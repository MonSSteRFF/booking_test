import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { BookingsService } from "../services/bookings.service";
import { BookingsController } from "./bookings.controller";

describe("BookingsController", () => {
	let controller: BookingsController;
	let bookingsService: jest.Mocked<BookingsService>;

	const mockBooking = {
		mongoId: "64f1a2b3c4d5e6f7a8b9c0d2",
		slotId: "64f1a2b3c4d5e6f7a8b9c0d1",
		slotTitle: "Йога",
		slotStartsAt: "2026-07-10T09:00:00Z",
		clientName: "Иван",
		clientEmail: "ivan@example.com",
		status: "ACTIVE",
		createdAt: "2026-07-06T10:30:00Z",
		updatedAt: "2026-07-06T10:30:00Z",
	};

	beforeEach(async () => {
		bookingsService = {
			findById: jest.fn(),
			cancel: jest.fn(),
			fetchMany: jest.fn(),
		} as any;

		const module: TestingModule = await Test.createTestingModule({
			controllers: [BookingsController],
			providers: [
				{
					provide: BookingsService,
					useValue: bookingsService,
				},
			],
		}).compile();

		controller = module.get<BookingsController>(BookingsController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("fetchMany", () => {
		it("should return paginated bookings", async () => {
			const dto = {
				pageIndex: 0,
				pageSize: 20,
				sorting: [{ id: "createdAt", desc: true }],
				columnFilters: [],
			} as any;
			const expected = { data: [mockBooking], totalCount: 1 };
			bookingsService.fetchMany.mockResolvedValue(expected);

			const result = await controller.fetchMany(dto);
			expect(result).toEqual(expected);
			expect(bookingsService.fetchMany).toHaveBeenCalledWith(dto);
		});
	});

	describe("fetchOne", () => {
		it("should return a booking by id", async () => {
			bookingsService.findById.mockResolvedValue(mockBooking as any);

			const result = await controller.fetchOne("some-id");
			expect(result).toEqual(mockBooking);
			expect(bookingsService.findById).toHaveBeenCalledWith("some-id");
		});

		it("should throw 404 if booking not found", async () => {
			bookingsService.findById.mockResolvedValue(null);
			await expect(controller.fetchOne("nonexistent")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("cancel", () => {
		it("should cancel a booking", async () => {
			const cancelled = { ...mockBooking, status: "CANCELLED" };
			bookingsService.cancel.mockResolvedValue(cancelled as any);

			const result = await controller.cancel("some-id");
			expect(result.status).toBe("CANCELLED");
			expect(bookingsService.cancel).toHaveBeenCalledWith("some-id");
		});
	});
});
