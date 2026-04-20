export type AppEnvironment = 'development' | 'stage' | 'production'

type PublicEnv = {
  appEnv: AppEnvironment
  apiBaseUrl: string
  apiTimeoutMs: number
}

const APP_ENV_VALUES = ['development', 'stage', 'production'] as const
const DEFAULT_API_TIMEOUT_MS = 30000

function isAppEnvironment(value: string): value is AppEnvironment {
  return APP_ENV_VALUES.includes(value as AppEnvironment)
}

function getAppEnvironment(): AppEnvironment {
  const value =
    process.env.NEXT_PUBLIC_APP_ENV ??
    (process.env.NODE_ENV === 'production' ? 'production' : 'development')

  if (!isAppEnvironment(value)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_APP_ENV "${value}". Expected one of: ${APP_ENV_VALUES.join(', ')}.`
    )
  }

  return value
}

function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

  if (!value) {
    throw new Error('Missing NEXT_PUBLIC_API_BASE_URL environment variable.')
  }

  return value.replace(/\/+$/, '')
}

function getApiTimeoutMs(): number {
  const value = process.env.NEXT_PUBLIC_API_TIMEOUT_MS

  if (!value) {
    return DEFAULT_API_TIMEOUT_MS
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('NEXT_PUBLIC_API_TIMEOUT_MS must be a positive number.')
  }

  return parsed
}

export const env: PublicEnv = {
  appEnv: getAppEnvironment(),
  apiBaseUrl: getApiBaseUrl(),
  apiTimeoutMs: getApiTimeoutMs(),
}
