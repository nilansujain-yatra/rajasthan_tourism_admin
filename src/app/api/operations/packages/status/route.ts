import { NextResponse } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { id?: string; packageId?: string; active?: boolean; activate?: boolean }
    const packageId = payload.packageId?.trim() ?? payload.id?.trim() ?? ''
    const activate = typeof payload.activate === 'boolean'
      ? payload.activate
      : Boolean(payload.active)

    if (!packageId) {
      return NextResponse.json({ message: 'Missing package id.' }, { status: 400 })
    }

    const url = new URL(`${getBaseUrl()}/package/activate-deactivate`)
    url.searchParams.set('activate', String(activate))
    url.searchParams.set('id', packageId)

    return proxyJsonRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update package status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
