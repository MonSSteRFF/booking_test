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
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type { CreateSlotDto } from "../dto/create-slot.dto";
import type { FetchManyDto } from "../dto/fetch-many.dto";
import type { UpdateSlotDto } from "../dto/update-slot.dto";
import type { SlotsService } from "../services/slots.service";

@Controller("slots")
@UseGuards(JwtAuthGuard)
export class SlotsController {
	constructor(private readonly slotsService: SlotsService) {}

	@Post("fetch/many")
	async fetchMany(@Body() dto: FetchManyDto) {
		return this.slotsService.fetchMany(dto);
	}

	@Get("fetch/one/:id")
	async fetchOne(@Param("id") id: string) {
		const slot = await this.slotsService.findById(id);
		if (!slot) throw new NotFoundException("Resource not found");
		return slot;
	}

	@Post()
	async create(@Body() dto: CreateSlotDto) {
		return this.slotsService.create(dto);
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() dto: UpdateSlotDto) {
		return this.slotsService.update(id, dto);
	}

	@Post(":id/deactivate")
	async deactivate(@Param("id") id: string) {
		return this.slotsService.deactivate(id);
	}

	@Post(":id/book")
	async book(
		@Param("id") id: string,
		@Body() dto: { clientName: string; clientEmail: string },
	) {
		return this.slotsService.bookSlot(id, dto);
	}
}
