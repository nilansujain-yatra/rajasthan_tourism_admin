'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'

const TICKETS = [
  { id:'HD-441', subject:'Payment deducted but ticket not generated', user:'Suresh Patel',  site:'Amber Fort',       priority:'High',   status:'Open',       date:'01 Apr 2026' },
  { id:'HD-440', subject:'Wrong date selected, need reschedule',      user:'Anjali Gupta',  site:'Jantar Mantar',    priority:'Medium', status:'In Progress', date:'01 Apr 2026' },
  { id:'HD-439', subject:'Kiosk machine showing error at gate 2',     user:'Staff-JF001',   site:'Jaisalmer Fort',   priority:'High',   status:'Open',       date:'31 Mar 2026' },
  { id:'HD-438', subject:'Refund not received after cancellation',    user:'Ravi Shankar',  site:'Mehrangarh Fort',  priority:'High',   status:'In Progress', date:'31 Mar 2026' },
  { id:'HD-437', subject:'Guide booking confirmation not received',   user:'Emily Wilson',  site:'Chittorgarh Fort', priority:'Low',    status:'Resolved',   date:'30 Mar 2026' },
]

const priorityColor: Record<string, { bg:string; color:string }> = {
  High:   { bg:'rgba(229,62,62,0.1)',   color:'#E53E3E' },
  Medium: { bg:'rgba(200,146,42,0.12)', color:'#C8922A' },
  Low:    { bg:'rgba(26,122,110,0.1)',  color:'#1A7A6E' },
}
const statusColor: Record<string, { bg:string; color:string }> = {
  'Open':        { bg:'rgba(229,62,62,0.1)',   color:'#E53E3E' },
  'In Progress': { bg:'rgba(200,146,42,0.12)', color:'#C8922A' },
  'Resolved':    { bg:'rgba(26,122,110,0.1)',  color:'#1A7A6E' },
}

export default function HelpDeskPage() {
  return (
    <div className="flex min-h-screen" style={{ background:'var(--cream)' }}>
      <Sidebar /><div className="flex flex-col flex-1 min-w-0"><Topbar />
      <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Open Tickets',    val:'12', color:'#E53E3E' },
            { label:'In Progress',     val:'8',  color:'#C8922A' },
            { label:'Resolved Today',  val:'5',  color:'#1A7A6E' },
            { label:'Avg. Resolution', val:'4h', color:'var(--maroon)' },
          ].map(s=>(
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <SectionHeader title="Support Tickets" />
        <div className="rounded-xl3 overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                {['ID','Subject','Raised By','Site','Priority','Status','Date','Action'].map(h=>(
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TICKETS.map((t,i)=>{
                const pc=priorityColor[t.priority]; const sc=statusColor[t.status]
                return (
                  <tr key={t.id} style={{ borderBottom:i<TICKETS.length-1?'1px solid var(--cream-dark)':'none' }}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='var(--cream)')}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='')}>
                    <td className="px-4 py-3 font-medium" style={{ fontSize:12, color:'var(--maroon)' }}>{t.id}</td>
                    <td className="px-4 py-3" style={{ fontSize:12, maxWidth:220 }}>{t.subject}</td>
                    <td className="px-4 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{t.user}</td>
                    <td className="px-4 py-3 font-serif font-semibold" style={{ fontSize:12 }}>{t.site}</td>
                    <td className="px-4 py-3"><span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...pc }}>{t.priority}</span></td>
                    <td className="px-4 py-3"><span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...sc }}>{t.status}</span></td>
                    <td className="px-4 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{t.date}</td>
                    <td className="px-4 py-3"><button style={{ fontSize:11, color:'var(--maroon)', fontWeight:500 }}>Respond →</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
      </div>
    </div>
  )
}
