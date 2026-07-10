import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
	let service: AuthService;
	let jwtService: JwtService;
	let _configService: ConfigService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: JwtService,
					useValue: { sign: jest.fn().mockReturnValue("test-token") },
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string) => {
							if (key === "ADMIN_LOGIN") return "admin";
							if (key === "ADMIN_PASSWORD") return "admin123";
							return undefined;
						}),
					},
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		jwtService = module.get<JwtService>(JwtService);
		_configService = module.get<ConfigService>(ConfigService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("validateUser", () => {
		it("should return token for valid credentials", async () => {
			const result = await service.validateUser("admin", "admin123");
			expect(result).toBe("test-token");
			expect(jwtService.sign).toHaveBeenCalledWith({ sub: "admin" });
		});

		it("should return null for wrong password", async () => {
			const result = await service.validateUser("admin", "wrong");
			expect(result).toBeNull();
		});

		it("should return null for wrong login", async () => {
			const result = await service.validateUser("hacker", "admin123");
			expect(result).toBeNull();
		});

		it("should return null for empty credentials", async () => {
			const result = await service.validateUser("", "");
			expect(result).toBeNull();
		});
	});
});
