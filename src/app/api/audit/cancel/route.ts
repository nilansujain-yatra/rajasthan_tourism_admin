import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json() as { id?: string; status?: boolean }
    const id = payload.id?.trim()

    if (!id) {
      return NextResponse.json({ message: 'Audit id is required.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/audit/cancel-audit`)
    url.searchParams.set('auditId', id)
    url.searchParams.set('status', String(payload.status ?? true))

    return proxyJsonRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to cancel audit.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
