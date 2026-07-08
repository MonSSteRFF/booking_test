import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { Document } from "mongoose";

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
	@Prop({ required: true, index: true })
	slotId: string;

	@Prop({ required: true })
	slotTitle: string;

	@Prop({ required: true })
	slotStartsAt: Date;

	@Prop({ required: true, maxlength: 200 })
	clientName: string;

	@Prop({ required: true, lowercase: true })
	clientEmail: string;

	@Prop({ enum: ["ACTIVE", "CANCELLED"], default: "ACTIVE" })
	status: string;

	@Prop({ default: true })
	chSyncPending: boolean;

	createdAt?: Date;
	updatedAt?: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
// Индекс уникальности
BookingSchema.index(
	{ slotId: 1, clientEmail: 1 },
	{ unique: true, partialFilterExpression: { status: "ACTIVE" } },
);
