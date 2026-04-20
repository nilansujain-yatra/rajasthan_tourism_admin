'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Bell, LogOut, Printer, SlidersHorizontal } from 'lucide-react'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'

const pageTitles: Record<string, string> = {
  '/dashboard':              'Dashboard Overview',
  '/dashboardMonthWise':     'Dashboard Month Wise',
  '/places':                 'Place Management',
  '/bookings':               'Bookings',
  '/bookings/kiosk':         'Kiosk Management',
  '/finance':                'Finance — Total Amount',
  '/finance/risl':           'Finance — RISL Charge',
  '/finance/refunds':        'Cancellation Refunds',
  '/analytics':              'Analytics Report',
  '/reports/bookings':       'Total Bookings Report',
  '/reports/audit':          'Audit Log',
  '/users':                  'User Management',
  '/operations/drivers':     'Driver Management',
  '/operations/guides':      'Guide Management',
  '/operations/vendors':     'Vendor Management',
  '/operations/feedback':    'Feedback Management',
  '/operations/helpdesk':    'Help Desk',
  '/operations/content':     'Content Management',
  '/operations/menu':         'Menu Managment',
  '/operations/terms':       'Terms & Conditions',
  '/system/logs':            'User Logs',
  '/system/server':          'Server Logs',
  '/system/payment':         'Payment Reverify',
  '/system/status':          'Place Active Status',
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

export default function Topbar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? (pathname.startsWith('/places/') ? 'Place Details' : 'Admin Portal')
  const dateStr = getNowString()
  const [user, setUser] = useState<AuthUser | null>(() => readCachedAuthUser())
  const initials = useMemo(() => getInitials(user), [user])

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      try {
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
    clearCachedAuthUser()
    window.location.assign('/sso/logout')
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
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 300 }}>
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
        <button
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
        </button>

        {/* Filter */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors text-white"
          style={{
            background: 'var(--maroon)',
            border: '1px solid var(--maroon)',
            fontSize: 12,
          }}
        >
          <SlidersHorizontal size={13} />
          Filter
        </button>

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
