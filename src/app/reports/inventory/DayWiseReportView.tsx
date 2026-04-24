'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Download, Search, X, ChevronDown, Calendar,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  MapPin, Building2, CheckCircle2, TrendingUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayWiseRow {
  srNo:           number
  placeName:      string
  totalBooking:   number
  totalAmount:    number
  indianStudent:  number
  foreignCitizen: number
  indianCitizen:  number
  totalVisitors:  number
}

// ─── Sample data (from PDF + given keys) ─────────────────────────────────────

const SAMPLE_DATA: DayWiseRow[] = [
  { srNo:1, placeName:'Beed Papad Leopard Safari',                          totalBooking:10,   totalAmount:36446,   indianStudent:2,   foreignCitizen:9,   indianCitizen:26,   totalVisitors:37    },
  { srNo:2, placeName:'Jaisalmer Wildlife Sanctuary',                       totalBooking:2,    totalAmount:4288,    indianStudent:0,   foreignCitizen:0,   indianCitizen:6,    totalVisitors:6     },
  { srNo:3, placeName:'Jhalana/amagarh Leopard Conservation Reserve',       totalBooking:786,  totalAmount:3050054, indianStudent:611, foreignCitizen:608, indianCitizen:2007, totalVisitors:3226  },
  { srNo:4, placeName:'Kumbhalgarh Wildlife Sanctuary',                     totalBooking:114,  totalAmount:498275,  indianStudent:9,   foreignCitizen:5,   indianCitizen:391,  totalVisitors:405   },
  { srNo:5, placeName:'National Chambal Gharial Sanctuary Palighat',        totalBooking:547,  totalAmount:1119705, indianStudent:187, foreignCitizen:33,  indianCitizen:1254, totalVisitors:1474  },
  { srNo:6, placeName:'Ram Garh Visdhari Tiger Reserve (rvtr)',             totalBooking:18,   totalAmount:80683,   indianStudent:2,   foreignCitizen:10,  indianCitizen:75,   totalVisitors:87    },
  { srNo:7, placeName:'Sariska Tiger Reserve, Alwar',                      totalBooking:1015, totalAmount:5244426, indianStudent:0,   foreignCitizen:256, indianCitizen:3988, totalVisitors:4244  },
  { srNo:8, placeName:'Mukundra Hills Tiger Reserve',                       totalBooking:88,   totalAmount:342180,  indianStudent:14,  foreignCitizen:22,  indianCitizen:398,  totalVisitors:434   },
]

// ─── Departments ──────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Dept. of Archaeology & Tourism',
  'Dept. of Forest',
  'Dept. of Wildlife',
  'Rajasthan Tourism Development Corporation',
]

const PLACES = SAMPLE_DATA.map(r => r.placeName)

// ─── Filter Dialog ────────────────────────────────────────────────────────────

interface FilterValues {
  dateType:    string
  startDate:   string
  endDate:     string
  department:  string
  place:       string
  paymentType: string
}

const DEFAULT_FILTERS: FilterValues = {
  dateType:    'Visit Date',
  startDate:   '2026-04-01',
  endDate:     '2026-04-23',
  department:  '',
  place:       '',
  paymentType: 'SUCCESS',
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calendar size={12} style={{ color: 'var(--maroon)' }} />
        {label}
      </label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        className="rounded-xl px-3 py-2.5 outline-none w-full"
        style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }} />
    </div>
  )
}

