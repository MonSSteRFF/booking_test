import { PartialType } from "@nestjs/mapped-types";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { CreateSlotDto } from "./create-slot.dto";

export class UpdateSlotDto extends PartialType(CreateSlotDto) {
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(1000)
	capacity?: number;
}
