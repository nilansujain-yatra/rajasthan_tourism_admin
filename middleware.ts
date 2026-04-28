import { NextResponse, type NextRequest } from 'next/server'
import { AUTHENTICATION_TOKEN, SSO_MODES } from '@/lib/auth/constants'

const PUBLIC_PATH_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/api',
  '/sso',
  '/redirect-user-by-role',
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function getSsoSignInUrl() {
  const mode = process.env.NEXT_PUBLIC_SSO_MODE
  const stageUrl = process.env.NEXT_PUBLIC_SSO_URL_STAGE
  const prodUrl = process.env.NEXT_PUBLIC_SSO_URL_PROD
  const baseUrl = (mode === SSO_MODES.STAGE ? stageUrl : prodUrl)?.replace(/\/+$/, '')

  if (!baseUrl) {
    return null
  }

  return `${baseUrl}/signin?ru=obmsadmin`
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const ssoToken = searchParams.get('token')

  if (ssoToken && pathname !== '/sso/callback' && pathname !== '/redirect-user-by-role') {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/sso/callback'
    return NextResponse.redirect(callbackUrl)
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const authToken = request.cookies.get(AUTHENTICATION_TOKEN)?.value

  if (authToken) {
    return NextResponse.next()
  }

  const signInUrl = getSsoSignInUrl()

  if (!signInUrl) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/sso/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
}
