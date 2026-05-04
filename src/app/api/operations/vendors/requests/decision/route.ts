import { NextResponse } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../../_utils'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.text()

    return proxyJsonRequest(`${getBaseUrl()}/vendor/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update vendor request.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
