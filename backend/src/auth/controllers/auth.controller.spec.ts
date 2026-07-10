import { UnauthorizedException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthService } from "../services/auth.service";
import { AuthController } from "./auth.controller";

describe("AuthController", () => {
	let controller: AuthController;
	let authService: AuthService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{
					provide: AuthService,
					useValue: {
						validateUser: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<AuthController>(AuthController);
		authService = module.get<AuthService>(AuthService);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("login", () => {
		it("should return token on valid credentials", async () => {
			jest.spyOn(authService, "validateUser").mockResolvedValue("token123");
			const result = await controller.login({
				login: "admin",
				password: "admin123",
			});
			expect(result).toEqual({ token: "token123" });
		});

		it("should throw UnauthorizedException on invalid credentials", async () => {
			jest.spyOn(authService, "validateUser").mockResolvedValue(null);
			await expect(
				controller.login({ login: "bad", password: "creds" }),
			).rejects.toThrow(UnauthorizedException);
		});
	});
});
