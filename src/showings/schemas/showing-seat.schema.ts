import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { positiveInteger } from '../../common/schema-validators.js';

// One hall seat inside a showing. The seat is free while bookingId is null.
// This array is the source of truth about which seats are taken.
@Schema({ _id: false, versionKey: false })
export class ShowingSeat {
  @Prop({ type: Number, required: true, validate: positiveInteger })
  row: number;

  @Prop({ type: Number, required: true, validate: positiveInteger })
  seat: number;

  @Prop({ type: Types.ObjectId, default: null })
  bookingId: Types.ObjectId | null;
}

export const ShowingSeatSchema = SchemaFactory.createForClass(ShowingSeat);
