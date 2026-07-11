import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BookingsModule } from "../bookings/bookings.module";
import { SlotsController } from "./controllers/slots.controller";
import { Slot, SlotSchema } from "./schemas/slot.schema";
import { SlotsService } from "./services/slots.service";
import { SlotsClickhouseSyncService } from "./services/slots-clickhouse-sync.service";

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Slot.name, schema: SlotSchema }]),
		forwardRef(() => BookingsModule),
	],
	controllers: [SlotsController],
	providers: [SlotsService, SlotsClickhouseSyncService],
	exports: [SlotsService, SlotsClickhouseSyncService, MongooseModule],
})
export class SlotsModule {}
