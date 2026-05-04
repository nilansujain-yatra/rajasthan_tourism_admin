import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/vendor/getAllVendors`)

    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('status', request.nextUrl.searchParams.get('status')?.trim() ?? 'PENDING')
    url.searchParams.set('userId', request.nextUrl.searchParams.get('userId')?.trim() ?? '')
    url.searchParams.set('vendorDetailId', request.nextUrl.searchParams.get('vendorDetailId')?.trim() ?? '')
    url.searchParams.set('verifiedUser', request.nextUrl.searchParams.get('verifiedUser')?.trim() ?? 'false')

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch vendor requests.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
