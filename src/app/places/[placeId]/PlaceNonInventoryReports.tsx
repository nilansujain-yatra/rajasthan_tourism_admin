'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, FileBarChart2, Filter, MapPin, X } from 'lucide-react'

type ReportId = 'mis' | 'entry-exit' | 'place-wise' | 'lsp' | 'head-wise' | 'day-wise' | 'month-wise'

type ReportConfig = {
  id: ReportId
  title: string
  description: string
  endpoint: string
  defaultParams: Record<string, string>
  filterType: 'mis' | 'basic' | 'day-wise' | 'month-wise'
  rowSource?: 'default' | 'lsp'
}

type FilterState = {
  startDate: string
  endDate: string
  selectedDate: string
  selectedMonth: string
  bookingType: string
  transactionStatus: string
  printCount: string
  ticketType: string
}

type ReportRow = Record<string, unknown>

const REPORTS: ReportConfig[] = [
  {
    id: 'mis',
    title: 'MIS Report',
    description: 'Place-wise booking report with booking mode, payment status and print count filters.',
    endpoint: '/api/non-inventory/reports/mis_V3',
    defaultParams: {
      ticketTypes: '',
      bookingType: '',
      divisionId: '',
      districtId: '',
      offSet: '0',
      size: '10',
      ticketType: '',
      transactionStatus: 'SUCCESS',
      departmentId: '',
      isFilter: 'false',
      printCount: 'ALL',
      searchKey: '',
    },
    filterType: 'mis',
  },
  {
    id: 'day-wise',
    title: 'Day Wise Report',
    description: 'Day-wise ticket type report for the selected place.',
    endpoint: '/api/non-inventory/reports/daywise',
    defaultParams: {
      divisionId: '',
      districtId: '',
      offSet: '0',
      size: '10',
      ticketType: 'NORMAL',
      departmentId: '',
      transactionStatus: '',
      bookingType: '',
      isFilter: 'false',
    },
    filterType: 'day-wise',
  },
  {
    id: 'month-wise',
    title: 'Month Wise Report',
    description: 'Month-wise ticket type report for the selected place.',
    endpoint: '/api/non-inventory/reports/monthwise',
    defaultParams: {
      divisionId: '',
      districtId: '',
      offSet: '0',
      size: '10',
      ticketType: 'NORMAL',
      departmentId: '',
      transactionStatus: '',
      bookingType: '',
      isFilter: 'false',
    },
    filterType: 'month-wise',
  },
  {
    id: 'entry-exit',
    title: 'Entry Exit Report',
    description: 'Entry and exit records for the selected place.',
    endpoint: '/api/non-inventory/reports/entry-exit',
    defaultParams: {
      divisionId: '',
      districtId: '',
      offSet: '0',
      size: '10',
      export: 'false',
      pagination: 'true',
      departmentId: '',
      bookingType: '',
      ticketType: 'NORMAL',
      isFilter: 'false',
    },
    filterType: 'basic',
  },
  {
    id: 'place-wise',
    title: 'Place Wise Report',
    description: 'Place-wise booking and transaction summary for the selected place.',
    endpoint: '/api/non-inventory/reports/place-wise',
    defaultParams: {
      divisionId: '',
      districtId: '',
      offSet: '0',
      size: '10',
      export: 'false',
      pagination: 'true',
      departmentId: '',
      ticketType: 'NORMAL',
      bookingType: '',
      isFilter: 'false',
      transactionStatus: '',
    },
    filterType: 'basic',
  },
  {
    id: 'lsp',
    title: 'LSP Report',
    description: 'Kiosk session and login activity for the selected place.',
    endpoint: '/api/non-inventory/reports/lsp',
    defaultParams: {
      districtId: '',
      offSet: '0',
      pagination: 'true',
      searchKey: '',
      size: '10',
      export: 'false',
      bookingType: '',
      isFilter: 'false',
    },
    filterType: 'basic',
    rowSource: 'lsp',
  },
  {
    id: 'head-wise',
    title: 'Head Wise Report',
    description: 'Head-level amount breakdown for the selected place.',
    endpoint: '/api/non-inventory/reports/head',
    defaultParams: {
      divisionId: '',
      districtId: '',
      offSet: '0',
      size: '10',
      ticketType: 'NORMAL',
      departmentId: '',
      bookingType: '',
      isFilter: 'false',
      transactionStatus: '',
    },
    filterType: 'basic',
  },
]

