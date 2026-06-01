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
    const startDay = request.nextUrl.searchParams.get('startDay')?.trim() ?? ''
    const endDay = request.nextUrl.searchParams.get('endDay')?.trim() ?? ''
    const placeId = request.nextUrl.searchParams.get('placeId')?.trim() ?? ''
    const failReply = request.nextUrl.searchParams.get('failReply')?.trim() ?? ''
    const offset = request.nextUrl.searchParams.get('offSet')?.trim() ?? '0'
    const size = request.nextUrl.searchParams.get('size')?.trim() ?? '10'
    const pagination = request.nextUrl.searchParams.get('pagination')?.trim() ?? 'true'

    const url = new URL(`${getBaseApiUrl()}/failTicket/report`)
    url.searchParams.set('startDay', startDay)
    url.searchParams.set('endDay', endDay)
    url.searchParams.set('placeId', placeId)
    url.searchParams.set('failReply', failReply)
    url.searchParams.set('offSet', offset)
    url.searchParams.set('size', size)
    url.searchParams.set('pagination', pagination)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch failed ticket report.' },
      { status: 500 },
    )
  }
}

