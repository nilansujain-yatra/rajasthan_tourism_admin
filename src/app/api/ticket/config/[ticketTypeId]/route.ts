import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketTypeId: string }> },
) {
  try {
    const { ticketTypeId } = await params
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/ticket/config/${encodeURIComponent(ticketTypeId)}`, {
      method: 'GET',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch ticket configuration details.' },
      { status: 500 },
    )
  }
}
