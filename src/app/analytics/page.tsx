'use client'

import StatCard from '@/components/ui/StatCard'
import SectionHeader from '@/components/ui/SectionHeader'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

const MONTHLY_DATA = [
  { month: 'Jan', bookings: 58000, visitors: 42000, revenue: 18.2 },
  { month: 'Feb', bookings: 62000, visitors: 48000, revenue: 19.8 },
  { month: 'Mar', bookings: 71000, visitors: 55000, revenue: 22.4 },
  { month: 'Apr', bookings: 65000, visitors: 51000, revenue: 20.4 },
]

const SITE_PERFORMANCE = [
  { site: 'Amber Fort',        pct: 88, visitors: '2,500', rating: 4.8 },
  { site: 'Mehrangarh Fort',   pct: 82, visitors: '2,500', rating: 4.7 },
  { site: 'Hawa Mahal',        pct: 95, visitors: '3,100', rating: 4.9 },
  { site: 'Jantar Mantar',     pct: 71, visitors: '2,500', rating: 4.6 },
  { site: 'Jaisalmer Fort',    pct: 65, visitors: '1,500', rating: 4.5 },
  { site: 'Chittorgarh Fort',  pct: 78, visitors: '2,200', rating: 4.7 },
]

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-6">

          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Avg Daily Bookings" value="2,456"  badge="↑ 12%"  icon="📈" variant="maroon" trend="↑" />
            <StatCard label="Top Site"           value="Hawa Mahal" badge="3,100 visitors" icon="🏆" variant="gold" />
            <StatCard label="Satisfaction Score" value="4.7★"   badge="Out of 5" icon="⭐" variant="teal" />
            <StatCard label="Foreign Visitors"   value="10%"    badge="↑ 3%" icon="✈️" variant="light" trend="↑" />
          </div>

          {/* Monthly trend bars */}
          <div className="rounded-xl3 p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-bold" style={{ fontSize: 17 }}>Monthly Booking Trend</h3>
              <span className="rounded-full px-3 py-0.5 font-medium" style={{ fontSize: 10, background: 'var(--gold-pale)', color: 'var(--gold)' }}>2026</span>
            </div>
            <div className="flex items-end gap-4 h-36">
              {MONTHLY_DATA.map(d => {
                const h = Math.round((d.bookings / 75000) * 120)
                return (
                  <div key={d.month} className="flex flex-col items-center gap-1 flex-1">
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      {d.bookings.toLocaleString()}
                    </div>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: h,
                        background: 'linear-gradient(180deg, var(--maroon-light), var(--maroon))',
                        opacity: d.month === 'Mar' ? 1 : 0.7,
                      }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{d.month}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Site performance */}
          <div>
            <SectionHeader title="Site Performance Index" />
            <div className="rounded-xl3 p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
              <div className="flex flex-col gap-4">
                {SITE_PERFORMANCE.map(s => (
                  <div key={s.site} className="flex items-center gap-4">
                    <div className="font-serif font-semibold" style={{ width: 160, fontSize: 13 }}>{s.site}</div>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 10, background: 'var(--cream-dark)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, var(--maroon), var(--gold))` }}
                      />
                    </div>
                    <div className="font-semibold" style={{ width: 36, fontSize: 12, textAlign: 'right' }}>{s.pct}%</div>
                    <div style={{ width: 60, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{s.visitors}</div>
                    <div
                      className="rounded-full px-2 py-0.5 font-medium"
                      style={{ fontSize: 10, background: 'var(--gold-pale)', color: 'var(--gold)' }}
                    >
                      ★ {s.rating}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
