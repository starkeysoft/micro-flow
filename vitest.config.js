import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.js'],
    mockReset: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'doc/',
        '__mocks__/',
        '**/*.config.js',
        '**/*.setup.js',
        'build.js',
      ],
    },
  },
  resolve: {
    alias: {
      events: new URL('./__mocks__/events.js', import.meta.url).pathname,
    },
  },
});
