import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // The user requested to use this specific base URL for seasons
    const baseUrl = 'http://10.70.235.179:30204/rajasthan/api/v1/season'
    const url = new URL(baseUrl)

    request.nextUrl.searchParams.forEach((value, key) => {
      if (value.trim()) {
        url.searchParams.set(key, value)
      }
    })

    return await proxyOperatorBookingRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch seasons.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/season`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to create season.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const seasonId = request.nextUrl.searchParams.get('seasonId')?.trim()
    const body = await request.text()
    const url = new URL(`${getBaseApiUrl()}/season`)

    if (seasonId) {
      url.searchParams.set('seasonId', seasonId)
    }

    return await proxyOperatorBookingRequest(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update season.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const seasonId = request.nextUrl.searchParams.get('seasonId')?.trim()
    if (!seasonId) {
      return NextResponse.json({ message: 'seasonId is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseApiUrl()}/season`)
    url.searchParams.set('seasonId', seasonId)

    return await proxyOperatorBookingRequest(url.toString(), { method: 'DELETE' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to delete season.' },
      { status: 500 },
    )
  }
}
