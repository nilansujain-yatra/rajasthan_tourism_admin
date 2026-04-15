'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { Search, UserPlus, ChevronDown, X } from 'lucide-react'

const USERS = [
  { id: 1, name: 'BHARATTAILOR1408',  email: 'bharat@raj.gov.in',   role: 'Operator',       status: 'Active' },
  { id: 2, name: 'Gurjarpankaj394',   email: 'pankaj@raj.gov.in',   role: 'Dept. Admin',    status: 'Active' },
  { id: 3, name: 'SANJAYJADONSIR',    email: 'sanjay@raj.gov.in',   role: 'Super Admin',    status: 'Active' },
  { id: 4, name: 'ramesh.operator',   email: 'ramesh@raj.gov.in',   role: 'Operator',       status: 'Active' },
  { id: 5, name: 'priya.counter',     email: 'priya@raj.gov.in',    role: 'Counter Staff',  status: 'Inactive' },
  { id: 6, name: 'mohit.kiosk',       email: 'mohit@raj.gov.in',    role: 'Kiosk Staff',    status: 'Active' },
]

const BOOKINGS = [
  { id: 1, userId: 1, placeName: 'Amber Fort', amount: 500, date: '15 Apr 2026', paymentStatus: 'Completed' },
  { id: 2, userId: 1, placeName: 'City Palace', amount: 300, date: '10 Apr 2026', paymentStatus: 'Pending' },
  { id: 3, userId: 2, placeName: 'Jantar Mantar', amount: 200, date: '08 Apr 2026', paymentStatus: 'Completed' },
]

const GRIEVANCES = [
  { id: 1, userId: 1, title: 'Booking Payment Issue', description: 'Payment was not processed correctly', status: 'Open' },
  { id: 2, userId: 2, title: 'User Access Problem', description: 'Unable to login', status: 'Resolved' },
]

