import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonNextRequest, proxyJsonRequest } from '@/app/api/operations/vendors/_utils'

export const runtime = 'nodejs'

function buildUrl(request: NextRequest) {
  const url = new URL(`${getBaseUrl()}/master/vendor/type`)

  request.nextUrl.searchParams.forEach((value, key) => {
    if (value.trim()) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

export async function GET(request: NextRequest) {
  try {
    return await proxyJsonRequest(buildUrl(request), { method: 'GET' })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to fetch vendor types.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxyJsonNextRequest(request, `${getBaseUrl()}/master/vendor/type`, 'POST')
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save vendor type.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxyJsonRequest(buildUrl(request), { method: 'DELETE' })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete vendor type.' }, { status: 500 })
  }
}
