import SectionHeader from '@/components/ui/SectionHeader'
import { Search, Download, Filter } from 'lucide-react'

const BOOKINGS = [
  { id:'BK-29401', site:'Amber Fort',         date:'01 Apr 2026', visitors:4,  category:'Indian',         amount:'₹800',  payment:'Online',  status:'Confirmed' },
  { id:'BK-29400', site:'Jantar Mantar',       date:'01 Apr 2026', visitors:2,  category:'Indian Student', amount:'₹200',  payment:'Kiosk',   status:'Confirmed' },
  { id:'BK-29399', site:'Mehrangarh Fort',     date:'01 Apr 2026', visitors:6,  category:'Foreign',        amount:'₹3,600',payment:'Online',  status:'Pending'   },
  { id:'BK-29398', site:'Chittorgarh Fort',    date:'01 Apr 2026', visitors:3,  category:'Indian',         amount:'₹450',  payment:'Counter', status:'Confirmed' },
  { id:'BK-29397', site:'Albert Hall Museum',  date:'01 Apr 2026', visitors:1,  category:'Divyang',        amount:'₹0',    payment:'Online',  status:'Cancelled' },
  { id:'BK-29396', site:'Jaisalmer Fort',      date:'01 Apr 2026', visitors:8,  category:'Indian',         amount:'₹1,600',payment:'Kiosk',   status:'Confirmed' },
  { id:'BK-29395', site:'Nahargarh Fort',      date:'01 Apr 2026', visitors:2,  category:'Foreign Student',amount:'₹600',  payment:'Online',  status:'Confirmed' },
  { id:'BK-29394', site:'Gagron Fort',         date:'31 Mar 2026', visitors:5,  category:'Indian',         amount:'₹750',  payment:'Counter', status:'Confirmed' },
  { id:'BK-29393', site:'Hawa Mahal',          date:'31 Mar 2026', visitors:3,  category:'Indian',         amount:'₹300',  payment:'Online',  status:'Confirmed' },
  { id:'BK-29392', site:'Kumbhalgarh Fort',    date:'31 Mar 2026', visitors:10, category:'Indian Student', amount:'₹500',  payment:'Kiosk',   status:'Confirmed' },
]

const statusStyle: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
  Pending:   { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
  Cancelled: { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
}

export default function BookingsPage() {
  return (
    <div className="px-6 py-6 space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Today\'s Bookings', val: '248',   color: 'var(--maroon)', bg: '#fff' },
          { label: 'Confirmed',         val: '219',   color: '#1A7A6E',       bg: '#fff' },
          { label: 'Pending',           val: '18',    color: '#C8922A',       bg: '#fff' },
          { label: 'Cancelled',         val: '11',    color: '#8B1A1A',       bg: '#fff' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: s.bg, border: '1px solid var(--sand)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div className="font-serif font-bold" style={{ fontSize: 28, color: s.color, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 flex-1 max-w-sm rounded-xl px-3 py-2"
          style={{ background: '#fff', border: '1px solid var(--sand)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by ID, site or visitor..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 12, color: 'var(--text-dark)' }}
          />
        </div>

        <select
          className="rounded-xl px-3 py-2 outline-none"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
        >
          <option>All Sites</option>
          <option>Amber Fort</option>
          <option>Jantar Mantar</option>
        </select>

        <select
          className="rounded-xl px-3 py-2 outline-none"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
        >
          <option>All Status</option>
          <option>Confirmed</option>
          <option>Pending</option>
          <option>Cancelled</option>
        </select>

        <div className="flex-1" />

        <button
          className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
          style={{ fontSize: 12, background: 'var(--cream-dark)', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div>
        <SectionHeader title="All Bookings" right={<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Showing 1–10 of 7,36,530</span>} />
        <div className="rounded-xl3 overflow-hidden" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                {['Booking ID', 'Site', 'Date', 'Visitors', 'Category', 'Amount', 'Payment', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BOOKINGS.map((b, i) => {
                const sc = statusStyle[b.status]
                return (
                  <tr
                    key={b.id}
                    style={{ borderBottom: i < BOOKINGS.length - 1 ? '1px solid var(--cream-dark)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--cream)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
                  >
                    <td className="px-4 py-3 font-medium" style={{ fontSize: 12, color: 'var(--maroon)' }}>{b.id}</td>
                    <td className="px-4 py-3 font-serif font-semibold" style={{ fontSize: 13 }}>{b.site}</td>
                    <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.date}</td>
                    <td className="px-4 py-3 font-medium" style={{ fontSize: 12 }}>{b.visitors}</td>
                    <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-mid)' }}>{b.category}</td>
                    <td className="px-4 py-3 font-semibold" style={{ fontSize: 12 }}>{b.amount}</td>
                    <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.payment}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 10, ...sc }}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 500 }}>View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Page 1 of 73,653</span>
            <div className="flex items-center gap-1">
              {['‹', '1', '2', '3', '...', '73653', '›'].map((p, i) => (
                <button
                  key={i}
                  className="rounded-lg w-7 h-7 flex items-center justify-center font-medium"
                  style={{
                    fontSize: 11,
                    background: p === '1' ? 'var(--maroon)' : 'transparent',
                    color: p === '1' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
