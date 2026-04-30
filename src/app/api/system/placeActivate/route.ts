import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
  }

  try {
    const payload = (await request.json()) as { placeId?: string; active?: boolean }
    const placeId = payload.placeId?.trim()

    if (!placeId || typeof payload.active !== 'boolean') {
      return NextResponse.json({ message: 'placeId and active are required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/place/activate`)
    url.searchParams.set('active', String(payload.active))
    url.searchParams.set('placeId', placeId)

    const response = await fetch(url.toString(), {
      method: 'PUT',
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
    const message = error instanceof Error ? error.message : 'Unable to update place active status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
