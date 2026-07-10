import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SlotsModule } from "../slots/slots.module";
import { BookingsController } from "./controllers/bookings.controller";
import { Booking, BookingSchema } from "./schemas/booking.schema";
import { BookingsService } from "./services/bookings.service";
import { BookingsClickhouseSyncService } from "./services/bookings-clickhouse-sync.service";

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
		forwardRef(() => SlotsModule),
	],
	controllers: [BookingsController],
	providers: [BookingsService, BookingsClickhouseSyncService],
	exports: [BookingsService, BookingsClickhouseSyncService, MongooseModule],
})
export class BookingsModule {}
