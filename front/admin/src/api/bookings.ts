import type { Booking, FetchManyParams, PaginatedResponse } from "../types";
import client from "./client";

export async function fetchBookings(
	params: FetchManyParams,
): Promise<PaginatedResponse<Booking>> {
	const { data, error } = await client.POST("/bookings/fetch/many", {
		body: params as any,
	});
	if (error) throw error;
	return data as PaginatedResponse<Booking>;
}

export async function fetchBookingById(id: string): Promise<Booking> {
	const { data, error } = await client.GET("/bookings/fetch/one/{id}", {
		params: { path: { id } },
	});
	if (error) throw error;
	return data as Booking;
}

export async function cancelBooking(id: string): Promise<Booking> {
	const { data, error } = await client.POST("/bookings/{id}/cancel", {
		params: { path: { id } },
	});
	if (error) throw error;
	return data as Booking;
}

export async function bookSlot(
	slotId: string,
	body: { clientName: string; clientEmail: string },
): Promise<Booking> {
	const { data, error } = await client.POST("/slots/{id}/book", {
		params: { path: { id: slotId } },
		body: body as any,
	});
	if (error) throw error;
	return data as Booking;
}
