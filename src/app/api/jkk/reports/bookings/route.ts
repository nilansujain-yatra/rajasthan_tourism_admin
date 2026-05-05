import type { NextRequest } from 'next/server'
import { proxyJkkGet } from '../../_helpers'

export async function GET(request: NextRequest) {
  return proxyJkkGet(request, '/jkk/reportForAll', 'Unable to fetch JKK booking report.')
}
