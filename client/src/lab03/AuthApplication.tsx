import { useEffect, useRef, useState, type FormEvent } from 'react';
import './auth.css';
import RequesterWorkspace from './RequesterWorkspace';
type User = {
    id: number;
    name: string;
    email: string;
    role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
    active: boolean;
    mustChangePassword: boolean;
};
type Auth = {
    user: User;
    csrfToken: string;
};
const defaults = { REQUESTER: '/tickets', IT_STAFF: '/staff/tickets', ADMINISTRATOR: '/admin/users' };
const links = { REQUESTER: [['My Tickets', '/tickets'], ['Create Ticket', '/tickets/new']], IT_STAFF: [['Ticket Queue', '/staff/tickets']], ADMINISTRATOR: [['User Management', '/admin/users'], ['Ticket Queue', '/staff/tickets']] };
export default function AuthApplication() {
    const [auth, setAuth] = useState<Auth | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
    const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState(''), [show, setShow] = useState(false), [retry, setRetry] = useState(0);
    const [path, setPath] = useState(window.location.pathname), [logoutPending, setLogoutPending] = useState(false);
    const generation = useRef(0);
    const previousPath = useRef<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const focusField = (name: string) => formRef.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.focus();
    const move = (value: string) => { window.history.replaceState({}, '', value); setPath(value); };
    const clearPasswords = () => { setPassword(''); setCurrent(''); setNext(''); setConfirm(''); };
    const apply = (value: Auth) => {
        if (!value?.user || !Object.hasOwn(defaults, value.user.role))
            throw new Error('Access unavailable.');
        setAuth(value);
        setLogoutPending(false);
        if (value.user.mustChangePassword)
            move('/change-password');
        else if (['/login', '/', '/change-password'].includes(window.location.pathname))
            move(defaults[value.user.role]);
    };
    useEffect(() => {
        let active = true;
        const load = async () => {
            const id = ++generation.current;
            setLoading(true);
            setBusy(false);
            setAuth(null);
            clearPasswords();
            setSuccess('');
            setError('');
            try {
                const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
                if (!active || generation.current !== id)
                    return;
                if (r.ok) {
                    const value = await r.json();
                    if (active && generation.current === id)
                        apply(value);
                }
                else if (r.status === 401)
                    move('/login');
                else
                    setError('Session could not be loaded. Please retry.');
            }
            catch {
                if (active && generation.current === id)
                    setError('Session could not be loaded. Please retry.');
            }
            finally {
                if (active && generation.current === id)
                    setLoading(false);
            }
        };
        void load();
        window.addEventListener('popstate', load);
        return () => { active = false; ++generation.current; window.removeEventListener('popstate', load); };
    }, []);
    useEffect(() => { if (retry <= 0)
        return; const timer = window.setTimeout(() => setRetry(v => Math.max(0, v - 1)), 1000); return () => window.clearTimeout(timer); }, [retry]);
    const change = Boolean(auth && (auth.user.mustChangePassword || path === '/change-password'));
    async function submit(event: FormEvent) {
        event.preventDefault();
        if (busy || retry)
            return;
        setError('');
        setSuccess('');
        if (change) {
            if ([...next].length < 12 || [...next].length > 128 || !/\S/u.test(next)) {
                setError('Password must be 12–128 characters and not all whitespace.');
                focusField('newPassword');
                return;
            }
            if (next !== confirm) {
                setError('Passwords must match.');
                focusField('confirmPassword');
                return;
            }
            if (next === current) {
                setError('Choose a different password.');
                focusField('newPassword');
                return;
            }
        }
        const id = ++generation.current;
        setBusy(true);
        try {
            const r = await fetch('/api/auth/' + (change ? 'change-password' : 'login'), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(auth ? { 'X-CSRF-Token': auth.csrfToken } : {}) }, body: JSON.stringify(change ? { currentPassword: current, newPassword: next, confirmPassword: confirm } : { email, password }) });
            const data = await r.json();
            if (id !== generation.current)
                return;
            if (!r.ok) {
                if (change && r.status === 401) {
                    setAuth(null);
                    clearPasswords();
                    move('/login');
                    setError('Session ended. Please sign in.');
                    return;
                }
                if (r.status === 429)
                    setRetry(Number(r.headers.get('Retry-After')) || 60);
                if (!change && r.status === 401)
                    setPassword('');
                setError(data.error?.message ?? 'Request could not be completed.');
                const field = data.error?.fields?.[0]?.field;
                if (['currentPassword', 'newPassword', 'confirmPassword', 'email', 'password'].includes(field)) focusField(field);
                return;
            }
            clearPasswords();
            apply(data);
            setSuccess(change ? 'Password changed.' : 'Signed in.');
        }
        catch {
            if (id === generation.current)
                setError('Request could not be completed. Please retry.');
        }
        finally {
            if (id === generation.current)
                setBusy(false);
        }
    }
    async function logout() {
        if (busy)
            return;
        const token = auth?.csrfToken;
        const id = ++generation.current;
        setBusy(true);
        setLogoutPending(true);
        setError('');
        setSuccess('');
        clearPasswords();
        try {
            const r = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token ?? '' } });
            if (id !== generation.current)
                return;
            if (!r.ok)
                throw new Error();
            setAuth(null);
            setLogoutPending(false);
            move('/login');
            setSuccess('Signed out.');
        }
        catch {
            if (id === generation.current)
                setError('Logout could not be completed. Retry logout.');
        }
        finally {
            if (id === generation.current)
                setBusy(false);
        }
    }
    return <main className="auth-shell">
  <header><strong>TokTickIT</strong>{auth && !logoutPending && <span><span>{auth.user.name}</span><span className="auth-role">{auth.user.role.replaceAll('_', ' ')}</span></span>}{auth && <button disabled={busy} onClick={() => void logout()}>{busy && logoutPending ? 'Signing out…' : logoutPending ? 'Retry logout' : 'Logout'}</button>}</header>
  {loading ? <p role="status">Loading session…</p> : <>
   {error && <p id="auth-error" role="alert">{error}</p>}{error.startsWith('Session could not be loaded') && <button onClick={() => window.dispatchEvent(new PopStateEvent('popstate'))}>Retry session</button>}{success && <p role="status">{success}</p>}
   {retry > 0 && <p role="status">Try again in {retry} seconds.</p>}
   {!logoutPending && (!auth || change) ? <section className="auth-card"><h1>{change ? 'Change Password' : 'Login'}</h1>
    {auth?.user.mustChangePassword && <p>You must change your initial password before continuing.</p>}
    <form ref={formRef} aria-describedby={error ? 'auth-error' : undefined} onSubmit={e => void submit(e)}>
     {change ? <>
      <label>Current password<input name="currentPassword" aria-invalid={Boolean(error)} aria-describedby={error ? 'auth-error' : undefined} required autoComplete="current-password" type={show ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}/></label>
      <label>New password<input name="newPassword" aria-invalid={Boolean(error)} aria-describedby={error ? 'auth-error' : undefined} required autoComplete="new-password" type={show ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)}/></label>
      <label>Confirm new password<input name="confirmPassword" aria-invalid={Boolean(error)} aria-describedby={error ? 'auth-error' : undefined} required autoComplete="new-password" type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}/></label>
      <p>Use 12–128 characters, including a non-whitespace character.</p>
     </> : <>
      <label>Email<input name="email" aria-invalid={Boolean(error)} aria-describedby={error ? 'auth-error' : undefined} required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}/></label>
      <label>Password<input name="password" aria-invalid={Boolean(error)} aria-describedby={error ? 'auth-error' : undefined} required autoComplete="current-password" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}/></label>
     </>}
     <button type="button" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide password' : 'Show password'}</button>
     <button disabled={busy || retry > 0} type="submit">{busy ? (change ? 'Saving…' : 'Signing in…') : (change ? 'Save password' : 'Sign in')}</button>
     {change && !auth?.user.mustChangePassword && <button type="button" onClick={() => { clearPasswords(); move(previousPath.current ?? defaults[auth!.user.role]); }}>Cancel</button>}
    </form>
   </section> : auth && !logoutPending && <>
    <nav aria-label="Application navigation">{links[auth.user.role].map(([label, url]) => <a key={url} href={url} aria-current={path === url ? 'page' : undefined} onClick={e => { e.preventDefault(); move(url); }}>{label}</a>)}<a href="/change-password" onClick={e => { e.preventDefault(); previousPath.current = path; move('/change-password'); }}>Change Password</a></nav>
    {auth.user.role === 'REQUESTER' ? <RequesterWorkspace path={path} csrfToken={auth.csrfToken} onNavigate={move} /> : links[auth.user.role].some(([, url]) => path === url) ? <section><h1>{links[auth.user.role].find(([, url]) => path === url)?.[0]}</h1><p>This page is not available yet.</p></section> : <section><h1>Access unavailable</h1><a href={defaults[auth.user.role]}>Return to your home page</a></section>}
   </>}
  </>}
 </main>;
}
