import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hall, HallSchema } from '../halls/schemas/hall.schema.js';
import { Showing, ShowingSchema } from '../showings/schemas/showing.schema.js';
import { BookingsResolver } from './bookings.resolver.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Bookings have no collection of their own: they live inside showings.
      { name: Showing.name, schema: ShowingSchema },
      // Needed by populate('hall') to check the hall bounds.
      { name: Hall.name, schema: HallSchema },
    ]),
  ],
  providers: [BookingsResolver, BookingsService],
})
export class BookingsModule {}
