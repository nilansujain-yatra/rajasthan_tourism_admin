import { NextResponse } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../_shared'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/specific-charges`, {
      method: 'GET',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch specific charges.' },
      { status: 500 },
    )
  }
}
