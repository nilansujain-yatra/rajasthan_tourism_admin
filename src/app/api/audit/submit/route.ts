import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json()
    return proxyJsonRequest(`${getBaseUrl()}/audit/submit-audit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit audit.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
