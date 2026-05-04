import type { NextRequest } from 'next/server'
import { proxyReportGet } from '../_helpers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyReportGet(
    request,
    '/reports_V2/ticket-type/place-report/V2',
    'Unable to fetch non-inventory day-wise report.',
  )
}
