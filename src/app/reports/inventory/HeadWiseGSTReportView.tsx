'use client'

import { useState, useMemo } from 'react'
import {
  Download, Filter, Search, ChevronLeft, ChevronRight,
  X, ChevronDown, Calendar,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadWiseGSTRow {
  srNo:              number
  bookingNumber:     string
  bookingDate:       string
  visitDate:         string
  emitraTransId:     string
  totalEntryFee:     number
  totalEcoDev:       number
  totalTRDFFee:      number
  vehicleRent:       number
  vehicleGST:        number
  guideFee:          number
  guideGST:          number
  quota:             string
  shift:             'Morning' | 'Evening' | 'Afternoon' | string
  totalVisitor:      number
  totalPrice:        number
}

// ─── Sample data (from PDF + given keys) ─────────────────────────────────────

const SAMPLE_DATA: HeadWiseGSTRow[] = [
  { srNo:1,  bookingNumber:'JHA2604010913194602', bookingDate:'01-04-2026', visitDate:'10-05-2026', emitraTransId:'260763135979', totalEntryFee:577,  totalEcoDev:0,   totalTRDFFee:0,  vehicleRent:337, vehicleGST:17, guideFee:279, guideGST:0, quota:'Normal', shift:'Evening', totalVisitor:1, totalPrice:778.45  },
  { srNo:2,  bookingNumber:'JHA2604010853421207', bookingDate:'01-04-2026', visitDate:'10-05-2026', emitraTransId:'260763124455', totalEntryFee:1154, totalEcoDev:0,   totalTRDFFee:0,  vehicleRent:337, vehicleGST:17, guideFee:558, guideGST:0, quota:'Normal', shift:'Morning', totalVisitor:2, totalPrice:1762.16 },
  { srNo:3,  bookingNumber:'JHA2604010842195033', bookingDate:'01-04-2026', visitDate:'09-05-2026', emitraTransId:'260763112340', totalEntryFee:1731, totalEcoDev:0,   totalTRDFFee:0,  vehicleRent:337, vehicleGST:17, guideFee:837, guideGST:0, quota:'Normal', shift:'Morning', totalVisitor:3, totalPrice:2643.24 },
  { srNo:4,  bookingNumber:'JHA2604010832084611', bookingDate:'01-04-2026', visitDate:'09-05-2026', emitraTransId:'260763098124', totalEntryFee:3462, totalEcoDev:0,   totalTRDFFee:0,  vehicleRent:650, vehicleGST:33, guideFee:1674,guideGST:0, quota:'Normal', shift:'Evening', totalVisitor:6, totalPrice:6588.21 },
  { srNo:5,  bookingNumber:'JHA2604010819341802', bookingDate:'01-04-2026', visitDate:'08-05-2026', emitraTransId:'260763088701', totalEntryFee:577,  totalEcoDev:0,   totalTRDFFee:0,  vehicleRent:337, vehicleGST:17, guideFee:279, guideGST:0, quota:'Normal', shift:'Evening', totalVisitor:1, totalPrice:778.45  },
  { srNo:6,  bookingNumber:'JHA2604010808216524', bookingDate:'01-04-2026', visitDate:'08-05-2026', emitraTransId:'260763077899', totalEntryFee:3462, totalEcoDev:120, totalTRDFFee:60, vehicleRent:650, vehicleGST:33, guideFee:1674,guideGST:0, quota:'Normal', shift:'Evening', totalVisitor:6, totalPrice:5081.22 },
  { srNo:7,  bookingNumber:'KUM2604010752883490', bookingDate:'01-04-2026', visitDate:'07-05-2026', emitraTransId:'260763065432', totalEntryFee:1731, totalEcoDev:60,  totalTRDFFee:30, vehicleRent:337, vehicleGST:17, guideFee:837, guideGST:0, quota:'Normal', shift:'Evening', totalVisitor:3, totalPrice:2643.24 },
  { srNo:8,  bookingNumber:'KUM2604010741774203', bookingDate:'01-04-2026', visitDate:'07-05-2026', emitraTransId:'260763054188', totalEntryFee:4616, totalEcoDev:160, totalTRDFFee:80, vehicleRent:650, vehicleGST:33, guideFee:2232,guideGST:0, quota:'Forest', shift:'Morning', totalVisitor:8, totalPrice:8780.00 },
  { srNo:9,  bookingNumber:'BEE2604010729442815', bookingDate:'01-04-2026', visitDate:'06-05-2026', emitraTransId:'260763043277', totalEntryFee:1154, totalEcoDev:40,  totalTRDFFee:20, vehicleRent:337, vehicleGST:17, guideFee:558, guideGST:0, quota:'Normal', shift:'Morning', totalVisitor:2, totalPrice:1960.18 },
  { srNo:10, bookingNumber:'BEE2604010715993621', bookingDate:'01-04-2026', visitDate:'06-05-2026', emitraTransId:'260763032165', totalEntryFee:2885, totalEcoDev:100, totalTRDFFee:50, vehicleRent:650, vehicleGST:33, guideFee:1395,guideGST:0, quota:'Normal', shift:'Evening', totalVisitor:5, totalPrice:4920.30 },
]

// ─── Shift style ──────────────────────────────────────────────────────────────

const shiftStyle: Record<string, { bg: string; color: string; dot: string }> = {
  Morning:   { bg: 'rgba(200,146,42,0.1)',  color: '#C8922A', dot: '#C8922A' },
  Evening:   { bg: 'rgba(107,18,18,0.09)',  color: '#8B1A1A', dot: '#8B1A1A' },
  Afternoon: { bg: 'rgba(26,122,110,0.09)', color: '#1A7A6E', dot: '#1A7A6E' },
}
function getShiftStyle(s: string) {
  return shiftStyle[s] ?? { bg: 'rgba(90,58,26,0.08)', color: '#5A3A1A', dot: '#5A3A1A' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (v: number) =>
  v === 0
    ? <span style={{ color: 'var(--text-muted)' }}>—</span>
    : <>{v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>

const fmtInt = (v: number) =>
  v === 0 ? <span style={{ color: 'var(--text-muted)' }}>—</span> : <>{v}</>

function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string
  options: { v: string; l: string }[]; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>
        {label}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none rounded-xl pr-7 pl-3 py-2 outline-none"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 130 }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

function PageBtn({ onClick, disabled, active, icon, label }: {
  onClick: () => void; disabled?: boolean; active?: boolean; icon?: React.ReactNode; label?: string
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-1"
      style={{ minWidth: 28, height: 28, fontSize: 11, background: active ? 'var(--maroon)' : 'transparent', color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-mid)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      {icon ?? label}
    </button>
  )
}

// ─── Column group header component ───────────────────────────────────────────

const thGroup: React.CSSProperties = {
  padding: '6px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.7px', whiteSpace: 'nowrap' as const, textAlign: 'center' as const,
  borderRight: '2px solid rgba(255,255,255,0.18)',
}
const thSub: React.CSSProperties = {
  padding: '7px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.6px', whiteSpace: 'nowrap' as const, color: 'var(--text-mid)',
  borderBottom: '2px solid var(--sand)', borderRight: '1px solid var(--sand)',
  background: 'var(--cream-dark)',
}
const tdBase: React.CSSProperties = { padding: '9px 10px', fontSize: 12, borderBottom: '1px solid var(--cream-dark)', verticalAlign: 'middle', whiteSpace: 'nowrap' as const }
const tdNum:  React.CSSProperties = { ...tdBase, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }

// ─── Main Component ────────────────────────────────────────────────────────────

interface HeadWiseGSTReportViewProps {
  data?:         HeadWiseGSTRow[]
  title?:        string
  totalResults?: number
}

export default function HeadWiseGSTReportView({
  data         = SAMPLE_DATA,
  title        = 'HeadWise Report (GST and Choice)',
  totalResults = 491,
}: HeadWiseGSTReportViewProps) {

  const [filters, setFilters] = useState({
    search:    '',
    shift:     '',
    quota:     '',
    startDate: '',
    endDate:   '',
    pageSize:  10,
  })
  const [page,            setPage]            = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const shifts = Array.from(new Set(data.map(r => r.shift)))
  const quotas = Array.from(new Set(data.map(r => r.quota)))

  const filtered = useMemo(() => data.filter(r => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!r.bookingNumber.toLowerCase().includes(q) &&
          !r.emitraTransId.toLowerCase().includes(q)) return false
    }
    if (filters.shift && r.shift !== filters.shift) return false
    if (filters.quota && r.quota !== filters.quota) return false
    return true
  }), [data, filters])

  const pageSize   = filters.pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Totals
  const totals = useMemo(() => ({
    entryFee:     filtered.reduce((s, r) => s + r.totalEntryFee, 0),
    ecoDev:       filtered.reduce((s, r) => s + r.totalEcoDev, 0),
    trdf:         filtered.reduce((s, r) => s + r.totalTRDFFee, 0),
    vehicleRent:  filtered.reduce((s, r) => s + r.vehicleRent, 0),
    vehicleGST:   filtered.reduce((s, r) => s + r.vehicleGST, 0),
    guideFee:     filtered.reduce((s, r) => s + r.guideFee, 0),
    guideGST:     filtered.reduce((s, r) => s + r.guideGST, 0),
    visitors:     filtered.reduce((s, r) => s + r.totalVisitor, 0),
    price:        filtered.reduce((s, r) => s + r.totalPrice, 0),
  }), [filtered])

  const pageTotals = {
    entryFee:    paged.reduce((s, r) => s + r.totalEntryFee, 0),
    ecoDev:      paged.reduce((s, r) => s + r.totalEcoDev, 0),
    trdf:        paged.reduce((s, r) => s + r.totalTRDFFee, 0),
    vehicleRent: paged.reduce((s, r) => s + r.vehicleRent, 0),
    vehicleGST:  paged.reduce((s, r) => s + r.vehicleGST, 0),
    guideFee:    paged.reduce((s, r) => s + r.guideFee, 0),
    guideGST:    paged.reduce((s, r) => s + r.guideGST, 0),
    visitors:    paged.reduce((s, r) => s + r.totalVisitor, 0),
    price:       paged.reduce((s, r) => s + r.totalPrice, 0),
  }

  const activeFilters = [filters.shift, filters.quota, filters.startDate, filters.endDate].filter(Boolean).length

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>
            {title}
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Inventory Reports · GST & Choice Fee Breakdown
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 230 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              placeholder="Search booking / Emitra ID…"
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 12, color: 'var(--text-dark)' }} />
            {filters.search && (
              <button onClick={() => setFilters(f => ({ ...f, search: '' }))}>
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Filter */}
          <button onClick={() => setShowFilterPanel(v => !v)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
            style={{ fontSize: 12, background: showFilterPanel ? 'var(--maroon)' : 'var(--cream-dark)', border: '1px solid ' + (showFilterPanel ? 'var(--maroon)' : 'var(--sand)'), color: showFilterPanel ? '#fff' : 'var(--text-mid)' }}>
            <Filter size={13} />
            Filter
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center text-white font-bold"
                style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}>
                {activeFilters}
              </span>
            )}
          </button>

          {/* Export */}
          <button className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* ── Filter panel ─────────────────────────────────────── */}
      {showFilterPanel && (
        <div className="flex items-end gap-4 px-6 py-4 flex-wrap"
          style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>

          {/* Start date */}
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>Start Date</label>
            <div className="relative">
              <input type="date" value={filters.startDate}
                onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1) }}
                className="rounded-xl pl-3 pr-8 py-2 outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 140 }} />
              <Calendar size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* End date */}
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>End Date</label>
            <div className="relative">
              <input type="date" value={filters.endDate}
                onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1) }}
                className="rounded-xl pl-3 pr-8 py-2 outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 140 }} />
              <Calendar size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          <FilterSelect label="Shift" value={filters.shift}
            options={[{ v: '', l: 'All Shifts' }, ...shifts.map(s => ({ v: s, l: s }))]}
            onChange={v => { setFilters(f => ({ ...f, shift: v })); setPage(1) }} />

          <FilterSelect label="Quota" value={filters.quota}
            options={[{ v: '', l: 'All Quotas' }, ...quotas.map(q => ({ v: q, l: q }))]}
            onChange={v => { setFilters(f => ({ ...f, quota: v })); setPage(1) }} />

          <FilterSelect label="Rows / Page" value={String(filters.pageSize)}
            options={[10, 25, 50, 100].map(n => ({ v: String(n), l: String(n) }))}
            onChange={v => { setFilters(f => ({ ...f, pageSize: Number(v) })); setPage(1) }} />

          <button onClick={() => setShowFilterPanel(false)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'var(--maroon)' }}>Apply</button>

          <button onClick={() => { setFilters(f => ({ ...f, shift: '', quota: '', startDate: '', endDate: '' })); setPage(1) }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' }}>
            <X size={11} /> Reset
          </button>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
        {[
          { label: 'Total Records',     val: filtered.length.toLocaleString('en-IN'),                                                          icon: '📋', color: 'var(--maroon)',   bg: '#fff',     white: false },
          { label: 'Total Price',       val: '₹' + totals.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: '₹',  color: 'var(--maroon)',   bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true },
          { label: 'Total Visitors',    val: totals.visitors.toLocaleString('en-IN'),                                                           icon: '👥', color: '#1A7A6E',         bg: '#fff',     white: false },
          { label: 'Total Entry Fee',   val: '₹' + totals.entryFee.toLocaleString('en-IN'),                                                     icon: '🎫', color: '#C8922A',         bg: '#fff',     white: false },
          { label: 'Total Guide Fees',  val: '₹' + totals.guideFee.toLocaleString('en-IN'),                                                     icon: '🧭', color: '#1A7A6E',         bg: '#fff',     white: false },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
            style={{ background: s.bg, border: s.white ? 'none' : '1px solid var(--sand)' }}>
            {s.white && <div style={{ position: 'absolute', top: -24, right: -24, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
            <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 10, color: s.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize: 18, color: s.white ? '#fff' : s.color, lineHeight: 1.1 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
              <thead>
                {/* ── Group row ── */}
                <tr>
                  {/* Sr.No sticky */}
                  <th rowSpan={2} style={{ ...thGroup, width: 48, background: 'var(--maroon)', color: '#fff', textAlign: 'center', position: 'sticky' as const, left: 0, zIndex: 3, borderRight: '2px solid rgba(255,255,255,0.2)' }}>
                    Sr.
                  </th>
                  {/* Booking */}
                  <th colSpan={4} style={{ ...thGroup, background: '#8B1A1A', color: '#fff' }}>Booking Info</th>
                  {/* Fee heads */}
                  <th colSpan={3} style={{ ...thGroup, background: '#1A7A6E', color: '#fff' }}>Entry & Eco</th>
                  {/* Vehicle */}
                  <th colSpan={2} style={{ ...thGroup, background: '#C8922A', color: '#fff' }}>Vehicle Rent</th>
                  {/* Guide */}
                  <th colSpan={2} style={{ ...thGroup, background: '#5A3A1A', color: '#fff' }}>Guide Fees</th>
                  {/* Trip info */}
                  <th colSpan={2} style={{ ...thGroup, background: '#6B1212', color: '#fff' }}>Trip Info</th>
                  {/* Totals */}
                  <th colSpan={2} style={{ ...thGroup, background: '#8B1A1A', color: '#fff' }}>Totals</th>
                </tr>

                {/* ── Sub-column row ── */}
                <tr style={{ background: 'var(--cream-dark)' }}>
                  {/* Booking Info */}
                  {['Booking Number', 'Booking Date', 'Visit Date', 'Emitra Trans. ID'].map(h => (
                    <th key={h} style={{ ...thSub, background: 'rgba(139,26,26,0.05)' }}>{h}</th>
                  ))}
                  {/* Entry & Eco */}
                  {['Entry Fee (₹)', 'Eco Dev (₹)', 'TRDF Fee (₹)'].map(h => (
                    <th key={h} style={{ ...thSub, background: 'rgba(26,122,110,0.05)' }}>{h}</th>
                  ))}
                  {/* Vehicle */}
                  {['Rent (₹)', 'GST (₹)'].map(h => (
                    <th key={h} style={{ ...thSub, background: 'rgba(200,146,42,0.06)' }}>{h}</th>
                  ))}
                  {/* Guide */}
                  {['Fee (₹)', 'GST (₹)'].map(h => (
                    <th key={h} style={{ ...thSub, background: 'rgba(90,58,26,0.05)' }}>{h}</th>
                  ))}
                  {/* Trip */}
                  {['Quota', 'Shift'].map(h => (
                    <th key={h} style={{ ...thSub, background: 'rgba(107,18,18,0.05)' }}>{h}</th>
                  ))}
                  {/* Totals */}
                  {['Visitors', 'Total Price (₹)'].map(h => (
                    <th key={h} style={{ ...thSub, background: 'rgba(139,26,26,0.05)', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={17} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No records match the current filters.
                    </td>
                  </tr>
                ) : (
                  paged.map((r, i) => {
                    const rowBg = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                    const ss = getShiftStyle(r.shift)
                    return (
                      <tr key={r.bookingNumber + i}
                        style={{ background: rowBg, transition: 'background 0.12s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.03)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}>

                        {/* Sr.No — sticky */}
                        <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--maroon)', background: rowBg, position: 'sticky' as const, left: 0, zIndex: 2, borderRight: '2px solid var(--sand)' }}>
                          {(page - 1) * pageSize + i + 1}
                        </td>

                        {/* Booking Info */}
                        <td style={{ ...tdBase }}>
                          <span style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 600, fontFamily: 'monospace' }}>
                            {r.bookingNumber}
                          </span>
                        </td>
                        <td style={{ ...tdBase }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.bookingDate}</span>
                        </td>
                        <td style={{ ...tdBase, fontWeight: 500 }}>{r.visitDate}</td>
                        <td style={{ ...tdBase }}>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.emitraTransId}</span>
                        </td>

                        {/* Entry & Eco */}
                        <td style={{ ...tdNum, color: r.totalEntryFee > 0 ? '#1A7A6E' : undefined, fontWeight: r.totalEntryFee > 0 ? 600 : 400 }}>
                          {fmtINR(r.totalEntryFee)}
                        </td>
                        <td style={tdNum}>{fmtINR(r.totalEcoDev)}</td>
                        <td style={tdNum}>{fmtINR(r.totalTRDFFee)}</td>

                        {/* Vehicle */}
                        <td style={{ ...tdNum, color: r.vehicleRent > 0 ? '#C8922A' : undefined }}>{fmtINR(r.vehicleRent)}</td>
                        <td style={tdNum}>{fmtINR(r.vehicleGST)}</td>

                        {/* Guide */}
                        <td style={{ ...tdNum, color: r.guideFee > 0 ? '#5A3A1A' : undefined }}>{fmtINR(r.guideFee)}</td>
                        <td style={tdNum}>{fmtINR(r.guideGST)}</td>

                        {/* Trip Info */}
                        <td style={{ ...tdBase }}>
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 10, background: 'rgba(90,58,26,0.08)', color: '#5A3A1A' }}>
                            {r.quota}
                          </span>
                        </td>
                        <td style={{ ...tdBase }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 10, ...ss }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ss.dot, display: 'inline-block', flexShrink: 0 }} />
                            {r.shift}
                          </span>
                        </td>

                        {/* Totals */}
                        <td style={{ ...tdNum, fontWeight: 700, color: '#1A7A6E', fontSize: 13 }}>{r.totalVisitor}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: 'var(--maroon)', fontSize: 13, borderLeft: '2px solid var(--sand)' }}>
                          ₹{r.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })
                )}

                {/* ── Page total row ── */}
                {paged.length > 0 && (
                  <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                    <td colSpan={2} style={{ ...tdBase, position: 'sticky' as const, left: 0, zIndex: 2, background: 'var(--cream-dark)', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                      Page Total
                    </td>
                    <td colSpan={3} style={{ ...tdBase, fontSize: 11, color: 'var(--text-muted)' }}>
                      {paged.length} records
                    </td>
                    {/* Entry/Eco/TRDF */}
                    <td style={{ ...tdNum, fontWeight: 600, color: '#1A7A6E' }}>{pageTotals.entryFee > 0 ? `₹${pageTotals.entryFee.toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ ...tdNum }}>{pageTotals.ecoDev > 0 ? `₹${pageTotals.ecoDev.toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ ...tdNum }}>{pageTotals.trdf > 0 ? `₹${pageTotals.trdf.toLocaleString('en-IN')}` : '—'}</td>
                    {/* Vehicle */}
                    <td style={{ ...tdNum, fontWeight: 600, color: '#C8922A' }}>{`₹${pageTotals.vehicleRent.toLocaleString('en-IN')}`}</td>
                    <td style={{ ...tdNum }}>{`₹${pageTotals.vehicleGST.toLocaleString('en-IN')}`}</td>
                    {/* Guide */}
                    <td style={{ ...tdNum, fontWeight: 600, color: '#5A3A1A' }}>{`₹${pageTotals.guideFee.toLocaleString('en-IN')}`}</td>
                    <td style={{ ...tdNum }}>{pageTotals.guideGST > 0 ? `₹${pageTotals.guideGST.toLocaleString('en-IN')}` : '—'}</td>
                    {/* Trip / Totals */}
                    <td colSpan={2} style={tdBase} />
                    <td style={{ ...tdNum, fontWeight: 700, color: '#1A7A6E' }}>{pageTotals.visitors}</td>
                    <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: 'var(--maroon)', borderLeft: '2px solid var(--sand)' }}>
                      ₹{pageTotals.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                {/* ── Grand total row ── */}
                {paged.length > 0 && (
                  <tr style={{ background: 'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop: '1px solid var(--sand)' }}>
                    <td colSpan={2} style={{ ...tdBase, position: 'sticky' as const, left: 0, zIndex: 2, fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: 'var(--cream)' }}>
                      Grand Total
                    </td>
                    <td colSpan={3} style={{ ...tdBase, fontSize: 11, color: 'var(--text-muted)', background: 'transparent' }}>
                      All {filtered.length} records
                    </td>
                    <td style={{ ...tdNum, fontWeight: 600, color: '#1A7A6E' }}>{`₹${totals.entryFee.toLocaleString('en-IN')}`}</td>
                    <td style={{ ...tdNum }}>{totals.ecoDev > 0 ? `₹${totals.ecoDev.toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ ...tdNum }}>{totals.trdf > 0 ? `₹${totals.trdf.toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ ...tdNum, fontWeight: 600, color: '#C8922A' }}>{`₹${totals.vehicleRent.toLocaleString('en-IN')}`}</td>
                    <td style={{ ...tdNum }}>{`₹${totals.vehicleGST.toLocaleString('en-IN')}`}</td>
                    <td style={{ ...tdNum, fontWeight: 600, color: '#5A3A1A' }}>{`₹${totals.guideFee.toLocaleString('en-IN')}`}</td>
                    <td style={{ ...tdNum }}>{totals.guideGST > 0 ? `₹${totals.guideGST.toLocaleString('en-IN')}` : '—'}</td>
                    <td colSpan={2} style={tdBase} />
                    <td style={{ ...tdNum, fontWeight: 700, color: '#1A7A6E' }}>{totals.visitors}</td>
                    <td style={{ ...tdNum, fontWeight: 700, fontSize: 14, color: 'var(--maroon)', borderLeft: '2px solid var(--sand)', fontFamily: "'Cormorant Garamond',serif" }}>
                      ₹{totals.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>

            {/* Display data selector */}
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Display Data:</span>
              <div className="relative">
                <select value={String(filters.pageSize)}
                  onChange={e => { setFilters(f => ({ ...f, pageSize: Number(e.target.value) })); setPage(1) }}
                  className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                  style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Page buttons */}
            <div className="flex items-center gap-1">
              <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                icon={<><ChevronLeft size={12} /><span style={{ fontSize: 11 }}>Previous</span></>} />
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
              <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>} />
            </div>

            {/* Result count */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Result:{' '}
              <strong style={{ color: 'var(--text-dark)' }}>
                {filtered.length === 0 ? 0 : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`}
              </strong>{' '}of{' '}
              <strong style={{ color: 'var(--maroon)' }}>{totalResults}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
