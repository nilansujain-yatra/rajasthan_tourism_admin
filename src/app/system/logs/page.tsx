'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  FileText,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'

type UserOption = {
  id: string
  label: string
  mobile: string
  ssoId: string
}

type UserLogRow = {
  id: string
  userName: string
  action: string
  clientTime: string
  serverTime: string
  ipAddress: string
  filePath: string
  sourceType: string
  rawClientTime: number
}

type Filters = {
  startDate: string
  endDate: string
  userId: string
  userLabel: string
}

type FilterDialogState = {
  open: boolean
  draft: Filters
  userSearch: string
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

function getRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 6) return null

  const obj = value as Record<string, unknown>
  const preferredKeys = ['userLogFileList', 'userLogsReport', 'result', 'data', 'content', 'list', 'rows', 'items']

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

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function todayAsInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inputDateToEpoch(dateValue: string, endOfDay = false) {
  if (!dateValue) return ''
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) return ''

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  )

  return String(date.getTime())
}

function formatDateTime(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A'

  const numeric = typeof value === 'number' ? value : Number(value)
  const date = !Number.isNaN(numeric) && numeric > 0 ? new Date(numeric) : new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    return toText(value, 'N/A')
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

function parseTimestamp(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value)
    if (!Number.isNaN(numeric) && numeric > 0) return numeric
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.getTime()
  }
  return 0
}

function getValueFromKeys(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function extractMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const message = (payload as Record<string, unknown>).message
  return typeof message === 'string' && message.trim() ? message.trim() : fallback
}

function mapUserOptions(payload: unknown): UserOption[] {
  const root = getRecord(payload)
  const result = getRecord(root?.result)
  const list = Array.isArray(result?.userDetailDtos)
    ? result.userDetailDtos
    : findFirstArray(payload) ?? []

  return list
    .map(item => {
      const row = getRecord(item)
      if (!row) return null

      const id = toText(getValueFromKeys(row, ['id', 'userId', 'createdById', '_id']))
      const label = toText(getValueFromKeys(row, ['displayName', 'userName', 'name', 'fullName', 'ssoId', 'ssoid']), 'User')
      if (!id) return null

      return {
        id,
        label,
        mobile: toText(getValueFromKeys(row, ['mobile', 'mobileNumber', 'phone']), ''),
        ssoId: toText(getValueFromKeys(row, ['ssoId', 'ssoid', 'userCode']), ''),
      }
    })
    .filter((item): item is UserOption => Boolean(item))
}

function mapLogRows(payload: unknown): { rows: UserLogRow[]; totalRecords: number } {
  const root = getRecord(payload)
  const result = getRecord(root?.result)
  const list = Array.isArray(result?.userLogFileList)
    ? result.userLogFileList
    : Array.isArray(result?.userLogsReport)
      ? result.userLogsReport
      : findFirstArray(result) ?? findFirstArray(payload) ?? []

  const rows = list
    .map((item, index) => {
      const row = getRecord(item)
      if (!row) return null

      const userName = toText(getValueFromKeys(row, ['userName', 'displayName', 'name', 'createdBy', 'fullName']), 'Unknown User')
      const action = toText(getValueFromKeys(row, ['action', 'logAction', 'activity', 'message', 'fileName', 'event']), 'Activity')
      const clientTimeValue = getValueFromKeys(row, ['date', 'time', 'timestamp', 'createdDate', 'createdTime', 'logDate'])
      const serverTimeValue = getValueFromKeys(row, ['serverDate', 'serverTime', 'serverTimestamp', 'updatedDate'])
      const ipAddress = toText(getValueFromKeys(row, ['ipAddress', 'ip', 'clientIp', 'host', 'sourceIp']), 'N/A')
      const filePath = toText(getValueFromKeys(row, ['filePath', 'url', 'downloadUrl', 'attachmentUrl', 'documentUrl']), '')
      const id = toText(getValueFromKeys(row, ['id', 'logId', '_id', 'fileId', 'recordId']), `${index + 1}`)
      const rawClientTime = parseTimestamp(clientTimeValue)

      return {
        id,
        userName,
        action,
        clientTime: formatDateTime(clientTimeValue),
        serverTime: formatDateTime(serverTimeValue),
        ipAddress,
        filePath,
        sourceType: Array.isArray(result?.userLogFileList) ? 'file-list' : 'activity-list',
        rawClientTime,
      }
    })
    .filter((item): item is UserLogRow => Boolean(item))
    .sort((left, right) => right.rawClientTime - left.rawClientTime)

  const totalRecords = typeof result?.totalRecords === 'number' ? result.totalRecords : rows.length

  return { rows, totalRecords }
}