function FilterSelect({ label, value, options, onChange, icon }: {
  label: string; value: string
  options: { v: string; l: string }[]
  onChange: (v: string) => void
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span style={{ color: 'var(--maroon)' }}>{icon}</span>}
        {label}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
          style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

interface FilterDialogProps {
  open:     boolean
  values:   FilterValues
  onChange: (v: FilterValues) => void
  onApply:  () => void
  onClose:  () => void
  onReset:  () => void
}

function FilterDialog({ open, values, onChange, onApply, onClose, onReset }: FilterDialogProps) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open) return null

  const set = (key: keyof FilterValues) => (v: string) => onChange({ ...values, [key]: v })

  const activeChips = [
    values.dateType,
    values.startDate && `From ${values.startDate}`,
    values.endDate   && `To ${values.endDate}`,
    values.paymentType,
    values.department && values.department.slice(0, 20) + '…',
    values.place      && values.place.slice(0, 22) + (values.place.length > 22 ? '…' : ''),
  ].filter(Boolean) as string[]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.45)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          width: 600,
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(139,26,26,0.22)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
              <SlidersHorizontal size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 17 }}>Report Filters</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Day Wise Report</div>
            </div>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center rounded-xl"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}>
            <X size={15} />
          </button>
        </div>

        {/* Active chips strip */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-2 px-6 py-2.5 flex-wrap"
            style={{ background: 'var(--gold-pale)', borderBottom: '1px solid var(--sand)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active:</span>
            {activeChips.map((chip, i) => (
              <span key={i} className="rounded-full px-2.5 py-0.5 font-medium"
                style={{ fontSize: 10, background: 'rgba(139,26,26,0.1)', color: 'var(--maroon)' }}>
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className="px-6 py-5 grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* Date Type — full width */}
          <div className="col-span-2">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} style={{ color: 'var(--maroon)' }} />
              Date Type
            </div>
            <div className="flex gap-2">
              {['Visit Date', 'Booking Date'].map(opt => (
                <button key={opt} onClick={() => set('dateType')(opt)}
                  className="flex-1 py-2.5 rounded-xl font-medium"
                  style={{
                    fontSize: 13,
                    background: values.dateType === opt ? 'var(--maroon)' : 'var(--cream)',
                    color: values.dateType === opt ? '#fff' : 'var(--text-mid)',
                    border: `1px solid ${values.dateType === opt ? 'var(--maroon)' : 'var(--sand)'}`,
                    cursor: 'pointer',
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Start & End */}
          <DateField label="Start Date" value={values.startDate} onChange={set('startDate')} />
          <DateField label="End Date"   value={values.endDate}   onChange={set('endDate')} />

          {/* Department — full width */}
          <div className="col-span-2">
            <FilterSelect
              label="Department"
              value={values.department}
              icon={<Building2 size={12} />}
              options={[{ v: '', l: 'All Departments' }, ...DEPARTMENTS.map(d => ({ v: d, l: d }))]}
              onChange={set('department')}
            />
          </div>

          {/* Place — full width */}
          <div className="col-span-2">
            <FilterSelect
              label="Place / Site"
              value={values.place}
              icon={<MapPin size={12} />}
              options={[{ v: '', l: 'All Places' }, ...PLACES.map(p => ({ v: p, l: p }))]}
              onChange={set('place')}
            />
          </div>

          {/* Payment Type — full width */}
          <div className="col-span-2">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={12} style={{ color: 'var(--maroon)' }} />
              Payment Type
            </div>
            <div className="flex gap-2">
              {[
                { v: '',          l: 'All',       bg: 'var(--text-mid)', active: '#5A3A1A'  },
                { v: 'SUCCESS',   l: 'Success',   bg: '#1A7A6E',         active: '#1A7A6E'  },
                { v: 'FAILED',    l: 'Failed',    bg: '#E53E3E',         active: '#E53E3E'  },
                { v: 'CANCELLED', l: 'Cancelled', bg: '#8B1A1A',         active: '#8B1A1A'  },
              ].map(opt => (
                <button key={opt.v} onClick={() => set('paymentType')(opt.v)}
                  className="flex-1 py-2.5 rounded-xl font-medium"
                  style={{
                    fontSize: 12,
                    background: values.paymentType === opt.v ? opt.active : 'var(--cream)',
                    color:      values.paymentType === opt.v ? '#fff'       : opt.active,
                    border:    `1px solid ${values.paymentType === opt.v ? opt.active : 'var(--sand)'}`,
                    cursor: 'pointer',
                  }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 sticky bottom-0"
          style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onReset}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium"
            style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={13} /> Reset All
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="rounded-xl px-5 py-2.5 font-medium"
              style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={onApply}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white"
              style={{ fontSize: 13, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', cursor: 'pointer' }}>
              <SlidersHorizontal size={13} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
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

// ─── Visitor mini-bar ─────────────────────────────────────────────────────────

function VisitorBar({ val, max, color }: { val: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((val / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-full overflow-hidden" style={{ flex: 1, height: 6, background: 'var(--cream-dark)', minWidth: 48 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 36, textAlign: 'right' }}>
        {val.toLocaleString('en-IN')}
      </span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface DayWiseReportViewProps {
  data?:         DayWiseRow[]
  title?:        string
  totalResults?: number
}

export default function DayWiseReportView({
  data         = SAMPLE_DATA,
  title        = 'Day Wise Report',
  totalResults,
}: DayWiseReportViewProps) {

  const [searchPlace,    setSearchPlace]    = useState('')
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(10)
  const [sortKey,        setSortKey]        = useState<keyof DayWiseRow>('totalAmount')
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('desc')

  const openFilter  = () => { setPendingFilters(appliedFilters); setFilterOpen(true) }
  const applyFilter = () => { setAppliedFilters(pendingFilters); setFilterOpen(false); setPage(1) }
  const resetFilter = () => setPendingFilters(DEFAULT_FILTERS)
  const closeFilter = () => setFilterOpen(false)

  const activeFilterCount = [
    appliedFilters.place,
    appliedFilters.department,
    appliedFilters.paymentType !== 'SUCCESS' ? appliedFilters.paymentType : '',
  ].filter(Boolean).length

  const handleSort = (key: keyof DayWiseRow) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let rows = data.filter(r => {
      if (searchPlace && !r.placeName.toLowerCase().includes(searchPlace.toLowerCase())) return false
      if (appliedFilters.place && r.placeName !== appliedFilters.place) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] as number, bv = b[sortKey] as number
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [data, searchPlace, appliedFilters, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  const grandTotals = useMemo(() => ({
    bookings:  filtered.reduce((s, r) => s + r.totalBooking, 0),
    amount:    filtered.reduce((s, r) => s + r.totalAmount, 0),
    indianSt:  filtered.reduce((s, r) => s + r.indianStudent, 0),
    foreign:   filtered.reduce((s, r) => s + r.foreignCitizen, 0),
    indian:    filtered.reduce((s, r) => s + r.indianCitizen, 0),
    visitors:  filtered.reduce((s, r) => s + r.totalVisitors, 0),
  }), [filtered])

  const maxVisitors = Math.max(...data.map(r => r.totalVisitors), 1)

  const SortTh = ({ label, col, align = 'left' }: { label: string; col: keyof DayWiseRow; align?: string }) => (
    <th
      onClick={() => handleSort(col)}
      style={{
        padding: '11px 14px', fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase' as const, letterSpacing: '0.7px',
        color: sortKey === col ? 'var(--maroon)' : 'var(--text-muted)',
        textAlign: align as any, borderRight: '1px solid var(--sand)',
        whiteSpace: 'nowrap' as const, cursor: 'pointer',
        background: sortKey === col ? 'rgba(139,26,26,0.04)' : undefined,
        userSelect: 'none' as const,
      }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortKey === col && (
          <span style={{ fontSize: 9, color: 'var(--maroon)' }}>{sortDir === 'desc' ? '▼' : '▲'}</span>
        )}
      </span>
    </th>
  )

  return (
    <>
      <FilterDialog
        open={filterOpen}
        values={pendingFilters}
        onChange={setPendingFilters}
        onApply={applyFilter}
        onClose={closeFilter}
        onReset={resetFilter}
      />

      <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
          <div>
            <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Inventory Reports · Site-wise Booking & Visitor Aggregation
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Place search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 240 }}>
              <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={searchPlace}
                onChange={e => { setSearchPlace(e.target.value); setPage(1) }}
                placeholder="Search place name…"
                className="bg-transparent outline-none flex-1"
                style={{ fontSize: 12, color: 'var(--text-dark)' }} />
              {searchPlace && <button onClick={() => setSearchPlace('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>

            {/* Filter */}
            <button onClick={openFilter}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
              style={{
                fontSize: 12,
                background: activeFilterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
                border: `1px solid ${activeFilterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
                color: activeFilterCount > 0 ? '#fff' : 'var(--text-mid)',
                cursor: 'pointer',
              }}>
              <SlidersHorizontal size={13} />
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Export */}
            <button className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
              style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', cursor: 'pointer' }}>
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        {/* ── Active filter strip ───────────────────────────────── */}
        <div className="flex items-center gap-5 px-6 py-2.5 flex-wrap"
          style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
          {[
            { label: 'Start Date',    val: appliedFilters.startDate ? new Date(appliedFilters.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            { label: 'End Date',      val: appliedFilters.endDate   ? new Date(appliedFilters.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            { label: 'Payment Type',  val: appliedFilters.paymentType || 'All' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{item.label} :</span>
              <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 11, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}>{item.val}</span>
            </div>
          ))}
          {activeFilterCount > 0 && (
            <button onClick={() => { setAppliedFilters(DEFAULT_FILTERS); setPage(1) }}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ml-auto"
              style={{ fontSize: 11, background: 'rgba(229,62,62,0.08)', color: '#E53E3E', cursor: 'pointer', border: 'none' }}>
              <X size={10} /> Clear filters
            </button>
          )}
        </div>

        {/* ── Summary cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
          {[
            { label: 'Total Sites',      val: filtered.length.toString(),                                                                                icon: '🏛️', color: 'var(--maroon)', bg: '#fff',    white: false },
            { label: 'Grand Total',      val: '₹' + grandTotals.amount.toLocaleString('en-IN'),                                                          icon: '₹',  color: 'var(--maroon)', bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true  },
            { label: 'Total Bookings',   val: grandTotals.bookings.toLocaleString('en-IN'),                                                              icon: '📅', color: '#C8922A',       bg: '#fff',    white: false },
            { label: 'Total Visitors',   val: grandTotals.visitors.toLocaleString('en-IN'),                                                              icon: '👥', color: '#1A7A6E',       bg: '#fff',    white: false },
            { label: 'Foreign Visitors', val: grandTotals.foreign.toLocaleString('en-IN'),                                                               icon: '🌍', color: '#C8922A',       bg: '#fff',    white: false },
            { label: 'Indian Students',  val: grandTotals.indianSt.toLocaleString('en-IN'),                                                              icon: '🎓', color: '#5A3A1A',       bg: '#fff',    white: false },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
              style={{ background: s.bg, border: s.white ? 'none' : '1px solid var(--sand)' }}>
              {s.white && <div style={{ position: 'absolute', top: -24, right: -24, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
              <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: s.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize: 18, color: s.white ? '#fff' : s.color, lineHeight: 1.1 }}>{s.val}</div>
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
                  <th style={{ padding: '11px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.7px', color: 'rgba(255,255,255,0.85)', textAlign: 'center', width: 52, background: 'var(--maroon)', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                    Sr.
                  </th>
                  <th style={{ padding: '11px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.7px', color: 'var(--text-muted)', textAlign: 'left', borderRight: '1px solid var(--sand)' }}>
                    Place Name
                  </th>
                  <SortTh label="Bookings"        col="totalBooking"   align="right" />
                  <SortTh label="Amount (INR)"    col="totalAmount"    align="right" />
                  <SortTh label="Indian Students" col="indianStudent"  align="left"  />
                  <SortTh label="Foreign Citizens"col="foreignCitizen" align="left"  />
                  <SortTh label="Indian Citizens" col="indianCitizen"  align="left"  />
                  <SortTh label="Total Visitors"  col="totalVisitors"  align="left"  />
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
                    const rowBg  = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                    const rank   = (page - 1) * pageSize + i + 1
                    const isTop  = rank <= 3

                    return (
                      <tr key={r.placeName}
                        style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.025)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}>

                        {/* Sr.No */}
                        <td style={{ padding: '13px 14px', textAlign: 'center', borderRight: '2px solid var(--sand)' }}>
                          {isTop && sortDir === 'desc' && sortKey === 'totalAmount'
                            ? <span className="flex items-center justify-center rounded-full font-bold"
                                style={{ width: 24, height: 24, margin: '0 auto', background: ['rgba(200,146,42,0.2)','rgba(154,122,90,0.15)','rgba(200,146,42,0.1)'][i] ?? 'transparent', color: ['#C8922A','#9A7A5A','#C8922A'][i] ?? 'var(--maroon)', fontSize: 12 }}>
                                {['🥇','🥈','🥉'][i]}
                              </span>
                            : <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--maroon)' }}>{rank}</span>
                          }
                        </td>

                        {/* Place Name */}
                        <td style={{ padding: '13px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                              style={{ width: 32, height: 32, background: 'rgba(139,26,26,0.07)', fontSize: 14 }}>
                              🏛️
                            </div>
                            <div>
                              <div className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.3 }}>
                                {r.placeName}
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                                {r.totalBooking} bookings · {r.totalVisitors.toLocaleString('en-IN')} visitors
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Total Booking */}
                        <td style={{ padding: '13px 14px', textAlign: 'right', borderRight: '1px solid var(--cream-dark)' }}>
                          <div className="font-semibold" style={{ fontSize: 14, color: '#C8922A' }}>
                            {r.totalBooking.toLocaleString('en-IN')}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td style={{ padding: '13px 14px', textAlign: 'right', borderRight: '1px solid var(--cream-dark)' }}>
                          <div className="font-serif font-bold" style={{ fontSize: 15, color: 'var(--maroon)', lineHeight: 1 }}>
                            ₹{r.totalAmount.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                            {grandTotals.amount > 0 ? ((r.totalAmount / grandTotals.amount) * 100).toFixed(1) : 0}% of total
                          </div>
                        </td>

                        {/* Indian Student */}
                        <td style={{ padding: '13px 14px', borderRight: '1px solid var(--cream-dark)', minWidth: 140 }}>
                          <VisitorBar val={r.indianStudent} max={Math.max(...data.map(x => x.indianStudent), 1)} color="#5A3A1A" />
                        </td>

                        {/* Foreign Citizen */}
                        <td style={{ padding: '13px 14px', borderRight: '1px solid var(--cream-dark)', minWidth: 140 }}>
                          <VisitorBar val={r.foreignCitizen} max={Math.max(...data.map(x => x.foreignCitizen), 1)} color="#C8922A" />
                        </td>

                        {/* Indian Citizen */}
                        <td style={{ padding: '13px 14px', borderRight: '1px solid var(--cream-dark)', minWidth: 140 }}>
                          <VisitorBar val={r.indianCitizen} max={Math.max(...data.map(x => x.indianCitizen), 1)} color="#1A7A6E" />
                        </td>

                        {/* Total Visitors */}
                        <td style={{ padding: '13px 14px', minWidth: 140 }}>
                          <VisitorBar val={r.totalVisitors} max={maxVisitors} color="var(--maroon)" />
                        </td>
                      </tr>
                    )
                  })
                )}

                {/* Page total */}
                {paged.length > 0 && (
                  <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                    <td colSpan={2} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                      Page Total — {paged.length} sites
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#C8922A' }}>
                      {paged.reduce((s, r) => s + r.totalBooking, 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: 'var(--maroon)' }}>
                      ₹{paged.reduce((s, r) => s + r.totalAmount, 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '11px 14px', paddingLeft: 14 }}>
                      <span className="font-semibold" style={{ fontSize: 12, color: '#5A3A1A' }}>
                        {paged.reduce((s, r) => s + r.indianStudent, 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span className="font-semibold" style={{ fontSize: 12, color: '#C8922A' }}>
                        {paged.reduce((s, r) => s + r.foreignCitizen, 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span className="font-semibold" style={{ fontSize: 12, color: '#1A7A6E' }}>
                        {paged.reduce((s, r) => s + r.indianCitizen, 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span className="font-bold" style={{ fontSize: 13, color: 'var(--maroon)' }}>
                        {paged.reduce((s, r) => s + r.totalVisitors, 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                )}

                {/* Grand total */}
                {paged.length > 0 && (
                  <tr style={{ background: 'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop: '1px solid var(--sand)' }}>
                    <td colSpan={2} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                      Grand Total — All {filtered.length} sites
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#C8922A' }}>
                      {grandTotals.bookings.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: 'var(--maroon)' }}>
                      ₹{grandTotals.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '11px 14px' }}><span style={{ fontWeight: 700, fontSize: 13, color: '#5A3A1A' }}>{grandTotals.indianSt.toLocaleString('en-IN')}</span></td>
                    <td style={{ padding: '11px 14px' }}><span style={{ fontWeight: 700, fontSize: 13, color: '#C8922A' }}>{grandTotals.foreign.toLocaleString('en-IN')}</span></td>
                    <td style={{ padding: '11px 14px' }}><span style={{ fontWeight: 700, fontSize: 13, color: '#1A7A6E' }}>{grandTotals.indian.toLocaleString('en-IN')}</span></td>
                    <td style={{ padding: '11px 14px' }}><span style={{ fontWeight: 700, fontSize: 14, color: 'var(--maroon)' }}>{grandTotals.visitors.toLocaleString('en-IN')}</span></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>

              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Display Data:</span>
                <div className="relative">
                  <select value={String(pageSize)} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                    style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}>
                    {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
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
                <strong style={{ color: 'var(--maroon)' }}>{totalResults ?? filtered.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
