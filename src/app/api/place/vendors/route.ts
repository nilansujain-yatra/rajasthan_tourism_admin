import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
    if (!placeId) {
      return NextResponse.json({ message: 'placeId is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/vendor/place/all`)
    url.searchParams.set('placeId', placeId)
    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch place vendors.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/vendor/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to add vendor.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const vendorPlaceId = request.nextUrl.searchParams.get('vendorPlaceId')?.trim()
    const activate = request.nextUrl.searchParams.get('activate')?.trim()

    if (!vendorPlaceId) {
      return NextResponse.json({ message: 'vendorPlaceId is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/vendor/place/active`)
    url.searchParams.set('vendorPlaceId', vendorPlaceId)
    url.searchParams.set('activate', activate ?? 'false')

    return await proxyOperatorBookingRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update vendor status.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const vendorPlaceId = request.nextUrl.searchParams.get('vendorPlaceId')?.trim()
    if (!vendorPlaceId) {
      return NextResponse.json({ message: 'vendorPlaceId is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/vendor/place`)
    url.searchParams.set('vendorPlaceId', vendorPlaceId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'DELETE' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to delete vendor.' },
      { status: 500 },
    )
  }
}
