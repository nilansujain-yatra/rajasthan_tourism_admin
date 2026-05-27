import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsDelete, proxySettingsGet, proxySettingsPost } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/inventory/type', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch inventory types.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxySettingsPost('/inventory/type', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save inventory type.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxySettingsDelete('/inventory/type', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete inventory type.' }, { status: 500 })
  }
}
