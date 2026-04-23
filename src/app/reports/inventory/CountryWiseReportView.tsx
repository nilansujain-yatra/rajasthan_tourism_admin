'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Download, Search, X, ChevronDown, Calendar,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  CheckCircle2, XCircle, Clock, Globe, Phone, Mail,
  Flag, MapPin,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CountryWiseRow {
  srNo:              number
  bookingDate:       string
  visitDate:         string
  bookingId:         string
  emitraTransId:     string
  placeName:         string
  totalAmount:       number
  totalVisitors:     number
  transactionStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING'
  userName:          string
  mobile:            string
  email:             string
  nationality:       'Indian' | 'Foreigner'
  country:           string
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_DATA: CountryWiseRow[] = [
  { srNo:1,  bookingDate:'23-04-2026 | 10:38:06 AM', visitDate:'23-04-2026', bookingId:'SAW2604231038068185', emitraTransId:'260766650826', placeName:'Sawan Bhado',                                         totalAmount:502,    totalVisitors:2,  transactionStatus:'SUCCESS',   userName:'BHANWAR SINGH SANKHALA', mobile:'9079198735', email:'SBHANWER709@GMAIL.COM',         nationality:'Indian',   country:'India'         },
  { srNo:2,  bookingDate:'23-04-2026 | 10:35:22 AM', visitDate:'23-04-2026', bookingId:'SAW2604231035228192', emitraTransId:'260766648214', placeName:'Sawan Bhado',                                         totalAmount:502,    totalVisitors:2,  transactionStatus:'SUCCESS',   userName:'BHANWAR SINGH SANKHALA', mobile:'9079198735', email:'SBHANWER709@GMAIL.COM',         nationality:'Indian',   country:'India'         },
  { srNo:3,  bookingDate:'23-04-2026 | 10:30:45 AM', visitDate:'23-04-2026', bookingId:'JHA2604231030453347', emitraTransId:'260766641539', placeName:'Jhalana/amagarh Leopard Conservation Reserve',       totalAmount:881,    totalVisitors:1,  transactionStatus:'SUCCESS',   userName:'VIJAY SAINI',            mobile:'6367166965', email:'',                              nationality:'Indian',   country:'India'         },
  { srNo:4,  bookingDate:'23-04-2026 | 10:22:11 AM', visitDate:'23-04-2026', bookingId:'JHA2604231022114460', emitraTransId:'260766634720', placeName:'Jhalana/amagarh Leopard Conservation Reserve',       totalAmount:1762,   totalVisitors:2,  transactionStatus:'SUCCESS',   userName:'RAMKESH MEENA',          mobile:'9649349312', email:'GOKULSHARMAJAIPURS@GMAIL.COM',  nationality:'Indian',   country:'India'         },
  { srNo:5,  bookingDate:'23-04-2026 | 10:18:33 AM', visitDate:'23-04-2026', bookingId:'JHA2604231018337815', emitraTransId:'260766628901', placeName:'Jhalana/amagarh Leopard Conservation Reserve',       totalAmount:881,    totalVisitors:1,  transactionStatus:'SUCCESS',   userName:'VIJAY GURJAR',           mobile:'7878170796', email:'VIJAYGURJAR3043@GMAIL.COM',     nationality:'Indian',   country:'India'         },
  { srNo:6,  bookingDate:'23-04-2026 | 09:55:14 AM', visitDate:'24-04-2026', bookingId:'NAT2604230955143921', emitraTransId:'260766612445', placeName:'National Chambal Gharial Sanctuary Palighat',        totalAmount:3245,   totalVisitors:4,  transactionStatus:'SUCCESS',   userName:'James Whitfield',        mobile:'',           email:'jwhitfield@hotmail.com',        nationality:'Foreigner',country:'United Kingdom' },
  { srNo:7,  bookingDate:'23-04-2026 | 09:42:07 AM', visitDate:'24-04-2026', bookingId:'KUM2604230942072638', emitraTransId:'260766599867', placeName:'Mukundra Hills Tiger Reserve',                       totalAmount:5800,   totalVisitors:3,  transactionStatus:'SUCCESS',   userName:'Valentina Rossi',        mobile:'',           email:'valentina.rossi@gmail.com',     nationality:'Foreigner',country:'Italy'          },
  { srNo:8,  bookingDate:'23-04-2026 | 09:30:58 AM', visitDate:'25-04-2026', bookingId:'AMB2604230930581774', emitraTransId:'260766587230', placeName:'Amber Fort',                                         totalAmount:2400,   totalVisitors:6,  transactionStatus:'SUCCESS',   userName:'Arya Niwas',             mobile:'9887654321', email:'arya.niwas@gmail.com',          nationality:'Indian',   country:'India'         },
  { srNo:9,  bookingDate:'23-04-2026 | 09:15:43 AM', visitDate:'25-04-2026', bookingId:'JHA2604230915439052', emitraTransId:'260766572614', placeName:'Jhalana/amagarh Leopard Conservation Reserve',       totalAmount:1762,   totalVisitors:2,  transactionStatus:'CANCELLED', userName:'Pooja Mehta',            mobile:'9765432198', email:'pooja.mehta@yahoo.com',         nationality:'Indian',   country:'India'         },
  { srNo:10, bookingDate:'23-04-2026 | 09:02:21 AM', visitDate:'26-04-2026', bookingId:'BEE2604230902218836', emitraTransId:'260766559978', placeName:'Beed Papad Leopard Safari',                          totalAmount:1622.5, totalVisitors:1,  transactionStatus:'FAILED',    userName:'Paraskevi Kaklidou',     mobile:'',           email:'paraskevi.k@gmail.com',         nationality:'Foreigner',country:'Greece'         },
  { srNo:11, bookingDate:'23-04-2026 | 08:48:12 AM', visitDate:'26-04-2026', bookingId:'SAW2604230848127193', emitraTransId:'260766547341', placeName:'Sawan Bhado',                                         totalAmount:1004,   totalVisitors:4,  transactionStatus:'SUCCESS',   userName:'Ramesh Agarwal',         mobile:'9812345678', email:'ramesh.agarwal@gmail.com',      nationality:'Indian',   country:'India'         },
  { srNo:12, bookingDate:'23-04-2026 | 08:35:09 AM', visitDate:'27-04-2026', bookingId:'JHA2604230835094480', emitraTransId:'260766535805', placeName:'Jhalana/amagarh Leopard Conservation Reserve',       totalAmount:4410,   totalVisitors:5,  transactionStatus:'SUCCESS',   userName:'Marco Schmidt',          mobile:'',           email:'marco.schmidt@outlook.com',     nationality:'Foreigner',country:'Germany'        },
]

// ─── Status styles ────────────────────────────────────────────────────────────

const txnStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  SUCCESS:   { bg: 'rgba(26,122,110,0.12)',  color: '#1A7A6E', icon: <CheckCircle2 size={10} /> },
  FAILED:    { bg: 'rgba(229,62,62,0.1)',    color: '#E53E3E', icon: <XCircle size={10} />      },
  CANCELLED: { bg: 'rgba(139,26,26,0.1)',    color: '#8B1A1A', icon: <XCircle size={10} />      },
  PENDING:   { bg: 'rgba(200,146,42,0.12)',  color: '#C8922A', icon: <Clock size={10} />         },
}

