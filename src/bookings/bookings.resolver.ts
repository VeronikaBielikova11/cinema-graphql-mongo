import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from '../common/object-id.js';
import { BookingsService } from './bookings.service.js';
import { CreateBookingArgs } from './dto/create-booking.args.js';
import { BookingType } from './models/booking.type.js';

@Resolver(() => BookingType)
export class BookingsResolver {
  constructor(private readonly bookingsService: BookingsService) {}

  @Query(() => [BookingType])
  bookings() {
    return this.bookingsService.findAll();
  }

  @Mutation(() => BookingType)
  createBooking(@Args() args: CreateBookingArgs) {
    return this.bookingsService.create(args);
  }

  @Mutation(() => Boolean)
  async cancelBooking(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    await this.bookingsService.remove(id);
    return true;
  }
}
