import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import type { Document } from "mongoose";

export type SlotDocument = Slot & Document;

@Schema({ timestamps: true })
export class Slot {
	@ApiProperty({ description: "MongoDB document ID" })
	mongoId?: string;

	@ApiProperty({ description: "Slot title", maxLength: 200 })
	@Prop({ required: true, maxlength: 200 })
	title: string;

	@ApiProperty({ description: "Slot start time (ISO 8601)" })
	@Prop({ required: true })
	startsAt: Date;

	@ApiProperty({ description: "Maximum capacity", minimum: 1, maximum: 1000 })
	@Prop({ required: true, min: 1, max: 1000 })
	capacity: number;

	@ApiProperty({ description: "Current booked count", minimum: 0 })
	@Prop({ required: true, default: 0 })
	bookedCount: number;

	@ApiProperty({ description: "Whether slot is active" })
	@Prop({ required: true, default: true })
	isActive: boolean;

	@ApiHideProperty()
	@Prop({ required: true, default: true })
	chSyncPending: boolean;

	@ApiHideProperty()
	@Prop()
	chSyncVersion?: number;

	@ApiProperty({ description: "Creation timestamp (ISO 8601)" })
	createdAt?: Date;

	@ApiProperty({ description: "Last update timestamp (ISO 8601)" })
	updatedAt?: Date;
}

const SlotSchemaRaw = SchemaFactory.createForClass(Slot);

SlotSchemaRaw.set("toJSON", {
	transform: (_doc: any, ret: any) => {
		ret.mongoId = ret._id.toString();
		delete ret._id;
		delete ret.__v;
		delete ret.chSyncPending;
		delete ret.chSyncVersion;
		return ret;
	},
});

export { SlotSchemaRaw as SlotSchema };
