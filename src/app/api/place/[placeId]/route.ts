import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ placeId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { placeId } = await context.params
    if (!placeId?.trim()) {
      return NextResponse.json({ message: 'placeId is required.' }, { status: 400 })
    }

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/place/${encodeURIComponent(placeId)}`, {
      method: 'GET',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch place details.' },
      { status: 500 },
    )
  }
}
