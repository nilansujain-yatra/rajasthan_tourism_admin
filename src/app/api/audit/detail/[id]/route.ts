import { NextResponse } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../../_utils'

export const runtime = 'nodejs'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id?.trim()) {
      return NextResponse.json({ message: 'Audit id is required.' }, { status: 400 })
    }

    return proxyJsonRequest(`${getBaseUrl()}/audit/getAudit/${encodeURIComponent(id.trim())}`, { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch audit details.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
