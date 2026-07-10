import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateBookingDto {
	@ApiProperty({ description: "Client name", maxLength: 200 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(200)
	clientName: string;

	@ApiProperty({ description: "Client email" })
	@IsEmail()
	@IsNotEmpty()
	clientEmail: string;
}
