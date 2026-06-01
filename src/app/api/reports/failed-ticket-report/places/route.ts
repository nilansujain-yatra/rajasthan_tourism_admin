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
    const departmentId = request.nextUrl.searchParams.get('departmentId')?.trim() ?? ''
    const districtId = request.nextUrl.searchParams.get('districtId')?.trim() ?? ''

    const url = new URL(`${getBaseApiUrl()}/place/placeFilters`)
    url.searchParams.set('searchKey', searchKey)
    url.searchParams.set('departmentId', departmentId)
    url.searchParams.set('districtId', districtId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch places.' },
      { status: 500 },
    )
  }
}

