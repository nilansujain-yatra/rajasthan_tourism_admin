'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Download, Search, X, ChevronDown, Calendar,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  MapPin, Car, Gauge,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleAvailabilityRow {
  srNo:           number
  date:           string
  placeName:      string
  quotaName:      string
  shiftName:      string
  zoneName:       string
  vehicleName:    string
  totalSeats:     number
  seatsRemaining: number
  seatsBooked:    number
}

// ─── Sample data (from PDF + given keys) ─────────────────────────────────────

const SAMPLE_DATA: VehicleAvailabilityRow[] = [
  { srNo:1,  date:'01-02-2026', placeName:'Jhalana/amagarh Leopard Conservation Reserve', quotaName:'Normal', shiftName:'Morning', zoneName:'Jhalana',  vehicleName:'Gypsy',  totalSeats:60, seatsRemaining:0,  seatsBooked:60 },
  { srNo:2,  date:'01-02-2026', placeName:'Jhalana/amagarh Leopard Conservation Reserve', quotaName:'Normal', shiftName:'Morning', zoneName:'Amagarh',  vehicleName:'Gypsy',  totalSeats:60, seatsRemaining:0,  seatsBooked:60 },
  { srNo:3,  date:'02-02-2026', placeName:'Jhalana/amagarh Leopard Conservation Reserve', quotaName:'Normal', shiftName:'Evening', zoneName:'Jhalana',  vehicleName:'Gypsy',  totalSeats:60, seatsRemaining:12, seatsBooked:48 },
  { srNo:4,  date:'02-02-2026', placeName:'Jhalana/amagarh Leopard Conservation Reserve', quotaName:'Normal', shiftName:'Evening', zoneName:'Amagarh',  vehicleName:'Gypsy',  totalSeats:60, seatsRemaining:8,  seatsBooked:52 },
  { srNo:5,  date:'03-02-2026', placeName:'Sariska Tiger Reserve, Alwar',                 quotaName:'Normal', shiftName:'Morning', zoneName:'Core Zone', vehicleName:'Gypsy',  totalSeats:48, seatsRemaining:0,  seatsBooked:48 },
  { srNo:6,  date:'03-02-2026', placeName:'Sariska Tiger Reserve, Alwar',                 quotaName:'Normal', shiftName:'Morning', zoneName:'Buffer',    vehicleName:'Canter', totalSeats:40, seatsRemaining:16, seatsBooked:24 },
  { srNo:7,  date:'04-02-2026', placeName:'National Chambal Gharial Sanctuary Palighat',  quotaName:'Normal', shiftName:'Morning', zoneName:'Full zone', vehicleName:'Boat',   totalSeats:30, seatsRemaining:6,  seatsBooked:24 },
  { srNo:8,  date:'04-02-2026', placeName:'National Chambal Gharial Sanctuary Palighat',  quotaName:'Normal', shiftName:'Evening', zoneName:'Full zone', vehicleName:'Boat',   totalSeats:30, seatsRemaining:18, seatsBooked:12 },
  { srNo:9,  date:'05-02-2026', placeName:'Kumbhalgarh Wildlife Sanctuary',               quotaName:'Forest', shiftName:'Morning', zoneName:'Zone A',    vehicleName:'Gypsy',  totalSeats:36, seatsRemaining:0,  seatsBooked:36 },
  { srNo:10, date:'05-02-2026', placeName:'Kumbhalgarh Wildlife Sanctuary',               quotaName:'Normal', shiftName:'Evening', zoneName:'Zone B',    vehicleName:'Canter', totalSeats:40, seatsRemaining:22, seatsBooked:18 },
  { srNo:11, date:'06-02-2026', placeName:'Mukundra Hills Tiger Reserve',                 quotaName:'Normal', shiftName:'Morning', zoneName:'Core',      vehicleName:'Gypsy',  totalSeats:48, seatsRemaining:4,  seatsBooked:44 },
  { srNo:12, date:'06-02-2026', placeName:'Beed Papad Leopard Safari',                   quotaName:'Normal', shiftName:'Morning', zoneName:'Beed Papad',vehicleName:'Gypsy',  totalSeats:24, seatsRemaining:24, seatsBooked:0  },
]

