import { NextResponse } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { id?: string; driverId?: string; active?: boolean; activate?: boolean }
    const driverId = payload.driverId?.trim() ?? payload.id?.trim() ?? ''
    const activate = typeof payload.activate === 'boolean'
      ? payload.activate
      : Boolean(payload.active)

    if (!driverId) {
      return NextResponse.json({ message: 'Missing driver id.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/driver/activate`)
    url.searchParams.set('activate', String(activate))
    url.searchParams.set('id', driverId)

    return proxyJsonRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update driver status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
