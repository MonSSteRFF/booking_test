import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BookingsController } from "./controllers/bookings.controller";
import { Booking, BookingSchema } from "./schemas/booking.schema";
import { BookingsService } from "./services/bookings.service";
import { BookingsClickhouseSyncService } from "./services/bookings-clickhouse-sync.service";

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
	],
	controllers: [BookingsController],
	providers: [BookingsService, BookingsClickhouseSyncService],
	exports: [BookingsService, BookingsClickhouseSyncService],
})
export class BookingsModule {}
