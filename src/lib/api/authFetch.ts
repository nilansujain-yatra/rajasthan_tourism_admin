import { env } from '@/lib/config/env'
import { baseUrl } from '@/app/api/common.route'

type SessionPayload = {
  authenticated?: boolean
  token?: string
}

let authTokenPromise: Promise<string> | null = null

async function getClientAuthToken() {
  if (!authTokenPromise) {
    authTokenPromise = fetch('/api/auth/session', {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Unable to read auth session (${response.status}).`)
        }

        return response.json() as Promise<SessionPayload>
      })
      .then(payload => {
        if (!payload.authenticated || !payload.token) {
          throw new Error('Missing auth token.')
        }

        return payload.token
      })
      .catch(error => {
        authTokenPromise = null
        throw error
      })
  }

  return authTokenPromise
}

export async function authFetch(input: string, init: RequestInit = {}) {
  const normalizedInput = input.startsWith('/') ? input : `/${input}`
  const authToken = await getClientAuthToken()
  const headers = new Headers(init.headers)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  headers.set('Authorization', `Bearer ${authToken}`)

  return fetch(`${baseUrl}${normalizedInput}`, {
    ...init,
    headers,
  })
}