const roleColor: Record<string, { bg: string; color: string }> = {
  'Super Admin':    { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
  'Dept. Admin':    { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
  'Operator':       { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
  'Counter Staff':  { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
  'Kiosk Staff':    { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
}

function BookingDialog({ userId, onClose }: { userId: number; onClose: () => void }) {
  const userBookings = BOOKINGS.filter(b => b.userId === userId)
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Tourist Bookings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {userBookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No bookings found</p>
        ) : (
          <div className="space-y-3">
            {userBookings.map(booking => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-4" style={{ background: '#fafaf9' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Place Name</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{booking.placeName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Amount</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--maroon)' }}>₹{booking.amount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Booking Date</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{booking.date}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Payment Status</div>
                    <span className="rounded-full px-2 py-1 text-xs font-medium" style={{
                      background: booking.paymentStatus === 'Completed' ? 'rgba(26,122,110,0.1)' : 'rgba(200,146,42,0.12)',
                      color: booking.paymentStatus === 'Completed' ? '#1A7A6E' : '#C8922A',
                    }}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GrievanceDialog({ userId, onClose }: { userId: number; onClose: () => void }) {
  const userGrievances = GRIEVANCES.filter(g => g.userId === userId)
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Grievances</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {userGrievances.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No grievances found</p>
        ) : (
          <div className="space-y-3">
            {userGrievances.map(grievance => (
              <div key={grievance.id} className="border border-gray-200 rounded-lg p-4" style={{ background: '#fafaf9' }}>
                <div className="mb-3">
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Title</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{grievance.title}</div>
                </div>
                <div className="mb-3">
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Description</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{grievance.description}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Status</div>
                  <span className="rounded-full px-2 py-1 text-xs font-medium" style={{
                    background: grievance.status === 'Resolved' ? 'rgba(26,122,110,0.1)' : 'rgba(200,146,42,0.12)',
                    color: grievance.status === 'Resolved' ? '#1A7A6E' : '#C8922A',
                  }}>
                    {grievance.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionMenu({ userId, userStatus, onStatusChange, onBookings, onGrievance }: {
  userId: number
  userStatus: string
  onStatusChange: (status: string) => void
  onBookings: () => void
  onGrievance: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition"
        style={{ fontSize: 11, background: 'var(--cream-dark)', color: 'var(--text-mid)' }}
      >
        Actions <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-40" style={{ background: '#fff' }}>
          <button
            onClick={() => {
              onStatusChange(userStatus === 'Active' ? 'Inactive' : 'Active')
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 text-xs font-medium"
          >
            {userStatus === 'Active' ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => {
              // View details action
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 text-xs font-medium"
          >
            View Details
          </button>
          <button
            onClick={() => {
              onGrievance()
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 text-xs font-medium"
          >
            Grievance
          </button>
          <button
            onClick={() => {
              onBookings()
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 text-xs font-medium"
          >
            Booking
          </button>
          <button
            onClick={() => {
              // My details action
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs font-medium"
          >
            My Details
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState(USERS)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [grievanceDialogOpen, setGrievanceDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const handleStatusChange = (userId: number, newStatus: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
  }

  const openBookingDialog = (userId: number) => {
    setSelectedUserId(userId)
    setBookingDialogOpen(true)
  }

  const openGrievanceDialog = (userId: number) => {
    setSelectedUserId(userId)
    setGrievanceDialogOpen(true)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

          <div className="grid grid-cols-4 gap-3">
            {[
              { label:'Total Users',   val: users.length.toString(), color:'var(--maroon)' },
              { label:'Active',        val: users.filter(u => u.status === 'Active').length.toString(), color:'#1A7A6E' },
              { label:'Admins',        val: users.filter(u => ['Dept. Admin', 'Super Admin'].includes(u.role)).length.toString(),  color:'#C8922A' },
              { label:'Inactive',      val: users.filter(u => u.status === 'Inactive').length.toString(),  color:'#9A7A5A' },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-4 py-3" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.label}</div>
                <div className="font-serif font-bold" style={{ fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm rounded-xl px-3 py-2" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <Search size={14} style={{ color:'var(--text-muted)' }} />
              <input placeholder="Search users..." className="flex-1 bg-transparent outline-none" style={{ fontSize:12 }} />
            </div>
            <div className="flex-1" />
            <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-white font-medium" style={{ fontSize:12, background:'var(--maroon)' }}>
              <UserPlus size={13} />
              Add User
            </button>
          </div>

          <div>
            <SectionHeader title="All Users" />
            <div className="rounded-xl overflow-hidden" style={{ background:'#fff', border:'1px solid var(--sand)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                    {['User','Email','Role','Status','Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const rc = roleColor[u.role] ?? { bg:'transparent', color:'inherit' }
                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: i < users.length-1 ? '1px solid var(--cream-dark)' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        className="hover:bg-opacity-50 hover:[background-color:var(--cream)]"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center rounded-full text-white font-semibold" style={{ width:28, height:28, background:'var(--maroon)', fontSize:10 }}>
                              {u.name.slice(0,2).toUpperCase()}
                            </div>
                            <span className="font-medium" style={{ fontSize:12 }}>{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize:10, ...rc }}>{u.role}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{
                            fontSize:10,
                            background: u.status==='Active' ? 'rgba(26,122,110,0.1)' : 'rgba(154,122,90,0.1)',
                            color: u.status==='Active' ? '#1A7A6E' : '#9A7A5A',
                          }}>{u.status}</span>
                        </td>
                        <td className="px-5 py-3">
                          <ActionMenu
                            userId={u.id}
                            userStatus={u.status}
                            onStatusChange={(status) => handleStatusChange(u.id, status)}
                            onBookings={() => openBookingDialog(u.id)}
                            onGrievance={() => openGrievanceDialog(u.id)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {bookingDialogOpen && selectedUserId && (
        <BookingDialog userId={selectedUserId} onClose={() => setBookingDialogOpen(false)} />
      )}
      {grievanceDialogOpen && selectedUserId && (
        <GrievanceDialog userId={selectedUserId} onClose={() => setGrievanceDialogOpen(false)} />
      )}
    </div>
  )
}
