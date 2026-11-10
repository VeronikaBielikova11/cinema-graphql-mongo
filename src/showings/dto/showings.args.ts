import { ArgsType, Field, ID, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { objectIdMessage } from '../../common/object-id.js';
import { SortOrder } from '../models/showing.type.js';

export const MAX_PAGE_LIMIT = 100;

// The schema default covers an omitted argument, this one covers an explicit null.
const orDefault =
  <T>(fallback: T) =>
  ({ value }: { value: unknown }) =>
    value ?? fallback;

@ArgsType()
export class ShowingsArgs {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId({ message: objectIdMessage('filmId') })
  filmId?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must match YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'date must be a real calendar date' })
  date?: string | null;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @Transform(orDefault(1))
  @IsInt()
  @Min(1)
  page: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @Transform(orDefault(20))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit: number;

  @Field(() => SortOrder, { nullable: true, defaultValue: SortOrder.ASC })
  @Transform(orDefault(SortOrder.ASC))
  @IsEnum(SortOrder)
  sort: SortOrder;
}
