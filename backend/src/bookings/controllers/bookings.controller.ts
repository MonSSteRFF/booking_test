import {
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Post,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type { FetchManyDto } from "../../slots/dto/fetch-many.dto"; // можно сделать общий
import type { BookingsService } from "../services/bookings.service";

@Controller("bookings")
@UseGuards(JwtAuthGuard)
export class BookingsController {
	constructor(private readonly bookingsService: BookingsService) {}

	@Post("fetch/many")
	async fetchMany(@Body() dto: FetchManyDto) {
		return this.bookingsService.fetchMany(dto);
	}

	@Get("fetch/one/:id")
	async fetchOne(@Param("id") id: string) {
		const booking = await this.bookingsService.findById(id);
		if (!booking) throw new NotFoundException("Resource not found");
		return booking;
	}

	@Post(":id/cancel")
	async cancel(@Param("id") id: string) {
		return this.bookingsService.cancel(id);
	}
}
