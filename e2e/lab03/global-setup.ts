import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const { Pool } = require('pg');
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
export default async function () {
    if (!process.env.LAB03_TEST_DATABASE_URL)
        throw new Error('LAB03_TEST_DATABASE_URL is required');
    const pool = new Pool({ connectionString: process.env.LAB03_TEST_DATABASE_URL });
    const client = await pool.connect();
    try {
        // Dedicated test-only schema. No public or development data is touched.
        await client.query('DROP SCHEMA IF EXISTS lab03_auth_e2e CASCADE; CREATE SCHEMA lab03_auth_e2e; SET search_path TO lab03_auth_e2e');
        for (const dir of readdirSync(resolve('server/prisma/migrations')).filter(x => /^\d/.test(x)).sort())
            await client.query(readFileSync(resolve('server/prisma/migrations', dir, 'migration.sql'), 'utf8'));
    }
    finally {
        client.release();
        await pool.end();
    }
}
