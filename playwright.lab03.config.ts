import { defineConfig } from '@playwright/test';
if (!process.env.LAB03_TEST_DATABASE_URL)
    throw new Error('Set LAB03_TEST_DATABASE_URL to an isolated local test database');
const url = new URL(process.env.LAB03_TEST_DATABASE_URL);
url.searchParams.set('schema', 'lab03_auth_e2e');
export default defineConfig({
    testDir: './e2e/lab03', testMatch: 'authentication.spec.ts', workers: 1, timeout: 60000,
    globalSetup: './e2e/lab03/global-setup.ts',
    use: { baseURL: 'http://127.0.0.1:5175', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    webServer: [
        { command: 'npm run dev', cwd: 'server', url: 'http://127.0.0.1:3005/api/health', env: { ...process.env, DATABASE_URL: url.toString(), PORT: '3005', APP_ORIGIN: 'http://127.0.0.1:5175' } },
        { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort', cwd: 'client', url: 'http://127.0.0.1:5175', env: { ...process.env, VITE_API_TARGET: 'http://127.0.0.1:3005' } },
    ],
    projects: [{ name: 'desktop', use: { viewport: { width: 1280, height: 900 } } }, { name: 'tablet', use: { viewport: { width: 820, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }],
});
