import { stopE2eDatabase } from './e2e-environment'

export default async function globalTeardown() {
  await stopE2eDatabase()
}
