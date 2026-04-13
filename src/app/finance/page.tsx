import StatCard from '@/components/ui/StatCard'
import SectionHeader from '@/components/ui/SectionHeader'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

const FINANCE_ROWS = [
  { site: 'Amber Fort',         tickets: 2500, amount: '₹5,00,000', risl: '₹15,500', net: '₹4,84,500' },
  { site: 'Mehrangarh Fort',    tickets: 2500, amount: '₹4,75,000', risl: '₹15,500', net: '₹4,59,500' },
  { site: 'Jantar Mantar',      tickets: 2500, amount: '₹3,75,000', risl: '₹15,500', net: '₹3,59,500' },
  { site: 'Chittorgarh Fort',   tickets: 2200, amount: '₹3,30,000', risl: '₹13,640', net: '₹3,16,360' },
  { site: 'Nahargarh Fort',     tickets: 1500, amount: '₹2,25,000', risl: '₹9,300',  net: '₹2,15,700' },
  { site: 'Jaisalmer Fort',     tickets: 1500, amount: '₹2,25,000', risl: '₹9,300',  net: '₹2,15,700' },
  { site: 'Albert Hall Museum', tickets: 2500, amount: '₹1,87,500', risl: '₹15,500', net: '₹1,72,000' },
  { site: 'Gagron Fort',        tickets: 2500, amount: '₹1,25,000', risl: '₹15,500', net: '₹1,09,500' },
]

export default function FinancePage() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Revenue"     value="₹20,392"    badge="Today"        icon="₹"   variant="maroon" />
            <StatCard label="Total Collected"   value="₹4.2 Cr"    badge="This Month"   icon="📊"  variant="gold"   />
            <StatCard label="RISL Charges"      value="₹1,09,540"  badge="This Month"   icon="📋"  variant="teal"   />
            <StatCard label="Pending Refunds"   value="₹23,400"    badge="12 bookings"  icon="↩️"  variant="light"  />
          </div>

          <SectionHeader title="Site-wise Revenue Breakdown" right={
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>April 2026</span>
          } />

          <div className="rounded-xl3 overflow-hidden" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                  {['Site Name', 'Tickets Sold', 'Gross Amount', 'RISL Charge', 'Net Revenue', 'Action'].map(h => (
                    <th key={h} className="text-left px-5 py-3" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FINANCE_ROWS.map((r, i) => (
                  <tr
                    key={r.site}
                    style={{ borderBottom: i < FINANCE_ROWS.length - 1 ? '1px solid var(--cream-dark)' : 'none' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--cream)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
                  >
                    <td className="px-5 py-3 font-serif font-semibold" style={{ fontSize: 14 }}>{r.site}</td>
                    <td className="px-5 py-3 font-medium" style={{ fontSize: 13 }}>{r.tickets.toLocaleString()}</td>
                    <td className="px-5 py-3 font-medium" style={{ fontSize: 13, color: 'var(--teal)' }}>{r.amount}</td>
                    <td className="px-5 py-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.risl}</td>
                    <td className="px-5 py-3 font-bold" style={{ fontSize: 13, color: 'var(--maroon)' }}>{r.net}</td>
                    <td className="px-5 py-3">
                      <button style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 500 }}>Details →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                  <td className="px-5 py-3 font-bold" style={{ fontSize: 13 }}>Total</td>
                  <td className="px-5 py-3 font-bold" style={{ fontSize: 13 }}>17,700</td>
                  <td className="px-5 py-3 font-bold" style={{ fontSize: 13, color: 'var(--teal)' }}>₹24,42,500</td>
                  <td className="px-5 py-3 font-bold" style={{ fontSize: 13, color: 'var(--text-muted)' }}>₹1,09,740</td>
                  <td className="px-5 py-3 font-bold" style={{ fontSize: 13, color: 'var(--maroon)' }}>₹23,32,760</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

        </main>
      </div>
    </div>
  )
}
