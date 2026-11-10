import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsPositive, IsString, Min } from 'class-validator';
import { Trim } from '../../common/trim.decorator.js';

export const FIRST_FILM_YEAR = 1888;

@InputType()
export class CreateFilmInput {
  @Field(() => String)
  @Trim()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @Field(() => Int)
  @IsInt()
  @Min(FIRST_FILM_YEAR)
  releaseYear: number;
}
