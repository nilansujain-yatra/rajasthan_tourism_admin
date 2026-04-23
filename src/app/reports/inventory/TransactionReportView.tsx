'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Download, Filter, Search, ChevronLeft, ChevronRight,
  X, ChevronDown, Calendar, MoreVertical,
  CheckCircle2, Clock, XCircle, RefreshCcw, Landmark,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionRow {
  srNo:         number
  bookingDate:  string
  bookingId:    string
  consumerKey:  string
  userName:     string
  totalAmount:  number
  refundStatus: string
}

// ─── Refund status config ─────────────────────────────────────────────────────

const REFUND_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  'Pending for Refund': { bg: 'rgba(200,146,42,0.12)', color: '#C8922A', icon: <Clock size={10} />         },
  'Refunded':           { bg: 'rgba(26,122,110,0.12)',  color: '#1A7A6E', icon: <CheckCircle2 size={10} />  },
  'Failed':             { bg: 'rgba(229,62,62,0.1)',    color: '#E53E3E', icon: <XCircle size={10} />       },
  'Processing':         { bg: 'rgba(107,18,18,0.1)',    color: '#8B1A1A', icon: <RefreshCcw size={10} />    },
}
function getRefundStyle(s: string) {
  return REFUND_STYLE[s] ?? REFUND_STYLE['Pending for Refund']
}

// ─── Sample data (from PDF) ───────────────────────────────────────────────────

const SAMPLE_DATA: TransactionRow[] = [
  { srNo:1,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'JHA2604221241118987',   consumerKey:'JHA2604221241118987',   userName:'Shashwat Choudhary',  totalAmount:881.08,  refundStatus:'Pending for Refund' },
  { srNo:2,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'COM2604221215534595',   consumerKey:'COM2604221215534595',   userName:'Ram Bharsalde',       totalAmount:1080,    refundStatus:'Pending for Refund' },
  { srNo:3,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'JHA2604221021044547',   consumerKey:'JHA2604221021044547',   userName:'Diana Apostolova',    totalAmount:2182.81, refundStatus:'Pending for Refund' },
  { srNo:4,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'HAW2604221018521086',   consumerKey:'HAW2604221018521086',   userName:'Valentina Cuelli',    totalAmount:600,     refundStatus:'Pending for Refund' },
  { srNo:5,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'COM2604220958178146',   consumerKey:'COM2604220958178146',   userName:'Arya Niwas',          totalAmount:3950,    refundStatus:'Pending for Refund' },
  { srNo:6,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'AMB2604220920093015',   consumerKey:'AMB2604220920093015',   userName:'Paraskevi Kaklidou',  totalAmount:2000,    refundStatus:'Pending for Refund' },
  { srNo:7,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'AMB2604220910323150',   consumerKey:'AMB2604220910323150',   userName:'Paraskevi Kaklidou',  totalAmount:2000,    refundStatus:'Pending for Refund' },
  { srNo:8,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'JHA2604221133447821',   consumerKey:'JHA2604221133447821',   userName:'Ramesh Agarwal',      totalAmount:1500,    refundStatus:'Refunded'           },
  { srNo:9,  bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'KUM2604220845226903',   consumerKey:'KUM2604220845226903',   userName:'Pooja Mehra',         totalAmount:975.5,   refundStatus:'Processing'         },
  { srNo:10, bookingDate:'22-04-2026 | 12:00:00 AM', bookingId:'NAT2604221059883412',   consumerKey:'NAT2604221059883412',   userName:'James Whitfield',     totalAmount:4200,    refundStatus:'Failed'             },
]

// ─── Action menu items ────────────────────────────────────────────────────────

interface ActionItem { label: string; icon: React.ReactNode; color?: string; onClick: (row: TransactionRow) => void }
const ACTION_ITEMS: ActionItem[] = [
  {
    label: 'Apply E-mitra',
    icon: <Landmark size={13} />,
    color: '#1A7A6E',
    onClick: (row) => alert(`Apply E-mitra for: ${row.bookingId}`),
  },
  {
    label: 'View Details',
    icon: <Search size={13} />,
    onClick: (row) => alert(`View: ${row.bookingId}`),
  },
  {
    label: 'Mark Refunded',
    icon: <CheckCircle2 size={13} />,
    color: '#1A7A6E',
    onClick: (row) => alert(`Mark refunded: ${row.bookingId}`),
  },
]

// ─── Action dropdown ──────────────────────────────────────────────────────────

