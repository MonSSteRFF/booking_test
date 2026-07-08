import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { FetchManyDto } from "../../slots/dto/fetch-many.dto";
import { Slot, type SlotDocument } from "../../slots/schemas/slot.schema";
import { Booking, type BookingDocument } from "../schemas/booking.schema";
import type { BookingsClickhouseSyncService } from "./bookings-clickhouse-sync.service";

@Injectable()
export class BookingsService {
	constructor(
		@InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
		@InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
		private syncService: BookingsClickhouseSyncService,
	) {}

	async findById(id: string) {
		return this.bookingModel.findById(id).lean();
	}

	async cancel(id: string) {
		const booking = await this.bookingModel.findById(id);
		if (!booking) throw new NotFoundException("Resource not found");

		if (booking.status === "CANCELLED") {
			// идемпотентность: возвращаем текущее состояние
			return booking;
		}

		// Атомарная операция: обновляем статус и декрементируем bookedCount слота
		const session = await this.bookingModel.db.startSession();
		session.startTransaction();
		try {
			booking.status = "CANCELLED";
			booking.chSyncPending = true;
			await booking.save({ session });

			await this.slotModel.findByIdAndUpdate(
				booking.slotId,
				{ $inc: { bookedCount: -1 }, chSyncPending: true },
				{ session },
			);

			await session.commitTransaction();

			// синхронизируем оба изменения в CH (fire-and-forget)
			void this.syncService.syncOnWrite(booking);
			// синхронизацию слота запустит слотовый синк-сервис, но можно передать событием
			// Для простоты вызовем напрямую, если имеем доступ (можно через EventEmitter)
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
