import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'

export const runtime = 'nodejs'

type UnknownRecord = Record<string, unknown>

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

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value as UnknownRecord).reduce<Record<string, number>>((record, [key, entry]) => {
    record[key] = asNumber(entry)
    return record
  }, {})
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizePlaceWiseReport(place: unknown) {
  const source = place && typeof place === 'object' ? (place as UnknownRecord) : {}

  return {
    ...source,
    placeName: typeof source.placeName === 'string' ? source.placeName : '',
    placeCode: typeof source.placeCode === 'string' ? source.placeCode : '',
    placeId: typeof source.placeId === 'string' ? source.placeId : '',
    totalVisitors: asNumber(source.totalVisitors),
    totalAmount: asNumber(source.totalAmount),
    totalBooking: asNumber(source.totalBooking),
    totalBookingsOnline: asNumber(source.totalBookingsOnline),
    totalBookingsOffline: asNumber(source.totalBookingsOffline),
    ticketTypeListDtos: asArray(source.ticketTypeListDtos),
    ticketHeads: asArray(source.ticketHeads),
    offlineTicketTypeListDtos: asArray(source.offlineTicketTypeListDtos),
    onlineTicketTypeListDtos: asArray(source.onlineTicketTypeListDtos),
    offlineTicketHeads: asArray(source.offlineTicketHeads),
    onlineTicketHeads: asArray(source.onlineTicketHeads),
  }
}

function normalizeHomeDetailsPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const source = payload as UnknownRecord
  const result = source.result && typeof source.result === 'object' ? (source.result as UnknownRecord) : {}

  return {
    ...source,
    result: {
      ...result,
      totalRecords: asNumber(result.totalRecords),
      totalVehicle: asNumber(result.totalVehicle),
      totalNotification: asNumber(result.totalNotification),
      noTicketsSold: asNumber(result.noTicketsSold),
      collectedAmount: asNumber(result.collectedAmount),
      totalUsers: asNumber(result.totalUsers),
      noOfRefunds: asNumber(result.noOfRefunds),
      totalBookingsOnline: asNumber(result.totalBookingsOnline),
      totalBookingsOffline: asNumber(result.totalBookingsOffline),
      offlineTotalTicketCount: asRecord(result.offlineTotalTicketCount),
      offlineTotalTicketAmount: asRecord(result.offlineTotalTicketAmount),
      onlineTotalTicketCount: asRecord(result.onlineTotalTicketCount),
      onlineTotalTicketAmount: asRecord(result.onlineTotalTicketAmount),
      totalTicketCount: asRecord(result.totalTicketCount),
      totalTicketAmount: asRecord(result.totalTicketAmount),
      totalVisitors: asNumber(result.totalVisitors),
      totalAmount: asNumber(result.totalAmount),
      placeWiseReports: asArray(result.placeWiseReports).map(normalizePlaceWiseReport),
    },
  }
}

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();

  const authToken =
    cookieStore.get(AUTHENTICATION_TOKEN)?.value ??
    process.env.RAJASTHAN_API_TOKEN ??
    getTokenFromExampleFile();

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
    const contentType = response.headers.get('content-type') ?? 'application/json'

    if (contentType.includes('application/json')) {
      try {
        return NextResponse.json(normalizeHomeDetailsPayload(JSON.parse(body)), {
          status: response.status,
        })
      } catch {
        // Fall through to preserve the upstream response body when parsing fails.
      }
    }

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch dashboard data.'

    return NextResponse.json({ message }, { status: 500 })
  }
}
