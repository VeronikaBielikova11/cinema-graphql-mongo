import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Film, FilmSchema } from '../films/schemas/film.schema.js';
import { Hall, HallSchema } from '../halls/schemas/hall.schema.js';
import { Showing, ShowingSchema } from './schemas/showing.schema.js';
import { ShowingsResolver } from './showings.resolver.js';
import { ShowingsService } from './showings.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Showing.name, schema: ShowingSchema },
      // Creating a showing checks that the film and the hall exist.
      { name: Film.name, schema: FilmSchema },
      { name: Hall.name, schema: HallSchema },
    ]),
  ],
  providers: [ShowingsResolver, ShowingsService],
})
export class ShowingsModule {}
