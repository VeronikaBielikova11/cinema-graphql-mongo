import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';

@ObjectType('Film')
export class FilmType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  @Field(() => String)
  title: string;

  @Field(() => Int)
  durationMinutes: number;

  @Field(() => Int)
  releaseYear: number;
}
