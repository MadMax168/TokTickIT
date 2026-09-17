import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AuthApplication from './AuthApplication';
it('UI-02 gates navigation and validates password confirmation before sending', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { name: 'A', role: 'REQUESTER', mustChangePassword: true }, csrfToken: 'csrf' }) });
    vi.stubGlobal('fetch', fetch);
    render(<AuthApplication />);
    await screen.findByRole('heading', { name: 'Change Password' });
    expect(screen.queryByRole('link', { name: 'My Tickets' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old password' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new password long' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await screen.findByText('Passwords must match.');
    expect(fetch).toHaveBeenCalledTimes(1);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/login'); });
it('UI-02 saves a valid distinct password with CSRF, then clears form and restores navigation', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ user: { name: 'A', role: 'REQUESTER', mustChangePassword: true }, csrfToken: 'old' }) }).mockResolvedValue({ ok: true, json: async () => ({ user: { name: 'A', role: 'REQUESTER', mustChangePassword: false }, csrfToken: 'new' }) });
    vi.stubGlobal('fetch', fetch);
    render(<AuthApplication />);
    await screen.findByRole('heading', { name: 'Change Password' });
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old password long' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new password long' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new password long' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await screen.findByRole('link', { name: 'My Tickets' });
    expect(fetch.mock.calls[1][1].headers['X-CSRF-Token']).toBe('old');
    fireEvent.click(screen.getByRole('link', { name: 'Change Password' }));
    expect(screen.getByLabelText('New password')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
});
it('UI-02 shows server validation and session-loss states without bypass', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ user: { name: 'A', role: 'REQUESTER', mustChangePassword: true }, csrfToken: 'old' }) }).mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'Current password is invalid.' } }) }).mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { message: 'Please sign in.' } }) });
    vi.stubGlobal('fetch', fetch);
    render(<AuthApplication />);
    await screen.findByRole('heading', { name: 'Change Password' });
    for (const [label, value] of [['Current password', 'incorrect password'], ['New password', 'new password long'], ['Confirm new password', 'new password long']])
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await screen.findByText('Current password is invalid.');
    expect(screen.queryByRole('link', { name: 'My Tickets' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await screen.findByRole('heading', { name: 'Login' });
    expect(screen.getByLabelText('Password')).toHaveValue('');
});
it.each(['short', ' '.repeat(12), 'x'.repeat(129)])('UI-02 rejects invalid new-password boundary and focuses the field',async(value)=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({user:{name:'A',role:'REQUESTER',mustChangePassword:true},csrfToken:'csrf'})});vi.stubGlobal('fetch',fetch);
 render(<AuthApplication/>);await screen.findByRole('heading',{name:'Change Password'});
 fireEvent.change(screen.getByLabelText('Current password'),{target:{value:'initial password'}});
 fireEvent.change(screen.getByLabelText('New password'),{target:{value}});
 fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Save password'}));
 await screen.findByText('Password must be 12–128 characters and not all whitespace.');
 expect(screen.getByLabelText('New password')).toHaveFocus();expect(fetch).toHaveBeenCalledTimes(1);
});
