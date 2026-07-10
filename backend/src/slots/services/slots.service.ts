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
import { BookingsClickhouseSyncService } from "../../bookings/services/bookings-clickhouse-sync.service";
import type { CreateSlotDto } from "../dto/create-slot.dto";
import type { FetchManyDto } from "../dto/fetch-many.dto";
import type { UpdateSlotDto } from "../dto/update-slot.dto";
import { Slot, type SlotDocument } from "../schemas/slot.schema";
import { SlotsClickhouseSyncService } from "./slots-clickhouse-sync.service";

@Injectable()
export class SlotsService {
	constructor(
		@InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
		@InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
		private syncService: SlotsClickhouseSyncService,
		private bookingSyncService: BookingsClickhouseSyncService,
	) {}

	async findById(id: string) {
		return this.slotModel.findById(id);
	}

	async create(dto: CreateSlotDto) {
		const slot = new this.slotModel({
			title: dto.title,
			startsAt: new Date(dto.startsAt),
			capacity: dto.capacity,
		});
		const saved = await slot.save();
		await this.syncService.syncOnWrite(saved).catch(() => {});
		return saved;
	}

	async update(id: string, dto: UpdateSlotDto) {
		const slot = await this.slotModel.findById(id);
		if (!slot) throw new NotFoundException("Resource not found");

		if (dto.capacity !== undefined && dto.capacity < slot.bookedCount) {
			throw new ConflictException({
				statusCode: 409,
				message: "New capacity is below current bookedCount",
				details: { code: "CAPACITY_BELOW_BOOKED" },
			});
		}

		if (dto.title !== undefined) slot.title = dto.title;
		if (dto.startsAt !== undefined) slot.startsAt = new Date(dto.startsAt);
		if (dto.capacity !== undefined) slot.capacity = dto.capacity;
		slot.chSyncPending = true;

		const updated = await slot.save();
		await this.syncService.syncOnWrite(updated).catch(() => {});
		return updated;
	}

	async deactivate(id: string) {
		const slot = await this.slotModel.findByIdAndUpdate(
			id,
			{ isActive: false, chSyncPending: true },
			{ new: true },
		);
		if (!slot) throw new NotFoundException("Resource not found");
		await this.syncService.syncOnWrite(slot).catch(() => {});
		return slot;
	}

	async bookSlot(
		slotId: string,
		dto: { clientName: string; clientEmail: string },
	) {
		const slot = await this.slotModel.findById(slotId);
		if (!slot) throw new NotFoundException("Slot not found");

		if (slot.bookedCount >= slot.capacity) {
			throw new ConflictException({
				statusCode: 409,
				message: "Slot is full",
				details: { code: "SLOT_FULL" },
			});
		}

		if (!slot.isActive) {
			throw new ConflictException({
				statusCode: 409,
				message: "Slot is inactive",
				details: { code: "SLOT_INACTIVE" },
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
				message: "This email already has an active booking for this slot",
				details: { code: "ALREADY_BOOKED" },
			});
		}

		const session = await this.slotModel.db.startSession();
		session.startTransaction();
		try {
			const updatedSlot = await this.slotModel.findOneAndUpdate(
				{
					_id: slotId,
					$expr: { $lt: ["$bookedCount", "$capacity"] },
				},
				{ $inc: { bookedCount: 1 }, chSyncPending: true },
				{ new: true, session },
			);

			if (!updatedSlot) {
				await session.abortTransaction();
				const current = await this.slotModel.findById(slotId);
				if (current && !current.isActive) {
					throw new ConflictException({
						statusCode: 409,
						message: "Slot is inactive",
						details: { code: "SLOT_INACTIVE" },
					});
				}
				throw new ConflictException({
					statusCode: 409,
					message: "Slot is full",
					details: { code: "SLOT_FULL" },
				});
			}

			const booking = new this.bookingModel({
				slotId,
				slotTitle: slot.title,
				slotStartsAt: slot.startsAt,
				clientName: dto.clientName,
				clientEmail: dto.clientEmail.toLowerCase(),
				status: "ACTIVE",
			});
			await booking.save({ session });
			await session.commitTransaction();

			await Promise.all([
				this.syncService.syncOnWrite(updatedSlot).catch(() => {}),
				this.bookingSyncService.syncOnWrite(booking).catch(() => {}),
			]);

			return booking;
		} catch (err) {
			await session.abortTransaction().catch(() => {});
			throw err;
		} finally {
			session.endSession();
		}
	}

	async fetchMany(dto: FetchManyDto) {
		return this.syncService.fetchSlots(dto);
	}
}
