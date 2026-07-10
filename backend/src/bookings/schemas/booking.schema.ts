import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import type { Document } from "mongoose";

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
	@ApiProperty({ description: "MongoDB document ID" })
	mongoId?: string;

	@ApiProperty({ description: "Slot ID reference" })
	@Prop({ required: true, index: true })
	slotId: string;

	@ApiProperty({ description: "Denormalized slot title at booking time" })
	@Prop({ required: true })
	slotTitle: string;

	@ApiProperty({ description: "Denormalized slot start time at booking time" })
	@Prop({ required: true })
	slotStartsAt: Date;

	@ApiProperty({ description: "Client name", maxLength: 200 })
	@Prop({ required: true, maxlength: 200 })
	clientName: string;

	@ApiProperty({ description: "Client email (lowercased)" })
	@Prop({ required: true, lowercase: true })
	clientEmail: string;

	@ApiProperty({ description: "Booking status", enum: ["ACTIVE", "CANCELLED"] })
	@Prop({ enum: ["ACTIVE", "CANCELLED"], default: "ACTIVE" })
	status: string;

	@ApiHideProperty()
	@Prop({ default: true })
	chSyncPending: boolean;

	@ApiProperty({ description: "Creation timestamp" })
	createdAt?: Date;

	@ApiProperty({ description: "Last update timestamp" })
	updatedAt?: Date;
}

const BookingSchemaRaw = SchemaFactory.createForClass(Booking);

BookingSchemaRaw.set("toJSON", {
	transform: (_doc: any, ret: any) => {
		ret.mongoId = ret._id.toString();
		delete ret._id;
		delete ret.__v;
		delete ret.chSyncPending;
		return ret;
	},
});

// Индекс уникальности
BookingSchemaRaw.index(
	{ slotId: 1, clientEmail: 1 },
	{ unique: true, partialFilterExpression: { status: "ACTIVE" } },
);

export { BookingSchemaRaw as BookingSchema };
