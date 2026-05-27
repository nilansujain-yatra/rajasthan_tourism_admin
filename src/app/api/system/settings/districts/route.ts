import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsDelete, proxySettingsGet, proxySettingsPost, proxySettingsPut } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/district', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch districts.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxySettingsPost('/district', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save district.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxySettingsPut('/district', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update district.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxySettingsDelete('/district', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete district.' }, { status: 500 })
  }
}
