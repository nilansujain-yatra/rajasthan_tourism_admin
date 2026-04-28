'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Download, Search, X, ChevronDown, Calendar,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  MapPin, Car, Users,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleTripRow {
  srNo:          number
  boardingDate:  string
  placeName:     string
  vehicleNumber: string
  zoneName:      string
  shiftName:     string
  totalVisitors: number
  totalAmount:   number
}

// ─── Sample data (from PDF) ───────────────────────────────────────────────────

const SAMPLE_DATA: VehicleTripRow[] = [
  { srNo:1,  boardingDate:'04-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:3,  totalAmount:1515.00  },
  { srNo:2,  boardingDate:'04-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:10, totalAmount:5050.00  },
  { srNo:3,  boardingDate:'05-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:5,  totalAmount:2525.00  },
  { srNo:4,  boardingDate:'05-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:5,  totalAmount:2525.00  },
  { srNo:5,  boardingDate:'05-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:5,  totalAmount:2525.00  },
  { srNo:6,  boardingDate:'05-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:5,  totalAmount:2525.00  },
  { srNo:7,  boardingDate:'05-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:5,  totalAmount:2525.00  },
  { srNo:8,  boardingDate:'06-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 02 PA 8044', zoneName:'Sariska Gate (zone 1)', shiftName:'Morning Shift', totalVisitors:8,  totalAmount:4040.00  },
  { srNo:9,  boardingDate:'06-04-2026', placeName:'Sariska Tiger Reserve, Alwar',                   vehicleNumber:'RJ 14 CA 5566', zoneName:'Sariska Gate (zone 2)', shiftName:'Evening Shift', totalVisitors:6,  totalAmount:3030.00  },
  { srNo:10, boardingDate:'07-04-2026', placeName:'Jhalana/amagarh Leopard Conservation Reserve',  vehicleNumber:'RJ 14 CB 2233', zoneName:'Jhalana',               shiftName:'Morning Shift', totalVisitors:4,  totalAmount:3524.00  },
  { srNo:11, boardingDate:'08-04-2026', placeName:'Jhalana/amagarh Leopard Conservation Reserve',  vehicleNumber:'RJ 14 CB 2233', zoneName:'Amagarh',               shiftName:'Evening Shift', totalVisitors:6,  totalAmount:5286.00  },
  { srNo:12, boardingDate:'09-04-2026', placeName:'National Chambal Gharial Sanctuary Palighat',   vehicleNumber:'RJ 25 WB 0023', zoneName:'Full zone',             shiftName:'Morning Shift', totalVisitors:4,  totalAmount:6490.00  },
]

// ─── Options ──────────────────────────────────────────────────────────────────

const PLACES  = Array.from(new Set(SAMPLE_DATA.map(r => r.placeName)))
const SEASONS = ['All', 'Rainy', 'Winter Season', 'Summer']
const SHIFTS  = ['ALL', 'Morning Shift', 'Evening Shift']

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterValues {
  startDate: string
  endDate:   string
  place:     string
  season:    string
  shift:     string
  zone:      string
  vehicle:   string
}

const DEFAULT_FILTERS: FilterValues = {
  startDate: '2026-04-01',
  endDate:   '2026-04-24',
  place:     'Sariska Tiger Reserve, Alwar',
  season:    'Winter Season',
  shift:     'ALL',
  zone:      'ALL',
  vehicle:   'RJ 02 PA 8044',
}

// ─── Shared select component ──────────────────────────────────────────────────

function FSelect({ label, value, options, onChange, required, highlight }: {
  label: string; value: string; options: string[]
  onChange: (v: string) => void; required?: boolean; highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const }}>
        {label}{required && <span style={{ color: '#E53E3E', marginLeft: 2 }}>*</span>}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none w-full rounded-xl pr-8 pl-3 py-3 outline-none"
          style={{
            fontSize: 13,
            background: '#F8F4EE',
            border: highlight ? '2px solid var(--maroon)' : '1px solid var(--sand)',
            color: 'var(--text-dark)',
            fontWeight: highlight ? 500 : 400,
          }}>
          {options.map(o => <option key={o} value={o === 'All' || o === 'ALL' ? '' : o}>{o}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: highlight ? 'var(--maroon)' : 'var(--sand-dark)' }} />
      </div>
    </div>
  )
}

// ─── Filter Dialog ────────────────────────────────────────────────────────────

interface FilterDialogProps {
  open: boolean; values: FilterValues
  onChange: (v: FilterValues) => void
  onApply: () => void; onClose: () => void; onReset: () => void
}

function FilterDialog({ open, values, onChange, onApply, onClose, onReset }: FilterDialogProps) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, onClose])
  if (!open) return null

  const set = (k: keyof FilterValues) => (v: string) => onChange({ ...values, [k]: v })

  const filteredVehicles = ['ALL', ...Array.from(new Set(
    SAMPLE_DATA.filter(r => !values.place || r.placeName === values.place).map(r => r.vehicleNumber)
  ))]
  const filteredZones = ['ALL', ...Array.from(new Set(
    SAMPLE_DATA.filter(r => !values.place || r.placeName === values.place).map(r => r.zoneName)
  ))]

  const activeCount = [
    values.startDate, values.endDate, values.place,
    values.season && values.season !== 'All' ? values.season : '',
    values.shift  && values.shift  !== 'ALL' ? values.shift  : '',
    values.zone   && values.zone   !== 'ALL' ? values.zone   : '',
    values.vehicle && values.vehicle !== 'ALL' ? values.vehicle : '',
  ].filter(Boolean).length

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.50)', zIndex: 1000, backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: '#fff', width: 800, maxWidth: '96vw',
          boxShadow: '0 32px 80px rgba(139,26,26,0.28)',
          animation: 'fadeIn 0.18s ease-out',
        }}>

        {/* ── Header gradient ── */}
        <div className="flex items-center justify-between px-7 py-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 55%, #C8922A 100%)' }}>
          {/* Decorative circles */}
          <div style={{ position:'absolute', top:-40, right:-20, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-30, left:80, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.18)', backdropFilter:'blur(6px)' }}>
              <SlidersHorizontal size={20} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: '#fff' }}>Filters</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>Vehicle Trip Amount Report</div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium"
                style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FDB62C', display: 'inline-block' }} />
                {activeCount} filter{activeCount !== 1 ? 's' : ''} active
              </div>
            )}
            <button onClick={onClose}
              className="flex items-center justify-center rounded-xl"
              style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.28)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Fields ── */}
        <div className="px-7 pt-6 pb-4">

          {/* Row 1: Start Date | End Date | Place * | Season | Shift */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: '1fr 1fr 2.2fr 1.3fr 1.1fr' }}>
            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const, display:'flex', alignItems:'center', gap:5 }}>
                <Calendar size={11} style={{ color: 'var(--maroon)' }} /> Start Date
              </label>
              <input type="date" value={values.startDate} onChange={e => set('startDate')(e.target.value)}
                className="rounded-xl px-3 py-3 outline-none"
                style={{ fontSize: 13, background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-dark)' }} />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const, display:'flex', alignItems:'center', gap:5 }}>
                <Calendar size={11} style={{ color: 'var(--maroon)' }} /> End Date
              </label>
              <input type="date" value={values.endDate} onChange={e => set('endDate')(e.target.value)}
                className="rounded-xl px-3 py-3 outline-none"
                style={{ fontSize: 13, background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-dark)' }} />
            </div>

            {/* Select Place * — highlighted with maroon border */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' as const, display:'flex', alignItems:'center', gap:5 }}>
                <MapPin size={11} style={{ color: 'var(--maroon)' }} />
                Select Place <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <div className="relative">
                <select value={values.place} onChange={e => set('place')(e.target.value)}
                  className="appearance-none w-full rounded-xl pr-8 pl-3 py-3 outline-none"
                  style={{ fontSize: 12, background: '#FDF3E3', border: '2px solid var(--maroon)', color: 'var(--text-dark)', fontWeight: 600 }}>
                  {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--maroon)' }} />
              </div>
            </div>

            <FSelect label="Select Season" value={values.season || 'All'} options={SEASONS} onChange={set('season')} />
            <FSelect label="Select Shift"  value={values.shift  || 'ALL'} options={SHIFTS}  onChange={set('shift')} />
          </div>

          {/* Row 2: Zone | Vehicle | (spacer) */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.4fr 3fr' }}>
            <FSelect label="Select Zone"    value={values.zone    || 'ALL'} options={filteredZones}    onChange={set('zone')} />
            <FSelect label="Select Vehicle" value={values.vehicle || 'ALL'} options={filteredVehicles} onChange={set('vehicle')} />
            <div />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-7 py-4"
          style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onReset}
            className="rounded-xl px-6 py-2.5 font-medium transition-colors"
            style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', cursor: 'pointer' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--maroon)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--sand)')}>
            Clear all
          </button>
          <button onClick={onApply}
            className="flex items-center gap-2.5 rounded-xl px-10 py-2.5 font-semibold text-white"
            style={{ fontSize: 14, background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', cursor: 'pointer', letterSpacing: '0.3px', boxShadow: '0 4px 14px rgba(139,26,26,0.3)' }}>
            <SlidersHorizontal size={14} />
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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

interface VehicleTripAmountReportViewProps {
  data?:         VehicleTripRow[]
  title?:        string
  totalResults?: number
}

export default function VehicleTripAmountReportView({
  data         = SAMPLE_DATA,
  title        = 'Vehicle Trip Amount Report',
  totalResults,
}: VehicleTripAmountReportViewProps) {

  const [searchTerm,     setSearchTerm]     = useState('')
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(10)

  const openFilter  = () => { setPendingFilters(appliedFilters); setFilterOpen(true) }
  const applyFilter = () => { setAppliedFilters(pendingFilters); setFilterOpen(false); setPage(1) }
  const resetFilter = () => setPendingFilters({ startDate: '', endDate: '', place: PLACES[0], season: '', shift: '', zone: '', vehicle: '' })
  const closeFilter = () => setFilterOpen(false)

  const filtered = useMemo(() => data.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!r.vehicleNumber.toLowerCase().includes(q) && !r.placeName.toLowerCase().includes(q) && !r.zoneName.toLowerCase().includes(q)) return false
    }
    if (appliedFilters.place   && r.placeName     !== appliedFilters.place)                                   return false
    if (appliedFilters.shift   && appliedFilters.shift   !== 'ALL' && r.shiftName    !== appliedFilters.shift)   return false
    if (appliedFilters.zone    && appliedFilters.zone    !== 'ALL' && r.zoneName     !== appliedFilters.zone)    return false
    if (appliedFilters.vehicle && appliedFilters.vehicle !== 'ALL' && r.vehicleNumber !== appliedFilters.vehicle) return false
    return true
  }), [data, searchTerm, appliedFilters])

  const totalPages    = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged         = filtered.slice((page - 1) * pageSize, page * pageSize)
  const grandVisitors = useMemo(() => filtered.reduce((s, r) => s + r.totalVisitors, 0), [filtered])
  const grandAmount   = useMemo(() => filtered.reduce((s, r) => s + r.totalAmount, 0),   [filtered])

  // Chip strip — matches PDF label chips
  const chips = [
    { label: 'Start Date', val: appliedFilters.startDate ? new Date(appliedFilters.startDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : null },
    { label: 'End Date',   val: appliedFilters.endDate   ? new Date(appliedFilters.endDate).toLocaleDateString('en-IN',   { day:'2-digit', month:'short', year:'numeric' }) : null },
    { label: 'Place',      val: appliedFilters.place || null },
    { label: 'Shift',      val: appliedFilters.shift   && appliedFilters.shift   !== 'ALL' ? appliedFilters.shift   : null },
    { label: 'Zone',       val: appliedFilters.zone    && appliedFilters.zone    !== 'ALL' ? appliedFilters.zone    : null },
    { label: 'Vehicle',    val: appliedFilters.vehicle && appliedFilters.vehicle !== 'ALL' ? appliedFilters.vehicle : null },
  ].filter(c => c.val) as { label: string; val: string }[]

  const th: React.CSSProperties = {
    padding: '11px 16px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: '0.7px', color: 'var(--text-muted)', textAlign: 'left' as const,
    borderRight: '1px solid var(--sand)', whiteSpace: 'nowrap' as const,
  }

  return (
    <>
      <FilterDialog
        open={filterOpen} values={pendingFilters}
        onChange={setPendingFilters}
        onApply={applyFilter} onClose={closeFilter} onReset={resetFilter}
      />

      <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
          <div>
            <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Inventory Reports · Vehicle-wise Boarding & Revenue
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 230 }}>
              <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
                placeholder="Search vehicle, zone, place…"
                className="bg-transparent outline-none flex-1"
                style={{ fontSize: 12, color: 'var(--text-dark)' }} />
              {searchTerm && <button onClick={() => setSearchTerm('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>

            {/* Filter button with red dot */}
            <button onClick={openFilter}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
              style={{ fontSize: 12, background: chips.length > 0 ? 'var(--maroon)' : 'var(--cream-dark)', border: `1px solid ${chips.length > 0 ? 'var(--maroon)' : 'var(--sand)'}`, color: chips.length > 0 ? '#fff' : 'var(--text-mid)', cursor: 'pointer' }}>
              <SlidersHorizontal size={13} />
              Filter
              <span className="absolute -top-1 -right-1 rounded-full"
                style={{ width: 8, height: 8, background: '#E53E3E', border: '2px solid #fff' }} />
              {chips.length > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 8 }}>{chips.length}</span>
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

        {/* ── Active filter chip strip (matches PDF label chips exactly) ── */}
        {chips.length > 0 && (
          <div className="flex items-center gap-2.5 px-6 py-2.5 flex-wrap"
            style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
            {chips.map(chip => (
              <div key={chip.label}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 11 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{chip.label}:</span>
                <span className="font-medium" style={{ color: 'var(--maroon)' }}>
                  {chip.label === 'Place' && chip.val.length > 24 ? chip.val.slice(0, 24) + '…' : chip.val}
                </span>
              </div>
            ))}
            <button onClick={() => { setAppliedFilters(DEFAULT_FILTERS); setPage(1) }}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ml-auto"
              style={{ fontSize: 11, background: 'rgba(229,62,62,0.08)', color: '#E53E3E', cursor: 'pointer', border: 'none' }}>
              <X size={10} /> Clear all
            </button>
          </div>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
          {[
            { label:'Total Trips',     val: filtered.length.toString(),          icon:'📋', color:'var(--maroon)', bg:'#fff', white:false },
            { label:'Grand Revenue',   val:'₹' + grandAmount.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 }), icon:'₹', color:'var(--maroon)', bg:'linear-gradient(135deg,#6B1212,#A83030)', white:true },
            { label:'Total Visitors',  val: grandVisitors.toLocaleString('en-IN'), icon:'👥', color:'#1A7A6E', bg:'#fff', white:false },
            { label:'Unique Vehicles', val: Array.from(new Set(filtered.map(r=>r.vehicleNumber))).length.toString(), icon:'🚙', color:'#C8922A', bg:'#fff', white:false },
            { label:'Avg per Trip',    val:'₹' + (filtered.length>0 ? Math.round(grandAmount/filtered.length).toLocaleString('en-IN') : '0'), icon:'📊', color:'#5A3A1A', bg:'#fff', white:false },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
              style={{ background: s.bg, border: s.white ? 'none' : '1px solid var(--sand)' }}>
              {s.white && <div style={{ position:'absolute', top:-24, right:-24, width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.1)' }} />}
              <span style={{ fontSize:22, flexShrink:0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize:10, color: s.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize:20, color: s.white ? '#fff' : s.color, lineHeight:1.1 }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="px-6 pb-6">
          <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--sand)', background:'#fff' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--cream-dark)', borderBottom:'2px solid var(--sand)' }}>
                  <th style={{ ...th, width:52, textAlign:'center', background:'var(--maroon)', color:'rgba(255,255,255,0.85)', borderRight:'2px solid rgba(255,255,255,0.15)' }}>Sr.</th>
                  <th style={th}>Boarding Date</th>
                  <th style={th}>Place Name</th>
                  <th style={th}>Vehicle Number</th>
                  <th style={th}>Zone Name</th>
                  <th style={th}>Shift Name</th>
                  <th style={{ ...th, textAlign:'center' as const }}>Total Visitors</th>
                  <th style={{ ...th, textAlign:'right' as const, borderRight:'none' }}>Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:48, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No records match the current filters.</td></tr>
                ) : (
                  paged.map((r, i) => {
                    const rowBg     = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                    const isEvening = r.shiftName.toLowerCase().includes('evening')
                    return (
                      <tr key={r.boardingDate + r.vehicleNumber + r.zoneName + i}
                        style={{ background:rowBg, transition:'background 0.12s', borderBottom:'1px solid var(--cream-dark)' }}
                        onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(139,26,26,0.025)')}
                        onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=rowBg)}>

                        {/* Sr.No */}
                        <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:700, fontSize:12, color:'var(--maroon)', borderRight:'2px solid var(--sand)' }}>
                          {(page-1)*pageSize+i+1}
                        </td>

                        {/* Boarding Date */}
                        <td style={{ padding:'13px 16px', borderRight:'1px solid var(--cream-dark)', whiteSpace:'nowrap' }}>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                            <span style={{ fontSize:12, fontWeight:500 }}>{r.boardingDate}</span>
                          </div>
                        </td>

                        {/* Place */}
                        <td style={{ padding:'13px 16px', borderRight:'1px solid var(--cream-dark)', maxWidth:200 }}>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center rounded-lg flex-shrink-0"
                              style={{ width:28, height:28, background:'rgba(139,26,26,0.07)', fontSize:13 }}>🏛️</span>
                            <span className="font-serif font-semibold"
                              style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:165, display:'block' }}
                              title={r.placeName}>{r.placeName}</span>
                          </div>
                        </td>

                        {/* Vehicle Number */}
                        <td style={{ padding:'13px 16px', borderRight:'1px solid var(--cream-dark)' }}>
                          <div className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                            style={{ background:'rgba(200,146,42,0.08)', border:'1px solid rgba(200,146,42,0.2)' }}>
                            <Car size={12} style={{ color:'#C8922A', flexShrink:0 }} />
                            <span style={{ fontSize:12, fontWeight:600, color:'#C8922A', fontFamily:'monospace' }}>{r.vehicleNumber}</span>
                          </div>
                        </td>

                        {/* Zone */}
                        <td style={{ padding:'13px 16px', borderRight:'1px solid var(--cream-dark)' }}>
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium"
                            style={{ fontSize:10, background:'rgba(26,122,110,0.08)', color:'#1A7A6E' }}>
                            <MapPin size={9} /> {r.zoneName}
                          </span>
                        </td>

                        {/* Shift */}
                        <td style={{ padding:'13px 16px', borderRight:'1px solid var(--cream-dark)' }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
                            style={{ fontSize:10, background: isEvening ? 'rgba(107,18,18,0.09)' : 'rgba(200,146,42,0.1)', color: isEvening ? '#8B1A1A' : '#C8922A' }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background: isEvening ? '#8B1A1A' : '#C8922A', display:'inline-block' }} />
                            {r.shiftName}
                          </span>
                        </td>

                        {/* Visitors */}
                        <td style={{ padding:'13px 16px', textAlign:'center', borderRight:'1px solid var(--cream-dark)' }}>
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Users size={13} style={{ color:'#1A7A6E' }} />
                            <span style={{ fontSize:14, fontWeight:700, color:'#1A7A6E' }}>{r.totalVisitors}</span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td style={{ padding:'13px 16px', textAlign:'right' }}>
                          <div className="font-serif font-bold" style={{ fontSize:16, color:'var(--maroon)' }}>
                            ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}

                {/* Page total */}
                {paged.length > 0 && (
                  <tr style={{ background:'var(--cream-dark)', borderTop:'2px solid var(--sand)' }}>
                    <td colSpan={6} style={{ padding:'11px 16px', fontWeight:700, fontSize:11, color:'var(--maroon)', textTransform:'uppercase' as const, letterSpacing:'0.5px' }}>
                      Page Total — {paged.length} trips
                    </td>
                    <td style={{ padding:'11px 16px', textAlign:'center', fontWeight:700, fontSize:14, color:'#1A7A6E' }}>
                      {paged.reduce((s,r)=>s+r.totalVisitors,0)}
                    </td>
                    <td style={{ padding:'11px 16px', textAlign:'right', fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:'var(--maroon)' }}>
                      ₹{paged.reduce((s,r)=>s+r.totalAmount,0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                  </tr>
                )}

                {/* Grand total */}
                {paged.length > 0 && (
                  <tr style={{ background:'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop:'1px solid var(--sand)' }}>
                    <td colSpan={6} style={{ padding:'11px 16px', fontWeight:700, fontSize:11, color:'var(--maroon)', textTransform:'uppercase' as const, letterSpacing:'0.5px' }}>
                      Grand Total — All {filtered.length} trips
                    </td>
                    <td style={{ padding:'11px 16px', textAlign:'center', fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:'#1A7A6E' }}>
                      {grandVisitors}
                    </td>
                    <td style={{ padding:'11px 16px', textAlign:'right', fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:'var(--maroon)' }}>
                      ₹{grandAmount.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderTop:'1px solid var(--sand)', background:'var(--cream)' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>Display Data:</span>
                <div className="relative">
                  <select value={String(pageSize)} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1) }}
                    className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                    style={{ fontSize:11, background:'#fff', border:'1px solid var(--sand)', color:'var(--text-dark)' }}>
                    {[10,25,50].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:'var(--text-muted)' }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <PageBtn onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  icon={<><ChevronLeft size={12}/><span style={{fontSize:11}}>Previous</span></>} />
                {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                  let p=i+1
                  if(totalPages>5){
                    if(page<=3)p=i+1
                    else if(page>=totalPages-2)p=totalPages-4+i
                    else p=page-2+i
                  }
                  return <PageBtn key={p} onClick={()=>setPage(p)} active={page===p} label={String(p)} />
                })}
                {totalPages>5&&page<totalPages-2&&<span style={{fontSize:11,color:'var(--text-muted)',padding:'0 4px'}}>…</span>}
                {totalPages>5&&<PageBtn onClick={()=>setPage(totalPages)} active={page===totalPages} label={String(totalPages)} />}
                <PageBtn onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                  icon={<><span style={{fontSize:11}}>Next</span><ChevronRight size={12}/></>} />
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                Result:{' '}
                <strong style={{ color:'var(--text-dark)' }}>
                  {filtered.length===0?0:`${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)}`}
                </strong>{' '}of{' '}
                <strong style={{ color:'var(--maroon)' }}>{totalResults ?? filtered.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
