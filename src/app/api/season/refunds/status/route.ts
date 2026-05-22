import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const refundStatus = request.nextUrl.searchParams.get('refundStatus')?.trim()
    const ticketBookingId = request.nextUrl.searchParams.get('ticketBookingId')?.trim()

    if (!refundStatus || !ticketBookingId) {
      return NextResponse.json({ message: 'refundStatus and ticketBookingId are required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/booking/refund-status`)
    url.searchParams.set('refundStatus', refundStatus)
    url.searchParams.set('ticketBookingId', ticketBookingId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update refund status.' },
      { status: 500 },
    )
  }
}
