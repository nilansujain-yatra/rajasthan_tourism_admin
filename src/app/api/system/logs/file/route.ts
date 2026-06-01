import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseApiUrl() {
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

function resolveFileUrl(filePath: string) {
  const trimmed = filePath.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return `${getBaseApiUrl()}${trimmed}`
  return `${getBaseApiUrl()}/${trimmed.replace(/^\/+/, '')}`
}

export async function GET(request: NextRequest) {
  const authToken = await getAuthToken()

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 401 })
  }

  const filePath = request.nextUrl.searchParams.get('filePath')?.trim() ?? ''

  if (!filePath) {
    return NextResponse.json({ message: 'Missing filePath.' }, { status: 400 })
  }

  try {
    const response = await fetch(resolveFileUrl(filePath), {
      method: 'GET',
      headers: {
        Accept: 'text/plain, text/*, application/json, */*',
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
    })

    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch file content.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

