import { ArgsType, Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsMongoId,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { objectIdMessage } from '../../common/object-id.js';

@InputType()
export class SeatInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  row: number;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  seat: number;
}

// A class rather than separate @Args: ValidationPipe skips a bare array argument.
@ArgsType()
export class CreateBookingArgs {
  @Field(() => ID)
  @IsMongoId({ message: objectIdMessage('showingId') })
  showingId: string;

  @Field(() => [SeatInput])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: SeatInput) => `${item.row}:${item.seat}`, {
    message: 'seats must not contain the same seat twice',
  })
  @ValidateNested({ each: true })
  @Type(() => SeatInput)
  seats: SeatInput[];
}
