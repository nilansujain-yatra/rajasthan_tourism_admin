'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { BellRing, Mail, MapPin, ShieldCheck, UserRound } from 'lucide-react'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'

function getUserText(user: AuthUser | null, fields: string[], fallback = 'N/A') {
  for (const field of fields) {
    const value = user?.[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function getBooleanFlag(value: unknown) {
  return value === true ? 'Enabled' : 'Disabled'
}

function formatEpochSeconds(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A'
  return new Date(value * 1000).toLocaleString('en-IN')
}

function prettifyKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, match => match.toUpperCase())
}

export default function OperatorInformationPage() {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedAuthUser())

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        if (!response.ok) throw new Error('Unable to load session.')

        const payload = await response.json() as { user?: AuthUser | null }
        if (!active) return

        const nextUser = payload.user ?? null
        setUser(nextUser)
        writeCachedAuthUser(nextUser)
      } catch {
        if (!active) return
        setUser(null)
        clearCachedAuthUser()
      }
    }

    loadSession()
    return () => { active = false }
  }, [])

  const placeNames = useMemo(() => {
    if (!user) return []
    if (typeof user.placeName === 'string' && user.placeName.trim()) {
      return user.placeName.split(',').map(item => item.trim()).filter(Boolean)
    }
    return []
  }, [user])

  const availableMeta = useMemo(() => {
    if (!user) return []

    return Object.entries(user)
      .filter(([key, value]) => !['email', 'ssoid', 'placeId', 'placeName', 'userType', 'userRole', 'sub', 'iat', 'exp', 'onSiteBooking', 'isDepartmentAdmin', 'entryVerification', 'exitVerification'].includes(key) && value !== undefined && value !== null && value !== '')
      .slice(0, 12)
  }, [user])

  const identityCards = [
    { label: 'Display Name', value: getUserText(user, ['name', 'displayName', 'fullName', 'userName', 'username']), icon: UserRound },
    { label: 'SSO ID', value: getUserText(user, ['ssoid', 'ssoId']), icon: ShieldCheck },
    { label: 'Email', value: getUserText(user, ['email']), icon: Mail },
    { label: 'User Type', value: getUserText(user, ['designation', 'userType', 'userRole', 'role']), icon: ShieldCheck },
  ]

  const accessCards = [
    { label: 'Assigned Place', value: getUserText(user, ['placeName']) },
    { label: 'Department Booking', value: getBooleanFlag(user?.isDepartmentAdmin) },
    { label: 'On-site Booking', value: getBooleanFlag(user?.onSiteBooking) },
    { label: 'Entry Verification', value: getBooleanFlag(user?.entryVerification) },
    { label: 'Exit Verification', value: getBooleanFlag(user?.exitVerification) },
    { label: 'Session Expires', value: formatEpochSeconds(user?.exp) },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter">
          <div className="space-y-6 px-6 py-6">
            <div className="overflow-hidden rounded-[30px] text-white" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}>
        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11 }}>
              <BellRing size={13} />
              Operator profile and access information
            </div>
            <h1 className="mt-3 font-serif text-3xl font-bold">Informations</h1>
            <p className="mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>
              This screen mirrors the operator information flow from the recent project and surfaces the maximum available profile, gate and booking permissions from the current session.
            </p>
          </div>
        </div>

        <div className="grid gap-px md:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
          {[
            { label: 'User', value: getUserText(user, ['name', 'displayName', 'userName', 'ssoid']) },
            { label: 'Places', value: String(placeNames.length) },
            { label: 'Entry Gate', value: getBooleanFlag(user?.entryVerification) },
            { label: 'Exit Gate', value: getBooleanFlag(user?.exitVerification) },
          ].map(card => (
            <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{card.label}</div>
              <div className="mt-1 font-semibold" style={{ fontSize: 18, color: '#fff' }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
            <UserRound size={18} />
          </div>
          <div>
            <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Operator Identity</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Profile details available from the active authenticated session.</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {identityCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                <div className="inline-flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Icon size={13} style={{ color: 'var(--maroon)' }} />
                  {card.label}
                </div>
                <div className="mt-3" style={{ fontSize: 15, color: 'var(--text-dark)', fontWeight: 700 }}>{card.value}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(200,146,42,0.10)', color: '#C8922A' }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Access & Permissions</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Operator-side booking, verification and session capabilities.</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accessCards.map(card => (
            <div key={card.label} className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
              <div className="mt-3" style={{ fontSize: 15, color: 'var(--text-dark)', fontWeight: 700 }}>{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="font-serif font-bold mb-4" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Assigned Places</div>
            <div className="space-y-3">
              {(placeNames.length ? placeNames : ['No mapped place names']).map(place => (
                <div key={place} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--sand)', background: '#F8F4EE' }}>
                  <div className="inline-flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>
                    <MapPin size={14} style={{ color: 'var(--maroon)' }} />
                    {place}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-serif font-bold mb-4" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Session Metadata</div>
            <div className="space-y-3">
              {[
                { label: 'Subject ID', value: getUserText(user, ['sub']) },
                { label: 'Issued At', value: formatEpochSeconds(user?.iat) },
                { label: 'Expires At', value: formatEpochSeconds(user?.exp) },
                { label: 'Place Name', value: getUserText(user, ['placeName']) },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--sand)', background: '#F8F4EE' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                  <div className="mt-2" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {availableMeta.length ? (
        <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
          <div className="font-serif font-bold mb-4" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Additional Available Data</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableMeta.map(([key, value]) => (
              <div key={key} className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{prettifyKey(key)}</div>
                <div className="mt-3 break-words" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  </main>
</div>
</div>
)
}
