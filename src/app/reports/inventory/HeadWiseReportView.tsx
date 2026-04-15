'use client'

import { useState, useMemo } from 'react'
import { Download, Filter, Search, ChevronLeft, ChevronRight, X, ChevronDown, Calendar } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadWiseRow {
  srNo:        number
  emitraId:    number | string
  name:        string
  amount:      number
}

// ─── Sample Data (from PDF) ───────────────────────────────────────────────────

const SAMPLE_DATA: HeadWiseRow[] = [
  { srNo: 1, emitraId: 879,  name: 'DEPARTMENT CHARGES',       amount: 1252137 },
  { srNo: 2, emitraId: 6342, name: 'Member Entry Fee',          amount: 175915  },
  { srNo: 3, emitraId: 6363, name: 'Member Eco-surcharge',      amount: 220345  },
  { srNo: 4, emitraId: 6362, name: 'Vehicle Entry Fee',         amount: 32963   },
  { srNo: 5, emitraId: 6364, name: 'Vehicle Eco-surcharge',     amount: 87255   },
  { srNo: 6, emitraId: 5822, name: 'RISL CHARGES FOR FOREST',   amount: 43343   },
]

// ─── Head category config (colour-code by fee type) ──────────────────────────

const HEAD_CATEGORY: Record<string, { bg: string; color: string; icon: string }> = {
  'DEPARTMENT CHARGES':       { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A', icon: '🏛️' },
  'Member Entry Fee':          { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E', icon: '👥' },
  'Member Eco-surcharge':      { bg: 'rgba(90,138,58,0.1)',   color: '#5A8A3A', icon: '🌿' },
  'Vehicle Entry Fee':         { bg: 'rgba(200,146,42,0.12)', color: '#C8922A', icon: '🚗' },
  'Vehicle Eco-surcharge':     { bg: 'rgba(90,138,58,0.1)',   color: '#5A8A3A', icon: '🌿' },
  'RISL CHARGES FOR FOREST':   { bg: 'rgba(107,18,18,0.1)',   color: '#6B1212', icon: '📋' },
}

function getCategory(name: string) {
  return HEAD_CATEGORY[name] ?? { bg: 'rgba(90,58,26,0.08)', color: '#5A3A1A', icon: '💰' }
}

// ─── Filter / UI helpers ──────────────────────────────────────────────────────

interface FilterState {
  search:      string
  paymentType: string
  startDate:   string
  endDate:     string
  place:       string
  pageSize:    number
}

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
      className="rounded-lg flex items-center justify-center font-medium"
      style={{
        width: 28, height: 28, fontSize: 11,
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

interface HeadWiseReportViewProps {
  data?:         HeadWiseRow[]
  title?:        string
  totalResults?: number
}

export default function HeadWiseReportView({
  data = SAMPLE_DATA,
  title = 'Head Wise Report',
  totalResults,
}: HeadWiseReportViewProps) {
  const [filters, setFilters] = useState<FilterState>({
    search:      '',
    paymentType: 'ALL',
    startDate:   '2026-04-01',
    endDate:     '2026-04-13',
    place:       'Jhalana/amagarh Leopard Conservation Reserve',
    pageSize:    10,
  })
  const [page, setPage]                   = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Filtered rows
  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          String(r.emitraId).includes(q)
        )
      }
      return true
    })
  }, [data, filters.search])

  const pageSize   = filters.pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Totals
  const grandTotal = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered])
  const pageTotal  = paged.reduce((s, r) => s + r.amount, 0)
  const maxAmount  = Math.max(...data.map(r => r.amount), 1)

  const clearFilters = () => {
    setFilters(f => ({ ...f, search: '', paymentType: 'ALL' }))
    setPage(1)
  }

  const PLACES = Array.from(new Set(data.map(() => 'Jhalana/amagarh Leopard Conservation Reserve')))

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
            Inventory Reports · Fee Head Summary
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
              placeholder="Search head name / Emitra ID…"
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 12, color: 'var(--text-dark)' }}
            />
            {filters.search && (
              <button onClick={() => setFilters(f => ({ ...f, search: '' }))}>
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
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

      {/* ── Active filter strip (always visible) ─────────────── */}
      <div
        className="flex items-center gap-6 px-6 py-2.5 flex-wrap"
        style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}
      >
        {[
          { label: 'Start Date',    val: filters.startDate   ? new Date(filters.startDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
          { label: 'End Date',      val: filters.endDate     ? new Date(filters.endDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
          { label: 'Place',         val: filters.place.length > 28 ? filters.place.slice(0, 28) + '…' : filters.place },
          { label: 'Payment Type',  val: filters.paymentType },
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
          <DateInput
            label="Start Date"
            value={filters.startDate}
            onChange={v => { setFilters(f => ({ ...f, startDate: v })); setPage(1) }}
          />
          <DateInput
            label="End Date"
            value={filters.endDate}
            onChange={v => { setFilters(f => ({ ...f, endDate: v })); setPage(1) }}
          />

          {/* Place */}
          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 200 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Place
            </label>
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
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' }}
          >
            <X size={11} /> Reset
          </button>
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────── */}
      <div
        className="grid grid-cols-4 gap-3 px-6 py-4"
        style={{ background: 'var(--cream)' }}
      >
        {/* Total Heads */}
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
          <div className="flex items-center justify-center rounded-xl text-2xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(139,26,26,0.07)' }}>
            📑
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Heads</div>
            <div className="font-serif font-bold" style={{ fontSize: 26, color: 'var(--maroon)', lineHeight: 1.1 }}>
              {filtered.length}
            </div>
          </div>
        </div>

        {/* Grand Total Amount */}
        <div
          className="rounded-xl px-4 py-3 col-span-2 flex items-center gap-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)', color: '#fff' }}
        >
          <div className="absolute right-0 top-0 pointer-events-none" style={{ width: 80, height: 80, marginTop: -24, marginRight: -24, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
          <div className="flex items-center justify-center rounded-xl text-2xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)' }}>
            ₹
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>Grand Total Amount (Filtered)</div>
            <div className="font-serif font-bold" style={{ fontSize: 26, lineHeight: 1.1 }}>
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Highest Head */}
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
          <div className="flex items-center justify-center rounded-xl text-2xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(200,146,42,0.1)' }}>
            🏆
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Highest Head</div>
            <div className="font-serif font-bold" style={{ fontSize: 14, color: 'var(--gold)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {filtered.sort((a, b) => b.amount - a.amount)[0]?.name ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {[
                  { label: 'Sr.No',        w: 64,   align: 'center' as const },
                  { label: 'Emitra Id',    w: 110,  align: 'left'   as const },
                  { label: 'Name',         w: 'auto', align: 'left' as const },
                  { label: 'Share %',      w: 160,  align: 'left'   as const },
                  { label: 'Amount (INR)', w: 160,  align: 'right'  as const },
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
                      width: col.w === 'auto' ? undefined : col.w,
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
                  <td
                    colSpan={5}
                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}
                  >
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                paged.map((r, i) => {
                  const cat    = getCategory(r.name)
                  const pct    = ((r.amount / grandTotal) * 100).toFixed(1)
                  const barPct = (r.amount / maxAmount) * 100
                  const rowBg  = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.6)'

                  return (
                    <tr
                      key={r.srNo}
                      style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.03)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}
                    >
                      {/* Sr.No */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--maroon)', borderRight: '1px solid var(--cream-dark)' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>

                      {/* Emitra ID */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <span
                          className="rounded-lg px-2.5 py-1 font-semibold"
                          style={{ fontSize: 12, background: 'var(--cream-dark)', color: 'var(--text-mid)', fontFamily: 'monospace' }}
                        >
                          {r.emitraId}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex items-center justify-center rounded-lg flex-shrink-0 text-sm"
                            style={{ width: 32, height: 32, background: cat.bg }}
                          >
                            {cat.icon}
                          </span>
                          <div>
                            <div
                              className="font-serif font-semibold"
                              style={{ fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.3 }}
                            >
                              {r.name}
                            </div>
                            <div
                              className="rounded-full px-2 py-0.5 inline-block font-medium mt-0.5"
                              style={{ fontSize: 9, background: cat.bg, color: cat.color }}
                            >
                              Emitra #{r.emitraId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Share bar */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: 'var(--cream-dark)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${barPct}%`,
                                background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)`,
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: cat.color, fontWeight: 600, minWidth: 38, textAlign: 'right' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div
                          className="font-serif font-bold"
                          style={{ fontSize: 17, color: 'var(--maroon)', lineHeight: 1 }}
                        >
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

              {/* ── Grand total footer row ── */}
              {paged.length > 0 && (
                <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                  <td
                    colSpan={2}
                    style={{
                      padding: '11px 16px',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      color: 'var(--maroon)',
                    }}
                  >
                    Page Total
                  </td>
                  <td
                    colSpan={2}
                    style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)' }}
                  >
                    {paged.length} head{paged.length !== 1 ? 's' : ''}
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      textAlign: 'right',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--maroon)',
                    }}
                  >
                    ₹{pageTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {/* Grand total (all filtered data) */}
              {paged.length > 0 && totalPages > 1 && (
                <tr
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,26,26,0.05), rgba(200,146,42,0.05))',
                    borderTop: '1px solid var(--sand)',
                  }}
                >
                  <td
                    colSpan={2}
                    style={{
                      padding: '11px 16px',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      color: 'var(--maroon)',
                    }}
                  >
                    Grand Total
                  </td>
                  <td
                    colSpan={2}
                    style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)' }}
                  >
                    All {filtered.length} heads
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      textAlign: 'right',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'var(--maroon)',
                    }}
                  >
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
                  if      (page <= 3)                p = i + 1
                  else if (page >= totalPages - 2)   p = totalPages - 4 + i
                  else                               p = page - 2 + i
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
                {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
              </strong>{' '}
              of{' '}
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
