import { defineConfig } from '@playwright/test'

const e2eDatabaseUrl = 'postgresql://toktickit:toktickit@127.0.0.1:5434/toktickit_e2e'

export default defineConfig({
  testDir: './e2e/lab02',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: './server',
      url: 'http://127.0.0.1:3000/api/health',
      reuseExistingServer: false,
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl, PORT: '3000' },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      cwd: './client',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
})
