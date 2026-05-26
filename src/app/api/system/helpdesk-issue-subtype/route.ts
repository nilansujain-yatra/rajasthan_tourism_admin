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

function authError() {
  return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
}

async function proxyText(url: URL, init: RequestInit) {
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

export async function GET(request: NextRequest) {
  const authToken = await getAuthToken()
  if (!authToken) return authError()

  const issueTypeId = request.nextUrl.searchParams.get('issueTypeId')?.trim()
  if (!issueTypeId) {
    return NextResponse.json({ message: 'issueTypeId is required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseUrl()}/issue/get/subTypes`)
    url.searchParams.set('issueTypeId', issueTypeId)

    return await proxyText(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch sub issue types.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authToken = await getAuthToken()
  if (!authToken) return authError()

  try {
    const payload = await request.json()
    const url = new URL(`${getBaseUrl()}/issue/subTypeAdd`)

    return await proxyText(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create sub issue type.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authToken = await getAuthToken()
  if (!authToken) return authError()

  try {
    const payload = await request.json()
    const url = new URL(`${getBaseUrl()}/issue/subTypeUpdate`)

    return await proxyText(url, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update sub issue type.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
