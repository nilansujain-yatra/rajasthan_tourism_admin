import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsPutWithQuery } from '../../_shared'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    return await proxySettingsPutWithQuery('/master/inventory-quota', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update quota type status.' }, { status: 500 })
  }
}
