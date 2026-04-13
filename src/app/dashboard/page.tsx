'use client'

import StatCard from '@/components/ui/StatCard'
import SectionHeader from '@/components/ui/SectionHeader'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'

const recentBookings = [
  { id: 'BK-29401', site: 'Amber Fort',       visitors: 4, amount: '₹800', status: 'Confirmed', time: '10:42 AM' },
  { id: 'BK-29400', site: 'Jantar Mantar',     visitors: 2, amount: '₹300', status: 'Confirmed', time: '10:38 AM' },
  { id: 'BK-29399', site: 'Mehrangarh Fort',   visitors: 6, amount: '₹1,200', status: 'Pending',   time: '10:31 AM' },
  { id: 'BK-29398', site: 'Chittorgarh Fort',  visitors: 3, amount: '₹450', status: 'Confirmed', time: '10:22 AM' },
  { id: 'BK-29397', site: 'Albert Hall Museum',visitors: 1, amount: '₹150', status: 'Cancelled', time: '10:09 AM' },
]

const statusStyle = {
  Confirmed: { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
  Pending:   { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
  Cancelled: { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
}

export default function DashboardPage() {
  return (
    <div className="px-6 py-6 space-y-6">

      {/* Live badge + subtitle */}
      <div className="flex items-center justify-between -mb-2">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 300 }}>
          Welcome to the Online Booking Management System
        </p>
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
          style={{ fontSize: 11, background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}
        >
          <span className="live-pulse rounded-full" style={{ width: 6, height: 6, background: '#1A7A6E', display: 'inline-block' }} />
          10 Sites Live
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Bookings"
          value="7,36,530"
          badge="Active"
          icon="📅"
          variant="maroon"
          trend="↑"
        />
        <StatCard
          label="Total Visitors"
          value="1,79,999"
          badge="Growing"
          icon="👥"
          variant="teal"
          trend="↑"
        />
        <StatCard
          label="Total Amount"
          value="₹20,392"
          badge="Today"
          icon="₹"
          variant="gold"
        />
        <StatCard
          label="RISL Charge"
          value="₹6.20"
          badge="Per ticket"
          icon="📋"
          variant="light"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Donut */}
        <div
          className="rounded-xl3 p-5"
          style={{ background: '#fff', border: '1px solid var(--sand)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--text-dark)' }}>
              Visitor Breakdown
            </h3>
            <span
              className="rounded-full px-3 py-0.5 font-medium"
              style={{ fontSize: 10, background: 'var(--gold-pale)', color: 'var(--gold)' }}
            >
              Today
            </span>
          </div>
          <DonutChart />
        </div>

        {/* Bar + trend */}
        <div
          className="rounded-xl3 p-5"
          style={{ background: '#fff', border: '1px solid var(--sand)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--text-dark)' }}>
              Booking Sources
            </h3>
            <span
              className="rounded-full px-3 py-0.5 font-medium"
              style={{ fontSize: 10, background: 'var(--gold-pale)', color: 'var(--gold)' }}
            >
              Distribution
            </span>
          </div>
          <BarChart />
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <SectionHeader
          title="Recent Bookings"
          right={
            <a
              href="/bookings"
              className="font-medium"
              style={{ fontSize: 11, color: 'var(--maroon)' }}
            >
              View all →
            </a>
          }
        />
        <div
          className="rounded-xl3 overflow-hidden"
          style={{ background: '#fff', border: '1px solid var(--sand)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                {['Booking ID', 'Site', 'Visitors', 'Amount', 'Status', 'Time'].map(h => (
                  <th
                    key={h}
                    className="text-left font-semibold px-5 py-3"
                    style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b, i) => {
                const sc = statusStyle[b.status as keyof typeof statusStyle]
                return (
                  <tr
                    key={b.id}
                    className="transition-colors"
                    style={{ borderBottom: i < recentBookings.length - 1 ? '1px solid var(--cream-dark)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3 font-medium" style={{ fontSize: 12, color: 'var(--maroon)' }}>{b.id}</td>
                    <td className="px-5 py-3 font-serif font-semibold" style={{ fontSize: 13, color: 'var(--text-dark)' }}>{b.site}</td>
                    <td className="px-5 py-3" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{b.visitors}</td>
                    <td className="px-5 py-3 font-semibold" style={{ fontSize: 12, color: 'var(--text-dark)' }}>{b.amount}</td>
                    <td className="px-5 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 font-medium"
                        style={{ fontSize: 10, background: sc.bg, color: sc.color }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.time}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cancellations Today', val: '23', icon: '❌', note: '3.1% rate' },
          { label: 'Avg. Group Size',     val: '3.4', icon: '👨‍👩‍👧', note: 'Per booking' },
          { label: 'Active Kiosks',       val: '18',  icon: '🖥️', note: '2 offline' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl3 px-5 py-4 flex items-center gap-4"
            style={{ background: '#fff', border: '1px solid var(--sand)' }}
          >
            <div
              className="flex items-center justify-center rounded-xl text-2xl flex-shrink-0"
              style={{ width: 48, height: 48, background: 'var(--cream-dark)' }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 300 }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--maroon)', lineHeight: 1.2 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.note}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
