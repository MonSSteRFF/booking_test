import type { Booking, FetchManyParams, PaginatedResponse } from "../types";
import client from "./client";

export async function fetchBookings(
	params: FetchManyParams,
): Promise<PaginatedResponse<Booking>> {
	const { data } = await client.post("/bookings/fetch/many", params);
	return data;
}

export async function fetchBookingById(id: string): Promise<Booking> {
	const { data } = await client.get(`/bookings/fetch/one/${id}`);
	return data;
}

export async function cancelBooking(id: string) {
	const { data } = await client.post(`/bookings/${id}/cancel`);
	return data as Booking;
}

export async function bookSlot(
	slotId: string,
	body: { clientName: string; clientEmail: string },
): Promise<Booking> {
	const { data } = await client.post(`/slots/${slotId}/book`, body);
	return data as Booking;
}
