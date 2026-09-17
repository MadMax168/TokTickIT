import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { database } from './db';
import { createAuthRouter } from '../../src/auth/router';
import { hashPassword } from '../../src/auth/password';
let db: Awaited<ReturnType<typeof database>>, app: express.Express, now: number;
const origin = 'http://localhost:5173', password = 'local test ' + crypto.randomUUID();
const login = (email = 'a@example.test', pw = password) => request(app).post('/api/auth/login').set('Origin', origin).send({ email, password: pw });
beforeAll(async () => { db = await database(); }, 30000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
    await db.prisma.session.deleteMany();
    await db.prisma.loginFailure.deleteMany();
    await db.prisma.user.deleteMany();
    await db.prisma.user.create({ data: { name: 'A', email: 'a@example.test', passwordHash: await hashPassword(password), role: 'REQUESTER' } });
    now = Date.now();
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(db.prisma, { origin, now: () => new Date(now) }));
});
it('API-01 normalized login for every role returns safe identity and cookie', async () => {
    for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as const) {
        await db.prisma.user.updateMany({ data: { role } });
        const r = await login(' A@EXAMPLE.TEST ');
        expect(r.status).toBe(200);
        expect(r.body.user.role).toBe(role);
        expect(r.headers['set-cookie'][0]).toMatch(/HttpOnly/);
        expect(r.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
        expect(JSON.stringify(r.body)).not.toContain('passwordHash');
        expect(r.headers['cache-control']).toBe('no-store');
    }
});
it('API-02 counts unknown/wrong/inactive failures in durable independent rolling buckets', async () => {
    for (let i = 0; i < 5; i++)
        expect((await login('missing@example.test')).status).toBe(401);
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(db.prisma, { origin, now: () => new Date(now) }));
    const limited = await login();
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBe(900);
    now += 900001;
    expect((await login()).status).toBe(200);
    await login('a@example.test', 'bad');
    await login();
    expect(await db.prisma.loginFailure.count({ where: { key: 'email:a@example.test' } })).toBe(0);
    expect(await db.prisma.loginFailure.count({ where: { key: { startsWith: 'ip:' }, createdAt: { gt: new Date(now - 900000) } } })).toBe(1);
});
it('API-03 inactive account has generic credential failure and old sessions fail', async () => {
    const r = await login();
    await db.prisma.user.updateMany({ data: { active: false } });
    expect((await login()).body.error.code).toBe('INVALID_CREDENTIALS');
    expect((await request(app).get('/api/auth/me').set('Cookie', r.headers['set-cookie'])).status).toBe(401);
});
it('API-05 me and repeat logout revoke server session', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const r = await login(), cookie = r.headers['set-cookie'];
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).body.user.mustChangePassword).toBe(true);
    expect((await request(app).post('/api/auth/logout').set('Origin', origin).set('Cookie', cookie).set('X-CSRF-Token', r.body.csrfToken)).status).toBe(204);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
    expect((await request(app).post('/api/auth/logout').set('Origin', origin).set('Cookie', cookie)).status).toBe(204);
});
it('API-06 expiry and role/activity changes invalidate permanently', async () => {
    let r = await login();
    now += 30 * 60 * 1000;
    expect((await request(app).get('/api/auth/me').set('Cookie', r.headers['set-cookie'])).status).toBe(401);
    r = await login();
    for (let i = 0; i < 16; i++) {
        now += 29 * 60 * 1000;
        expect((await request(app).get('/api/auth/me').set('Cookie', r.headers['set-cookie'])).status).toBe(200);
    }
    now += 16 * 60 * 1000;
    expect((await request(app).get('/api/auth/me').set('Cookie', r.headers['set-cookie'])).status).toBe(401);
    r = await login();
    await db.prisma.user.updateMany({ data: { role: 'IT_STAFF' } });
    expect((await request(app).get('/api/auth/me').set('Cookie', r.headers['set-cookie'])).status).toBe(401);
    await db.prisma.user.updateMany({ data: { role: 'REQUESTER' } });
    expect((await request(app).get('/api/auth/me').set('Cookie', r.headers['set-cookie'])).status).toBe(401);
});
it('AUTH-CHANGE: validates change, rotates token and revokes every old session', async () => {
    const a = await login(), b = await login();
    const change = (body: any) => request(app).post('/api/auth/change-password').set('Origin', origin).set('Cookie', a.headers['set-cookie']).set('X-CSRF-Token', a.body.csrfToken).send(body);
    for (const newPassword of ['short', ' '.repeat(12), 'x'.repeat(129), password])
        expect((await change({ currentPassword: password, newPassword, confirmPassword: newPassword })).status).toBe(400);
    const next = 'new ' + crypto.randomUUID();
    expect((await change({ currentPassword: 'wrong', newPassword: next, confirmPassword: next })).body.error.code).toBe('CURRENT_PASSWORD_INVALID');
    expect((await change({ currentPassword: password, newPassword: next, confirmPassword: 'different' })).status).toBe(400);
    const r = await change({ currentPassword: password, newPassword: next, confirmPassword: next });
    expect(r.status).toBe(200);
    expect(r.body.user.mustChangePassword).toBe(false);
    expect(r.body.csrfToken).not.toBe(a.body.csrfToken);
    for (const old of [a, b])
        expect((await request(app).get('/api/auth/me').set('Cookie', old.headers['set-cookie'])).status).toBe(401);
    expect((await login('a@example.test', next)).status).toBe(200);
});
it('AUTH-CSRF: protects mutations and rejects mass assignment and unsafe errors', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'a@example.test', password })).status).toBe(403);
    expect((await request(app).post('/api/auth/login').set('Origin', 'https://evil.test').send({ email: 'a@example.test', password })).status).toBe(403);
    const a = await login();
    expect((await request(app).post('/api/auth/logout').set('Origin', origin).set('Cookie', a.headers['set-cookie'])).status).toBe(403);
    expect((await request(app).post('/api/auth/login').set('Origin', origin).send({ email: 'a@example.test', password, role: 'ADMINISTRATOR' })).status).toBe(400);
    const spy = vi.spyOn(db.prisma, '$transaction').mockRejectedValueOnce(new Error('secret DB detail'));
    const r = await login();
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('secret DB');
    spy.mockRestore();
});
it('AUTH-CSRF secure cookies, invalid CSRF and valid login rotate existing sessions', async () => {
    const secured = express();
    secured.use(express.json());
    secured.use('/api/auth', createAuthRouter(db.prisma, { origin, secure: true }));
    const secure = await request(secured).post('/api/auth/login').set('Origin', origin).send({ email: 'a@example.test', password });
    expect(secure.headers['set-cookie'][0]).toContain('Secure');
    expect(secure.headers['set-cookie'][0]).not.toContain('Domain=');
    const a = await login();
    expect((await request(app).post('/api/auth/change-password').set('Origin', origin).set('Cookie', a.headers['set-cookie']).set('X-CSRF-Token', 'invalid').send({ currentPassword: password, newPassword: 'x'.repeat(12), confirmPassword: 'x'.repeat(12) })).status).toBe(403);
    const b = await request(app).post('/api/auth/login').set('Origin', origin).set('Cookie', a.headers['set-cookie']).send({ email: 'a@example.test', password });
    expect(b.body.csrfToken).not.toBe(a.body.csrfToken);
    expect((await request(app).get('/api/auth/me').set('Cookie', a.headers['set-cookie'])).status).toBe(401);
    expect((await request(app).get('/api/auth/me?extra=true').set('Cookie', b.headers['set-cookie'])).status).toBe(400);
});
it('API-02 concurrent invalid attempts cannot bypass threshold', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => login('missing@example.test')));
    expect(results.filter(r => r.status === 401)).toHaveLength(5);
    expect(results.filter(r => r.status === 429)).toHaveLength(3);
});
it('API-06 deactivation followed by activation never revives a cookie', async () => {
    const a = await login();
    await db.prisma.user.updateMany({ data: { active: false } });
    await db.prisma.user.updateMany({ data: { active: true } });
    expect((await request(app).get('/api/auth/me').set('Cookie', a.headers['set-cookie'])).status).toBe(401);
});
