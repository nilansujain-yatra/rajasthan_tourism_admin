'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'

const FEEDBACK = [
  { id:'FB-1201', site:'Amber Fort',        user:'Rajesh Kumar',  rating:5, msg:'Magnificent fort, excellent online booking experience. Very smooth!', date:'01 Apr 2026', type:'Positive' },
  { id:'FB-1200', site:'Jantar Mantar',      user:'Sarah Johnson', rating:4, msg:'Great observatory. The ticketing was seamless. Could add audio guides.', date:'01 Apr 2026', type:'Positive' },
  { id:'FB-1199', site:'Mehrangarh Fort',    user:'Anil Sharma',   rating:3, msg:'Long queues at the entrance despite online booking. Needs improvement.', date:'31 Mar 2026', type:'Neutral'  },
  { id:'FB-1198', site:'Jaisalmer Fort',     user:'Mike Chen',     rating:5, msg:'Absolutely stunning. A jewel of Rajasthan. Booking was effortless.', date:'31 Mar 2026', type:'Positive' },
  { id:'FB-1197', site:'Chittorgarh Fort',   user:'Priya Mehta',   rating:2, msg:'Kiosk at the entrance was not working. Had to stand in a long queue.', date:'30 Mar 2026', type:'Negative' },
]

const typeColor: Record<string, { bg: string; color: string }> = {
  Positive: { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
  Neutral:  { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
  Negative: { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
}

function Stars({ n }: { n: number }) {
  return (
    <span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#C8922A' : '#E8D5B0', fontSize: 13 }}>★</span>
      ))}
    </span>
  )
}

export default function FeedbackPage() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'Total Feedback',   val:'1,201', color:'var(--maroon)' },
              { label:'Positive',         val:'82%',   color:'#1A7A6E' },
              { label:'Avg. Rating',      val:'4.3★',  color:'#C8922A' },
              { label:'Unresolved',       val:'14',    color:'#8B1A1A' },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          <SectionHeader title="Recent Feedback" right={<span style={{ fontSize:11, color:'var(--text-muted)' }}>Latest 5 of 1,201</span>} />

          <div className="flex flex-col gap-3">
            {FEEDBACK.map(f => {
              const tc = typeColor[f.type]
              return (
                <div key={f.id} className="rounded-xl3 p-5" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center rounded-full text-white font-semibold" style={{ width:32, height:32, background:'var(--maroon)', fontSize:11, flexShrink:0 }}>
                          {f.user.split(' ').map(w=>w[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ fontSize:13 }}>{f.user}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{f.date} · {f.site}</div>
                        </div>
                        <Stars n={f.rating} />
                      </div>
                      <p style={{ fontSize:13, color:'var(--text-mid)', lineHeight:1.5 }}>{f.msg}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...tc }}>{f.type}</span>
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>{f.id}</span>
                      <button style={{ fontSize:11, color:'var(--maroon)', fontWeight:500 }}>Reply →</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </main>
      </div>
    </div>
  )
}
