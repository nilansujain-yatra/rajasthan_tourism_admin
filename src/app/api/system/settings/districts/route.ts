import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxySettingsGet, proxySettingsPost, proxySettingsPut } from '../_shared'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

function buildDeleteUrl(path: string, request: NextRequest) {
  const url = new URL(`${getBaseApiUrl()}${path}`)
  const districtId = request.nextUrl.searchParams.get('districtId')?.trim()

  request.nextUrl.searchParams.forEach((value, key) => {
    if (value.trim()) {
      url.searchParams.set(key, value)
    }
  })

  if (districtId) {
    url.searchParams.set('districtId', districtId)
    url.searchParams.set('id', districtId)
  }

  return url.toString()
}

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
    const primaryResponse = await proxyOperatorBookingRequest(buildDeleteUrl('/district/status/delete', request), { method: 'DELETE' })
    if (primaryResponse.status !== 405) {
      return primaryResponse
    }

    return await proxyOperatorBookingRequest(buildDeleteUrl('/district/delete', request), { method: 'DELETE' })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete district.' }, { status: 500 })
  }
}
