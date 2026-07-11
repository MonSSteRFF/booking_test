import type { components } from "./internal-schema";

// slots
export type Slot = components["schemas"]["Slot"];

export type FetchManySlots = components["schemas"]["FetchManySlotsDto"];
export type SlotsList = components["schemas"]["SlotsListResponse"];
export type CreateSlot = components["schemas"]["CreateSlotDto"];
export type UpdateSlot = components["schemas"]["UpdateSlotDto"];

// bookings
export type Booking = components["schemas"]["Booking"];

export type FetchManyBookings = components["schemas"]["FetchManyBookingsDto"];
export type BookingList = components["schemas"]["BookingsListResponse"];
export type BookingSlot = components["schemas"]["CreateBookingDto"];
