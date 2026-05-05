'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal, X } from 'lucide-react'
import type { AuthUser } from '@/lib/auth/jwt'

export type RecordRow = Record<string, unknown>

export type JkkFilterState = {
  startDate: string
  endDate: string
  categoryId: string
  subCategoryId: string
  shiftId: string
  status: string
  refundStatus: string
}

export type JkkUser = {
  id?: string | number
  userId?: string | number
  ssoId?: string
  ssoid?: string
  name?: string
  userName?: string
  fullName?: string
  userType?: string
  [key: string]: unknown
}

export type JkkShift = {
  id?: string | number
  name?: string
}

export type JkkSubCategory = {
  id?: string | number
  name?: string
  jkkShiftList?: JkkShift[]
}

export type JkkCategory = {
  id?: string | number
  name?: string
  jkkSubCategoryList?: JkkSubCategory[]
}

export function todayInput() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

export function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function startMs(value: string) {
  return new Date(`${value}T00:00:00.000`).getTime()
}

export function endMs(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime()
}

export function formatDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return new Date(value).toLocaleDateString('en-IN')
  }

  const text = toText(value)
  if (!text) return 'N/A'

  const numeric = Number(text)
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric).toLocaleDateString('en-IN')
  }

  return text
}

export function formatDateTime(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    return `${date.toLocaleDateString('en-IN')} | ${date.toLocaleTimeString('en-IN')}`
  }

  const text = toText(value)
  if (!text) return 'N/A'

  const numeric = Number(text)
  if (Number.isFinite(numeric) && numeric > 0) {
    const date = new Date(numeric)
    return `${date.toLocaleDateString('en-IN')} | ${date.toLocaleTimeString('en-IN')}`
  }

  return text
}

