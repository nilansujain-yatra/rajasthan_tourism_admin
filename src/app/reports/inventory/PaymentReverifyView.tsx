'use client'

import { useState, useMemo, useEffect } from 'react'
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

// ─── Unique places from data ──────────────────────────────────────────────────

const PLACES = Array.from(new Set(SAMPLE_DATA.map(r => r.placeName))).sort()

// ─── Filter Dialog ────────────────────────────────────────────────────────────

interface FilterValues {
  startDate: string
  endDate:   string
  place:     string
}

const DEFAULT_FILTERS: FilterValues = { startDate:'', endDate:'', place:'' }

interface FilterDialogProps {
  open:boolean; values:FilterValues
  onChange:(v:FilterValues)=>void
  onApply:()=>void; onClose:()=>void; onReset:()=>void
}

function FilterDialog({ open, values, onChange, onApply, onClose, onReset }: FilterDialogProps) {
  useEffect(()=>{
    if (!open) return
    const fn=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose() }
    document.addEventListener('keydown',fn)
    return ()=>document.removeEventListener('keydown',fn)
  },[open,onClose])
  if (!open) return null

  const set=(k:keyof FilterValues)=>(v:string)=>onChange({...values,[k]:v})

  const activeCount=[values.startDate,values.endDate,values.place].filter(Boolean).length

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
              values.place     && { label: values.place.length>20 ? values.place.slice(0,20)+'…' : values.place },
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
            <label style={{ fontSize:11,color:values.place?'var(--maroon)':'var(--text-muted)',fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,display:'flex',alignItems:'center',gap:5 }}>
              <MapPin size={11} style={{ color:'var(--maroon)' }} />
              Select Place
            </label>
            <div className="relative">
              <select value={values.place} onChange={e=>set('place')(e.target.value)}
                className="appearance-none w-full rounded-xl pr-8 pl-3 py-3 outline-none"
                style={{ fontSize:13,background:values.place?'#FDF3E3':'#F8F4EE',border:`${values.place?2:1}px solid ${values.place?'var(--maroon)':'var(--sand)'}`,color:'var(--text-dark)',fontWeight:values.place?500:400 }}>
                <option value="">All Places</option>
                {PLACES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:values.place?'var(--maroon)':'var(--sand-dark)' }} />
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
  data         = SAMPLE_DATA,
  title        = 'Payment Reverify',
  totalResults = 5885,
}: PaymentReverifyViewProps) {

  const [searchTerm,     setSearchTerm]     = useState('')
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(10)

  const openFilter  = ()=>{ setPendingFilters(appliedFilters); setFilterOpen(true) }
  const applyFilter = ()=>{ setAppliedFilters(pendingFilters); setFilterOpen(false); setPage(1) }
  const resetFilter = ()=>setPendingFilters(DEFAULT_FILTERS)
  const closeFilter = ()=>setFilterOpen(false)

  const filtered = useMemo(()=>data.filter(r=>{
    if(searchTerm){
      const q=searchTerm.toLowerCase()
      if(!r.bookingId.toLowerCase().includes(q)&&!r.placeName.toLowerCase().includes(q)) return false
    }
    if(appliedFilters.place && r.placeName!==appliedFilters.place) return false
    return true
  }),[data,searchTerm,appliedFilters])

  const totalPages = Math.max(1,Math.ceil(filtered.length/pageSize))
  const paged      = filtered.slice((page-1)*pageSize,page*pageSize)

  const failCount    = filtered.filter(r=>r.txnStatus==='FAIL').length
  const successCount = filtered.filter(r=>r.txnStatus==='SUCCESS').length
  const pendingCount = filtered.filter(r=>r.txnStatus==='PENDING').length
  const reverifiedCount = filtered.filter(r=>r.paymentReverify).length

  const activeFilterCount = [appliedFilters.startDate,appliedFilters.endDate,appliedFilters.place].filter(Boolean).length

  const th: React.CSSProperties = {
    padding:'12px 16px',fontSize:10,fontWeight:600,textTransform:'uppercase' as const,
    letterSpacing:'0.8px',color:'var(--text-muted)',textAlign:'left' as const,
    borderRight:'1px solid var(--sand)',whiteSpace:'nowrap' as const,
  }

  return (
    <>
      <FilterDialog open={filterOpen} values={pendingFilters} onChange={setPendingFilters}
        onApply={applyFilter} onClose={closeFilter} onReset={resetFilter} />

      <div style={{ fontFamily:"'Outfit',sans-serif",color:'var(--text-dark)' }}>

        {/* ── Breadcrumb / subtitle strip ── */}
        <div className="px-6 py-2.5"
          style={{ background:'var(--cream)',borderBottom:'1px solid var(--sand)' }}>
          <span style={{ fontSize:12,color:'var(--text-muted)' }}>Place Management</span>
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
              <input value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);setPage(1)}}
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
              <span className="absolute -top-1 -right-1 rounded-full"
                style={{ width:8,height:8,background:'#E53E3E',border:'2px solid #fff' }} />
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
              appliedFilters.place     && { label:'Place', val:appliedFilters.place.length>20?appliedFilters.place.slice(0,20)+'…':appliedFilters.place },
            ].filter(Boolean).map((chip:any,i)=>(
              <div key={i} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                style={{ background:'#fff',border:'1px solid var(--sand)',fontSize:11 }}>
                <span style={{ fontSize:10,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px' }}>{chip.label}:</span>
                <span className="font-medium" style={{ color:'var(--maroon)' }}>{chip.val}</span>
              </div>
            ))}
            <button onClick={()=>{setAppliedFilters(DEFAULT_FILTERS);setPage(1)}}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ml-auto"
              style={{ fontSize:11,background:'rgba(229,62,62,0.08)',color:'#E53E3E',cursor:'pointer',border:'none' }}>
              <X size={10} /> Clear all
            </button>
          </div>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background:'var(--cream)' }}>
          {[
            { label:'Total Records',   val:filtered.length.toLocaleString('en-IN'), icon:'📋', color:'var(--maroon)', bg:'#fff',    white:false },
            { label:'Failed',          val:failCount.toLocaleString('en-IN'),        icon:'❌', color:'#E53E3E',       bg:'linear-gradient(135deg,#6B1212,#A83030)', white:true },
            { label:'Successful',      val:successCount.toLocaleString('en-IN'),     icon:'✅', color:'#1A7A6E',       bg:'#fff',    white:false },
            { label:'Pending',         val:pendingCount.toLocaleString('en-IN'),     icon:'⏳', color:'#C8922A',       bg:'#fff',    white:false },
            { label:'Reverified',      val:reverifiedCount.toLocaleString('en-IN'),  icon:'🔄', color:'#1A7A6E',       bg:'#fff',    white:false },
          ].map(s=>(
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
              style={{ background:s.bg,border:s.white?'none':'1px solid var(--sand)' }}>
              {s.white&&<div style={{ position:'absolute',top:-24,right:-24,width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,0.1)' }} />}
              <span style={{ fontSize:22,flexShrink:0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize:10,color:s.white?'rgba(255,255,255,0.7)':'var(--text-muted)' }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize:22,color:s.white?'#fff':s.color,lineHeight:1.1 }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="px-6 pb-6">
          <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--sand)',background:'#fff' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--cream-dark)',borderBottom:'2px solid var(--sand)' }}>
                  <th style={{ ...th,width:52,textAlign:'center',background:'var(--maroon)',color:'rgba(255,255,255,0.85)',borderRight:'2px solid rgba(255,255,255,0.15)' }}>
                    Sr.
                  </th>
                  <th style={th}>Booking ID</th>
                  <th style={th}>Booking Date</th>
                  <th style={th}>Visit Date</th>
                  <th style={th}>Place Name</th>
                  <th style={{ ...th,textAlign:'center' as const }}>Previous Txn Status</th>
                  <th style={{ ...th,textAlign:'center' as const }}>Transaction Status</th>
                  <th style={{ ...th,textAlign:'center' as const,borderRight:'none' }}>Payment Reverify</th>
                </tr>
              </thead>

              <tbody>
                {paged.length===0 ? (
                  <tr><td colSpan={8} style={{ padding:48,textAlign:'center',color:'var(--text-muted)',fontSize:13 }}>No records match the current filters.</td></tr>
                ) : (
                  paged.map((r,i)=>{
                    const rowBg=i%2===0?'#fff':'rgba(251,246,239,0.55)'
                    const ts=getTxnStyle(r.txnStatus)
                    const ps=getTxnStyle(r.prevTxnStatus)
                    return (
                      <tr key={r.bookingId}
                        style={{ background:rowBg,transition:'background 0.12s',borderBottom:'1px solid var(--cream-dark)' }}
                        onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(139,26,26,0.025)')}
                        onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=rowBg)}>

                        {/* Sr.No */}
                        <td style={{ padding:'13px 16px',textAlign:'center',fontWeight:700,fontSize:12,color:'var(--maroon)',borderRight:'2px solid var(--sand)' }}>
                          {(page-1)*pageSize+i+1}
                        </td>

                        {/* Booking ID */}
                        <td style={{ padding:'13px 16px',borderRight:'1px solid var(--cream-dark)' }}>
                          <span style={{ fontSize:11,color:'var(--maroon)',fontWeight:700,fontFamily:'monospace',letterSpacing:'0.2px' }}>
                            {r.bookingId}
                          </span>
                        </td>

                        {/* Booking Date */}
                        <td style={{ padding:'13px 16px',borderRight:'1px solid var(--cream-dark)',whiteSpace:'nowrap' }}>
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} style={{ color:'var(--text-muted)',flexShrink:0 }} />
                            <span style={{ fontSize:12,fontWeight:500 }}>{r.bookingDate}</span>
                          </div>
                        </td>

                        {/* Visit Date */}
                        <td style={{ padding:'13px 16px',borderRight:'1px solid var(--cream-dark)',whiteSpace:'nowrap' }}>
                          <span style={{ fontSize:12,fontWeight:500 }}>{r.visitDate}</span>
                        </td>

                        {/* Place Name */}
                        <td style={{ padding:'13px 16px',borderRight:'1px solid var(--cream-dark)',maxWidth:220 }}>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center rounded-lg flex-shrink-0"
                              style={{ width:28,height:28,background:'rgba(139,26,26,0.07)',fontSize:13 }}>🏛️</span>
                            <span className="font-serif font-semibold"
                              style={{ fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:175,display:'block' }}
                              title={r.placeName}>{r.placeName}</span>
                          </div>
                        </td>

                        {/* Previous Txn Status */}
                        <td style={{ padding:'13px 16px',textAlign:'center',borderRight:'1px solid var(--cream-dark)' }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
                            style={{ fontSize:11,...ps }}>
                            {ps.icon}
                            {r.prevTxnStatus}
                          </span>
                        </td>

                        {/* Txn Status */}
                        <td style={{ padding:'13px 16px',textAlign:'center',borderRight:'1px solid var(--cream-dark)' }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
                            style={{ fontSize:11,...ts }}>
                            {ts.icon}
                            {r.txnStatus}
                          </span>
                        </td>

                        {/* Payment Reverify — toggle-style indicator */}
                        <td style={{ padding:'13px 16px',textAlign:'center' }}>
                          {r.paymentReverify ? (
                            <div className="inline-flex items-center gap-2">
                              {/* Toggle ON */}
                              <div className="rounded-full relative"
                                style={{ width:38,height:20,background:'var(--teal)',cursor:'pointer',flexShrink:0 }}>
                                <div className="absolute top-1 rounded-full bg-white"
                                  style={{ width:14,height:14,left:22,transition:'left 0.2s' }} />
                              </div>
                              <span style={{ fontSize:11,color:'#1A7A6E',fontWeight:600 }}>True</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              {/* Toggle OFF */}
                              <div className="rounded-full relative"
                                style={{ width:38,height:20,background:'var(--sand-dark)',cursor:'pointer',flexShrink:0 }}>
                                <div className="absolute top-1 rounded-full bg-white"
                                  style={{ width:14,height:14,left:2,transition:'left 0.2s' }} />
                              </div>
                              <span style={{ fontSize:11,color:'var(--text-muted)',fontWeight:500 }}>False</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderTop:'1px solid var(--sand)',background:'var(--cream)' }}>

              <div className="flex items-center gap-2">
                <span style={{ fontSize:11,color:'var(--text-muted)' }}>Display Data:</span>
                <div className="relative">
                  <select value={String(pageSize)} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}
                    className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                    style={{ fontSize:11,background:'#fff',border:'1px solid var(--sand)',color:'var(--text-dark)' }}>
                    {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
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

              <div style={{ fontSize:11,color:'var(--text-muted)' }}>
                Result:{' '}
                <strong style={{ color:'var(--text-dark)' }}>
                  {filtered.length===0?0:`${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)}`}
                </strong>{' '}of{' '}
                <strong style={{ color:'var(--maroon)' }}>{totalResults}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
