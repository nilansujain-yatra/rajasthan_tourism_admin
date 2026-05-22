import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const ssoId = request.nextUrl.searchParams.get('ssoId')?.trim()
    if (!ssoId) {
      return NextResponse.json({ message: 'ssoId is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/role`)
    url.searchParams.set('ssoId', ssoId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to verify SSO user.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to assign role.' },
      { status: 500 },
    )
  }
}
