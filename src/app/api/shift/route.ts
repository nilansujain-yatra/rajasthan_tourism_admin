import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getBaseApiUrl,
  proxyOperatorBookingNextRequest,
  proxyOperatorBookingRequest,
} from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

function buildUrl(request: NextRequest) {
  const url = new URL(`${getBaseApiUrl()}/shift`)

  request.nextUrl.searchParams.forEach((value, key) => {
    if (value.trim()) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

export async function GET(request: NextRequest) {
  try {
    return await proxyOperatorBookingRequest(buildUrl(request), { method: 'GET' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch shifts.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxyOperatorBookingNextRequest(request, `${getBaseApiUrl()}/shift`, 'POST')
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to save shift.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxyOperatorBookingNextRequest(request, `${getBaseApiUrl()}/shift`, 'PUT')
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update shift.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxyOperatorBookingRequest(buildUrl(request), { method: 'DELETE' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to delete shift.' },
      { status: 500 },
    )
  }
}
