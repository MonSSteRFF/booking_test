import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
	let strategy: JwtStrategy;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				JwtStrategy,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string) => {
							if (key === "JWT_SECRET") return "test-secret";
							return undefined;
						}),
					},
				},
			],
		}).compile();

		strategy = module.get<JwtStrategy>(JwtStrategy);
	});

	it("should be defined", () => {
		expect(strategy).toBeDefined();
	});

	describe("validate", () => {
		it("should return user with login from payload", async () => {
			const result = await strategy.validate({ sub: "admin" });
			expect(result).toEqual({ login: "admin" });
		});
	});

	describe("constructor", () => {
		it("should throw if JWT_SECRET is not defined", () => {
			expect(() => {
				new JwtStrategy({
					get: () => undefined,
				} as any);
			}).toThrow("JWT_SECRET is not defined in environment variables");
		});
	});
});
