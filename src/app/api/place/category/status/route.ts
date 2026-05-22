import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type')?.trim().toLowerCase() ?? 'jkk'
    const id = request.nextUrl.searchParams.get('id')?.trim()
    const status = request.nextUrl.searchParams.get('status')?.trim()

    if (!id) {
      return NextResponse.json({ message: 'id is required.' }, { status: 400 })
    }

    if (type !== 'jkk') {
      return NextResponse.json({ message: 'Only JKK category integration is available in this module.' }, { status: 400 })
    }

    return await proxyOperatorBookingRequest(`${getBaseApiUrl()}/jkk/updateStatus?id=${encodeURIComponent(id)}&status=${encodeURIComponent(status ?? 'false')}`, {
      method: 'POST',
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update category status.' },
      { status: 500 },
    )
  }
}
