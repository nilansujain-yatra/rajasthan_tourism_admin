import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'
import { resolveBaseUrl } from '../common.route'

export function getBaseApiUrl() {
  return resolveBaseUrl()
}

export async function getOperatorBookingAuthToken() {
  const cookieStore = await cookies()

  return cookieStore.get(AUTHENTICATION_TOKEN)?.value
    ?? process.env.RAJASTHAN_API_TOKEN
    ?? process.env.NEXT_PUBLIC_LOGIN_TOKEN
}

export async function proxyOperatorBookingRequest(url: string, init?: RequestInit) {
  const authToken = await getOperatorBookingAuthToken()
  const baseUrl = getBaseApiUrl()

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

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        message: 'Upstream booking API returned an error.',
        status: response.status,
        baseUrl,
        path: url.replace(baseUrl, ''),
        body,
      }),
      {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}

export async function proxyOperatorBookingNextRequest(
  request: Request,
  url: string,
  method = request.method,
) {
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text()
  const contentType = request.headers.get('content-type')

  return proxyOperatorBookingRequest(url, {
    method,
    body,
    headers: contentType ? { 'Content-Type': contentType } : undefined,
  })
}