import type { NextRequest } from 'next/server'
import { encodeQueryValue, proxyJkkPostQuery } from '../../_helpers'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const path = `/jkk/moderatorBooking?bookingId=${encodeQueryValue(body.bookingId)}&status=${encodeQueryValue(body.status)}&remark=${encodeQueryValue(body.remark)}&approverId=${encodeQueryValue(body.approverId)}`
  return proxyJkkPostQuery(path, 'Unable to assign booking to approver.')
}
