import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { delimiter } from 'node:path'

const [, , envFile, command, ...args] = process.argv

if (!envFile || !command) {
  console.error('Usage: node scripts/run-with-env.mjs <env-file> <command> [...args]')
  process.exit(1)
}

if (!existsSync(envFile)) {
  console.error(`Missing ${envFile}. Create it from the matching .example file.`)
  process.exit(1)
}

const env = { ...process.env }
const file = readFileSync(envFile, 'utf8')

for (const rawLine of file.split(/\r?\n/)) {
  const line = rawLine.trim()

  if (!line || line.startsWith('#')) {
    continue
  }

  const separatorIndex = line.indexOf('=')

  if (separatorIndex === -1) {
    continue
  }

  const key = line.slice(0, separatorIndex).trim()
  const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

  if (key) {
    env[key] = value
  }
}

const pathEntries = [
  'node_modules/.bin',
  ...(env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean),
]

env.PATH = pathEntries.join(delimiter)
env.Path = env.PATH

const child = spawn(command, args, {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

child.on('exit', code => {
  process.exit(code ?? 1)
})
