import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
export async function database(legacy = false) {
    const url = process.env.LAB03_TEST_DATABASE_URL;
    if (!url)
        throw new Error('LAB03_TEST_DATABASE_URL must point to an isolated PostgreSQL test database');
    const schema = 'lab03_' + randomUUID().replaceAll('-', '');
    const pool = new Pool({ connectionString: url });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    const client = await pool.connect();
    await client.query(`SET search_path TO "${schema}"`);
    const dirs = readdirSync(resolve('prisma/migrations')).filter(x => /^\d/.test(x)).sort();
    for (const dir of dirs.filter(x => !legacy || !x.includes('lab3')))
        await client.query(readFileSync(resolve('prisma/migrations', dir, 'migration.sql'), 'utf8'));
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: `-c search_path=${schema}` }, { schema }) });
    return { prisma, client, schema, async close() { await prisma.$disconnect(); client.release(); await pool.query(`DROP SCHEMA "${schema}" CASCADE`); await pool.end(); } };
}
