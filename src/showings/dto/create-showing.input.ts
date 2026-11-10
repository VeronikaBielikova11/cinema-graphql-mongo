import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsDate, IsInt, IsMongoId, IsPositive, Max } from 'class-validator';
import { IsFutureDate } from '../../common/is-future-date.decorator.js';
import { objectIdMessage } from '../../common/object-id.js';

const MAX_PRICE = 100_000_000;

@InputType()
export class CreateShowingInput {
  @Field(() => ID)
  @IsMongoId({ message: objectIdMessage('filmId') })
  filmId: string;

  @Field(() => ID)
  @IsMongoId({ message: objectIdMessage('hallId') })
  hallId: string;

  @Field(() => Date)
  @IsDate()
  @IsFutureDate()
  startsAt: Date;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  @Max(MAX_PRICE)
  price: number;
}
