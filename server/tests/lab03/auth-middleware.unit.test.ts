import { expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../src/auth/middleware';
it('attaches identity, checks roles/restricted sessions and never trusts selector headers', async () => {
    const resolve = vi.fn().mockResolvedValue({ user: { id: 7, role: 'REQUESTER', mustChangePassword: false } });
    const req: any = { headers: { cookie: 'toktickit_session=token', 'x-development-requester-id': '999' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await createAuthMiddleware(resolve)(req, res, next);
    expect(req.user.id).toBe(7);
    expect(next).toHaveBeenCalledOnce();
    await createAuthMiddleware(resolve, { roles: ['ADMINISTRATOR'] })(req, res, next);
    expect(res.status).toHaveBeenLastCalledWith(403);
    resolve.mockResolvedValue({ user: { id: 7, role: 'REQUESTER', mustChangePassword: true } });
    await createAuthMiddleware(resolve)(req, res, next);
    expect(res.json).toHaveBeenLastCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }) }));
    await createAuthMiddleware(resolve, { allowRestricted: true })(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    resolve.mockResolvedValue(null);
    await createAuthMiddleware(resolve)(req, res, next);
    expect(res.status).toHaveBeenLastCalledWith(401);
    resolve.mockRejectedValue(new Error('secret SQL'));
    await createAuthMiddleware(resolve)(req, res, next);
    expect(res.status).toHaveBeenLastCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret SQL');
});

it('validates opaque token syntax/hash and all session expiry states independently', async () => {
 const {createSessionResolver}=await import('../../src/auth/router');
 const now=new Date('2026-09-17T10:00:00Z');
 const session={id:'s',csrfToken:'csrf',revokedAt:null,lastSeenAt:now,expiresAt:new Date(now.getTime()+3600000),user:{id:1,name:'A',email:'a@example.test',role:'REQUESTER',active:true,mustChangePassword:false,passwordHash:'secret'}};
 const db:any={session:{findUnique:vi.fn().mockResolvedValue(session),update:vi.fn(),updateMany:vi.fn().mockResolvedValue({count:1})}};
 const resolve=createSessionResolver(db,()=>now),token='A'.repeat(43);
 expect(await resolve()).toBeNull();expect(await resolve('malformed')).toBeNull();expect(db.session.findUnique).not.toHaveBeenCalled();
 const result=await resolve(token);expect(result?.user.id).toBe(1);expect(JSON.stringify(result)).not.toContain('passwordHash');
 expect(db.session.findUnique.mock.calls[0][0].where.tokenHash).toMatch(/^[a-f0-9]{64}$/);
 expect(db.session.findUnique.mock.calls[0][0].where.tokenHash).not.toBe(token);
 for(const override of [{revokedAt:now},{lastSeenAt:new Date(now.getTime()-1800000)},{expiresAt:now},{user:{...session.user,active:false}}]){
  db.session.findUnique.mockResolvedValue({...session,...override});expect(await resolve(token)).toBeNull();
 }
 db.session.findUnique.mockResolvedValue(null);expect(await resolve(token)).toBeNull();
});
