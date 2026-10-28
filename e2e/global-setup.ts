import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeFile } from 'node:fs/promises'
import { e2eDatabaseUrl, repositoryRoot, runE2eCommand, startE2eDatabase } from './e2e-environment'

export default async function globalSetup() {
  await startE2eDatabase()

  const serverDirectory = join(repositoryRoot, 'server')
  const lab4 = process.env.LAB4_E2E === 'true'
  const credentialsFile = join(tmpdir(), 'toktickit-lab4-e2e-credentials.json')
  if (lab4) {
    const password = 'Lab4E2E!Password2026'
    const emails = [
      'niran.somchai@example.test', 'aree.chai@example.test', 'kanya.suksai@example.test', 'thanawat.arun@example.test', 'pimchanok.inactive@example.test',
      'staff1@example.test', 'staff2@example.test', 'staff3@example.test', 'staff4@example.test', 'admin1@example.test', 'admin2@example.test',
    ]
    await writeFile(credentialsFile, JSON.stringify(Object.fromEntries(emails.map(email => [email, password]))), { mode: 0o600 })
  }
  const env = lab4
    ? { ...process.env, DATABASE_URL: e2eDatabaseUrl, LAB03_CREDENTIALS_FILE: credentialsFile }
    : { ...process.env, DATABASE_URL: e2eDatabaseUrl, LAB02_SEED: 'true' }
  await runE2eCommand('npx', ['prisma', 'migrate', 'deploy'], serverDirectory, env)
  await runE2eCommand('npm', ['run', 'db:seed'], serverDirectory, env)
}
