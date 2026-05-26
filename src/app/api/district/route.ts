import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const divisionId = request.nextUrl.searchParams.get('divisionId')?.trim()
    const searchKey = request.nextUrl.searchParams.get('searchKey')?.trim() ?? ''

    if (!divisionId) {
      return NextResponse.json({ message: 'divisionId is required.' }, { status: 400 })
    }

    return await proxyOperatorBookingRequest(
      `${getBaseApiUrl()}/district?divisionId=${encodeURIComponent(divisionId)}&searchKey=${encodeURIComponent(searchKey)}`,
      { method: 'GET' },
    )
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch districts.' },
      { status: 500 },
    )
  }
}
