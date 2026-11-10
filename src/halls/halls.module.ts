import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Showing, ShowingSchema } from '../showings/schemas/showing.schema.js';
import { HallsResolver } from './halls.resolver.js';
import { HallsService } from './halls.service.js';
import { Hall, HallSchema } from './schemas/hall.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hall.name, schema: HallSchema },
      // Read-only here: a hall with showings cannot be deleted.
      { name: Showing.name, schema: ShowingSchema },
    ]),
  ],
  providers: [HallsResolver, HallsService],
  exports: [HallsService],
})
export class HallsModule {}
