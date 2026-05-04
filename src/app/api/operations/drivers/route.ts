import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from './_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/driver/getDriverList`)

    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')

    const active = request.nextUrl.searchParams.get('active')?.trim()
    const placeId = request.nextUrl.searchParams.get('placeId')?.trim()
    if (active) url.searchParams.set('active', active)
    if (placeId) url.searchParams.set('placeId', placeId)

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch drivers.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text()

    return proxyJsonRequest(`${getBaseUrl()}/driver/createDriver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create driver.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>
    const driverId = typeof payload.driverId === 'string'
      ? payload.driverId.trim()
      : typeof payload.id === 'string'
      ? payload.id.trim()
      : ''

    if (!driverId) {
      return NextResponse.json({ message: 'Missing driver id.' }, { status: 400 })
    }

    const body = JSON.stringify({
      ...payload,
      driverId: undefined,
      id: undefined,
    })

    return proxyJsonRequest(`${getBaseUrl()}/driver/updateDriver?driverId=${encodeURIComponent(driverId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update driver.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
