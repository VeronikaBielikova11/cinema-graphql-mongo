import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { BookingType } from '../../bookings/models/booking.type.js';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortOrder, { name: 'SortOrder' });

@ObjectType('Seat')
export class SeatType {
  @Field(() => Int)
  row: number;

  @Field(() => Int)
  seat: number;

  @Field(() => Boolean)
  isBooked: boolean;
}

@ObjectType('Showing')
export class ShowingType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  // Exposed as objects by the field resolvers in ShowingsResolver.
  film: Types.ObjectId;
  hall: Types.ObjectId;

  @Field(() => Date)
  startsAt: Date;

  @Field(() => Int)
  price: number;

  @Field(() => [SeatType])
  seats: SeatType[];

  @Field(() => [BookingType])
  bookings: BookingType[];
}

@ObjectType('ShowingPage')
export class ShowingPageType {
  @Field(() => [ShowingType])
  items: ShowingType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
