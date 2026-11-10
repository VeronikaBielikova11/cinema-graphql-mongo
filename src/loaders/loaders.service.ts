import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { Types } from 'mongoose';
import { Film } from '../films/schemas/film.schema.js';
import { FilmsService } from '../films/films.service.js';
import { Hall } from '../halls/schemas/hall.schema.js';
import { HallsService } from '../halls/halls.service.js';

export interface Loaders {
  film: DataLoader<string, Film | null>;
  hall: DataLoader<string, Hall | null>;
}

export interface GraphQLContext {
  loaders: Loaders;
}

// DataLoader needs results in the order of its keys, whatever order MongoDB used.
function createLoader<T extends { _id: Types.ObjectId }>(
  findByIds: (ids: string[]) => Promise<T[]>,
) {
  return new DataLoader<string, T | null>(async (ids) => {
    const documents = await findByIds([...ids]);
    const byId = new Map(documents.map((doc) => [doc._id.toString(), doc]));
    return ids.map((id) => byId.get(id) ?? null);
  });
}

@Injectable()
export class LoadersService {
  constructor(
    private readonly filmsService: FilmsService,
    private readonly hallsService: HallsService,
  ) {}

  create(): Loaders {
    return {
      film: createLoader((ids) => this.filmsService.findByIds(ids)),
      hall: createLoader((ids) => this.hallsService.findByIds(ids)),
    };
  }
}
