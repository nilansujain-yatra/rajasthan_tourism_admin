import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
    if (!placeId) {
      return NextResponse.json({ message: 'placeId is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/place/siteAdmin`)
    url.searchParams.set('placeId', placeId)
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch site admins.' },
      { status: 500 },
    )
  }
}
