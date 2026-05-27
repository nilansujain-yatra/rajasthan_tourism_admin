import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseUrl, proxyJsonRequest } from '@/app/api/operations/vendors/_utils'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(`${getBaseUrl()}/master/vendor/type/active`)

    request.nextUrl.searchParams.forEach((value, key) => {
      if (value.trim()) {
        url.searchParams.set(key, value)
      }
    })

    return await proxyJsonRequest(url.toString(), { method: 'PUT' })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update vendor type status.' }, { status: 500 })
  }
}
