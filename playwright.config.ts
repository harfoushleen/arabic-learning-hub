import { defineConfig } from '@playwright/test';

const PORT = 4300;

// The teacher code for the e2e tests is not in the repo: it comes from TEACHER_CODE or the git-ignored .env.local.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* no .env.local: TEACHER_CODE must be in the environment */
}

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ar',
    // Static emoji art and no motion keep screenshots and no-scroll checks stable.
    reducedMotion: 'reduce',
  },
  // Each viewport's describe block is tagged with the browser it must run in.
  projects: [
    { name: 'webkit', use: { browserName: 'webkit' }, grep: /@webkit/ },
    { name: 'chromium', use: { browserName: 'chromium' }, grep: /@chromium/ },
  ],
  webServer: {
    // Always test a fresh production build.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
