import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from './_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/guide/getGuideList`)

    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('placeId', request.nextUrl.searchParams.get('placeId')?.trim() ?? '')

    const active = request.nextUrl.searchParams.get('active')?.trim()
    if (active) url.searchParams.set('active', active)

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch guides.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text()

    return proxyJsonRequest(`${getBaseUrl()}/guide/createGuide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create guide.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>
    const guideId = typeof payload.guideId === 'string'
      ? payload.guideId.trim()
      : typeof payload.id === 'string'
      ? payload.id.trim()
      : ''

    if (!guideId) {
      return NextResponse.json({ message: 'Missing guide id.' }, { status: 400 })
    }

    const body = JSON.stringify({
      ...payload,
      guideId: undefined,
      id: undefined,
    })

    return proxyJsonRequest(`${getBaseUrl()}/guide/updateGuide?guideId=${encodeURIComponent(guideId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update guide.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
