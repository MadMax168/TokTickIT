import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { database } from './db';
import { seedLab03 } from '../../prisma/seed-lab03';
const migration = () => readFileSync('prisma/migrations/20260917000000_lab3_auth/migration.sql', 'utf8');
it('MIG-01a preserves rows, IDs, all legacy fields and ownership; rejects collisions atomically', async () => {
    const db = await database(true);
    try {
        await db.client.query(`INSERT INTO "Category" (name,"updatedAt") VALUES ('Hardware',now()); INSERT INTO "RelatedSystem" (name,"updatedAt") VALUES ('Laptop',now()); INSERT INTO "DevelopmentRequester" (id,name,email,active,"updatedAt") VALUES (7,'A','A@example.test',true,now()),(8,'B','b@example.test',false,now()); INSERT INTO "Ticket" ("ticketNumber","clientRequestId","requesterId","categoryId","relatedSystemId","requestedPriority",summary,description,"updatedAt") VALUES ('TT-20260901-ABCDEF','legacy-key',7,1,1,'HIGH','Legacy issue','Historical description',now()); INSERT INTO "Attachment" ("ticketId","storageKey","displayName","mimeType","sizeBytes","removedAt","removalReason") VALUES (1,'unchanged-key','evidence.pdf','application/pdf',42,now(),'Old evidence');`);
        const before = (await db.client.query('SELECT row_to_json(t) AS row FROM "Ticket" t')).rows[0].row;
        const files = (await db.client.query('SELECT * FROM "Attachment"')).rows;
        const legacyUsers = (await db.client.query('SELECT * FROM "DevelopmentRequester" ORDER BY id')).rows;
        await db.client.query(migration());
        const after = (await db.client.query('SELECT row_to_json(t) AS row FROM "Ticket" t')).rows[0].row;
        expect(after).toMatchObject(before);
        expect(after.itPriority).toBe('HIGH');
        // Compare timestamps through the same pg decoder on both sides; Prisma decodes timestamp-without-zone as UTC.
        const migratedUsers=(await db.client.query('SELECT * FROM "User" ORDER BY id')).rows;
        for(const [i,legacy]of legacyUsers.entries())expect(migratedUsers[i]).toMatchObject({...legacy,email:legacy.email.trim().toLowerCase(),role:'REQUESTER',mustChangePassword:true});
        const nextUser=await db.prisma.user.create({data:{name:'Sequence check',email:'sequence@example.test',passwordHash:'!UNPROVISIONED'}});
        expect(nextUser.id).toBeGreaterThan(8);await db.prisma.user.delete({where:{id:nextUser.id}});

        expect((await db.client.query('SELECT * FROM "Attachment"')).rows).toEqual(files);
        expect((await db.client.query('SELECT id,email,active FROM "User" ORDER BY id')).rows).toEqual([{ id: 7, email: 'a@example.test', active: true }, { id: 8, email: 'b@example.test', active: false }]);
        expect((await db.client.query('SELECT count(*)::int AS n FROM "Ticket" t LEFT JOIN "User" u ON t."requesterId"=u.id WHERE u.id IS NULL')).rows[0].n).toBe(0);
        expect(await db.prisma.publicComment.count()).toBe(0);
        expect(await db.prisma.internalNote.count()).toBe(0);
        console.log('MIG-01a: Tickets 1→1; Attachments 1→1; Requesters 2→Users 2; orphan ticket owners 0; all legacy fields unchanged.');
    }
    finally {
        await db.close();
    }
    const collision = await database(true);
    try {
        await collision.client.query(`INSERT INTO "DevelopmentRequester" (name,email,"updatedAt") VALUES ('A','A@test.test',now()),('B','a@test.test',now())`);
        await expect(collision.client.query(migration())).rejects.toThrow(/collision/);
        await collision.client.query('ROLLBACK');
        expect((await collision.client.query('SELECT count(*)::int AS n FROM "DevelopmentRequester"')).rows[0].n).toBe(2);
    }
    finally {
        await collision.close();
    }
}, 30000);
it('MIG-02a seeds safe complete fixtures without overwriting on rerun', async () => {
    const db = await database();
    try {
        const password = 'local fixture ' + crypto.randomUUID();
        await seedLab03(db.prisma, () => password);
        expect(await db.prisma.user.count({ where: { role: 'IT_STAFF', active: true } })).toBe(3);
        expect(await db.prisma.user.count({ where: { role: 'IT_STAFF', active: false } })).toBe(1);
        expect(await db.prisma.user.count({ where: { role: 'REQUESTER', active: true } })).toBe(4);
        expect(await db.prisma.ticket.count()).toBe(12);
        expect(new Set((await db.prisma.ticket.findMany()).map(t => t.currentStatus)).size).toBe(8);
        expect(await db.prisma.publicComment.count()).toBe(3);
        expect(await db.prisma.internalNote.count()).toBe(2);
        expect(await db.prisma.user.count({ where: { role: 'REQUESTER', active: false } })).toBe(1);
        expect(await db.prisma.user.count({ where: { role: 'ADMINISTRATOR', active: true } })).toBe(2);
        const seededTickets = await db.prisma.ticket.findMany({ include: { assignedTo: true } });
        expect(new Set(seededTickets.map(t => t.requesterId)).size).toBe(4);
        expect(new Set(seededTickets.map(t => t.requestedPriority)).size).toBe(3);
        expect(seededTickets.every(t => t.itPriority === t.requestedPriority)).toBe(true);
        expect(seededTickets.some(t => t.assignedTo === null)).toBe(true);
        expect(seededTickets.some(t => t.assignedTo?.role === 'ADMINISTRATOR')).toBe(true);
        const publicExamples = await db.prisma.publicComment.findMany({ orderBy: { seedKey: 'asc' }, include: { author: true, ticket: true } });
        expect(publicExamples.map(c => c.body)).toEqual(['The demo VPN disconnects after a few minutes.', 'Please retry using the updated demo VPN profile.', 'Please confirm whether the demo Wi-Fi connection is stable.']);
        expect(publicExamples.map(c => c.createdAt.toISOString())).toEqual(['2026-09-01T10:00:00.000Z', '2026-09-01T10:05:00.000Z', '2026-09-01T10:10:00.000Z']);
        expect(publicExamples[0].authorId).toBe(publicExamples[0].ticket.requesterId);
        expect(publicExamples.map(c => c.author.role)).toEqual(['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']);
        const notes = await db.prisma.internalNote.findMany({ orderBy: { seedKey: 'asc' } });
        expect(notes.map(n => n.body)).toEqual(['Demo triage: compare the VPN profile with the training configuration.', 'Demo triage: review the simulated Wi-Fi diagnostic results.']);
        expect(notes.map(n => n.createdAt.toISOString())).toEqual(['2026-09-01T10:02:00.000Z', '2026-09-01T10:08:00.000Z']);
        await db.prisma.internalNote.update({ where: { id: notes[0].id }, data: { body: 'Keep changed note' } });
        const notesBefore = await db.prisma.internalNote.findMany({ orderBy: { id: 'asc' } });
        await db.prisma.ticket.update({ where: { id: seededTickets[0].id }, data: { summary: 'Preserved edited demo ticket' } });
        const ticketsBefore = await db.prisma.ticket.findMany({ orderBy: { id: 'asc' } });
        await db.prisma.publicComment.create({ data: { ticketId: publicExamples[0].ticketId, authorId: publicExamples[0].authorId, body: 'User-created example survives seed' } });
        const comment = await db.prisma.publicComment.findFirstOrThrow();
        await db.prisma.publicComment.update({ where: { id: comment.id }, data: { body: 'Preserve fixture change' } });
        const snapshot = await db.prisma.publicComment.findMany({ orderBy: { id: 'asc' } });
        await db.prisma.user.updateMany({ where: { role: 'IT_STAFF' }, data: { active: false } });
        const users = await db.prisma.user.findMany({ orderBy: { id: 'asc' } });
        await seedLab03(db.prisma, () => { throw new Error('existing credentials must not be requested'); });
        expect(await db.prisma.publicComment.findMany({ orderBy: { id: 'asc' } })).toEqual(snapshot);
        expect(await db.prisma.user.findMany({ orderBy: { id: 'asc' } })).toEqual(users);
        expect(await db.prisma.ticket.count()).toBe(12);
        expect(await db.prisma.ticket.findMany({ orderBy: { id: 'asc' } })).toEqual(ticketsBefore);
        expect(await db.prisma.internalNote.findMany({ orderBy: { id: 'asc' } })).toEqual(notesBefore);
    }
    finally {
        await db.close();
    }
}, 30000);
it('MIG-02a provisions unique initial credentials without resetting existing users', async () => {
    const { provisionUsers } = await import('../../prisma/provision-users');
    const { verifyPassword } = await import('../../src/auth/password');
    const db = await database();
    try {
        await db.prisma.user.createMany({ data: [{ name: 'First', email: 'first@example.test', passwordHash: '!UNPROVISIONED' }, { name: 'Second', email: 'second@example.test', active: false, passwordHash: '!UNPROVISIONED' }] });
        const first = 'first ' + crypto.randomUUID(), second = 'second ' + crypto.randomUUID();
        await expect(provisionUsers({ 'first@example.test': first, 'second@example.test': first }, db.prisma)).rejects.toThrow(/unique/);
        expect(await db.prisma.user.count({ where: { passwordHash: '!UNPROVISIONED' } })).toBe(2);
        await provisionUsers({ 'first@example.test': first, 'second@example.test': second }, db.prisma);
        const users = await db.prisma.user.findMany({ orderBy: { id: 'asc' } });
        expect(await verifyPassword(users[0].passwordHash, first)).toBe(true);
        expect(await verifyPassword(users[1].passwordHash, second)).toBe(true);
        expect(users[1].active).toBe(false);
        expect(users.every(u => u.mustChangePassword)).toBe(true);
        await provisionUsers({}, db.prisma);
        expect(await db.prisma.user.findMany({ orderBy: { id: 'asc' } })).toEqual(users);
    }
    finally {
        await db.close();
    }
}, 30000);
it('MIG-02a preflight rejects orphaned historical data without partial schema changes', async () => {
    const db = await database(true);
    try {
        await db.client.query(`ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey"; INSERT INTO "Category" (name,"updatedAt") VALUES ('Hardware',now()); INSERT INTO "RelatedSystem" (name,"updatedAt") VALUES ('Laptop',now()); INSERT INTO "Ticket" ("ticketNumber","clientRequestId","requesterId","categoryId","relatedSystemId","requestedPriority",summary,description,"updatedAt") VALUES ('TT-20260901-ABCDEF','orphan',999,1,1,'LOW','Legacy issue','Historical description',now());`);
        await expect(db.client.query(migration())).rejects.toThrow(/Orphan/);
        await db.client.query('ROLLBACK');
        expect((await db.client.query('SELECT count(*)::int AS n FROM "Ticket"')).rows[0].n).toBe(1);
        expect((await db.client.query(`SELECT to_regclass('"User"') AS u`)).rows[0].u).toBeNull();
    }
    finally {
        await db.close();
    }
}, 30000);
