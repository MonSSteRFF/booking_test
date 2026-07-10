import "reflect-metadata";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AuthModule } from "../src/auth/auth.module";
import { BookingsController } from "../src/bookings/controllers/bookings.controller";
import { Booking } from "../src/bookings/schemas/booking.schema";
import { BookingsService } from "../src/bookings/services/bookings.service";
import { BookingsClickhouseSyncService } from "../src/bookings/services/bookings-clickhouse-sync.service";
import { SlotsController } from "../src/slots/controllers/slots.controller";
import { Slot } from "../src/slots/schemas/slot.schema";
import { SlotsService } from "../src/slots/services/slots.service";
import { SlotsClickhouseSyncService } from "../src/slots/services/slots-clickhouse-sync.service";

async function main() {
	const mockModel = {
		find: () => ({
			exec: async () => [],
			sort: () => ({ exec: async () => [] }),
		}),
		findById: () => null,
		findOne: () => null,
		findOneAndUpdate: () => null,
		findByIdAndUpdate: () => null,
		save: async () => null,
		create: () => null,
		updateOne: async () => ({ modifiedCount: 0 }),
		updateMany: async () => ({ modifiedCount: 0 }),
		deleteOne: async () => ({ deletedCount: 0 }),
		deleteMany: async () => ({ deletedCount: 0 }),
		countDocuments: async () => 0,
		estimatedDocumentCount: async () => 0,
		db: {
			startSession: async () => ({
				startTransaction() {},
				commitTransaction() {},
				abortTransaction() {},
				endSession() {},
			}),
		},
	};

	@Module({
		imports: [
			ConfigModule.forRoot({ isGlobal: true }),
			ScheduleModule.forRoot(),
			AuthModule,
		],
		controllers: [SlotsController, BookingsController],
		providers: [
			SlotsService,
			BookingsService,
			{ provide: getModelToken(Slot.name), useValue: mockModel },
			{ provide: getModelToken(Booking.name), useValue: mockModel },
			{
				provide: SlotsClickhouseSyncService,
				useValue: {
					onModuleInit: async () => {},
					syncOnWrite: async () => {},
					backgroundSync: async () => {},
					fetchSlots: async () => ({ data: [], totalCount: 0 }),
				},
			},
			{
				provide: BookingsClickhouseSyncService,
				useValue: {
					onModuleInit: async () => {},
					syncOnWrite: async () => {},
					backgroundSync: async () => {},
					fetchBookings: async () => ({ data: [], totalCount: 0 }),
				},
			},
			{
				provide: ConfigService,
				useValue: {
					get: (key: string) => {
						if (key === "JWT_SECRET") return "test-secret";
						if (key === "ADMIN_LOGIN") return "admin";
						if (key === "ADMIN_PASSWORD") return "admin123";
						if (key === "mongoUrl") return "mongodb://localhost:27017/test";
						return undefined;
					},
				},
			},
		],
	})
	class GenModule {}

	const app = await NestFactory.create(GenModule, { logger: ["error"] });
	const config = new DocumentBuilder()
		.setTitle("Slot Booking API")
		.setDescription(
			"Мини-система бронирования слотов (CQRS: Mongo + ClickHouse)",
		)
		.setVersion("3.0")
		.addBearerAuth()
		.build();

	const document = SwaggerModule.createDocument(app, config);
	const outDir = resolve(__dirname, "..", "api");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	writeFileSync(
		resolve(outDir, "openapi.json"),
		JSON.stringify(document, null, 2),
	);
	console.log("OpenAPI schema -> api/openapi.json");

	await app.close();
}

main().catch((err) => {
	console.error("Generation failed:", err.message);
	process.exitCode = 1;
});
