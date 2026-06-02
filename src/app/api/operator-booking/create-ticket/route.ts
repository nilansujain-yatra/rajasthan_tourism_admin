import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../_shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const isDepartmentAdmin = request.nextUrl.searchParams.get('isDepartmentAdmin')?.trim() ?? 'false'
  const onSite = request.nextUrl.searchParams.get('onSite')?.trim() ?? 'true'
      console.log('Resolved API URL:', getBaseApiUrl())

  try {

    const payload = await request.text()
    const url = new URL(`${getBaseApiUrl()}/booking/create/v2`)
    url.searchParams.set('isDepartmentAdmin', isDepartmentAdmin)
    url.searchParams.set('onSite', onSite)

    return await proxyOperatorBookingRequest(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to create ticket booking.' },
      { status: 500 },
    )
  }
}
