import type { NextRequest } from 'next/server'
import { encodeQueryValue, proxyJkkPostQuery } from '../../_helpers'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const path = `/jkk/reviewBooking?bookingId=${encodeQueryValue(body.bookingId)}&status=${encodeQueryValue(body.status)}&remark=${encodeQueryValue(body.remark)}&moderatorId=${encodeQueryValue(body.moderatorId)}`
  return proxyJkkPostQuery(path, 'Unable to assign booking to moderator.')
}
