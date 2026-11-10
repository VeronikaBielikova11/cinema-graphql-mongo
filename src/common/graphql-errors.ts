import { GraphQLFormattedError } from 'graphql';

export const INTERNAL_ERROR_CODE = 'INTERNAL_SERVER_ERROR';
export const INTERNAL_ERROR_MESSAGE = 'Internal server error';

const BAD_USER_INPUT = 'BAD_USER_INPUT';
const GRAPHQL_VALIDATION_FAILED = 'GRAPHQL_VALIDATION_FAILED';

// What graphql-js says about an inline literal of the wrong value, for example
// price: 12.5. Apollo labels it as a malformed query, but it is bad input.
// The same value passed through a variable is already BAD_USER_INPUT.
const BAD_LITERAL =
  /cannot represent|^Expected value of type|does not exist in ".+" enum/;

// Last step before the response leaves the server.
export function formatGraphQLError(
  error: GraphQLFormattedError,
): GraphQLFormattedError {
  const code = error.extensions?.code;
  if (code === INTERNAL_ERROR_CODE) {
    return {
      message: INTERNAL_ERROR_MESSAGE,
      locations: error.locations,
      path: error.path,
      extensions: { code },
    };
  }
  if (code === GRAPHQL_VALIDATION_FAILED && BAD_LITERAL.test(error.message)) {
    return {
      ...error,
      extensions: { ...error.extensions, code: BAD_USER_INPUT },
    };
  }
  return error;
}
