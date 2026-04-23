import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTHENTICATION_TOKEN, SSO_TOKEN } from '@/lib/auth/constants'
import { getSsoSignOutUrl } from '@/lib/auth/sso'

export const runtime = 'nodejs'

async function postToSsoSignOut(ssoToken?: string) {
  if (!ssoToken) {
    return
  }

  try {
    const form = new URLSearchParams()
    form.set('userdetails', ssoToken)

    await fetch(getSsoSignOutUrl(), {
      method: 'POST',
      body: form,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      cache: 'no-store',
    })
  } catch {
    // Local logout should still complete if the external SSO signout call fails.
  }
}

export async function POST() {
  const cookieStore = await cookies()
  const ssoToken = cookieStore.get(SSO_TOKEN)?.value

  await postToSsoSignOut(ssoToken)

  const response = NextResponse.json({ ok: true })

  response.cookies.delete(AUTHENTICATION_TOKEN)
  response.cookies.delete(SSO_TOKEN)

  return response
}
