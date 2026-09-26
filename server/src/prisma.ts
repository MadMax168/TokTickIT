import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const schema = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).searchParams.get('schema') ?? 'public' : 'public'
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error('Invalid database schema')
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema}` }, { schema })
const prisma = new PrismaClient({ adapter })
export default prisma
