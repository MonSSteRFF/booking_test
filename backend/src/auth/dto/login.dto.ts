import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
	@ApiProperty({ description: "Admin login" })
	@IsString()
	@IsNotEmpty()
	login: string;

	@ApiProperty({ description: "Admin password" })
	@IsString()
	@IsNotEmpty()
	password: string;
}
