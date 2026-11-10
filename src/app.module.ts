import { join } from 'node:path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsModule } from './bookings/bookings.module.js';
import { formatGraphQLError } from './common/graphql-errors.js';
import { EnvironmentVariables, validateEnv } from './config/env.validation.js';
import { FilmsModule } from './films/films.module.js';
import { HallsModule } from './halls/halls.module.js';
import { LoadersModule } from './loaders/loaders.module.js';
import { GraphQLContext, LoadersService } from './loaders/loaders.service.js';
import { ShowingsModule } from './showings/showings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [LoadersModule],
      inject: [LoadersService],
      useFactory: (loaders: LoadersService) => ({
        autoSchemaFile: join(process.cwd(), 'schema.gql'),
        sortSchema: true,
        // Field resolvers skip enhancers by default; their errors need the filter too.
        fieldResolverEnhancers: ['filters'],
        includeStacktraceInErrorResponses: false,
        formatError: formatGraphQLError,
        // A new set of loaders per request: a shared one would serve stale documents.
        context: (): GraphQLContext => ({ loaders: loaders.create() }),
      }),
    }),
    FilmsModule,
    HallsModule,
    ShowingsModule,
    BookingsModule,
  ],
})
export class AppModule {}
