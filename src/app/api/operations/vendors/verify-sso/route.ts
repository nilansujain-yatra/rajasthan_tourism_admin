import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const ssoId = request.nextUrl.searchParams.get('ssoId')?.trim()
    if (!ssoId) {
      return NextResponse.json({ message: 'Missing SSO ID.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/role`)
    url.searchParams.set('ssoId', ssoId)

    return proxyJsonRequest(url.toString(), { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify SSO ID.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
