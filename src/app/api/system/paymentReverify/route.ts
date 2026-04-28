import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json(
      { message: 'Missing auth token.' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const startDay = searchParams.get('startDay')
  const endDay = searchParams.get('endDay')
  const offSet = searchParams.get('offSet') || '0'
  const size = searchParams.get('size') || '10'
  const isFilter = searchParams.get('isFilter') || 'true'
  const placeId = searchParams.get('placeId') || ''
  const reverify = searchParams.get('reverify') || 'true'
  const searchKey = searchParams.get('searchKey') || ''

  const baseUrl = 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1/reports_V2/get/paymentReverify'
  const url = new URL(baseUrl)
  
  if (startDay) url.searchParams.set('startDay', startDay)
  if (endDay) url.searchParams.set('endDay', endDay)
  url.searchParams.set('offSet', offSet)
  url.searchParams.set('size', size)
  url.searchParams.set('isFilter', isFilter)
  if (placeId) url.searchParams.set('placeId', placeId)
  url.searchParams.set('reverify', reverify)
  if (searchKey) url.searchParams.set('searchKey', searchKey)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch payment reverify data.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
