import type { NextRequest } from 'next/server'
import { proxyJkkPostBody } from '../../_helpers'

export async function POST(request: NextRequest) {
  return proxyJkkPostBody(request, '/jkk/updateBankDetails', 'Unable to update bank details.')
}
