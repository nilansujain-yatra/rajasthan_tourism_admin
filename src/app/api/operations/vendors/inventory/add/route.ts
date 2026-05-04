import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../../_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/vendor/place/requests`)

    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('requestStatus', request.nextUrl.searchParams.get('requestStatus')?.trim() ?? 'PENDING')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('vendorId', request.nextUrl.searchParams.get('vendorId')?.trim() ?? '')
    url.searchParams.set('subInventoryTypeId', request.nextUrl.searchParams.get('subInventoryTypeId')?.trim() ?? '')
    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch add inventory requests.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
