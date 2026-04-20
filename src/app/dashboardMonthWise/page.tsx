'use client'

import { useState, useMemo } from 'react'
import { Filter, X, ChevronDown, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import SectionHeader from '@/components/ui/SectionHeader'
import DashboardMonthWiseView from './DashboardMonthWiseView'

export default DashboardMonthWiseView

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricCard {
  key:      string
  label:    string
  value:    number
  prefix?:  string          // '₹' for currency
  suffix?:  string
  icon:     string
  group:    'visitors' | 'revenue' | 'risl' | 'emitra' | 'charges' | 'fees'
  trend?:   number          // % change vs prev month, optional
}

// ─── Group config ─────────────────────────────────────────────────────────────

const GROUP_META: Record<string, { label: string; color: string; bg: string; borderColor: string }> = {
  visitors: { label: 'Visitor Counts',      color: '#1A7A6E', bg: 'rgba(26,122,110,0.07)',  borderColor: 'rgba(26,122,110,0.2)'  },
  revenue:  { label: 'Bookings & Revenue',  color: '#8B1A1A', bg: 'rgba(139,26,26,0.07)',   borderColor: 'rgba(139,26,26,0.2)'   },
  risl:     { label: 'RISL Charges',        color: '#6B1212', bg: 'rgba(107,18,18,0.07)',   borderColor: 'rgba(107,18,18,0.2)'   },
  emitra:   { label: 'Emitra Commission',   color: '#C8922A', bg: 'rgba(200,146,42,0.08)',  borderColor: 'rgba(200,146,42,0.25)' },
  charges:  { label: 'Dept. Charges',       color: '#5A3A1A', bg: 'rgba(90,58,26,0.07)',    borderColor: 'rgba(90,58,26,0.2)'    },
  fees:     { label: 'Fees & Development',  color: '#8B1A1A', bg: 'rgba(139,26,26,0.07)',   borderColor: 'rgba(139,26,26,0.2)'   },
}

// ─── Default month data (from PDF — April 2026) ───────────────────────────────

const DATA_APR_2026: MetricCard[] = [
  // Visitor counts
  { key: 'foreignStudents',    label: 'Foreign Students',                        value: 36,         icon: '🎒', group: 'visitors', trend: -12 },
  { key: 'indianStudent',      label: 'Indian Student',                          value: 1409,       icon: '🎓', group: 'visitors', trend: 8   },
  { key: 'divyangCitizen',     label: 'Divyang Citizen',                         value: 0,          icon: '♿', group: 'visitors', trend: 0   },
  { key: 'foreignCitizen',     label: 'Foreign Citizen',                         value: 1003,       icon: '🌍', group: 'visitors', trend: 15  },
  { key: 'totalVisitors',      label: 'Total Visitors',                          value: 8908,       prefix: '₹', icon: '👥', group: 'revenue',  trend: 6 },
  { key: 'totalBookings',      label: 'Total Bookings',                          value: 2644,       prefix: '₹', icon: '📅', group: 'revenue',  trend: 4 },
  // RISL
  { key: 'rislForest',         label: 'RISL Charges For Forest',                 value: 3460,       prefix: '₹', icon: '🌳', group: 'risl',     trend: 2  },
  { key: 'rislArch',           label: 'RISL Charges For Arch',                   value: 37812.74,   prefix: '₹', icon: '🏛️', group: 'risl',     trend: 5  },
  { key: 'rislJda',            label: 'RISL JDA',                                value: 55.25,      prefix: '₹', icon: '🏢', group: 'risl',     trend: 0  },
  // Emitra
  { key: 'rtdcEmitra',         label: 'RTDC Emitra Commission Charges',          value: 195,        prefix: '₹', icon: '🏨', group: 'emitra',   trend: -3 },
  { key: 'emitraForest',       label: 'Emitra Commission From Forest',           value: 4483,       prefix: '₹', icon: '🌿', group: 'emitra',   trend: 9  },
  { key: 'emitraArch',         label: 'Emitra Commission From Arch',             value: 14881,      prefix: '₹', icon: '🏯', group: 'emitra',   trend: 7  },
  // Charges
  { key: 'museumOtherJaipur',  label: 'Museum Charges Head Other Than Jaipur',  value: 9588.91,    prefix: '₹', icon: '🖼️',  group: 'charges',  trend: 3  },
  { key: 'monumentsDept',      label: 'Monuments & Museum Department Charge',   value: 1463007,    prefix: '₹', icon: '🏛️', group: 'charges',  trend: 11 },
  // Fees
  { key: 'developmentFee',     label: 'Development Fee',                         value: 50814,      prefix: '₹', icon: '🔧', group: 'fees',     trend: 4  },
  { key: 'entryFee',           label: 'Entry Fee',                               value: 56950,      prefix: '₹', icon: '🎫', group: 'fees',     trend: 6  },
]

// ─── Months available ─────────────────────────────────────────────────────────

const MONTHS = [
  { val: '2026-04', label: 'April 2026'     },
  { val: '2026-03', label: 'March 2026'     },
  { val: '2026-02', label: 'February 2026'  },
  { val: '2026-01', label: 'January 2026'   },
  { val: '2025-12', label: 'December 2025'  },
  { val: '2025-11', label: 'November 2025'  },
]

function formatMonthLabel(val: string) {
  const [y, m] = val.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number, prefix?: string) {
  if (!prefix) return v.toLocaleString('en-IN')
  if (Number.isInteger(v)) return `${prefix}${v.toLocaleString('en-IN')}.00`
  return `${prefix}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, background: 'rgba(154,122,90,0.1)', color: '#9A7A5A' }}>
      <Minus size={9} /> 0%
    </span>
  )
  if (pct > 0) return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}>
      <TrendingUp size={9} /> +{pct}%
    </span>
  )
  return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, background: 'rgba(229,62,62,0.1)', color: '#E53E3E' }}>
      <TrendingDown size={9} /> {pct}%
    </span>
  )
}

// ─── Individual metric card ───────────────────────────────────────────────────

function MetricCardUI({ card }: { card: MetricCard }) {
  const gm  = GROUP_META[card.group]
  const isEmpty = card.value === 0

  return (
    <div
      className="rounded-xl overflow-hidden card-lift flex flex-col"
      style={{
        background: '#fff',
        border: `1px solid ${gm.borderColor}`,
        minHeight: 120,
      }}
    >
      {/* Colour top strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${gm.color}, ${gm.color}66)` }} />

      <div className="flex flex-col flex-1 px-5 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 32, height: 32, background: gm.bg, fontSize: 15 }}
            >
              {card.icon}
            </span>
            <span
              className="font-semibold uppercase leading-tight"
              style={{ fontSize: 10, color: gm.color, letterSpacing: '0.8px', maxWidth: 160 }}
            >
              {card.label}
            </span>
          </div>
          {card.trend !== undefined && <TrendBadge pct={card.trend} />}
        </div>

        {/* Value */}
        <div
          className="font-serif font-bold mt-auto"
          style={{
            fontSize: isEmpty ? 32 : card.value >= 1000000 ? 22 : card.value >= 100000 ? 26 : 30,
            color: isEmpty ? 'var(--text-muted)' : gm.color,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}
        >
          {fmt(card.value, card.prefix)}
        </div>
      </div>
    </div>
  )
}

