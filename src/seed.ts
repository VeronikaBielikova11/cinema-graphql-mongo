import 'reflect-metadata';
import mongoose, { Model, Types } from 'mongoose';
import { listSeats } from './common/seat.js';
import { validateEnv } from './config/env.validation.js';
import { Film, FilmSchema } from './films/schemas/film.schema.js';
import { Hall, HallSchema } from './halls/schemas/hall.schema.js';
import { Booking } from './showings/schemas/booking.schema.js';
import { Showing, ShowingSchema } from './showings/schemas/showing.schema.js';

// Runs outside Nest, so .env is loaded and validated here directly.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on variables already set in the environment.
}
const env = validateEnv(process.env);

// Fixed ids make the script idempotent: every document is an upsert with
// $setOnInsert, so a second run finds them all and changes nothing.
const id = (hex: string) => new Types.ObjectId(hex);

const films: Film[] = [
  {
    _id: id('651111111111111111111111'),
    title: 'Тіні забутих предків',
    durationMinutes: 97,
    releaseYear: 1965,
  },
  {
    _id: id('651111111111111111111112'),
    title: 'Захар Беркут',
    durationMinutes: 97,
    releaseYear: 1971,
  },
];

const halls: Hall[] = [
  {
    _id: id('652222222222222222222221'),
    name: 'Синій зал',
    rows: 3,
    seatsPerRow: 5,
  },
  {
    _id: id('652222222222222222222222'),
    name: 'Малий зал',
    rows: 2,
    seatsPerRow: 4,
  },
];

const schedule = [
  {
    _id: id('653333333333333333333331'),
    film: films[0],
    hall: halls[0],
    startsAt: new Date('2030-06-15T18:00:00.000Z'),
    price: 12500,
  },
  {
    _id: id('653333333333333333333332'),
    film: films[1],
    hall: halls[1],
    startsAt: new Date('2030-06-16T12:00:00.000Z'),
    price: 8000,
  },
  {
    _id: id('653333333333333333333333'),
    film: films[0],
    hall: halls[1],
    startsAt: new Date('2030-06-17T20:30:00.000Z'),
    price: 15000,
  },
  {
    _id: id('653333333333333333333334'),
    film: films[1],
    hall: halls[0],
    startsAt: new Date('2030-06-18T16:00:00.000Z'),
    price: 10000,
  },
];

// One booking on the first showing: row 1, seats 1 and 2.
const bookedSeats = [
  { row: 1, seat: 1 },
  { row: 1, seat: 2 },
];
const booking: Booking = {
  _id: id('654444444444444444444441'),
  seats: bookedSeats,
  totalPrice: schedule[0].price * bookedSeats.length,
  createdAt: new Date('2030-01-01T10:00:00.000Z'),
};

const showings: Showing[] = schedule.map(
  ({ film, hall, ...showing }, index) => {
    const withBooking = index === 0;
    const isBooked = (row: number, seat: number) =>
      withBooking && bookedSeats.some((s) => s.row === row && s.seat === seat);
    return {
      ...showing,
      film: film._id,
      hall: hall._id,
      seats: listSeats(hall.rows, hall.seatsPerRow).map(({ row, seat }) => ({
        row,
        seat,
        bookingId: isBooked(row, seat) ? booking._id : null,
      })),
      bookings: withBooking ? [booking] : [],
    };
  },
);

async function upsertAll<T extends { _id: Types.ObjectId }>(
  model: Model<T>,
  docs: T[],
) {
  const result = await model.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    })) as never,
  );
  console.log(
    `${model.collection.name}: ${result.upsertedCount} created, ${docs.length - result.upsertedCount} already present`,
  );
}

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  try {
    const filmModel = mongoose.model(Film.name, FilmSchema);
    const hallModel = mongoose.model(Hall.name, HallSchema);
    const showingModel = mongoose.model(Showing.name, ShowingSchema);
    // Builds the indexes declared in the schemas, including the unique hall name.
    await Promise.all([
      filmModel.init(),
      hallModel.init(),
      showingModel.init(),
    ]);

    await upsertAll(filmModel, films);
    await upsertAll(hallModel, halls);
    await upsertAll(showingModel, showings);
    console.log('Seed completed');
  } finally {
    await mongoose.disconnect();
  }
}

await seed();
