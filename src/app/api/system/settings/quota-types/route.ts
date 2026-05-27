import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsDelete, proxySettingsGet, proxySettingsPost } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/master/inventory-quota', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch quota types.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxySettingsPost('/master/inventory-quota', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save quota type.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxySettingsDelete('/master/inventory-quota', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete quota type.' }, { status: 500 })
  }
}
