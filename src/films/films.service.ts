import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Showing } from '../showings/schemas/showing.schema.js';
import { CreateFilmInput } from './dto/create-film.input.js';
import { UpdateFilmInput } from './dto/update-film.input.js';
import { Film } from './schemas/film.schema.js';

@Injectable()
export class FilmsService {
  constructor(
    @InjectModel(Film.name) private readonly filmModel: Model<Film>,
    @InjectModel(Showing.name) private readonly showingModel: Model<Showing>,
  ) {}

  create(input: CreateFilmInput): Promise<Film> {
    return this.filmModel.create({
      title: input.title,
      durationMinutes: input.durationMinutes,
      releaseYear: input.releaseYear,
    });
  }

  findAll(): Promise<Film[]> {
    return this.filmModel.find().sort({ title: 1, _id: 1 }).lean<Film[]>();
  }

  findOne(id: Types.ObjectId): Promise<Film | null> {
    return this.filmModel.findById(id).lean<Film>();
  }

  // One query for a whole batch of ids; used by the DataLoader.
  findByIds(ids: string[]): Promise<Film[]> {
    return this.filmModel.find({ _id: { $in: ids } }).lean<Film[]>();
  }

  async update(id: Types.ObjectId, input: UpdateFilmInput): Promise<Film> {
    const changes = Object.fromEntries(
      Object.entries({
        title: input.title,
        durationMinutes: input.durationMinutes,
        releaseYear: input.releaseYear,
      }).filter(([, value]) => value !== undefined),
    );
    const film = await this.filmModel
      .findByIdAndUpdate(
        id,
        { $set: changes },
        { returnDocument: 'after', runValidators: true },
      )
      .lean<Film>();
    if (!film) {
      throw new NotFoundException(`Film with id "${id.toString()}" not found`);
    }
    return film;
  }

  async remove(id: Types.ObjectId): Promise<void> {
    // MongoDB has no foreign keys, so dependent showings are looked up here.
    if (await this.showingModel.exists({ film: id })) {
      throw new ConflictException(
        `Film with id "${id.toString()}" is referenced by a showing and cannot be deleted`,
      );
    }
    const film = await this.filmModel.findByIdAndDelete(id).lean<Film>();
    if (!film) {
      throw new NotFoundException(`Film with id "${id.toString()}" not found`);
    }
  }
}
