'use client'

import { useState, useMemo } from 'react'
import {
  Download, Filter, Search, ChevronLeft, ChevronRight,
  X, ChevronDown, Calendar, CheckCircle2, XCircle, Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChoiceDifferenceRow {
  srNo:               number
  bookingDate:        string
  visitDate:          string
  transactionDate:    string
  placeName:          string
  bookingId:          string
  requestId:          string
  transactionId:      string
  choiceRequestId:    string
  differenceRequestId:string
  shift:              string
  zone:               string
  vehicleType:        string
  choiceVehicleNumber:string
  choiceGuideName:    string
  driverName:         string
  guideFee:           number | string
  paymentStatus:      'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED' | string
  migratedAmount:     number | string
  systemAmount:       number | string
  differenceAmount:   number | string
  totalAmount:        number
}

// ─── Sample data (from PDF + given keys) ─────────────────────────────────────

const SAMPLE_DATA: ChoiceDifferenceRow[] = [
  {
    srNo: 1,
    bookingDate: '2026-04-01 10:20:28', visitDate: '2026-04-01 00:00:00', transactionDate: '2026-04-01 10:29:50',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604011020286679', requestId: '[NAT2604011020286679]',
    transactionId: '260763146180', choiceRequestId: 'ON3V71945n856lh0', differenceRequestId: 'N/A',
    shift: 'Morning', zone: 'Full zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0023', choiceGuideName: 'B.L MEENA',
    driverName: 'B.L MEENA', guideFee: 'N/A', paymentStatus: 'SUCCESS',
    migratedAmount: 'N/A', systemAmount: 'N/A', differenceAmount: 'N/A', totalAmount: 1622.5,
  },
  {
    srNo: 2,
    bookingDate: '2026-04-01 10:53:00', visitDate: '2026-04-01 00:00:00', transactionDate: '2026-04-01 10:55:48',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604011053003708', requestId: '[NAT2604011053003708]',
    transactionId: '260763158290', choiceRequestId: 'PQ7K82034m967jp1', differenceRequestId: 'N/A',
    shift: 'Morning', zone: 'Full zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0024', choiceGuideName: 'R.K SHARMA',
    driverName: 'R.K SHARMA', guideFee: 'N/A', paymentStatus: 'SUCCESS',
    migratedAmount: 'N/A', systemAmount: 'N/A', differenceAmount: 'N/A', totalAmount: 1622.5,
  },
  {
    srNo: 3,
    bookingDate: '2026-04-01 11:05:32', visitDate: '2026-04-01 00:00:00', transactionDate: '2026-04-01 11:06:21',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604011105326845', requestId: '[NAT2604011105326845]',
    transactionId: '260763167401', choiceRequestId: 'LM9B53421k078kq2', differenceRequestId: 'DR0023-A',
    shift: 'Morning', zone: 'Half zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0025', choiceGuideName: 'S.P GUPTA',
    driverName: 'S.P GUPTA', guideFee: 200, paymentStatus: 'SUCCESS',
    migratedAmount: 1500, systemAmount: 1622.5, differenceAmount: 122.5, totalAmount: 1622.5,
  },
  {
    srNo: 4,
    bookingDate: '2026-04-01 11:01:18', visitDate: '2026-04-01 00:00:00', transactionDate: '2026-04-01 11:09:13',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604011101185009', requestId: '[NAT2604011101185009]',
    transactionId: '260763172512', choiceRequestId: 'XY4N96732p189mr3', differenceRequestId: 'N/A',
    shift: 'Evening', zone: 'Full zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0026', choiceGuideName: 'M.C VERMA',
    driverName: 'M.C VERMA', guideFee: 'N/A', paymentStatus: 'SUCCESS',
    migratedAmount: 'N/A', systemAmount: 'N/A', differenceAmount: 'N/A', totalAmount: 1622.5,
  },
  {
    srNo: 5,
    bookingDate: '2026-04-01 14:53:55', visitDate: '2026-04-01 00:00:00', transactionDate: '2026-04-01 14:54:37',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604011453555632', requestId: '[NAT2604011453555632]',
    transactionId: '260763189623', choiceRequestId: 'ZA6T10845q290ns4', differenceRequestId: 'N/A',
    shift: 'Evening', zone: 'Full zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0027', choiceGuideName: 'D.P TIWARI',
    driverName: 'D.P TIWARI', guideFee: 300, paymentStatus: 'PENDING',
    migratedAmount: 'N/A', systemAmount: 'N/A', differenceAmount: 'N/A', totalAmount: 1622.5,
  },
  {
    srNo: 6,
    bookingDate: '2026-04-02 08:14:22', visitDate: '2026-04-02 00:00:00', transactionDate: '2026-04-02 08:16:05',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604020814224891', requestId: '[NAT2604020814224891]',
    transactionId: '260763201734', choiceRequestId: 'BN8U22956r401ot5', differenceRequestId: 'DR0029-B',
    shift: 'Morning', zone: 'Full zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0028', choiceGuideName: 'K.L JAIN',
    driverName: 'K.L JAIN', guideFee: 250, paymentStatus: 'SUCCESS',
    migratedAmount: 1400, systemAmount: 1622.5, differenceAmount: 222.5, totalAmount: 1622.5,
  },
  {
    srNo: 7,
    bookingDate: '2026-04-02 09:33:47', visitDate: '2026-04-02 00:00:00', transactionDate: '2026-04-02 09:35:12',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604020933478102', requestId: '[NAT2604020933478102]',
    transactionId: '260763213845', choiceRequestId: 'CV0W34067s512pu6', differenceRequestId: 'N/A',
    shift: 'Morning', zone: 'Half zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0029', choiceGuideName: 'A.B SINGH',
    driverName: 'A.B SINGH', guideFee: 'N/A', paymentStatus: 'FAILED',
    migratedAmount: 'N/A', systemAmount: 'N/A', differenceAmount: 'N/A', totalAmount: 811.25,
  },
  {
    srNo: 8,
    bookingDate: '2026-04-02 11:48:03', visitDate: '2026-04-02 00:00:00', transactionDate: '2026-04-02 11:50:29',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604021148037413', requestId: '[NAT2604021148037413]',
    transactionId: '260763225956', choiceRequestId: 'DW1X45178t623qv7', differenceRequestId: 'N/A',
    shift: 'Morning', zone: 'Full zone', vehicleType: 'Motor Boat',
    choiceVehicleNumber: 'RJ25MB0001', choiceGuideName: 'P.Q SHARMA',
    driverName: 'P.Q SHARMA', guideFee: 350, paymentStatus: 'SUCCESS',
    migratedAmount: 'N/A', systemAmount: 'N/A', differenceAmount: 'N/A', totalAmount: 2100.0,
  },
  {
    srNo: 9,
    bookingDate: '2026-04-02 14:22:11', visitDate: '2026-04-02 00:00:00', transactionDate: '2026-04-02 14:24:45',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604021422119724', requestId: '[NAT2604021422119724]',
    transactionId: '260763238067', choiceRequestId: 'EX2Y56289u734rw8', differenceRequestId: 'DR0041-C',
    shift: 'Evening', zone: 'Full zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0030', choiceGuideName: 'G.H MEENA',
    driverName: 'G.H MEENA', guideFee: 200, paymentStatus: 'SUCCESS',
    migratedAmount: 1300, systemAmount: 1622.5, differenceAmount: 322.5, totalAmount: 1622.5,
  },
  {
    srNo: 10,
    bookingDate: '2026-04-02 16:05:38', visitDate: '2026-04-02 00:00:00', transactionDate: '2026-04-02 16:07:22',
    placeName: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    bookingId: 'NAT2604021605388135', requestId: '[NAT2604021605388135]',
    transactionId: '260763250178', choiceRequestId: 'FY3Z67390v845sx9', differenceRequestId: 'N/A',
    shift: 'Evening', zone: 'Full zone', vehicleType: 'Boat',
    choiceVehicleNumber: 'RJ25WB0031', choiceGuideName: 'I.J KUMAR',
    driverName: 'I.J KUMAR', guideFee: 'N/A', paymentStatus: 'REFUNDED',
    migratedAmount: 1622.5, systemAmount: 1622.5, differenceAmount: 0, totalAmount: 1622.5,
  },
]

// ─── Style maps ───────────────────────────────────────────────────────────────

const paymentStatusStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  SUCCESS:  { bg: 'rgba(26,122,110,0.12)',  color: '#1A7A6E', icon: <CheckCircle2 size={10} /> },
  FAILED:   { bg: 'rgba(229,62,62,0.1)',    color: '#E53E3E', icon: <XCircle size={10} />      },
  PENDING:  { bg: 'rgba(200,146,42,0.12)',  color: '#C8922A', icon: <Clock size={10} />         },
  REFUNDED: { bg: 'rgba(90,58,26,0.1)',     color: '#5A3A1A', icon: <CheckCircle2 size={10} />  },
}

