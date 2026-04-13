'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'

const AUDIT = [
  { id:'AU-5001', entity:'Place Management', action:'Updated ticket price for Amber Fort',    by:'Gurjarpankaj394',  before:'₹200', after:'₹250', date:'01 Apr 2026 10:44' },
  { id:'AU-5000', entity:'User Management',  action:'New user account created',               by:'SANJAYJADONSIR',   before:'—',    after:'priya.counter', date:'01 Apr 2026 10:41' },
  { id:'AU-4999', entity:'Booking',          action:'Booking BK-29397 cancelled by admin',   by:'BHARATTAILOR1408', before:'Confirmed', after:'Cancelled', date:'01 Apr 2026 10:09' },
  { id:'AU-4998', entity:'Finance',          action:'RISL rate updated',                      by:'SANJAYJADONSIR',   before:'6.10', after:'6.20', date:'31 Mar 2026 17:22' },
  { id:'AU-4997', entity:'Content',          action:'Jantar Mantar description updated',      by:'ramesh.operator',  before:'—',    after:'Updated',  date:'31 Mar 2026 15:05' },
]

export default function AuditPage() {
  return (
    <div className="flex min-h-screen" style={{ background:'var(--cream)' }}>
      <Sidebar /><div className="flex flex-col flex-1 min-w-0"><Topbar />
      <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

        <SectionHeader title="Audit Trail" right={<span style={{ fontSize:11, color:'var(--text-muted)' }}>All admin actions are logged</span>} />

        <div className="rounded-xl3 overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                {['Audit ID','Module','Action','Performed By','Before','After','Date & Time'].map(h=>(
                  <th key={h} className="text-left px-5 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIT.map((a,i)=>(
                <tr key={a.id} style={{ borderBottom:i<AUDIT.length-1?'1px solid var(--cream-dark)':'none' }}
                  onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='var(--cream)')}
                  onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='')}>
                  <td className="px-5 py-3 font-medium" style={{ fontSize:12, color:'var(--maroon)' }}>{a.id}</td>
                  <td className="px-5 py-3"><span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, background:'var(--cream-dark)', color:'var(--text-mid)' }}>{a.entity}</span></td>
                  <td className="px-5 py-3" style={{ fontSize:12 }}>{a.action}</td>
                  <td className="px-5 py-3 font-medium" style={{ fontSize:11 }}>{a.by}</td>
                  <td className="px-5 py-3" style={{ fontSize:11, color:'#E53E3E' }}>{a.before}</td>
                  <td className="px-5 py-3" style={{ fontSize:11, color:'#1A7A6E' }}>{a.after}</td>
                  <td className="px-5 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      </div>
    </div>
  )
}
