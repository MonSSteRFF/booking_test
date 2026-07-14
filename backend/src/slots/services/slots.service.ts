import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Booking, type BookingDocument } from "../../bookings/schemas/booking.schema";
import { BookingsClickhouseSyncService } from "../../bookings/services/bookings-clickhouse-sync.service";
import type { CreateSlotDto } from "../dto/create-slot.dto";
import type { FetchManySlotsDto } from "../dto/fetch-many-slots.dto";
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
		const slot = await this.slotModel.findById(id);
		if (!slot) return null;
		return slot.toJSON() as Slot;
	}

	async create(dto: CreateSlotDto) {
		const slot = new this.slotModel({
			title: dto.title,
			startsAt: dto.startsAt,
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
		const slot = await this.slotModel.findByIdAndUpdate(id, { isActive: false, chSyncPending: true }, { new: true });
		if (!slot) throw new NotFoundException("Resource not found");
		await this.syncService.syncOnWrite(slot).catch(() => {});
		return slot;
	}

	async bookSlot(slotId: string, dto: { clientName: string; clientEmail: string }) {
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

		const updatedSlot = await this.slotModel.findOneAndUpdate(
			{
				_id: slotId,
				$expr: { $lt: ["$bookedCount", "$capacity"] },
			},
			{ $inc: { bookedCount: 1 }, chSyncPending: true },
			{ new: true },
		);

		if (!updatedSlot) {
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
		await booking.save();

		await Promise.all([this.syncService.syncOnWrite(updatedSlot).catch(() => {}), this.bookingSyncService.syncOnWrite(booking).catch(() => {})]);

		return booking;
	}

	async fetchMany(dto: FetchManySlotsDto) {
		return this.syncService.fetchSlots(dto);
	}
}
