import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { FilmsService } from './../src/films/films.service.js';

// Well-formed ObjectId that no document has, and a malformed one.
const MISSING_ID = '000000000000000000000000';
const BAD_ID = 'not-an-object-id';

interface GqlResponse {
  data: any;
  errors?: { message: string; extensions: Record<string, unknown> }[];
}

describe('Cinema GraphQL API (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  const gql = async (query: string, variables = {}) =>
    (
      await request(app.getHttpServer())
        .post('/graphql')
        .send({ query, variables })
    ).body as GqlResponse;

  const errorCode = (body: GqlResponse) => body.errors?.[0].extensions.code;

  const createFilm = async (title = 'Film') =>
    (
      await gql(
        `mutation($input: CreateFilmInput!) { createFilm(input: $input) { id title } }`,
        { input: { title, durationMinutes: 90, releaseYear: 2000 } },
      )
    ).data.createFilm;

  let hallCounter = 0;
  const createHall = async (rows = 3, seatsPerRow = 5) =>
    (
      await gql(
        `mutation($input: CreateHallInput!) { createHall(input: $input) { id name } }`,
        { input: { name: `Hall ${++hallCounter}`, rows, seatsPerRow } },
      )
    ).data.createHall;

  const CREATE_SHOWING = `mutation($input: CreateShowingInput!) {
    createShowing(input: $input) {
      id price startsAt
      film { title } hall { name }
      seats { row seat isBooked }
      bookings { id }
    }
  }`;

  const createShowing = async (
    filmId: string,
    hallId: string,
    startsAt = '2030-06-15T18:00:00.000Z',
    price = 12500,
  ) =>
    (
      await gql(CREATE_SHOWING, {
        input: { filmId, hallId, startsAt, price },
      })
    ).data.createShowing;

  const BOOK = `mutation($showingId: ID!, $seats: [SeatInput!]!) {
    createBooking(showingId: $showingId, seats: $seats) {
      id showingId totalPrice createdAt seats { row seat }
    }
  }`;

  const seatsOf = async (id: string) =>
    (
      await gql(
        `query($id: ID!) { showing(id: $id) { seats { row seat isBooked } bookings { id showingId } } }`,
        { id },
      )
    ).data.showing;

  const newShowing = async () => {
    const film = await createFilm();
    const hall = await createHall();
    return createShowing(film.id, hall.id);
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    // deleteMany keeps the collections and their indexes (the unique hall name).
    connection = app.get<Connection>(getConnectionToken());
    await Promise.all(
      Object.values(connection.models).map((model) => model.deleteMany({})),
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  describe('schema', () => {
    it('is generated into the configured file and matches the contract', () => {
      const schema = readFileSync(join(process.cwd(), 'schema.gql'), 'utf8');
      expect(schema).toContain('type Showing {');
      expect(schema).toMatch(/film: Film!/);
      expect(schema).toMatch(/hall: Hall!/);
      expect(schema).toMatch(/startsAt: DateTime!/);
      expect(schema).toMatch(
        /createBooking\(seats: \[SeatInput!\]!, showingId: ID!\): Booking!/,
      );
      expect(schema).not.toMatch(/_id/);
      expect(schema).toMatch(/enum SortOrder/);
    });
  });

  describe('films', () => {
    it('creates, reads, updates and deletes a film, exposing _id as id', async () => {
      const film = await createFilm('A');
      expect(film.id).toMatch(/^[a-f\d]{24}$/);

      const list = await gql(`{ films { id title } }`);
      expect(list.data.films).toEqual([film]);

      const updated = await gql(
        `mutation($id: ID!) { updateFilm(id: $id, input: { title: "B" }) { title releaseYear } }`,
        { id: film.id },
      );
      expect(updated.data.updateFilm).toEqual({
        title: 'B',
        releaseYear: 2000,
      });

      const removed = await gql(`mutation($id: ID!) { deleteFilm(id: $id) }`, {
        id: film.id,
      });
      expect(removed.data.deleteFilm).toBe(true);
      expect((await gql(`{ films { id } }`)).data.films).toEqual([]);
    });

    it('returns null without an error for a missing film, hall and showing', async () => {
      const body = await gql(
        `query($id: ID!) { film(id: $id) { id } hall(id: $id) { id } showing(id: $id) { id } }`,
        { id: MISSING_ID },
      );
      expect(body.errors).toBeUndefined();
      expect(body.data).toEqual({ film: null, hall: null, showing: null });
    });

    it.each([
      ['film', `query($id: ID!) { film(id: $id) { id } }`],
      ['hall', `query($id: ID!) { hall(id: $id) { id } }`],
      ['showing', `query($id: ID!) { showing(id: $id) { id } }`],
      ['deleteFilm', `mutation($id: ID!) { deleteFilm(id: $id) }`],
      ['cancelBooking', `mutation($id: ID!) { cancelBooking(id: $id) }`],
    ])('%s rejects a malformed id with BAD_USER_INPUT', async (_, query) => {
      expect(errorCode(await gql(query, { id: BAD_ID }))).toBe(
        'BAD_USER_INPUT',
      );
    });

    it.each([
      [
        'updateFilm',
        `mutation($id: ID!) { updateFilm(id: $id, input: { title: "X" }) { id } }`,
      ],
      ['deleteFilm', `mutation($id: ID!) { deleteFilm(id: $id) }`],
      ['deleteHall', `mutation($id: ID!) { deleteHall(id: $id) }`],
      ['cancelBooking', `mutation($id: ID!) { cancelBooking(id: $id) }`],
    ])('%s on a missing document gives NOT_FOUND', async (_, query) => {
      expect(errorCode(await gql(query, { id: MISSING_ID }))).toBe('NOT_FOUND');
    });

    it.each([
      [{ title: '   ', durationMinutes: 90, releaseYear: 2000 }],
      [{ title: 'A', durationMinutes: 0, releaseYear: 2000 }],
      [{ title: 'A', durationMinutes: 90, releaseYear: 1000 }],
    ])('rejects invalid input %j with BAD_USER_INPUT', async (input) => {
      const body = await gql(
        `mutation($input: CreateFilmInput!) { createFilm(input: $input) { id } }`,
        { input },
      );
      expect(errorCode(body)).toBe('BAD_USER_INPUT');
    });

    it('rejects an explicit null in an update', async () => {
      const film = await createFilm();
      const body = await gql(
        `mutation($id: ID!) { updateFilm(id: $id, input: { title: null }) { id } }`,
        { id: film.id },
      );
      expect(errorCode(body)).toBe('BAD_USER_INPUT');
    });

    it('refuses to delete a film or a hall that has a showing', async () => {
      const film = await createFilm();
      const hall = await createHall();
      await createShowing(film.id, hall.id);
      expect(
        errorCode(
          await gql(`mutation($id: ID!) { deleteFilm(id: $id) }`, {
            id: film.id,
          }),
        ),
      ).toBe('CONFLICT');
      expect(
        errorCode(
          await gql(`mutation($id: ID!) { deleteHall(id: $id) }`, {
            id: hall.id,
          }),
        ),
      ).toBe('CONFLICT');
    });
  });

  describe('halls', () => {
    it('gives CONFLICT for a duplicate name', async () => {
      const query = `mutation { createHall(input: { name: "Same", rows: 1, seatsPerRow: 1 }) { id } }`;
      expect((await gql(query)).errors).toBeUndefined();
      expect(errorCode(await gql(query))).toBe('CONFLICT');
    });

    it('does not expose seats on Hall', async () => {
      expect((await gql(`{ halls { seats { row } } }`)).errors).toBeDefined();
    });
  });

  describe('showings', () => {
    it('fills seats from the hall layout and starts with no bookings', async () => {
      const film = await createFilm('Title');
      const hall = await createHall(2, 3);
      const showing = await createShowing(film.id, hall.id);
      expect(showing.seats).toHaveLength(6);
      expect(showing.seats[0]).toEqual({ row: 1, seat: 1, isBooked: false });
      expect(showing.bookings).toEqual([]);
      expect(showing.film.title).toBe('Title');
      expect(showing.hall.name).toBe(hall.name);
    });

    it('gives NOT_FOUND for a missing film or hall', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const startsAt = '2030-01-01T00:00:00.000Z';
      for (const input of [
        { filmId: MISSING_ID, hallId: hall.id, startsAt, price: 1 },
        { filmId: film.id, hallId: MISSING_ID, startsAt, price: 1 },
      ]) {
        expect(errorCode(await gql(CREATE_SHOWING, { input }))).toBe(
          'NOT_FOUND',
        );
      }
    });

    it.each([
      ['a past date', { startsAt: '2001-01-01T00:00:00.000Z', price: 100 }],
      ['a zero price', { startsAt: '2030-01-01T00:00:00.000Z', price: 0 }],
      ['a negative price', { startsAt: '2030-01-01T00:00:00.000Z', price: -5 }],
      [
        'a fractional price',
        { startsAt: '2030-01-01T00:00:00.000Z', price: 1.5 },
      ],
    ])('rejects %s with BAD_USER_INPUT', async (_, fields) => {
      const film = await createFilm();
      const hall = await createHall();
      const body = await gql(CREATE_SHOWING, {
        input: { filmId: film.id, hallId: hall.id, ...fields },
      });
      expect(errorCode(body)).toBe('BAD_USER_INPUT');
    });

    it('gives BAD_USER_INPUT for a bad inline literal too', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const literal = (startsAt: string, price: string) =>
        `mutation { createShowing(input: { filmId: "${film.id}", hallId: "${hall.id}", startsAt: ${startsAt}, price: ${price} }) { id } }`;
      expect(
        errorCode(await gql(literal('"2030-01-01T00:00:00.000Z"', '12.5'))),
      ).toBe('BAD_USER_INPUT');
      expect(errorCode(await gql(literal('"not a date"', '100')))).toBe(
        'BAD_USER_INPUT',
      );
    });

    describe('list', () => {
      let filmA: { id: string };
      const page = (args: string) =>
        gql(
          `{ showings${args} { total page limit items { startsAt film { title } } } }`,
        );

      beforeEach(async () => {
        filmA = await createFilm('A');
        const filmB = await createFilm('B');
        const hall = await createHall();
        await createShowing(filmA.id, hall.id, '2030-06-15T23:30:00.000Z');
        await createShowing(filmA.id, hall.id, '2030-06-16T00:30:00.000Z');
        await createShowing(filmB.id, hall.id, '2030-06-15T10:00:00.000Z');
      });

      it('uses the defaults: first page, 20 items, ascending', async () => {
        const { data } = await page('');
        expect(data.showings).toMatchObject({ total: 3, page: 1, limit: 20 });
        expect(data.showings.items.map((s: any) => s.startsAt)).toEqual([
          '2030-06-15T10:00:00.000Z',
          '2030-06-15T23:30:00.000Z',
          '2030-06-16T00:30:00.000Z',
        ]);
      });

      it('treats explicit nulls as absent', async () => {
        const { data, errors } = await page(
          '(page: null, limit: null, sort: null, filmId: null, date: null)',
        );
        expect(errors).toBeUndefined();
        expect(data.showings).toMatchObject({ total: 3, page: 1, limit: 20 });
      });

      it('pages and sorts descending, total ignoring the page', async () => {
        const { data } = await page('(page: 2, limit: 1, sort: DESC)');
        expect(data.showings).toMatchObject({ total: 3, page: 2, limit: 1 });
        expect(data.showings.items).toEqual([
          { startsAt: '2030-06-15T23:30:00.000Z', film: { title: 'A' } },
        ]);
      });

      it('applies filmId and date together', async () => {
        const { data } = await page(
          `(filmId: "${filmA.id}", date: "2030-06-15")`,
        );
        expect(data.showings.total).toBe(1);
        expect(data.showings.items[0].startsAt).toBe(
          '2030-06-15T23:30:00.000Z',
        );
      });

      it.each([
        ['page: 0'],
        ['limit: 0'],
        ['limit: 101'],
        ['date: "15.06.2030"'],
        ['date: "2030-02-31"'],
        ['filmId: "bad"'],
        ['sort: UP'],
      ])('rejects %s with BAD_USER_INPUT', async (args) => {
        expect(errorCode(await page(`(${args})`))).toBe('BAD_USER_INPUT');
      });
    });

    it('loads film and hall with one query per collection (no N+1)', async () => {
      const films = await Promise.all([createFilm('A'), createFilm('B')]);
      const halls = await Promise.all([createHall(), createHall()]);
      for (let i = 0; i < 6; i++) {
        await createShowing(
          films[i % 2].id,
          halls[i % 2].id,
          `2030-06-1${i}T10:00:00.000Z`,
        );
      }
      const findFilms = vi.spyOn(connection.models.Film, 'find');
      const findHalls = vi.spyOn(connection.models.Hall, 'find');
      const findFilm = vi.spyOn(connection.models.Film, 'findById');
      const findHall = vi.spyOn(connection.models.Hall, 'findById');

      const { data, errors } = await gql(
        `{ showings { items { film { title } hall { name } } } }`,
      );

      expect(errors).toBeUndefined();
      expect(data.showings.items).toHaveLength(6);
      expect(data.showings.items[1].film.title).toBe('B');
      expect(findFilms).toHaveBeenCalledTimes(1);
      expect(findHalls).toHaveBeenCalledTimes(1);
      expect(findFilm).not.toHaveBeenCalled();
      expect(findHall).not.toHaveBeenCalled();
    });

    it('does not cache loaded documents between requests', async () => {
      const film = await createFilm('Old');
      const hall = await createHall();
      await createShowing(film.id, hall.id);
      const title = async () =>
        (await gql(`{ showings { items { film { title } } } }`)).data.showings
          .items[0].film.title;
      expect(await title()).toBe('Old');
      await gql(
        `mutation($id: ID!) { updateFilm(id: $id, input: { title: "New" }) { id } }`,
        { id: film.id },
      );
      expect(await title()).toBe('New');
    });
  });

  describe('bookings', () => {
    const seat = (row: number, s: number) => ({ row, seat: s });

    it('books seats, computes the total and marks the seats', async () => {
      const showing = await newShowing();
      const { data } = await gql(BOOK, {
        showingId: showing.id,
        seats: [seat(1, 1), seat(1, 2)],
      });
      expect(data.createBooking).toMatchObject({
        showingId: showing.id,
        totalPrice: 25000,
        seats: [seat(1, 1), seat(1, 2)],
      });

      const after = await seatsOf(showing.id);
      expect(after.seats.filter((s: any) => s.isBooked)).toHaveLength(2);
      expect(after.bookings).toEqual([
        { id: data.createBooking.id, showingId: showing.id },
      ]);

      const all = await gql(
        `{ bookings { id showingId totalPrice seats { row seat } } }`,
      );
      expect(all.data.bookings).toEqual([
        {
          id: data.createBooking.id,
          showingId: showing.id,
          totalPrice: 25000,
          seats: [seat(1, 1), seat(1, 2)],
        },
      ]);
    });

    it('gives CONFLICT for a taken seat and books none of the list', async () => {
      const showing = await newShowing();
      await gql(BOOK, { showingId: showing.id, seats: [seat(1, 1)] });
      const body = await gql(BOOK, {
        showingId: showing.id,
        seats: [seat(1, 2), seat(1, 1)],
      });
      expect(errorCode(body)).toBe('CONFLICT');
      const after = await seatsOf(showing.id);
      expect(after.seats.filter((s: any) => s.isBooked)).toHaveLength(1);
      expect(after.bookings).toHaveLength(1);
    });

    it('lets only one of many concurrent requests take a seat', async () => {
      const showing = await newShowing();
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          gql(BOOK, { showingId: showing.id, seats: [seat(2, 2)] }),
        ),
      );
      expect(results.filter((r) => !r.errors)).toHaveLength(1);
      expect(results.filter((r) => errorCode(r) === 'CONFLICT')).toHaveLength(
        9,
      );
      expect((await seatsOf(showing.id)).bookings).toHaveLength(1);
    });

    it.each([
      ['an empty list', []],
      ['a repeated seat', [seat(1, 1), seat(1, 1)]],
      ['a row outside the hall', [seat(9, 1)]],
      ['a seat outside the hall', [seat(1, 9)]],
      ['a non-positive seat', [seat(0, 1)]],
    ])('rejects %s with BAD_USER_INPUT', async (_, seats) => {
      const showing = await newShowing();
      expect(errorCode(await gql(BOOK, { showingId: showing.id, seats }))).toBe(
        'BAD_USER_INPUT',
      );
      expect((await seatsOf(showing.id)).bookings).toEqual([]);
    });

    it('checks the repeated seat before touching the database', async () => {
      const findById = vi.spyOn(connection.models.Showing, 'findById');
      const body = await gql(BOOK, {
        showingId: MISSING_ID,
        seats: [seat(1, 1), seat(1, 1)],
      });
      expect(errorCode(body)).toBe('BAD_USER_INPUT');
      expect(findById).not.toHaveBeenCalled();
    });

    it('gives NOT_FOUND for a missing showing and BAD_USER_INPUT for a malformed id', async () => {
      expect(
        errorCode(
          await gql(BOOK, { showingId: MISSING_ID, seats: [seat(1, 1)] }),
        ),
      ).toBe('NOT_FOUND');
      expect(
        errorCode(await gql(BOOK, { showingId: BAD_ID, seats: [seat(1, 1)] })),
      ).toBe('BAD_USER_INPUT');
    });

    it('cancels a booking, frees the seats and allows booking them again', async () => {
      const showing = await newShowing();
      const { data } = await gql(BOOK, {
        showingId: showing.id,
        seats: [seat(1, 1)],
      });
      const body = await gql(`mutation($id: ID!) { cancelBooking(id: $id) }`, {
        id: data.createBooking.id,
      });
      expect(body.data.cancelBooking).toBe(true);
      const after = await seatsOf(showing.id);
      expect(after.seats.some((s: any) => s.isBooked)).toBe(false);
      expect(after.bookings).toEqual([]);
      expect(
        (await gql(BOOK, { showingId: showing.id, seats: [seat(1, 1)] }))
          .errors,
      ).toBeUndefined();
    });
  });

  describe('error privacy', () => {
    it('hides database details in a query', async () => {
      vi.spyOn(app.get(FilmsService), 'findAll').mockRejectedValue(
        new Error('E11000 secret collection detail'),
      );
      const body = await gql(`{ films { id } }`);
      expect(errorCode(body)).toBe('INTERNAL_SERVER_ERROR');
      expect(JSON.stringify(body)).not.toContain('secret');
      expect(body.errors?.[0].extensions.stacktrace).toBeUndefined();
    });

    it('hides database details in a nested field resolver', async () => {
      const film = await createFilm();
      const hall = await createHall();
      await createShowing(film.id, hall.id);
      vi.spyOn(app.get(FilmsService), 'findByIds').mockRejectedValue(
        new Error('secret connection string'),
      );
      const body = await gql(`{ showings { items { film { title } } } }`);
      expect(errorCode(body)).toBe('INTERNAL_SERVER_ERROR');
      expect(JSON.stringify(body)).not.toContain('secret');
    });
  });

  it('has no REST routes left', async () => {
    await request(app.getHttpServer()).get('/films').expect(404);
    await request(app.getHttpServer()).get('/docs').expect(404);
  });
});
