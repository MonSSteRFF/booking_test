import {
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Patch,
	Post,
	UseGuards,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import { SlotsListResponse } from "../../api/response.dto";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type { CreateBookingDto } from "../../bookings/dto/create-booking.dto";
import { Booking } from "../../bookings/schemas/booking.schema";
import type { CreateSlotDto } from "../dto/create-slot.dto";
import type { FetchManyDto } from "../dto/fetch-many.dto";
import type { UpdateSlotDto } from "../dto/update-slot.dto";
import { Slot } from "../schemas/slot.schema";
import { SlotsService } from "../services/slots.service";

@ApiTags("Slots")
@ApiBearerAuth()
@Controller("slots")
@UseGuards(JwtAuthGuard)
export class SlotsController {
	constructor(private readonly slotsService: SlotsService) {}

	@Post("fetch/many")
	@ApiOperation({ summary: "Get paginated list of slots (from ClickHouse)" })
	@ApiOkResponse({ type: SlotsListResponse })
	async fetchMany(@Body() dto: FetchManyDto) {
		return this.slotsService.fetchMany(dto);
	}

	@Get("fetch/one/:id")
	@ApiOperation({ summary: "Get slot by ID (from Mongo)" })
	@ApiOkResponse({ type: Slot })
	async fetchOne(@Param("id") id: string) {
		const slot = await this.slotsService.findById(id);
		if (!slot) throw new NotFoundException("Resource not found");
		return slot;
	}

	@Post()
	@ApiOperation({ summary: "Create a new slot" })
	@ApiCreatedResponse({ type: Slot })
	async create(@Body() dto: CreateSlotDto) {
		return this.slotsService.create(dto);
	}

	@Patch(":id")
	@ApiOperation({ summary: "Update slot" })
	@ApiOkResponse({ type: Slot })
	async update(@Param("id") id: string, @Body() dto: UpdateSlotDto) {
		return this.slotsService.update(id, dto);
	}

	@Post(":id/deactivate")
	@ApiOperation({ summary: "Deactivate slot" })
	@ApiOkResponse({ type: Slot })
	async deactivate(@Param("id") id: string) {
		return this.slotsService.deactivate(id);
	}

	@Post(":id/book")
	@ApiOperation({ summary: "Book a slot (create booking)" })
	@ApiCreatedResponse({ type: Booking })
	async book(@Param("id") id: string, @Body() dto: CreateBookingDto) {
		return this.slotsService.bookSlot(id, dto);
	}
}
