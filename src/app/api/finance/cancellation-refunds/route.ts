import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
  }

  try {
    const url = new URL(`${getBaseUrl()}/booking/ticketBookingReportForOperator`)

    url.searchParams.set('endDay', request.nextUrl.searchParams.get('endDay')?.trim() ?? '')
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('placeId', request.nextUrl.searchParams.get('placeId')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('startDay', request.nextUrl.searchParams.get('startDay')?.trim() ?? '')
    url.searchParams.set('paymentType', request.nextUrl.searchParams.get('paymentType')?.trim() ?? 'SUCCESS')
    url.searchParams.set('boardingPassStatus', request.nextUrl.searchParams.get('boardingPassStatus')?.trim() ?? 'ALL')
    url.searchParams.set('isFilter', request.nextUrl.searchParams.get('isFilter')?.trim() ?? 'false')
    const shiftId = request.nextUrl.searchParams.get('shiftId')?.trim()
    const zoneId = request.nextUrl.searchParams.get('zoneId')?.trim()
    if (shiftId) url.searchParams.set('shiftId', shiftId)
    if (zoneId) url.searchParams.set('zoneId', zoneId)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
    })

    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch cancellation refunds.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
