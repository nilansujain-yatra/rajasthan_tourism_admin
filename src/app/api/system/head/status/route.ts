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

  const headId = request.nextUrl.searchParams.get('headId')?.trim()
  const isActive = request.nextUrl.searchParams.get('isActive')?.trim()

  if (!headId) {
    return NextResponse.json({ message: 'headId is required.' }, { status: 400 })
  }

  if (!isActive) {
    return NextResponse.json({ message: 'isActive is required.' }, { status: 400 })
  }

  try {
    const url = new URL(`${getBaseUrl()}/head/active`)
    url.searchParams.set('headId', headId)
    url.searchParams.set('isActive', isActive)

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
    const message = error instanceof Error ? error.message : 'Unable to update head status.'
    return NextResponse.json({ message }, { status: 500 })
  }
}
