import { Module } from '@nestjs/common';
import { FilmsModule } from '../films/films.module.js';
import { HallsModule } from '../halls/halls.module.js';
import { LoadersService } from './loaders.service.js';

@Module({
  imports: [FilmsModule, HallsModule],
  providers: [LoadersService],
  exports: [LoadersService],
})
export class LoadersModule {}
