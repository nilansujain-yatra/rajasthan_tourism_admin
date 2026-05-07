import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '../../operator-booking/_shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const isDepartmentAdmin = request.nextUrl.searchParams.get('isDepartmentAdmin')?.trim() ?? 'false'
  const onSite = request.nextUrl.searchParams.get('onSite')?.trim() ?? 'true'

  try {
    const payload = await request.text()
    const url = new URL(`${getBaseApiUrl()}/package/management/create/v2`)
    url.searchParams.set('isDepartmentAdmin', isDepartmentAdmin)
    url.searchParams.set('onSite', onSite)

    return await proxyOperatorBookingRequest(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to create composite booking.' },
      { status: 500 },
    )
  }
}
