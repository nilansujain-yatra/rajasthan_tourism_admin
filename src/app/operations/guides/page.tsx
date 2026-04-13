'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'

const GUIDES = [
  { id:'GD-201', name:'Amar Joshi',     lang:'Hindi, English',        site:'Amber Fort',       tours:4, rating:4.9, status:'Active'   },
  { id:'GD-202', name:'Kavita Sharma',  lang:'Hindi, French',         site:'Jantar Mantar',    tours:3, rating:4.8, status:'On Tour'  },
  { id:'GD-203', name:'Vikram Singh',   lang:'Hindi, English, German',site:'Mehrangarh Fort',  tours:5, rating:4.7, status:'Active'   },
  { id:'GD-204', name:'Deepa Nair',     lang:'Hindi, English',        site:'Jaisalmer Fort',   tours:2, rating:4.6, status:'Active'   },
  { id:'GD-205', name:'Rajiv Mathur',   lang:'Hindi, Spanish',        site:'Chittorgarh Fort', tours:0, rating:4.3, status:'Off Duty' },
]

const statusColor: Record<string, { bg:string; color:string }> = {
  'Active':   { bg:'rgba(26,122,110,0.1)',  color:'#1A7A6E' },
  'On Tour':  { bg:'rgba(200,146,42,0.12)', color:'#C8922A' },
  'Off Duty': { bg:'rgba(154,122,90,0.1)',  color:'#9A7A5A' },
}

export default function GuidesPage() {
  return (
    <div className="flex min-h-screen" style={{ background:'var(--cream)' }}>
      <Sidebar /><div className="flex flex-col flex-1 min-w-0"><Topbar />
      <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Total Guides',  val:'18', color:'var(--maroon)' },
            { label:'Active',        val:'12', color:'#1A7A6E'       },
            { label:'On Tour Now',   val:'4',  color:'#C8922A'       },
            { label:'Languages',     val:'8',  color:'var(--gold)'   },
          ].map(s=>(
            <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <SectionHeader title="Guide Registry" />
        <div className="rounded-xl3 overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                {['Guide ID','Name','Languages','Assigned Site','Tours Today','Rating','Status','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GUIDES.map((g,i)=>{
                const sc=statusColor[g.status]
                return (
                  <tr key={g.id} style={{ borderBottom:i<GUIDES.length-1?'1px solid var(--cream-dark)':'none' }}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='var(--cream)')}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='')}>
                    <td className="px-4 py-3 font-medium" style={{ fontSize:12, color:'var(--maroon)' }}>{g.id}</td>
                    <td className="px-4 py-3 font-serif font-semibold" style={{ fontSize:13 }}>{g.name}</td>
                    <td className="px-4 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{g.lang}</td>
                    <td className="px-4 py-3 font-serif font-semibold" style={{ fontSize:13 }}>{g.site}</td>
                    <td className="px-4 py-3 font-semibold" style={{ fontSize:13, color:'var(--maroon)' }}>{g.tours}</td>
                    <td className="px-4 py-3" style={{ fontSize:11, color:'#C8922A' }}>★ {g.rating}</td>
                    <td className="px-4 py-3"><span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...sc }}>{g.status}</span></td>
                    <td className="px-4 py-3"><button style={{ fontSize:11, color:'var(--maroon)', fontWeight:500 }}>Manage →</button></td>
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
