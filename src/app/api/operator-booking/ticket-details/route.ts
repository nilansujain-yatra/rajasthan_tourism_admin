import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
  const date = request.nextUrl.searchParams.get('date')?.trim()
  const specificChargesId = request.nextUrl.searchParams.get('specificChargesId')?.trim()
  const onSite = request.nextUrl.searchParams.get('onSite')?.trim() ?? 'true'

  if (!placeId || !date || !specificChargesId) {
    return NextResponse.json(
      { message: 'placeId, date and specificChargesId are required.' },
      { status: 400 },
    )
  }

  try {
    const url = new URL(`${getBaseApiUrl()}/booking/tickets`)
    url.searchParams.set('placeId', placeId)
    url.searchParams.set('date', date)
    url.searchParams.set('specificChargesId', specificChargesId)
    url.searchParams.set('onSite', onSite)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch ticket details.' },
      { status: 500 },
    )
  }
}
