import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { positiveInteger } from '../../common/schema-validators.js';
import { Film } from '../../films/schemas/film.schema.js';
import { Hall } from '../../halls/schemas/hall.schema.js';
import { Booking, BookingSchema } from './booking.schema.js';
import { ShowingSeat, ShowingSeatSchema } from './showing-seat.schema.js';

// A showing keeps its seats and its bookings inside one document, so taking
// seats and recording the booking is a single, atomic update.
@Schema({ collection: 'showings', versionKey: false })
export class Showing {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Film.name, required: true })
  film: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Hall.name, required: true, index: true })
  hall: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  // Ticket price in kopiyky (12500 = 125 UAH).
  @Prop({ type: Number, required: true, validate: positiveInteger })
  price: number;

  @Prop({ type: [ShowingSeatSchema], default: [] })
  seats: ShowingSeat[];

  @Prop({ type: [BookingSchema], default: [] })
  bookings: Booking[];
}

export type ShowingDocument = HydratedDocument<Showing>;
export const ShowingSchema = SchemaFactory.createForClass(Showing);

// Schedule pages: sorted by start time, ties broken by _id.
ShowingSchema.index({ startsAt: 1, _id: 1 });
// Schedule of one film.
ShowingSchema.index({ film: 1, startsAt: 1 });
// Cancelling finds the showing by its nested booking.
ShowingSchema.index({ 'bookings._id': 1 });
