import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/trim.decorator.js';
import { FIRST_FILM_YEAR } from './create-film.input.js';

// ValidateIf instead of IsOptional: IsOptional would also let an explicit null through.
const isProvided = (_: object, value: unknown) => value !== undefined;

@InputType()
export class UpdateFilmInput {
  @Field(() => String, { nullable: true })
  @ValidateIf(isProvided)
  @Trim()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @Field(() => Int, { nullable: true })
  @ValidateIf(isProvided)
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @Field(() => Int, { nullable: true })
  @ValidateIf(isProvided)
  @IsInt()
  @Min(FIRST_FILM_YEAR)
  releaseYear?: number;
}
