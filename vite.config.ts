import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Keep media queries as (min-width: …) — range syntax needs iOS 16.4+, and classroom iPads lag.
    cssTarget: ['safari14'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
