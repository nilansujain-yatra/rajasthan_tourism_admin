import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../../operator-booking/_shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const isEntry = request.nextUrl.searchParams.get('isEntry')?.trim()
  const qrDetail = request.nextUrl.searchParams.get('qrDetail')?.trim()

  if (!isEntry || !qrDetail) {
    return NextResponse.json({ message: 'isEntry and qrDetail are required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseApiUrl()}/booking/verify-qr-v1`)
    url.searchParams.set('isEntry', isEntry)
    url.searchParams.set('qrDetail', qrDetail)

    return await proxyOperatorBookingRequest(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to scan QR.' },
      { status: 500 },
    )
  }
}
