import { SSO_MODES } from './constants'

type SsoAuthResult = {
  token?: string
  tokenExpiry?: number
  userRole?: string
  userType?: string
}

type SsoAuthResponse = {
  code?: number
  message?: string
  result?: SsoAuthResult
  data?: {
    result?: SsoAuthResult
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`)
  }

  return value
}

export function getSsoBaseUrl() {
  const mode = process.env.NEXT_PUBLIC_SSO_MODE
  const stageUrl = process.env.NEXT_PUBLIC_SSO_URL_STAGE
  const prodUrl = process.env.NEXT_PUBLIC_SSO_URL_PROD
  const selectedUrl = mode === SSO_MODES.STAGE ? stageUrl : prodUrl

  if (!selectedUrl?.trim()) {
    throw new Error('Missing SSO URL environment variable.')
  }

  return selectedUrl.replace(/\/+$/, '')
}

export function getSsoSignInUrl() {
  return `${getSsoBaseUrl()}/signin?ru=obmsadmin`
}

export function getSsoBackUrl() {
  return `${getSsoBaseUrl()}/sso`
}

export function getSsoSignOutUrl() {
  return `${getSsoBaseUrl()}/signout`
}

export async function exchangeSsoToken(ssoToken: string) {
  const baseUrl = getRequiredEnv('NEXT_PUBLIC_API_BASE_URL').replace(/\/+$/, '')
  const url = `${baseUrl}/authentication/v1?userdetails=${encodeURIComponent(ssoToken)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`SSO authentication failed with status ${response.status}.`)
  }

  const payload = await response.json() as SsoAuthResponse
  const result = payload.result ?? payload.data?.result

  if (!result?.token) {
    throw new Error(payload.message ?? 'SSO authentication did not return an auth token.')
  }

  return result
}
