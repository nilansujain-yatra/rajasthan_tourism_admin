import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json({ message: 'Missing auth token.' }, { status: 500 })
  }

  const policyId = request.nextUrl.searchParams.get('policyId')?.trim()
  const active = request.nextUrl.searchParams.get('active')?.trim()

  if (!policyId) {
    return NextResponse.json({ message: 'policyId is required.' }, { status: 400 })
  }

  if (!active) {
    return NextResponse.json({ message: 'active is required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseUrl()}/cancel-policy/active`)
    url.searchParams.set('policyId', policyId)
    url.searchParams.set('active', active)

    const response = await fetch(url.toString(), {
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
    const message = error instanceof Error ? error.message : 'Unable to update cancellation policy status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
