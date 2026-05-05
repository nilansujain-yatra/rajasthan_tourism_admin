import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

async function getAuthToken() {
  const cookieStore = await cookies()

  return (
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN
  )
}

function encodeQueryValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return ''
  return encodeURIComponent(String(value))
}

function buildUrl(path: string) {
  return new URL(`${getBaseUrl()}${path}`)
}

async function proxyResponse(url: URL, init: RequestInit) {
  const response = await fetch(url.toString(), {
    ...init,
    cache: 'no-store',
  })

  const body = await response.text()

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}

export async function proxyJkkGet(
  request: NextRequest,
  upstreamPath: string,
  fallbackMessage: string,
) {
  const authToken = await getAuthToken()

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
  }

  try {
    const url = buildUrl(upstreamPath)

    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })

    return await proxyResponse(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : fallbackMessage
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function proxyJkkPostQuery(
  queryPath: string,
  fallbackMessage: string,
) {
  const authToken = await getAuthToken()

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
  }

  try {
    const url = buildUrl(queryPath)

    return await proxyResponse(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : fallbackMessage
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function proxyJkkPostBody(
  request: NextRequest,
  upstreamPath: string,
  fallbackMessage: string,
) {
  const authToken = await getAuthToken()

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
  }

  try {
    const payload = await request.json()
    const url = buildUrl(upstreamPath)

    return await proxyResponse(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : fallbackMessage
    return NextResponse.json({ message }, { status: 500 })
  }
}

export { encodeQueryValue }
