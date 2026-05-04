import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/master/vendor/type`)

    url.searchParams.set('bookingType', request.nextUrl.searchParams.get('bookingType')?.trim() ?? '')
    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('pagination', request.nextUrl.searchParams.get('pagination')?.trim() ?? 'false')
    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '100')
    url.searchParams.set('status', request.nextUrl.searchParams.get('status')?.trim() ?? '')

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch vendor types.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
