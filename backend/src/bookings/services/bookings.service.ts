import { forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { FetchManySlotsDto } from "../../slots/dto/fetch-many-slots.dto";
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
		const booking = await this.bookingModel.findById(id);
		if (!booking) return null;
		const json = booking.toJSON() as any;
		json.slotStartsAt = Math.floor(new Date(json.slotStartsAt).getTime() / 1000);
		json.createdAt = json.createdAt ? Math.floor(new Date(json.createdAt).getTime() / 1000) : undefined;
		json.updatedAt = json.updatedAt ? Math.floor(new Date(json.updatedAt).getTime() / 1000) : undefined;
		return json;
	}

	async cancel(id: string) {
		const session = await this.bookingModel.db.startSession();
		session.startTransaction();
		try {
			const booking = await this.bookingModel.findOneAndUpdate(
				{ _id: id, status: "ACTIVE" },
				{ status: "CANCELLED", chSyncPending: true },
				{ new: true, session },
			);

			if (!booking) {
				await session.abortTransaction();
				const existing = await this.bookingModel.findById(id);
				if (!existing) throw new NotFoundException("Resource not found");
				return existing;
			}

			const updatedSlot = await this.slotModel.findByIdAndUpdate(
				booking.slotId,
				{ $inc: { bookedCount: -1 }, chSyncPending: true },
				{ new: true, session },
			);

			await session.commitTransaction();

			await Promise.all([
				this.syncService.syncOnWrite(booking).catch(() => {}),
				...(updatedSlot ? [this.slotsSyncService.syncOnWrite(updatedSlot).catch(() => {})] : []),
			]);
		} catch (err) {
			await session.abortTransaction();
			throw err;
		} finally {
			session.endSession();
		}

		return this.bookingModel.findById(id);
	}

	async fetchMany(dto: FetchManySlotsDto) {
		return this.syncService.fetchBookings(dto);
	}
}
