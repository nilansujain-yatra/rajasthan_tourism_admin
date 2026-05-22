import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const kioskId = request.nextUrl.searchParams.get('kioskId')?.trim()
    const ssoId = request.nextUrl.searchParams.get('ssoId')?.trim()
    const placeId = request.nextUrl.searchParams.get('placeId')?.trim()

    if (!kioskId || !ssoId || !placeId) {
      return NextResponse.json({ message: 'kioskId, ssoId and placeId are required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/role/kiosk`)
    url.searchParams.set('kioskId', kioskId)
    url.searchParams.set('ssoId', ssoId)
    url.searchParams.set('placeId', placeId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to verify kiosk.' },
      { status: 500 },
    )
  }
}
