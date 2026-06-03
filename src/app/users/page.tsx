'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import {
  Search,
  UserPlus,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquareWarning,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { GetAllUserListResponse, UserDetailDto } from '@/lib/api/services'
import { authFetch } from '@/lib/api/authFetch'

type UserStatus = 'Active' | 'Inactive'
type UserFilterStatus = '' | UserStatus
type UserTypeFilter = '' | 'Tourist' | 'Super Admin' | 'Operator' | 'Site Admin' | 'Department Admin'

type UserFilters = {
  userType: UserTypeFilter
  status: UserFilterStatus
}

type UserListDialogType = 'bookings' | 'grievances'

type UserBookingRow = {
  id?: string
  bookingId?: string
  bookingDate?: number
  visitDate?: number
  placeName?: string
  totalVisitors?: number
  totalAmount?: number
  bookingType?: string
  transactionStatus?: string
  bookingMode?: string
  [key: string]: unknown
}

type UserGrievanceRow = {
  id?: string
  grievanceId?: string
  subject?: string
  status?: string
  createdDate?: string | number
  category?: string
  [key: string]: unknown
}

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

const DEFAULT_USER_FILTERS: UserFilters = {
  userType: '',
  status: '',
}

const USER_TYPE_OPTIONS: { value: UserTypeFilter; label: string }[] = [
  { value: '', label: 'All User Types' },
  { value: 'Tourist', label: 'Tourist' },
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Operator', label: 'Operator' },
  { value: 'Site Admin', label: 'Site Admin' },
  { value: 'Department Admin', label: 'Department Admin' },
]

const STATUS_OPTIONS: { value: UserFilterStatus; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

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

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function getUserTypeApiValue(userType: UserTypeFilter) {
  return userType ? userType.toUpperCase().replace(/\s+/g, '_') : ''
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])

  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
    pages.add(i)
  }

  if (totalPages > 1) {
    pages.add(totalPages)
  }

  return Array.from(pages).sort((a, b) => a - b)
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 4) return null

  const obj = value as Record<string, unknown>
  const preferredKeys = ['result', 'data', 'content', 'list', 'rows', 'items']

  for (const key of preferredKeys) {
    if (key in obj) {
      const found = findFirstArray(obj[key], depth + 1)
      if (found) return found
    }
  }

  for (const child of Object.values(obj)) {
    const found = findFirstArray(child, depth + 1)
    if (found) return found
  }

  return null
}

function extractTotalRecords(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0

  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total ??
    root?.result?.meta?.totalRecords ??
    root?.meta?.totalRecords

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0
}

function extractBookingRows(payload: unknown): UserBookingRow[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as UserBookingRow[]
}

function extractUserGrievances(user: UiUser): UserGrievanceRow[] {
  const raw = user.raw as Record<string, unknown>
  const candidate =
    raw.grievances ??
    raw.grievanceList ??
    raw.grievanceDtos ??
    raw.complaints ??
    raw.complaintList

  const list = findFirstArray(candidate)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as UserGrievanceRow[]
}

function formatEpochDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-IN')
  }

  if (typeof value === 'string' && value.trim()) {
    return value
  }

  return 'N/A'
}

