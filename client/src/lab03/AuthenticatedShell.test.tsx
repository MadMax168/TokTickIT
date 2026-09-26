import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AuthApplication from './AuthApplication';
it.each([['REQUESTER', 'My Tickets'], ['IT_STAFF', 'Ticket Queue'], ['ADMINISTRATOR', 'User Management']])('UI-03 shows %s navigation and logs out', async (role, link) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ user: { name: 'User A', role, mustChangePassword: false }, csrfToken: 'csrf' }) }).mockResolvedValue({ ok: true, status: 204 }));
    render(<AuthApplication />);
    await screen.findByRole('link', { name: link });
    expect(screen.getByText('User A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByRole('button', { name: 'Sign in' });
    expect(screen.queryByText('User A')).not.toBeInTheDocument();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/login'); });
it('UI-03 hides protected content during failed logout and allows retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ user: { name: 'User A', role: 'ADMINISTRATOR', mustChangePassword: false }, csrfToken: 'csrf' }) }).mockRejectedValueOnce(new Error()).mockResolvedValueOnce({ ok: true, status: 204 }));
    render(<AuthApplication />);
    await screen.findByRole('link', { name: 'User Management' });
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByText('Logout could not be completed. Retry logout.');
    expect(screen.queryByText('User A')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'User Management' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry logout' }));
    await screen.findByRole('heading', { name: 'Login' });
});
it('UI-03 rejects disallowed routes', async () => {
    window.history.replaceState({}, '', '/admin/users');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { name: 'R', role: 'REQUESTER', mustChangePassword: false }, csrfToken: 'csrf' }) }));
    render(<AuthApplication />);
    await screen.findByRole('heading', { name: 'Access unavailable' });
    expect(screen.queryByRole('link', { name: 'User Management' })).not.toBeInTheDocument();
});

it('UI-03 fails closed for an unknown role', async () => {
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({user:{name:'Unknown',role:'SUPERUSER',mustChangePassword:false},csrfToken:'csrf'})}));
 render(<AuthApplication/>);await screen.findByRole('heading',{name:'Login'});
 expect(screen.queryByText('Unknown')).not.toBeInTheDocument();expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
it('UI-03 discards a stale me response after browser navigation detects session loss', async () => {
 let late!:(value:unknown)=>void;
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({user:{name:'A',role:'REQUESTER',mustChangePassword:false},csrfToken:'a'})}).mockImplementationOnce(()=>new Promise(resolve=>{late=resolve})).mockResolvedValueOnce({ok:false,status:401}));
 render(<AuthApplication/>);await screen.findByRole('link',{name:'My Tickets'});
 fireEvent.popState(window);expect(screen.queryByText('A',{exact:true})).not.toBeInTheDocument();
 fireEvent.popState(window);await screen.findByRole('heading',{name:'Login'});
 await act(async()=>late({ok:true,json:async()=>({user:{name:'Stale Admin',role:'ADMINISTRATOR',mustChangePassword:false},csrfToken:'stale'})}));
 expect(screen.queryByText('Stale Admin')).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:'User Management'})).not.toBeInTheDocument();
});
