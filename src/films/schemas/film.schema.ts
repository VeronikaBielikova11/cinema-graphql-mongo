import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { positiveInteger } from '../../common/schema-validators.js';

// Every @Prop names its type explicitly, so the schema does not depend on
// decorator metadata (the seed script runs through tsx, which does not emit it).
@Schema({ collection: 'films', versionKey: false })
export class Film {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: Number, required: true, validate: positiveInteger })
  durationMinutes: number;

  @Prop({ type: Number, required: true, validate: positiveInteger })
  releaseYear: number;
}

export type FilmDocument = HydratedDocument<Film>;
export const FilmSchema = SchemaFactory.createForClass(Film);
