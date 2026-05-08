import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/audit/getAll-audit-list`)
    const statuses = request.nextUrl.searchParams.getAll('status')
      .flatMap(value => value.split(','))
      .map(value => value.trim())
      .filter(Boolean)

    url.searchParams.set('offSet', request.nextUrl.searchParams.get('offSet')?.trim() ?? '0')
    url.searchParams.set('searchKey', request.nextUrl.searchParams.get('searchKey')?.trim() ?? '')
    url.searchParams.set('size', request.nextUrl.searchParams.get('size')?.trim() ?? '10')
    url.searchParams.set('requestType', request.nextUrl.searchParams.get('requestType')?.trim() ?? 'MY_REQUEST')
    url.searchParams.set('status', statuses.join(','))

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch audit list.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