const natStyle: Record<string, { bg: string; color: string; flag: string }> = {
  Indian:    { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E', flag: '🇮🇳' },
  Foreigner: { bg: 'rgba(200,146,42,0.12)', color: '#C8922A', flag: '🌍'  },
}

// ─── Filter Dialog ────────────────────────────────────────────────────────────

interface FilterValues {
  dateType:    string
  startDate:   string
  endDate:     string
  place:       string
  paymentType: string
  nationality: string
  country:     string
}

const DEFAULT_FILTERS: FilterValues = {
  dateType:    'Visit Date',
  startDate:   '2026-04-01',
  endDate:     '2026-04-23',
  place:       '',
  paymentType: 'SUCCESS',
  nationality: '',
  country:     '',
}

const PLACES = [
  'Sawan Bhado',
  'Jhalana/amagarh Leopard Conservation Reserve',
  'National Chambal Gharial Sanctuary Palighat',
  'Mukundra Hills Tiger Reserve',
  'Amber Fort',
  'Beed Papad Leopard Safari',
]

const COUNTRIES = [
  'India', 'United Kingdom', 'Italy', 'Germany', 'France', 'United States',
  'Australia', 'Canada', 'Japan', 'Greece', 'Spain', 'Netherlands',
]

function FilterSelect({ label, value, options, onChange, icon }: {
  label: string; value: string
  options: { v: string; l: string }[]; onChange: (v: string) => void
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

interface FilterDialogProps {
  open:      boolean
  values:    FilterValues
  onChange:  (v: FilterValues) => void
  onApply:   () => void
  onClose:   () => void
  onReset:   () => void
}

function FilterDialog({ open, values, onChange, onApply, onClose, onReset }: FilterDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const set = (key: keyof FilterValues) => (v: string) => onChange({ ...values, [key]: v })

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.45)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          width: 580,
          maxWidth: '95vw',
          boxShadow: '0 24px 64px rgba(139,26,26,0.22)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Dialog header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
              <SlidersHorizontal size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 17 }}>Report Filters</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Country Wise User MIS Report</div>
            </div>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center rounded-xl transition-colors"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Active filter strip */}
        <div className="flex items-center gap-2 px-6 py-2.5 flex-wrap" style={{ background: 'var(--gold-pale)', borderBottom: '1px solid var(--sand)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active:</span>
          {[
            values.dateType && { label: values.dateType },
            values.startDate && { label: `From ${values.startDate}` },
            values.endDate && { label: `To ${values.endDate}` },
            values.paymentType && { label: values.paymentType },
            values.nationality && { label: values.nationality },
            values.place && { label: values.place.slice(0, 20) + (values.place.length > 20 ? '…' : '') },
            values.country && { label: values.country },
          ].filter(Boolean).map((item: any, i) => (
            <span key={i} className="rounded-full px-2.5 py-0.5 font-medium"
              style={{ fontSize: 10, background: 'rgba(139,26,26,0.1)', color: 'var(--maroon)' }}>
              {item.label}
            </span>
          ))}
        </div>

        {/* Filter fields */}
        <div className="px-6 py-5 grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* Date type */}
          <div className="col-span-2">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} style={{ color: 'var(--maroon)' }} />
              Date Type
            </div>
            <div className="flex gap-2">
              {['Visit Date', 'Booking Date'].map(opt => (
                <button key={opt} onClick={() => set('dateType')(opt)}
                  className="flex-1 py-2.5 rounded-xl font-medium transition-all"
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

          {/* Start & End dates */}
          <DateField label="Start Date" value={values.startDate} onChange={set('startDate')} />
          <DateField label="End Date"   value={values.endDate}   onChange={set('endDate')} />

          {/* Place */}
          <div className="col-span-2">
            <FilterSelect
              label="Place / Site"
              value={values.place}
              icon={<MapPin size={12} />}
              options={[{ v: '', l: 'All Places' }, ...PLACES.map(p => ({ v: p, l: p }))]}
              onChange={set('place')}
            />
          </div>

          {/* Payment type */}
          <div className="col-span-2">
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={12} style={{ color: 'var(--maroon)' }} />
              Payment Type
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { v: '',          l: 'All',       color: 'var(--text-mid)' },
                { v: 'SUCCESS',   l: 'Success',   color: '#1A7A6E'         },
                { v: 'FAILED',    l: 'Failed',    color: '#E53E3E'         },
                { v: 'CANCELLED', l: 'Cancelled', color: '#8B1A1A'         },
              ].map(opt => (
                <button key={opt.v} onClick={() => set('paymentType')(opt.v)}
                  className="flex-1 py-2.5 rounded-xl font-medium transition-all"
                  style={{
                    fontSize: 12,
                    background: values.paymentType === opt.v ? opt.color : 'var(--cream)',
                    color: values.paymentType === opt.v ? '#fff' : opt.color,
                    border: `1px solid ${values.paymentType === opt.v ? opt.color : 'var(--sand)'}`,
                    cursor: 'pointer',
                    minWidth: 80,
                  }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Nationality */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flag size={12} style={{ color: 'var(--maroon)' }} />
              Nationality
            </div>
            <div className="flex gap-2">
              {[
                { v: '',          l: 'All',       icon: '🌐' },
                { v: 'Indian',    l: 'Indian',    icon: '🇮🇳' },
                { v: 'Foreigner', l: 'Foreigner', icon: '🌍' },
              ].map(opt => (
                <button key={opt.v} onClick={() => set('nationality')(opt.v)}
                  className="flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5"
                  style={{
                    fontSize: 12,
                    background: values.nationality === opt.v ? 'var(--maroon)' : 'var(--cream)',
                    color: values.nationality === opt.v ? '#fff' : 'var(--text-mid)',
                    border: `1px solid ${values.nationality === opt.v ? 'var(--maroon)' : 'var(--sand)'}`,
                    cursor: 'pointer',
                  }}>
                  <span>{opt.icon}</span> {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Country */}
          <FilterSelect
            label="Country"
            value={values.country}
            icon={<Globe size={12} />}
            options={[{ v: '', l: 'All Countries' }, ...COUNTRIES.map(c => ({ v: c, l: c }))]}
            onChange={set('country')}
          />
        </div>

        {/* Dialog footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}
        >
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

// ─── Main Component ────────────────────────────────────────────────────────────

interface CountryWiseReportViewProps {
  data?:         CountryWiseRow[]
  title?:        string
  totalResults?: number
}

export default function CountryWiseReportView({
  data         = SAMPLE_DATA,
  title        = 'Country Wise User MIS Report',
  totalResults = 153488,
}: CountryWiseReportViewProps) {

  const [searchBookingId, setSearchBookingId] = useState('')
  const [filterOpen,      setFilterOpen]      = useState(false)
  const [appliedFilters,  setAppliedFilters]  = useState<FilterValues>(DEFAULT_FILTERS)
  const [pendingFilters,  setPendingFilters]  = useState<FilterValues>(DEFAULT_FILTERS)
  const [page,            setPage]            = useState(1)
  const [pageSize,        setPageSize]        = useState(10)

  const openFilter  = () => { setPendingFilters(appliedFilters); setFilterOpen(true) }
  const applyFilter = () => { setAppliedFilters(pendingFilters); setFilterOpen(false); setPage(1) }
  const resetFilter = () => setPendingFilters(DEFAULT_FILTERS)
  const closeFilter = () => setFilterOpen(false)

  const activeFilterCount = [
    appliedFilters.place,
    appliedFilters.nationality,
    appliedFilters.country,
    appliedFilters.paymentType !== 'SUCCESS' ? appliedFilters.paymentType : '',
  ].filter(Boolean).length

  const filtered = useMemo(() => data.filter(r => {
    if (searchBookingId) {
      const q = searchBookingId.toLowerCase()
      if (!r.bookingId.toLowerCase().includes(q) &&
          !r.userName.toLowerCase().includes(q) &&
          !r.emitraTransId.toLowerCase().includes(q)) return false
    }
    if (appliedFilters.paymentType && r.transactionStatus !== appliedFilters.paymentType) return false
    if (appliedFilters.nationality && r.nationality !== appliedFilters.nationality) return false
    if (appliedFilters.country     && r.country     !== appliedFilters.country)     return false
    if (appliedFilters.place       && r.placeName   !== appliedFilters.place)       return false
    return true
  }), [data, searchBookingId, appliedFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  const grandTotal     = useMemo(() => filtered.reduce((s, r) => s + r.totalAmount, 0), [filtered])
  const totalVisitorSum = useMemo(() => filtered.reduce((s, r) => s + r.totalVisitors, 0), [filtered])
  const foreigners     = filtered.filter(r => r.nationality === 'Foreigner').length
  const successCount   = filtered.filter(r => r.transactionStatus === 'SUCCESS').length

  const thStyle: React.CSSProperties = {
    padding: '11px 14px', fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: '0.7px',
    color: 'var(--text-muted)', textAlign: 'left' as const,
    borderRight: '1px solid var(--sand)', whiteSpace: 'nowrap' as const,
  }

  return (
    <>
      {/* Filter Dialog */}
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
              Inventory Reports · Visitor Nationality & Country Breakdown
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

            {/* Filter button — opens dialog */}
            <button
              onClick={openFilter}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
              style={{
                fontSize: 12,
                background: activeFilterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
                border: `1px solid ${activeFilterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
                color: activeFilterCount > 0 ? '#fff' : 'var(--text-mid)',
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={13} />
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}>{activeFilterCount}</span>
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
            { label: 'Date Type',     val: appliedFilters.dateType    },
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
        <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
          {[
            { label: 'Total Records',    val: filtered.length.toLocaleString('en-IN'),                                                                 icon: '📋', color: 'var(--maroon)', bg: '#fff',    white: false },
            { label: 'Grand Total',      val: '₹' + grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),         icon: '₹',  color: 'var(--maroon)', bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true  },
            { label: 'Total Visitors',   val: totalVisitorSum.toLocaleString('en-IN'),                                                                  icon: '👥', color: '#1A7A6E',       bg: '#fff',    white: false },
            { label: 'Foreign Visitors', val: foreigners.toLocaleString('en-IN'),                                                                       icon: '🌍', color: '#C8922A',       bg: '#fff',    white: false },
            { label: 'Successful',       val: successCount.toLocaleString('en-IN'),                                                                     icon: '✅', color: '#1A7A6E',       bg: '#fff',    white: false },
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
                <thead>
                  <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                    <th style={{ ...thStyle, width: 52, textAlign: 'center', background: 'var(--maroon)', color: 'rgba(255,255,255,0.85)', borderRight: '2px solid rgba(255,255,255,0.15)', position: 'sticky' as const, left: 0, zIndex: 3 }}>Sr.</th>
                    <th style={thStyle}>Booking Date</th>
                    <th style={thStyle}>Visit Date</th>
                    <th style={thStyle}>Booking ID</th>
                    <th style={thStyle}>Emitra Trans. ID</th>
                    <th style={thStyle}>Place Name</th>
                    <th style={{ ...thStyle, textAlign: 'right' as const }}>Total Amt (₹)</th>
                    <th style={{ ...thStyle, textAlign: 'center' as const }}>Visitors</th>
                    <th style={thStyle}>Txn Status</th>
                    <th style={thStyle}>User Name</th>
                    <th style={thStyle}>Mobile</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Nationality</th>
                    <th style={{ ...thStyle, borderRight: 'none' }}>Country</th>
                  </tr>
                </thead>

                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paged.map((r, i) => {
                      const rowBg  = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                      const txnSt  = txnStyle[r.transactionStatus]  ?? txnStyle.PENDING
                      const natSt  = natStyle[r.nationality]        ?? natStyle.Indian

                      return (
                        <tr key={r.bookingId + i}
                          style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.025)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}>

                          {/* Sr.No sticky */}
                          <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--maroon)', background: rowBg, position: 'sticky' as const, left: 0, zIndex: 2, borderRight: '2px solid var(--sand)' }}>
                            {(page - 1) * pageSize + i + 1}
                          </td>

                          {/* Booking Date */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.bookingDate}</span>
                          </td>

                          {/* Visit Date */}
                          <td style={{ padding: '11px 14px', fontWeight: 500, fontSize: 12, borderRight: '1px solid var(--cream-dark)' }}>{r.visitDate}</td>

                          {/* Booking ID */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                            <span style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 600, fontFamily: 'monospace' }}>{r.bookingId}</span>
                          </td>

                          {/* Emitra Trans ID */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.emitraTransId}</span>
                          </td>

                          {/* Place Name */}
                          <td style={{ padding: '11px 14px', maxWidth: 200, borderRight: '1px solid var(--cream-dark)' }}>
                            <span className="font-serif font-semibold" style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, whiteSpace: 'nowrap' }} title={r.placeName}>
                              {r.placeName}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td style={{ padding: '11px 14px', textAlign: 'right', borderRight: '1px solid var(--cream-dark)' }}>
                            <div className="font-serif font-bold" style={{ fontSize: 14, color: 'var(--maroon)' }}>
                              ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>

                          {/* Visitors */}
                          <td style={{ padding: '11px 14px', textAlign: 'center', borderRight: '1px solid var(--cream-dark)' }}>
                            <span className="inline-flex items-center justify-center rounded-full font-bold"
                              style={{ width: 26, height: 26, background: 'rgba(26,122,110,0.1)', color: '#1A7A6E', fontSize: 12 }}>
                              {r.totalVisitors}
                            </span>
                          </td>

                          {/* Transaction Status */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold"
                              style={{ fontSize: 10, ...txnSt }}>
                              {txnSt.icon}
                              {r.transactionStatus}
                            </span>
                          </td>

                          {/* User Name */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
                                style={{ width: 26, height: 26, background: r.nationality === 'Foreigner' ? '#C8922A' : 'var(--maroon)', fontSize: 9 }}>
                                {r.userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium" style={{ fontSize: 12 }}>{r.userName}</span>
                            </div>
                          </td>

                          {/* Mobile */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                            {r.mobile
                              ? <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--text-mid)' }}><Phone size={10} style={{ color: 'var(--text-muted)' }} />{r.mobile}</span>
                              : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            }
                          </td>

                          {/* Email */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)', maxWidth: 180 }}>
                            {r.email
                              ? <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }} title={r.email}>
                                  <Mail size={10} style={{ flexShrink: 0 }} />
                                  {r.email.toLowerCase()}
                                </span>
                              : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            }
                          </td>

                          {/* Nationality */}
                          <td style={{ padding: '11px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
                              style={{ fontSize: 10, ...natSt }}>
                              {natSt.flag} {r.nationality}
                            </span>
                          </td>

                          {/* Country */}
                          <td style={{ padding: '11px 14px' }}>
                            <span className="flex items-center gap-1.5" style={{ fontSize: 12 }}>
                              <Globe size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                              {r.country}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}

                  {/* Page total */}
                  {paged.length > 0 && (
                    <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                      <td colSpan={6} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', position: 'sticky' as const, left: 0, zIndex: 2, background: 'var(--cream-dark)' }}>
                        Page Total — {paged.length} records
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 700, color: 'var(--maroon)' }}>
                        ₹{paged.reduce((s, r) => s + r.totalAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, color: '#1A7A6E' }}>
                        {paged.reduce((s, r) => s + r.totalVisitors, 0)}
                      </td>
                      <td colSpan={6} style={{ padding: '11px 14px' }} />
                    </tr>
                  )}

                  {/* Grand total */}
                  {paged.length > 0 && (
                    <tr style={{ background: 'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop: '1px solid var(--sand)' }}>
                      <td colSpan={6} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', position: 'sticky' as const, left: 0, zIndex: 2, background: 'var(--cream)' }}>
                        Grand Total — All {filtered.length} records
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 700, color: 'var(--maroon)' }}>
                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, color: '#1A7A6E', fontSize: 14 }}>
                        {totalVisitorSum}
                      </td>
                      <td colSpan={6} style={{ padding: '11px 14px' }} />
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
                  <select value={String(pageSize)}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
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
    </>
  )
}
