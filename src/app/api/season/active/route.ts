import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const seasonId = request.nextUrl.searchParams.get('seasonId')?.trim()
    const active = request.nextUrl.searchParams.get('active')?.trim()

    if (!seasonId) {
      return NextResponse.json({ message: 'seasonId is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/season/active`)
    url.searchParams.set('seasonId', seasonId)
    url.searchParams.set('active', active ?? 'false')

    return await proxyOperatorBookingRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update season status.' },
      { status: 500 },
    )
  }
}
