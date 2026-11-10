import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';

@ObjectType('Hall')
export class HallType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  rows: number;

  @Field(() => Int)
  seatsPerRow: number;
}
