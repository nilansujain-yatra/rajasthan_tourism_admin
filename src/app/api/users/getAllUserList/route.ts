import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getUsersUrl(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
  const url = new URL(`${baseUrl}/user/getAllUserList`)

  const searchKey = request.nextUrl.searchParams.get('searchKey')
  const size = request.nextUrl.searchParams.get('size')
  const offSet = request.nextUrl.searchParams.get('offSet')
  const block = request.nextUrl.searchParams.get('block')
  const pagination = request.nextUrl.searchParams.get('pagination')
  const isFilter = request.nextUrl.searchParams.get('isFilter')

  url.searchParams.set('searchKey', searchKey ?? '')
  url.searchParams.set('size', size ?? '50')
  url.searchParams.set('offSet', offSet ?? '0')
  url.searchParams.set('block', block ?? 'false')
  url.searchParams.set('pagination', pagination ?? 'true')
  url.searchParams.set('isFilter', isFilter ?? 'true')

  return url.toString()
}

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();

  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json(
      { message: 'Missing auth token.' },
      { status: 401 }
    )
  }

  try {
    const response = await fetch(getUsersUrl(request), {
      method: 'GET',
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
    const message = error instanceof Error ? error.message : 'Unable to fetch users.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

