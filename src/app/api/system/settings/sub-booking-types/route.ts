import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsGet } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/sub-booking-type', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch sub booking types.' }, { status: 500 })
  }
}
