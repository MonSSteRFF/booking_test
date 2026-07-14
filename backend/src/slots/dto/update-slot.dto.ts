import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateSlotDto {
	@ApiPropertyOptional({ description: "Slot title", maxLength: 200 })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	title?: string;

	@ApiPropertyOptional({ description: "Slot start time (ISO 8601)" })
	@IsOptional()
	@IsISO8601()
	startsAt?: string;

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
