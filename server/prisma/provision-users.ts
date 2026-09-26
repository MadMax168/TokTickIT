import 'dotenv/config';
import { readFileSync } from 'node:fs';
import prisma from '../src/prisma';
import { hashPassword, validPassword } from '../src/auth/password';
// Operator-managed JSON {normalizedEmail: uniqueInitialPassword}; never print values.
export async function provisionUsers(passwords: Record<string, string>, db = prisma) {
    const pending = await db.user.findMany({ where: { passwordHash: '!UNPROVISIONED' } });
    const values = pending.map(u => passwords[u.email]);
    if (values.some(p => !validPassword(p)) || new Set(values).size !== values.length)
        throw new Error('Provide a unique valid password for every unprovisioned User');
    const hashes: string[] = [];
    for (const value of values) hashes.push(await hashPassword(value));
    await db.$transaction(pending.map((u, i) => db.user.updateMany({ where: { id: u.id, passwordHash: '!UNPROVISIONED' }, data: { passwordHash: hashes[i], mustChangePassword: true } })));
}
async function main() {
    const file = process.env.LAB03_CREDENTIALS_FILE;
    if (!file) throw new Error('LAB03_CREDENTIALS_FILE is required');
    const passwords = JSON.parse(readFileSync(file, 'utf8'));
    await provisionUsers(passwords);
    console.log('User provisioning complete');
}
if (require.main === module) {
    main().catch(() => {
        console.error('Provisioning failed; verify the credential file and database access.');
        process.exitCode = 1;
    }).finally(() => prisma.$disconnect());
}