function todayInput() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function currentMonthInput() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function toDayStartMs(value: string) {
  return new Date(`${value}T00:00:00.000`).getTime()
}

function toDayEndMs(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime()
}

function toLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function toText(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'N/A'
  if (typeof value === 'string') return value
  if (typeof value === 'number') {
    if (value > 100000000000 && value < 9999999999999) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString('en-IN')
      }
    }
    return String(value)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map((item): string => toText(item)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth > 5) return null

  const record = value as Record<string, unknown>
  for (const key of ['result', 'data', 'content', 'rows', 'items', 'list']) {
    if (key in record) {
      const found = findFirstArray(record[key], depth + 1)
      if (found) return found
    }
  }

  for (const child of Object.values(record)) {
    const found = findFirstArray(child, depth + 1)
    if (found) return found
  }

  return null
}

function extractRows(payload: unknown, rowSource: ReportConfig['rowSource']) {
  if (rowSource === 'lsp') {
    const direct = (payload as { result?: { lspReportDtos?: unknown[] } })?.result?.lspReportDtos
    if (Array.isArray(direct)) {
      return direct.filter(item => item && typeof item === 'object') as ReportRow[]
    }
  }

  const list = findFirstArray(payload)
  if (!list) return [] as ReportRow[]
  return list.filter(item => item && typeof item === 'object') as ReportRow[]
}

function extractTotal(payload: unknown, fallback: number) {
  if (!payload || typeof payload !== 'object') return fallback
  const root = payload as Record<string, any>
  const total =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total ??
    root?.result?.meta?.totalRecords ??
    root?.meta?.totalRecords

  return typeof total === 'number' && Number.isFinite(total) ? total : fallback
}

function getDefaultFilters() {
  const today = todayInput()
  return {
    startDate: today,
    endDate: today,
    selectedDate: today,
    selectedMonth: currentMonthInput(),
    bookingType: 'ALL',
    transactionStatus: 'SUCCESS',
    printCount: 'ALL',
    ticketType: 'NORMAL',
  } satisfies FilterState
}

function getBasicDefaultFilters() {
  const today = todayInput()
  return {
    startDate: today,
    endDate: today,
    selectedDate: today,
    selectedMonth: currentMonthInput(),
    bookingType: 'ALL',
    transactionStatus: 'ALL',
    printCount: 'ALL',
    ticketType: 'NORMAL',
  } satisfies FilterState
}

function getMonthWiseRange(value: string) {
  const [yearPart, monthPart] = value.split('-')
  const year = Number(yearPart)
  const monthIndex = Number(monthPart) - 1

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    const today = todayInput()
    return {
      startDate: today,
      endDate: today,
    }
  }

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0)
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)

  const format = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return {
    startDate: format(start),
    endDate: format(end),
  }
}

function getColumns(rows: ReportRow[]) {
  const keys = new Set<string>()

  rows.slice(0, 10).forEach(row => {
    Object.entries(row).forEach(([key, value]) => {
      if (value === undefined || typeof value === 'function') return
      keys.add(key)
    })
  })

  return Array.from(keys)
}

