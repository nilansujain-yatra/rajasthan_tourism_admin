import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

function getBaseApiUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function GET(request: NextRequest) {
  try {
    const searchKey = request.nextUrl.searchParams.get('searchKey')?.trim() ?? ''
    const url = new URL(`${getBaseApiUrl()}/role/filter/department`)
    url.searchParams.set('searchKey', searchKey)
    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch departments.' },
      { status: 500 },
    )
  }
}

