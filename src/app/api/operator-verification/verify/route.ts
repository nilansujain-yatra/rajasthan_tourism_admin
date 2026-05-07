import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../../operator-booking/_shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/booking/verify-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to verify ticket.' },
      { status: 500 },
    )
  }
}
