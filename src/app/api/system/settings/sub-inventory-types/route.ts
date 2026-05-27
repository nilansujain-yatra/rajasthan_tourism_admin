import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsDelete, proxySettingsGet, proxySettingsPost } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/sub-inventory', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch sub inventory types.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxySettingsPost('/sub-inventory', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save sub inventory type.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxySettingsDelete('/sub-inventory', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete sub inventory type.' }, { status: 500 })
  }
}
