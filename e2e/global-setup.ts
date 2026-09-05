import { join } from 'node:path'
import { e2eDatabaseUrl, repositoryRoot, runE2eCommand, startE2eDatabase } from './e2e-environment'

export default async function globalSetup() {
  await startE2eDatabase()

  const serverDirectory = join(repositoryRoot, 'server')
  const env = { ...process.env, DATABASE_URL: e2eDatabaseUrl }
  await runE2eCommand('npx', ['prisma', 'migrate', 'deploy'], serverDirectory, env)
  await runE2eCommand('npm', ['run', 'db:seed'], serverDirectory, env)
}
