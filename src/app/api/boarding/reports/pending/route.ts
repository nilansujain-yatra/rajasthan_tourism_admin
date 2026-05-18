import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('placeId')?.trim()

  if (!placeId) {
    return NextResponse.json({ message: 'placeId is required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseApiUrl()}/boardingV2/bookingV2`)

    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch pending boarding passes.' },
      { status: 500 },
    )
  }
}
