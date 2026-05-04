import { NextResponse } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../../../_utils'

export const runtime = 'nodejs'

export async function PUT(request: Request) {
  try {
    const body = await request.text()

    return proxyJsonRequest(`${getBaseUrl()}/vendor/place/release/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update release inventory request.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
