import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { Document } from "mongoose";

export type SlotDocument = Slot & Document;

@Schema({ timestamps: true })
export class Slot {
	@Prop({ required: true, maxlength: 200 })
	title: string;

	@Prop({ required: true })
	startsAt: Date;

	@Prop({ required: true, min: 1, max: 1000 })
	capacity: number;

	@Prop({ required: true, default: 0 })
	bookedCount: number;

	@Prop({ required: true, default: true })
	isActive: boolean;

	@Prop({ required: true, default: true })
	chSyncPending: boolean;

	@Prop() // optional
	chSyncVersion?: number;

	createdAt?: Date;
	updatedAt?: Date;
}

export const SlotSchema = SchemaFactory.createForClass(Slot);
