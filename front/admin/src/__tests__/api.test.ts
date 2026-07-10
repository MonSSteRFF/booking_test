import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the client module so tests don't make real HTTP calls
vi.mock("../api/client", () => {
	const GET = vi.fn();
	const POST = vi.fn();
	const PATCH = vi.fn();
	return {
		default: { GET, POST, PATCH, use: vi.fn() },
	};
});

const client = (await import("../api/client")).default;

import { login } from "../api/auth";
import {
	bookSlot,
	cancelBooking,
	fetchBookingById,
	fetchBookings,
} from "../api/bookings";
import {
	createSlot,
	deactivateSlot,
	fetchSlotById,
	fetchSlots,
	updateSlot,
} from "../api/slots";

const token = "test-jwt-token";
const slotData = {
	mongoId: "64f1a2b3c4d5e6f7a8b9c0d1",
	title: "Test Slot",
	startsAt: "2026-07-10T09:00:00Z",
	capacity: 10,
	bookedCount: 0,
	isActive: true,
	createdAt: "2026-07-01T12:00:00Z",
	updatedAt: "2026-07-01T12:00:00Z",
};

const bookingData = {
	mongoId: "64f1a2b3c4d5e6f7a8b9c0d2",
	slotId: "64f1a2b3c4d5e6f7a8b9c0d1",
	slotTitle: "Test Slot",
	slotStartsAt: "2026-07-10T09:00:00Z",
	clientName: "Ivan",
	clientEmail: "ivan@example.com",
	status: "ACTIVE",
	createdAt: "2026-07-06T10:30:00Z",
	updatedAt: "2026-07-06T10:30:00Z",
};

beforeEach(() => {
	localStorage.setItem("token", token);
	vi.clearAllMocks();
});

afterEach(() => {
	localStorage.clear();
});

describe("auth API", () => {
	it("should POST /auth/login and return token", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: { token: "jwt-abc" },
			error: undefined,
		});

		const result = await login("admin", "admin123");
		expect(result).toBe("jwt-abc");

		expect(client.POST).toHaveBeenCalledWith("/auth/login", {
			body: { login: "admin", password: "admin123" },
		});
	});

	it("should throw on auth error", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: undefined,
			error: { status: 401 },
		});

		await expect(login("admin", "wrong")).rejects.toThrow();
	});
});

describe("slots API", () => {
	it("should POST /slots/fetch/many", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: { data: [slotData], totalCount: 1 },
			error: undefined,
		});

		const params = {
			pageIndex: 0,
			pageSize: 10,
			sorting: [{ id: "createdAt", desc: true }],
			columnFilters: [],
		};
		const result = await fetchSlots(params);
		expect(result.data).toHaveLength(1);
		expect(result.totalCount).toBe(1);
		expect(result.data[0].title).toBe("Test Slot");

		expect(client.POST).toHaveBeenCalledWith("/slots/fetch/many", {
			body: params,
		});
	});

	it("should GET /slots/fetch/one/{id}", async () => {
		(client.GET as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: slotData,
			error: undefined,
		});

		const result = await fetchSlotById("64f1a2b3c4d5e6f7a8b9c0d1");
		expect(result.mongoId).toBe("64f1a2b3c4d5e6f7a8b9c0d1");

		expect(client.GET).toHaveBeenCalledWith("/slots/fetch/one/{id}", {
			params: { path: { id: "64f1a2b3c4d5e6f7a8b9c0d1" } },
		});
	});

	it("should POST /slots to create", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: slotData,
			error: undefined,
		});

		const result = await createSlot({
			title: "New Slot",
			startsAt: "2026-08-01T10:00:00Z",
			capacity: 20,
		});
		expect(result.title).toBe("Test Slot");

		expect(client.POST).toHaveBeenCalledWith("/slots", {
			body: {
				title: "New Slot",
				startsAt: "2026-08-01T10:00:00Z",
				capacity: 20,
			},
		});
	});

	it("should PATCH /slots/{id} to update", async () => {
		(client.PATCH as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: slotData,
			error: undefined,
		});

		const result = await updateSlot("64f1a2b3c4d5e6f7a8b9c0d1", {
			title: "Updated",
		});
		expect(result).toBeDefined();

		expect(client.PATCH).toHaveBeenCalledWith("/slots/{id}", {
			params: { path: { id: "64f1a2b3c4d5e6f7a8b9c0d1" } },
			body: { title: "Updated" },
		});
	});

	it("should POST /slots/{id}/deactivate", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: { ...slotData, isActive: false },
			error: undefined,
		});

		const result = await deactivateSlot("64f1a2b3c4d5e6f7a8b9c0d1");
		expect(result.isActive).toBe(false);

		expect(client.POST).toHaveBeenCalledWith("/slots/{id}/deactivate", {
			params: { path: { id: "64f1a2b3c4d5e6f7a8b9c0d1" } },
		});
	});
});

describe("bookings API", () => {
	it("should POST /bookings/fetch/many", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: { data: [bookingData], totalCount: 1 },
			error: undefined,
		});

		const params = {
			pageIndex: 0,
			pageSize: 20,
			sorting: [{ id: "createdAt", desc: true }],
			columnFilters: [],
		};
		const result = await fetchBookings(params);
		expect(result.data).toHaveLength(1);
		expect(result.totalCount).toBe(1);

		expect(client.POST).toHaveBeenCalledWith("/bookings/fetch/many", {
			body: params,
		});
	});

	it("should GET /bookings/fetch/one/{id}", async () => {
		(client.GET as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: bookingData,
			error: undefined,
		});

		const result = await fetchBookingById("64f1a2b3c4d5e6f7a8b9c0d2");
		expect(result.clientEmail).toBe("ivan@example.com");

		expect(client.GET).toHaveBeenCalledWith("/bookings/fetch/one/{id}", {
			params: { path: { id: "64f1a2b3c4d5e6f7a8b9c0d2" } },
		});
	});

	it("should POST /bookings/{id}/cancel", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: { ...bookingData, status: "CANCELLED" },
			error: undefined,
		});

		const result = await cancelBooking("64f1a2b3c4d5e6f7a8b9c0d2");
		expect(result.status).toBe("CANCELLED");

		expect(client.POST).toHaveBeenCalledWith("/bookings/{id}/cancel", {
			params: { path: { id: "64f1a2b3c4d5e6f7a8b9c0d2" } },
		});
	});

	it("should POST /slots/{id}/book", async () => {
		(client.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: bookingData,
			error: undefined,
		});

		const result = await bookSlot("64f1a2b3c4d5e6f7a8b9c0d1", {
			clientName: "Ivan",
			clientEmail: "ivan@example.com",
		});
		expect(result.status).toBe("ACTIVE");

		expect(client.POST).toHaveBeenCalledWith("/slots/{id}/book", {
			params: { path: { id: "64f1a2b3c4d5e6f7a8b9c0d1" } },
			body: { clientName: "Ivan", clientEmail: "ivan@example.com" },
		});
	});

	it("should throw on server error", async () => {
		(client.GET as ReturnType<typeof vi.fn>).mockResolvedValue({
			data: undefined,
			error: { status: 500 },
		});

		await expect(fetchBookingById("nonexistent")).rejects.toThrow();
	});
});
