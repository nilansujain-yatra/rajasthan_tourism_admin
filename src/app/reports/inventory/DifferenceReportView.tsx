'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Download, Search, X, ChevronDown, Calendar,
  ChevronLeft, ChevronRight, SlidersHorizontal, MapPin,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DifferenceRow {
  srNo:          number
  bookingNumber: string
  bookingDate:   string
  visitDate:     string
  emitraTransId: string
  totalEntryFee: number
  totalEcoDev:   number
  totalTRDFFee:  number
  vehicleRent:   number
  vehicleGST:    number
  guideFee:      number
  guideGST:      number
  quota:         string
  shift:         string
  totalVisitor:  number
  totalPrice:    number
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_DATA: DifferenceRow[] = [
  { srNo:1,  bookingNumber:'SAR2602011239224717', bookingDate:'01-02-2026', visitDate:'09-04-2026', emitraTransId:'-',            totalEntryFee:150, totalEcoDev:23, totalTRDFFee:78, vehicleRent:1156, vehicleGST:18, guideFee:642, guideGST:174, quota:'Advance', shift:'Morning Shift', totalVisitor:6,  totalPrice:10299.87 },
  { srNo:2,  bookingNumber:'SAR2602011249409036', bookingDate:'01-02-2026', visitDate:'09-04-2026', emitraTransId:'-',            totalEntryFee:150, totalEcoDev:20, totalTRDFFee:65, vehicleRent:1156, vehicleGST:18, guideFee:558, guideGST:100, quota:'Normal',  shift:'Morning Shift', totalVisitor:5,  totalPrice:8820.00  },
  { srNo:3,  bookingNumber:'SAR2602111222068760', bookingDate:'11-02-2026', visitDate:'11-04-2026', emitraTransId:'-',            totalEntryFee:9,   totalEcoDev:0,  totalTRDFFee:0,  vehicleRent:337,  vehicleGST:17, guideFee:279, guideGST:0,   quota:'Normal',  shift:'Evening Shift', totalVisitor:1,  totalPrice:778.45   },
  { srNo:4,  bookingNumber:'SAR2602122129304695', bookingDate:'12-02-2026', visitDate:'06-04-2026', emitraTransId:'260763768375', totalEntryFee:118, totalEcoDev:12, totalTRDFFee:42, vehicleRent:650,  vehicleGST:33, guideFee:837, guideGST:0,   quota:'Normal',  shift:'Morning Shift', totalVisitor:3,  totalPrice:4320.50  },
  { srNo:5,  bookingNumber:'SAR2602171224559212', bookingDate:'17-02-2026', visitDate:'06-04-2026', emitraTransId:'-',            totalEntryFee:82,  totalEcoDev:8,  totalTRDFFee:28, vehicleRent:337,  vehicleGST:17, guideFee:279, guideGST:0,   quota:'Normal',  shift:'Morning Shift', totalVisitor:2,  totalPrice:2400.00  },
  { srNo:6,  bookingNumber:'SAR2602181014385372', bookingDate:'18-02-2026', visitDate:'24-04-2026', emitraTransId:'-',            totalEntryFee:45,  totalEcoDev:5,  totalTRDFFee:18, vehicleRent:337,  vehicleGST:17, guideFee:0,   guideGST:0,   quota:'Normal',  shift:'Morning Shift', totalVisitor:1,  totalPrice:1180.00  },
  { srNo:7,  bookingNumber:'SAR2602181309044039', bookingDate:'18-02-2026', visitDate:'04-04-2026', emitraTransId:'-',            totalEntryFee:118, totalEcoDev:12, totalTRDFFee:42, vehicleRent:650,  vehicleGST:33, guideFee:558, guideGST:100, quota:'Advance', shift:'Evening Shift', totalVisitor:4,  totalPrice:5640.30  },
  { srNo:8,  bookingNumber:'SAR2602181336516663', bookingDate:'18-02-2026', visitDate:'05-04-2026', emitraTransId:'-',            totalEntryFee:118, totalEcoDev:12, totalTRDFFee:42, vehicleRent:650,  vehicleGST:33, guideFee:837, guideGST:150, quota:'Normal',  shift:'Morning Shift', totalVisitor:5,  totalPrice:6240.00  },
  { srNo:9,  bookingNumber:'SAR2602190740285830', bookingDate:'19-02-2026', visitDate:'24-04-2026', emitraTransId:'-',            totalEntryFee:182, totalEcoDev:18, totalTRDFFee:60, vehicleRent:650,  vehicleGST:33, guideFee:1116,guideGST:201, quota:'Normal',  shift:'Morning Shift', totalVisitor:7,  totalPrice:8890.50  },
  { srNo:10, bookingNumber:'SAR2602201045116427', bookingDate:'20-02-2026', visitDate:'25-04-2026', emitraTransId:'260764112890', totalEntryFee:150, totalEcoDev:15, totalTRDFFee:52, vehicleRent:337,  vehicleGST:17, guideFee:558, guideGST:100, quota:'Advance', shift:'Evening Shift', totalVisitor:5,  totalPrice:7200.00  },
  { srNo:11, bookingNumber:'SAR2602211138729054', bookingDate:'21-02-2026', visitDate:'28-04-2026', emitraTransId:'-',            totalEntryFee:64,  totalEcoDev:6,  totalTRDFFee:22, vehicleRent:337,  vehicleGST:17, guideFee:279, guideGST:0,   quota:'Normal',  shift:'Morning Shift', totalVisitor:2,  totalPrice:2800.00  },
  { srNo:12, bookingNumber:'SAR2602241510334891', bookingDate:'24-02-2026', visitDate:'30-04-2026', emitraTransId:'260764458720', totalEntryFee:228, totalEcoDev:22, totalTRDFFee:75, vehicleRent:650,  vehicleGST:33, guideFee:1395,guideGST:251, quota:'Advance', shift:'Morning Shift', totalVisitor:8,  totalPrice:11200.00 },
]

// ─── Options ──────────────────────────────────────────────────────────────────

const PLACES = [
  'Sariska Tiger Reserve, Alwar',
  'Jhalana/amagarh Leopard Conservation Reserve',
  'National Chambal Gharial Sanctuary Palighat',
  'Mukundra Hills Tiger Reserve',
  'Beed Papad Leopard Safari',
]

const PAYMENT_STATUSES = ['All', 'Success', 'Failed', 'Pending', 'Refunded']

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterValues {
  dateType:      string
  startDate:     string
  endDate:       string
  place:         string
  paymentStatus: string
}

const DEFAULT_FILTERS: FilterValues = {
  dateType:      'Visit Date',
  startDate:     '2026-02-01',
  endDate:       '2026-04-27',
  place:         '',
  paymentStatus: '',
}

// ─── Filter Dialog ────────────────────────────────────────────────────────────

function FSelect({ label, value, options, onChange, icon, highlight }: {
  label: string; value: string; options: { v: string; l: string }[]
  onChange: (v: string) => void; icon?: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 11, color: highlight ? 'var(--maroon)' : 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon} {label}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none w-full rounded-xl pr-8 pl-3 py-3 outline-none"
          style={{ fontSize: 13, background: highlight ? '#FDF3E3' : '#F8F4EE', border: `${highlight ? 2 : 1}px solid ${highlight ? 'var(--maroon)' : 'var(--sand)'}`, color: 'var(--text-dark)', fontWeight: highlight ? 500 : 400 }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: highlight ? 'var(--maroon)' : 'var(--sand-dark)' }} />
      </div>
    </div>
  )
}

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

  const activeCount = [
    values.startDate, values.endDate, values.place,
    values.paymentStatus && values.paymentStatus !== 'All' ? values.paymentStatus : '',
  ].filter(Boolean).length

  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.50)', zIndex: 1000, backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', width: 680, maxWidth: '95vw', boxShadow: '0 32px 80px rgba(139,26,26,0.28)', animation: 'fadeIn 0.18s ease-out' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 55%, #C8922A 100%)' }}>
          <div style={{ position:'absolute', top:-40, right:-20, width:130, height:130, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-25, left:60, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width:42, height:42, background:'rgba(255,255,255,0.18)', backdropFilter:'blur(6px)' }}>
              <SlidersHorizontal size={20} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize:19, color:'#fff' }}>Filters</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.62)' }}>Difference Report</div>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                style={{ fontSize:11, background:'rgba(255,255,255,0.2)', color:'#fff' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#FDB62C', display:'inline-block' }} />
                {activeCount} active
              </div>
            )}
            <button onClick={onClose}
              className="flex items-center justify-center rounded-xl"
              style={{ width:34, height:34, background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', cursor:'pointer' }}
              onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.28)')}
              onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.15)')}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Active chips */}
        {activeCount > 0 && (
          <div className="flex items-center gap-2 px-7 py-2.5 flex-wrap"
            style={{ background:'var(--gold-pale)', borderBottom:'1px solid var(--sand)' }}>
            <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Active:</span>
            {[
              values.dateType && { label: values.dateType },
              values.startDate && { label: `From ${new Date(values.startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}` },
              values.endDate && { label: `To ${new Date(values.endDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}` },
              values.place && { label: values.place.slice(0,22)+'…' },
              values.paymentStatus && values.paymentStatus !== 'All' && { label: values.paymentStatus },
            ].filter(Boolean).map((item: any, i) => (
              <span key={i} className="rounded-full px-2.5 py-0.5 font-medium"
                style={{ fontSize:10, background:'rgba(139,26,26,0.1)', color:'var(--maroon)' }}>
                {item.label}
              </span>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className="px-7 py-6">
          {/* Date Type — toggle row */}
          <div className="mb-5">
            <label style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.4px', textTransform:'uppercase' as const, display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
              <Calendar size={11} style={{ color:'var(--maroon)' }} /> Date Type
            </label>
            <div className="flex gap-2">
              {['Visit Date','Booking Date'].map(opt => (
                <button key={opt} onClick={()=>set('dateType')(opt)}
                  className="flex-1 py-2.5 rounded-xl font-medium transition-all"
                  style={{ fontSize:13, background: values.dateType===opt ? 'var(--maroon)' : 'var(--cream)', color: values.dateType===opt ? '#fff' : 'var(--text-mid)', border:`1px solid ${values.dateType===opt ? 'var(--maroon)' : 'var(--sand)'}`, cursor:'pointer' }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Row: Start Date | End Date */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns:'1fr 1fr' }}>
            {['startDate','endDate'].map((key,i)=>(
              <div key={key} className="flex flex-col gap-1.5">
                <label style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.4px', textTransform:'uppercase' as const, display:'flex', alignItems:'center', gap:5 }}>
                  <Calendar size={11} style={{ color:'var(--maroon)' }} /> {i===0?'Start Date':'End Date'}
                </label>
                <input type="date" value={values[key as keyof FilterValues]} onChange={e=>set(key as keyof FilterValues)(e.target.value)}
                  className="rounded-xl px-3 py-3 outline-none"
                  style={{ fontSize:13, background:'#F8F4EE', border:'1px solid var(--sand)', color:'var(--text-dark)' }} />
              </div>
            ))}
          </div>

          {/* Place dropdown */}
          <div className="mb-5">
            <FSelect
              label="Place / Site"
              value={values.place}
              icon={<MapPin size={11} style={{ color:'var(--maroon)' }} />}
              options={[{v:'',l:'All Places'}, ...PLACES.map(p=>({v:p,l:p}))]}
              onChange={set('place')}
              highlight={!!values.place}
            />
          </div>

          {/* Payment Status — coloured pills */}
          <div>
            <label style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.4px', textTransform:'uppercase' as const, display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
              <CheckCircle2 size={11} style={{ color:'var(--maroon)' }} /> Payment Status
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { v:'',         l:'All',      bg:'#5A3A1A', active:'#5A3A1A' },
                { v:'Success',  l:'Success',  bg:'#1A7A6E', active:'#1A7A6E' },
                { v:'Failed',   l:'Failed',   bg:'#E53E3E', active:'#E53E3E' },
                { v:'Pending',  l:'Pending',  bg:'#C8922A', active:'#C8922A' },
                { v:'Refunded', l:'Refunded', bg:'#8B1A1A', active:'#8B1A1A' },
              ].map(opt=>(
                <button key={opt.v} onClick={()=>set('paymentStatus')(opt.v)}
                  className="flex-1 py-2.5 rounded-xl font-medium"
                  style={{ fontSize:12, minWidth:80, background: values.paymentStatus===opt.v ? opt.active : 'var(--cream)', color: values.paymentStatus===opt.v ? '#fff' : opt.active, border:`1px solid ${values.paymentStatus===opt.v ? opt.active : 'var(--sand)'}`, cursor:'pointer' }}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4"
          style={{ borderTop:'1px solid var(--sand)', background:'var(--cream)' }}>
          <button onClick={onReset}
            className="rounded-xl px-6 py-2.5 font-medium"
            style={{ fontSize:13, background:'#fff', border:'1px solid var(--sand)', color:'var(--text-muted)', cursor:'pointer' }}>
            Clear all
          </button>
          <button onClick={onApply}
            className="flex items-center gap-2 rounded-xl px-10 py-2.5 font-semibold text-white"
            style={{ fontSize:14, background:'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', cursor:'pointer', boxShadow:'0 4px 14px rgba(139,26,26,0.3)' }}>
            <SlidersHorizontal size={14} /> Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNum = (v: number) =>
  v === 0 ? <span style={{ color:'var(--text-muted)' }}>—</span> : <>{v.toLocaleString('en-IN')}</>

const fmtInr = (v: number) =>
  v === 0 ? <span style={{ color:'var(--text-muted)' }}>—</span> : <>₹{v.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</>

function PageBtn({ onClick, disabled, active, icon, label }: {
  onClick:()=>void; disabled?:boolean; active?:boolean; icon?:React.ReactNode; label?:string
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-1"
      style={{ minWidth:28, height:28, fontSize:11, background:active?'var(--maroon)':'transparent', color:active?'#fff':disabled?'var(--text-muted)':'var(--text-mid)', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.4:1 }}>
      {icon ?? label}
    </button>
  )
}

// ─── Column group header ──────────────────────────────────────────────────────

const GRP: Record<string, { bg: string; color: string }> = {
  booking:  { bg:'#8B1A1A', color:'#fff' },
  fees:     { bg:'#1A7A6E', color:'#fff' },
  vehicle:  { bg:'#C8922A', color:'#fff' },
  guide:    { bg:'#5A3A1A', color:'#fff' },
  trip:     { bg:'#6B1212', color:'#fff' },
}
const thGroup: React.CSSProperties = {
  padding:'6px 10px', fontSize:10, fontWeight:600, textTransform:'uppercase' as const,
  letterSpacing:'0.7px', whiteSpace:'nowrap' as const, textAlign:'center' as const,
  borderRight:'2px solid rgba(255,255,255,0.18)',
}
const thSub: React.CSSProperties = {
  padding:'8px 11px', fontSize:10, fontWeight:600, textTransform:'uppercase' as const,
  letterSpacing:'0.55px', whiteSpace:'nowrap' as const, color:'var(--text-mid)',
  borderBottom:'2px solid var(--sand)', borderRight:'1px solid var(--sand)',
}
const tdBase: React.CSSProperties = { padding:'9px 11px', fontSize:11, borderBottom:'1px solid var(--cream-dark)', verticalAlign:'middle', whiteSpace:'nowrap' as const }
const tdNum:  React.CSSProperties = { ...tdBase, textAlign:'right' as const, fontVariantNumeric:'tabular-nums' }

function Th({ label, group }: { label:string; group:string }) {
  const bg: Record<string,string> = {
    booking:'rgba(139,26,26,0.05)', fees:'rgba(26,122,110,0.05)',
    vehicle:'rgba(200,146,42,0.06)', guide:'rgba(90,58,26,0.05)',
    trip:'rgba(107,18,18,0.05)',
  }
  return <th style={{ ...thSub, background:bg[group]??'var(--cream-dark)' }}>{label}</th>
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface DifferenceReportViewProps {
  data?:         DifferenceRow[]
  title?:        string
  totalResults?: number
}

export default function DifferenceReportView({
  data         = SAMPLE_DATA,
  title        = 'Difference Report',
  totalResults = 128,
}: DifferenceReportViewProps) {

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

  const filtered = useMemo(() => data.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!r.bookingNumber.toLowerCase().includes(q) && !r.emitraTransId.toLowerCase().includes(q)) return false
    }
    return true
  }), [data, searchTerm])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged       = filtered.slice((page-1)*pageSize, page*pageSize)
  const grandPrice  = useMemo(()=>filtered.reduce((s,r)=>s+r.totalPrice,0),[filtered])
  const grandEntry  = useMemo(()=>filtered.reduce((s,r)=>s+r.totalEntryFee,0),[filtered])
  const grandVehicle= useMemo(()=>filtered.reduce((s,r)=>s+r.vehicleRent,0),[filtered])

  const chips = [
    { label:'Date Type', val: appliedFilters.dateType },
    { label:'Start',     val: appliedFilters.startDate ? new Date(appliedFilters.startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null },
    { label:'End',       val: appliedFilters.endDate   ? new Date(appliedFilters.endDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null },
    { label:'Place',     val: appliedFilters.place ? appliedFilters.place.slice(0,20)+'…' : null },
    { label:'Status',    val: appliedFilters.paymentStatus && appliedFilters.paymentStatus !== 'All' ? appliedFilters.paymentStatus : null },
  ].filter(c=>c.val) as {label:string;val:string}[]

  return (
    <>
      <FilterDialog open={filterOpen} values={pendingFilters} onChange={setPendingFilters} onApply={applyFilter} onClose={closeFilter} onReset={resetFilter} />

      <div style={{ fontFamily:"'Outfit',sans-serif", color:'var(--text-dark)' }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom:'1px solid var(--sand)', background:'#fff' }}>
          <div>
            <h2 className="font-serif font-bold" style={{ fontSize:22, color:'var(--text-dark)' }}>{title}</h2>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              Inventory Reports · Booking Fee Difference Breakdown
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background:'var(--cream-dark)', border:'1px solid var(--sand)', minWidth:240 }}>
              <Search size={13} style={{ color:'var(--text-muted)', flexShrink:0 }} />
              <input value={searchTerm} onChange={e=>{ setSearchTerm(e.target.value); setPage(1) }}
                placeholder="Search booking / Emitra ID…"
                className="bg-transparent outline-none flex-1"
                style={{ fontSize:12, color:'var(--text-dark)' }} />
              {searchTerm && <button onClick={()=>setSearchTerm('')}><X size={11} style={{ color:'var(--text-muted)' }} /></button>}
            </div>
            <button onClick={openFilter}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium relative"
              style={{ fontSize:12, background:chips.length>0?'var(--maroon)':'var(--cream-dark)', border:`1px solid ${chips.length>0?'var(--maroon)':'var(--sand)'}`, color:chips.length>0?'#fff':'var(--text-mid)', cursor:'pointer' }}>
              <SlidersHorizontal size={13} />
              Filter
              <span className="absolute -top-1 -right-1 rounded-full"
                style={{ width:8, height:8, background:'#E53E3E', border:'2px solid #fff' }} />
              {chips.length>0 && (
                <span className="absolute -top-2 -right-2 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ width:16, height:16, background:'var(--gold)', fontSize:8 }}>{chips.length}</span>
              )}
            </button>
            <button className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
              style={{ fontSize:12, background:'linear-gradient(135deg, var(--maroon), var(--maroon-light))', cursor:'pointer' }}>
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        {/* ── Active chip strip ── */}
        {chips.length > 0 && (
          <div className="flex items-center gap-2.5 px-6 py-2.5 flex-wrap"
            style={{ background:'var(--cream)', borderBottom:'1px solid var(--sand)' }}>
            {chips.map(chip=>(
              <div key={chip.label} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                style={{ background:'#fff', border:'1px solid var(--sand)', fontSize:11 }}>
                <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px' }}>{chip.label}:</span>
                <span className="font-medium" style={{ color:'var(--maroon)' }}>{chip.val}</span>
              </div>
            ))}
            <button onClick={()=>{ setAppliedFilters(DEFAULT_FILTERS); setPage(1) }}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ml-auto"
              style={{ fontSize:11, background:'rgba(229,62,62,0.08)', color:'#E53E3E', cursor:'pointer', border:'none' }}>
              <X size={10} /> Clear all
            </button>
          </div>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-5 gap-3 px-6 py-4" style={{ background:'var(--cream)' }}>
          {[
            { label:'Total Records',   val:filtered.length.toString(), icon:'📋', color:'var(--maroon)', bg:'#fff', white:false },
            { label:'Grand Total',     val:'₹'+grandPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}), icon:'₹', color:'var(--maroon)', bg:'linear-gradient(135deg,#6B1212,#A83030)', white:true },
            { label:'Total Entry Fee', val:'₹'+grandEntry.toLocaleString('en-IN'), icon:'🎫', color:'#1A7A6E', bg:'#fff', white:false },
            { label:'Vehicle Rent',    val:'₹'+grandVehicle.toLocaleString('en-IN'), icon:'🚗', color:'#C8922A', bg:'#fff', white:false },
            { label:'Avg per Booking', val:'₹'+(filtered.length>0?Math.round(grandPrice/filtered.length).toLocaleString('en-IN'):'0'), icon:'📊', color:'#5A3A1A', bg:'#fff', white:false },
          ].map(s=>(
            <div key={s.label} className="rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
              style={{ background:s.bg, border:s.white?'none':'1px solid var(--sand)' }}>
              {s.white && <div style={{ position:'absolute', top:-24, right:-24, width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,0.1)' }} />}
              <span style={{ fontSize:22, flexShrink:0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize:10, color:s.white?'rgba(255,255,255,0.7)':'var(--text-muted)' }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize:18, color:s.white?'#fff':s.color, lineHeight:1.1 }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="px-6 pb-6">
          <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--sand)', background:'#fff' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1600 }}>
                <thead>
                  {/* Group row */}
                  <tr>
                    <th rowSpan={2} style={{ ...thGroup, width:48, background:'var(--maroon)', color:'#fff', textAlign:'center', position:'sticky' as const, left:0, zIndex:3, borderRight:'2px solid rgba(255,255,255,0.2)' }}>Sr.</th>
                    <th colSpan={4} style={{ ...thGroup, ...GRP.booking }}>Booking Info</th>
                    <th colSpan={3} style={{ ...thGroup, ...GRP.fees }}>Entry & Eco Fees</th>
                    <th colSpan={2} style={{ ...thGroup, ...GRP.vehicle }}>Vehicle</th>
                    <th colSpan={2} style={{ ...thGroup, ...GRP.guide }}>Guide</th>
                    <th colSpan={3} style={{ ...thGroup, ...GRP.trip }}>Trip Details</th>
                    <th colSpan={1} style={{ ...thGroup, background:'#8B1A1A', color:'#fff', borderRight:'none' }}>Total</th>
                  </tr>
                  {/* Sub-column row */}
                  <tr style={{ background:'var(--cream-dark)' }}>
                    {['Booking Number','Booking Date','Visit Date','Emitra Trans. ID'].map(h=><Th key={h} label={h} group="booking" />)}
                    {['Entry Fee (₹)','Eco Dev (₹)','TRDF Fee (₹)'].map(h=><Th key={h} label={h} group="fees" />)}
                    {['Rent (₹)','GST (₹)'].map(h=><Th key={h} label={h} group="vehicle" />)}
                    {['Fee (₹)','GST (₹)'].map(h=><Th key={h} label={h} group="guide" />)}
                    {['Quota','Shift','Visitors'].map(h=><Th key={h} label={h} group="trip" />)}
                    <th style={{ ...thSub, background:'rgba(139,26,26,0.06)', fontWeight:700, borderRight:'none' }}>Price (₹)</th>
                  </tr>
                </thead>

                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={17} style={{ padding:48, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No records match the current filters.</td></tr>
                  ) : (
                    paged.map((r,i)=>{
                      const rowBg = i%2===0?'#fff':'rgba(251,246,239,0.55)'
                      const isEvening = r.shift.toLowerCase().includes('evening')
                      return (
                        <tr key={r.bookingNumber}
                          style={{ background:rowBg, transition:'background 0.12s', borderBottom:'1px solid var(--cream-dark)' }}
                          onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(139,26,26,0.025)')}
                          onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=rowBg)}>

                          {/* Sr.No sticky */}
                          <td style={{ ...tdBase, textAlign:'center', fontWeight:700, fontSize:12, color:'var(--maroon)', background:rowBg, position:'sticky' as const, left:0, zIndex:2, borderRight:'2px solid var(--sand)' }}>
                            {(page-1)*pageSize+i+1}
                          </td>

                          {/* Booking Info */}
                          <td style={tdBase}>
                            <span style={{ fontSize:11, color:'var(--maroon)', fontWeight:600, fontFamily:'monospace' }}>{r.bookingNumber}</span>
                          </td>
                          <td style={tdBase}><span style={{ fontSize:11, color:'var(--text-muted)' }}>{r.bookingDate}</span></td>
                          <td style={{ ...tdBase, fontWeight:500 }}>{r.visitDate}</td>
                          <td style={tdBase}>
                            {r.emitraTransId==='-'
                              ? <span style={{ color:'var(--text-muted)' }}>—</span>
                              : <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--text-mid)' }}>{r.emitraTransId}</span>
                            }
                          </td>

                          {/* Fees */}
                          <td style={{ ...tdNum, color:r.totalEntryFee>0?'#1A7A6E':undefined, fontWeight:r.totalEntryFee>0?600:400 }}>{fmtNum(r.totalEntryFee)}</td>
                          <td style={tdNum}>{fmtNum(r.totalEcoDev)}</td>
                          <td style={tdNum}>{fmtNum(r.totalTRDFFee)}</td>

                          {/* Vehicle */}
                          <td style={{ ...tdNum, color:r.vehicleRent>0?'#C8922A':undefined }}>{fmtNum(r.vehicleRent)}</td>
                          <td style={tdNum}>{fmtNum(r.vehicleGST)}</td>

                          {/* Guide */}
                          <td style={{ ...tdNum, color:r.guideFee>0?'#5A3A1A':undefined }}>{fmtNum(r.guideFee)}</td>
                          <td style={tdNum}>{fmtNum(r.guideGST)}</td>

                          {/* Trip */}
                          <td style={tdBase}>
                            <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, background:'rgba(90,58,26,0.08)', color:'#5A3A1A' }}>
                              {r.quota}
                            </span>
                          </td>
                          <td style={tdBase}>
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
                              style={{ fontSize:10, background:isEvening?'rgba(107,18,18,0.09)':'rgba(200,146,42,0.1)', color:isEvening?'#8B1A1A':'#C8922A' }}>
                              <span style={{ width:5, height:5, borderRadius:'50%', background:isEvening?'#8B1A1A':'#C8922A', display:'inline-block' }} />
                              {r.shift}
                            </span>
                          </td>
                          <td style={{ ...tdNum, fontWeight:700, color:'#1A7A6E', fontSize:13 }}>{r.totalVisitor}</td>

                          {/* Total Price */}
                          <td style={{ ...tdNum, fontWeight:700, fontSize:14, color:'var(--maroon)', borderLeft:'2px solid var(--sand)' }}>
                            ₹{r.totalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
                          </td>
                        </tr>
                      )
                    })
                  )}

                  {/* Page total */}
                  {paged.length > 0 && (
                    <tr style={{ background:'var(--cream-dark)', borderTop:'2px solid var(--sand)' }}>
                      <td style={{ ...tdBase, position:'sticky' as const, left:0, zIndex:2, background:'var(--cream-dark)', fontWeight:700, fontSize:11, color:'var(--maroon)', textTransform:'uppercase' as const, letterSpacing:'0.5px', borderRight:'2px solid var(--sand)' }}>
                        Page
                      </td>
                      <td colSpan={4} style={{ ...tdBase, fontSize:11, color:'var(--text-muted)' }}>{paged.length} records</td>
                      <td style={{ ...tdNum, fontWeight:600, color:'#1A7A6E' }}>₹{paged.reduce((s,r)=>s+r.totalEntryFee,0).toLocaleString('en-IN')}</td>
                      <td style={tdNum}>{paged.reduce((s,r)=>s+r.totalEcoDev,0)||'—'}</td>
                      <td style={tdNum}>{paged.reduce((s,r)=>s+r.totalTRDFFee,0)||'—'}</td>
                      <td style={{ ...tdNum, fontWeight:600, color:'#C8922A' }}>₹{paged.reduce((s,r)=>s+r.vehicleRent,0).toLocaleString('en-IN')}</td>
                      <td style={tdNum}>{paged.reduce((s,r)=>s+r.vehicleGST,0)||'—'}</td>
                      <td style={{ ...tdNum, fontWeight:600, color:'#5A3A1A' }}>{paged.reduce((s,r)=>s+r.guideFee,0)||'—'}</td>
                      <td style={tdNum}>{paged.reduce((s,r)=>s+r.guideGST,0)||'—'}</td>
                      <td colSpan={3} style={tdBase} />
                      <td style={{ ...tdNum, fontWeight:700, fontSize:14, color:'var(--maroon)', borderLeft:'2px solid var(--sand)' }}>
                        ₹{paged.reduce((s,r)=>s+r.totalPrice,0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                    </tr>
                  )}

                  {/* Grand total */}
                  {paged.length > 0 && (
                    <tr style={{ background:'linear-gradient(135deg,rgba(139,26,26,0.04),rgba(200,146,42,0.04))', borderTop:'1px solid var(--sand)' }}>
                      <td style={{ ...tdBase, position:'sticky' as const, left:0, zIndex:2, fontWeight:700, fontSize:11, color:'var(--maroon)', textTransform:'uppercase' as const, letterSpacing:'0.5px', background:'var(--cream)', borderRight:'2px solid var(--sand)' }}>
                        Grand
                      </td>
                      <td colSpan={4} style={{ ...tdBase, fontSize:11, color:'var(--text-muted)' }}>All {filtered.length} records</td>
                      <td style={{ ...tdNum, fontWeight:700, color:'#1A7A6E' }}>₹{grandEntry.toLocaleString('en-IN')}</td>
                      <td colSpan={7} style={tdBase} />
                      <td style={{ ...tdNum, fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:20, color:'var(--maroon)', borderLeft:'2px solid var(--sand)' }}>
                        ₹{grandPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
                <strong style={{ color:'var(--maroon)' }}>{totalResults}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
