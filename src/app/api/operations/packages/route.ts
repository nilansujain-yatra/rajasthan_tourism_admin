import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from './_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/package/getPackageList`)

    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('statusList', request.nextUrl.searchParams.get('statusList')?.trim() ?? '')

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch packages.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text()

    return proxyJsonRequest(`${getBaseUrl()}/package/create-package`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create package.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.text()

    return proxyJsonRequest(`${getBaseUrl()}/package/update-package`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update package.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