const shiftStyle: Record<string, { bg: string; color: string }> = {
  Morning: { bg: 'rgba(200,146,42,0.1)',  color: '#C8922A' },
  Evening: { bg: 'rgba(107,18,18,0.09)', color: '#8B1A1A' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function naOrVal(v: number | string) {
  if (v === 'N/A' || v === '') return <span style={{ color: 'var(--text-muted)' }}>N/A</span>
  if (typeof v === 'number') return <>₹{v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
  return <>{v}</>
}

function truncate(s: string, n = 18) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ─── Small shared UI ──────────────────────────────────────────────────────────

function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string
  options: { v: string; l: string }[]; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>{label}</label>
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

// ─── Table style constants ────────────────────────────────────────────────────

const thGroup: React.CSSProperties = {
  padding: '6px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.7px', whiteSpace: 'nowrap' as const, textAlign: 'center' as const,
  borderRight: '2px solid rgba(255,255,255,0.18)',
}
const thSub: React.CSSProperties = {
  padding: '7px 10px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.55px', whiteSpace: 'nowrap' as const, color: 'var(--text-mid)',
  borderBottom: '2px solid var(--sand)', borderRight: '1px solid var(--sand)',
}
const tdBase: React.CSSProperties = { padding: '9px 10px', fontSize: 11, borderBottom: '1px solid var(--cream-dark)', verticalAlign: 'middle', whiteSpace: 'nowrap' as const }
const tdNum: React.CSSProperties  = { ...tdBase, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }

function Th({ label, group }: { label: string; group: string }) {
  const bg: Record<string, string> = {
    booking:    'rgba(139,26,26,0.05)',
    ids:        'rgba(107,18,18,0.05)',
    trip:       'rgba(26,122,110,0.05)',
    personnel:  'rgba(90,58,26,0.05)',
    amounts:    'rgba(200,146,42,0.06)',
  }
  return (
    <th style={{ ...thSub, background: bg[group] ?? 'var(--cream-dark)' }}>{label}</th>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ChoiceDifferenceReportViewProps {
  data?:          ChoiceDifferenceRow[]
  title?:         string
  totalResults?:  number
}

export default function ChoiceDifferenceReportView({
  data         = SAMPLE_DATA,
  title        = 'Choice And Difference Report',
  totalResults = 10,
}: ChoiceDifferenceReportViewProps) {

  const [searchBookingId, setSearchBookingId] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [page,            setPage]            = useState(1)
  const [filters, setFilters] = useState({
    shift:       '',
    zone:        '',
    vehicleType: '',
    status:      '',
    startDate:   '',
    endDate:     '',
    pageSize:    10,
  })

  const shifts       = Array.from(new Set(data.map(r => r.shift)))
  const zones        = Array.from(new Set(data.map(r => r.zone)))
  const vehicleTypes = Array.from(new Set(data.map(r => r.vehicleType)))

  const filtered = useMemo(() => data.filter(r => {
    if (searchBookingId) {
      const q = searchBookingId.toLowerCase()
      if (!r.bookingId.toLowerCase().includes(q) && !r.transactionId.toLowerCase().includes(q)) return false
    }
    if (filters.shift       && r.shift       !== filters.shift)       return false
    if (filters.zone        && r.zone        !== filters.zone)        return false
    if (filters.vehicleType && r.vehicleType !== filters.vehicleType) return false
    if (filters.status      && r.paymentStatus !== filters.status)    return false
    return true
  }), [data, searchBookingId, filters])

  const pageSize   = filters.pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  const grandTotalAmt   = useMemo(() => filtered.reduce((s, r) => s + r.totalAmount, 0), [filtered])
  const pageTotalAmt    = paged.reduce((s, r) => s + r.totalAmount, 0)
  const activeFilters   = [filters.shift, filters.zone, filters.vehicleType, filters.status, filters.startDate, filters.endDate].filter(Boolean).length

  const successCount  = filtered.filter(r => r.paymentStatus === 'SUCCESS').length
  const diffCount     = filtered.filter(r => r.differenceRequestId !== 'N/A' && r.differenceRequestId !== '').length

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Inventory Reports · Choice & Difference Tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Booking ID search — matches PDF */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 250 }}>
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
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center text-white font-bold"
                style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}>{activeFilters}</span>
            )}
          </button>

          {/* Export */}
          <button className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
            <Download size={13} />Export
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

          <FilterSelect label="Shift" value={filters.shift}
            options={[{ v: '', l: 'All Shifts' }, ...shifts.map(s => ({ v: s, l: s }))]}
            onChange={v => { setFilters(f => ({ ...f, shift: v })); setPage(1) }} />

          <FilterSelect label="Zone" value={filters.zone}
            options={[{ v: '', l: 'All Zones' }, ...zones.map(z => ({ v: z, l: z }))]}
            onChange={v => { setFilters(f => ({ ...f, zone: v })); setPage(1) }} />

          <FilterSelect label="Vehicle Type" value={filters.vehicleType}
            options={[{ v: '', l: 'All Types' }, ...vehicleTypes.map(v => ({ v, l: v }))]}
            onChange={v => { setFilters(f => ({ ...f, vehicleType: v })); setPage(1) }} />

          <FilterSelect label="Payment Status" value={filters.status}
            options={[
              { v: '', l: 'All Status' },
              { v: 'SUCCESS',  l: 'Success'  },
              { v: 'FAILED',   l: 'Failed'   },
              { v: 'PENDING',  l: 'Pending'  },
              { v: 'REFUNDED', l: 'Refunded' },
            ]}
            onChange={v => { setFilters(f => ({ ...f, status: v })); setPage(1) }} />

          <FilterSelect label="Rows / Page" value={String(filters.pageSize)}
            options={[10, 25, 50, 100].map(n => ({ v: String(n), l: String(n) }))}
            onChange={v => { setFilters(f => ({ ...f, pageSize: Number(v) })); setPage(1) }} />

          <button onClick={() => setShowFilterPanel(false)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'var(--maroon)' }}>Apply</button>

          <button onClick={() => { setFilters(f => ({ ...f, shift: '', zone: '', vehicleType: '', status: '', startDate: '', endDate: '' })); setPage(1) }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' }}>
            <X size={11} /> Reset
          </button>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
        {[
          { label: 'Total Records',    val: filtered.length.toString(),                                                                    icon: '📋', color: 'var(--maroon)', bg: '#fff', white: false },
          { label: 'Grand Total',      val: '₹' + grandTotalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: '₹', color: 'var(--maroon)', bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true },
          { label: 'Successful',       val: successCount.toString(),                                                                       icon: '✅', color: '#1A7A6E',       bg: '#fff', white: false },
          { label: 'With Difference',  val: diffCount.toString(),                                                                          icon: '⚖️', color: '#C8922A',       bg: '#fff', white: false },
          { label: 'Failed / Pending', val: filtered.filter(r => r.paymentStatus === 'FAILED' || r.paymentStatus === 'PENDING').length.toString(), icon: '⚠️', color: '#E53E3E', bg: '#fff', white: false },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
            style={{ background: s.bg, border: s.white ? 'none' : '1px solid var(--sand)' }}>
            {s.white && <div style={{ position: 'absolute', top: -24, right: -24, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
            <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 10, color: s.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: s.white ? '#fff' : s.color, lineHeight: 1.1 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1800 }}>
              <thead>
                {/* ── Group row ── */}
                <tr>
                  {/* Sr.No sticky */}
                  <th rowSpan={2} style={{ ...thGroup, width: 48, background: 'var(--maroon)', color: '#fff', textAlign: 'center', position: 'sticky' as const, left: 0, zIndex: 3, borderRight: '2px solid rgba(255,255,255,0.2)' }}>
                    Sr.
                  </th>
                  <th colSpan={3} style={{ ...thGroup, background: '#8B1A1A', color: '#fff' }}>Booking Dates</th>
                  <th colSpan={1} style={{ ...thGroup, background: '#7A1515', color: '#fff' }}>Place</th>
                  <th colSpan={5} style={{ ...thGroup, background: '#6B1212', color: '#fff' }}>IDs & References</th>
                  <th colSpan={3} style={{ ...thGroup, background: '#1A7A6E', color: '#fff' }}>Trip Details</th>
                  <th colSpan={3} style={{ ...thGroup, background: '#5A3A1A', color: '#fff' }}>Personnel</th>
                  <th colSpan={5} style={{ ...thGroup, background: '#C8922A', color: '#fff' }}>Amounts & Status</th>
                </tr>

                {/* ── Sub-column row ── */}
                <tr style={{ background: 'var(--cream-dark)' }}>
                  {/* Dates */}
                  {['Booking Date', 'Visit Date', 'Transaction Date'].map(h => <Th key={h} label={h} group="booking" />)}
                  {/* Place */}
                  <Th label="Place Name" group="booking" />
                  {/* IDs */}
                  {['Booking ID', 'Request ID', 'Transaction ID', 'Choice Req. ID', 'Diff. Req. ID'].map(h => <Th key={h} label={h} group="ids" />)}
                  {/* Trip */}
                  {['Shift', 'Zone', 'Vehicle Type'].map(h => <Th key={h} label={h} group="trip" />)}
                  {/* Personnel */}
                  {['Veh. Number', 'Guide / Choice', 'Driver'].map(h => <Th key={h} label={h} group="personnel" />)}
                  {/* Amounts */}
                  {['Guide Fee', 'Payment Status', 'Migrated Amt', 'System Amt', 'Diff. Amt'].map(h => <Th key={h} label={h} group="amounts" />)}
                  {/* Total — special */}
                  <th style={{ ...thSub, background: 'rgba(139,26,26,0.07)', fontWeight: 700 }}>Total (₹)</th>
                </tr>
              </thead>

              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={22} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No records match the current filters.
                    </td>
                  </tr>
                ) : (
                  paged.map((r, i) => {
                    const rowBg = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                    const pss   = paymentStatusStyle[r.paymentStatus] ?? paymentStatusStyle.PENDING
                    const ss    = shiftStyle[r.shift] ?? { bg: 'rgba(26,122,110,0.09)', color: '#1A7A6E' }
                    const hasDiff = r.differenceRequestId !== 'N/A' && r.differenceRequestId !== ''

                    return (
                      <tr key={r.bookingId + i}
                        style={{ background: rowBg, transition: 'background 0.12s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.03)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}>

                        {/* Sr.No — sticky */}
                        <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--maroon)', background: rowBg, position: 'sticky' as const, left: 0, zIndex: 2, borderRight: '2px solid var(--sand)' }}>
                          {(page - 1) * pageSize + i + 1}
                        </td>

                        {/* Dates */}
                        <td style={tdBase}><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.bookingDate}</span></td>
                        <td style={tdBase}><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.visitDate}</span></td>
                        <td style={tdBase}><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.transactionDate}</span></td>

                        {/* Place */}
                        <td style={{ ...tdBase, maxWidth: 180 }}>
                          <span className="font-serif font-semibold" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }} title={r.placeName}>
                            {truncate(r.placeName, 22)}
                          </span>
                        </td>

                        {/* IDs */}
                        <td style={tdBase}>
                          <span style={{ fontSize: 10, color: 'var(--maroon)', fontWeight: 600, fontFamily: 'monospace' }}>{r.bookingId}</span>
                        </td>
                        <td style={tdBase}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{truncate(r.requestId, 20)}</span>
                        </td>
                        <td style={tdBase}>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-mid)' }}>{r.transactionId}</span>
                        </td>
                        <td style={tdBase}>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{truncate(r.choiceRequestId, 16)}</span>
                        </td>
                        <td style={tdBase}>
                          {hasDiff
                            ? <span className="rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 10, background: 'rgba(200,146,42,0.12)', color: '#C8922A' }}>{r.differenceRequestId}</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>N/A</span>
                          }
                        </td>

                        {/* Trip */}
                        <td style={tdBase}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 10, ...ss }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ss.color, display: 'inline-block', flexShrink: 0 }} />
                            {r.shift}
                          </span>
                        </td>
                        <td style={tdBase}>
                          <span className="rounded-full px-2 py-0.5 font-medium" style={{ fontSize: 10, background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
                            {r.zone}
                          </span>
                        </td>
                        <td style={tdBase}>
                          <span className="rounded-full px-2 py-0.5 font-medium" style={{ fontSize: 10, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}>
                            {r.vehicleType}
                          </span>
                        </td>

                        {/* Personnel */}
                        <td style={tdBase}>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 500 }}>{r.choiceVehicleNumber}</span>
                        </td>
                        <td style={tdBase}><span style={{ fontSize: 11 }}>{r.choiceGuideName}</span></td>
                        <td style={tdBase}><span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{r.driverName}</span></td>

                        {/* Amounts & Status */}
                        <td style={{ ...tdNum }}>{naOrVal(r.guideFee)}</td>
                        <td style={{ ...tdBase, textAlign: 'center' as const }}>
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold" style={{ fontSize: 10, ...pss }}>
                            {pss.icon}
                            {r.paymentStatus}
                          </span>
                        </td>
                        <td style={{ ...tdNum, color: r.migratedAmount !== 'N/A' ? '#1A7A6E' : undefined }}>{naOrVal(r.migratedAmount)}</td>
                        <td style={{ ...tdNum, color: r.systemAmount !== 'N/A' ? '#C8922A' : undefined }}>{naOrVal(r.systemAmount)}</td>
                        <td style={{ ...tdNum, color: r.differenceAmount !== 'N/A' && r.differenceAmount !== 0 ? '#E53E3E' : undefined, fontWeight: r.differenceAmount !== 'N/A' ? 600 : 400 }}>
                          {naOrVal(r.differenceAmount)}
                        </td>
                        <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: 'var(--maroon)', borderLeft: '2px solid var(--sand)' }}>
                          ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })
                )}

                {/* Page total */}
                {paged.length > 0 && (
                  <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                    <td style={{ ...tdBase, position: 'sticky' as const, left: 0, zIndex: 2, background: 'var(--cream-dark)', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', borderRight: '2px solid var(--sand)' }}>
                      Page Total
                    </td>
                    <td colSpan={19} style={{ ...tdBase, fontSize: 11, color: 'var(--text-muted)' }}>
                      {paged.length} records
                    </td>
                    <td style={{ ...tdNum, fontWeight: 700, fontSize: 13, color: 'var(--maroon)', borderLeft: '2px solid var(--sand)' }}>
                      ₹{pageTotalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                {/* Grand total */}
                {paged.length > 0 && (
                  <tr style={{ background: 'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop: '1px solid var(--sand)' }}>
                    <td style={{ ...tdBase, position: 'sticky' as const, left: 0, zIndex: 2, fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: 'var(--cream)', borderRight: '2px solid var(--sand)' }}>
                      Grand Total
                    </td>
                    <td colSpan={19} style={{ ...tdBase, fontSize: 11, color: 'var(--text-muted)' }}>
                      All {filtered.length} records
                    </td>
                    <td style={{ ...tdNum, fontWeight: 700, fontSize: 14, color: 'var(--maroon)', borderLeft: '2px solid var(--sand)', fontFamily: "'Cormorant Garamond',serif" }}>
                      ₹{grandTotalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>

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
              {totalPages > 5 && page < totalPages - 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
              {totalPages > 5 && <PageBtn onClick={() => setPage(totalPages)} active={page === totalPages} label={String(totalPages)} />}
              <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>} />
            </div>

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
