'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, LogOut, Printer, SlidersHorizontal } from 'lucide-react'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'
import { getAccessRole } from '@/lib/auth/access'

const pageTitles: Record<string, string> = {
  '/dashboard':              'Dashboard Overview',
  '/dashboardMonthWise':     'Dashboard Month Wise',
  '/places':                 'Place Management',
  '/bookings':               'Bookings',
  '/bookings/operator':      'Ticket Booking',
  '/bookings/composite':     'Composite Ticket',
  '/operator/reports':       'Report',
  '/operator/information':   'Informations',
  '/operator/verification':  'Verification',
  '/operations/service-head':'Service / Head Management',
  '/finance':                'Finance — Total Amount',
  '/finance/risl':           'Finance — RISL Charge',
  '/finance/refunds':        'Cancellation Refunds',
  '/analytics':              'Analytics Report',
  '/reports/failed-ticket-report': 'Failed Ticket Report',
  '/reports/jkk':            'JKK Report',
  '/reports/non-inventory':  'Non-Inventory Reports',
  '/reports/bookings':       'Total Bookings Report',
  '/users':                  'User Management',
  '/operations/drivers':     'Driver Management',
  '/operations/guides':      'Guide Management',
  '/operations/vendors':     'Vendor Management',
  '/operations/feedback':    'Feedback Management',
  '/operations/helpdesk':    'Help Desk',
  '/operations/content':     'Content Management',
  '/operations/menu':         'Menu Managment',
  '/operations/cancellation-policy': 'Cancellation Policy',
  '/operations/terms':       'Terms & Conditions',
  '/system/logs':            'User Logs',
  '/system/server':          'Server Logs',
  '/system/payment':         'Payment Reverify',
  '/system/status':          'Place Active Status',
  '/system/helpdesk-issue-type': 'Helpdesk Issue Type',
}

