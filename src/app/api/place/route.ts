import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getPlaceUrl(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
  const url = new URL(`${baseUrl}/place`)

  const districtId = request.nextUrl.searchParams.get('districtId')
  const searchKey = request.nextUrl.searchParams.get('searchKey')
  const deptList = request.nextUrl.searchParams.get('deptList')
  const size = request.nextUrl.searchParams.get('size')

  url.searchParams.set('districtId', districtId ?? '')
  url.searchParams.set('searchKey', searchKey ?? '')
  url.searchParams.set('deptList', deptList ?? '')
  url.searchParams.set('size', size ?? '2000')

  return url.toString()
}

export async function GET(request: NextRequest) {
  const authToken =
    cookies().get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    process.env.NEXT_PUBLIC_LOGIN_TOKEN

  if (!authToken) {
    return NextResponse.json(
      { message: 'Missing auth token environment variable.' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(getPlaceUrl(request), {
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
    const message = error instanceof Error ? error.message : 'Unable to fetch places.'
    return NextResponse.json({ message }, { status: 500 })
  }
}

