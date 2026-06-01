import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

function getBaseApiUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function POST(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get('bookingId')?.trim() ?? ''
    const url = new URL(`${getBaseApiUrl()}/booking/ticketPaymentStatus`)
    url.searchParams.set('bookingId', bookingId)
    return await proxyOperatorBookingRequest(url.toString(), { method: 'POST' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch ticket payment status.' },
      { status: 500 },
    )
  }
}

