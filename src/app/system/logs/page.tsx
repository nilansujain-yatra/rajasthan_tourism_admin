'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'

const LOGS = [
  { time:'10:57:22', user:'Gurjarpankaj394',  action:'Viewed Dashboard',          module:'Dashboard', ip:'203.145.12.44',  level:'Info'    },
  { time:'10:55:11', user:'BHARATTAILOR1408', action:'Exported bookings CSV',     module:'Bookings',  ip:'203.145.12.55',  level:'Info'    },
  { time:'10:52:04', user:'ramesh.operator',  action:'Updated Jantar Mantar info',module:'Places',    ip:'202.88.90.12',   level:'Warning' },
  { time:'10:48:33', user:'SANJAYJADONSIR',   action:'Added new user priya.counter',module:'Users',  ip:'203.145.12.1',   level:'Info'    },
  { time:'10:44:17', user:'BHARATTAILOR1408', action:'Login successful',          module:'Auth',      ip:'203.145.12.55',  level:'Info'    },
  { time:'10:41:05', user:'Unknown',          action:'Failed login attempt (×3)', module:'Auth',      ip:'112.34.56.78',   level:'Error'   },
  { time:'10:38:50', user:'mohit.kiosk',      action:'Kiosk sync completed',      module:'Kiosk',     ip:'192.168.1.22',   level:'Info'    },
  { time:'10:35:29', user:'system',           action:'Payment gateway health check',module:'System', ip:'localhost',      level:'Info'    },
]

const levelColor: Record<string, { bg:string; color:string }> = {
  Info:    { bg:'rgba(26,122,110,0.1)',  color:'#1A7A6E' },
  Warning: { bg:'rgba(200,146,42,0.12)', color:'#C8922A' },
  Error:   { bg:'rgba(229,62,62,0.1)',   color:'#E53E3E' },
}

export default function SystemLogsPage() {
  return (
    <div className="flex min-h-screen" style={{ background:'var(--cream)' }}>
      <Sidebar /><div className="flex flex-col flex-1 min-w-0"><Topbar />
      <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Total Logs Today',  val:'2,847', color:'var(--maroon)' },
            { label:'Error Events',      val:'3',     color:'#E53E3E' },
            { label:'Warnings',          val:'12',    color:'#C8922A' },
            { label:'Active Sessions',   val:'7',     color:'#1A7A6E' },
          ].map(s=>(
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <SectionHeader title="User Activity Logs" right={
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium" style={{ fontSize:11, background:'rgba(26,122,110,0.1)', color:'#1A7A6E' }}>
            <span className="live-pulse rounded-full inline-block" style={{ width:5, height:5, background:'#1A7A6E' }} />
            Live
          </div>
        } />

        <div className="rounded-xl3 overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                {['Time','User','Action','Module','IP Address','Level'].map(h=>(
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LOGS.map((l,i)=>{
                const lc = levelColor[l.level]
                return (
                  <tr key={i} style={{ borderBottom:i<LOGS.length-1?'1px solid var(--cream-dark)':'none', fontFamily:'monospace' }}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='var(--cream)')}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='')}>
                    <td className="px-4 py-2.5" style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{l.time}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ fontSize:12, fontFamily:'inherit' }}>{l.user}</td>
                    <td className="px-4 py-2.5" style={{ fontSize:12, fontFamily:'inherit' }}>{l.action}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 font-medium" style={{ fontSize:10, background:'var(--cream-dark)', color:'var(--text-mid)', fontFamily:'inherit' }}>{l.module}</span>
                    </td>
                    <td className="px-4 py-2.5" style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{l.ip}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...lc, fontFamily:'inherit' }}>{l.level}</span>
                    </td>
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
