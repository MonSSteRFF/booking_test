import client from "./client";
import type { Booking, BookingList, BookingSlot, FetchManyBookings } from "./types";

export const bookingsApi = {
	fetchBookings: async (params: FetchManyBookings): Promise<BookingList> => {
		const { data, error } = await client.POST("/bookings/fetch/many", { body: params });
		if (error) throw error;
		return data;
	},
	fetchBookingById: async (id: string): Promise<Booking> => {
		const { data, error } = await client.GET("/bookings/fetch/one/{id}", { params: { path: { id } } });
		if (error) throw error;
		return data;
	},
	cancelBooking: async (id: string): Promise<Booking> => {
		const { data, error } = await client.POST("/bookings/{id}/cancel", { params: { path: { id } } });
		if (error) throw error;
		return data;
	},
	bookSlot: async (slotId: string, body: BookingSlot): Promise<Booking> => {
		const { data, error } = await client.POST("/slots/{id}/book", { params: { path: { id: slotId } }, body: body });
		if (error) throw error;
		return data;
	},
};
