'use client'

import { useState, useMemo, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import {
  Search, X, ChevronDown, Calendar,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  MapPin, CheckCircle2, XCircle, Clock, RotateCcw, RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentReverifyRow {
  srNo:              number
  bookingId:         string
  bookingDate:       string
  visitDate:         string
  placeName:         string
  prevTxnStatus:     string
  txnStatus:         'SUCCESS' | 'FAIL' | 'PENDING' | 'N/A' | string
  paymentReverify:   boolean
}

type Place = {
  placeId?: string | number
  placeName?: string
  id?: string | number
  name?: string
  [key: string]: unknown
}

function getPlaceId(place: Place) {
  const candidate =
    place.id ??
    (place as any).id ??
    place.placeId ??
    (place as any).place_id ??
    (place as any).placeCode ??
    (place as any).placecode

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  return ''
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    (place as any).placename ??
    (place as any).place_name ??
    place.name ??
    (place as any).name

  return typeof candidate === 'string' ? candidate.trim() : ''
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 4) return null

  const obj = value as Record<string, unknown>
  const preferredKeys = ['result', 'data', 'content', 'list', 'rows', 'items']

  for (const key of preferredKeys) {
    if (key in obj) {
      const found = findFirstArray(obj[key], depth + 1)
      if (found) return found
    }
  }

  for (const child of Object.values(obj)) {
    const found = findFirstArray(child, depth + 1)
    if (found) return found
  }

  return null
}

function extractPlaces(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as Place[]
  return list.filter(item => item && typeof item === 'object') as Place[]
}

function extractRows(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as any[]
  return list.filter(item => item && typeof item === 'object') as any[]
}

function extractTotalRecords(payload: unknown, fallback: number) {
  if (!payload || typeof payload !== 'object') return fallback
  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total ??
    root?.result?.meta?.totalRecords ??
    root?.meta?.totalRecords
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback
}

function getDayStartMs(value: string) {
  if (!value) return Date.now()
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function getDayEndMs(value: string) {
  if (!value) return Date.now()
  const d = new Date(value)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

function formatDateTime(ms: unknown) {
  if (!ms) return 'N/A'
  const num = Number(ms)
  if (isNaN(num) || num <= 0) return String(ms)
  
  const date = new Date(num)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

function formatDateOnly(ms: unknown) {
  if (!ms) return 'N/A'
  const num = Number(ms)
  if (isNaN(num) || num <= 0) return String(ms)
  
  const date = new Date(num)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}-${month}-${year}`
}

// ─── Sample data (from PDF) ───────────────────────────────────────────────────

const SAMPLE_DATA: PaymentReverifyRow[] = [
  { srNo:1,  bookingId:'RTD2601312219073689', bookingDate:'31-01-2026', visitDate:'01-02-2026', placeName:'RTDC DURG CAFETERIA PADAO NAHARGARH',      prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:true  },
  { srNo:2,  bookingId:'HAW2601312011568011', bookingDate:'31-01-2026', visitDate:'03-02-2026', placeName:'HAWA MAHAL',                                prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:true  },
  { srNo:3,  bookingId:'NAH2601311511231057', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'NAHARGARH FORT',                            prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:true  },
  { srNo:4,  bookingId:'JAN2601311429567395', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'JANTAR MANTAR',                             prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:false },
  { srNo:5,  bookingId:'JAN2601311316543659', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'JANTAR MANTAR',                             prevTxnStatus:'N/A', txnStatus:'SUCCESS', paymentReverify:true  },
  { srNo:6,  bookingId:'JAN2601311301329029', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'JANTAR MANTAR',                             prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:true  },
  { srNo:7,  bookingId:'JAN2601311258092338', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'JANTAR MANTAR',                             prevTxnStatus:'N/A', txnStatus:'PENDING', paymentReverify:false },
  { srNo:8,  bookingId:'HAW2601311243521095', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'HAWA MAHAL',                                prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:true  },
  { srNo:9,  bookingId:'JAN2601311238432683', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'JANTAR MANTAR',                             prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:true  },
  { srNo:10, bookingId:'AMB2601311204117842', bookingDate:'31-01-2026', visitDate:'02-02-2026', placeName:'AMBER FORT',                                prevTxnStatus:'N/A', txnStatus:'SUCCESS', paymentReverify:true  },
  { srNo:11, bookingId:'JAN2601311156884301', bookingDate:'31-01-2026', visitDate:'31-01-2026', placeName:'JANTAR MANTAR',                             prevTxnStatus:'N/A', txnStatus:'FAIL',    paymentReverify:false },
  { srNo:12, bookingId:'NAH2601311142609774', bookingDate:'31-01-2026', visitDate:'01-02-2026', placeName:'NAHARGARH FORT',                            prevTxnStatus:'N/A', txnStatus:'SUCCESS', paymentReverify:true  },
]

// ─── Status styles ─────────────────────────────────────────────────────────────

const TXN_STYLE: Record<string, { bg:string; color:string; icon:React.ReactNode }> = {
  SUCCESS: { bg:'rgba(26,122,110,0.12)',  color:'#1A7A6E', icon:<CheckCircle2 size={11} /> },
  FAIL:    { bg:'rgba(229,62,62,0.1)',    color:'#E53E3E', icon:<XCircle size={11} />      },
  PENDING: { bg:'rgba(200,146,42,0.12)', color:'#C8922A', icon:<Clock size={11} />         },
  'N/A':   { bg:'rgba(154,122,90,0.1)',  color:'#9A7A5A', icon:<span style={{fontSize:10}}>—</span> },
}
function getTxnStyle(s: string) {
  return TXN_STYLE[s] ?? TXN_STYLE['N/A']
}

// ─── Filter Dialog ────────────────────────────────────────────────────────────

interface FilterValues {
  startDate: string
  endDate:   string
  placeId:   string
  reverify:  string
}

const DEFAULT_FILTERS: FilterValues = { 
  startDate: '', 
  endDate:   '', 
  placeId:   '',
  reverify:  'true'
}

interface FilterDialogProps {
  open:boolean; values:FilterValues; places:Place[]
  onChange:(v:FilterValues)=>void
  onApply:()=>void; onClose:()=>void; onReset:()=>void
}

function FilterDialog({ open, values, places, onChange, onApply, onClose, onReset }: FilterDialogProps) {
  useEffect(()=>{
    if (!open) return
    const fn=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose() }
    document.addEventListener('keydown',fn)
    return ()=>document.removeEventListener('keydown',fn)
  },[open,onClose])
  if (!open) return null

  const set=(k:keyof FilterValues)=>(v:string)=>onChange({...values,[k]:v})

  const activeCount=[values.startDate,values.endDate,values.placeId].filter(Boolean).length

  const handlePlaceChange = (val: string) => {
    if (val === 'ALL') {
      const allIds = places.map(p => getPlaceId(p)).filter(Boolean).join(',')
      set('placeId')(allIds)
    } else {
      set('placeId')(val)
    }
  }

  // Find selected place name for display
  const getSelectedPlaceLabel = () => {
    if (!values.placeId) return ''
    if (values.placeId.includes(',')) return 'All Places'
    const p = places.find(p => getPlaceId(p) === values.placeId)
    return p ? getPlaceName(p) : values.placeId
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background:'rgba(28,16,8,0.50)', zIndex:1000, backdropFilter:'blur(6px)' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>

      <div className="rounded-2xl overflow-hidden"
        style={{ background:'#fff', width:560, maxWidth:'95vw', boxShadow:'0 32px 80px rgba(139,26,26,0.28)', animation:'fadeIn 0.18s ease-out' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 relative overflow-hidden"
          style={{ background:'linear-gradient(135deg, #6B1212 0%, #A83030 55%, #C8922A 100%)' }}>
          <div style={{ position:'absolute',top:-40,right:-20,width:130,height:130,borderRadius:'50%',background:'rgba(255,255,255,0.06)',pointerEvents:'none' }} />
          <div style={{ position:'absolute',bottom:-25,left:60,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none' }} />

          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width:42,height:42,background:'rgba(255,255,255,0.18)',backdropFilter:'blur(6px)' }}>
              <SlidersHorizontal size={20} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize:19,color:'#fff' }}>Filters</div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,0.62)' }}>Payment Reverify</div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {activeCount>0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                style={{ fontSize:11,background:'rgba(255,255,255,0.2)',color:'#fff' }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#FDB62C',display:'inline-block' }} />
                {activeCount} active
              </div>
            )}
            <button onClick={onClose}
              className="flex items-center justify-center rounded-xl"
              style={{ width:34,height:34,background:'rgba(255,255,255,0.15)',color:'#fff',border:'none',cursor:'pointer' }}
              onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.28)')}
              onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.15)')}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Active chips */}
        {activeCount>0 && (
          <div className="flex items-center gap-2 px-7 py-2.5 flex-wrap"
            style={{ background:'var(--gold-pale)',borderBottom:'1px solid var(--sand)' }}>
            <span style={{ fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px' }}>Active:</span>
            {[
              values.startDate && { label:`From ${new Date(values.startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}` },
              values.endDate   && { label:`To ${new Date(values.endDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}` },
              values.placeId   && { label: getSelectedPlaceLabel() },
            ].filter(Boolean).map((item:any,i)=>(
              <span key={i} className="rounded-full px-2.5 py-0.5 font-medium"
                style={{ fontSize:10,background:'rgba(139,26,26,0.1)',color:'var(--maroon)' }}>{item.label}</span>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className="px-7 py-6 flex flex-col gap-5">

          {/* Date row */}
          <div className="grid grid-cols-2 gap-4">
            {(['startDate','endDate'] as const).map((key,i)=>(
              <div key={key} className="flex flex-col gap-1.5">
                <label style={{ fontSize:11,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,display:'flex',alignItems:'center',gap:5 }}>
                  <Calendar size={11} style={{ color:'var(--maroon)' }} />
                  {i===0?'Start Date':'End Date'}
                </label>
                <input type="date" value={values[key]} onChange={e=>set(key)(e.target.value)}
                  className="rounded-xl px-3 py-3 outline-none"
                  style={{ fontSize:13,background:'#F8F4EE',border:'1px solid var(--sand)',color:'var(--text-dark)' }} />
              </div>
            ))}
          </div>

          {/* Place dropdown */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize:11,color:values.placeId?'var(--maroon)':'var(--text-muted)',fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,display:'flex',alignItems:'center',gap:5 }}>
              <MapPin size={11} style={{ color:'var(--maroon)' }} />
              Select Place
            </label>
            <div className="relative">
              <select 
                value={values.placeId.includes(',') ? 'ALL' : values.placeId} 
                onChange={e=>handlePlaceChange(e.target.value)}
                className="appearance-none w-full rounded-xl pr-8 pl-3 py-3 outline-none"
                style={{ fontSize:13,background:values.placeId?'#FDF3E3':'#F8F4EE',border:`${values.placeId?2:1}px solid ${values.placeId?'var(--maroon)':'var(--sand)'}`,color:'var(--text-dark)',fontWeight:values.placeId?500:400 }}>
                <option value="">Select Place</option>
                <option value="ALL">All Places</option>
                {places.map(p=><option key={getPlaceId(p)} value={getPlaceId(p)}>{getPlaceName(p)}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:values.placeId?'var(--maroon)':'var(--sand-dark)' }} />
            </div>
          </div>

          {/* Reverify Option */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize:11,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,display:'flex',alignItems:'center',gap:5 }}>
              <CheckCircle2 size={11} style={{ color:'var(--maroon)' }} />
              Payment Reverify
            </label>
            <div className="relative">
              <select value={values.reverify} onChange={e=>set('reverify')(e.target.value)}
                className="appearance-none w-full rounded-xl pr-8 pl-3 py-3 outline-none"
                style={{ fontSize:13,background:'#F8F4EE',border:'1px solid var(--sand)',color:'var(--text-dark)' }}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'var(--sand-dark)' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4"
          style={{ borderTop:'1px solid var(--sand)',background:'var(--cream)' }}>
          <button onClick={onReset}
            className="rounded-xl px-6 py-2.5 font-medium"
            style={{ fontSize:13,background:'#fff',border:'1px solid var(--sand)',color:'var(--text-muted)',cursor:'pointer' }}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.borderColor='var(--maroon)')}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.borderColor='var(--sand)')}>
            Clear all
          </button>
          <button onClick={onApply}
            className="flex items-center gap-2 rounded-xl px-10 py-2.5 font-semibold text-white"
            style={{ fontSize:14,background:'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)',cursor:'pointer',boxShadow:'0 4px 14px rgba(139,26,26,0.3)' }}>
            <SlidersHorizontal size={14} /> Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagination button ────────────────────────────────────────────────────────

function PageBtn({ onClick, disabled, active, icon, label }:{
  onClick:()=>void;disabled?:boolean;active?:boolean;icon?:React.ReactNode;label?:string
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-1"
      style={{ minWidth:28,height:28,fontSize:11,background:active?'var(--maroon)':'transparent',color:active?'#fff':disabled?'var(--text-muted)':'var(--text-mid)',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1 }}>
      {icon??label}
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface PaymentReverifyViewProps {
  data?:         PaymentReverifyRow[]
  title?:        string
  totalResults?: number
}

export default function PaymentReverifyView({
  data         = [],
  title        = 'Payment Reverify',
  totalResults = 0,
}: PaymentReverifyViewProps) {

  const [searchTerm,     setSearchTerm]     = useState('')
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(10)

  const [rows,           setRows]           = useState<PaymentReverifyRow[]>([])
  const [totalRecords,   setTotalRecords]   = useState(0)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [places,         setPlaces]         = useState<Place[]>([])
  const [hasSearched,    setHasSearched]    = useState(false)

  // ─── Fetch Places ───
  useEffect(() => {
    let active = true
    const loadPlaces = async () => {
      try {
        const res = await fetch('/api/place?size=2000', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch places')
        const payload = await res.json()
        if (active) setPlaces(extractPlaces(payload))
      } catch (err) {
        console.error('Places load error:', err)
      }
    }
    loadPlaces()
    return () => { active = false }
  }, [])

  // ─── Fetch Data ───
  useEffect(() => {
    if (!hasSearched) return

    let active = true
    const loadData = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          startDay: appliedFilters.startDate ? String(getDayStartMs(appliedFilters.startDate)) : String(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDay:   appliedFilters.endDate ? String(getDayEndMs(appliedFilters.endDate)) : String(Date.now()),
          offSet:   String((page - 1) * pageSize),
          size:     String(pageSize),
          isFilter: 'true',
          placeId:  appliedFilters.placeId || '',
          reverify: appliedFilters.reverify,
          searchKey: searchTerm.trim()
        })

        const res = await fetch(`/api/system/paymentReverify?${params.toString()}`, {
          cache: 'no-store'
        })
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        
        const payload = await res.json()
        if (!active) return

        const apiRows = extractRows(payload)
        const mapped: PaymentReverifyRow[] = apiRows.map((r, i) => ({
          srNo: (page - 1) * pageSize + i + 1,
          bookingId: r.bookingId || r.booking_id || 'N/A',
          bookingDate: formatDateTime(r.bookingDate || r.booking_date),
          visitDate: formatDateOnly(r.visitDate || r.visit_date),
          placeName: r.placeName || r.place_name || 'N/A',
          prevTxnStatus: r.prevTxnStatus || r.previous_status || 'N/A',
          txnStatus: r.transactionStatus || r.txnStatus || r.transaction_status || 'N/A',
          paymentReverify: !!(r.paymentReverify || r.payment_reverify)
        }))

        setRows(mapped)
        setTotalRecords(extractTotalRecords(payload, mapped.length))
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
          setRows([])
          setTotalRecords(0)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [appliedFilters, page, pageSize, hasSearched, searchTerm])

  const openFilter  = ()=>{ setPendingFilters(appliedFilters); setFilterOpen(true) }
  const applyFilter = ()=>{ 
    setAppliedFilters(pendingFilters)
    setFilterOpen(false)
    setPage(1)
    setHasSearched(true)
  }
  const resetFilter = ()=>setPendingFilters(DEFAULT_FILTERS)
  const closeFilter = ()=>setFilterOpen(false)

  const totalPages = Math.max(1,Math.ceil(totalRecords/pageSize))

  const activeFilterCount = [appliedFilters.startDate,appliedFilters.endDate,appliedFilters.placeId].filter(Boolean).length

  const th: React.CSSProperties = {
    padding:'12px 16px',fontSize:10,fontWeight:600,textTransform:'uppercase' as const,
    letterSpacing:'0.8px',color:'var(--text-muted)',textAlign:'left' as const,
    borderRight:'1px solid var(--sand)',whiteSpace:'nowrap' as const,
  }

  return (
    <>
      <FilterDialog open={filterOpen} values={pendingFilters} places={places} onChange={setPendingFilters}
        onApply={applyFilter} onClose={closeFilter} onReset={resetFilter} />

      <div className="flex min-h-screen" style={{ background:'var(--cream)' }}>
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <main className="flex-1 overflow-y-auto page-enter">
            <div style={{ fontFamily:"'Outfit',sans-serif",color:'var(--text-dark)' }}>

        {/* ── Breadcrumb / subtitle strip ── */}
        <div className="px-6 py-2.5"
          style={{ background:'var(--cream)',borderBottom:'1px solid var(--sand)' }}>
          <span style={{ fontSize:12,color:'var(--text-muted)' }}>System</span>
          <span style={{ fontSize:12,color:'var(--text-muted)',margin:'0 6px' }}>›</span>
          <span style={{ fontSize:12,color:'var(--maroon)',fontWeight:500 }}>Payment Reverify</span>
        </div>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom:'1px solid var(--sand)',background:'#fff' }}>
          <div>
            <h2 className="font-serif font-bold" style={{ fontSize:22,color:'var(--text-dark)' }}>{title}</h2>
            <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>
              Verify and reconcile failed payment transactions
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background:'var(--cream-dark)',border:'1px solid var(--sand)',minWidth:250 }}>
              <Search size={13} style={{ color:'var(--text-muted)',flexShrink:0 }} />
              <input value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);setPage(1);setHasSearched(true)}}
                placeholder="Search Booking ID / Place…"
                className="bg-transparent outline-none flex-1"
                style={{ fontSize:12,color:'var(--text-dark)' }} />
              {searchTerm&&<button onClick={()=>setSearchTerm('')}><X size={11} style={{ color:'var(--text-muted)' }} /></button>}
            </div>

            {/* Filter */}
            <button onClick={openFilter}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
              style={{ fontSize:12,background:activeFilterCount>0?'var(--maroon)':'var(--cream-dark)',border:`1px solid ${activeFilterCount>0?'var(--maroon)':'var(--sand)'}`,color:activeFilterCount>0?'#fff':'var(--text-mid)',cursor:'pointer' }}>
              <SlidersHorizontal size={13} />
              Filter
              {activeFilterCount>0&&(
                <span className="absolute -top-2 -right-2 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ width:16,height:16,background:'var(--gold)',fontSize:8 }}>{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── Filter chip strip ── */}
        {activeFilterCount>0 && (
          <div className="flex items-center gap-2.5 px-6 py-2.5 flex-wrap"
            style={{ background:'var(--cream)',borderBottom:'1px solid var(--sand)' }}>
            {[
              appliedFilters.startDate && { label:'Start', val:new Date(appliedFilters.startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) },
              appliedFilters.endDate   && { label:'End',   val:new Date(appliedFilters.endDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) },
              appliedFilters.placeId   && { 
                label:'Place', 
                val: appliedFilters.placeId.includes(',') ? 'All Places' : (places.find(p=>getPlaceId(p)===appliedFilters.placeId)?.placeName || appliedFilters.placeId)
              },
              { label:'Reverify', val: appliedFilters.reverify }
            ].filter(Boolean).map((chip:any,i)=>(
              <div key={i} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                style={{ background:'#fff',border:'1px solid var(--sand)',fontSize:11 }}>
                <span style={{ fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px' }}>{chip.label}:</span>
                <span className="font-medium" style={{ color:'var(--maroon)' }}>{chip.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Main Table Content ── */}
        <div className="p-6">
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border:'1px solid var(--sand)',background:'#fff' }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background:'var(--cream-dark)' }}>
                    <th style={{ ...th,width:60,textAlign:'center' }}>Sr.No</th>
                    <th style={th}>Booking Details</th>
                    <th style={th}>Visit Date</th>
                    <th style={th}>Place Name</th>
                    <th style={{ ...th,textAlign:'center' as const }}>Previous Txn Status</th>
                    <th style={{ ...th,textAlign:'center' as const }}>Transaction Status</th>
                    <th style={{ ...th,textAlign:'center' as const,borderRight:'none' }}>Payment Reverify</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding:48,textAlign:'center',color:'var(--text-muted)',fontSize:13 }}>Loading...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={7} style={{ padding:48,textAlign:'center',color:'#E53E3E',fontSize:13 }}>{error}</td></tr>
                  ) : !hasSearched ? (
                    <tr><td colSpan={7} style={{ padding:48,textAlign:'center',color:'var(--text-muted)',fontSize:13 }}>Please apply filters to view data.</td></tr>
                  ) : rows.length===0 ? (
                    <tr><td colSpan={7} style={{ padding:48,textAlign:'center',color:'var(--text-muted)',fontSize:13 }}>No records found.</td></tr>
                  ) : (
                    rows.map((r,i)=>(
                      <tr key={r.bookingId+i} 
                        style={{ borderBottom:'1px solid var(--sand)',background:i%2===0?'#fff':'var(--cream-pale)' }}
                        onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(139,26,26,0.02)')}
                        onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=i%2===0?'#fff':'var(--cream-pale)')}>
                        
                        <td style={{ padding:'13px 16px',textAlign:'center',fontSize:12,fontWeight:600,color:'var(--maroon)',borderRight:'1px solid var(--sand)' }}>
                          {r.srNo}
                        </td>

                        <td style={{ padding:'13px 16px',borderRight:'1px solid var(--sand)' }}>
                          <div className="font-semibold" style={{ fontSize:12,color:'var(--text-dark)',letterSpacing:'-0.2px' }}>{r.bookingId}</div>
                          <div style={{ fontSize:10,color:'var(--text-muted)',marginTop:1 }}>{r.bookingDate}</div>
                        </td>

                        <td style={{ padding:'13px 16px',borderRight:'1px solid var(--sand)' }}>
                          <div className="flex items-center gap-1.5" style={{ fontSize:12,color:'var(--text-mid)' }}>
                            <Calendar size={12} className="text-amber-600" />
                            {r.visitDate}
                          </div>
                        </td>

                        <td style={{ padding:'13px 16px',borderRight:'1px solid var(--sand)' }}>
                          <div className="flex items-center gap-1.5" style={{ fontSize:12,color:'var(--text-dark)',fontWeight:500 }}>
                            <MapPin size={12} className="text-red-800" />
                            {r.placeName}
                          </div>
                        </td>

                        <td style={{ padding:'13px 16px',textAlign:'center',borderRight:'1px solid var(--sand)' }}>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                            style={{ fontSize:11, ...getTxnStyle(r.prevTxnStatus) }}>
                            {getTxnStyle(r.prevTxnStatus).icon}
                            {r.prevTxnStatus}
                          </span>
                        </td>

                        <td style={{ padding:'13px 16px',textAlign:'center',borderRight:'1px solid var(--sand)' }}>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                            style={{ fontSize:11, ...getTxnStyle(r.txnStatus) }}>
                            {getTxnStyle(r.txnStatus).icon}
                            {r.txnStatus}
                          </span>
                        </td>

                        {/* Payment Reverify — indicator */}
                        <td style={{ padding:'13px 16px',textAlign:'center' }}>
                          {r.paymentReverify ? (
                            <div className="inline-flex items-center gap-2">
                               <CheckCircle2 size={16} style={{ color:'#1A7A6E' }} />
                               <span style={{ fontSize:11, fontWeight:600, color:'#1A7A6E' }}>Verified</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                               <XCircle size={16} style={{ color:'var(--text-muted)' }} />
                               <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)' }}>Pending</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {hasSearched && rows.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4"
                style={{ background:'var(--cream-dark)',borderTop:'1px solid var(--sand)' }}>
                <div style={{ fontSize:11,color:'var(--text-muted)' }}>
                  Showing <span className="font-semibold" style={{ color:'var(--text-dark)' }}>{(page-1)*pageSize+1}</span> to <span className="font-semibold" style={{ color:'var(--text-dark)' }}>{Math.min(page*pageSize,totalRecords)}</span> of <span className="font-semibold" style={{ color:'var(--text-dark)' }}>{totalRecords}</span> results
                </div>

                <div className="flex items-center gap-1">
                  <PageBtn onClick={()=>setPage(1)} disabled={page===1} icon={<ChevronLeft size={14} />} />
                  <PageBtn onClick={()=>setPage(page-1)} disabled={page===1} label="Prev" />
                  
                  {/* Page numbers */}
                  {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                    let p=page;
                    if(page<=3) p=i+1;
                    else if(page>=totalPages-2) p=totalPages-4+i;
                    else p=page-2+i;
                    if(p<1||p>totalPages) return null;
                    return <PageBtn key={p} onClick={()=>setPage(p)} active={page===p} label={String(p)} />
                  })}

                  <PageBtn onClick={()=>setPage(page+1)} disabled={page===totalPages} label="Next" />
                  <PageBtn onClick={()=>setPage(totalPages)} disabled={page===totalPages} icon={<ChevronRight size={14} />} />
                </div>

                <div className="flex items-center gap-2">
                  <span style={{ fontSize:11,color:'var(--text-muted)' }}>Rows per page:</span>
                  <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}
                    className="rounded-lg px-2 py-1 outline-none"
                    style={{ fontSize:11,background:'#fff',border:'1px solid var(--sand)',color:'var(--text-dark)' }}>
                    {[10,25,50,100].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</>
)
}
