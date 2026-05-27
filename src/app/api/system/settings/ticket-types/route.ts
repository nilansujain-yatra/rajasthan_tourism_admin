import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsDelete, proxySettingsGet, proxySettingsPost, proxySettingsPut } from '../_shared'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    return await proxySettingsGet('/master/ticketType', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch ticket types.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxySettingsPost('/master/ticketType', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save ticket type.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ticketTypeId = request.nextUrl.searchParams.get('ticketTypeId')?.trim()
    const path = ticketTypeId ? `/master/ticketType?ticketTypeId=${encodeURIComponent(ticketTypeId)}` : '/master/ticketType'
    return await proxySettingsPut(path, request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update ticket type.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxySettingsDelete('/master/ticketType', request)
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete ticket type.' }, { status: 500 })
  }
}
