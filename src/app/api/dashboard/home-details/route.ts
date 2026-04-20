import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

function getHomeDetailsUrl(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
  const url = new URL(`${baseUrl}/home/details`)

  url.searchParams.set('isFilter', 'true')

  const startDay = request.nextUrl.searchParams.get('startDay')
  const endDay = request.nextUrl.searchParams.get('endDay')

  if (startDay) {
    url.searchParams.set('startDay', startDay)
  }

  if (endDay) {
    url.searchParams.set('endDay', endDay)
  }

  return url.toString()
}

function getTokenFromExampleFile() {
  try {
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')
    const match = envExample.match(/^RAJASTHAN_API_TOKEN=(.+)$/m)

    return match?.[1]?.trim()
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  const authToken =
    cookies().get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    getTokenFromExampleFile()

  if (!authToken) {
    return NextResponse.json(
      { message: 'Missing RAJASTHAN_API_TOKEN environment variable.' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(getHomeDetailsUrl(request), {
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
    const message = error instanceof Error ? error.message : 'Unable to fetch dashboard data.'

    return NextResponse.json({ message }, { status: 500 })
  }
}
