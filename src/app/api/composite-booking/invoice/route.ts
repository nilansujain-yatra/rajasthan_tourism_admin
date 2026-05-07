import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../../operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get('bookingId')?.trim()

  if (!bookingId) {
    return NextResponse.json(
      { message: 'bookingId is required.' },
      { status: 400 },
    )
  }

  try {
    const url = new URL(`${getBaseApiUrl()}/package/management/invoice`)
    url.searchParams.set('bookingId', bookingId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch composite invoice.' },
      { status: 500 },
    )
  }
}
