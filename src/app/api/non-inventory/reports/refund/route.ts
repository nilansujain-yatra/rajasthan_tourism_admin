import type { NextRequest } from 'next/server'
import { proxyReportGet } from '../_helpers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyReportGet(
    request,
    '/reports_V2/refundBooking-Details_V2',
    'Unable to fetch non-inventory refund report.',
  )
}
