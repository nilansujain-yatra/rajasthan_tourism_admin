import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsDelete, proxySettingsGet, proxySettingsPost, proxySettingsPut } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/dept', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch departments.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxySettingsPost('/dept', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save department.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxySettingsPut('/dept', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update department.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxySettingsDelete('/dept', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete department.' }, { status: 500 })
  }
}
