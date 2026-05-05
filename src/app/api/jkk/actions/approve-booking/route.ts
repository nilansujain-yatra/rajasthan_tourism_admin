import type { NextRequest } from 'next/server'
import { encodeQueryValue, proxyJkkPostQuery } from '../../_helpers'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const path = `/jkk/approveBooking?bookingId=${encodeQueryValue(body.bookingId)}&status=${encodeQueryValue(body.status)}&remark=${encodeQueryValue(body.remark)}&reopen=false`
  return proxyJkkPostQuery(path, 'Unable to update booking approval.')
}
