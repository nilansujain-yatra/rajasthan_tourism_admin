import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const ticketTypeId = request.nextUrl.searchParams.get('ticketTypeId')?.trim()
  const date = request.nextUrl.searchParams.get('date')?.trim()

  if (!ticketTypeId || !date) {
    return NextResponse.json(
      { message: 'ticketTypeId and date are required.' },
      { status: 400 },
    )
  }

  try {
    const url = new URL(`${getBaseApiUrl()}/booking/addon`)
    url.searchParams.set('ticketTypeId', ticketTypeId)
    url.searchParams.set('date', date)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch ticket add-ons.' },
      { status: 500 },
    )
  }
}
