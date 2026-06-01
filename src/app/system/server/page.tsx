'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  ListFilter,
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

type ServerLogEntry = {
  id: string
  userName: string
  mobile: string
  ssoId: string
  action: string
  time: string
  ipAddress: string
}

type ServerUsageRow = {
  id: string
  userName: string
  mobile: string
  ssoId: string
  logs: ServerLogEntry[]
  latestTime: number
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

const PAGE_SIZE_OPTIONS = [5, 10, 20]

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return fallback
}

function getRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function findFirstArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return null
  for (const candidate of Object.values(value as Record<string, unknown>)) {
    const found = findFirstArray(candidate)
    if (found) return found
  }
  return null
}

function extractMessage(payload: unknown, fallback: string) {
  const record = getRecord(payload)
  const message = record?.message
  return typeof message === 'string' && message.trim() ? message.trim() : fallback
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
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  return String(date.getTime())
}

function formatLogTime(value: string) {
  if (!value) return 'N/A'
  const parsed = new Date(Number(value))
  const validDate = Number.isNaN(parsed.getTime()) ? new Date(value) : parsed

  if (Number.isNaN(validDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(validDate)
}

function parseLogTimestamp(value: string) {
  if (!value) return 0
  const numeric = Number(value)
  if (!Number.isNaN(numeric) && numeric > 0) return numeric
  const dateValue = new Date(value).getTime()
  return Number.isNaN(dateValue) ? 0 : dateValue
}

function mapServerLogEntry(item: unknown, index: number): ServerLogEntry | null {
  const row = getRecord(item)
  if (!row) return null

  const userName = toText(row.userName ?? row.displayName ?? row.name, 'Unknown User')
  const action = toText(row.action ?? row.logAction ?? row.activity ?? row.message, 'Activity')
  const time = toText(row.createdDate ?? row.createdTime ?? row.date ?? row.time)
  const ssoId = toText(row.ssoId ?? row.ssoID ?? row.ssoid)
  const mobile = toText(row.mobile)
  const ipAddress = toText(row.ipAddress ?? row.ip ?? row.host ?? row.clientIp)
  const id = toText(row.id ?? row.logId ?? row._id, `${index}`)

  return {
    id: id || `${index}`,
    userName,
    mobile,
    ssoId,
    action,
    time,
    ipAddress,
  }
}

function extractServerLogs(payload: unknown) {
  const root = getRecord(payload)
  const result = getRecord(root?.result)
  const list = Array.isArray(result?.serverLogsDto)
    ? result.serverLogsDto
    : findFirstArray(result) ?? findFirstArray(payload) ?? []

  const entries = list
    .map((item, index) => mapServerLogEntry(item, index))
    .filter((item): item is ServerLogEntry => Boolean(item))

  const grouped = new Map<string, ServerUsageRow>()

  entries.forEach(entry => {
    const key = `${entry.ssoId || entry.userName}-${entry.mobile || 'na'}`
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, {
        id: key,
        userName: entry.userName,
        mobile: entry.mobile,
        ssoId: entry.ssoId,
        logs: [entry],
        latestTime: parseLogTimestamp(entry.time),
      })
      return
    }

    existing.logs.push(entry)
    existing.latestTime = Math.max(existing.latestTime, parseLogTimestamp(entry.time))
  })

  const rows = Array.from(grouped.values())
    .map(row => ({
      ...row,
      logs: row.logs.sort((left, right) => parseLogTimestamp(right.time) - parseLogTimestamp(left.time)),
    }))
    .sort((left, right) => right.latestTime - left.latestTime)

  return {
    rows,
    totalRecords: typeof result?.totalRecords === 'number' ? result.totalRecords : entries.length,
    entryCount: entries.length,
  }
}

function mapUserOptions(payload: unknown): UserOption[] {
  const root = getRecord(payload)
  const result = getRecord(root?.result)
  const list = Array.isArray(result?.userDetailDtos)
    ? result.userDetailDtos
    : findFirstArray(result) ?? findFirstArray(payload) ?? []

  return list
    .map(item => {
      const row = getRecord(item)
      if (!row) return null

      const id = toText(row.id)
      const label = toText(row.displayName ?? row.userName ?? row.name ?? row.ssoId ?? row.ssoid, 'User')

      if (!id) return null

      return {
        id,
        label,
        mobile: toText(row.mobile),
        ssoId: toText(row.ssoId ?? row.ssoid),
      }
    })
    .filter((item): item is UserOption => Boolean(item))
}

function statusPillStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function buttonStyle() {
  return {
    background: '#fff',
    border: '1px solid var(--sand)',
    color: 'var(--text-muted)',
    fontSize: 13,
  } as const
}

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-6" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</h3>
            {subtitle ? <p className="mt-1" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: '#F8F4EE', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function noDataMessage(hasFilters: boolean) {
  return hasFilters
    ? 'No server usage logs match the current filters.'
    : 'Use filters to load server usage logs.'
}

export default function ServerLogsPage() {
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ServerUsageRow[]>([])
  const [expandedRowId, setExpandedRowId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalLogEntries, setTotalLogEntries] = useState(0)
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

  async function loadServerLogs(activeFilters: Filters) {
    const startDay = inputDateToEpoch(activeFilters.startDate)
    const endDay = inputDateToEpoch(activeFilters.endDate, true)
    const query = new URLSearchParams()
    query.set('startDay', startDay)
    query.set('endDay', endDay)
    query.set('userId', activeFilters.userId)
    query.set('isFilter', 'true')

    const payload = await fetchJson(`/api/system/server?${query.toString()}`, 'Unable to fetch server logs.')
    const extracted = extractServerLogs(payload)
    setRows(extracted.rows)
    setTotalLogEntries(extracted.entryCount)
    setPage(1)
    setExpandedRowId('')
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError('')
        await loadServerLogs(filters)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch server logs.')
        setRows([])
        setTotalLogEntries(0)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [filters])

  useEffect(() => {
    if (!filterDialog.open) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingUsers(true)
        const params = new URLSearchParams()
        params.set('searchKey', filterDialog.userSearch.trim())
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
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [filterDialog.open, filterDialog.userSearch])

  const groupedRows = useMemo(() => rows, [rows])
  const totalPages = Math.max(1, Math.ceil(groupedRows.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return groupedRows.slice(start, start + pageSize)
  }, [groupedRows, page, pageSize])

  const activeFilterCount = [
    filters.userId,
    filters.startDate !== todayAsInputValue() ? filters.startDate : '',
    filters.endDate !== todayAsInputValue() ? filters.endDate : '',
  ].filter(Boolean).length

  const selectedUser = filters.userLabel || (filters.userId ? 'Selected user' : 'All users')

  const latestActivity = groupedRows[0]?.latestTime ? formatLogTime(String(groupedRows[0].latestTime)) : 'N/A'

  const totalActions = totalLogEntries

  const hasAnyLogs = groupedRows.length > 0

  async function openFilterDialog() {
    setFilterDialog(current => ({
      ...current,
      open: true,
      draft: filters,
      userSearch: filters.userLabel,
    }))
  }

  function closeFilterDialog() {
    setFilterDialog(current => ({
      ...current,
      open: false,
      userSearch: '',
    }))
  }

  async function applyFilters() {
    if (!filterDialog.draft.startDate || !filterDialog.draft.endDate) {
      setError('Start date and end date are required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const nextFilters = {
        ...filterDialog.draft,
      }
      setFilters(nextFilters)
      closeFilterDialog()
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Unable to apply filters.')
    } finally {
      setSaving(false)
    }
  }

  async function refreshLogs() {
    try {
      setSaving(true)
      setError('')
      await loadServerLogs(filters)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh logs.')
    } finally {
      setSaving(false)
    }
  }

  function resetFilters() {
    const defaults = {
      startDate: todayAsInputValue(),
      endDate: todayAsInputValue(),
      userId: '',
      userLabel: '',
    }
    setFilterDialog(current => ({ ...current, draft: defaults, userSearch: '' }))
  }

  const pageContent = loading ? (
    <div className="px-6 py-6">
      <div className="rounded-[28px] border bg-white px-6 py-10" style={{ borderColor: 'var(--sand)' }}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded-full bg-[var(--cream-dark)]" />
          <div className="h-4 w-2/3 rounded-full bg-[var(--cream-dark)]" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-[24px] bg-[var(--cream-dark)]" />
            ))}
          </div>
          <div className="h-80 rounded-[28px] bg-[var(--cream-dark)]" />
        </div>
      </div>
    </div>
  ) : (
    <div className="space-y-6 px-6 py-6">
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
              <ListFilter size={14} />
              System
            </div> */}
            <h1 className="mt-3 font-serif" style={{ fontSize: 30, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>
              Server Logs
            </h1>
           
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void openFilterDialog()}
              className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.16)', fontSize: 13 }}
            >
              <Filter size={16} />
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            <button
              onClick={() => void refreshLogs()}
              className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.14)', fontSize: 13 }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'User Groups', value: groupedRows.length, color: 'var(--maroon)' },
          { label: 'Log Entries', value: totalActions, color: '#1A7A6E' },
          { label: 'Selected User', value: selectedUser, color: '#8C6421' },
          { label: 'Latest Activity', value: latestActivity, color: '#4B5563' },
        ].map(card => (
          <div key={card.label} className="rounded-[28px] border bg-white px-5 py-4" style={{ borderColor: 'var(--sand)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {card.label}
            </div>
            <div className="mt-2 font-serif" style={{ fontSize: card.label === 'Selected User' || card.label === 'Latest Activity' ? 18 : 28, color: card.color, fontWeight: 700, lineHeight: 1.15 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--sand)' }}>
        <SectionHeader
          title="Server Usage"
          right={(
            <div className="rounded-full px-3 py-1.5 font-medium" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 11 }}>
              Live server activity
            </div>
          )}
        />

        {!hasAnyLogs ? (
          <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
            <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>
              Server Logs
            </div>
            <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {noDataMessage(Boolean(filters.userId || filters.startDate !== todayAsInputValue() || filters.endDate !== todayAsInputValue()))}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pagedRows.map(row => {
              const isExpanded = expandedRowId === row.id
              return (
                <div key={row.id} className="rounded-[28px] border bg-white" style={{ borderColor: 'var(--sand)' }}>
                  <button
                    onClick={() => setExpandedRowId(current => current === row.id ? '' : row.id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: '#F8F4EE', color: 'var(--maroon)' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronsUpDown size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif" style={{ fontSize: 20, color: 'var(--text-dark)', fontWeight: 700, lineHeight: 1.2 }}>
                          {row.userName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {row.ssoId ? <span>SSO: {row.ssoId}</span> : null}
                          {row.mobile ? <span>Mobile: {row.mobile}</span> : null}
                          <span>{row.logs.length} logs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusPillStyle(true) }}>
                        {row.logs.length} Events
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Latest: {formatLogTime(String(row.latestTime))}
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t px-4 py-4" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFFFFF 0%, #FCF7F0 100%)' }}>
                      <div className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: 'var(--sand)' }}>
                        <div className="grid grid-cols-12 gap-2 border-b px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em]" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>
                          <div className="col-span-4">Action</div>
                          <div className="col-span-3">Time</div>
                          <div className="col-span-2">SSO ID</div>
                          <div className="col-span-3">IP Address</div>
                        </div>
                        {row.logs.map(log => (
                          <div key={log.id} className="grid grid-cols-12 gap-2 border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'rgba(189,165,129,0.24)' }}>
                            <div className="col-span-4 text-sm" style={{ color: 'var(--text-dark)' }}>{log.action}</div>
                            <div className="col-span-3 text-sm" style={{ color: 'var(--text-muted)' }}>{formatLogTime(log.time)}</div>
                            <div className="col-span-2 text-sm" style={{ color: 'var(--text-muted)' }}>{log.ssoId || 'N/A'}</div>
                            <div className="col-span-3 text-sm" style={{ color: 'var(--text-muted)' }}>{log.ipAddress || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--sand)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-dark)' }}>{groupedRows.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, groupedRows.length)}</strong> of <strong style={{ color: 'var(--text-dark)' }}>{groupedRows.length}</strong> groups
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={String(pageSize)}
                  onChange={event => {
                    setPageSize(Number(event.target.value))
                    setPage(1)
                  }}
                  className="rounded-xl px-3 py-2 outline-none"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12 }}
                >
                  {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} / page</option>)}
                </select>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="rounded-xl px-3 py-2 font-medium" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-dark)' }}>
                    {page} / {totalPages}
                  </div>
                  <button
                    onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter">
          {pageContent}
        </main>
      </div>

      <Modal
        open={filterDialog.open}
        title="Filter Server Logs"
        // subtitle="Choose a date range and optionally narrow the logs to one user."
        onClose={closeFilterDialog}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Start Date</span>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={filterDialog.draft.startDate}
                    onChange={event => setFilterDialog(current => ({ ...current, draft: { ...current.draft, startDate: event.target.value } }))}
                    style={{ ...buttonStyle(), width: '100%', paddingLeft: 38, borderRadius: 16, paddingTop: 12, paddingBottom: 12 }}
                  />
                </div>
              </label>
              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>End Date</span>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    value={filterDialog.draft.endDate}
                    onChange={event => setFilterDialog(current => ({ ...current, draft: { ...current.draft, endDate: event.target.value } }))}
                    style={{ ...buttonStyle(), width: '100%', paddingLeft: 38, borderRadius: 16, paddingTop: 12, paddingBottom: 12 }}
                  />
                </div>
              </label>
            </div>

            <div className="rounded-[24px] border p-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>Selected User</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {filterDialog.draft.userLabel || 'All users'}
                  </div>
                </div>
                {filterDialog.draft.userId ? (
                  <button
                    onClick={() => setFilterDialog(current => ({ ...current, draft: { ...current.draft, userId: '', userLabel: '' } }))}
                    className="rounded-full px-3 py-1.5"
                    style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-muted)' }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={filterDialog.userSearch}
                onChange={event => setFilterDialog(current => ({ ...current, userSearch: event.target.value }))}
                placeholder="Search user"
                style={{ ...buttonStyle(), width: '100%', paddingLeft: 38, borderRadius: 16, paddingTop: 12, paddingBottom: 12 }}
              />
            </div>

            <div className="rounded-[24px] border bg-white p-3" style={{ borderColor: 'var(--sand)' }}>
              <button
                onClick={() => setFilterDialog(current => ({ ...current, draft: { ...current.draft, userId: '', userLabel: '' } }))}
                className="mb-3 w-full rounded-2xl px-4 py-3 text-left transition-all"
                style={{
                  background: !filterDialog.draft.userId ? 'rgba(200,146,42,0.10)' : '#F8F4EE',
                  border: '1px solid var(--sand)',
                  color: 'var(--text-dark)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#fff', color: 'var(--maroon)' }}>
                    <UserRound size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium" style={{ fontSize: 13 }}>All Users</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fetch logs for every user in the selected date range.</div>
                  </div>
                </div>
              </button>

              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {loadingUsers ? (
                  <div className="rounded-2xl px-4 py-6 text-center" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Loading users...
                  </div>
                ) : userOptions.length === 0 ? (
                  <div className="rounded-2xl px-4 py-6 text-center" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    No users found.
                  </div>
                ) : userOptions.map(option => {
                  const selected = filterDialog.draft.userId === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => setFilterDialog(current => ({
                        ...current,
                        draft: {
                          ...current.draft,
                          userId: option.id,
                          userLabel: option.label,
                        },
                      }))}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition-all"
                      style={{
                        borderColor: selected ? 'rgba(200,146,42,0.55)' : 'var(--sand)',
                        background: selected ? 'rgba(200,146,42,0.10)' : '#fff',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: '#F8F4EE', color: 'var(--maroon)' }}>
                          <UserRound size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium" style={{ fontSize: 13, color: 'var(--text-dark)' }}>{option.label}</div>
                          <div className="mt-1 flex flex-wrap gap-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {option.ssoId ? <span>SSO: {option.ssoId}</span> : null}
                            {option.mobile ? <span>Mobile: {option.mobile}</span> : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button onClick={resetFilters} className="rounded-xl px-5 py-2.5 font-medium" style={buttonStyle()}>
            Reset
          </button>
          <button onClick={closeFilterDialog} className="rounded-xl px-5 py-2.5 font-medium" style={buttonStyle()}>
            Cancel
          </button>
          <button
            onClick={() => void applyFilters()}
            disabled={saving}
            className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
          >
            {saving ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
