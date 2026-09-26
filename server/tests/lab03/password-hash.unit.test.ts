import { expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/auth/password';
it('uses exact Argon2id parameters, random salts and exact password verification', async () => {
    const value = '  Test passphrase 🐈  ';
    const a = await hashPassword(value), b = await hashPassword(value);
    expect(a).not.toBe(b);
    expect(a.split('$').slice(1, 3)).toEqual(['argon2id', 'v=19']);
    expect(a.split('$')[3].split(',').sort()).toEqual(['m=65536', 'p=1', 't=3']);
    expect(Buffer.from(a.split('$')[4], 'base64')).toHaveLength(16);
    expect(Buffer.from(a.split('$')[5], 'base64')).toHaveLength(32);
    expect(await verifyPassword(a, value)).toBe(true);
    expect(await verifyPassword(a, value.trim())).toBe(false);
    expect(await verifyPassword('!UNPROVISIONED', value)).toBe(false);
});
