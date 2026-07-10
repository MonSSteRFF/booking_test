import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { LoginDto } from "../dto/login.dto";
import { AuthService } from "../services/auth.service";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("login")
	@ApiOperation({ summary: "Login and get JWT token" })
	@ApiResponse({
		status: 200,
		description: "JWT token",
		schema: { properties: { token: { type: "string" } } },
	})
	@ApiResponse({ status: 401, description: "Invalid credentials" })
	async login(@Body() dto: LoginDto) {
		const token = await this.authService.validateUser(dto.login, dto.password);
		if (!token) throw new UnauthorizedException("Invalid credentials");
		return { token };
	}
}
