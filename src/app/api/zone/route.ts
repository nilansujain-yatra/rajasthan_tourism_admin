import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getBaseApiUrl,
  proxyOperatorBookingNextRequest,
  proxyOperatorBookingRequest,
} from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

function buildUrl(request: NextRequest) {
  const url = new URL(`${getBaseApiUrl()}/zone`)

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
      { message: error instanceof Error ? error.message : 'Unable to fetch zones.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxyOperatorBookingNextRequest(request, `${getBaseApiUrl()}/zone`, 'POST')
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to save zone.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxyOperatorBookingNextRequest(request, `${getBaseApiUrl()}/zone`, 'PUT')
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update zone.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxyOperatorBookingRequest(buildUrl(request), { method: 'DELETE' })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to delete zone.' },
      { status: 500 },
    )
  }
}
