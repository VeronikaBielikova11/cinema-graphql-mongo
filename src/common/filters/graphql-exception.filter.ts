import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { GqlContextType } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import {
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
} from '../graphql-errors.js';

const CODE_BY_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_USER_INPUT',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
};

const messageOf = (exception: HttpException) => {
  const body = exception.getResponse();
  const message =
    typeof body === 'string' ? body : (body as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.join('; ');
  }
  return typeof message === 'string' ? message : exception.message;
};

// Services throw Nest exceptions; here they get a GraphQL error code.
// Anything else is logged and replaced, so database text never reaches the client.
@Catch()
export class GraphQLExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(GraphQLExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost) {
    // Plain HTTP requests (an unknown route, say) keep the default JSON response.
    if (host.getType<GqlContextType>() !== 'graphql') {
      return super.catch(exception, host);
    }
    if (exception instanceof GraphQLError) {
      return exception;
    }
    if (exception instanceof HttpException) {
      const code = CODE_BY_STATUS[exception.getStatus()];
      if (code) {
        return new GraphQLError(messageOf(exception), {
          extensions: { code },
        });
      }
    }
    this.logger.error(exception);
    return new GraphQLError(INTERNAL_ERROR_MESSAGE, {
      extensions: { code: INTERNAL_ERROR_CODE },
    });
  }
}