// ─── Group section ────────────────────────────────────────────────────────────

function GroupSection({ group, cards }: { group: string; cards: MetricCard[] }) {
  const gm = GROUP_META[group]
  const groupTotal = cards.filter(c => c.prefix === '₹').reduce((s, c) => s + c.value, 0)

  return (
    <div className="mb-6">
      <SectionHeader
        title={gm.label}
        right={
          groupTotal > 0 ? (
            <span className="font-serif font-semibold" style={{ fontSize: 13, color: gm.color }}>
              ₹{groupTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : undefined
        }
      />
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
      >
        {cards.map(card => (
          <MetricCardUI key={card.key} card={card} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

function LegacyDashboardMonthWisePage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [showFilter,    setShowFilter]    = useState(false)
  const [place,         setPlace]         = useState('')
  const [viewMode,      setViewMode]      = useState<'grouped' | 'flat'>('grouped')

  // In a real app, swap data source based on selectedMonth
  const cards = DATA_APR_2026

  // Group cards
  const grouped = useMemo(() => {
    const map: Record<string, MetricCard[]> = {}
    cards.forEach(c => {
      if (!map[c.group]) map[c.group] = []
      map[c.group].push(c)
    })
    return map
  }, [cards])

  const grandTotal = cards.filter(c => c.prefix === '₹').reduce((s, c) => s + c.value, 0)
  const totalVisitorCount = (cards.find(c => c.key === 'totalVisitors')?.value ?? 0)
  const totalBookingCount = (cards.find(c => c.key === 'totalBookings')?.value ?? 0)

  const selectedLabel = MONTHS.find(m => m.val === selectedMonth)?.label ?? ''

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

      {/* ── Top action bar ──────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}
      >
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>
            DashBoard Month Wise
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Monthly breakdown of visitors, bookings & all fee heads
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Month selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="appearance-none rounded-xl pl-9 pr-8 py-2 outline-none font-medium"
              style={{ fontSize: 12, background: 'var(--gold-pale)', border: '1px solid var(--gold)', color: 'var(--maroon)', minWidth: 160 }}
            >
              {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gold)' }} />
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gold)' }} />
          </div>

          {/* View toggle */}
          <div
            className="flex items-center rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--sand)' }}
          >
            {(['grouped', 'flat'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  fontSize: 11,
                  background: viewMode === mode ? 'var(--maroon)' : '#fff',
                  color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Filter */}
          <button
            onClick={() => setShowFilter(v => !v)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{
              fontSize: 12,
              background: showFilter ? 'var(--maroon)' : 'var(--cream-dark)',
              border: '1px solid ' + (showFilter ? 'var(--maroon)' : 'var(--sand)'),
              color: showFilter ? '#fff' : 'var(--text-mid)',
            }}
          >
            <Filter size={13} />
            Filter
          </button>
        </div>
      </div>

      {/* ── Filter panel ─────────────────────────────────────── */}
      {showFilter && (
        <div
          className="flex items-end gap-4 px-6 py-4 flex-wrap"
          style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}
        >
          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 180 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>
              Place / Site
            </label>
            <input
              value={place}
              onChange={e => setPlace(e.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
              placeholder="Filter by place…"
            />
          </div>

          <button
            onClick={() => setShowFilter(false)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'var(--maroon)' }}
          >
            Apply
          </button>
          <button
            onClick={() => { setPlace('') }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' }}
          >
            <X size={11} /> Reset
          </button>
        </div>
      )}

      {/* ── Date display banner ───────────────────────────────── */}
      <div
        className="flex items-center justify-center py-2.5"
        style={{ borderBottom: '1px solid var(--sand)', background: 'var(--cream)' }}
      >
        <span className="font-medium" style={{ fontSize: 13, color: 'var(--maroon)' }}>
          {formatMonthLabel(selectedMonth + '-01')}
        </span>
      </div>

      {/* ── Hero summary row ──────────────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-4 px-6 py-5"
        style={{ background: 'var(--cream)' }}
      >
        {/* Grand Revenue */}
        <div
          className="rounded-xl3 px-6 py-5 col-span-1 relative overflow-hidden flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 100%)', color: '#fff' }}
        >
          <div style={{ position: 'absolute', top: -28, right: -28, width: 88, height: 88, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <span style={{ fontSize: 36, flexShrink: 0 }}>₹</span>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Grand Total Revenue</div>
            <div className="font-serif font-bold" style={{ fontSize: 28, lineHeight: 1.1 }}>
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>{selectedLabel}</div>
          </div>
        </div>

        {/* Total Visitors */}
        <div
          className="rounded-xl3 px-6 py-5 flex items-center gap-4"
          style={{ background: '#fff', border: '1px solid rgba(26,122,110,0.2)' }}
        >
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0 text-3xl"
            style={{ width: 56, height: 56, background: 'rgba(26,122,110,0.08)' }}
          >
            👥
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Visitors</div>
            <div className="font-serif font-bold" style={{ fontSize: 32, color: '#1A7A6E', lineHeight: 1.1 }}>
              {totalVisitorCount.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{selectedLabel}</div>
          </div>
        </div>

        {/* Total Bookings */}
        <div
          className="rounded-xl3 px-6 py-5 flex items-center gap-4"
          style={{ background: '#fff', border: '1px solid rgba(200,146,42,0.2)' }}
        >
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0 text-3xl"
            style={{ width: 56, height: 56, background: 'rgba(200,146,42,0.08)' }}
          >
            📅
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Bookings</div>
            <div className="font-serif font-bold" style={{ fontSize: 32, color: '#C8922A', lineHeight: 1.1 }}>
              {totalBookingCount.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{selectedLabel}</div>
          </div>
        </div>
      </div>

      {/* ── Main card grid ────────────────────────────────────── */}
      <div className="px-6 pb-8">
        {viewMode === 'grouped' ? (
          /* Grouped view — each section has its own header */
          Object.entries(grouped).map(([group, groupCards]) => (
            <GroupSection key={group} group={group} cards={groupCards} />
          ))
        ) : (
          /* Flat view — all cards in one responsive grid */
          <>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--gold), var(--maroon))', borderRadius: 99, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
                All Metrics — {selectedLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--sand)' }} />
              <span className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {cards.length} metrics
              </span>
            </div>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
              {cards.map(card => (
                <MetricCardUI key={card.key} card={card} />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
