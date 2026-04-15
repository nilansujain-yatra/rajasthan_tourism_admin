'use client'

import { useState, useMemo } from 'react'
import { Download, Filter, Search, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeadDetailedRow {
  srNo:                    number
  bookingDate:             string
  visitDate:               string
  bookingId:               string
  consumerKey:             string
  placeName:               string
  zoneName:                string
  shiftName:               string
  vehicleName:             string
  indianMembers:           number
  foreignMembers:          number
  totalMembers:            number
  indianEntryFee:          number
  foreignerEntryFee:       number
  vehicleEntryFee:         number
  totalTourismIncome:      number
  indianEcoDev:            number
  foreignerEcoDev:         number
  vehicleEcoDev:           number
  totalEcoDevIncome:       number
  indianTRDF:              number
  foreignerTRDF:           number
  vehicleTRDF:             number
  guideTRDF:               number
  totalTRDFIncome:         number
  vehicleRentFees:         number
  vehicleRentGSTPct:       number
  vehicleRentGSTAmt:       number
  totalVehicleRentFees:    number
  guideFees:               number
  guideFeesGSTPct:         number
  guideFeesGSTAmt:         number
  totalGuideFees:          number
  demitraAmount:           number
  bookingMode:             'ONLINE' | 'KIOSK' | 'COUNTER'
  totalFeeHeadwise:        number
  indianRislFee:           number
  foreignerRislFee:        number
  vehicleRislFee:          number
  totalPayment:            number
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_DATA: HeadDetailedRow[] = [
  {
    srNo:1, bookingDate:'13-04-2026 | 03:38:19 PM', visitDate:'18-04-2026',
    bookingId:'JHA2604131538191684', consumerKey:'JHA2604131538191684',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Jhalana', shiftName:'Morning', vehicleName:'Gypsy',
    indianMembers:1, foreignMembers:0, totalMembers:1,
    indianEntryFee:75, foreignerEntryFee:0, vehicleEntryFee:17, totalTourismIncome:92,
    indianEcoDev:0, foreignerEcoDev:0, vehicleEcoDev:0, totalEcoDevIncome:0,
    indianTRDF:0, foreignerTRDF:0, vehicleTRDF:0, guideTRDF:0, totalTRDFIncome:0,
    vehicleRentFees:337, vehicleRentGSTPct:5, vehicleRentGSTAmt:17, totalVehicleRentFees:354,
    guideFees:0, guideFeesGSTPct:0, guideFeesGSTAmt:0, totalGuideFees:0,
    demitraAmount:0, bookingMode:'ONLINE', totalFeeHeadwise:0,
    indianRislFee:2.25, foreignerRislFee:0, vehicleRislFee:16.95, totalPayment:881,
  },
  {
    srNo:2, bookingDate:'13-04-2026 | 03:37:07 PM', visitDate:'16-04-2026',
    bookingId:'JHA2604131537071908', consumerKey:'JHA2604131537071908',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Jhalana', shiftName:'Morning', vehicleName:'Canter',
    indianMembers:4, foreignMembers:1, totalMembers:5,
    indianEntryFee:300, foreignerEntryFee:200, vehicleEntryFee:25, totalTourismIncome:525,
    indianEcoDev:40, foreignerEcoDev:20, vehicleEcoDev:0, totalEcoDevIncome:60,
    indianTRDF:10, foreignerTRDF:5, vehicleTRDF:0, guideTRDF:25, totalTRDFIncome:40,
    vehicleRentFees:650, vehicleRentGSTPct:5, vehicleRentGSTAmt:33, totalVehicleRentFees:683,
    guideFees:300, guideFeesGSTPct:18, guideFeesGSTAmt:54, totalGuideFees:354,
    demitraAmount:0, bookingMode:'ONLINE', totalFeeHeadwise:0,
    indianRislFee:9, foreignerRislFee:4.5, vehicleRislFee:22.5, totalPayment:2124,
  },
  {
    srNo:3, bookingDate:'13-04-2026 | 03:36:10 PM', visitDate:'26-04-2026',
    bookingId:'JHA2604131536105792', consumerKey:'JHA2604131536105792',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Jhalana', shiftName:'Evening', vehicleName:'Gypsy',
    indianMembers:2, foreignMembers:0, totalMembers:2,
    indianEntryFee:150, foreignerEntryFee:0, vehicleEntryFee:17, totalTourismIncome:167,
    indianEcoDev:20, foreignerEcoDev:0, vehicleEcoDev:0, totalEcoDevIncome:20,
    indianTRDF:5, foreignerTRDF:0, vehicleTRDF:0, guideTRDF:0, totalTRDFIncome:5,
    vehicleRentFees:337, vehicleRentGSTPct:5, vehicleRentGSTAmt:17, totalVehicleRentFees:354,
    guideFees:0, guideFeesGSTPct:0, guideFeesGSTAmt:0, totalGuideFees:0,
    demitraAmount:0, bookingMode:'KIOSK', totalFeeHeadwise:0,
    indianRislFee:4.5, foreignerRislFee:0, vehicleRislFee:16.95, totalPayment:678,
  },
  {
    srNo:4, bookingDate:'13-04-2026 | 03:31:02 PM', visitDate:'17-04-2026',
    bookingId:'JHA2604131531027091', consumerKey:'JHA2604131531027091',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Aamagarh', shiftName:'Morning', vehicleName:'Gypsy',
    indianMembers:3, foreignMembers:2, totalMembers:5,
    indianEntryFee:225, foreignerEntryFee:400, vehicleEntryFee:17, totalTourismIncome:642,
    indianEcoDev:30, foreignerEcoDev:40, vehicleEcoDev:0, totalEcoDevIncome:70,
    indianTRDF:7.5, foreignerTRDF:10, vehicleTRDF:0, guideTRDF:50, totalTRDFIncome:67.5,
    vehicleRentFees:337, vehicleRentGSTPct:5, vehicleRentGSTAmt:17, totalVehicleRentFees:354,
    guideFees:500, guideFeesGSTPct:18, guideFeesGSTAmt:90, totalGuideFees:590,
    demitraAmount:0, bookingMode:'ONLINE', totalFeeHeadwise:0,
    indianRislFee:6.75, foreignerRislFee:9, vehicleRislFee:16.95, totalPayment:1975,
  },
  {
    srNo:5, bookingDate:'13-04-2026 | 03:29:42 PM', visitDate:'15-04-2026',
    bookingId:'JHA2604131529425611', consumerKey:'JHA2604131529425611',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Jhalana', shiftName:'Morning', vehicleName:'Gypsy',
    indianMembers:2, foreignMembers:0, totalMembers:2,
    indianEntryFee:150, foreignerEntryFee:0, vehicleEntryFee:17, totalTourismIncome:167,
    indianEcoDev:0, foreignerEcoDev:0, vehicleEcoDev:0, totalEcoDevIncome:0,
    indianTRDF:0, foreignerTRDF:0, vehicleTRDF:0, guideTRDF:0, totalTRDFIncome:0,
    vehicleRentFees:337, vehicleRentGSTPct:5, vehicleRentGSTAmt:17, totalVehicleRentFees:354,
    guideFees:0, guideFeesGSTPct:0, guideFeesGSTAmt:0, totalGuideFees:0,
    demitraAmount:0, bookingMode:'COUNTER', totalFeeHeadwise:0,
    indianRislFee:4.5, foreignerRislFee:0, vehicleRislFee:16.95, totalPayment:562,
  },
  {
    srNo:6, bookingDate:'13-04-2026 | 03:11:03 PM', visitDate:'14-04-2026',
    bookingId:'JHA2604131511043455', consumerKey:'JHA2604131511043455',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Jhalana', shiftName:'Morning', vehicleName:'Canter',
    indianMembers:6, foreignMembers:2, totalMembers:8,
    indianEntryFee:450, foreignerEntryFee:400, vehicleEntryFee:25, totalTourismIncome:875,
    indianEcoDev:60, foreignerEcoDev:40, vehicleEcoDev:0, totalEcoDevIncome:100,
    indianTRDF:15, foreignerTRDF:10, vehicleTRDF:0, guideTRDF:75, totalTRDFIncome:100,
    vehicleRentFees:650, vehicleRentGSTPct:5, vehicleRentGSTAmt:33, totalVehicleRentFees:683,
    guideFees:500, guideFeesGSTPct:18, guideFeesGSTAmt:90, totalGuideFees:590,
    demitraAmount:0, bookingMode:'ONLINE', totalFeeHeadwise:0,
    indianRislFee:13.5, foreignerRislFee:9, vehicleRislFee:22.5, totalPayment:3345,
  },
  {
    srNo:7, bookingDate:'13-04-2026 | 03:03:00 PM', visitDate:'15-04-2026',
    bookingId:'JHA2604131503019225', consumerKey:'JHA2604131503019225',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Aamagarh', shiftName:'Evening', vehicleName:'Gypsy',
    indianMembers:1, foreignMembers:0, totalMembers:1,
    indianEntryFee:75, foreignerEntryFee:0, vehicleEntryFee:17, totalTourismIncome:92,
    indianEcoDev:10, foreignerEcoDev:0, vehicleEcoDev:0, totalEcoDevIncome:10,
    indianTRDF:2.5, foreignerTRDF:0, vehicleTRDF:0, guideTRDF:0, totalTRDFIncome:2.5,
    vehicleRentFees:337, vehicleRentGSTPct:5, vehicleRentGSTAmt:17, totalVehicleRentFees:354,
    guideFees:0, guideFeesGSTPct:0, guideFeesGSTAmt:0, totalGuideFees:0,
    demitraAmount:0, bookingMode:'ONLINE', totalFeeHeadwise:0,
    indianRislFee:2.25, foreignerRislFee:0, vehicleRislFee:16.95, totalPayment:501,
  },
  {
    srNo:8, bookingDate:'13-04-2026 | 01:12:13 PM', visitDate:'17-04-2026',
    bookingId:'JHA2604131312133761', consumerKey:'JHA2604131312133761',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Jhalana', shiftName:'Morning', vehicleName:'Gypsy',
    indianMembers:4, foreignMembers:0, totalMembers:4,
    indianEntryFee:300, foreignerEntryFee:0, vehicleEntryFee:17, totalTourismIncome:317,
    indianEcoDev:40, foreignerEcoDev:0, vehicleEcoDev:0, totalEcoDevIncome:40,
    indianTRDF:10, foreignerTRDF:0, vehicleTRDF:0, guideTRDF:0, totalTRDFIncome:10,
    vehicleRentFees:337, vehicleRentGSTPct:5, vehicleRentGSTAmt:17, totalVehicleRentFees:354,
    guideFees:0, guideFeesGSTPct:0, guideFeesGSTAmt:0, totalGuideFees:0,
    demitraAmount:0, bookingMode:'KIOSK', totalFeeHeadwise:0,
    indianRislFee:9, foreignerRislFee:0, vehicleRislFee:16.95, totalPayment:1105,
  },
  {
    srNo:9, bookingDate:'13-04-2026 | 12:34:08 PM', visitDate:'18-04-2026',
    bookingId:'JHA2604131234083242', consumerKey:'JHA2604131234083242',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Jhalana', shiftName:'Evening', vehicleName:'Gypsy',
    indianMembers:2, foreignMembers:1, totalMembers:3,
    indianEntryFee:150, foreignerEntryFee:200, vehicleEntryFee:17, totalTourismIncome:367,
    indianEcoDev:20, foreignerEcoDev:20, vehicleEcoDev:0, totalEcoDevIncome:40,
    indianTRDF:5, foreignerTRDF:5, vehicleTRDF:0, guideTRDF:25, totalTRDFIncome:35,
    vehicleRentFees:337, vehicleRentGSTPct:5, vehicleRentGSTAmt:17, totalVehicleRentFees:354,
    guideFees:300, guideFeesGSTPct:18, guideFeesGSTAmt:54, totalGuideFees:354,
    demitraAmount:0, bookingMode:'ONLINE', totalFeeHeadwise:0,
    indianRislFee:4.5, foreignerRislFee:4.5, vehicleRislFee:16.95, totalPayment:1362,
  },
  {
    srNo:10, bookingDate:'13-04-2026 | 12:00:00 PM', visitDate:'14-04-2026',
    bookingId:'JHA2604131200005668', consumerKey:'JHA2604131200005668',
    placeName:'Jhalana/amagarh Leopard Conservation Reserve', zoneName:'Aamagarh', shiftName:'Morning', vehicleName:'Canter',
    indianMembers:8, foreignMembers:0, totalMembers:8,
    indianEntryFee:600, foreignerEntryFee:0, vehicleEntryFee:25, totalTourismIncome:625,
    indianEcoDev:80, foreignerEcoDev:0, vehicleEcoDev:0, totalEcoDevIncome:80,
    indianTRDF:20, foreignerTRDF:0, vehicleTRDF:0, guideTRDF:0, totalTRDFIncome:20,
    vehicleRentFees:650, vehicleRentGSTPct:5, vehicleRentGSTAmt:33, totalVehicleRentFees:683,
    guideFees:0, guideFeesGSTPct:0, guideFeesGSTAmt:0, totalGuideFees:0,
    demitraAmount:0, bookingMode:'COUNTER', totalFeeHeadwise:0,
    indianRislFee:18, foreignerRislFee:0, vehicleRislFee:22.5, totalPayment:1895,
  },
]

// ─── Column Groups ─────────────────────────────────────────────────────────────

const COL_GROUPS = [
  { label: 'Booking Info',      color: '#8B1A1A', cols: 9  },
  { label: 'Members',           color: '#1A7A6E', cols: 3  },
  { label: 'Tourism Entry Fee', color: '#C8922A', cols: 4  },
  { label: 'Eco Development',   color: '#5A3A1A', cols: 4  },
  { label: 'TRDF',              color: '#6B1212', cols: 5  },
  { label: 'Vehicle Rent',      color: '#1A7A6E', cols: 4  },
  { label: 'Guide Fees',        color: '#C8922A', cols: 4  },
  { label: 'Payment',           color: '#8B1A1A', cols: 8  },
]

// ─── Mode badge style ─────────────────────────────────────────────────────────

const modeStyle: Record<string, { bg: string; color: string; label: string }> = {
  ONLINE:  { bg: 'rgba(26,122,110,0.12)',  color: '#1A7A6E', label: 'Online'  },
  KIOSK:   { bg: 'rgba(200,146,42,0.12)',  color: '#C8922A', label: 'Kiosk'   },
  COUNTER: { bg: 'rgba(139,26,26,0.1)',    color: '#8B1A1A', label: 'Counter' },
}

const fmt = (n: number) =>
  n === 0 ? <span style={{ color: 'var(--text-muted)' }}>—</span> : <>{n.toLocaleString('en-IN')}</>

const fmtDec = (n: number) =>
  n === 0 ? <span style={{ color: 'var(--text-muted)' }}>—</span> : <>₹{n.toFixed(2)}</>

// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface FilterState {
  bookingMode: string
  zone: string
  shift: string
  vehicle: string
  search: string
  pageSize: number
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface HeadDetailedReportViewProps {
  data?: HeadDetailedRow[]
  title?: string
  totalResults?: number
}

export default function HeadDetailedReportView({
  data = SAMPLE_DATA,
  title = 'Head Detailed Report',
  totalResults = 339,
}: HeadDetailedReportViewProps) {
  const [filters, setFilters] = useState<FilterState>({
    bookingMode: '',
    zone: '',
    shift: '',
    vehicle: '',
    search: '',
    pageSize: 10,
  })
  const [page, setPage] = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Unique values for filter dropdowns
  const zones    = useMemo(() => Array.from(new Set(data.map(r => r.zoneName))),    [data])
  const shifts   = useMemo(() => Array.from(new Set(data.map(r => r.shiftName))),   [data])
  const vehicles = useMemo(() => Array.from(new Set(data.map(r => r.vehicleName))), [data])

  // Filtered rows
  const filtered = useMemo(() => data.filter(r => {
    if (filters.bookingMode && r.bookingMode !== filters.bookingMode) return false
    if (filters.zone        && r.zoneName    !== filters.zone)        return false
    if (filters.shift       && r.shiftName   !== filters.shift)       return false
    if (filters.vehicle     && r.vehicleName !== filters.vehicle)     return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      return r.bookingId.toLowerCase().includes(q)
          || r.placeName.toLowerCase().includes(q)
          || r.consumerKey.toLowerCase().includes(q)
    }
    return true
  }), [data, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / filters.pageSize))
  const paged      = filtered.slice((page - 1) * filters.pageSize, page * filters.pageSize)

  // Summary totals
  const totals = useMemo(() => ({
    members:       filtered.reduce((s, r) => s + r.totalMembers, 0),
    tourism:       filtered.reduce((s, r) => s + r.totalTourismIncome, 0),
    eco:           filtered.reduce((s, r) => s + r.totalEcoDevIncome, 0),
    trdf:          filtered.reduce((s, r) => s + r.totalTRDFIncome, 0),
    vehicle:       filtered.reduce((s, r) => s + r.totalVehicleRentFees, 0),
    guide:         filtered.reduce((s, r) => s + r.totalGuideFees, 0),
    payment:       filtered.reduce((s, r) => s + r.totalPayment, 0),
  }), [filtered])

  const clearFilters = () => {
    setFilters({ bookingMode: '', zone: '', shift: '', vehicle: '', search: '', pageSize: 10 })
    setPage(1)
  }

  const activeFilterCount = [filters.bookingMode, filters.zone, filters.shift, filters.vehicle]
    .filter(Boolean).length

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}
      >
        <div>
          <h2
            className="font-serif font-bold"
            style={{ fontSize: 22, color: 'var(--text-dark)' }}
          >
            {title}
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Inventory Reports · Booking & Fee Breakdown
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 220 }}
          >
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
              placeholder="Search booking ID / place…"
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
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
            style={{
              fontSize: 12,
              background: showFilterPanel ? 'var(--maroon)' : 'var(--cream-dark)',
              border: '1px solid ' + (showFilterPanel ? 'var(--maroon)' : 'var(--sand)'),
              color: showFilterPanel ? '#fff' : 'var(--text-mid)',
            }}
          >
            <Filter size={13} />
            Filter
            {activeFilterCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center text-white font-bold"
                style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}
              >
                {activeFilterCount}
              </span>
            )}
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

      {/* ── Filter Panel ──────────────────────────────────────── */}
      {showFilterPanel && (
        <div
          className="flex items-end gap-4 px-6 py-4 flex-wrap"
          style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}
        >
          {/* Booking Mode */}
          <FilterSelect
            label="Booking Mode"
            value={filters.bookingMode}
            options={[{ v: '', l: 'All Modes' }, { v: 'ONLINE', l: 'Online' }, { v: 'KIOSK', l: 'Kiosk' }, { v: 'COUNTER', l: 'Counter' }]}
            onChange={v => { setFilters(f => ({ ...f, bookingMode: v })); setPage(1) }}
          />
          <FilterSelect
            label="Zone"
            value={filters.zone}
            options={[{ v: '', l: 'All Zones' }, ...zones.map(z => ({ v: z, l: z }))]}
            onChange={v => { setFilters(f => ({ ...f, zone: v })); setPage(1) }}
          />
          <FilterSelect
            label="Shift"
            value={filters.shift}
            options={[{ v: '', l: 'All Shifts' }, ...shifts.map(s => ({ v: s, l: s }))]}
            onChange={v => { setFilters(f => ({ ...f, shift: v })); setPage(1) }}
          />
          <FilterSelect
            label="Vehicle"
            value={filters.vehicle}
            options={[{ v: '', l: 'All Vehicles' }, ...vehicles.map(v => ({ v, l: v }))]}
            onChange={v => { setFilters(f => ({ ...f, vehicle: v })); setPage(1) }}
          />
          <FilterSelect
            label="Rows per page"
            value={String(filters.pageSize)}
            options={[10, 25, 50, 100].map(n => ({ v: String(n), l: String(n) }))}
            onChange={v => { setFilters(f => ({ ...f, pageSize: Number(v) })); setPage(1) }}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
              style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--maroon)' }}
            >
              <X size={11} /> Clear All
            </button>
          )}
        </div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────── */}
      <div
        className="grid px-6 py-4 gap-3"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--cream)' }}
      >
        {[
          { label: 'Total Members',   val: totals.members.toLocaleString('en-IN'), icon: '👥', color: 'var(--maroon)' },
          { label: 'Tourism Income',  val: '₹' + totals.tourism.toLocaleString('en-IN'), icon: '🏛️', color: '#1A7A6E' },
          { label: 'Eco Dev Income',  val: '₹' + totals.eco.toLocaleString('en-IN'), icon: '🌿', color: '#5A8A3A' },
          { label: 'TRDF Income',     val: '₹' + totals.trdf.toLocaleString('en-IN'), icon: '📋', color: '#6B1212' },
          { label: 'Vehicle Rent',    val: '₹' + totals.vehicle.toLocaleString('en-IN'), icon: '🚗', color: '#C8922A' },
          { label: 'Guide Fees',      val: '₹' + totals.guide.toLocaleString('en-IN'), icon: '🧭', color: '#1A7A6E' },
          { label: 'Total Payment',   val: '₹' + totals.payment.toLocaleString('en-IN'), icon: '₹', color: 'var(--maroon)' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl px-3 py-3 flex flex-col"
            style={{ background: '#fff', border: '1px solid var(--sand)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{s.label}</span>
            </div>
            <div className="font-serif font-bold" style={{ fontSize: 16, color: s.color, lineHeight: 1.2 }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--sand)', background: '#fff' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 2400 }}>

              {/* ── Group header ── */}
              <thead>
                <tr>
                  {/* Sr.No spans 1 */}
                  <th
                    rowSpan={2}
                    style={{
                      ...thBase,
                      width: 42,
                      background: 'var(--maroon)',
                      color: '#fff',
                      borderRight: '2px solid rgba(255,255,255,0.15)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                    }}
                  >
                    Sr.
                  </th>
                  {COL_GROUPS.map(g => (
                    <th
                      key={g.label}
                      colSpan={g.cols}
                      style={{
                        ...thBase,
                        background: g.color,
                        color: '#fff',
                        fontSize: 10,
                        letterSpacing: '0.8px',
                        borderRight: '2px solid rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        padding: '6px 10px',
                      }}
                    >
                      {g.label.toUpperCase()}
                    </th>
                  ))}
                </tr>

                {/* ── Sub-column headers ── */}
                <tr style={{ background: 'var(--cream-dark)' }}>
                  {/* Booking Info cols */}
                  {['Booking Date', 'Visit Date', 'Booking ID', 'Consumer Key', 'Place Name', 'Zone', 'Shift', 'Vehicle'].map(h => (
                    <Th key={h} label={h} group="booking" />
                  ))}
                  {/* Members */}
                  {['Indian', 'Foreign', 'Total'].map(h => (
                    <Th key={'m' + h} label={h} group="member" />
                  ))}
                  {/* Tourism Entry */}
                  {['Indian (₹)', 'Foreign (₹)', 'Vehicle (₹)', 'Total (₹)'].map(h => (
                    <Th key={'tf' + h} label={h} group="tourism" />
                  ))}
                  {/* Eco Dev */}
                  {['Indian (₹)', 'Foreign (₹)', 'Vehicle (₹)', 'Total (₹)'].map(h => (
                    <Th key={'ed' + h} label={h} group="eco" />
                  ))}
                  {/* TRDF */}
                  {['Indian (₹)', 'Foreign (₹)', 'Vehicle (₹)', 'Guide (₹)', 'Total (₹)'].map(h => (
                    <Th key={'tr' + h} label={h} group="trdf" />
                  ))}
                  {/* Vehicle Rent */}
                  {['Rent (₹)', 'GST %', 'GST Amt (₹)', 'Total (₹)'].map(h => (
                    <Th key={'vr' + h} label={h} group="vehicle" />
                  ))}
                  {/* Guide Fees */}
                  {['Fees (₹)', 'GST %', 'GST Amt (₹)', 'Total (₹)'].map(h => (
                    <Th key={'gf' + h} label={h} group="guide" />
                  ))}
                  {/* Payment */}
                  {['Demitra', 'Mode', 'Head Total', 'Indian RISL', 'Foreign RISL', 'Vehicle RISL', 'Total Payment'].map(h => (
                    <Th key={'py' + h} label={h} group="payment" />
                  ))}
                </tr>
              </thead>

              {/* ── Body ── */}
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={43}
                      style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}
                    >
                      No records match the current filters.
                    </td>
                  </tr>
                ) : (
                  paged.map((r, i) => {
                    const ms = modeStyle[r.bookingMode]
                    const rowBg = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.6)'
                    return (
                      <tr
                        key={r.bookingId}
                        style={{ background: rowBg, transition: 'background 0.12s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.03)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}
                      >
                        {/* Sr No */}
                        <td
                          style={{
                            ...tdBase,
                            textAlign: 'center',
                            fontWeight: 600,
                            color: 'var(--maroon)',
                            background: rowBg,
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            borderRight: '2px solid var(--sand)',
                          }}
                        >
                          {(page - 1) * filters.pageSize + i + 1}
                        </td>

                        {/* ── Booking Info ── */}
                        <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.bookingDate}</span>
                        </td>
                        <td style={{ ...tdBase, whiteSpace: 'nowrap', fontWeight: 500 }}>{r.visitDate}</td>
                        <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                          <span
                            className="font-mono"
                            style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 600 }}
                          >
                            {r.bookingId}
                          </span>
                        </td>
                        <td style={{ ...tdBase }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {r.consumerKey.slice(0, 16)}…
                          </span>
                        </td>
                        <td style={{ ...tdBase, maxWidth: 180 }}>
                          <span
                            className="font-serif"
                            style={{ fontSize: 12, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}
                            title={r.placeName}
                          >
                            {r.placeName}
                          </span>
                        </td>
                        <td style={{ ...tdBase }}>
                          <span
                            className="rounded-full px-2 py-0.5 font-medium"
                            style={{ fontSize: 10, whiteSpace: 'nowrap', background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}
                          >
                            {r.zoneName}
                          </span>
                        </td>
                        <td style={{ ...tdBase }}>
                          <span style={{ fontSize: 11, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{r.shiftName}</span>
                        </td>
                        <td style={{ ...tdBase }}>
                          <span style={{ fontSize: 11, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{r.vehicleName}</span>
                        </td>

                        {/* ── Members ── */}
                        <td style={{ ...tdNum }}>{fmt(r.indianMembers)}</td>
                        <td style={{ ...tdNum }}>{fmt(r.foreignMembers)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: 'var(--teal)' }}>{r.totalMembers}</td>

                        {/* ── Tourism Entry ── */}
                        <td style={tdNum}>{fmt(r.indianEntryFee)}</td>
                        <td style={tdNum}>{fmt(r.foreignerEntryFee)}</td>
                        <td style={tdNum}>{fmt(r.vehicleEntryFee)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: '#C8922A' }}>{fmt(r.totalTourismIncome)}</td>

                        {/* ── Eco Dev ── */}
                        <td style={tdNum}>{fmt(r.indianEcoDev)}</td>
                        <td style={tdNum}>{fmt(r.foreignerEcoDev)}</td>
                        <td style={tdNum}>{fmt(r.vehicleEcoDev)}</td>
                        <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(r.totalEcoDevIncome)}</td>

                        {/* ── TRDF ── */}
                        <td style={tdNum}>{fmt(r.indianTRDF)}</td>
                        <td style={tdNum}>{fmt(r.foreignerTRDF)}</td>
                        <td style={tdNum}>{fmt(r.vehicleTRDF)}</td>
                        <td style={tdNum}>{fmt(r.guideTRDF)}</td>
                        <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(r.totalTRDFIncome)}</td>

                        {/* ── Vehicle Rent ── */}
                        <td style={tdNum}>{fmt(r.vehicleRentFees)}</td>
                        <td style={{ ...tdNum, color: 'var(--text-muted)' }}>{r.vehicleRentGSTPct}%</td>
                        <td style={tdNum}>{fmt(r.vehicleRentGSTAmt)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: '#1A7A6E' }}>{fmt(r.totalVehicleRentFees)}</td>

                        {/* ── Guide Fees ── */}
                        <td style={tdNum}>{fmt(r.guideFees)}</td>
                        <td style={{ ...tdNum, color: 'var(--text-muted)' }}>
                          {r.guideFeesGSTPct > 0 ? `${r.guideFeesGSTPct}%` : '—'}
                        </td>
                        <td style={tdNum}>{fmt(r.guideFeesGSTAmt)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: '#C8922A' }}>{fmt(r.totalGuideFees)}</td>

                        {/* ── Payment ── */}
                        <td style={tdNum}>{fmt(r.demitraAmount)}</td>
                        <td style={{ ...tdBase, textAlign: 'center' }}>
                          <span
                            className="rounded-full px-2 py-0.5 font-semibold"
                            style={{ fontSize: 9, ...ms }}
                          >
                            {ms.label}
                          </span>
                        </td>
                        <td style={tdNum}>{fmt(r.totalFeeHeadwise)}</td>
                        <td style={{ ...tdNum, fontSize: 11 }}>{fmtDec(r.indianRislFee)}</td>
                        <td style={{ ...tdNum, fontSize: 11 }}>{fmtDec(r.foreignerRislFee)}</td>
                        <td style={{ ...tdNum, fontSize: 11 }}>{fmtDec(r.vehicleRislFee)}</td>
                        <td
                          style={{
                            ...tdNum,
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--maroon)',
                            borderLeft: '2px solid var(--sand)',
                          }}
                        >
                          ₹{r.totalPayment.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )
                  })
                )}

                {/* ── Totals row ── */}
                {paged.length > 0 && (
                  <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                    <td
                      colSpan={12}
                      style={{
                        ...tdBase,
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        color: 'var(--maroon)',
                        position: 'sticky',
                        left: 0,
                        background: 'var(--cream-dark)',
                        zIndex: 2,
                      }}
                    >
                      Page Total ({paged.length} records)
                    </td>
                    {/* Tourism total */}
                    {[
                      paged.reduce((s,r)=>s+r.indianEntryFee,0),
                      paged.reduce((s,r)=>s+r.foreignerEntryFee,0),
                      paged.reduce((s,r)=>s+r.vehicleEntryFee,0),
                      paged.reduce((s,r)=>s+r.totalTourismIncome,0),
                    ].map((v, i) => <TotalCell key={'tt' + i} val={v} bold={i===3} />)}
                    {/* Eco total */}
                    {[
                      paged.reduce((s,r)=>s+r.indianEcoDev,0),
                      paged.reduce((s,r)=>s+r.foreignerEcoDev,0),
                      paged.reduce((s,r)=>s+r.vehicleEcoDev,0),
                      paged.reduce((s,r)=>s+r.totalEcoDevIncome,0),
                    ].map((v, i) => <TotalCell key={'te' + i} val={v} bold={i===3} />)}
                    {/* TRDF total */}
                    {[
                      paged.reduce((s,r)=>s+r.indianTRDF,0),
                      paged.reduce((s,r)=>s+r.foreignerTRDF,0),
                      paged.reduce((s,r)=>s+r.vehicleTRDF,0),
                      paged.reduce((s,r)=>s+r.guideTRDF,0),
                      paged.reduce((s,r)=>s+r.totalTRDFIncome,0),
                    ].map((v, i) => <TotalCell key={'tr' + i} val={v} bold={i===4} />)}
                    {/* Vehicle rent */}
                    <TotalCell val={paged.reduce((s,r)=>s+r.vehicleRentFees,0)} />
                    <td style={tdBase} />
                    <TotalCell val={paged.reduce((s,r)=>s+r.vehicleRentGSTAmt,0)} />
                    <TotalCell val={paged.reduce((s,r)=>s+r.totalVehicleRentFees,0)} bold />
                    {/* Guide fees */}
                    <TotalCell val={paged.reduce((s,r)=>s+r.guideFees,0)} />
                    <td style={tdBase} />
                    <TotalCell val={paged.reduce((s,r)=>s+r.guideFeesGSTAmt,0)} />
                    <TotalCell val={paged.reduce((s,r)=>s+r.totalGuideFees,0)} bold />
                    {/* Payment */}
                    <td style={tdBase} />
                    <td style={tdBase} />
                    <td style={tdBase} />
                    <TotalCell val={parseFloat(paged.reduce((s,r)=>s+r.indianRislFee,0).toFixed(2))} />
                    <TotalCell val={parseFloat(paged.reduce((s,r)=>s+r.foreignerRislFee,0).toFixed(2))} />
                    <TotalCell val={parseFloat(paged.reduce((s,r)=>s+r.vehicleRislFee,0).toFixed(2))} />
                    <td
                      style={{
                        ...tdNum,
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--maroon)',
                        borderLeft: '2px solid var(--sand)',
                      }}
                    >
                      ₹{paged.reduce((s,r)=>s+r.totalPayment,0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination footer ── */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Result: <strong style={{ color: 'var(--text-dark)' }}>
                {filtered.length === 0 ? 0 : (page - 1) * filters.pageSize + 1}–{Math.min(page * filters.pageSize, filtered.length)}
              </strong>{' '}of{' '}
              <strong style={{ color: 'var(--maroon)' }}>{totalResults}</strong>
            </div>

            <div className="flex items-center gap-1">
              <PageBtn
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                icon={<ChevronLeft size={13} />}
              />
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5) {
                  if (page <= 3)       p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else                 p = page - 2 + i
                }
                return (
                  <PageBtn
                    key={p}
                    onClick={() => setPage(p)}
                    active={page === p}
                    label={String(p)}
                  />
                )
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
              )}
              {totalPages > 5 && (
                <PageBtn
                  onClick={() => setPage(totalPages)}
                  active={page === totalPages}
                  label={String(totalPages)}
                />
              )}
              <PageBtn
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                icon={<ChevronRight size={13} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

const thBase: React.CSSProperties = {
  padding: '8px 10px',
  fontFamily: "'Outfit', sans-serif",
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.7px',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(255,255,255,0.15)',
}

const tdBase: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 12,
  borderBottom: '1px solid var(--cream-dark)',
  verticalAlign: 'middle',
}

const tdNum: React.CSSProperties = {
  ...tdBase,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 12,
}

function Th({ label, group }: { label: string; group: string }) {
  const groupColors: Record<string, string> = {
    booking: 'rgba(139,26,26,0.06)',
    member:  'rgba(26,122,110,0.06)',
    tourism: 'rgba(200,146,42,0.06)',
    eco:     'rgba(90,58,26,0.06)',
    trdf:    'rgba(107,18,18,0.06)',
    vehicle: 'rgba(26,122,110,0.06)',
    guide:   'rgba(200,146,42,0.06)',
    payment: 'rgba(139,26,26,0.06)',
  }
  return (
    <th
      style={{
        ...thBase,
        background: groupColors[group] ?? 'var(--cream-dark)',
        color: 'var(--text-mid)',
        borderRight: '1px solid var(--sand)',
        borderBottom: '2px solid var(--sand)',
      }}
    >
      {label}
    </th>
  )
}

function TotalCell({ val, bold }: { val: number; bold?: boolean }) {
  return (
    <td style={{
      ...tdNum,
      fontWeight: bold ? 700 : 500,
      color: bold ? 'var(--maroon)' : 'var(--text-dark)',
    }}>
      {val === 0
        ? <span style={{ color: 'var(--text-muted)' }}>—</span>
        : val.toLocaleString('en-IN')}
    </td>
  )
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
