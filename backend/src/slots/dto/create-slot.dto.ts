import { ApiProperty } from "@nestjs/swagger";
import {
	IsInt,
	IsISO8601,
	IsNotEmpty,
	IsString,
	Max,
	MaxLength,
	Min,
} from "class-validator";

export class CreateSlotDto {
	@ApiProperty({ description: "Slot title", maxLength: 200 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	title: string;

	@ApiProperty({ description: "Slot start time (ISO 8601)" })
	@IsISO8601()
	@IsNotEmpty()
	startsAt: string;

	@ApiProperty({ description: "Maximum capacity", minimum: 1, maximum: 1000 })
	@IsInt()
	@Min(1)
	@Max(1000)
	capacity: number;
}
