import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from '../common/object-id.js';
import { CreateFilmInput } from './dto/create-film.input.js';
import { UpdateFilmInput } from './dto/update-film.input.js';
import { FilmsService } from './films.service.js';
import { FilmType } from './models/film.type.js';

@Resolver(() => FilmType)
export class FilmsResolver {
  constructor(private readonly filmsService: FilmsService) {}

  @Query(() => [FilmType])
  films() {
    return this.filmsService.findAll();
  }

  @Query(() => FilmType, { nullable: true })
  film(@Args('id', { type: () => ID }, ParseObjectIdPipe) id: Types.ObjectId) {
    return this.filmsService.findOne(id);
  }

  @Mutation(() => FilmType)
  createFilm(@Args('input') input: CreateFilmInput) {
    return this.filmsService.create(input);
  }

  @Mutation(() => FilmType)
  updateFilm(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: Types.ObjectId,
    @Args('input') input: UpdateFilmInput,
  ) {
    return this.filmsService.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteFilm(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    await this.filmsService.remove(id);
    return true;
  }
}