function getBookingSearchKey(user: UiUser) {
  return user.ssoId !== 'N/A' ? user.ssoId : user.email !== 'N/A' ? user.email : user.name
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

function ActionMenu({ userStatus, onStatusChange, onViewDetails, onViewBookings, onViewGrievances }: {
  userStatus: UserStatus
  onStatusChange: (status: UserStatus) => void
  onViewDetails: () => void
  onViewBookings: () => void
  onViewGrievances: () => void
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
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-40" style={{ background: '#fff' }}>
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
              onViewBookings()
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 text-xs font-medium"
          >
            Bookings
          </button>
          <button
            onClick={() => {
              onViewGrievances()
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 text-xs font-medium"
          >
            Grievance
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

function UserActivityDialog({ user, type, onClose }: {
  user: UiUser
  type: UserListDialogType
  onClose: () => void
}) {
  const [bookings, setBookings] = useState<UserBookingRow[]>([])
  const [totalBookings, setTotalBookings] = useState(0)
  const [loading, setLoading] = useState(type === 'bookings')
  const [error, setError] = useState<string | null>(null)
  const grievances = useMemo(() => extractUserGrievances(user), [user])

  useEffect(() => {
    if (type !== 'bookings') return

    const controller = new AbortController()

    async function loadUserBookings() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('bookingType', '')
        params.set('divisionId', '')
        params.set('districtId', '')
        params.set('endDay', String(new Date().setHours(23, 59, 59, 999)))
        params.set('offSet', '0')
        params.set('placeId', '')
        params.set('size', '20')
        params.set('startDay', '0')
        params.set('transactionStatus', '')
        params.set('departmentId', '')
        params.set('isFilter', 'true')
        params.set('dateFilter', 'Booking')
        params.set('searchKey', getBookingSearchKey(user))
        params.set('printCount', 'ALL')
        params.set('ticketType', '')
        params.set('zoneId', '')
        params.set('shiftId', '')
        params.set('quotaId', '')
        params.set('inventoryId', '')
        params.set('entryVerify', 'ALL')
        params.set('driverVerify', 'ALL')

        const response = await authFetch(`/inventory/reports/mis_V3?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json() as unknown

        if (!response.ok) {
          const message =
            typeof (payload as any)?.message === 'string'
              ? (payload as any).message
              : 'Unable to load user bookings.'
          throw new Error(message)
        }

        const list = extractBookingRows(payload)
        setBookings(list)
        setTotalBookings(extractTotalRecords(payload) || list.length)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setBookings([])
        setTotalBookings(0)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load user bookings.')
      } finally {
        setLoading(false)
      }
    }

    loadUserBookings()

    return () => controller.abort()
  }, [type, user])

  const title = type === 'bookings' ? 'User Bookings' : 'User Grievances'
  const subtitle = type === 'bookings' ? getBookingSearchKey(user) : user.ssoId
  const Icon = type === 'bookings' ? CalendarDays : MessageSquareWarning

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.45)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', width: 920, maxWidth: '96vw', maxHeight: '90vh', boxShadow: '0 24px 64px rgba(139,26,26,0.22)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
              <Icon size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 17 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{user.name} · {subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="flex items-center justify-center rounded-xl" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 72px)' }}>
          {type === 'bookings' ? (
            loading ? (
              <div className="py-10"><RajasthanLoader label="Loading bookings..." /></div>
            ) : error ? (
              <div className="rounded-xl p-4" style={{ border: '1px solid #ffe0e0', color: 'var(--text-muted)', fontSize: 12 }}>{error}</div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--text-muted)', fontSize: 12 }}>
                No bookings found for this user.
              </div>
            ) : (
              <>
                <div className="mb-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Showing {bookings.length} of {totalBookings} bookings
                </div>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                      {['Booking ID', 'Booking Date', 'Visit Date', 'Place', 'Visitors', 'Amount', 'Status'].map(header => (
                        <th key={header} className="text-left px-4 py-3" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <tr key={booking.id ?? booking.bookingId ?? index} style={{ borderBottom: index < bookings.length - 1 ? '1px solid var(--cream-dark)' : 'none' }}>
                        <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--maroon)', fontFamily: 'monospace', fontWeight: 600 }}>{booking.bookingId ?? 'N/A'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatEpochDate(booking.bookingDate)}</td>
                        <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatEpochDate(booking.visitDate)}</td>
                        <td className="px-4 py-3" style={{ fontSize: 12 }}>{booking.placeName ?? 'N/A'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 12 }}>{booking.totalVisitors ?? 'N/A'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 12, color: 'var(--maroon)', fontWeight: 700 }}>
                          {typeof booking.totalAmount === 'number' ? `₹${booking.totalAmount.toLocaleString('en-IN')}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3" style={{ fontSize: 11 }}>{booking.transactionStatus ?? booking.bookingType ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )
          ) : grievances.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--text-muted)', fontSize: 12 }}>
              No grievances found for this user.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                  {['Grievance ID', 'Subject', 'Category', 'Status', 'Created'].map(header => (
                    <th key={header} className="text-left px-4 py-3" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grievances.map((grievance, index) => (
                  <tr key={grievance.id ?? grievance.grievanceId ?? index} style={{ borderBottom: index < grievances.length - 1 ? '1px solid var(--cream-dark)' : 'none' }}>
                    <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--maroon)', fontFamily: 'monospace', fontWeight: 600 }}>{grievance.grievanceId ?? grievance.id ?? 'N/A'}</td>
                    <td className="px-4 py-3" style={{ fontSize: 12 }}>{grievance.subject ?? 'N/A'}</td>
                    <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{grievance.category ?? 'N/A'}</td>
                    <td className="px-4 py-3" style={{ fontSize: 11 }}>{grievance.status ?? 'N/A'}</td>
                    <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatEpochDate(grievance.createdDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function UserFilterSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
          style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
        >
          {options.map(option => (
            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

function UserFilterDialog({ open, values, onChange, onApply, onClose, onReset }: {
  open: boolean
  values: UserFilters
  onChange: (values: UserFilters) => void
  onApply: () => void
  onClose: () => void
  onReset: () => void
}) {
  useEffect(() => {
    if (!open) return
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.45)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          width: 520,
          maxWidth: '95vw',
          boxShadow: '0 24px 64px rgba(139,26,26,0.22)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
              <SlidersHorizontal size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 17 }}>User Filters</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>User Management</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-xl transition-colors"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-2.5 flex-wrap" style={{ background: 'var(--gold-pale)', borderBottom: '1px solid var(--sand)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active:</span>
          {values.userType || values.status ? (
            [
              values.userType && { label: values.userType },
              values.status && { label: values.status },
            ].filter(Boolean).map((item: any, index) => (
              <span
                key={index}
                className="rounded-full px-2.5 py-0.5 font-medium"
                style={{ fontSize: 10, background: 'rgba(139,26,26,0.1)', color: 'var(--maroon)' }}
              >
                {item.label}
              </span>
            ))
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>All users</span>
          )}
        </div>

        <div className="px-6 py-5 grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <UserFilterSelect
            label="User Type"
            value={values.userType}
            options={USER_TYPE_OPTIONS}
            onChange={value => onChange({ ...values, userType: value as UserTypeFilter })}
          />
          <UserFilterSelect
            label="Status"
            value={values.status}
            options={STATUS_OPTIONS}
            onChange={value => onChange({ ...values, status: value as UserFilterStatus })}
          />
        </div>

        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}
        >
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium"
            style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={13} /> Reset All
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 font-medium"
              style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white"
              style={{ fontSize: 13, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', cursor: 'pointer' }}
            >
              <SlidersHorizontal size={13} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PageBtn({ onClick, disabled, active, icon, label }: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  icon?: ReactNode
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-2"
      style={{
        minWidth: 28,
        height: 28,
        fontSize: 11,
        background: active ? 'var(--maroon)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-mid)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon ?? label}
    </button>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<UiUser[]>([])
  const [totalRecords, setTotalRecords] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterOpen, setFilterOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>(DEFAULT_USER_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<UserFilters>(DEFAULT_USER_FILTERS)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [activityDialogType, setActivityDialogType] = useState<UserListDialogType | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsers() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('searchKey', searchKey)
        params.set('size', '288270')
        params.set('offSet', '')
        params.set('block', 'false')
        params.set('pagination', 'false')
        params.set('isFilter', 'true')
        if (appliedFilters.userType) {
          params.set('userType', getUserTypeApiValue(appliedFilters.userType))
          params.set('role', getUserTypeApiValue(appliedFilters.userType))
        }
        if (appliedFilters.status) {
          params.set('status', appliedFilters.status.toUpperCase())
          params.set('active', String(appliedFilters.status === 'Active'))
        }

        const response = await authFetch(`/user/getAllUserList?${params.toString()}`, {
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
        const total = typeof payload.result?.totalRecords === 'number' ? payload.result.totalRecords : list.length
        setTotalRecords(total)
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
  }, [searchKey, appliedFilters])

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

  const openActivityDialog = (userId: string, type: UserListDialogType) => {
    setSelectedUserId(userId)
    setActivityDialogType(type)
  }

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [users, selectedUserId])

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (appliedFilters.status && user.status !== appliedFilters.status) return false
      if (appliedFilters.userType) {
        const selectedRole = normalizeForMatch(appliedFilters.userType)
        const hasRole = user.roles.some(role => normalizeForMatch(role).includes(selectedRole))
        if (!hasRole) return false
      }
      return true
    })
  }, [users, appliedFilters])

  const displayTotal = filteredUsers.length
  const totalPages = Math.max(1, Math.ceil(displayTotal / pageSize))
  const visiblePages = getVisiblePages(page, totalPages)
  const activeFilterCount = [appliedFilters.userType, appliedFilters.status].filter(Boolean).length

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, page, pageSize])

  const activeCount = useMemo(() => users.filter(u => u.status === 'Active').length, [users])
  const inactiveCount = useMemo(() => users.filter(u => u.status === 'Inactive').length, [users])
  const blockedCount = useMemo(() => users.filter(u => u.block).length, [users])

  const openFilter = () => {
    setPendingFilters(appliedFilters)
    setFilterOpen(true)
  }

  const applyFilter = () => {
    setAppliedFilters(pendingFilters)
    setPage(1)
    setFilterOpen(false)
  }

  const resetFilter = () => {
    setPendingFilters(DEFAULT_USER_FILTERS)
  }

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

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
                onChange={(e) => {
                  setSearchKey(e.target.value)
                  setPage(1)
                }}
                placeholder="Search users..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize:12 }}
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={openFilter}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
              style={{
                fontSize: 12,
                background: activeFilterCount ? 'rgba(139,26,26,0.08)' : '#fff',
                color: 'var(--maroon)',
                border: '1px solid var(--sand)',
              }}
            >
              <SlidersHorizontal size={13} />
              Filter
              {activeFilterCount > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5"
                  style={{ fontSize: 10, color: '#fff', background: 'var(--maroon)' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
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
                <>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background:'var(--cream-dark)', borderBottom:'1px solid var(--sand)' }}>
                        {['User', 'Email', 'SSO ID', 'Roles', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left px-5 py-3" style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', fontWeight:600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            No users match the current filters.
                          </td>
                        </tr>
                      ) : (
                        pagedUsers.map((u, i) => (
                          <tr
                            key={u.id}
                            style={{
                              borderBottom: i < pagedUsers.length-1 ? '1px solid var(--cream-dark)' : 'none',
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
                                onViewBookings={() => openActivityDialog(u.id, 'bookings')}
                                onViewGrievances={() => openActivityDialog(u.id, 'grievances')}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Page Size:</span>
                      <div className="relative">
                        <select
                          value={String(pageSize)}
                          onChange={e => {
                            setPageSize(Number(e.target.value))
                            setPage(1)
                          }}
                          className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                          style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                        >
                          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <PageBtn
                        onClick={() => setPage(current => Math.max(1, current - 1))}
                        disabled={page === 1}
                        icon={<><ChevronLeft size={12} /><span style={{ fontSize: 11 }}>Prev</span></>}
                      />
                      {visiblePages.map((pageNumber, index) => (
                        <div key={pageNumber} className="flex items-center gap-1">
                          {index > 0 && pageNumber - visiblePages[index - 1] > 1 && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>...</span>
                          )}
                          <PageBtn
                            onClick={() => setPage(pageNumber)}
                            active={page === pageNumber}
                            label={String(pageNumber)}
                          />
                        </div>
                      ))}
                      <PageBtn
                        onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                        disabled={page === totalPages}
                        icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>}
                      />
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Result:{' '}
                      <strong style={{ color: 'var(--text-dark)' }}>
                        {displayTotal === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, displayTotal)}`}
                      </strong>{' '}of{' '}
                      <strong style={{ color: 'var(--maroon)' }}>{displayTotal}</strong>
                    </div>
                  </div>
                </>
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

      {activityDialogType && selectedUser && (
        <UserActivityDialog
          user={selectedUser}
          type={activityDialogType}
          onClose={() => setActivityDialogType(null)}
        />
      )}

      <UserFilterDialog
        open={filterOpen}
        values={pendingFilters}
        onChange={setPendingFilters}
        onApply={applyFilter}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilter}
      />
    </div>
  )
}
