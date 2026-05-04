import { NextResponse } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { id?: string; guideId?: string; active?: boolean; activate?: boolean }
    const guideId = payload.guideId?.trim() ?? payload.id?.trim() ?? ''
    const activate = typeof payload.activate === 'boolean'
      ? payload.activate
      : Boolean(payload.active)

    if (!guideId) {
      return NextResponse.json({ message: 'Missing guide id.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/guide/activate`)
    url.searchParams.set('activate', String(activate))
    url.searchParams.set('id', guideId)

    return proxyJsonRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update guide status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
