import { ApiProperty } from "@nestjs/swagger";
import { Booking } from "../bookings/schemas/booking.schema";
import { Slot } from "../slots/schemas/slot.schema";

export class SlotsListResponse {
	@ApiProperty({ type: [Slot] })
	data: Slot[];

	@ApiProperty()
	totalCount: number;
}

export class BookingsListResponse {
	@ApiProperty({ type: [Booking] })
	data: Booking[];

	@ApiProperty()
	totalCount: number;
}