function FilterModal({
  report,
  open,
  filters,
  setFilters,
  onApply,
  onReset,
  onClose,
}: {
  report: ReportConfig
  open: boolean
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <Filter size={18} />
            </div>
            <div>
              <div className="font-serif text-xl font-bold">Filter {report.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>Selected place stays fixed for this report.</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-5 md:grid-cols-2 xl:grid-cols-3">
          {report.filterType === 'month-wise' ? (
            <div className="space-y-2">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Select Month</label>
              <div className="relative">
                <input
                  type="month"
                  value={filters.selectedMonth}
                  onChange={event => setFilters(current => ({ ...current, selectedMonth: event.target.value }))}
                  className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                  style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                />
                <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ) : report.filterType === 'day-wise' ? (
            <>
              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ticket Type</label>
                <select
                  value={filters.ticketType}
                  onChange={event => setFilters(current => ({ ...current, ticketType: event.target.value }))}
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="COMPOSITE">Composite</option>
                </select>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Select Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.selectedDate}
                    onChange={event => setFilters(current => ({ ...current, selectedDate: event.target.value }))}
                    className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                    style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                  />
                  <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={event => setFilters(current => ({ ...current, startDate: event.target.value }))}
                    className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                    style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                  />
                  <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.endDate}
                    min={filters.startDate}
                    onChange={event => setFilters(current => ({ ...current, endDate: event.target.value }))}
                    className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                    style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                  />
                  <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </>
          )}

          {report.filterType === 'mis' ? (
            <>
              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Booking Type</label>
                <select
                  value={filters.bookingType}
                  onChange={event => setFilters(current => ({ ...current, bookingType: event.target.value }))}
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                >
                  <option value="ALL">All</option>
                  <option value="ONLINE">Online</option>
                  <option value="KIOSK">Kiosk</option>
                </select>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Payment Type</label>
                <select
                  value={filters.transactionStatus}
                  onChange={event => setFilters(current => ({ ...current, transactionStatus: event.target.value }))}
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                >
                  <option value="ALL">All</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Fail</option>
                </select>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Print Count</label>
                <select
                  value={filters.printCount}
                  onChange={event => setFilters(current => ({ ...current, printCount: event.target.value }))}
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ fontSize: 12, border: '1px solid var(--sand)' }}
                >
                  <option value="ALL">All</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                </select>
              </div>
            </>
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

function SingleReportView({
  report,
  placeId,
  placeName,
}: {
  report: ReportConfig
  placeId: string
  placeName?: string
}) {
  const misDefaults = useMemo(() => getDefaultFilters(), [])
  const basicDefaults = useMemo(() => getBasicDefaultFilters(), [])
  const defaults = report.filterType === 'mis' ? misDefaults : basicDefaults

  const [draftFilters, setDraftFilters] = useState<FilterState>(defaults)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaults)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)

  useEffect(() => {
    setDraftFilters(defaults)
    setAppliedFilters(defaults)
    setPage(1)
  }, [defaults, report.id, placeId])

  useEffect(() => {
    let active = true

    const loadRows = async () => {
      setLoading(true)
      setError('')

      const isDefaultRange =
        appliedFilters.startDate === defaults.startDate &&
        appliedFilters.endDate === defaults.endDate
      const isDefaultSelectedDate = appliedFilters.selectedDate === defaults.selectedDate
      const isDefaultSelectedMonth = appliedFilters.selectedMonth === defaults.selectedMonth
      const isDefaultBooking = appliedFilters.bookingType === defaults.bookingType
      const isDefaultStatus = appliedFilters.transactionStatus === defaults.transactionStatus
      const isDefaultPrint = appliedFilters.printCount === defaults.printCount
      const isDefaultTicketType = appliedFilters.ticketType === defaults.ticketType
      const isFilter = !(isDefaultRange && isDefaultSelectedDate && isDefaultSelectedMonth && isDefaultBooking && isDefaultStatus && isDefaultPrint && isDefaultTicketType)

      try {
        const monthRange = getMonthWiseRange(appliedFilters.selectedMonth)
        const effectiveStartDate =
          report.filterType === 'day-wise'
            ? appliedFilters.selectedDate
            : report.filterType === 'month-wise'
              ? (appliedFilters.selectedMonth === defaults.selectedMonth ? defaults.startDate : monthRange.startDate)
              : appliedFilters.startDate

        const effectiveEndDate =
          report.filterType === 'day-wise'
            ? appliedFilters.selectedDate
            : report.filterType === 'month-wise'
              ? (appliedFilters.selectedMonth === defaults.selectedMonth ? defaults.endDate : monthRange.endDate)
              : appliedFilters.endDate

        const params = new URLSearchParams({
          ...report.defaultParams,
          placeId,
          startDay: String(toDayStartMs(effectiveStartDate)),
          endDay: String(toDayEndMs(effectiveEndDate)),
          offSet: String((page - 1) * pageSize),
          size: String(pageSize),
          isFilter: isFilter ? 'true' : report.defaultParams.isFilter ?? 'false',
        })

        if (report.filterType === 'mis') {
          params.set('bookingType', appliedFilters.bookingType === 'ALL' ? '' : appliedFilters.bookingType)
          params.set('transactionStatus', appliedFilters.transactionStatus === 'ALL' ? '' : appliedFilters.transactionStatus)
          params.set('printCount', appliedFilters.printCount)
        }

        if (report.filterType === 'day-wise' || report.filterType === 'month-wise') {
          params.set('ticketType', appliedFilters.ticketType)
        }

        const response = await fetch(`${report.endpoint}?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`${report.title} request failed with ${response.status}`)
        }

        const payload = await response.json()
        if (!active) return

        const nextRows = extractRows(payload, report.rowSource)
        setRows(nextRows)
        setTotalRecords(extractTotal(payload, nextRows.length))
      } catch (loadError) {
        if (!active) return
        setRows([])
        setTotalRecords(0)
        setError(loadError instanceof Error ? loadError.message : `Unable to load ${report.title}.`)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRows()

    return () => {
      active = false
    }
  }, [appliedFilters, defaults, page, pageSize, placeId, report])

  const columns = useMemo(() => getColumns(rows), [rows])
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / pageSize))
  const firstResult = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1
  const lastResult = totalRecords === 0 ? 0 : Math.min(page * pageSize, totalRecords)
  const activeFilterCount = [
    report.filterType === 'day-wise'
      ? (appliedFilters.selectedDate !== defaults.selectedDate ? appliedFilters.selectedDate : '')
      : report.filterType === 'month-wise'
        ? (appliedFilters.selectedMonth !== defaults.selectedMonth ? appliedFilters.selectedMonth : '')
        : (appliedFilters.startDate !== defaults.startDate ? appliedFilters.startDate : ''),
    report.filterType === 'basic' || report.filterType === 'mis'
      ? (appliedFilters.endDate !== defaults.endDate ? appliedFilters.endDate : '')
      : '',
    report.filterType === 'day-wise'
      ? (appliedFilters.ticketType !== defaults.ticketType ? appliedFilters.ticketType : '')
      : '',
    report.filterType === 'mis' && appliedFilters.bookingType !== defaults.bookingType ? appliedFilters.bookingType : '',
    report.filterType === 'mis' && appliedFilters.transactionStatus !== defaults.transactionStatus ? appliedFilters.transactionStatus : '',
    report.filterType === 'mis' && appliedFilters.printCount !== defaults.printCount ? appliedFilters.printCount : '',
  ].filter(Boolean).length

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border bg-white" style={{ borderColor: 'var(--sand)' }}>
        <div className="flex items-center justify-between gap-4 border-b px-6 py-4" style={{ borderColor: 'var(--sand)' }}>
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>{report.title}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{report.description}</p>
          </div>

          <button
            onClick={() => {
              setDraftFilters(appliedFilters)
              setIsFilterOpen(true)
            }}
            className="relative flex items-center gap-2 rounded-xl px-4 py-2"
            style={{
              fontSize: 12,
              background: activeFilterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
              color: activeFilterCount > 0 ? '#fff' : 'var(--text-mid)',
              border: `1px solid ${activeFilterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
            }}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white" style={{ fontSize: 9, background: 'var(--gold)' }}>
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ fontSize: 11, background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontWeight: 600 }}>
            <MapPin size={12} />
            {placeName || placeId}
          </span>
          {report.filterType === 'month-wise' ? (
            <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
              Month: {new Date(`${appliedFilters.selectedMonth}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          ) : report.filterType === 'day-wise' ? (
            <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
              Date: {new Date(`${appliedFilters.selectedDate}T00:00:00`).toLocaleDateString('en-IN')}
            </span>
          ) : (
            <>
              <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
                Start: {new Date(`${appliedFilters.startDate}T00:00:00`).toLocaleDateString('en-IN')}
              </span>
              <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
                End: {new Date(`${appliedFilters.endDate}T00:00:00`).toLocaleDateString('en-IN')}
              </span>
            </>
          )}
          {report.filterType === 'day-wise' ? (
            <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
              Ticket Type: {appliedFilters.ticketType}
            </span>
          ) : null}
          {report.filterType === 'mis' ? (
            <>
              <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
                Booking Type: {appliedFilters.bookingType}
              </span>
              <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
                Payment: {appliedFilters.transactionStatus}
              </span>
              <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: '#fff', color: 'var(--text-mid)', border: '1px solid var(--sand)' }}>
                Print Count: {appliedFilters.printCount}
              </span>
            </>
          ) : null}
        </div>

        <div className="grid gap-3 px-6 py-4 md:grid-cols-3" style={{ background: 'var(--cream)' }}>
          <div className="rounded-xl border px-4 py-3" style={{ background: '#fff', borderColor: 'var(--sand)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Rows Loaded</div>
            <div className="font-serif text-2xl font-bold" style={{ color: 'var(--maroon)', marginTop: 4 }}>{rows.length.toLocaleString('en-IN')}</div>
          </div>
          <div className="rounded-xl border px-4 py-3" style={{ background: '#fff', borderColor: 'var(--sand)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Results</div>
            <div className="font-serif text-2xl font-bold" style={{ color: 'var(--maroon)', marginTop: 4 }}>{totalRecords.toLocaleString('en-IN')}</div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Fixed Place</div>
            <div className="font-serif text-2xl font-bold" style={{ color: '#fff', marginTop: 4 }}>{placeName || 'Selected Place'}</div>
          </div>
        </div>

        <div className="overflow-x-auto px-6 pb-6 pt-4">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(900, columns.length * 180) }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                <th style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'center', color: 'rgba(255,255,255,0.85)', background: 'var(--maroon)', width: 56 }}>
                  Sr.
                </th>
                {columns.map(column => (
                  <th
                    key={column}
                    style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left', color: 'var(--text-muted)', borderRight: '1px solid var(--sand)' }}
                  >
                    {toLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={Math.max(columns.length + 1, 2)} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading {report.title.toLowerCase()}...
                  </td>
                </tr>
              ) : null}
              {!loading && error ? (
                <tr>
                  <td colSpan={Math.max(columns.length + 1, 2)} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>
                    {error}
                  </td>
                </tr>
              ) : null}
              {!loading && !error && rows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(columns.length + 1, 2)} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : null}
              {!loading && !error && rows.map((row, index) => (
                <tr key={`${report.id}-${index}`} style={{ borderBottom: '1px solid var(--cream-dark)', background: index % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'center', fontWeight: 700, color: 'var(--maroon)' }}>
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  {columns.map(column => (
                    <td key={`${report.id}-${index}-${column}`} style={{ padding: '9px 12px', fontSize: 11, color: 'var(--text-dark)', verticalAlign: 'top' }}>
                      {toText(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Display Data:</span>
            <div className="relative">
              <select
                value={String(pageSize)}
                onChange={event => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
              >
                {[10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
              </select>
              <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(current => Math.max(1, current - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg px-2 py-1 disabled:opacity-40"
              style={{ color: 'var(--text-mid)' }}
            >
              <ChevronLeft size={12} />
              <span style={{ fontSize: 11 }}>Previous</span>
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 6px' }}>{page} / {totalPages}</span>
            <button
              onClick={() => setPage(current => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-lg px-2 py-1 disabled:opacity-40"
              style={{ color: 'var(--text-mid)' }}
            >
              <span style={{ fontSize: 11 }}>Next</span>
              <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Result: <strong style={{ color: 'var(--text-dark)' }}>{totalRecords === 0 ? 0 : `${firstResult}-${lastResult}`}</strong> of <strong style={{ color: 'var(--maroon)' }}>{totalRecords}</strong>
          </div>
        </div>
      </div>

      <FilterModal
        report={report}
        open={isFilterOpen}
        filters={draftFilters}
        setFilters={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
          setIsFilterOpen(false)
        }}
        onReset={() => {
          setDraftFilters(defaults)
        }}
        onClose={() => {
          setDraftFilters(appliedFilters)
          setIsFilterOpen(false)
        }}
      />
    </>
  )
}

export default function PlaceNonInventoryReports({
  placeId,
  placeName,
}: {
  placeId: string
  placeName?: string
}) {
  const [activeReport, setActiveReport] = useState<ReportId>('mis')
  const [isOpen, setIsOpen] = useState(false)

  const currentReport = useMemo(
    () => REPORTS.find(report => report.id === activeReport) ?? REPORTS[0],
    [activeReport],
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative">
        <button
          onClick={() => setIsOpen(current => !current)}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-[24px] border bg-white text-left"
          style={{ borderColor: 'var(--sand)' }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--cream)', color: 'var(--maroon)' }}>
              <FileBarChart2 size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Report Name</div>
              <div className="mt-1 text-sm font-bold" style={{ color: 'var(--text-dark)' }}>{currentReport.title}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentReport.description}</div>
            </div>
          </div>
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {isOpen ? (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <div
              className="absolute top-full left-0 right-0 z-30 mt-3 max-h-[420px] overflow-y-auto rounded-[24px] border bg-white shadow-2xl"
              style={{ borderColor: 'var(--sand)' }}
            >
              {REPORTS.map(report => (
                <button
                  key={report.id}
                  onClick={() => {
                    setActiveReport(report.id)
                    setIsOpen(false)
                  }}
                  className="w-full border-b px-5 py-4 text-left transition hover:bg-[var(--cream)]"
                  style={{
                    borderColor: 'var(--sand)',
                    background: activeReport === report.id ? 'var(--cream)' : '#fff',
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: activeReport === report.id ? 'var(--maroon)' : 'var(--text-dark)' }}>
                    {report.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{report.description}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <SingleReportView report={currentReport} placeId={placeId} placeName={placeName} />
    </div>
  )
}
