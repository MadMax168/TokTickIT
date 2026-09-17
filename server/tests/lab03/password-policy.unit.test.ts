import { expect, it } from 'vitest';
import { validPassword } from '../../src/auth/password';
it('validates Unicode code-point boundaries without trimming or composition rules', () => {
    for (const n of [12, 128])
        expect(validPassword('😀'.repeat(n))).toBe(true);
    for (const n of [0, 11, 129])
        expect(validPassword('x'.repeat(n))).toBe(false);
    expect(validPassword(' '.repeat(12))).toBe(false);
    expect(validPassword('  abcdefghij  ')).toBe(true);
    expect(validPassword(null)).toBe(false);
});
it('validates exact confirmation and reuse without trimming Unicode passwords',async()=>{
 const {passwordValidationError}=await import('../../src/auth/password');
 const password='  exact passphrase 😀  ';
 expect(passwordValidationError(password,password)).toBeNull();
 expect(passwordValidationError(password,password.trim())).toBe('PASSWORD_CONFIRMATION_MISMATCH');
 expect(passwordValidationError(password,password,password)).toBe('PASSWORD_REUSED');
 expect(passwordValidationError(password,password,'different current password')).toBeNull();
 expect(passwordValidationError('short','short')).toBe('PASSWORD_INVALID');
});
