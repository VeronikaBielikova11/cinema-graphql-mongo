import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GraphQLExceptionFilter } from './common/filters/graphql-exception.filter.js';

export function setupApp(app: INestApplication) {
  // A global pipe also runs for resolver arguments.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GraphQLExceptionFilter(app.getHttpAdapter()));
}
