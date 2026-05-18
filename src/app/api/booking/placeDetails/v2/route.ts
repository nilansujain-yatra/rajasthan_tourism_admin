import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
  const seasonId = request.nextUrl.searchParams.get('seasonId')?.trim()

  if (!placeId) {
    return NextResponse.json({ message: 'placeId is required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseApiUrl()}/booking/placeDetails/v2`)
    url.searchParams.set('placeId', placeId)

    if (seasonId) {
      url.searchParams.set('seasonId', seasonId)
    }

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch place details.' },
      { status: 500 },
    )
  }
}
