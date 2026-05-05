import type { NextRequest } from 'next/server'
import { encodeQueryValue, proxyJkkPostQuery } from '../../_helpers'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const path = `/jkk/assignBooking?bookingId=${encodeQueryValue(body.bookingId)}&status=${encodeQueryValue(body.status)}&remark=${encodeQueryValue(body.remark)}&fileUrl=${encodeQueryValue(body.fileUrl)}&reviewerId=${encodeQueryValue(body.reviewerId)}&reopen=false`
  return proxyJkkPostQuery(path, 'Unable to assign booking to reviewer.')
}
