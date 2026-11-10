import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

// 24 hexadecimal characters. Types.ObjectId.isValid() is not used on purpose:
// it also accepts any 12-character string.
const OBJECT_ID = /^[a-f\d]{24}$/i;

export const objectIdMessage = (name: string) =>
  `${name} must be a valid ObjectId: a string of 24 hexadecimal characters`;

// Checks the id format before any query reaches MongoDB.
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<
  string,
  Types.ObjectId
> {
  transform(value: string) {
    if (!OBJECT_ID.test(value)) {
      throw new BadRequestException(objectIdMessage('id'));
    }
    return new Types.ObjectId(value);
  }
}
