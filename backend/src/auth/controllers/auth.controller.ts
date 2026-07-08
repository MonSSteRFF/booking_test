import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import type { LoginDto } from "../dto/login.dto";
import type { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("login")
	async login(@Body() dto: LoginDto) {
		const token = await this.authService.validateUser(dto.login, dto.password);
		if (!token) throw new UnauthorizedException("Invalid credentials");
		return { token };
	}
}
