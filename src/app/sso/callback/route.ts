import { NextResponse, type NextRequest } from 'next/server'
import { ALL_OBMS_USER_TYPES, AUTHENTICATION_TOKEN, SSO_TOKEN } from '@/lib/auth/constants'
import { decodeJwt, getJwtMaxAgeSeconds } from '@/lib/auth/jwt'
import { exchangeSsoToken, getSsoSignInUrl } from '@/lib/auth/sso'

export const runtime = 'nodejs'

function getRedirectPath(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirectTo')

  if (redirectTo?.startsWith('/')) {
    return redirectTo
  }

  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const ssoToken = request.nextUrl.searchParams.get('token')

  if (!ssoToken) {
    return NextResponse.redirect(new URL('/sso/login', request.url))
  }

  try {
    const authResult = await exchangeSsoToken(ssoToken)
    const authToken = authResult.token

    if (!authToken) {
      throw new Error('SSO authentication did not return an auth token.')
    }

    const userData = decodeJwt(authToken)

    if (!userData?.userType || !ALL_OBMS_USER_TYPES.includes(userData.userType as typeof ALL_OBMS_USER_TYPES[number])) {
      return NextResponse.redirect(getSsoSignInUrl())
    }

    const response = NextResponse.redirect(new URL(getRedirectPath(request), request.url))
    const maxAge = getJwtMaxAgeSeconds(userData)
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      path: '/',
    }

    response.cookies.set(AUTHENTICATION_TOKEN, authToken, cookieOptions)
    response.cookies.set(SSO_TOKEN, ssoToken, cookieOptions)

    return response
  } catch (error) {
    const errorUrl = new URL('/sso/login', request.url)
    errorUrl.searchParams.set(
      'error',
      error instanceof Error ? error.message : 'Unable to complete SSO login.'
    )

    return NextResponse.redirect(errorUrl)
  }
}
