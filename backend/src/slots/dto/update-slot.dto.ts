import { ApiPropertyOptional } from "@nestjs/swagger";
import {
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	Max,
	Min,
} from "class-validator";

export class UpdateSlotDto {
	@ApiPropertyOptional({ description: "Slot title", maxLength: 200 })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	title?: string;

	@ApiPropertyOptional({ description: "Slot start time (Unix timestamp in seconds)" })
	@IsOptional()
	@IsInt()
	@Min(0)
	startsAt?: number;

	@ApiPropertyOptional({
		description: "Maximum capacity",
		minimum: 1,
		maximum: 1000,
	})
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(1000)
	capacity?: number;
}
