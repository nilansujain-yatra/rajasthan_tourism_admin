import { readFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function readTokenFromEnvFile(fileName: string) {
  try {
    const envText = readFileSync(join(process.cwd(), fileName), 'utf8')

    for (const key of ['RAJASTHAN_API_TOKEN', 'NEXT_PUBLIC_LOGIN_TOKEN']) {
      const match = envText.match(new RegExp(`^\\s*#?\\s*${key}=(.+)$`, 'm'))
      const value = match?.[1]?.trim()
      if (value) return value
    }
  } catch {
    return undefined
  }

  return undefined
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function getAuthToken() {
  const cookieStore = await cookies()

  return (
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN ??
    readTokenFromEnvFile('.env.local') ??
    readTokenFromEnvFile('.env.example')
  )
}

export async function proxyJsonRequest(url: string, init: RequestInit = {}) {
  const authToken = await getAuthToken()
  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 401 })
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
      ...(init.headers ?? {}),
    },
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
