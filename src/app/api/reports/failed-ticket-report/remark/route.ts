import { NextResponse } from 'next/server'
import { proxyOperatorBookingNextRequest } from '@/app/api/operator-booking/_shared'

export const runtime = 'nodejs'

function getBaseApiUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export async function POST(request: Request) {
  try {
    return await proxyOperatorBookingNextRequest(request, `${getBaseApiUrl()}/failTicket/addRemark`, 'POST')
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to submit remark.' },
      { status: 500 },
    )
  }
}

