import { Router, type Request, type Response } from 'express';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PrismaClient, Prisma, User as DatabaseUser } from '../../generated/prisma/client';
import { hashPassword, passwordValidationError, verifyPassword } from './password';
import { createAuthMiddleware, failure, sessionToken, type AuthSession } from './middleware';
const IDLE = 30 * 60 * 1000, ABSOLUTE = 8 * 60 * 60 * 1000, WINDOW = 15 * 60 * 1000;
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const safeUser = (u: DatabaseUser) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, mustChangePassword: u.mustChangePassword });
const exact = (v: unknown, keys: string[]) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === keys.length && Object.keys(v).every(k => keys.includes(k));
const equal = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
let dummy: Promise<string> | undefined;
export function createSessionResolver(db: PrismaClient, now = () => new Date()) {
    return async (token?: string): Promise<AuthSession | null> => {
        if (!token || !/^[-_A-Za-z0-9]{43}$/.test(token))
            return null;
        const s = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
        if (!s || s.revokedAt)
            return null;
        const time = now();
        if (!s.user.active || s.expiresAt <= time || time.getTime() - s.lastSeenAt.getTime() >= IDLE) {
            await db.session.update({ where: { id: s.id }, data: { revokedAt: time } });
            return null;
        }
        const updated = await db.session.updateMany({ where: { id: s.id, revokedAt: null }, data: { lastSeenAt: time } });
        if (!updated.count)
            return null;
        return { id: s.id, csrfToken: s.csrfToken, user: safeUser(s.user) };
    };
}
export function createAuthRouter(db: PrismaClient, config: {
    origin: string;
    now?: () => Date;
    secure?: boolean;
}) {
    const router = Router(), now = config.now ?? (() => new Date()), resolve = createSessionResolver(db, now);
    const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: config.secure ?? process.env.NODE_ENV === 'production' };
    router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
    router.use((req, res, next) => {
        if (Object.keys(req.query).length) {
            failure(res, 400, 'INPUT_INVALID');
            return;
        }
        if (req.method !== 'GET' && req.get('Origin') !== config.origin) {
            failure(res, 403, 'CSRF_INVALID', 'Request origin is not allowed.');
            return;
        }
        next();
    });
    async function issue(tx: Prisma.TransactionClient, user: DatabaseUser, time: Date) {
        const token = randomBytes(32).toString('base64url'), csrfToken = randomBytes(32).toString('base64url');
        await tx.session.create({ data: { id: randomUUID(), tokenHash: digest(token), csrfToken, userId: user.id, issuedAt: time, lastSeenAt: time, expiresAt: new Date(time.getTime() + ABSOLUTE) } });
        return { token, body: { user: safeUser(user), csrfToken } };
    }
    function send(res: Response, result: Awaited<ReturnType<typeof issue>>) { res.cookie('toktickit_session', result.token, cookieOptions); res.status(200).json(result.body); }
    function csrf(req: Request, res: Response) { if (!req.authSession || !equal(req.get('X-CSRF-Token') ?? '', req.authSession.csrfToken)) {
        failure(res, 403, 'CSRF_INVALID', 'Request verification failed.');
        return false;
    } return true; }
    router.post('/login', async (req, res) => {
        try {
            if (!exact(req.body, ['email', 'password']) || typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
                failure(res, 400, 'INPUT_INVALID');
                return;
            }
            const email = req.body.email.trim().toLowerCase(), password = req.body.password;
            if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || [...password].length < 1 || [...password].length > 128) {
                failure(res, 400, 'INPUT_INVALID');
                return;
            }
            const keys = ['email:' + email, 'ip:' + (req.ip ?? 'unknown')], time = now();
            // Serialize login attempts so concurrent requests cannot bypass rolling-window limits.
            const result = await db.$transaction(async (tx) => {
                await tx.$executeRaw `SELECT pg_advisory_xact_lock(334003)`;
                await tx.loginFailure.deleteMany({ where: { createdAt: { lte: new Date(time.getTime() - WINDOW) } } });
                const failures = await tx.loginFailure.findMany({ where: { key: { in: keys }, createdAt: { gt: new Date(time.getTime() - WINDOW) } }, orderBy: { createdAt: 'asc' } });
                let retry = 0;
                for (const key of keys) {
                    const bucket = failures.filter(f => f.key === key);
                    if (bucket.length >= 5)
                        retry = Math.max(retry, Math.ceil((bucket[bucket.length - 5].createdAt.getTime() + WINDOW - time.getTime()) / 1000));
                }
                if (retry)
                    return { retry };
                const user = await tx.user.findUnique({ where: { email } });
                dummy ??= hashPassword(randomBytes(32).toString('hex'));
                const hash = user?.active && user.passwordHash.startsWith('$argon2id$') ? user.passwordHash : await dummy;
                const valid = await verifyPassword(hash, password);
                if (!user?.active || !valid || !user.passwordHash.startsWith('$argon2id$')) {
                    await tx.loginFailure.createMany({ data: keys.map(key => ({ key, createdAt: time })) });
                    return { invalid: true };
                }
                // Lock user against concurrent credential/activity changes before issuing access.
                await tx.$queryRaw `SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
                const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
                if (!current.active || current.passwordHash !== user.passwordHash)
                    return { invalid: true };
                await tx.loginFailure.deleteMany({ where: { key: keys[0] } });
                const old = sessionToken(req);
                if (old)
                    await tx.session.updateMany({ where: { tokenHash: digest(old), revokedAt: null }, data: { revokedAt: time } });
                return { auth: await issue(tx, current, time) };
            }, { timeout: 15000 });
            if ('retry' in result && result.retry) {
                res.setHeader('Retry-After', result.retry);
                failure(res, 429, 'LOGIN_RATE_LIMITED', 'Please try again later.');
                return;
            }
            if ('auth' in result && result.auth) {
                send(res, result.auth);
                return;
            }
            failure(res, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
        }
        catch {
            failure(res, 500, 'INTERNAL_ERROR');
        }
    });
    router.post('/logout', async (req, res) => {
        try {
            if (req.body !== undefined) {
                failure(res, 400, 'INPUT_INVALID');
                return;
            }
            const session = await resolve(sessionToken(req));
            if (session) {
                req.authSession = session;
                if (!csrf(req, res))
                    return;
                await db.session.update({ where: { id: session.id }, data: { revokedAt: now() } });
            }
            res.clearCookie('toktickit_session', cookieOptions);
            res.status(204).end();
        }
        catch {
            failure(res, 500, 'INTERNAL_ERROR');
        }
    });
    const authenticated = createAuthMiddleware(resolve, { allowRestricted: true });
    router.get('/me', authenticated, (req, res) => { if (req.body !== undefined) {
        failure(res, 400, 'INPUT_INVALID');
        return;
    } res.json({ user: req.user, csrfToken: req.authSession!.csrfToken }); });
    router.post('/change-password', authenticated, async (req, res) => {
        try {
            if (!csrf(req, res))
                return;
            if (!exact(req.body, ['currentPassword', 'newPassword', 'confirmPassword']) || typeof req.body.currentPassword !== 'string' || [...req.body.currentPassword].length > 128) {
                failure(res, 400, 'INPUT_INVALID');
                return;
            }
            const { currentPassword, newPassword, confirmPassword } = req.body;
            if (passwordValidationError(newPassword, confirmPassword) === 'PASSWORD_INVALID') {
                failure(res, 400, 'PASSWORD_INVALID', 'Password must be 12–128 characters and not all whitespace.');
                return;
            }
            if (passwordValidationError(newPassword, confirmPassword) === 'PASSWORD_CONFIRMATION_MISMATCH') {
                failure(res, 400, 'PASSWORD_CONFIRMATION_MISMATCH', 'Passwords must match.');
                return;
            }
            const result = await db.$transaction(async (tx) => {
                await tx.$queryRaw `SELECT id FROM "User" WHERE id=${req.user!.id} FOR UPDATE`;
                const user = await tx.user.findUniqueOrThrow({ where: { id: req.user!.id } });
                const session = await tx.session.findUnique({ where: { id: req.authSession!.id } });
                if (!user.active || !session || session.revokedAt)
                    return { error: 'AUTHENTICATION_REQUIRED' };
                if (!await verifyPassword(user.passwordHash, currentPassword))
                    return { error: 'CURRENT_PASSWORD_INVALID' };
                if (passwordValidationError(newPassword, confirmPassword, currentPassword) === 'PASSWORD_REUSED')
                    return { error: 'PASSWORD_REUSED' };
                const updated = await tx.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false } });
                await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now() } });
                return { auth: await issue(tx, updated, now()) };
            }, { timeout: 15000 });
            if (result.auth) {
                send(res, result.auth);
                return;
            }
            failure(res, result.error === 'AUTHENTICATION_REQUIRED' ? 401 : 400, result.error!, 'Password could not be changed. Check the current and new password.');
        }
        catch {
            failure(res, 500, 'INTERNAL_ERROR');
        }
    });
    return router;
}
