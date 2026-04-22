import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTHENTICATION_TOKEN } from '@/lib/auth/constants'
import { decodeJwt } from '@/lib/auth/jwt'

export async function GET() {
    const cookieStore = await cookies();

  const authToken = cookieStore.get(AUTHENTICATION_TOKEN)?.value

  if (!authToken) {
    return NextResponse.json({ authenticated: false }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const user = decodeJwt(authToken)

  if (!user) {
    return NextResponse.json({ authenticated: false }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return NextResponse.json({
    authenticated: true,
    user,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
