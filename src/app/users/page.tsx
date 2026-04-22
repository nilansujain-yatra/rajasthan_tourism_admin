'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { Search, UserPlus, ChevronDown, X } from 'lucide-react'
import type { GetAllUserListResponse, UserDetailDto } from '@/lib/api/services'

type UserStatus = 'Active' | 'Inactive'

type UiUser = {
  id: string
  name: string
  email: string
  ssoId: string
  role: string
  roles: string[]
  status: UserStatus
  block: boolean
  raw: UserDetailDto
}

function getUserInitials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return 'U'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const second = parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (first + second).toUpperCase()
}

function normalizeRoleLabel(roles: string[]) {
  if (!roles.length) return 'N/A'
  return roles.join(', ')
}

function mapApiUserToUiUser(dto: UserDetailDto): UiUser {
  const roles = Array.isArray(dto.ssoRoles) ? dto.ssoRoles.filter(Boolean) : []
  const name = dto.displayName?.trim() || dto.ssoId?.trim() || dto.email?.trim() || 'Unknown User'
  const email = dto.email?.trim() || 'N/A'
  const ssoId = dto.ssoId?.trim() || 'N/A'

  return {
    id: dto.id,
    name,
    email,
    ssoId,
    role: normalizeRoleLabel(roles),
    roles,
    status: dto.active ? 'Active' : 'Inactive',
    block: Boolean(dto.block),
    raw: dto,
  }
}

function ViewDetailsDialog({ user, onClose }: { user: UiUser; onClose: () => void }) {
  const dto = user.raw

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full mx-4" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold">User Details</h2>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {user.id}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="border border-gray-200 rounded-lg p-5" style={{ background: '#fafaf9' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--maroon)' }}>Profile</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Display Name', value: dto.displayName ?? 'N/A' },
                { label: 'SSO ID', value: dto.ssoId ?? 'N/A' },
                { label: 'Email', value: dto.email ?? 'N/A' },
                { label: 'Mobile', value: dto.mobile ?? 'N/A' },
                { label: 'Roles', value: (dto.ssoRoles?.length ? dto.ssoRoles.join(', ') : 'N/A') },
                { label: 'Active', value: dto.active ? 'Yes' : 'No' },
                { label: 'Blocked', value: dto.block ? 'Yes' : 'No' },
                { label: 'Agent', value: dto.agent ? 'Yes' : 'No' },
                { label: 'Normal User', value: dto.normalUser ? 'Yes' : 'No' },
                { label: 'Deleted', value: dto.delete ? 'Yes' : 'No' },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{row.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-5" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-dark)' }}>Raw API Data</h3>
              <button
                className="rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(dto, null, 2))
                  } catch {
                    // ignore clipboard failures
                  }
                }}
              >
                Copy JSON
              </button>
            </div>
            <pre
              className="rounded-lg p-3 overflow-x-auto"
              style={{ background: '#fafaf9', border: '1px solid var(--sand)', fontSize: 11, lineHeight: 1.5 }}
            >
              {JSON.stringify(dto, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionMenu({ userStatus, onStatusChange, onViewDetails }: {
  userStatus: UserStatus
  onStatusChange: (status: UserStatus) => void
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
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs font-medium"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<UiUser[]>([])
  const [totalRecords, setTotalRecords] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState('')
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsers() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('searchKey', searchKey)
        params.set('size', '50')
        params.set('offSet', '0')
        params.set('block', 'false')
        params.set('pagination', 'true')
        params.set('isFilter', 'true')

        const response = await fetch(`/api/users/getAllUserList?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = await response.json() as GetAllUserListResponse

        if (!response.ok) {
          const message =
            typeof (payload as any)?.message === 'string'
              ? (payload as any).message
              : 'Unable to load users.'
          throw new Error(message)
        }

        const list = payload.result?.userDetailDtos ?? []
        setTotalRecords(typeof payload.result?.totalRecords === 'number' ? payload.result.totalRecords : null)
        setUsers(list.map(mapApiUserToUiUser))
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch users.')
        setUsers([])
        setTotalRecords(null)
      } finally {
        setLoading(false)
      }
    }

    const timeout = setTimeout(loadUsers, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [searchKey])

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      status: newStatus,
      raw: { ...u.raw, active: newStatus === 'Active' },
    } : u))
  }

  const openDetailsDialog = (userId: string) => {
    setSelectedUserId(userId)
    setDetailsDialogOpen(true)
  }

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [users, selectedUserId])

  const activeCount = useMemo(() => users.filter(u => u.status === 'Active').length, [users])
  const inactiveCount = useMemo(() => users.filter(u => u.status === 'Inactive').length, [users])
  const blockedCount = useMemo(() => users.filter(u => u.block).length, [users])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Users', val: (totalRecords ?? users.length).toString(), color: 'var(--maroon)' },
              { label: 'Active', val: activeCount.toString(), color: '#1A7A6E' },
              { label: 'Blocked', val: blockedCount.toString(), color: '#C8922A' },
              { label: 'Inactive', val: inactiveCount.toString(), color: '#9A7A5A' },
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
              <input
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Search users..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize:12 }}
              />
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
              {loading ? (
                <div className="px-6 py-10">
                  <RajasthanLoader label="Loading users..." />
                </div>
              ) : error ? (
                <div className="px-6 py-6">
                  <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ffe0e0' }}>
                    <div className="font-serif font-bold mb-1" style={{ fontSize: 18, color: 'var(--maroon)' }}>
                      Users data unavailable
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{error}</div>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                      {['User', 'Email', 'SSO ID', 'Roles', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: i < users.length-1 ? '1px solid var(--cream-dark)' : 'none',
                          transition: 'background-color 0.2s',
                        }}
                        className="hover:bg-opacity-50 hover:[background-color:var(--cream)]"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center rounded-full text-white font-semibold" style={{ width:28, height:28, background:'var(--maroon)', fontSize:10 }}>
                              {getUserInitials(u.name)}
                            </div>
                            <span className="font-medium" style={{ fontSize:12 }}>{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3" style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</td>
                        <td className="px-5 py-3" style={{ fontSize:11, color:'var(--text-muted)', fontFamily: 'monospace' }}>{u.ssoId}</td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 font-medium"
                            style={{ fontSize:10, background: 'rgba(200,146,42,0.12)', color: '#C8922A' }}
                            title={u.role}
                          >
                            {u.roles.length ? `${u.roles[0]}${u.roles.length > 1 ? ` +${u.roles.length - 1}` : ''}` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full px-2.5 py-0.5 font-medium" style={{
                            fontSize:10,
                            background: u.status==='Active' ? 'rgba(26,122,110,0.1)' : 'rgba(154,122,90,0.1)',
                            color: u.status==='Active' ? '#1A7A6E' : '#9A7A5A',
                          }}>{u.status}</span>
                          {u.block && (
                            <span className="ml-2 rounded-full px-2.5 py-0.5 font-medium" style={{
                              fontSize: 10,
                              background: 'rgba(196,28,28,0.08)',
                              color: '#c41c1c',
                              border: '1px solid #ffe0e0',
                            }}>
                              Blocked
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <ActionMenu
                            userStatus={u.status}
                            onStatusChange={(status) => handleStatusChange(u.id, status)}
                            onViewDetails={() => openDetailsDialog(u.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </main>
      </div>

      {detailsDialogOpen && selectedUser && (
        <ViewDetailsDialog
          user={selectedUser}
          onClose={() => setDetailsDialogOpen(false)}
        />
      )}
    </div>
  )
}
