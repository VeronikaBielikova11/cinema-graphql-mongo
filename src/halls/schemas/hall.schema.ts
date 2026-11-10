import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { positiveInteger } from '../../common/schema-validators.js';

// The seat list is not stored: it is computed from rows and seatsPerRow.
@Schema({ collection: 'halls', versionKey: false })
export class Hall {
  _id: Types.ObjectId;

  // The unique index settles the race between two requests with the same name.
  @Prop({ type: String, required: true, trim: true, unique: true })
  name: string;

  @Prop({ type: Number, required: true, validate: positiveInteger })
  rows: number;

  @Prop({ type: Number, required: true, validate: positiveInteger })
  seatsPerRow: number;
}

export type HallDocument = HydratedDocument<Hall>;
export const HallSchema = SchemaFactory.createForClass(Hall);
