import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { isDuplicateKeyError } from '../common/mongo-errors.js';
import { Showing } from '../showings/schemas/showing.schema.js';
import { CreateHallInput } from './dto/create-hall.input.js';
import { Hall } from './schemas/hall.schema.js';

@Injectable()
export class HallsService implements OnModuleInit {
  constructor(
    @InjectModel(Hall.name) private readonly hallModel: Model<Hall>,
    @InjectModel(Showing.name) private readonly showingModel: Model<Showing>,
  ) {}

  // Waits for the unique index on name, so the very first duplicate is already a CONFLICT.
  async onModuleInit() {
    await this.hallModel.init();
  }

  async create(input: CreateHallInput): Promise<Hall> {
    try {
      // No lookup first: the unique index settles the race between two requests.
      return await this.hallModel.create({
        name: input.name,
        rows: input.rows,
        seatsPerRow: input.seatsPerRow,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          `Hall named "${input.name}" already exists`,
        );
      }
      throw error;
    }
  }

  findAll(): Promise<Hall[]> {
    return this.hallModel.find().sort({ name: 1 }).lean<Hall[]>();
  }

  findOne(id: Types.ObjectId): Promise<Hall | null> {
    return this.hallModel.findById(id).lean<Hall>();
  }

  // One query for a whole batch of ids; used by the DataLoader.
  findByIds(ids: string[]): Promise<Hall[]> {
    return this.hallModel.find({ _id: { $in: ids } }).lean<Hall[]>();
  }

  async remove(id: Types.ObjectId): Promise<void> {
    // MongoDB has no foreign keys, so dependent showings are looked up here.
    if (await this.showingModel.exists({ hall: id })) {
      throw new ConflictException(
        `Hall with id "${id.toString()}" is referenced by a showing and cannot be deleted`,
      );
    }
    const hall = await this.hallModel.findByIdAndDelete(id).lean<Hall>();
    if (!hall) {
      throw new NotFoundException(`Hall with id "${id.toString()}" not found`);
    }
  }
}
