import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

function getType(request: NextRequest) {
  return request.nextUrl.searchParams.get('type')?.trim().toLowerCase() ?? 'jkk'
}

export async function GET(request: NextRequest) {
  try {
    const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
    if (!placeId) {
      return NextResponse.json({ message: 'placeId is required.' }, { status: 400 })
    }

    if (getType(request) !== 'jkk') {
      return NextResponse.json({ message: 'Only JKK category integration is available in this module.' }, { status: 400 })
    }

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/jkk/allCategory?placeId=${encodeURIComponent(placeId)}`, {
      method: 'GET',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to fetch categories.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
    const name = request.nextUrl.searchParams.get('name')?.trim()

    if (!placeId || !name) {
      return NextResponse.json({ message: 'placeId and name are required.' }, { status: 400 })
    }

    if (getType(request) !== 'jkk') {
      return NextResponse.json({ message: 'Only JKK category integration is available in this module.' }, { status: 400 })
    }

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/jkk/addCategory?placeId=${encodeURIComponent(placeId)}&name=${encodeURIComponent(name)}`, {
      method: 'POST',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to add category.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim()
    const name = request.nextUrl.searchParams.get('name')?.trim()

    if (!id || !name) {
      return NextResponse.json({ message: 'id and name are required.' }, { status: 400 })
    }

    if (getType(request) !== 'jkk') {
      return NextResponse.json({ message: 'Only JKK category integration is available in this module.' }, { status: 400 })
    }

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/jkk/updateCategory?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`, {
      method: 'POST',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update category.' },
      { status: 500 },
    )
  }
}
