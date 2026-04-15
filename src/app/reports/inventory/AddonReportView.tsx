'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'

interface AddonTicket {
  name: string
  quantity: number
  amount: number
}

interface LocationReport {
  name: string
  totalVisitors: number
  totalBookings: number
  tickets: AddonTicket[]
}

const ADDON_DATA: LocationReport[] = [
  {
    name: 'NATIONAL CHAMBAL GHARIAL SANCTUARY PALIGHAT',
    totalVisitors: 3818,
    totalBookings: 256,
    tickets: [
      { name: 'Indian Student', quantity: 508, amount: 30278.71 },
      { name: 'Foreign Citizen', quantity: 103, amount: 59722.60 },
      { name: 'Indian Citizen', quantity: 3207, amount: 498488.11 },
    ],
  },
  {
    name: 'Sariska Tiger Reserve, Alwer',
    totalVisitors: 3995,
    totalBookings: 175,
    tickets: [
      { name: 'Foreign Citizen', quantity: 359, amount: 456316.91 },
    ],
  },
  {
    name: 'Ranthambore National Park',
    totalVisitors: 2845,
    totalBookings: 142,
    tickets: [
      { name: 'Indian Student', quantity: 450, amount: 22500.00 },
      { name: 'Indian Citizen', quantity: 2000, amount: 350000.00 },
      { name: 'Foreign Citizen', quantity: 395, amount: 98750.00 },
    ],
  },
  {
    name: 'Mount Abu Wildlife Sanctuary',
    totalVisitors: 2100,
    totalBookings: 98,
    tickets: [
      { name: 'Indian Student', quantity: 600, amount: 30000.00 },
      { name: 'Indian Citizen', quantity: 1200, amount: 240000.00 },
      { name: 'Foreign Citizen', quantity: 300, amount: 90000.00 },
    ],
  },
]

export default function AddonReportView() {
  const [startDate, setStartDate] = useState('01-Mar-2026')
  const [endDate, setEndDate] = useState('15-Apr-2026')
  const [paymentStatus, setPaymentStatus] = useState('SUCCESS')

  const totalRevenue = ADDON_DATA.reduce((sum, location) => {
    return sum + location.tickets.reduce((locSum, ticket) => locSum + ticket.amount, 0)
  }, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold font-serif" style={{ color: 'var(--ink)' }}>
            Add On Summary Report
          </h1>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs hover:bg-gray-50"
          style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}
        >
          <Filter size={14} />
          Filter
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4 items-center p-4 rounded-lg" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
        <div className="flex items-center gap-2">
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start Date :</label>
          <input
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded text-xs border outline-none"
            style={{ borderColor: 'var(--sand)' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>End Date :</label>
          <input
            type="text"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded text-xs border outline-none"
            style={{ borderColor: 'var(--sand)' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payment Type :</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="px-2 py-1 rounded text-xs border outline-none"
            style={{ borderColor: 'var(--sand)' }}
          >
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-4" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Total Locations</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--maroon)' }}>{ADDON_DATA.length}</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Total Visitors</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#1A7A6E' }}>
            {ADDON_DATA.reduce((sum, loc) => sum + loc.totalVisitors, 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg p-4" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Total Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#C8922A' }}>
            ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Location Reports */}
      <div className="space-y-6">
        {ADDON_DATA.map((location, idx) => (
          <div key={idx} className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
            {/* Location Title */}
            <h2 className="text-lg font-bold mb-4 font-serif" style={{ color: 'var(--ink)' }}>
              {location.name}
            </h2>

            {/* Location Stats */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Visitors</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--maroon)' }}>
                  {location.totalVisitors.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Bookings</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#1A7A6E' }}>
                  {location.totalBookings.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Addon Table */}
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--sand)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Ticket Type / Addon Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {location.tickets.map((ticket, ticketIdx) => (
                    <tr
                      key={ticketIdx}
                      style={{ borderBottom: ticketIdx < location.tickets.length - 1 ? '1px solid var(--sand)' : 'none' }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>
                        {ticket.name}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>
                        {ticket.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--maroon)' }}>
                        ₹{ticket.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Location Total */}
            <div className="mt-3 text-right pr-4">
              <div className="inline-block">
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>Subtotal:</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--maroon)' }}>
                  ₹{location.tickets.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Display Data: 10</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Result: 1 - {ADDON_DATA.length} of {ADDON_DATA.length}
        </div>
      </div>
    </div>
  )
}
