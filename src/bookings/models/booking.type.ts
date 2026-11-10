import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';

// Coordinates only: a booking does not store isBooked, which Seat requires.
@ObjectType('BookedSeat')
export class BookedSeatType {
  @Field(() => Int)
  row: number;

  @Field(() => Int)
  seat: number;
}

@ObjectType('Booking')
export class BookingType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  @Field(() => ID)
  showingId: Types.ObjectId;

  @Field(() => [BookedSeatType])
  seats: BookedSeatType[];

  @Field(() => Int)
  totalPrice: number;

  @Field(() => Date)
  createdAt: Date;
}
