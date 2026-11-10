import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { seatLabel } from '../common/seat.js';
import { Hall } from '../halls/schemas/hall.schema.js';
import { Booking } from '../showings/schemas/booking.schema.js';
import { Showing } from '../showings/schemas/showing.schema.js';
import { CreateBookingArgs } from './dto/create-booking.args.js';
import { BookingType } from './models/booking.type.js';

// GraphQL Int is 32-bit; totalPrice has to fit before anything is written.
const MAX_GRAPHQL_INT = 2_147_483_647;

type ShowingWithHall = Pick<Showing, '_id' | 'price'> & {
  hall: Pick<Hall, 'rows' | 'seatsPerRow' | 'name'>;
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Showing.name) private readonly showingModel: Model<Showing>,
  ) {}

  async create(args: CreateBookingArgs): Promise<BookingType> {
    const showingId = new Types.ObjectId(args.showingId);
    // The args have already rejected an empty list, non-positive numbers and
    // repeated seats. Here: the showing must exist and every seat must be in the hall.
    const showing = await this.showingModel
      .findById(showingId, { price: 1, hall: 1 })
      .populate('hall', 'rows seatsPerRow name')
      .lean<ShowingWithHall>();
    if (!showing) {
      throw new NotFoundException(
        `Showing with id "${args.showingId}" not found`,
      );
    }

    const seats = args.seats.map(({ row, seat }) => ({ row, seat }));
    // Checked before the update: its filter cannot tell a missing seat from a
    // taken one, so a seat outside the hall would otherwise become a CONFLICT.
    const outsideHall = seats.filter(
      ({ row, seat }) =>
        row > showing.hall.rows || seat > showing.hall.seatsPerRow,
    );
    if (outsideHall.length > 0) {
      throw new BadRequestException(
        `Hall "${showing.hall.name}" has no ${outsideHall.map(seatLabel).join(', ')}`,
      );
    }

    const totalPrice = showing.price * seats.length;
    if (totalPrice > MAX_GRAPHQL_INT) {
      throw new BadRequestException(
        'The total price of the booking is too large',
      );
    }

    // The id is needed both in $set and in $push, so it is generated in code.
    const booking: Booking = {
      _id: new Types.ObjectId(),
      seats,
      totalPrice,
      createdAt: new Date(),
    };

    // One update of one document is atomic, no transaction is needed:
    // - the filter matches only while every requested seat is still free;
    // - $set marks those seats with the booking id, $push records the booking.
    // If any seat is taken, nothing matches and the document stays unchanged.
    const result = await this.showingModel.updateOne(
      {
        _id: showingId,
        $and: seats.map(({ row, seat }) => ({
          seats: { $elemMatch: { row, seat, bookingId: null } },
        })),
      },
      {
        $set: { 'seats.$[target].bookingId': booking._id },
        $push: { bookings: booking },
      },
      {
        arrayFilters: [
          {
            $or: seats.map(({ row, seat }) => ({
              'target.row': row,
              'target.seat': seat,
            })),
          },
        ],
      },
    );

    // The showing exists and the seats are valid, so no match means a taken seat.
    if (result.matchedCount === 0) {
      throw new ConflictException(
        `One or more seats are already booked: ${seats.map(seatLabel).join(', ')}`,
      );
    }
    return {
      _id: booking._id,
      showingId,
      seats,
      totalPrice,
      createdAt: booking.createdAt,
    };
  }

  // Bookings live inside showing documents, so they are collected from all of them.
  findAll(): Promise<BookingType[]> {
    return this.showingModel.aggregate<BookingType>([
      { $match: { 'bookings.0': { $exists: true } } },
      { $unwind: '$bookings' },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ['$bookings', { showingId: '$_id' }] },
        },
      },
      { $sort: { createdAt: 1, _id: 1 } },
    ]);
  }

  async remove(id: Types.ObjectId): Promise<void> {
    // The booking id says nothing about its showing, so the showing is found by
    // the nested element. Freeing the seats and removing the booking is one update.
    const result = await this.showingModel.updateOne(
      { 'bookings._id': id },
      {
        $set: { 'seats.$[target].bookingId': null },
        $pull: { bookings: { _id: id } },
      },
      { arrayFilters: [{ 'target.bookingId': id }] },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException(
        `Booking with id "${id.toString()}" not found`,
      );
    }
  }
}