function getNowString() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getUserText(user: AuthUser | null, fields: string[]) {
  for (const field of fields) {
    const value = user?.[field]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function getDisplayName(user: AuthUser | null) {
  return getUserText(user, ['name', 'displayName', 'fullName', 'userName', 'username', 'ssoid', 'email']) ?? 'Admin User'
}

function getRoleLabel(user: AuthUser | null) {
  return getUserText(user, ['designation', 'userType', 'userRole', 'role']) ?? 'Signed in'
}

function getInitials(user: AuthUser | null) {
  const name = getDisplayName(user)
  return name
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AU'
}

function shouldForceLogout(status: number, payload: unknown) {
  if (status === 401 || status === 403) return true
  if (!payload || typeof payload !== 'object') return false

  const message = (payload as { message?: unknown }).message
  if (typeof message !== 'string') return false

  const normalized = message.trim().toLowerCase()
  return normalized.includes('missing auth token environment variable')
    || normalized.includes('missing auth token')
    || normalized.includes('unauthorized')
    || normalized.includes('auth expire')
    || normalized.includes('authentication failed')
}

export default function Topbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dateStr = getNowString()
const [user, setUser] = useState<AuthUser | null>(null)
const [mounted, setMounted] = useState(false)
const logoutTriggeredRef = useRef(false)

 useEffect(() => {
  setMounted(true)
}, [])

  const initials = useMemo(() => getInitials(user), [user])
  const title = useMemo(() => {
    if (pathname === '/bookings') {
      const tab = searchParams.get('tab')?.toLowerCase()

      if (tab === 'composite') {
        return 'Composite Ticket'
      }

      if (getAccessRole(user) === 'operator' || tab === 'inventory') {
        return 'Ticket Booking'
      }
    }

    if (pathname === '/bookings/operator') {
      return 'Ticket Booking'
    }

    if (pathname === '/bookings/composite') {
      return 'Composite Ticket'
    }

    if (pathname === '/reports/inventory' && searchParams.get('report')?.toLowerCase() === 'mis') {
      return getAccessRole(user) === 'operator' ? 'Report' : 'Inventory Reports'
    }

    if (pathname === '/operator/reports') {
      return 'Report'
    }

    if (pathname === '/operations/terms' && getAccessRole(user) === 'operator') {
      return 'Informations'
    }

    if (pathname === '/operations/vendors' && getAccessRole(user) === 'operator') {
      return 'Verification'
    }

    if (pathname === '/operator/information') {
      return 'Informations'
    }

    if (pathname === '/operator/verification') {
      return 'Verification'
    }

    if (pathname === '/system/logs' && getAccessRole(user) === 'operator') {
      return 'Audit'
    }

    return pageTitles[pathname] ?? (pathname.startsWith('/places/') ? 'Place Details' : 'Admin Portal')
  }, [pathname, searchParams, user])

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      try {
        const cachedUser = readCachedAuthUser()
        if (isMounted) {
          setUser(cachedUser)
        }

        const response = await fetch('/api/auth/session', {
          headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
          if (isMounted) {
            setUser(null)
          }
          clearCachedAuthUser()
          return
        }

        const payload = await response.json() as { user?: AuthUser }

        if (isMounted) {
          const sessionUser = payload.user ?? null

          setUser(sessionUser)
          writeCachedAuthUser(sessionUser)
        }
      } catch {
        if (isMounted) {
          setUser(null)
          clearCachedAuthUser()
        }
      }
    }

    loadSession()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    if (logoutTriggeredRef.current) return
    logoutTriggeredRef.current = true
    clearCachedAuthUser()
    window.location.assign('/sso/logout')
  }

  useEffect(() => {
    if (!mounted) return
    if (pathname.startsWith('/sso')) return

    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init)

      try {
        const requestUrl = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url

        const isApiRequest = requestUrl.startsWith('/api/')
          || requestUrl.startsWith(window.location.origin + '/api/')

        if (!isApiRequest || logoutTriggeredRef.current) {
          return response
        }

        const payload = await response.clone().json().catch(() => null)
        if (shouldForceLogout(response.status, payload)) {
          void handleLogout()
        }
      } catch {
        // Ignore response parsing issues and allow normal page flow.
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [mounted, pathname])

  if (!mounted) {
  return null
}

  return (
    <header
      className="flex items-center justify-between flex-shrink-0 px-7"
      style={{
        height: 62,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--sand)',
        boxShadow: '0 1px 0 var(--sand)',
      }}
    >
      {/* Left: date + title */}
      <div>
        <div suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 300 }}>
          {dateStr}
        </div>
        <h1
          className="font-serif font-bold leading-none"
          style={{ fontSize: 22, color: 'var(--text-dark)', marginTop: 1 }}
        >
          {title}
        </h1>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-3">
        {/* Print */}
        {/* <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: 'var(--cream-dark)',
            border: '1px solid var(--sand)',
            color: 'var(--text-mid)',
            fontSize: 12,
          }}
        >
          <Printer size={13} />
          Print
        </button> */}

        {/* Filter */}
        {/* <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors text-white"
          style={{
            background: 'var(--maroon)',
            border: '1px solid var(--maroon)',
            fontSize: 12,
          }}
        >
          <SlidersHorizontal size={13} />
          Filter
        </button> */}

        {/* Notification bell */}
        <div className="relative cursor-pointer p-1.5">
          <Bell size={18} style={{ color: 'var(--text-muted)' }} />
          <span
            className="absolute top-0.5 right-0.5 rounded-full border-2 border-white"
            style={{ width: 8, height: 8, background: '#E53E3E' }}
          />
        </div>

        {/* Divider */}
        <div className="w-px h-7" style={{ background: 'var(--sand)' }} />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-full text-white font-semibold"
            style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))',
              fontSize: 12,
              boxShadow: '0 2px 6px rgba(139,26,26,0.3)',
            }}
          >
            {initials}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div className="font-semibold" style={{ fontSize: 12, color: 'var(--text-dark)' }}>
              {getDisplayName(user)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{getRoleLabel(user)}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center rounded-lg transition-colors"
            title="Logout"
            style={{
              width: 32,
              height: 32,
              background: 'var(--cream-dark)',
              border: '1px solid var(--sand)',
              color: 'var(--maroon)',
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
