import type { RequestHandler, Request, Response } from 'express';
export type Identity = {
    id: number;
    name: string;
    email: string;
    role: string;
    active: boolean;
    mustChangePassword: boolean;
};
export type AuthSession = {
    id: string;
    csrfToken: string;
    user: Identity;
};
declare global {
    namespace Express {
        interface Request {
            user?: Identity;
            authSession?: AuthSession;
        }
    }
}
export function failure(res: Response, status: number, code: string, message = 'Request could not be completed.') {
    return res.status(status).json({ error: { code, message, ...(status === 400 ? { fields: [{ field: code === 'CURRENT_PASSWORD_INVALID' ? 'currentPassword' : code === 'PASSWORD_CONFIRMATION_MISMATCH' ? 'confirmPassword' : code.startsWith('PASSWORD_') ? 'newPassword' : 'request', code, message }] } : {}) } });
}
export function sessionToken(req: Request) {
    const cookies = (req.headers.cookie ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith('toktickit_session='));
    return cookies.length === 1 ? cookies[0].slice('toktickit_session='.length) : undefined;
}
export function requireCsrf(req: Request, res: Response, origin: string) {
    if (req.get('Origin') !== origin) { failure(res, 403, 'CSRF_INVALID', 'Request origin is not allowed.'); return false; }
    const a = Buffer.from(req.get('X-CSRF-Token') ?? ''), b = Buffer.from(req.authSession?.csrfToken ?? '');
    if (!a.length || a.length !== b.length || !a.equals(b)) { failure(res, 403, 'CSRF_INVALID', 'Request verification failed.'); return false; }
    return true;
}
export function createAuthMiddleware(resolve: (token?: string) => Promise<AuthSession | null>, options: {
    allowRestricted?: boolean;
    roles?: string[];
} = {}): RequestHandler {
    return async (req, res, next) => {
        try {
            const session = await resolve(sessionToken(req));
            if (!session) {
                failure(res, 401, 'AUTHENTICATION_REQUIRED', 'Please sign in.');
                return;
            }
            req.user = session.user;
            req.authSession = session;
            if (session.user.mustChangePassword && !options.allowRestricted) {
                failure(res, 403, 'PASSWORD_CHANGE_REQUIRED', 'Change your password to continue.');
                return;
            }
            if (options.roles && !options.roles.includes(session.user.role)) {
                failure(res, 403, 'FORBIDDEN', 'Access unavailable.');
                return;
            }
            next();
        }
        catch {
            failure(res, 500, 'INTERNAL_ERROR');
        }
    };
}
