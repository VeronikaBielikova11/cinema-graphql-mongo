import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { positiveInteger } from '../../common/schema-validators.js';
import { BookedSeat, BookedSeatSchema } from './booked-seat.schema.js';

// An element of the showing's `bookings` array. _id is generated in code
// before the update, because the same id is also written into seats[].bookingId.
// The seat list duplicates what `seats` already says, so a booking can be
// returned without scanning the whole hall.
@Schema({ versionKey: false })
export class Booking {
  @Prop({ type: Types.ObjectId, required: true })
  _id: Types.ObjectId;

  @Prop({ type: [BookedSeatSchema], required: true })
  seats: BookedSeat[];

  @Prop({ type: Number, required: true, validate: positiveInteger })
  totalPrice: number;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
