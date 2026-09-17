import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
export function validPassword(value: unknown): value is string {
    return typeof value === 'string' && [...value].length >= 12 && [...value].length <= 128 && /\S/u.test(value);
}
export function hashPassword(value: string) {
    return argon2.hash(value, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1, hashLength: 32, salt: randomBytes(16) });
}
export async function verifyPassword(hash: string, value: string) {
    try {
        return await argon2.verify(hash, value);
    }
    catch {
        return false;
    }
}
// Shared validation for self-service and later Administrator initial-password forms.
// Reuse is checked against a verified current plaintext value only in self-service flow.
export function passwordValidationError(value: unknown, confirmation: unknown, verifiedCurrent?: string) {
    if (!validPassword(value)) return 'PASSWORD_INVALID';
    if (value !== confirmation) return 'PASSWORD_CONFIRMATION_MISMATCH';
    if (verifiedCurrent !== undefined && value === verifiedCurrent) return 'PASSWORD_REUSED';
    return null;
}
