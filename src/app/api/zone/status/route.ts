import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(`${getBaseApiUrl()}/zone/active`)

    request.nextUrl.searchParams.forEach((value, key) => {
      if (value.trim()) {
        url.searchParams.set(key, value)
      }
    })

    return await proxyOperatorBookingRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update zone status.' },
      { status: 500 },
    )
  }
}
