import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export function getBaseApiUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function getOperatorBookingAuthToken() {
  const cookieStore = await cookies()

  return cookieStore.get(AUTHENTICATION_TOKEN)?.value
    ?? process.env.RAJASTHAN_API_TOKEN
    ?? process.env.NEXT_PUBLIC_LOGIN_TOKEN
}

export async function proxyOperatorBookingRequest(url: string, init?: RequestInit) {
  const authToken = await getOperatorBookingAuthToken()

  if (!authToken) {
    return new Response(JSON.stringify({ message: 'Missing auth token.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  const body = await response.text()

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}
