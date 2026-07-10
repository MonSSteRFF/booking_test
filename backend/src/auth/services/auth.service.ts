import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
	constructor(
		private jwtService: JwtService,
		private config: ConfigService,
	) {}

	async validateUser(login: string, password: string): Promise<string | null> {
		const adminLogin = this.config.get<string>("ADMIN_LOGIN");
		const adminPassword = this.config.get<string>("ADMIN_PASSWORD");
		if (login === adminLogin && password === adminPassword) {
			return this.jwtService.sign({ sub: login });
		}
		return null;
	}
}
