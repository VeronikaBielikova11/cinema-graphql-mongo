import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { listSeats } from '../common/seat.js';
import { Film } from '../films/schemas/film.schema.js';
import { Hall } from '../halls/schemas/hall.schema.js';
import { CreateShowingInput } from './dto/create-showing.input.js';
import { ShowingsArgs } from './dto/showings.args.js';
import {
  ShowingPageType,
  ShowingType,
  SortOrder,
} from './models/showing.type.js';
import { Showing } from './schemas/showing.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Stored seats know their bookingId; the schema exposes only isBooked.
// Stored bookings do not know their showing; the schema exposes showingId.
const toShowingType = (showing: Showing): ShowingType => ({
  _id: showing._id,
  film: showing.film,
  hall: showing.hall,
  startsAt: showing.startsAt,
  price: showing.price,
  seats: showing.seats.map(({ row, seat, bookingId }) => ({
    row,
    seat,
    isBooked: bookingId !== null,
  })),
  bookings: showing.bookings.map((booking) => ({
    _id: booking._id,
    showingId: showing._id,
    seats: booking.seats,
    totalPrice: booking.totalPrice,
    createdAt: booking.createdAt,
  })),
});

@Injectable()
export class ShowingsService {
  constructor(
    @InjectModel(Showing.name) private readonly showingModel: Model<Showing>,
    @InjectModel(Film.name) private readonly filmModel: Model<Film>,
    @InjectModel(Hall.name) private readonly hallModel: Model<Hall>,
  ) {}

  async create(input: CreateShowingInput): Promise<ShowingType> {
    const filmId = new Types.ObjectId(input.filmId);
    const hallId = new Types.ObjectId(input.hallId);

    const [film, hall] = await Promise.all([
      this.filmModel.exists({ _id: filmId }),
      this.hallModel
        .findById(hallId, { rows: 1, seatsPerRow: 1 })
        .lean<Pick<Hall, '_id' | 'rows' | 'seatsPerRow'>>(),
    ]);
    if (!film) {
      throw new NotFoundException(`Film with id "${input.filmId}" not found`);
    }
    if (!hall) {
      throw new NotFoundException(`Hall with id "${input.hallId}" not found`);
    }

    // The hall layout is expanded into the showing once, every seat starts free.
    const showing = await this.showingModel.create({
      film: filmId,
      hall: hallId,
      startsAt: input.startsAt,
      price: input.price,
      seats: listSeats(hall.rows, hall.seatsPerRow).map((seat) => ({
        ...seat,
        bookingId: null,
      })),
      bookings: [],
    });
    return toShowingType(showing.toObject());
  }

  async findAll({
    filmId,
    date,
    page,
    limit,
    sort,
  }: ShowingsArgs): Promise<ShowingPageType> {
    // Filtering, sorting and paging all happen in MongoDB, never in memory.
    const filter: QueryFilter<Showing> = {};
    if (filmId) {
      filter.film = new Types.ObjectId(filmId);
    }
    if (date) {
      // Half-open UTC day keeps the startsAt index usable.
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      filter.startsAt = {
        $gte: dayStart,
        $lt: new Date(dayStart.getTime() + DAY_MS),
      };
    }
    const direction = sort === SortOrder.DESC ? -1 : 1;

    const [showings, total] = await Promise.all([
      this.showingModel
        .find(filter)
        .sort({ startsAt: direction, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<Showing[]>(),
      this.showingModel.countDocuments(filter),
    ]);

    return { items: showings.map(toShowingType), total, page, limit };
  }

  async findOne(id: Types.ObjectId): Promise<ShowingType | null> {
    const showing = await this.showingModel.findById(id).lean<Showing>();
    return showing && toShowingType(showing);
  }
}
