import { NextResponse } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '../_utils'

export const runtime = 'nodejs'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const packageId = id?.trim()

    if (!packageId) {
      return NextResponse.json({ message: 'Missing package id.' }, { status: 400 })
    }

    return proxyJsonRequest(`${getBaseUrl()}/package/getPackage/${encodeURIComponent(packageId)}`, { method: 'GET' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch package details.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
