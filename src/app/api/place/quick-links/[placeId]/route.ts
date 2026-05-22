import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ placeId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { placeId } = await context.params
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/place/getPlaceDetails?id=${encodeURIComponent(placeId)}`, {
      method: 'GET',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch quick links.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { placeId } = await context.params
    const body = await request.text()
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/place/insertOrUpdatePlaceDetails/${encodeURIComponent(placeId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to save quick link.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { placeId } = await context.params
    const body = await request.text()
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/place/updatePlaceDetails/${encodeURIComponent(placeId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update quick link.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { placeId } = await context.params
    const body = await request.text()
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/place/deletePlaceDetails/${encodeURIComponent(placeId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to delete quick link.' },
      { status: 500 },
    )
  }
}
