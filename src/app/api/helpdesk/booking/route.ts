import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 401 })
  }

  try {
    const bookingId = request.nextUrl.searchParams.get('bookingId')?.trim()
    if (!bookingId) {
      return NextResponse.json({ message: 'Missing booking id.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/helpdesk/getBookingDetail`)
    url.searchParams.set('bookingId', bookingId)

    const response = await fetch(url.toString(), {
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
    const message = error instanceof Error ? error.message : 'Unable to fetch booking ticket.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
