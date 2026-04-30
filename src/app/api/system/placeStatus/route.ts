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

async function proxyJson(url: URL, init: RequestInit) {
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

  const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
  if (!placeId) {
    return NextResponse.json({ message: 'placeId is required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseUrl()}/place/status/get`)
    url.searchParams.set('placeId', placeId)

    return await proxyJson(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch place status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authToken = await getAuthToken()
  if (!authToken) return authError()

  try {
    const payload = await request.json()
    const hasId = typeof payload?.id === 'string' && payload.id.trim().length > 0
    const url = new URL(`${getBaseUrl()}${hasId ? '/place/status/update' : '/place/status/add'}`)

    return await proxyJson(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save place status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authToken = await getAuthToken()
  if (!authToken) return authError()

  const id = request.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ message: 'id is required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseUrl()}/place/status/delete`)
    url.searchParams.set('id', id)

    return await proxyJson(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete place status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
