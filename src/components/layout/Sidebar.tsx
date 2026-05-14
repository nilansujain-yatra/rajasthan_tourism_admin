'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'
import { getSidebarSectionsForUser, type NavItem } from '@/lib/navigation/sidebar'

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
  return getDisplayName(user)
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AU'
}

function isItemActive(pathname: string, searchParams: { get: (key: string) => string | null }, item: NavItem) {
  const matchPath = item.matchPath ?? item.href.split('?')[0]
  const pathMatches = pathname === matchPath || pathname.startsWith(`${matchPath}/`)

  if (!pathMatches) {
    return false
  }

  if (!item.matchQuery) {
    return true
  }

  return Object.entries(item.matchQuery).every(([key, value]) => {
    return searchParams.get(key)?.toLowerCase() === value.toLowerCase()
  })
}

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
const [user, setUser] = useState<AuthUser | null>(null)
const [mounted, setMounted] = useState(false)
const initials = useMemo(() => getInitials(user), [user])
const navSections = useMemo(() => getSidebarSectionsForUser(user), [user])

  const toggleSection = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))
  }

  useEffect(() => {
  setMounted(true)
}, [])

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

  if (!mounted) {
  return null
}
  return (
    <aside
      className="sidebar-pattern flex flex-col flex-shrink-0 relative overflow-hidden"
      style={{
        width: 'var(--sidebar-w)',
        background: 'linear-gradient(180deg, #6B1212 0%, #8B1A1A 40%, #7A1616 100%)',
        minHeight: '100vh',
      }}
    >
      <div
        className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 80% 20%, var(--gold), transparent 60%)',
        }}
      />

      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="flex items-center justify-center flex-shrink-0 text-lg rounded-full"
          style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            boxShadow: '0 2px 8px rgba(200,146,42,0.4)',
          }}
        >
          {'🏛️'}
        </div>
        <div>
          <div
            className="text-white font-serif font-bold leading-tight"
            style={{ fontSize: 13, letterSpacing: '0.3px' }}
          >
            Govt. of Rajasthan
          </div>
          <div className="text-white/50 font-light" style={{ fontSize: 8, marginTop: 1 }}>
            Online Booking Management System
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
        {navSections.map(section => {
          const isOpen = !collapsed[section.label]
          return (
            <div key={section.label} className="mb-1">
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-5 py-2 group"
              >
                <span
                  className="font-semibold tracking-widest uppercase"
                  style={{ fontSize: 9, color: 'rgba(200,146,42,0.65)' }}
                >
                  {section.label}
                </span>
                <ChevronDown
                  size={11}
                  className="transition-transform duration-200 text-white/30"
                  style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                />
              </button>

              {isOpen && (
                <div>
                  {section.items.map(item => {
                    const active = isItemActive(pathname, searchParams, item)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          'flex items-center gap-2.5 px-5 py-2 text-xs font-normal transition-all duration-150 relative',
                          active
                            ? 'sb-active-glow text-gold-light bg-gold/10'
                            : 'text-white/60 hover:text-white hover:bg-white/6',
                        )}
                        style={{
                          fontSize: 12,
                          color: active ? 'var(--gold-light)' : undefined,
                          background: active ? 'rgba(200,146,42,0.12)' : undefined,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{item.icon}</span>
                        <span>{item.label}</span>
                        {active && (
                          <span
                            className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
                            style={{ background: 'var(--gold-light)' }}
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center text-white rounded-full font-semibold flex-shrink-0"
            style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.12)', fontSize: 11 }}
          >
            {initials}
          </div>
          <div>
            <div className="text-white/80 font-medium" style={{ fontSize: 11 }}>{getDisplayName(user)}</div>
            <div className="text-white/40" style={{ fontSize: 9 }}>{getRoleLabel(user)}</div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 w-32 h-32 opacity-8 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 20% 100%, rgba(200,146,42,0.12), transparent 60%)',
        }}
      />
    </aside>
  )
}
