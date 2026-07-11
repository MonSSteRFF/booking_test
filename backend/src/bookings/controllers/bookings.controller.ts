import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BookingsListResponse } from "../../api/response.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { FetchManyBookingsDto } from "../dto/fetch-many-bookings.dto";
import { Booking } from "../schemas/booking.schema";
import { BookingsService } from "../services/bookings.service";

@ApiTags("Bookings")
@ApiBearerAuth()
@Controller("bookings")
@UseGuards(JwtAuthGuard)
export class BookingsController {
	constructor(private readonly bookingsService: BookingsService) {}

	@Post("fetch/many")
	@ApiOperation({ summary: "Get paginated list of bookings (from ClickHouse)" })
	@ApiBody({ type: FetchManyBookingsDto })
	@ApiOkResponse({ type: BookingsListResponse })
	async fetchMany(@Body() dto: FetchManyBookingsDto) {
		return this.bookingsService.fetchMany(dto);
	}

	@Get("fetch/one/:id")
	@ApiOperation({ summary: "Get booking by ID (from Mongo)" })
	@ApiOkResponse({ type: Booking })
	async fetchOne(@Param("id") id: string) {
		const booking = await this.bookingsService.findById(id);
		if (!booking) throw new NotFoundException("Resource not found");
		return booking;
	}

	@Post(":id/cancel")
	@ApiOperation({ summary: "Cancel booking" })
	@ApiOkResponse({ type: Booking })
	async cancel(@Param("id") id: string) {
		return this.bookingsService.cancel(id);
	}
}
