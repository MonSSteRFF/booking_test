import { Injectable } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(config: ConfigService) {
		const secret = config.get<string>("JWT_SECRET");
		if (!secret) {
			throw new Error("JWT_SECRET is not defined in environment variables");
		}
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: secret,
		});
	}

	async validate(payload: any) {
		return { login: payload.sub };
	}
}
