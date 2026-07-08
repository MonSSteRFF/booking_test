import {
	ConflictException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import {
	Booking,
	type BookingDocument,
} from "../../bookings/schemas/booking.schema";
import type { BookingsClickhouseSyncService } from "../../bookings/services/bookings-clickhouse-sync.service";
import type { FetchManyDto } from "../dto/fetch-many.dto";
import { Slot, type SlotDocument } from "../schemas/slot.schema";
import type { SlotsClickhouseSyncService } from "./slots-clickhouse-sync.service";

@Injectable()
export class SlotsService {
	constructor(
		@InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
		@InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
		private syncService: SlotsClickhouseSyncService,
		private bookingSyncService: BookingsClickhouseSyncService,
	) {}

	// ... create, update, deactivate без изменений

	async bookSlot(
		slotId: string,
		dto: { clientName: string; clientEmail: string },
	) {
		const slot = await this.slotModel.findById(slotId);
		if (!slot) throw new NotFoundException("Slot not found");
		if (!slot.isActive) {
			throw new ConflictException({
				statusCode: 409,
				message: "Slot is inactive",
				details: { code: "SLOT_INACTIVE" },
			});
		}
		if (slot.bookedCount >= slot.capacity) {
			throw new ConflictException({
				statusCode: 409,
				message: "Slot is full",
				details: { code: "SLOT_FULL" },
			});
		}
		const existing = await this.bookingModel.findOne({
			slotId,
			clientEmail: dto.clientEmail.toLowerCase(),
			status: "ACTIVE",
		});
		if (existing) {
			throw new ConflictException({
				statusCode: 409,
				message: "Already booked",
				details: { code: "ALREADY_BOOKED" },
			});
		}

		const session = await this.slotModel.db.startSession();
		session.startTransaction();
		try {
			const updatedSlot = await this.slotModel.findByIdAndUpdate(
				slotId,
				{ $inc: { bookedCount: 1 }, chSyncPending: true },
				{ new: true, session },
			);
			const booking = new this.bookingModel({
				slotId: slot._id,
				slotTitle: slot.title,
				slotStartsAt: slot.startsAt,
				clientName: dto.clientName,
				clientEmail: dto.clientEmail.toLowerCase(),
				status: "ACTIVE",
			});
			await booking.save({ session });
			await session.commitTransaction();

			// sync-on-write для слота и брони
			void this.syncService.syncOnWrite(updatedSlot!);
			void this.bookingSyncService.syncOnWrite(booking);
			return booking;
		} catch (err) {
			await session.abortTransaction();
			throw err;
		} finally {
			session.endSession();
		}
	}

	async fetchMany(dto: FetchManyDto) {
		return this.syncService.fetchSlots(dto);
	}
}
