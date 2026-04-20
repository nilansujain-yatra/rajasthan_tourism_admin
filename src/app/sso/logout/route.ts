import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTHENTICATION_TOKEN, SSO_TOKEN } from '@/lib/auth/constants'
import { AUTH_USER_STORAGE_KEY } from '@/lib/auth/client-session'
import { getSsoSignOutUrl } from '@/lib/auth/sso'

export const runtime = 'nodejs'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const ssoToken = cookieStore.get(SSO_TOKEN)?.value
  const responseInit = {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  }

  if (!ssoToken) {
    const response = NextResponse.redirect(new URL('/sso/login', request.url))
    response.cookies.delete(AUTHENTICATION_TOKEN)
    response.cookies.delete(SSO_TOKEN)
    return response
  }

  try {
    const signOutUrl = getSsoSignOutUrl()
    const response = new NextResponse(
      `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Signing out...</title></head>
  <body>
    <form id="sso-signout" method="post" action="${escapeHtml(signOutUrl)}">
      <input type="hidden" name="userdetails" value="${escapeHtml(ssoToken)}" />
    </form>
    <script>
      window.localStorage.removeItem("${escapeHtml(AUTH_USER_STORAGE_KEY)}");
      document.getElementById('sso-signout').submit();
    </script>
  </body>
</html>`,
      responseInit
    )

    response.cookies.delete(AUTHENTICATION_TOKEN)
    response.cookies.delete(SSO_TOKEN)

    return response
  } catch {
    const response = NextResponse.redirect(new URL('/sso/login', request.url))
    response.cookies.delete(AUTHENTICATION_TOKEN)
    response.cookies.delete(SSO_TOKEN)
    return response
  }
}
