import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from '../common/object-id.js';
import { FilmType } from '../films/models/film.type.js';
import { HallType } from '../halls/models/hall.type.js';
import type { GraphQLContext } from '../loaders/loaders.service.js';
import { CreateShowingInput } from './dto/create-showing.input.js';
import { ShowingsArgs } from './dto/showings.args.js';
import { ShowingPageType, ShowingType } from './models/showing.type.js';
import { ShowingsService } from './showings.service.js';

@Resolver(() => ShowingType)
export class ShowingsResolver {
  constructor(private readonly showingsService: ShowingsService) {}

  @Query(() => ShowingPageType)
  showings(@Args() args: ShowingsArgs) {
    return this.showingsService.findAll(args);
  }

  @Query(() => ShowingType, { nullable: true })
  showing(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.showingsService.findOne(id);
  }

  @Mutation(() => ShowingType)
  createShowing(@Args('input') input: CreateShowingInput) {
    return this.showingsService.create(input);
  }

  // Both fields go through the per-request loaders: every showing on a page
  // queues its id, and one $in query per collection answers them all.
  @ResolveField(() => FilmType)
  film(@Parent() showing: ShowingType, @Context() context: GraphQLContext) {
    return context.loaders.film.load(showing.film.toString());
  }

  @ResolveField(() => HallType)
  hall(@Parent() showing: ShowingType, @Context() context: GraphQLContext) {
    return context.loaders.hall.load(showing.hall.toString());
  }
}
