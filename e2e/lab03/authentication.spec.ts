import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../server/generated/prisma/client';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const { PrismaPg } = require('@prisma/adapter-pg');
import { hashPassword } from '../../server/src/auth/password';
const url = process.env.LAB03_TEST_DATABASE_URL!;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: '-c search_path=lab03_auth_e2e' }, { schema: 'lab03_auth_e2e' }) });
test.afterAll(() => db.$disconnect());
test('E2E-02 initial login, required change, refresh, logout and replay rejection', async ({ page, context }) => {
    const email = `e2e-${randomUUID()}@example.test`, password = 'initial ' + randomUUID(), newPassword = 'changed ' + randomUUID();
    const user = await db.user.create({ data: { name: 'Browser User', email, passwordHash: await hashPassword(password), role: 'REQUESTER' } });
    try {
        await mkdir('artifacts/lab03/screenshots/auth', { recursive: true });
        await page.goto('/login');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Password', { exact: true }).fill(password);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
        await page.screenshot({ path: `artifacts/lab03/screenshots/auth/${test.info().project.name}-change-password.png`, fullPage: true });
        await expect(page.getByRole('link', { name: 'My Tickets' })).toHaveCount(0);
        const initialCookie = (await context.cookies()).find(c => c.name === 'toktickit_session')!;
        await page.getByLabel('Current password', { exact: true }).fill(password);
        await page.getByLabel('New password', { exact: true }).fill(newPassword);
        await page.getByLabel('Confirm new password', { exact: true }).fill(newPassword);
        await page.getByRole('button', { name: 'Save password' }).click();
        await expect(page.getByRole('link', { name: 'My Tickets' })).toBeVisible();
        await page.reload();
        await expect(page.getByText('Browser User', { exact: true })).toBeVisible();
        await page.screenshot({ path: `artifacts/lab03/screenshots/auth/${test.info().project.name}-shell.png`, fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const oldCookie = (await context.cookies()).find(c => c.name === 'toktickit_session')!;
        expect(oldCookie.value).not.toBe(initialCookie.value);
        await page.getByRole('button', { name: 'Logout' }).click();
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
        await context.addCookies([oldCookie]);
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
        await page.screenshot({ path: `artifacts/lab03/screenshots/auth/${test.info().project.name}-login.png`, fullPage: true });
    }
    finally {
        await db.session.deleteMany({ where: { userId: user.id } });
        await db.user.delete({ where: { id: user.id } });
    }
});
