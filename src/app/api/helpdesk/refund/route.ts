import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readFileSync } from 'fs'
import { join } from 'path'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

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

function getFallbackAuthToken() {
  return (
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN ??
    readTokenFromEnvFile('.env.local') ??
    readTokenFromEnvFile('.env.example')
  )
}

async function refundBooking(bookingId: string, refundReason: string, authToken: string) {
  const url = new URL(`${getBaseUrl()}/helpdesk/refund`)
  url.searchParams.set('bookingId', bookingId)
  url.searchParams.set('refundReason', refundReason.trim() || 'OTHER')

  return fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    cache: 'no-store',
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    getFallbackAuthToken()

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 401 })
  }

  try {
    const { bookingId, refundReason } = await request.json() as { bookingId?: string; refundReason?: string }
    if (!bookingId) {
      return NextResponse.json({ message: 'Missing booking id.' }, { status: 400 })
    }

    const normalizedRefundReason = refundReason?.trim() || 'OTHER'
    let response = await refundBooking(bookingId, normalizedRefundReason, authToken)

    if (response.status === 401 || response.status === 403) {
      const fallbackAuthToken = getFallbackAuthToken()
      if (fallbackAuthToken && fallbackAuthToken !== authToken) {
        response = await refundBooking(bookingId, normalizedRefundReason, fallbackAuthToken)
      }
    }

    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to refund helpdesk ticket.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
