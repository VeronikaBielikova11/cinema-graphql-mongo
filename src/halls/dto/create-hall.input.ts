import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsPositive, IsString, Max } from 'class-validator';
import { Trim } from '../../common/trim.decorator.js';

// Every showing stores the whole seat list, and a document is limited to 16 MB.
const MAX_ROWS = 100;
const MAX_SEATS_PER_ROW = 100;

@InputType()
export class CreateHallInput {
  @Field(() => String)
  @Trim()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  @Max(MAX_ROWS)
  rows: number;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  @Max(MAX_SEATS_PER_ROW)
  seatsPerRow: number;
}
