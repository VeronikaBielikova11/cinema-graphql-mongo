import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Showing, ShowingSchema } from '../showings/schemas/showing.schema.js';
import { FilmsResolver } from './films.resolver.js';
import { FilmsService } from './films.service.js';
import { Film, FilmSchema } from './schemas/film.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Film.name, schema: FilmSchema },
      // Read-only here: a film with showings cannot be deleted.
      { name: Showing.name, schema: ShowingSchema },
    ]),
  ],
  providers: [FilmsResolver, FilmsService],
  exports: [FilmsService],
})
export class FilmsModule {}
