import { execFile } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const e2eDatabaseUrl = 'postgresql://toktickit:toktickit@127.0.0.1:5434/toktickit_e2e'
const composeArguments = ['compose', '--project-name', 'toktickit-e2e', '--file', 'docker-compose.e2e.yml']

export async function runE2eCommand(command: string, arguments_: string[], cwd = repositoryRoot, env = process.env) {
  await execFileAsync(command, arguments_, { cwd, env, timeout: 120_000 })
}

export async function startE2eDatabase() {
  await runE2eCommand('docker', [...composeArguments, 'up', '--detach', '--wait'])
}

export async function stopE2eDatabase() {
  await runE2eCommand('docker', [...composeArguments, 'down', '--volumes', '--remove-orphans'])
}
