import type { PrismaClient, Role, RequestedPriority, TicketStatus } from '../generated/prisma/client';
import { hashPassword, validPassword } from '../src/auth/password';
const requesterNames = ['Niran Somchai', 'Aree Chai', 'Kanya Suksai', 'Thanawat Arun', 'Pimchanok Inactive'];
const requesterEmails = ['niran.somchai', 'aree.chai', 'kanya.suksai', 'thanawat.arun', 'pimchanok.inactive'].map(x => x + '@example.test');
export const seedAccounts = [
    ...requesterNames.map((name, i) => ({ name, email: requesterEmails[i], role: 'REQUESTER' as Role, active: i < 4 })),
    ...['Staff One', 'Staff Two', 'Staff Three', 'Inactive Staff'].map((name, i) => ({ name, email: `staff${i + 1}@example.test`, role: 'IT_STAFF' as Role, active: i < 3 })),
    ...['Admin One', 'Admin Two'].map((name, i) => ({ name, email: `admin${i + 1}@example.test`, role: 'ADMINISTRATOR' as Role, active: true })),
];
const tickets: [
    number,
    TicketStatus,
    RequestedPriority,
    number | null,
    string,
    string,
    string
][] = [
    [0, 'NEW', 'LOW', null, 'Printer produces faded pages', 'Hardware', 'Printer'],
    [1, 'NEW', 'HIGH', null, 'Cannot access campus email', 'Account and Access', 'Email'],
    [2, 'OPEN', 'MEDIUM', 5, 'VPN disconnects repeatedly', 'Network', 'VPN'],
    [3, 'OPEN', 'LOW', null, 'Software installation request', 'Software', 'Corporate Laptop'],
    [0, 'IN_PROGRESS', 'HIGH', 6, 'Laptop cannot connect to Wi-Fi', 'Network', 'Campus Wi-Fi'],
    [1, 'WAITING_FOR_REQUESTER', 'MEDIUM', 7, 'Missing details for account access', 'Account and Access', 'LEB2 App'],
    [2, 'RESOLVED', 'LOW', 5, 'Printer queue restored', 'Hardware', 'Printer'],
    [3, 'CLOSED', 'MEDIUM', 6, 'VPN configuration corrected', 'Network', 'VPN'],
    [0, 'REOPENED', 'HIGH', 7, 'Email access problem returned', 'Account and Access', 'Email'],
    [1, 'CANCELLED', 'LOW', null, 'Duplicate software request cancelled', 'Software', 'Corporate Laptop'],
    [2, 'IN_PROGRESS', 'MEDIUM', 7, 'Laptop application fails to launch', 'Software', 'Corporate Laptop'],
    [3, 'WAITING_FOR_REQUESTER', 'HIGH', 9, 'Awaiting Wi-Fi diagnostic details', 'Network', 'Campus Wi-Fi'],
];
export async function seedLab03(db: PrismaClient, passwordFor: (email: string) => string) {
    const users = [];
    // Existing rows are never overwritten, including passwords, roles and active flags.
    for (const account of seedAccounts) {
        let user = await db.user.findUnique({ where: { email: account.email } });
        if (!user) {
            const password = passwordFor(account.email);
            if (!validPassword(password))
                throw new Error('Local seed password does not satisfy the password policy');
            user = await db.user.create({ data: { ...account, passwordHash: await hashPassword(password) } });
        }
        users.push(user);
        if (account.role === 'REQUESTER')
            await db.developmentRequester.upsert({ where: { id: user.id }, update: {}, create: { id: user.id, name: user.name, email: user.email, active: user.active } });
    }
    const categories = ['Account and Access', 'Hardware', 'Software', 'Network'];
    const systems = ['Email', 'Campus Wi-Fi', 'VPN', 'LEB2 App', 'Grade Submission App', 'Printer', 'Corporate Laptop'];
    for (const name of categories)
        await db.category.upsert({ where: { name }, update: {}, create: { name } });
    for (const name of systems)
        await db.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
    const saved = [];
    for (const [i, [requester, status, priority, owner, summary, category, system]] of tickets.entries()) {
        const clientRequestId = `33400003-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
        saved.push(await db.ticket.upsert({ where: { clientRequestId }, update: {}, create: {
                clientRequestId, ticketNumber: `TT-20260901-SEED${String.fromCharCode(65 + i)}A`, ticketDate: new Date(`2026-09-01T09:${String(i).padStart(2, '0')}:00Z`),
                requesterId: users[requester].id, assignedToId: owner === null ? null : users[owner].id, currentStatus: status, requestedPriority: priority, itPriority: priority,
                categoryId: (await db.category.findUniqueOrThrow({ where: { name: category } })).id, relatedSystemId: (await db.relatedSystem.findUniqueOrThrow({ where: { name: system } })).id,
                summary, description: `Training example: ${summary}. This simulated support request contains no real incident or personal information.`,
            } }));
    }
    const comments: [
        string,
        number,
        number,
        string,
        string
    ][] = [
        ['lab03-public-01', 2, 2, '10:00', 'The demo VPN disconnects after a few minutes.'],
        ['lab03-public-02', 2, 5, '10:05', 'Please retry using the updated demo VPN profile.'],
        ['lab03-public-03', 11, 9, '10:10', 'Please confirm whether the demo Wi-Fi connection is stable.'],
    ];
    const notes: [
        string,
        number,
        number,
        string,
        string
    ][] = [
        ['lab03-note-01', 2, 5, '10:02', 'Demo triage: compare the VPN profile with the training configuration.'],
        ['lab03-note-02', 11, 9, '10:08', 'Demo triage: review the simulated Wi-Fi diagnostic results.'],
    ];
    for (const [seedKey, ticket, author, time, body] of comments)
        await db.publicComment.upsert({ where: { seedKey }, update: {}, create: { seedKey, ticketId: saved[ticket].id, authorId: users[author].id, body, createdAt: new Date(`2026-09-01T${time}:00Z`) } });
    for (const [seedKey, ticket, author, time, body] of notes)
        await db.internalNote.upsert({ where: { seedKey }, update: {}, create: { seedKey, ticketId: saved[ticket].id, authorId: users[author].id, body, createdAt: new Date(`2026-09-01T${time}:00Z`) } });
}
