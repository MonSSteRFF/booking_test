import { ApiProperty } from "@nestjs/swagger";
import {
	IsInt,
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

	@ApiProperty({ description: "Slot start time (Unix timestamp in seconds)" })
	@IsInt()
	@Min(0)
	@IsNotEmpty()
	startsAt: number;

	@ApiProperty({ description: "Maximum capacity", minimum: 1, maximum: 1000 })
	@IsInt()
	@Min(1)
	@Max(1000)
	capacity: number;
}
