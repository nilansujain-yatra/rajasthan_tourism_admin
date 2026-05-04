import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 401 })
  }

  try {
    const { id } = await request.json() as { id?: string }
    if (!id) {
      return NextResponse.json({ message: 'Missing helpdesk id.' }, { status: 400 })
    }

    const response = await fetch(`${getBaseUrl()}/helpdesk/complete-help-ticket?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
    })

    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve helpdesk ticket.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
