'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { Search, UserPlus, ChevronDown, X, Edit2, Trash2 } from 'lucide-react'

type UserRole = 'Super Admin' | 'Dept. Admin' | 'Operator' | 'Counter Staff' | 'Kiosk Staff' | 'Tourist'

interface User {
  id: number
  name: string
  email: string
  role: UserRole
  status: 'Active' | 'Inactive'
  userType: 'admin' | 'tourist' | 'both'
  // Admin fields
  department?: string
  division?: string
  district?: string
  addedBy?: string
  addedDate?: string
  assignedPlaces?: string[]
  // Tourist fields
  mobileNumber?: string
  ssoId?: string
  totalBookings?: number
  totalRevenue?: number
  totalGrievances?: number
}

const USERS: User[] = [
  { id: 1, name: 'BHARATTAILOR1408',  email: 'bharat@raj.gov.in',   role: 'Operator', status: 'Active', userType: 'both',
    department: 'Tourism', division: 'Jaipur', district: 'Jaipur', addedBy: 'Admin', addedDate: '15 Jan 2026',
    assignedPlaces: ['Amber Fort', 'City Palace'], mobileNumber: '9876543210', ssoId: 'BT1408', totalBookings: 12, totalRevenue: 8500, totalGrievances: 2 },
  { id: 2, name: 'Gurjarpankaj394',   email: 'pankaj@raj.gov.in',   role: 'Dept. Admin', status: 'Active', userType: 'admin',
    department: 'Tourism', division: 'Udaipur', district: 'Udaipur', addedBy: 'Super Admin', addedDate: '10 Dec 2025',
    assignedPlaces: ['City Palace Udaipur', 'Jagmandir'] },
  { id: 3, name: 'SANJAYJADONSIR',    email: 'sanjay@raj.gov.in',   role: 'Super Admin', status: 'Active', userType: 'admin',
    department: 'Administration', division: 'State', district: 'State', addedBy: 'System', addedDate: '01 Jan 2025',
    assignedPlaces: ['All Places'] },
  { id: 4, name: 'ramesh.operator',   email: 'ramesh@raj.gov.in',   role: 'Operator', status: 'Active', userType: 'tourist',
    mobileNumber: '8765432109', ssoId: 'RO4001', totalBookings: 5, totalRevenue: 3200, totalGrievances: 0 },
  { id: 5, name: 'priya.counter',     email: 'priya@raj.gov.in',    role: 'Counter Staff', status: 'Inactive', userType: 'admin',
    department: 'Counter Services', division: 'Jaipur', district: 'Jaipur', addedBy: 'Admin', addedDate: '20 Feb 2026',
    assignedPlaces: ['Jantar Mantar'] },
  { id: 6, name: 'mohit.kiosk',       email: 'mohit@raj.gov.in',    role: 'Kiosk Staff', status: 'Active', userType: 'both',
    department: 'Kiosk Operations', division: 'Jaisalmer', district: 'Jaisalmer', addedBy: 'Regional Admin', addedDate: '05 Mar 2026',
    assignedPlaces: ['Jaisalmer Fort'], mobileNumber: '9123456780', ssoId: 'MK6001', totalBookings: 3, totalRevenue: 1500, totalGrievances: 1 },
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

const roleColor: Record<UserRole, { bg: string; color: string }> = {
  'Super Admin':    { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
  'Dept. Admin':    { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
  'Operator':       { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
  'Counter Staff':  { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
  'Kiosk Staff':    { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
  'Tourist':        { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
}

function ViewDetailsDialog({ user, onClose, onEditRole, onUnassign }: { user: User; onClose: () => void; onEditRole: (userId: number, newRole: UserRole) => void; onUnassign: (userId: number) => void }) {
  const [editingRole, setEditingRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState(user.role)

  const roleColor: Record<UserRole, { bg: string; color: string }> = {
    'Super Admin':    { bg: 'rgba(139,26,26,0.1)',   color: '#8B1A1A' },
    'Dept. Admin':    { bg: 'rgba(200,146,42,0.12)', color: '#C8922A' },
    'Operator':       { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
    'Counter Staff':  { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
    'Kiosk Staff':    { bg: 'rgba(90,58,26,0.08)',   color: '#5A3A1A' },
    'Tourist':        { bg: 'rgba(26,122,110,0.1)',  color: '#1A7A6E' },
  }

  const handleEditRoleClick = () => {
    setEditingRole(true)
  }

  const handleSaveRole = () => {
    onEditRole(user.id, selectedRole)
    setEditingRole(false)
  }

  const handleUnassign = () => {
    if (window.confirm(`Are you sure you want to unassign ${user.name} from all places?`)) {
      onUnassign(user.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full mx-4" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">User Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Admin Section */}
          {(user.userType === 'admin' || user.userType === 'both') && (
            <div className="border border-gray-200 rounded-lg p-5" style={{ background: '#fafaf9' }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--maroon)' }}>Admin Information</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Role</div>
                  <span className="rounded-full px-2.5 py-0.5 font-medium text-xs" style={{ ...roleColor[user.role as UserRole] }}>
                    {user.role}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Department</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.department || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Division</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.division || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>District</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.district || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Added By</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.addedBy || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Added Date</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.addedDate || 'N/A'}</div>
                </div>
              </div>

              {/* Assigned Places */}
              {user.assignedPlaces && user.assignedPlaces.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-200">
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 500 }}>Assigned Places</div>
                  <div className="flex flex-wrap gap-2">
                    {user.assignedPlaces.map((place, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                        <span style={{ fontSize: 12 }}>{place}</span>
                        <button className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              <div className="mt-4 flex gap-2 pt-4 border-t border-gray-200">
                {!editingRole ? (
                  <>
                    <button
                      onClick={handleEditRoleClick}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-medium"
                      style={{ background: 'var(--maroon)' }}
                    >
                      <Edit2 size={13} />
                      Edit Role
                    </button>
                    <button
                      onClick={handleUnassign}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-50"
                      style={{ color: '#c41c1c', border: '1px solid #ffe0e0' }}
                    >
                      <Trash2 size={13} />
                      Unassign
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ border: '1px solid var(--sand)', background: '#fff' }}
                      >
                        <option value="Super Admin">Super Admin</option>
                        <option value="Dept. Admin">Dept. Admin</option>
                        <option value="Operator">Operator</option>
                        <option value="Counter Staff">Counter Staff</option>
                        <option value="Kiosk Staff">Kiosk Staff</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSaveRole}
                      className="px-3 py-2 rounded-lg text-white text-xs font-medium"
                      style={{ background: 'var(--maroon)' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingRole(false)
                        setSelectedRole(user.role)
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tourist Section */}
          {(user.userType === 'tourist' || user.userType === 'both') && (
            <div className="border border-gray-200 rounded-lg p-5" style={{ background: '#fafaf9' }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: '#1A7A6E' }}>Tourist Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Name</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>SSO ID</div>
                  <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{user.ssoId || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Mobile Number</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.mobileNumber || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Email</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Bookings</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--maroon)' }}>{user.totalBookings || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Revenue</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#1A7A6E' }}>₹{user.totalRevenue || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Grievances</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#C8922A' }}>{user.totalGrievances || 0}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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

function ActionMenu({ userId, userStatus, onStatusChange, onBookings, onGrievance, onViewDetails }: {
  userId: number
  userStatus: string
  onStatusChange: (status: string) => void
  onBookings: () => void
  onGrievance: () => void
  onViewDetails: () => void
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
              onViewDetails()
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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
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

  const openDetailsDialog = (userId: number) => {
    setSelectedUserId(userId)
    setDetailsDialogOpen(true)
  }

  const getSelectedUser = () => {
    return users.find(u => u.id === selectedUserId)
  }

  const handleEditRole = (userId: number, newRole: UserRole) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  const handleUnassignPlaces = (userId: number) => {
    setUsers(users.map(u => u.id === userId ? { ...u, assignedPlaces: [] } : u))
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
                    const rc = roleColor[u.role as UserRole]
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
                            onViewDetails={() => openDetailsDialog(u.id)}
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

      {detailsDialogOpen && selectedUserId && getSelectedUser() && (
        <ViewDetailsDialog
          user={getSelectedUser()!}
          onClose={() => setDetailsDialogOpen(false)}
          onEditRole={handleEditRole}
          onUnassign={handleUnassignPlaces}
        />
      )}
      {bookingDialogOpen && selectedUserId && (
        <BookingDialog userId={selectedUserId} onClose={() => setBookingDialogOpen(false)} />
      )}
      {grievanceDialogOpen && selectedUserId && (
        <GrievanceDialog userId={selectedUserId} onClose={() => setGrievanceDialogOpen(false)} />
      )}
    </div>
  )
}
