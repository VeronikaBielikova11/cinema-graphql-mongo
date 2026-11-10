import { defineConfig } from 'vitest/config';

// e2e tests use their own database next to the development one.
try {
  process.loadEnvFile();
} catch {
  // Variables may come from the environment instead of .env.
}
const uri = new URL(
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/cinema',
);
uri.pathname = '/cinema_test';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // process.env wins over .env in ConfigModule, so the app connects to the test database.
    env: { MONGODB_URI: uri.toString() },
    fileParallelism: false,
    hookTimeout: 30000,
  },
});
