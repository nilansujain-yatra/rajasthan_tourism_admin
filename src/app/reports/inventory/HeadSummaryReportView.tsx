'use client'

import { useState, useMemo } from 'react'
import {
  Download, Filter, Search, ChevronLeft, ChevronRight,
  X, ChevronDown, Calendar,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadSummaryStats {
  gypsy:                number
  canter:               number
  indianCitizen:        number
  indianCitizenGypsy:   number
  indianCitizenCanter:  number
  foreignCitizen:       number
  foreignCitizenGypsy:  number
  foreignCitizenCanter: number
  indianStudent:        number
  indianStudentGypsy:   number
  indianStudentCanter:  number
  foreignStudent:       number
  totalVisitor:         number
}

export interface HeadSummaryRow {
  srNo:   number
  name:   string
  amount: number
}

// ─── Sample data (from PDF) ───────────────────────────────────────────────────

const DEFAULT_STATS: HeadSummaryStats = {
  gypsy:                339,
  canter:               0,
  indianCitizen:        944,
  indianCitizenGypsy:   944,
  indianCitizenCanter:  0,
  foreignCitizen:       208,
  foreignCitizenGypsy:  208,
  foreignCitizenCanter: 0,
  indianStudent:        330,
  indianStudentGypsy:   330,
  indianStudentCanter:  0,
  foreignStudent:       0,
  totalVisitor:         1482,
}

const DEFAULT_ROWS: HeadSummaryRow[] = [
  { srNo: 1, name: 'VEHICLE RENT',         amount: 499434 },
  { srNo: 2, name: 'RISL CHARGES',         amount: 32684  },
  { srNo: 3, name: 'GST ON VEHICLE',       amount: 25194  },
  { srNo: 4, name: 'VEHICLE ENTRY FEE',    amount: 25194  },
  { srNo: 5, name: 'MEMBER ECO SURCHARGE', amount: 235820 },
  { srNo: 6, name: 'MEMBER ENTRY FEE',     amount: 134960 },
  { srNo: 7, name: 'SURCHARGE-RPACS',      amount: 413478 },
]

// ─── Stats block config ───────────────────────────────────────────────────────

interface StatGroup {
  groupLabel: string
  groupColor: string
  groupBg:    string
  icon:       string
  items: { key: keyof HeadSummaryStats; label: string }[]
}

const STAT_GROUPS: StatGroup[] = [
  {
    groupLabel: 'Vehicle Type',
    groupColor: '#8B1A1A',
    groupBg:    'rgba(139,26,26,0.07)',
    icon: '🚗',
    items: [
      { key: 'gypsy',  label: 'Gypsy'  },
      { key: 'canter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Indian Citizen',
    groupColor: '#1A7A6E',
    groupBg:    'rgba(26,122,110,0.07)',
    icon: '🇮🇳',
    items: [
      { key: 'indianCitizen',       label: 'Total'  },
      { key: 'indianCitizenGypsy',  label: 'Gypsy'  },
      { key: 'indianCitizenCanter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Foreign Citizen',
    groupColor: '#C8922A',
    groupBg:    'rgba(200,146,42,0.07)',
    icon: '🌍',
    items: [
      { key: 'foreignCitizen',       label: 'Total'  },
      { key: 'foreignCitizenGypsy',  label: 'Gypsy'  },
      { key: 'foreignCitizenCanter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Indian Student',
    groupColor: '#5A3A1A',
    groupBg:    'rgba(90,58,26,0.07)',
    icon: '🎓',
    items: [
      { key: 'indianStudent',       label: 'Total'  },
      { key: 'indianStudentGypsy',  label: 'Gypsy'  },
      { key: 'indianStudentCanter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Foreign Student',
    groupColor: '#6B1212',
    groupBg:    'rgba(107,18,18,0.07)',
    icon: '🎒',
    items: [
      { key: 'foreignStudent', label: 'Total' },
    ],
  },
]

// ─── Head name → display config ───────────────────────────────────────────────

const HEAD_CONFIG: Record<string, { bg: string; color: string; icon: string }> = {
  'VEHICLE RENT':         { bg: 'rgba(200,146,42,0.1)',  color: '#C8922A', icon: '🚗' },
  'RISL CHARGES':         { bg: 'rgba(107,18,18,0.1)',   color: '#6B1212', icon: '📋' },
  'GST ON VEHICLE':       { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E', icon: '🧾' },
  'VEHICLE ENTRY FEE':    { bg: 'rgba(200,146,42,0.1)',  color: '#C8922A', icon: '🎫' },
  'MEMBER ECO SURCHARGE': { bg: 'rgba(90,138,58,0.1)',   color: '#5A8A3A', icon: '🌿' },
  'MEMBER ENTRY FEE':     { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A', icon: '👥' },
  'SURCHARGE-RPACS':      { bg: 'rgba(90,58,26,0.1)',    color: '#5A3A1A', icon: '⚡' },
}

function getHeadConfig(name: string) {
  return HEAD_CONFIG[name] ?? { bg: 'rgba(90,58,26,0.07)', color: '#5A3A1A', icon: '💰' }
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: { v: string; l: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none rounded-xl pr-7 pl-3 py-2 outline-none"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 130 }}
        >
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="rounded-xl pl-3 pr-8 py-2 outline-none"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 140 }}
        />
        <Calendar size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

function PageBtn({
  onClick, disabled, active, icon, label,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  icon?: React.ReactNode
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-1"
      style={{
        minWidth: 28, height: 28, fontSize: 11,
        background: active ? 'var(--maroon)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-mid)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon ?? label}
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface HeadSummaryReportViewProps {
  stats?:        HeadSummaryStats
  data?:         HeadSummaryRow[]
  title?:        string
  totalResults?: number
}

export default function HeadSummaryReportView({
  stats        = DEFAULT_STATS,
  data         = DEFAULT_ROWS,
  title        = 'Head Summary Report',
  totalResults,
}: HeadSummaryReportViewProps) {

  // ── State ──
  const [filters, setFilters] = useState({
    search:      '',
    paymentType: 'ALL',
    startDate:   '2026-04-01',
    endDate:     '2026-04-13',
    place:       'Jhalana/amagarh Leopard Conservation Reserve',
    pageSize:    10,
  })
  const [page, setPage]               = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // ── Filtered rows ──
  const filtered = useMemo(() =>
    data.filter(r => {
      if (!filters.search) return true
      const q = filters.search.toLowerCase()
      return r.name.toLowerCase().includes(q) || String(r.srNo).includes(q)
    }),
  [data, filters.search])

  const pageSize   = filters.pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  const grandTotal = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered])
  const pageTotal  = paged.reduce((s, r) => s + r.amount, 0)
  const maxAmount  = Math.max(...data.map(r => r.amount), 1)

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}
      >
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>
            {title}
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Inventory Reports · Fee Head Summary with Visitor Breakdown
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 210 }}
          >
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              placeholder="Search head name…"
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 12, color: 'var(--text-dark)' }}
            />
            {filters.search && (
              <button onClick={() => setFilters(f => ({ ...f, search: '' }))}>
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Filter */}
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{
              fontSize: 12,
              background: showFilterPanel ? 'var(--maroon)' : 'var(--cream-dark)',
              border: '1px solid ' + (showFilterPanel ? 'var(--maroon)' : 'var(--sand)'),
              color: showFilterPanel ? '#fff' : 'var(--text-mid)',
            }}
          >
            <Filter size={13} />
            Filter
          </button>

          {/* Export */}
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* ── Active filter strip ───────────────────────────────── */}
      <div
        className="flex items-center gap-6 px-6 py-2.5 flex-wrap"
        style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}
      >
        {[
          { label: 'Start Date',   val: filters.startDate ? new Date(filters.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
          { label: 'End Date',     val: filters.endDate   ? new Date(filters.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
          { label: 'Place',        val: filters.place.length > 30 ? filters.place.slice(0, 30) + '…' : filters.place },
          { label: 'Payment Type', val: filters.paymentType },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
              {item.label} :
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 font-medium"
              style={{ fontSize: 11, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}
            >
              {item.val}
            </span>
          </div>
        ))}
      </div>

      {/* ── Expanded filter panel ─────────────────────────────── */}
      {showFilterPanel && (
        <div
          className="flex items-end gap-4 px-6 py-4 flex-wrap"
          style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}
        >
          <DateInput label="Start Date" value={filters.startDate} onChange={v => { setFilters(f => ({ ...f, startDate: v })); setPage(1) }} />
          <DateInput label="End Date"   value={filters.endDate}   onChange={v => { setFilters(f => ({ ...f, endDate: v })); setPage(1) }} />

          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 200 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Place</label>
            <input
              value={filters.place}
              onChange={e => setFilters(f => ({ ...f, place: e.target.value }))}
              className="rounded-xl px-3 py-2 outline-none"
              style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
              placeholder="Filter by place…"
            />
          </div>

          <FilterSelect
            label="Payment Type"
            value={filters.paymentType}
            options={[
              { v: 'ALL',     l: 'All Types' },
              { v: 'ONLINE',  l: 'Online'    },
              { v: 'KIOSK',   l: 'Kiosk'     },
              { v: 'COUNTER', l: 'Counter'   },
            ]}
            onChange={v => { setFilters(f => ({ ...f, paymentType: v })); setPage(1) }}
          />

          <FilterSelect
            label="Rows per page"
            value={String(filters.pageSize)}
            options={[10, 25, 50].map(n => ({ v: String(n), l: String(n) }))}
            onChange={v => { setFilters(f => ({ ...f, pageSize: Number(v) })); setPage(1) }}
          />

          <button
            onClick={() => setShowFilterPanel(false)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'var(--maroon)' }}
          >
            Apply
          </button>
          <button
            onClick={() => { setFilters(f => ({ ...f, search: '', paymentType: 'ALL' })); setPage(1) }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' }}
          >
            <X size={11} /> Reset
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          BLOCK 1 — Visitor Stats (Vehicle × Category breakdown)
          ════════════════════════════════════════════════════════ */}
      <div className="px-6 pt-5 pb-2" style={{ background: 'var(--cream)' }}>
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--gold), var(--maroon))', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
            Visitor Breakdown
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--sand)' }} />
          {/* Total Visitor hero */}
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-1.5"
            style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', flexShrink: 0 }}
          >
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Total Visitors</span>
            <span className="font-serif font-bold" style={{ fontSize: 20, color: '#fff' }}>
              {stats.totalVisitor.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Stat group cards */}
        <div className="flex gap-3 flex-wrap mb-5">
          {STAT_GROUPS.map(group => (
            <div
              key={group.groupLabel}
              className="rounded-xl overflow-hidden flex-1"
              style={{
                minWidth: 140,
                border: `1px solid ${group.groupColor}22`,
                background: '#fff',
              }}
            >
              {/* Group header */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ background: group.groupBg, borderBottom: `1px solid ${group.groupColor}22` }}
              >
                <span style={{ fontSize: 14 }}>{group.icon}</span>
                <span
                  className="font-semibold"
                  style={{ fontSize: 10, color: group.groupColor, letterSpacing: '0.5px', textTransform: 'uppercase' }}
                >
                  {group.groupLabel}
                </span>
              </div>

              {/* Stat items */}
              <div className="flex divide-x" style={{ borderColor: 'var(--cream-dark)' }}>
                {group.items.map(item => {
                  const val = stats[item.key]
                  const isEmpty = val === 0
                  return (
                    <div
                      key={item.key}
                      className="flex-1 flex flex-col items-center justify-center py-3 px-2"
                    >
                      <div
                        className="font-serif font-bold"
                        style={{
                          fontSize: 22,
                          lineHeight: 1,
                          color: isEmpty ? 'var(--text-muted)' : group.groupColor,
                        }}
                      >
                        {val.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, textAlign: 'center' }}>
                        {item.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Compact full-row reference table (matches original PDF horizontal strip) */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--sand)', background: '#fff', marginBottom: 20 }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: 'var(--maroon)' }}>
                  {[
                    'Gypsy', 'Canter',
                    'Indian Citizen', 'Indian Citizen Gypsy', 'Indian Citizen Canter',
                    'Foreign Citizen', 'Foreign Citizen Gypsy', 'Foreign Citizen Canter',
                    'Indian Student', 'Indian Student Gypsy', 'Indian Student Canter',
                    'Foreign Student',
                    'Total Visitor',
                  ].map((col, i, arr) => (
                    <th
                      key={col}
                      style={{
                        padding: '8px 12px',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                        color: 'rgba(255,255,255,0.85)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                        // highlight Total Visitor
                        background: i === arr.length - 1 ? 'rgba(200,146,42,0.35)' : undefined,
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {([
                    stats.gypsy, stats.canter,
                    stats.indianCitizen, stats.indianCitizenGypsy, stats.indianCitizenCanter,
                    stats.foreignCitizen, stats.foreignCitizenGypsy, stats.foreignCitizenCanter,
                    stats.indianStudent, stats.indianStudentGypsy, stats.indianStudentCanter,
                    stats.foreignStudent,
                    stats.totalVisitor,
                  ] as number[]).map((val, i, arr) => (
                    <td
                      key={i}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'center',
                        fontSize: i === arr.length - 1 ? 16 : 14,
                        fontWeight: i === arr.length - 1 ? 700 : val === 0 ? 400 : 600,
                        fontFamily: i === arr.length - 1 ? "'Cormorant Garamond', serif" : 'inherit',
                        color: i === arr.length - 1
                          ? 'var(--maroon)'
                          : val === 0
                          ? 'var(--text-muted)'
                          : 'var(--text-dark)',
                        borderRight: i < arr.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                        background: i === arr.length - 1 ? 'var(--gold-pale)' : undefined,
                        borderBottom: 'none',
                      }}
                    >
                      {val === 0
                        ? <span style={{ color: 'var(--text-muted)', fontWeight: 300 }}>0</span>
                        : val.toLocaleString('en-IN')
                      }
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          BLOCK 2 — Head-wise Amount Table
          ════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-6">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--gold), var(--maroon))', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
            Fee Head Amounts
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--sand)' }} />
          <span className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {filtered.length} heads
          </span>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {[
                  { label: 'Sr.No',        align: 'center' as const, w: 64  },
                  { label: 'Name',         align: 'left'   as const, w: undefined },
                  { label: 'Share',        align: 'left'   as const, w: 180 },
                  { label: 'Amount (INR)', align: 'right'  as const, w: 160 },
                ].map(col => (
                  <th
                    key={col.label}
                    style={{
                      padding: '11px 16px',
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'var(--text-muted)',
                      textAlign: col.align,
                      width: col.w,
                      borderRight: '1px solid var(--sand)',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                paged.map((r, i) => {
                  const cfg    = getHeadConfig(r.name)
                  const pct    = grandTotal > 0 ? ((r.amount / grandTotal) * 100).toFixed(1) : '0.0'
                  const barPct = (r.amount / maxAmount) * 100
                  const rowBg  = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'

                  return (
                    <tr
                      key={r.srNo}
                      style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.03)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}
                    >
                      {/* Sr.No */}
                      <td style={{ padding: '13px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--maroon)', borderRight: '1px solid var(--cream-dark)' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '13px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex items-center justify-center rounded-lg flex-shrink-0"
                            style={{ width: 34, height: 34, background: cfg.bg, fontSize: 16 }}
                          >
                            {cfg.icon}
                          </span>
                          <div>
                            <div className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>
                              {r.name}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                              Head #{r.srNo}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Share bar */}
                      <td style={{ padding: '13px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: 'var(--cream-dark)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${barPct}%`,
                                background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600, minWidth: 38, textAlign: 'right' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--maroon)', lineHeight: 1 }}>
                          ₹{r.amount.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                          {pct}% of total
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}

              {/* Page total */}
              {paged.length > 0 && (
                <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                  <td colSpan={2} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
                    Page Total
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                    {paged.length} head{paged.length !== 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>
                    ₹{pageTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {/* Grand total */}
              {paged.length > 0 && (
                <tr style={{ background: 'linear-gradient(135deg, rgba(139,26,26,0.05), rgba(200,146,42,0.05))', borderTop: '1px solid var(--sand)' }}>
                  <td colSpan={2} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
                    Grand Total
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                    All {filtered.length} heads
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: 'var(--maroon)' }}>
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Pagination footer ── */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}
          >
            {/* Display data selector */}
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Display Data:</span>
              <div className="relative">
                <select
                  value={String(filters.pageSize)}
                  onChange={e => { setFilters(f => ({ ...f, pageSize: Number(e.target.value) })); setPage(1) }}
                  className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                  style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                >
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <PageBtn
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                icon={<><ChevronLeft size={12} /><span style={{ fontSize: 11 }}>Previous</span></>}
              />
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5) {
                  if      (page <= 3)              p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else                             p = page - 2 + i
                }
                return <PageBtn key={p} onClick={() => setPage(p)} active={page === p} label={String(p)} />
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
              )}
              {totalPages > 5 && (
                <PageBtn onClick={() => setPage(totalPages)} active={page === totalPages} label={String(totalPages)} />
              )}
              <PageBtn
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>}
              />
            </div>

            {/* Result count */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Result:{' '}
              <strong style={{ color: 'var(--text-dark)' }}>
                {filtered.length === 0
                  ? 0
                  : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`
                }
              </strong>{' '}of{' '}
              <strong style={{ color: 'var(--maroon)' }}>
                {totalResults ?? filtered.length}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