// ─── Options ──────────────────────────────────────────────────────────────────

const PLACES        = Array.from(new Set(SAMPLE_DATA.map(r => r.placeName)))
const SEASONS       = ['All', 'Rainy', 'Winter', 'Summer']
const QUOTAS        = ['All', 'Normal', 'Forest', 'VIP']
const SHIFTS        = ['All', 'Morning', 'Evening']
const VEHICLE_TYPES = ['All', 'Gypsy', 'Canter', 'Boat', 'Motor Boat']

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterValues {
  date:        string
  place:       string
  season:      string
  quota:       string
  shift:       string
  zone:        string
  vehicleType: string
}

const DEFAULT_FILTERS: FilterValues = {
  date:        '2026-02-01',
  place:       'Jhalana/amagarh Leopard Conservation Reserve',
  season:      'Rainy',
  quota:       'Normal',
  shift:       'Morning',
  zone:        'ALL',
  vehicleType: 'Gypsy',
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function FSelect({ label, value, options, onChange, required }: {
  label: string; value: string; options: string[]
  onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const }}>
        {label}{required && <span style={{ color: '#E53E3E', marginLeft: 2 }}>*</span>}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
          style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}>
          {options.map(o => <option key={o} value={o === 'All' ? '' : o}>{o}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

// ─── Availability pill ────────────────────────────────────────────────────────

function AvailPill({ remaining, total }: { remaining: number; total: number }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0
  const config =
    remaining === 0  ? { bg: 'rgba(229,62,62,0.1)',   color: '#E53E3E', label: 'Sold Out',  dot: '#E53E3E' } :
    pct <= 25        ? { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A', label: 'Critical',  dot: '#8B1A1A' } :
    pct <= 50        ? { bg: 'rgba(200,146,42,0.12)', color: '#C8922A', label: 'Limited',   dot: '#C8922A' } :
                       { bg: 'rgba(26,122,110,0.12)', color: '#1A7A6E', label: 'Available', dot: '#1A7A6E' }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold"
      style={{ fontSize: 10, ...config }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: config.dot, display: 'inline-block', flexShrink: 0 }} />
      {config.label}
    </span>
  )
}

// ─── Seat capacity bar ────────────────────────────────────────────────────────

function SeatBar({ booked, total }: { booked: number; total: number }) {
  const pct      = total > 0 ? Math.round((booked / total) * 100) : 0
  const barColor = pct >= 100 ? '#E53E3E' : pct >= 75 ? '#C8922A' : '#1A7A6E'
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-full overflow-hidden" style={{ flex: 1, height: 7, background: 'var(--cream-dark)', minWidth: 64 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: barColor, minWidth: 30, textAlign: 'right' }}>{pct}%</span>
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

  // Derive zones from selected place
  const zoneOptions = ['ALL', ...Array.from(new Set(
    SAMPLE_DATA
      .filter(r => !values.place || r.placeName === values.place)
      .map(r => r.zoneName)
  ))]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.45)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', width: 680, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(139,26,26,0.22)', animation: 'fadeIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
              <SlidersHorizontal size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 17 }}>Filters</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Vehicle Availability Report</div>
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

        {/* Fields — matches the PDF layout exactly: Date | Place | Season | Quota | Shift | Zone on first row, then Vehicle Type */}
        <div className="px-6 py-5">
          {/* Row 1: Date + Place (wider) + Season + Quota + Shift + Zone */}
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 1.8fr 1fr 1fr 1fr 1fr' }}>
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} style={{ color: 'var(--maroon)' }} /> Date
              </label>
              <input type="date" value={values.date} onChange={e => set('date')(e.target.value)}
                className="rounded-xl px-3 py-2.5 outline-none"
                style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }} />
            </div>

            {/* Select Place * */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={11} style={{ color: 'var(--maroon)' }} /> Select Place <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <div className="relative">
                <select value={values.place} onChange={e => set('place')(e.target.value)}
                  className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
                  style={{ fontSize: 12, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}>
                  {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            <FSelect label="Select Season" value={values.season} options={SEASONS} onChange={set('season')} />
            <FSelect label="Select Quota"  value={values.quota}  options={QUOTAS}  onChange={set('quota')} />
            <FSelect label="Select Shift"  value={values.shift}  options={SHIFTS}  onChange={set('shift')} />

            {/* Select Zone */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const }}>
                Select Zone
              </label>
              <div className="relative">
                <select value={values.zone} onChange={e => set('zone')(e.target.value)}
                  className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
                  style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}>
                  {zoneOptions.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Row 2: Vehicle Type (left-aligned, narrower) */}
          <div style={{ maxWidth: 200 }}>
            <FSelect label="Select Vehicle Type" value={values.vehicleType} options={VEHICLE_TYPES} onChange={set('vehicleType')} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onReset}
            className="rounded-xl px-5 py-2.5 font-medium"
            style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            Clear all
          </button>
          <button onClick={onApply}
            className="flex items-center gap-2 rounded-xl px-8 py-2.5 font-medium text-white"
            style={{ fontSize: 13, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', cursor: 'pointer' }}>
            Apply
          </button>
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

// ─── Vehicle icon ─────────────────────────────────────────────────────────────

const VEHICLE_ICON: Record<string, string> = { Gypsy: '🚙', Canter: '🚐', Boat: '🚤', 'Motor Boat': '⛵' }

// ─── Main Component ────────────────────────────────────────────────────────────

interface VehicleAvailabilityReportViewProps {
  data?:         VehicleAvailabilityRow[]
  title?:        string
  totalResults?: number
}

export default function VehicleAvailabilityReportView({
  data         = SAMPLE_DATA,
  title        = 'Vehicle Availability Report',
  totalResults,
}: VehicleAvailabilityReportViewProps) {

  const [searchTerm,     setSearchTerm]     = useState('')
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(10)

  const openFilter  = () => { setPendingFilters(appliedFilters); setFilterOpen(true) }
  const applyFilter = () => { setAppliedFilters(pendingFilters); setFilterOpen(false); setPage(1) }
  const resetFilter = () => setPendingFilters(DEFAULT_FILTERS)
  const closeFilter = () => setFilterOpen(false)

  const activeFilterCount = [
    appliedFilters.place,
    appliedFilters.vehicleType && appliedFilters.vehicleType !== 'All' ? appliedFilters.vehicleType : '',
    appliedFilters.zone && appliedFilters.zone !== 'ALL' ? appliedFilters.zone : '',
    appliedFilters.quota && appliedFilters.quota !== 'All' ? appliedFilters.quota : '',
  ].filter(Boolean).length

  const filtered = useMemo(() => data.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!r.placeName.toLowerCase().includes(q) && !r.zoneName.toLowerCase().includes(q) && !r.vehicleName.toLowerCase().includes(q)) return false
    }
    if (appliedFilters.place       && r.placeName   !== appliedFilters.place)                     return false
    if (appliedFilters.shift       && appliedFilters.shift !== 'All'       && r.shiftName   !== appliedFilters.shift)       return false
    if (appliedFilters.quota       && appliedFilters.quota !== 'All'       && r.quotaName   !== appliedFilters.quota)       return false
    if (appliedFilters.zone        && appliedFilters.zone  !== 'ALL'       && r.zoneName    !== appliedFilters.zone)        return false
    if (appliedFilters.vehicleType && appliedFilters.vehicleType !== 'All' && r.vehicleName !== appliedFilters.vehicleType) return false
    return true
  }), [data, searchTerm, appliedFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  const totals = useMemo(() => ({
    total:     filtered.reduce((s, r) => s + r.totalSeats, 0),
    remaining: filtered.reduce((s, r) => s + r.seatsRemaining, 0),
    booked:    filtered.reduce((s, r) => s + r.seatsBooked, 0),
  }), [filtered])

  const soldOutCount  = filtered.filter(r => r.seatsRemaining === 0).length
  const availCount    = filtered.filter(r => r.seatsRemaining > 0).length

  const thStyle: React.CSSProperties = {
    padding: '11px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
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

        {/* ── Top bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
          <div>
            <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Inventory Reports · Vehicle Seat Availability by Site & Shift
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 230 }}>
              <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
                placeholder="Search place, zone, vehicle…"
                className="bg-transparent outline-none flex-1"
                style={{ fontSize: 12, color: 'var(--text-dark)' }} />
              {searchTerm && <button onClick={() => setSearchTerm('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>

            <button onClick={openFilter}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
              style={{ fontSize: 12, background: activeFilterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)', border: `1px solid ${activeFilterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`, color: activeFilterCount > 0 ? '#fff' : 'var(--text-mid)', cursor: 'pointer' }}>
              <SlidersHorizontal size={13} />
              Filter
              {/* Red dot matching the PDF */}
              <span className="absolute -top-1 -right-1 rounded-full"
                style={{ width: 8, height: 8, background: '#E53E3E' }} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
              style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', cursor: 'pointer' }}>
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        {/* ── Active filter strip ───────────────────────────────── */}
        <div className="flex items-center gap-4 px-6 py-2.5 flex-wrap"
          style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
          {[
            { label: 'Date',         val: appliedFilters.date    ? new Date(appliedFilters.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            { label: 'Place',        val: appliedFilters.place.length > 28 ? appliedFilters.place.slice(0, 28) + '…' : appliedFilters.place },
            { label: 'Season',       val: appliedFilters.season  || 'All' },
            { label: 'Quota',        val: appliedFilters.quota   || 'All' },
            { label: 'Shift',        val: appliedFilters.shift   || 'All' },
            { label: 'Zone',         val: appliedFilters.zone    || 'ALL' },
            { label: 'Vehicle',      val: appliedFilters.vehicleType || 'All' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{item.label}:</span>
              <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 11, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}>{item.val}</span>
            </div>
          ))}
          {activeFilterCount > 0 && (
            <button onClick={() => { setAppliedFilters(DEFAULT_FILTERS); setPage(1) }}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ml-auto"
              style={{ fontSize: 11, background: 'rgba(229,62,62,0.08)', color: '#E53E3E', cursor: 'pointer', border: 'none' }}>
              <X size={10} /> Clear
            </button>
          )}
        </div>

        {/* ── Summary cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
          {[
            { label: 'Total Slots',    val: filtered.length.toString(),                      icon: '📋', color: 'var(--maroon)', bg: '#fff',    white: false },
            { label: 'Total Seats',    val: totals.total.toLocaleString('en-IN'),             icon: '💺', color: '#1A7A6E',       bg: 'linear-gradient(135deg,#1A7A6E,#2A9A8C)', white: true  },
            { label: 'Seats Booked',   val: totals.booked.toLocaleString('en-IN'),            icon: '✅', color: 'var(--maroon)', bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true  },
            { label: 'Seats Remaining',val: totals.remaining.toLocaleString('en-IN'),         icon: '🟢', color: '#C8922A',       bg: '#fff',    white: false },
            { label: 'Sold Out',       val: soldOutCount.toString(),                          icon: '🔴', color: '#E53E3E',       bg: '#fff',    white: false },
          ].map(s => (
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
              style={{ background: s.bg, border: s.white ? 'none' : '1px solid var(--sand)' }}>
              {s.white && <div style={{ position: 'absolute', top: -24, right: -24, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
              <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 10, color: s.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize: 22, color: s.white ? '#fff' : s.color, lineHeight: 1.1 }}>{s.val}</div>
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
                  <th style={{ ...thStyle, width: 52, textAlign: 'center', background: 'var(--maroon)', color: 'rgba(255,255,255,0.85)', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                    Sr.
                  </th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Place Name</th>
                  <th style={thStyle}>Quota</th>
                  <th style={thStyle}>Shift</th>
                  <th style={thStyle}>Zone</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={{ ...thStyle, textAlign: 'center' as const }}>Total Seats</th>
                  <th style={{ ...thStyle, minWidth: 160 }}>Seat Occupancy</th>
                  <th style={{ ...thStyle, textAlign: 'center' as const }}>Remaining</th>
                  <th style={{ ...thStyle, textAlign: 'center' as const }}>Booked</th>
                  <th style={{ ...thStyle, textAlign: 'center' as const, borderRight: 'none' }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No records match the current filters.
                    </td>
                  </tr>
                ) : (
                  paged.map((r, i) => {
                    const rowBg = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                    const pct   = r.totalSeats > 0 ? Math.round((r.seatsBooked / r.totalSeats) * 100) : 0
                    const barColor = pct >= 100 ? '#E53E3E' : pct >= 75 ? '#C8922A' : '#1A7A6E'

                    return (
                      <tr key={r.placeName + r.date + r.zoneName + r.shiftName}
                        style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.025)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}>

                        {/* Sr.No */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--maroon)', borderRight: '2px solid var(--sand)' }}>
                          {(page - 1) * pageSize + i + 1}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{r.date}</span>
                        </td>

                        {/* Place Name */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)', maxWidth: 220 }}>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 28, height: 28, background: 'rgba(139,26,26,0.07)', fontSize: 13 }}>🏛️</span>
                            <span className="font-serif font-semibold" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 175, display: 'block' }} title={r.placeName}>
                              {r.placeName}
                            </span>
                          </div>
                        </td>

                        {/* Quota */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 10, background: 'rgba(90,58,26,0.08)', color: '#5A3A1A' }}>{r.quotaName}</span>
                        </td>

                        {/* Shift */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
                            style={{ fontSize: 10, ...(r.shiftName === 'Morning' ? { bg: 'rgba(200,146,42,0.1)', color: '#C8922A' } : { bg: 'rgba(107,18,18,0.09)', color: '#8B1A1A' }) }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: r.shiftName === 'Morning' ? '#C8922A' : '#8B1A1A', display: 'inline-block' }} />
                            {r.shiftName}
                          </span>
                        </td>

                        {/* Zone */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 10, background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
                            <MapPin size={9} /> {r.zoneName}
                          </span>
                        </td>

                        {/* Vehicle */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ fontSize: 16 }}>{VEHICLE_ICON[r.vehicleName] ?? '🚙'}</span>
                            <span className="font-medium" style={{ fontSize: 12 }}>{r.vehicleName}</span>
                          </div>
                        </td>

                        {/* Total Seats */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', borderRight: '1px solid var(--cream-dark)' }}>
                          <span className="font-bold" style={{ fontSize: 15, color: '#1A7A6E' }}>{r.totalSeats}</span>
                        </td>

                        {/* Occupancy bar */}
                        <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)', minWidth: 160 }}>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full overflow-hidden" style={{ flex: 1, height: 8, background: 'var(--cream-dark)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}bb)` }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: barColor, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                          </div>
                        </td>

                        {/* Remaining */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', borderRight: '1px solid var(--cream-dark)' }}>
                          <span className="font-bold" style={{ fontSize: 15, color: r.seatsRemaining === 0 ? '#E53E3E' : '#1A7A6E' }}>
                            {r.seatsRemaining}
                          </span>
                        </td>

                        {/* Booked */}
                        <td style={{ padding: '12px 14px', textAlign: 'center', borderRight: '1px solid var(--cream-dark)' }}>
                          <span className="font-bold" style={{ fontSize: 15, color: 'var(--maroon)' }}>{r.seatsBooked}</span>
                        </td>

                        {/* Status chip */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <AvailPill remaining={r.seatsRemaining} total={r.totalSeats} />
                        </td>
                      </tr>
                    )
                  })
                )}

                {/* Page total row */}
                {paged.length > 0 && (
                  <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                    <td colSpan={7} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                      Page Total — {paged.length} slots
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#1A7A6E' }}>
                      {paged.reduce((s, r) => s + r.totalSeats, 0)}
                    </td>
                    <td style={{ padding: '11px 14px' }} />
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#1A7A6E' }}>
                      {paged.reduce((s, r) => s + r.seatsRemaining, 0)}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--maroon)' }}>
                      {paged.reduce((s, r) => s + r.seatsBooked, 0)}
                    </td>
                    <td style={{ padding: '11px 14px' }} />
                  </tr>
                )}

                {/* Grand total */}
                {paged.length > 0 && (
                  <tr style={{ background: 'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop: '1px solid var(--sand)' }}>
                    <td colSpan={7} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                      Grand Total — All {filtered.length} slots
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: '#1A7A6E' }}>
                      {totals.total}
                    </td>
                    <td style={{ padding: '11px 14px' }} />
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: '#1A7A6E' }}>
                      {totals.remaining}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>
                      {totals.booked}
                    </td>
                    <td style={{ padding: '11px 14px' }} />
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
