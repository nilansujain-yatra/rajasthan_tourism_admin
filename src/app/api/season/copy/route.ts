import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/season/copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to copy season configuration.' },
      { status: 500 },
    )
  }
}
