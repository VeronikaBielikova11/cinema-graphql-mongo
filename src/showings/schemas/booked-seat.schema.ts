import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { positiveInteger } from '../../common/schema-validators.js';

// Seat coordinates stored inside a booking.
@Schema({ _id: false, versionKey: false })
export class BookedSeat {
  @Prop({ type: Number, required: true, validate: positiveInteger })
  row: number;

  @Prop({ type: Number, required: true, validate: positiveInteger })
  seat: number;
}

export const BookedSeatSchema = SchemaFactory.createForClass(BookedSeat);
