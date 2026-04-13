'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'

const PLACE_STATUS = [
  { name:'Amber Fort',         status:true,  tickets:500, sold:387, kiosks:4, online:true,  counter:true  },
  { name:'Jantar Mantar B',    status:true,  tickets:400, sold:298, kiosks:2, online:true,  counter:true  },
  { name:'Jantar Mantar',      status:true,  tickets:400, sold:312, kiosks:2, online:true,  counter:false },
  { name:'Nahargarh Fort',     status:true,  tickets:300, sold:201, kiosks:2, online:true,  counter:true  },
  { name:'Jaisalmer Fort',     status:true,  tickets:350, sold:188, kiosks:3, online:true,  counter:true  },
  { name:'Chittorgarh Fort',   status:true,  tickets:400, sold:290, kiosks:3, online:true,  counter:true  },
  { name:'Mehrangarh Fort',    status:true,  tickets:500, sold:421, kiosks:4, online:true,  counter:true  },
  { name:'Albert Hall Museum', status:true,  tickets:300, sold:187, kiosks:2, online:true,  counter:true  },
  { name:'Gagron Fort',        status:true,  tickets:200, sold:134, kiosks:1, online:true,  counter:false },
  { name:'Ranthambore Fort',   status:false, tickets:250, sold:0,   kiosks:0, online:false, counter:false },
]

function Toggle({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="rounded-full relative transition-colors"
        style={{
          width:30, height:16,
          background: on ? 'var(--teal)' : 'var(--sand-dark)',
        }}
      >
        <div
          className="absolute top-0.5 rounded-full bg-white transition-all"
          style={{ width:12, height:12, left: on ? 16 : 2 }}
        />
      </div>
      <span style={{ fontSize:10, color: on ? '#1A7A6E' : 'var(--text-muted)' }}>{on ? 'ON' : 'OFF'}</span>
    </div>
  )
}

export default function PlaceStatusPage() {
  return (
    <div className="flex min-h-screen" style={{ background:'var(--cream)' }}>
      <Sidebar /><div className="flex flex-col flex-1 min-w-0"><Topbar />
      <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Active Sites',   val:'9',  color:'#1A7A6E' },
            { label:'Inactive Sites', val:'1',  color:'#E53E3E' },
            { label:'Tickets Sold',   val:'2,418', color:'var(--maroon)' },
            { label:'Capacity Used',  val:'69%', color:'#C8922A' },
          ].map(s=>(
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <SectionHeader title="Site Active Status Control" right={
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium" style={{ fontSize:11, background:'rgba(26,122,110,0.1)', color:'#1A7A6E' }}>
            <span className="live-pulse rounded-full inline-block" style={{ width:5, height:5, background:'#1A7A6E' }} /> Real-time
          </span>
        } />

        <div className="rounded-xl3 overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                {['Site Name','Site Active','Tickets/Day','Sold Today','Capacity','Online','Counter','Kiosks','Action'].map(h=>(
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLACE_STATUS.map((p,i)=>{
                const pct = Math.round((p.sold/p.tickets)*100) || 0
                return (
                  <tr key={p.name} style={{ borderBottom:i<PLACE_STATUS.length-1?'1px solid var(--cream-dark)':'none' }}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='var(--cream)')}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='')}>
                    <td className="px-4 py-3 font-serif font-semibold" style={{ fontSize:13 }}>{p.name}</td>
                    <td className="px-4 py-3"><Toggle on={p.status} label="" /></td>
                    <td className="px-4 py-3 font-medium" style={{ fontSize:12 }}>{p.tickets}</td>
                    <td className="px-4 py-3 font-semibold" style={{ fontSize:12, color:'var(--maroon)' }}>{p.sold}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full overflow-hidden" style={{ flex:1, height:8, background:'var(--cream-dark)' }}>
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:'linear-gradient(90deg,var(--maroon),var(--gold))' }} />
                        </div>
                        <span style={{ fontSize:10, width:28, textAlign:'right', color:'var(--text-muted)' }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Toggle on={p.online} label="" /></td>
                    <td className="px-4 py-3"><Toggle on={p.counter} label="" /></td>
                    <td className="px-4 py-3 font-medium" style={{ fontSize:12 }}>{p.kiosks}</td>
                    <td className="px-4 py-3"><button style={{ fontSize:11, color:'var(--maroon)', fontWeight:500 }}>Configure →</button></td>
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
