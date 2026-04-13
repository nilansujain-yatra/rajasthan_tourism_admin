'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const navSections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',        icon: '📊', label: 'Dashboard' },
      { href: '/places',           icon: '🏯', label: 'Place Management' },
      { href: '/bookings',         icon: '📅', label: 'Bookings' },
      { href: '/bookings/kiosk',   icon: '🖥️', label: 'Kiosk Management' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/finance',          icon: '₹',  label: 'Total Amount' },
      { href: '/finance/risl',     icon: '📋', label: 'RISL Charge' },
      { href: '/finance/refunds',  icon: '↩️', label: 'Cancellation Refund' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/analytics',        icon: '📈', label: 'Analytics Report' },
      { href: '/reports/bookings', icon: '📑', label: 'Total Bookings' },
      { href: '/reports/audit',    icon: '🔍', label: 'Audit' },
    ],
  },
  {
    label: 'User & Logistics',
    items: [
      { href: '/users',            icon: '👤', label: 'User Management' },
      { href: '/operations/drivers',icon: '🚗', label: 'Driver Management' },
      { href: '/operations/guides', icon: '🧭', label: 'Guide Management' },
      { href: '/operations/vendors',icon: '🏪', label: 'Vendor Management' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/operations/feedback', icon: '💬', label: 'Feedback' },
      { href: '/operations/helpdesk', icon: '🛟', label: 'Help Desk' },
      { href: '/operations/content',  icon: '📝', label: 'Content Management' },
      { href: '/operations/terms',    icon: '📜', label: 'Terms & Conditions' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/system/logs',      icon: '📂', label: 'User Logs' },
      { href: '/system/server',    icon: '🖥️', label: 'Server Logs' },
      { href: '/system/payment',   icon: '💳', label: 'Payment Reverify' },
      { href: '/system/status',    icon: '🟢', label: 'Place Active Status' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSection = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))
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
      {/* Decorative top arc */}
      <div
        className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 80% 20%, var(--gold), transparent 60%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="flex items-center justify-center flex-shrink-0 text-lg rounded-full"
          style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            boxShadow: '0 2px 8px rgba(200,146,42,0.4)',
          }}
        >
          🏛️
        </div>
        <div>
          <div
            className="text-white font-serif font-bold leading-tight"
            style={{ fontSize: 13, letterSpacing: '0.3px' }}
          >
            Govt. of Rajasthan
          </div>
          <div className="text-white/50 font-light" style={{ fontSize: 10, marginTop: 1 }}>
            Booking Management System
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
        {navSections.map(section => {
          const isOpen = !collapsed[section.label]
          return (
            <div key={section.label} className="mb-1">
              {/* Section toggle */}
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

              {/* Items */}
              {isOpen && (
                <div>
                  {section.items.map(item => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/')
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

      {/* Footer */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center text-white rounded-full font-semibold flex-shrink-0"
            style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.12)', fontSize: 11 }}
          >
            BT
          </div>
          <div>
            <div className="text-white/80 font-medium" style={{ fontSize: 11 }}>BHARATTAILOR1408</div>
            <div className="text-white/40" style={{ fontSize: 9 }}>Operator</div>
          </div>
        </div>
      </div>

      {/* Bottom decorative arc */}
      <div
        className="absolute bottom-0 left-0 w-32 h-32 opacity-8 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 20% 100%, rgba(200,146,42,0.12), transparent 60%)',
        }}
      />
    </aside>
  )
}
