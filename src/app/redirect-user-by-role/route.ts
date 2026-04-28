import { NextResponse, type NextRequest } from 'next/server'
import { ALL_OBMS_USER_TYPES, AUTHENTICATION_TOKEN, SSO_TOKEN } from '@/lib/auth/constants'
import { decodeJwt, getJwtMaxAgeSeconds } from '@/lib/auth/jwt'

export const runtime = 'nodejs'

function getRedirectPath(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirectTo')

  if (redirectTo?.startsWith('/')) {
    return redirectTo
  }

  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const authToken = request.nextUrl.searchParams.get('token')
  const ssoToken = request.nextUrl.searchParams.get('ssoToken')

  if (!authToken) {
    return NextResponse.redirect(new URL('/sso/login', request.url))
  }

  const userData = decodeJwt(authToken)

  if (!userData?.userType || !ALL_OBMS_USER_TYPES.includes(userData.userType as typeof ALL_OBMS_USER_TYPES[number])) {
    const loginUrl = new URL('/sso/login', request.url)
    loginUrl.searchParams.set('error', 'You are not authorised to access this website. Please login with correct account.')

    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.redirect(new URL(getRedirectPath(request), request.url))
  const maxAge = getJwtMaxAgeSeconds(userData)
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    // secure: process.env.NODE_ENV === 'production',
    secure:false,
    maxAge,
    path: '/',
  }

  response.cookies.set(AUTHENTICATION_TOKEN, authToken, cookieOptions)

  if (ssoToken) {
    response.cookies.set(SSO_TOKEN, ssoToken, cookieOptions)
  }

  return response
}
