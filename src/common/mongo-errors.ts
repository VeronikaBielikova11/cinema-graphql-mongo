export const MONGO_DUPLICATE_KEY = 11000;

export const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === MONGO_DUPLICATE_KEY;
