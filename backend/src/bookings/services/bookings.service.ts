import {
	forwardRef,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { FetchManyDto } from "../../slots/dto/fetch-many.dto";
import { Slot, type SlotDocument } from "../../slots/schemas/slot.schema";
import { SlotsClickhouseSyncService } from "../../slots/services/slots-clickhouse-sync.service";
import { Booking, type BookingDocument } from "../schemas/booking.schema";
import { BookingsClickhouseSyncService } from "./bookings-clickhouse-sync.service";

@Injectable()
export class BookingsService {
	constructor(
		@InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
		@InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
		private syncService: BookingsClickhouseSyncService,
		@Inject(forwardRef(() => SlotsClickhouseSyncService))
		private slotsSyncService: SlotsClickhouseSyncService,
	) {}

	async findById(id: string) {
		return this.bookingModel.findById(id);
	}

	async cancel(id: string) {
		const booking = await this.bookingModel.findById(id);
		if (!booking) throw new NotFoundException("Resource not found");

		if (booking.status === "CANCELLED") {
			return booking; // идемпотентность
		}

		const session = await this.bookingModel.db.startSession();
		session.startTransaction();
		try {
			booking.status = "CANCELLED";
			booking.chSyncPending = true;
			await booking.save({ session });

			const updatedSlot = await this.slotModel.findByIdAndUpdate(
				booking.slotId,
				{ $inc: { bookedCount: -1 }, chSyncPending: true },
				{ new: true, session },
			);

			await session.commitTransaction();

			await Promise.all([
				this.syncService.syncOnWrite(booking).catch(() => {}),
				...(updatedSlot
					? [this.slotsSyncService.syncOnWrite(updatedSlot).catch(() => {})]
					: []),
			]);
		} catch (err) {
			await session.abortTransaction();
			throw err;
		} finally {
			session.endSession();
		}

		return booking;
	}

	async fetchMany(dto: FetchManyDto) {
		return this.syncService.fetchBookings(dto);
	}
}
