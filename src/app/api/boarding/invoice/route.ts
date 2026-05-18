import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get('bookingId')?.trim()
  const boardingPassId = request.nextUrl.searchParams.get('boardingPassId')?.trim()

  if (!bookingId || !boardingPassId) {
    return NextResponse.json({ message: 'bookingId and boardingPassId are required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseApiUrl()}/boardingV2/invoiceV2`)
    url.searchParams.set('bookingId', bookingId)
    url.searchParams.set('boardingPassId', boardingPassId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch boarding pass invoice.' },
      { status: 500 },
    )
  }
}
