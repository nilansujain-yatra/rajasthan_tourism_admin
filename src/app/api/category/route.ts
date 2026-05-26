import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const bookingType = request.nextUrl.searchParams.get('bookingType')?.trim() ?? 'NON_INVENTORY,INVENTORY'
    const searchKey = request.nextUrl.searchParams.get('searchKey')?.trim() ?? ''
    const statusList = request.nextUrl.searchParams.get('statusList')?.trim() ?? 'ACTIVE'

    return await proxyOperatorBookingRequest(
      `${getBaseApiUrl()}/category/place?bookingType=${encodeURIComponent(bookingType)}&searchKey=${encodeURIComponent(searchKey)}&statusList=${encodeURIComponent(statusList)}`,
      { method: 'GET' },
    )
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch categories.' },
      { status: 500 },
    )
  }
}
