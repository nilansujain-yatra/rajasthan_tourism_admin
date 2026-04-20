import Link from 'next/link'
import { getSsoSignInUrl } from '@/lib/auth/sso'

type LoginPageProps = {
  searchParams?: {
    error?: string
  }
}

export default function SsoLoginPage({ searchParams }: LoginPageProps) {
  let signInUrl = ''
  let configError = ''

  try {
    signInUrl = getSsoSignInUrl()
  } catch (error) {
    configError = error instanceof Error ? error.message : 'Missing SSO configuration.'
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--cream)' }}>
      <div className="rounded-xl3 p-6" style={{ width: 420, background: '#fff', border: '1px solid var(--sand)' }}>
        <h1 className="font-serif font-bold mb-2" style={{ fontSize: 28, color: 'var(--maroon)' }}>
          Rajasthan Tourism Admin
        </h1>
        <p className="mb-5" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Sign in with Rajasthan SSO to continue.
        </p>

        {(searchParams?.error || configError) && (
          <div className="rounded-lg px-3 py-2 mb-4" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 12 }}>
            {searchParams?.error ?? configError}
          </div>
        )}

        {signInUrl ? (
          <Link
            href={signInUrl}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium text-white"
            style={{ background: 'var(--maroon)', fontSize: 13 }}
          >
            Sign in with SSO
          </Link>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Add `NEXT_PUBLIC_SSO_MODE`, `NEXT_PUBLIC_SSO_URL_STAGE`, and `NEXT_PUBLIC_SSO_URL_PROD` to your environment.
          </div>
        )}
      </div>
    </main>
  )
}
