import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getPlaceUrl(request: NextRequest) {
  const baseUrl = 'http://10.70.235.179:30204/rajasthan/api/v1'
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/place`)

  const offSet = request.nextUrl.searchParams.get('offSet') ?? request.nextUrl.searchParams.get('offset')
  const size = request.nextUrl.searchParams.get('size')
  const exportValue = request.nextUrl.searchParams.get('export')
  const searchKey = request.nextUrl.searchParams.get('searchKey')
  const deptList = request.nextUrl.searchParams.get('deptList')
  const divisionList = request.nextUrl.searchParams.get('divisionList')
  const districtList = request.nextUrl.searchParams.get('districtList') ?? request.nextUrl.searchParams.get('districtId')
  const categoryList = request.nextUrl.searchParams.get('categoryList')
  const statusList = request.nextUrl.searchParams.get('statusList')

  url.searchParams.set('offSet', offSet ?? '0')
  url.searchParams.set('size', size ?? '2000')
  url.searchParams.set('export', exportValue ?? 'false')
  url.searchParams.set('searchKey', searchKey ?? '')
  url.searchParams.set('deptList', deptList ?? '')
  url.searchParams.set('divisionList', divisionList ?? '')
  url.searchParams.set('districtList', districtList ?? '')
  url.searchParams.set('categoryList', categoryList ?? '')
  url.searchParams.set('statusList', statusList ?? '')

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