export function formatMoney(value: unknown) {
  return `Rs. ${toNumber(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function getAny(obj: unknown, keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined

  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key]
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')) {
      return value
    }
  }

  return undefined
}

export function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 5) return null

  const objectValue = value as Record<string, unknown>

  for (const key of ['result', 'data', 'content', 'list', 'items', 'rows']) {
    if (key in objectValue) {
      const found = findFirstArray(objectValue[key], depth + 1)
      if (found) return found
    }
  }

  for (const child of Object.values(objectValue)) {
    const found = findFirstArray(child, depth + 1)
    if (found) return found
  }

  return null
}

export function extractTotal(payload: unknown, fallback = 0) {
  if (!payload || typeof payload !== 'object') return fallback
  const root = payload as Record<string, any>
  const total = root?.result?.totalRecords ?? root?.result?.total ?? root?.totalRecords ?? root?.total
  return typeof total === 'number' && Number.isFinite(total) ? total : fallback
}

export function csv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const content = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function defaultJkkFilters(): JkkFilterState {
  return {
    startDate: todayInput(),
    endDate: todayInput(),
    categoryId: '',
    subCategoryId: '',
    shiftId: '',
    status: '',
    refundStatus: '',
  }
}

export function useSessionUser() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!response.ok) {
          if (active) setUser(null)
          return
        }

        const payload = await response.json()
        if (active) setUser((payload?.user ?? null) as AuthUser | null)
      } catch {
        if (active) setUser(null)
      }
    })()

    return () => { active = false }
  }, [])

  return user
}

export function useJkkLookups(selectedCategoryId: string, selectedSubCategoryId: string) {
  const [categories, setCategories] = useState<JkkCategory[]>([])

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const response = await fetch('/api/jkk/place-details', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const source = ((payload?.result?.jkkCategoryList ?? payload?.jkkCategoryList ?? []) as JkkCategory[])
        if (active) setCategories(source.filter(item => item && typeof item === 'object'))
      } catch {
        if (active) setCategories([])
      }
    })()

    return () => { active = false }
  }, [])

  const selectedCategory = useMemo(
    () => categories.find(item => toText(item.id) === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  const subCategories = useMemo(
    () => selectedCategory?.jkkSubCategoryList ?? [],
    [selectedCategory],
  )

  const selectedSubCategory = useMemo(
    () => subCategories.find(item => toText(item.id) === selectedSubCategoryId) ?? null,
    [subCategories, selectedSubCategoryId],
  )

  const shifts = useMemo(
    () => selectedSubCategory?.jkkShiftList ?? [],
    [selectedSubCategory],
  )

  return { categories, subCategories, shifts }
}

export function useJkkUsers() {
  const [users, setUsers] = useState<JkkUser[]>([])

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const response = await fetch('/api/jkk/master-users', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const source = (payload?.result?.jkkUserLists ?? payload?.jkkUserLists ?? []) as JkkUser[]
        if (active) setUsers(source.filter(item => item && typeof item === 'object'))
      } catch {
        if (active) setUsers([])
      }
    })()

    return () => { active = false }
  }, [])

  return users
}

export function reportStatusOptions() {
  return [
    { value: '', label: 'All Statuses' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECT', label: 'Rejected' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PAYMENT_DONE', label: 'Payment Done' },
    { value: 'ASSIGNER', label: 'Assigner' },
    { value: 'REVIEWER', label: 'Reviewer' },
    { value: 'MODERATOR', label: 'Moderator' },
  ]
}

export function refundStatusOptions() {
  return [
    { value: '', label: 'All Refund Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'REFUND_INITIATED', label: 'Refund Initiated' },
    { value: 'REFUND_PROCESSING', label: 'Refund Processing' },
    { value: 'REFUND_SUCCESS', label: 'Refund Success' },
    { value: 'REFUND_FAILED', label: 'Refund Failed' },
    { value: 'REFUND_REJECTED', label: 'Refund Rejected' },
  ]
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl px-4 py-3 outline-none"
        style={{ fontSize: 12, border: '1px solid var(--sand)', background: '#fff', color: 'var(--text-dark)' }}
      >
        {options.map(option => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function JkkFilterModal({
  open,
  title,
  values,
  setValues,
  categories,
  subCategories,
  shifts,
  showStatus = false,
  showRefundStatus = false,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean
  title: string
  values: JkkFilterState
  setValues: React.Dispatch<React.SetStateAction<JkkFilterState>>
  categories: JkkCategory[]
  subCategories: JkkSubCategory[]
  shifts: JkkShift[]
  showStatus?: boolean
  showRefundStatus?: boolean
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.16)' }}>
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <div className="font-serif text-xl font-bold">{title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>JKK report filters</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.16)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Start Date</label>
            <input
              type="date"
              value={values.startDate}
              onChange={event => setValues(current => ({ ...current, startDate: event.target.value }))}
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ fontSize: 12, border: '1px solid var(--sand)' }}
            />
          </div>

          <div className="space-y-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>End Date</label>
            <input
              type="date"
              value={values.endDate}
              min={values.startDate}
              onChange={event => setValues(current => ({ ...current, endDate: event.target.value }))}
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ fontSize: 12, border: '1px solid var(--sand)' }}
            />
          </div>

          <FilterSelect
            label="Category"
            value={values.categoryId}
            options={[{ value: '', label: 'All Categories' }, ...categories.map(item => ({ value: toText(item.id), label: toText(item.name, 'Unnamed Category') }))]}
            onChange={value => setValues(current => ({ ...current, categoryId: value, subCategoryId: '', shiftId: '' }))}
          />

          <FilterSelect
            label="Sub Category"
            value={values.subCategoryId}
            options={[{ value: '', label: 'All Sub Categories' }, ...subCategories.map(item => ({ value: toText(item.id), label: toText(item.name, 'Unnamed Sub Category') }))]}
            onChange={value => setValues(current => ({ ...current, subCategoryId: value, shiftId: '' }))}
          />

          <FilterSelect
            label="Shift"
            value={values.shiftId}
            options={[{ value: '', label: 'All Shifts' }, ...shifts.map(item => ({ value: toText(item.id), label: toText(item.name, 'Unnamed Shift') }))]}
            onChange={value => setValues(current => ({ ...current, shiftId: value }))}
          />

          {showStatus ? (
            <FilterSelect
              label="Approval Status"
              value={values.status}
              options={reportStatusOptions()}
              onChange={value => setValues(current => ({ ...current, status: value }))}
            />
          ) : null}

          {showRefundStatus ? (
            <FilterSelect
              label="Refund Status"
              value={values.refundStatus}
              options={refundStatusOptions()}
              onChange={value => setValues(current => ({ ...current, refundStatus: value }))}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--sand)' }}>
          <button onClick={onReset} className="rounded-xl border px-4 py-2" style={{ borderColor: 'var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>
            Reset All
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-xl border px-4 py-2" style={{ borderColor: 'var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>
              Cancel
            </button>
            <button onClick={onApply} className="rounded-xl px-4 py-2 text-white" style={{ fontSize: 12, background: 'var(--maroon)' }}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportCard({ label, value, solid }: { label: string; value: string; solid?: boolean }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: solid ? 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' : '#fff',
        border: solid ? 'none' : '1px solid var(--sand)',
      }}
    >
      <div style={{ fontSize: 10, color: solid ? 'rgba(255,255,255,0.74)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div className="font-serif text-2xl font-bold" style={{ color: solid ? '#fff' : 'var(--maroon)', marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}

export function PaginationControls({
  page,
  setPage,
  pageSize,
  setPageSize,
  total,
}: {
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  pageSize: number
  setPageSize: React.Dispatch<React.SetStateAction<number>>
  total: number
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))

  return (
    <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--sand)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
      </div>
      <div className="flex items-center gap-3">
        <select
          value={pageSize}
          onChange={event => {
            setPageSize(Number(event.target.value))
            setPage(1)
          }}
          className="rounded-xl px-3 py-2 outline-none"
          style={{ fontSize: 12, border: '1px solid var(--sand)' }}
        >
          {[10, 20, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
        </select>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg p-2 disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-lg p-2 disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReportShell({
  title,
  subtitle,
  search,
  setSearch,
  filterCount,
  onOpenFilters,
  onExport,
  cards,
  statusMessage,
  statusTone = 'normal',
  children,
}: {
  title: string
  subtitle: string
  search?: string
  setSearch?: React.Dispatch<React.SetStateAction<string>>
  filterCount: number
  onOpenFilters: () => void
  onExport: () => void
  cards: Array<{ label: string; value: string; solid?: boolean }>
  statusMessage?: string
  statusTone?: 'normal' | 'error' | 'success'
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--sand)' }}>
        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>{title}</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {typeof search === 'string' && setSearch ? (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 240 }}>
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search current results"
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 12, color: 'var(--text-dark)' }}
              />
              {search ? <button onClick={() => setSearch('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button> : null}
            </div>
          ) : null}

          <button
            onClick={onOpenFilters}
            className="relative flex items-center gap-2 rounded-xl px-4 py-2"
            style={{
              fontSize: 12,
              background: filterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
              color: filterCount > 0 ? '#fff' : 'var(--text-mid)',
              border: `1px solid ${filterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
            }}
          >
            <SlidersHorizontal size={13} />
            Filter
            {filterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white" style={{ fontSize: 9, background: 'var(--gold)' }}>
                {filterCount}
              </span>
            ) : null}
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {statusMessage ? (
        <div
          className="flex items-center gap-2 px-6 py-3"
          style={{
            background: statusTone === 'error' ? 'rgba(180, 35, 24, 0.08)' : statusTone === 'success' ? 'rgba(26, 122, 110, 0.08)' : 'var(--cream)',
            color: statusTone === 'error' ? '#B42318' : statusTone === 'success' ? '#1A7A6E' : 'var(--text-mid)',
          }}
        >
          <Calendar size={14} />
          <span style={{ fontSize: 12 }}>{statusMessage}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-4" style={{ background: 'var(--cream)' }}>
        {cards.map(card => <ReportCard key={card.label} label={card.label} value={card.value} solid={card.solid} />)}
      </div>

      {children}
    </div>
  )
}

export function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
          <div>
            <div className="font-serif text-xl font-bold">{title}</div>
            {subtitle ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>{subtitle}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.16)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-72px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function DetailGrid({ entries }: { entries: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {entries.map(item => (
        <div key={item.label} className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>{item.label}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dark)', wordBreak: 'break-word' }}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
