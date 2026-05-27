import type { NextRequest } from 'next/server'
import { getBaseApiUrl, proxyOperatorBookingNextRequest, proxyOperatorBookingRequest } from '@/app/api/operator-booking/_shared'

export function buildSettingsUrl(path: string, request: NextRequest) {
  const url = new URL(`${getBaseApiUrl()}${path}`)

  request.nextUrl.searchParams.forEach((value, key) => {
    if (value.trim()) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

export function proxySettingsGet(path: string, request: NextRequest) {
  return proxyOperatorBookingRequest(buildSettingsUrl(path, request), { method: 'GET' })
}

export function proxySettingsDelete(path: string, request: NextRequest) {
  return proxyOperatorBookingRequest(buildSettingsUrl(path, request), { method: 'DELETE' })
}

export function proxySettingsPutWithQuery(path: string, request: NextRequest) {
  return proxyOperatorBookingRequest(buildSettingsUrl(path, request), { method: 'PUT' })
}

export function proxySettingsPost(path: string, request: NextRequest) {
  return proxyOperatorBookingNextRequest(request, `${getBaseApiUrl()}${path}`, 'POST')
}

export function proxySettingsPut(path: string, request: NextRequest) {
  return proxyOperatorBookingNextRequest(request, `${getBaseApiUrl()}${path}`, 'PUT')
}
