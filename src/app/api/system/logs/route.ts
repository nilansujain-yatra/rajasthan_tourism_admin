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

function buildLogsUrl(request: NextRequest) {
  const url = new URL(`${getBaseApiUrl()}/user/getUserLogsFileList`)

  const defaults: Record<string, string> = {
    userId: '',
    startDate: '',
    endDate: '',
    size: '1000',
    offset: '0',
    isFilter: 'false',
  }

  Object.entries(defaults).forEach(([key, fallback]) => {
    const value = request.nextUrl.searchParams.get(key)?.trim()
    url.searchParams.set(key, value || fallback)
  })

  return url.toString()
}

export async function GET(request: NextRequest) {
  const authToken = await getAuthToken()

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 401 })
  }

  try {
    const response = await fetch(buildLogsUrl(request), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch user logs.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