function ActionMenu({ row }: { row: TransactionRow }) {
  const [open, setOpen]   = useState(false)
  const menuRef           = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="flex items-center justify-center rounded-lg transition-colors"
        style={{
          width: 30, height: 30,
          background: open ? 'var(--cream-dark)' : 'transparent',
          border: `1px solid ${open ? 'var(--sand)' : 'transparent'}`,
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cream-dark)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--sand)' }}
        onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' } }}
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: '110%', zIndex: 50,
            background: '#fff',
            border: '1px solid var(--sand)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(139,26,26,0.12)',
            minWidth: 180,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Menu header */}
          <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--cream-dark)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
              Actions
            </div>
            <div style={{ fontSize: 10, color: 'var(--maroon)', fontFamily: 'monospace', marginTop: 2, fontWeight: 500 }}>
              {row.bookingId.slice(0, 18)}…
            </div>
          </div>

          {/* Items */}
          {ACTION_ITEMS.map((item, idx) => (
            <button
              key={item.label}
              onClick={e => { e.stopPropagation(); item.onClick(row); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors"
              style={{
                fontSize: 12,
                color: item.color ?? 'var(--text-dark)',
                borderBottom: idx < ACTION_ITEMS.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--cream)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <span style={{ color: item.color ?? 'var(--text-muted)', flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {/* Highlight "Apply E-mitra" as primary */}
              {item.label === 'Apply E-mitra' && (
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5 font-semibold"
                  style={{ fontSize: 8, background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}
                >
                  Primary
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pagination button ────────────────────────────────────────────────────────

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

// ─── Main Component ────────────────────────────────────────────────────────────

interface TransactionReportViewProps {
  data?:         TransactionRow[]
  title?:        string
  totalResults?: number
}

export default function TransactionReportView({
  data         = SAMPLE_DATA,
  title        = 'Transaction Report',
  totalResults = 2428,
}: TransactionReportViewProps) {

  const [searchBookingId, setSearchBookingId] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [page,            setPage]            = useState(1)
  const [filters, setFilters] = useState({
    refundStatus: '',
    startDate:    '',
    endDate:      '',
    pageSize:     10,
  })

  const filtered = useMemo(() => data.filter(r => {
    if (searchBookingId) {
      const q = searchBookingId.toLowerCase()
      if (!r.bookingId.toLowerCase().includes(q) &&
          !r.consumerKey.toLowerCase().includes(q) &&
          !r.userName.toLowerCase().includes(q)) return false
    }
    if (filters.refundStatus && r.refundStatus !== filters.refundStatus) return false
    return true
  }), [data, searchBookingId, filters])

  const pageSize   = filters.pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  const grandTotal    = useMemo(() => filtered.reduce((s, r) => s + r.totalAmount, 0), [filtered])
  const pendingCount  = filtered.filter(r => r.refundStatus === 'Pending for Refund').length
  const refundedCount = filtered.filter(r => r.refundStatus === 'Refunded').length

  const thStyle: React.CSSProperties = {
    padding: '11px 16px', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: '0.8px',
    color: 'var(--text-muted)', textAlign: 'left' as const,
    borderRight: '1px solid var(--sand)', whiteSpace: 'nowrap' as const,
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Inventory Reports · Refund & Transaction Status
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Booking ID search */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 260 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={searchBookingId}
              onChange={e => { setSearchBookingId(e.target.value); setPage(1) }}
              placeholder="Search with Booking Id"
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 12, color: 'var(--text-dark)' }} />
            {searchBookingId && (
              <button onClick={() => setSearchBookingId('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>
            )}
          </div>

          {/* Filter */}
          <button onClick={() => setShowFilterPanel(v => !v)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
            style={{ fontSize: 12, background: showFilterPanel ? 'var(--maroon)' : 'var(--cream-dark)', border: '1px solid ' + (showFilterPanel ? 'var(--maroon)' : 'var(--sand)'), color: showFilterPanel ? '#fff' : 'var(--text-mid)' }}>
            <Filter size={13} />
            Filter
            {showFilterPanel && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: '#E53E3E' }} />}
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

          {/* Refund status filter */}
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>Refund Status</label>
            <div className="relative">
              <select value={filters.refundStatus}
                onChange={e => { setFilters(f => ({ ...f, refundStatus: e.target.value })); setPage(1) }}
                className="appearance-none rounded-xl pr-7 pl-3 py-2 outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 170 }}>
                <option value="">All Statuses</option>
                <option value="Pending for Refund">Pending for Refund</option>
                <option value="Refunded">Refunded</option>
                <option value="Processing">Processing</option>
                <option value="Failed">Failed</option>
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Rows per page */}
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>Rows / Page</label>
            <div className="relative">
              <select value={String(filters.pageSize)}
                onChange={e => { setFilters(f => ({ ...f, pageSize: Number(e.target.value) })); setPage(1) }}
                className="appearance-none rounded-xl pr-7 pl-3 py-2 outline-none"
                style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 90 }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button onClick={() => setShowFilterPanel(false)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'var(--maroon)' }}>Apply</button>
          <button onClick={() => { setFilters(f => ({ ...f, refundStatus: '', startDate: '', endDate: '' })); setPage(1) }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' }}>
            <X size={11} /> Reset
          </button>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
        {[
          { label: 'Total Records',     val: filtered.length.toLocaleString('en-IN'),                                                                 icon: '📋', color: 'var(--maroon)', bg: '#fff',    white: false },
          { label: 'Grand Total',       val: '₹' + grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),         icon: '₹',  color: 'var(--maroon)', bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true  },
          { label: 'Pending Refund',    val: pendingCount.toLocaleString('en-IN'),                                                                      icon: '⏳', color: '#C8922A',       bg: '#fff',    white: false },
          { label: 'Refunded',          val: refundedCount.toLocaleString('en-IN'),                                                                     icon: '✅', color: '#1A7A6E',       bg: '#fff',    white: false },
          { label: 'Failed / Other',    val: filtered.filter(r => r.refundStatus === 'Failed' || r.refundStatus === 'Processing').length.toString(),    icon: '⚠️', color: '#E53E3E',       bg: '#fff',    white: false },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
            style={{ background: s.bg, border: s.white ? 'none' : '1px solid var(--sand)' }}>
            {s.white && <div style={{ position: 'absolute', top: -24, right: -24, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
            <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: s.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: s.white ? '#fff' : s.color, lineHeight: 1.1 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff' }}>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {/* Sr.No */}
                <th style={{ ...thStyle, width: 52, textAlign: 'center', background: 'var(--maroon)', color: 'rgba(255,255,255,0.85)', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                  Sr.
                </th>
                <th style={thStyle}>Booking Date</th>
                <th style={thStyle}>Booking ID</th>
                <th style={thStyle}>Consumer Key</th>
                <th style={thStyle}>User Name</th>
                <th style={{ ...thStyle, textAlign: 'right' as const }}>Total Amount</th>
                <th style={thStyle}>Refund Status</th>
                {/* Action — no right border */}
                <th style={{ ...thStyle, textAlign: 'center' as const, width: 60, borderRight: 'none' }}>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                paged.map((r, i) => {
                  const rowBg = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                  const rs    = getRefundStyle(r.refundStatus)
                  return (
                    <tr key={r.bookingId + i}
                      style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.025)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}>

                      {/* Sr.No */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--maroon)', borderRight: '2px solid var(--sand)' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>

                      {/* Booking Date */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.bookingDate}</span>
                      </td>

                      {/* Booking ID */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <span style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 600, fontFamily: 'monospace' }}>
                          {r.bookingId}
                        </span>
                      </td>

                      {/* Consumer Key */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {r.consumerKey}
                        </span>
                      </td>

                      {/* User Name */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0"
                            style={{ width: 28, height: 28, background: 'var(--maroon)', fontSize: 10 }}
                          >
                            {r.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium" style={{ fontSize: 13 }}>{r.userName}</span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--maroon)' }}>
                          ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Refund Status */}
                      <td style={{ padding: '12px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                          style={{ fontSize: 11, ...rs }}
                        >
                          {rs.icon}
                          {r.refundStatus}
                        </span>
                      </td>

                      {/* Action — three-dot menu */}
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <ActionMenu row={r} />
                      </td>
                    </tr>
                  )
                })
              )}

              {/* Page total row */}
              {paged.length > 0 && (
                <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                  <td colSpan={5} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                    Page Total — {paged.length} records
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>
                    ₹{paged.reduce((s, r) => s + r.totalAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} style={{ padding: '11px 16px' }} />
                </tr>
              )}

              {/* Grand total row */}
              {paged.length > 0 && (
                <tr style={{ background: 'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop: '1px solid var(--sand)' }}>
                  <td colSpan={5} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                    Grand Total — All {filtered.length} records
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: 'var(--maroon)' }}>
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} style={{ padding: '11px 16px' }} />
                </tr>
              )}
            </tbody>
          </table>

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