function getPageOffset(page: number, pageSize: number) {
  return Math.max(0, (page - 1) * pageSize)
}

function PageButton({
  onClick,
  disabled,
  active,
  label,
  icon,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  label?: string
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-medium transition"
      style={{
        background: active ? 'var(--maroon)' : '#fff',
        border: '1px solid var(--sand)',
        color: active ? '#fff' : 'var(--text-mid)',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon ?? label}
    </button>
  )
}

function resolveFileViewerUrl(filePath: string) {
  const url = new URL('/system/logs/view', window.location.origin)
  url.searchParams.set('filePath', filePath)
  return url.toString()
}

export default function SystemUserLogsPage() {
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<UserLogRow[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [filterDialog, setFilterDialog] = useState<FilterDialogState>({
    open: false,
    draft: {
      startDate: todayAsInputValue(),
      endDate: todayAsInputValue(),
      userId: '',
      userLabel: '',
    },
    userSearch: '',
  })
  const [filters, setFilters] = useState<Filters>({
    startDate: todayAsInputValue(),
    endDate: todayAsInputValue(),
    userId: '',
    userLabel: '',
  })

  async function fetchJson<T = unknown>(url: string, fallback: string, init?: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(extractMessage(payload, fallback))
    }

    return payload as T
  }

  async function loadLogs(activeFilters: Filters) {
    const query = new URLSearchParams()
    query.set('userId', activeFilters.userId)
    query.set('startDate', inputDateToEpoch(activeFilters.startDate))
    query.set('endDate', inputDateToEpoch(activeFilters.endDate, true))
    query.set('size', String(pageSize))
    query.set('offset', String(getPageOffset(page, pageSize)))
    query.set('isFilter', 'true')

    const payload = await fetchJson(`/api/system/logs?${query.toString()}`, 'Unable to fetch user logs.')
    const extracted = mapLogRows(payload)
    setRows(extracted.rows)
    setTotalRecords(extracted.totalRecords)
  }

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        setLoading(true)
        setError('')
        await loadLogs(filters)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch user logs.')
        setRows([])
        setTotalRecords(0)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    if (!filterDialog.open) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingUsers(true)
        const params = new URLSearchParams()
        params.set('searchKey', filterDialog.userSearch.trim())
        params.set('pagination', 'false')
        params.set('isFilter', 'true')

        const payload = await fetchJson(`/api/users/getAllUserList?${params.toString()}`, 'Unable to fetch users.', {
          signal: controller.signal,
        })

        setUserOptions(mapUserOptions(payload))
      } catch (loadError) {
        if ((loadError as Error)?.name === 'AbortError') return
        setUserOptions([])
      } finally {
        setLoadingUsers(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [filterDialog.open, filterDialog.userSearch])

  const activeFilterCount = useMemo(() => {
    const count = [
      filters.userId,
      filters.startDate !== todayAsInputValue() ? filters.startDate : '',
      filters.endDate !== todayAsInputValue() ? filters.endDate : '',
    ].filter(Boolean).length

    return count
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const visiblePageNumbers = useMemo(() => {
    const pages = new Set<number>([1, totalPages])

    for (let offset = -1; offset <= 1; offset += 1) {
      const candidate = page + offset
      if (candidate >= 1 && candidate <= totalPages) pages.add(candidate)
    }

    return Array.from(pages).sort((left, right) => left - right)
  }, [page, totalPages])

  const selectedUserLabel = filters.userLabel || 'All users'
  const latestLog = rows[0]

  function openFilterDialog() {
    setFilterDialog({
      open: true,
      draft: { ...filters },
      userSearch: filters.userLabel,
    })
  }

  function closeFilterDialog() {
    setFilterDialog(current => ({ ...current, open: false, userSearch: '' }))
  }

  function resetDraftFilters() {
    const defaults = {
      startDate: todayAsInputValue(),
      endDate: todayAsInputValue(),
      userId: '',
      userLabel: '',
    }

    setFilterDialog(current => ({ ...current, draft: defaults, userSearch: '' }))
  }

  function applyFilters() {
    if (!filterDialog.draft.startDate || !filterDialog.draft.endDate) {
      setError('Start date and end date are required.')
      return
    }

    const startEpoch = Number(inputDateToEpoch(filterDialog.draft.startDate))
    const endEpoch = Number(inputDateToEpoch(filterDialog.draft.endDate, true))

    if (startEpoch > endEpoch) {
      setError('Start date cannot be after end date.')
      return
    }

    setSaving(true)
    setError('')
    setPage(1)
    setFilters({ ...filterDialog.draft })
    closeFilterDialog()
    setSaving(false)
  }

  async function refreshLogs() {
    try {
      setSaving(true)
      setError('')
      await loadLogs(filters)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh user logs.')
    } finally {
      setSaving(false)
    }
  }

  function openFile(filePath: string) {
    if (!filePath) return
    const viewerUrl = resolveFileViewerUrl(filePath)
    window.open(viewerUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">
          <div
            className="overflow-hidden rounded-[30px] border"
            style={{
              borderColor: 'rgba(200,146,42,0.22)',
              background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 52%, #C8922A 100%)',
              boxShadow: '0 18px 42px rgba(107,18,18,0.18)',
            }}
          >
            <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
              <div className="max-w-3xl">
                {/* <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-white/90" style={{ fontSize: 12 }}>
                  <FileText size={14} />
                  System
                </div> */}
                <h1 className="mt-3 font-serif" style={{ fontSize: 30, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>
                  User Logs
                </h1>
                
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openFilterDialog}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
                  style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  <Filter size={16} />
                  Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </button>
                <button
                  type="button"
                  onClick={refreshLogs}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
                  style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  <RefreshCw size={16} className={saving ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Logs', value: rows.length.toLocaleString(), color: 'var(--maroon)' },
              { label: 'Total Records', value: totalRecords.toLocaleString(), color: '#1A7A6E' },
              { label: 'Selected User', value: selectedUserLabel, color: '#C8922A' },
              { label: 'Latest Activity', value: latestLog ? latestLog.clientTime : 'N/A', color: '#5B4A2D' },
            ].map(card => (
              <div
                key={card.label}
                className="rounded-[24px] border bg-white px-5 py-4"
                style={{ borderColor: 'var(--sand)', boxShadow: '0 12px 28px rgba(107,18,18,0.05)' }}
              >
                <div className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  {card.label}
                </div>
                <div className="mt-2 truncate font-serif text-2xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {error ? (
            <div className="rounded-[22px] border px-4 py-3 text-sm" style={{ borderColor: 'rgba(229,62,62,0.22)', background: 'rgba(229,62,62,0.05)', color: '#B42318' }}>
              {error}
            </div>
          ) : null}

          <SectionHeader
            title="User Activity Logs"
            right={
              <div className="flex items-center gap-2 rounded-full px-3 py-1 text-sm" style={{ background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}>
                <UserRound size={14} />
                {selectedUserLabel}
              </div>
            }
          />

          <div className="overflow-hidden rounded-[28px] border bg-white" style={{ borderColor: 'var(--sand)', boxShadow: '0 16px 36px rgba(107,18,18,0.06)' }}>
            {loading ? (
              <div className="space-y-4 p-6">
                <div className="h-8 w-1/3 animate-pulse rounded-full bg-[var(--cream-dark)]" />
                <div className="h-12 animate-pulse rounded-[18px] bg-[var(--cream-dark)]" />
                <div className="h-72 animate-pulse rounded-[24px] bg-[var(--cream-dark)]" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="rounded-full bg-[var(--cream)] p-4" style={{ color: 'var(--maroon)' }}>
                  <FileText size={28} />
                </div>
                <h3 className="mt-4 font-serif text-2xl font-semibold" style={{ color: 'var(--text-dark)' }}>
                  No Records Found
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                  Try another date range or user filter to view log entries.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                      {['Sr No.', 'User Name', 'Action', 'Client Time',  'File'].map(header => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={`${row.id}-${index}`}
                        className="border-t transition hover:bg-[var(--cream)]"
                        style={{ borderColor: 'var(--cream-dark)' }}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {getPageOffset(page, pageSize) + index + 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-dark)' }}>
                          {row.userName}
                        </td>
                        <td className="max-w-[320px] px-4 py-3 text-sm" style={{ color: 'var(--text-dark)' }}>
                          <div className="line-clamp-2">{row.action}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {row.clientTime}
                        </td>
                        {/* <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {row.serverTime}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {row.ipAddress}
                        </td> */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openFile(row.filePath)}
                            disabled={!row.filePath}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                            style={{
                              background: row.filePath ? 'rgba(107,18,18,0.08)' : 'var(--cream-dark)',
                              color: row.filePath ? 'var(--maroon)' : 'var(--text-muted)',
                            }}
                          >
                            <FileText size={14} />
                            View File
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && rows.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-[24px] border bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: 'var(--sand)' }}>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRecords)} of {totalRecords} logs
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pageSize}
                  onChange={event => {
                    setPageSize(Number(event.target.value))
                    setPage(1)
                  }}
                  className="rounded-full border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--sand)', background: '#fff', color: 'var(--text-mid)' }}
                >
                  {PAGE_SIZE_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option} / page
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <PageButton
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    label="«"
                  />
                  <PageButton
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    icon={<ChevronLeft size={15} />}
                  />

                  {visiblePageNumbers.map(currentPage => (
                    <PageButton
                      key={currentPage}
                      onClick={() => setPage(currentPage)}
                      active={currentPage === page}
                      label={String(currentPage)}
                    />
                  ))}

                  <PageButton
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    icon={<ChevronRight size={15} />}
                  />
                  <PageButton
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    label="»"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {filterDialog.open ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-6" style={{ background: 'rgba(20,14,10,0.55)' }}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>
                  Filter User Logs
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Narrow the list by date range and user.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFilterDialog}
                className="rounded-full p-2"
                style={{ background: '#F8F4EE', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
                  Start Date
                </span>
                <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={filterDialog.draft.startDate}
                    onChange={event => setFilterDialog(current => ({
                      ...current,
                      draft: { ...current.draft, startDate: event.target.value },
                    }))}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: 'var(--text-dark)' }}
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
                  End Date
                </span>
                <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={filterDialog.draft.endDate}
                    onChange={event => setFilterDialog(current => ({
                      ...current,
                      draft: { ...current.draft, endDate: event.target.value },
                    }))}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: 'var(--text-dark)' }}
                  />
                </div>
              </label>
            </div>

            <div className="mt-4 space-y-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
                User
              </span>
              <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
                <Search size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  value={filterDialog.userSearch}
                  onChange={event => setFilterDialog(current => ({ ...current, userSearch: event.target.value }))}
                  placeholder="Search user name / mobile / SSO"
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-dark)' }}
                />
                {loadingUsers ? <ChevronsUpDown size={16} className="animate-pulse" style={{ color: 'var(--text-muted)' }} /> : null}
              </div>

              <div className="max-h-56 overflow-auto rounded-2xl border bg-white" style={{ borderColor: 'var(--sand)' }}>
                {userOptions.length === 0 ? (
                  <div className="px-4 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {loadingUsers ? 'Loading users...' : 'No users found.'}
                  </div>
                ) : (
                  userOptions.map(option => {
                    const selected = option.id === filterDialog.draft.userId
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFilterDialog(current => ({
                          ...current,
                          draft: {
                            ...current.draft,
                            userId: option.id,
                            userLabel: option.label,
                          },
                          userSearch: option.label,
                        }))}
                        className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-[var(--cream)]"
                        style={{ borderColor: 'var(--cream-dark)', background: selected ? 'rgba(107,18,18,0.05)' : '#fff' }}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium" style={{ color: 'var(--text-dark)' }}>
                            {option.label}
                          </div>
                          <div className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                            {option.mobile || option.ssoId ? `${option.mobile ? `Mobile: ${option.mobile}` : ''}${option.mobile && option.ssoId ? ' â€¢ ' : ''}${option.ssoId ? `SSO: ${option.ssoId}` : ''}` : 'No extra details'}
                          </div>
                        </div>
                        {selected ? <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }}>Selected</span> : null}
                      </button>
                    )
                  })
                )}
              </div>

              {filterDialog.draft.userId ? (
                <div className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-dark)' }}>
                      Selected user: {filterDialog.draft.userLabel}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Click clear to pick another user.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterDialog(current => ({
                      ...current,
                      draft: { ...current.draft, userId: '', userLabel: '' },
                      userSearch: '',
                    }))}
                    className="rounded-full px-3 py-1.5 text-sm font-medium"
                    style={{ background: '#fff', color: 'var(--text-muted)' }}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetDraftFilters}
                className="rounded-full px-4 py-2.5 text-sm font-medium"
                style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}
              >
                Reset
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeFilterDialog}
                  className="rounded-full px-4 py-2.5 text-sm font-medium"
                  style={{ background: '#F7F4EF', color: 'var(--text-mid)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={saving}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: 'var(--maroon)' }}
                >
                  {saving ? 'Applying...' : 'Apply Filter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
