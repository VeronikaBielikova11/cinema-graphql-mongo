import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from '../common/object-id.js';
import { CreateHallInput } from './dto/create-hall.input.js';
import { HallsService } from './halls.service.js';
import { HallType } from './models/hall.type.js';

@Resolver(() => HallType)
export class HallsResolver {
  constructor(private readonly hallsService: HallsService) {}

  @Query(() => [HallType])
  halls() {
    return this.hallsService.findAll();
  }

  @Query(() => HallType, { nullable: true })
  hall(@Args('id', { type: () => ID }, ParseObjectIdPipe) id: Types.ObjectId) {
    return this.hallsService.findOne(id);
  }

  @Mutation(() => HallType)
  createHall(@Args('input') input: CreateHallInput) {
    return this.hallsService.create(input);
  }

  @Mutation(() => Boolean)
  async deleteHall(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    await this.hallsService.remove(id);
    return true;
  }
}
