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
  Users,
  X,
} from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { authFetch } from '@/lib/api/authFetch'

type LookupItem = {
  id: string
  name: string
  extra?: string
}

type FailedTicketRow = {
  id: string
  bookingId: string
  requestId: string
  bookingDate: string
  visitDate: string
  placeName: string
  amount: string
  userDetails: Record<string, unknown>
  transactionDetails: Record<string, unknown>
  helpdeskDetails: Record<string, unknown>
  raw: Record<string, unknown>
}

type FilterState = {
  startDate: string
  endDate: string
  status: string
  departmentIds: string[]
  placeIds: string[]
}

type FilterDialogState = {
  open: boolean
  draft: FilterState
  departmentSearch: string
  placeSearch: string
}

type DetailDialogState = {
  open: boolean
  title: string
  row: Record<string, unknown> | null
}

type RemarkDialogState = {
  open: boolean
  row: FailedTicketRow | null
  status: string
  issueType: string
  remark: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const REMARK_STATUS_OPTIONS = [
  { value: 'CONTACT_VIA_PHONE', label: 'Contact Via Phone' },
  { value: 'CONTACT_VIA_EMAIL', label: 'Contact Via Email' },
  { value: 'NOT_ABLE_TO_CONTACT', label: 'Not able to contact' },
  { value: 'NO_RESPONSE_FROM_USER', label: 'No response from user' },
  { value: 'OTHER', label: 'Other' },
]
const ISSUE_TYPE_OPTIONS = [
  { value: 'USER_NOT_INTERESTED', label: 'User not interested' },
  { value: 'PAYMENT_FAILED', label: 'Payment failed' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical issue' },
  { value: 'OTHER', label: 'Other' },
]

function getRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 6) return null

  const obj = value as Record<string, unknown>
  for (const key of ['misReports', 'result', 'data', 'content', 'list', 'rows', 'items']) {
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
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return fallback
}

function todayAsInputValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inputDateToEpoch(dateValue: string, endOfDay = false) {
  if (!dateValue) return ''
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  return String(date.getTime())
}

function formatDate(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = typeof value === 'number' ? value : Number(value)
  const date = !Number.isNaN(numeric) && numeric > 0 ? new Date(numeric) : new Date(String(value))
  if (Number.isNaN(date.getTime())) return toText(value, '-')
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatMoney(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return '-'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(numeric)
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

function mapLookupItems(payload: unknown): LookupItem[] {
  const list = findFirstArray(payload) ?? []
  const result: LookupItem[] = []

  list.forEach(item => {
    const row = getRecord(item)
    if (!row) return
    const id = toText(getValueFromKeys(row, ['id', 'departmentId', 'placeId', '_id', 'value']))
    const name = toText(getValueFromKeys(row, ['name', 'departmentName', 'placeName', 'label', 'text']), 'Unnamed')
    if (!id) return
    result.push({
      id,
      name,
      extra: toText(getValueFromKeys(row, ['code', 'departmentCode', 'placeCode', 'description']), ''),
    })
  })

  return result
}

function mapFailedTicketRows(payload: unknown): { rows: FailedTicketRow[]; totalRecords: number } {
  const root = getRecord(payload)
  const result = getRecord(root?.result)
  const list = Array.isArray(result?.misReports) ? result.misReports : findFirstArray(result) ?? findFirstArray(payload) ?? []

  const rows = list
    .map((item, index) => {
      const row = getRecord(item)
      if (!row) return null

      const bookingId = toText(getValueFromKeys(row, ['bookingId', 'bookingID', 'bookingid', 'id']), '-')
      const requestId = toText(getValueFromKeys(row, ['requestId', 'requestID', 'requestid']), bookingId)
      const bookingDate = formatDate(getValueFromKeys(row, ['bookingDate', 'bookedDate', 'date']))
      const visitDate = formatDate(getValueFromKeys(row, ['visitDate', 'visitdate', 'checkInDate', 'checkinDate']))
      const placeName = toText(getValueFromKeys(row, ['placeName', 'place', 'siteName']), '-')
      const amount = formatMoney(getValueFromKeys(row, ['totalAmount', 'amount', 'fare', 'price']))
      return {
        id: toText(getValueFromKeys(row, ['id', 'bookingId', 'requestId', '_id']), `${index + 1}`),
        bookingId,
        requestId,
        bookingDate,
        visitDate,
        placeName,
        amount,
        userDetails: getRecord(getValueFromKeys(row, ['userDetails', 'userDto', 'user', 'customerDetails'])) ?? row,
        transactionDetails: getRecord(getValueFromKeys(row, ['transactionDetails', 'transactionDto', 'paymentDetails', 'payment'])) ?? row,
        helpdeskDetails: getRecord(getValueFromKeys(row, ['helpdeskDetails', 'helpDeskDetails', 'helpdesk', 'reply'])) ?? row,
        raw: row,
      }
    })
    .filter((item): item is FailedTicketRow => Boolean(item))

  const totalRecords = typeof result?.totalRecords === 'number' ? result.totalRecords : rows.length
  return { rows, totalRecords }
}

function getOptionLabel(item: LookupItem) {
  return item.extra ? `${item.name} • ${item.extra}` : item.name
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages])
  for (let offset = -1; offset <= 1; offset += 1) {
    const candidate = page + offset
    if (candidate >= 1 && candidate <= totalPages) pages.add(candidate)
  }
  return Array.from(pages).sort((left, right) => left - right)
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

function Dialog({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'max-w-4xl',
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-6" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>{title}</h3>
            {subtitle ? <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2" style={{ background: '#F8F4EE', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function DetailsTable({ row }: { row: Record<string, unknown> | null }) {
  if (!row) {
    return <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>No details available.</div>
  }

  const entries = Object.entries(row).filter(([, value]) => value !== undefined && value !== null && value !== '')

  if (entries.length === 0) {
    return <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>No details available.</div>
  }

  return (
    <div className="overflow-hidden rounded-[22px] border" style={{ borderColor: 'var(--sand)' }}>
      <table className="min-w-full">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-t first:border-t-0" style={{ borderColor: 'var(--cream-dark)' }}>
              <td className="w-56 px-4 py-3 text-sm font-medium capitalize" style={{ background: 'var(--cream)', color: 'var(--text-mid)' }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-dark)' }}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FailedTicketReportPage() {
  const [loading, setLoading] = useState(true)
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<FailedTicketRow[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [departments, setDepartments] = useState<LookupItem[]>([])
  const [places, setPlaces] = useState<LookupItem[]>([])
  const [filterDialog, setFilterDialog] = useState<FilterDialogState>({
    open: false,
    draft: {
      startDate: todayAsInputValue(),
      endDate: todayAsInputValue(),
      status: 'YES',
      departmentIds: [],
      placeIds: [],
    },
    departmentSearch: '',
    placeSearch: '',
  })
  const [filters, setFilters] = useState<FilterState>({
    startDate: todayAsInputValue(),
    endDate: todayAsInputValue(),
    status: 'YES',
    departmentIds: [],
    placeIds: [],
  })
  const [detailDialog, setDetailDialog] = useState<DetailDialogState>({ open: false, title: '', row: null })
  const [remarkDialog, setRemarkDialog] = useState<RemarkDialogState>({ open: false, row: null, status: '', issueType: '', remark: '' })
  const [paymentDialog, setPaymentDialog] = useState<DetailDialogState>({ open: false, title: '', row: null })
  const [activePaymentRow, setActivePaymentRow] = useState<FailedTicketRow | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<Record<string, unknown> | null>(null)
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(false)

  async function fetchJson<T = unknown>(url: string, fallback: string, init?: RequestInit) {
    const response = await authFetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(extractMessage(payload, fallback))
    return payload as T
  }

  async function loadReport(activeFilters: FilterState) {
    const query = new URLSearchParams()
    query.set('startDay', inputDateToEpoch(activeFilters.startDate))
    query.set('endDay', inputDateToEpoch(activeFilters.endDate, true))
    query.set('placeId', activeFilters.placeIds.join(','))
    query.set('failReply', activeFilters.status)
    query.set('offSet', String(Math.max(0, (page - 1) * pageSize)))
    query.set('size', String(pageSize))
    query.set('pagination', 'true')
    const payload = await fetchJson(`/failTicket/report?${query.toString()}`, 'Unable to fetch failed ticket report.')
    const extracted = mapFailedTicketRows(payload)
    setRows(extracted.rows)
    setTotalRecords(extracted.totalRecords)
  }

  async function loadDepartments(searchKey = '') {
    const payload = await fetchJson(`/role/filter/department?searchKey=${encodeURIComponent(searchKey)}`, 'Unable to fetch departments.')
    setDepartments(mapLookupItems(payload))
  }

  async function loadPlaces(searchKey = '', departmentIds = filterDialog.draft.departmentIds) {
    const params = new URLSearchParams()
    params.set('searchKey', searchKey)
    params.set('departmentId', departmentIds.join(','))
    const payload = await fetchJson(`/place/placeFilters?${params.toString()}`, 'Unable to fetch places.')
    setPlaces(mapLookupItems(payload))
  }

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        setLoading(true)
        setError('')
        await loadReport(filters)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch failed ticket report.')
        setRows([])
        setTotalRecords(0)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [filters, page, pageSize])

  useEffect(() => {
    if (!filterDialog.open) return
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingLookups(true)
        await Promise.all([
          loadDepartments(filterDialog.departmentSearch),
          loadPlaces(filterDialog.placeSearch, filterDialog.draft.departmentIds),
        ])
      } catch {
        setDepartments([])
        setPlaces([])
      } finally {
        setLoadingLookups(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [filterDialog.open, filterDialog.departmentSearch, filterDialog.placeSearch, filterDialog.draft.departmentIds])

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const visiblePageNumbers = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])
  const activeFilterCount = [
    filters.status !== 'YES' ? filters.status : '',
    filters.departmentIds.length,
    filters.placeIds.length,
    filters.startDate !== todayAsInputValue() ? filters.startDate : '',
    filters.endDate !== todayAsInputValue() ? filters.endDate : '',
  ].filter(Boolean).length

  function openFilterDialog() {
    setFilterDialog({
      open: true,
      draft: { ...filters },
      departmentSearch: '',
      placeSearch: '',
    })
  }

  function closeFilterDialog() {
    setFilterDialog(current => ({ ...current, open: false, departmentSearch: '', placeSearch: '' }))
  }

  function toggleDraftSelection(key: 'departmentIds' | 'placeIds', id: string) {
    setFilterDialog(current => {
      const values = current.draft[key]
      const nextValues = values.includes(id) ? values.filter(item => item !== id) : [...values, id]
      return { ...current, draft: { ...current.draft, [key]: nextValues } }
    })
  }

  function selectAllDraftSelection(key: 'departmentIds' | 'placeIds', items: LookupItem[]) {
    setFilterDialog(current => {
      const selected = current.draft[key]
      const allSelected = items.length > 0 && items.every(item => selected.includes(item.id))
      return {
        ...current,
        draft: {
          ...current.draft,
          [key]: allSelected ? [] : items.map(item => item.id),
        },
      }
    })
  }

  function applyFilters() {
    if (!filterDialog.draft.startDate || !filterDialog.draft.endDate) {
      setError('Start date and end date are required.')
      return
    }
    setSaving(true)
    setError('')
    setPage(1)
    setFilters({ ...filterDialog.draft })
    closeFilterDialog()
    setSaving(false)
  }

  function openDetailDialog(title: string, row: Record<string, unknown> | null) {
    setDetailDialog({ open: true, title, row })
  }

  async function openPaymentDialog(row: FailedTicketRow) {
    setActivePaymentRow(row)
    setPaymentDialog({ open: true, title: `Transaction Details — ${row.bookingId}`, row: row.transactionDetails })
    try {
      setLoadingPaymentStatus(true)
      const payload = await fetchJson(`/booking/ticketPaymentStatus?bookingId=${encodeURIComponent(row.bookingId)}`, 'Unable to fetch ticket payment status.', {
        method: 'POST',
      })
      const payloadRecord = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
      setPaymentStatus(getRecord(payloadRecord?.result) ?? getRecord(payload) ?? null)
    } catch (loadError) {
      setPaymentStatus({ message: loadError instanceof Error ? loadError.message : 'Unable to fetch ticket payment status.' })
    } finally {
      setLoadingPaymentStatus(false)
    }
  }

  function openRemarkDialog(row: FailedTicketRow) {
    setRemarkDialog({
      open: true,
      row,
      status: '',
      issueType: '',
      remark: '',
    })
  }

  async function submitRemark() {
    if (!remarkDialog.row) return
    if (!remarkDialog.status || !remarkDialog.issueType || !remarkDialog.remark.trim()) {
      setError('Status, issue type, and remark are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      await fetchJson('/failTicket/addRemark', 'Unable to submit remark.', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: remarkDialog.row.bookingId,
          remark: remarkDialog.remark,
          status: remarkDialog.status,
          issueType: remarkDialog.issueType,
        }),
      })
      setRemarkDialog({ open: false, row: null, status: '', issueType: '', remark: '' })
      await loadReport(filters)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit remark.')
    } finally {
      setSaving(false)
    }
  }

  const latestAmount = rows[0]?.amount ?? '-'
  const latestBooking = rows[0]?.bookingId ?? '-'

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">
          <div className="overflow-hidden rounded-[30px] border" style={{ borderColor: 'rgba(200,146,42,0.22)', background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 52%, #C8922A 100%)', boxShadow: '0 18px 42px rgba(107,18,18,0.18)' }}>
            <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
              <div className="max-w-3xl">
                
                <h1 className="mt-3 font-serif" style={{ fontSize: 30, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>
                  Failed Ticket Report
                </h1>
               
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={openFilterDialog} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <Filter size={16} />
                  Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </button>
                <button type="button" onClick={() => void loadReport(filters)} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Records', value: totalRecords.toLocaleString(), color: 'var(--maroon)' },
              { label: 'Visible Rows', value: rows.length.toLocaleString(), color: '#1A7A6E' },
              { label: 'Latest Booking', value: latestBooking, color: '#C8922A' },
              { label: 'Latest Amount', value: latestAmount, color: '#5B4A2D' },
            ].map(card => (
              <div key={card.label} className="rounded-[24px] border bg-white px-5 py-4" style={{ borderColor: 'var(--sand)', boxShadow: '0 12px 28px rgba(107,18,18,0.05)' }}>
                <div className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
                <div className="mt-2 truncate font-serif text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {error ? (
            <div className="rounded-[22px] border px-4 py-3 text-sm" style={{ borderColor: 'rgba(229,62,62,0.22)', background: 'rgba(229,62,62,0.05)', color: '#B42318' }}>
              {error}
            </div>
          ) : null}

          <SectionHeader
            title="Failed Tickets"
            right={<div className="flex items-center gap-2 rounded-full px-3 py-1 text-sm" style={{ background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}><Users size={14} /> {rows.length} loaded</div>}
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
                <h3 className="mt-4 font-serif text-2xl font-semibold" style={{ color: 'var(--text-dark)' }}>No Records Found</h3>
                <p className="mt-2 max-w-md text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                  Try another date range, status, department, or place.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                      {['Sr No.', 'Booking Id', 'Request Id', 'Booking Date', 'Visit Date', 'Place Name', 'Amount (INR)', 'User Details', 'Transaction Details', 'HelpDesk Details', 'Action'].map(header => (
                        <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.id} className="border-t transition hover:bg-[var(--cream)]" style={{ borderColor: 'var(--cream-dark)' }}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{(page - 1) * pageSize + index + 1}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{row.bookingId}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{row.requestId}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{row.bookingDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{row.visitDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-dark)' }}>{row.placeName}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: 'var(--text-dark)' }}>{row.amount}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button type="button" onClick={() => openDetailDialog('User Details', row.userDetails)} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}>
                            <Users size={14} />
                            View
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button type="button" onClick={() => void openPaymentDialog(row)} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: 'rgba(107,18,18,0.08)', color: 'var(--maroon)' }}>
                            <FileText size={14} />
                            View
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button type="button" onClick={() => openDetailDialog('HelpDesk Details', row.helpdeskDetails)} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: 'rgba(200,146,42,0.12)', color: '#8A6120' }}>
                            <FileText size={14} />
                            View
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <button type="button" onClick={() => openRemarkDialog(row)} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}>
                            Submit Remark
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
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRecords)} of {totalRecords} records
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }} className="rounded-full border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--sand)', background: '#fff', color: 'var(--text-mid)' }}>
                  {PAGE_SIZE_OPTIONS.map(option => <option key={option} value={option}>{option} / page</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <PageButton onClick={() => setPage(1)} disabled={page === 1} label="«" />
                  <PageButton onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1} icon={<ChevronLeft size={15} />} />
                  {visiblePageNumbers.map(currentPage => <PageButton key={currentPage} onClick={() => setPage(currentPage)} active={currentPage === page} label={String(currentPage)} />)}
                  <PageButton onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page === totalPages} icon={<ChevronRight size={15} />} />
                  <PageButton onClick={() => setPage(totalPages)} disabled={page === totalPages} label="»" />
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      <Dialog open={filterDialog.open} title="Filter Failed Tickets" subtitle="Pick a date range, status, departments, and places." onClose={closeFilterDialog} maxWidth="max-w-5xl">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>Start Date</span>
            <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
              <input type="date" value={filterDialog.draft.startDate} onChange={event => setFilterDialog(current => ({ ...current, draft: { ...current.draft, startDate: event.target.value } }))} className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-dark)' }} />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>End Date</span>
            <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
              <input type="date" value={filterDialog.draft.endDate} onChange={event => setFilterDialog(current => ({ ...current, draft: { ...current.draft, endDate: event.target.value } }))} className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-dark)' }} />
            </div>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>Select Status</span>
            <select value={filterDialog.draft.status} onChange={event => setFilterDialog(current => ({ ...current, draft: { ...current.draft, status: event.target.value } }))} className="w-full rounded-2xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium" style={{ color: 'var(--text-mid)' }}>Departments</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Multi-select with select all</div>
              </div>
              <button type="button" className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }} onClick={() => selectAllDraftSelection('departmentIds', departments)}>Select All</button>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input value={filterDialog.departmentSearch} onChange={event => setFilterDialog(current => ({ ...current, departmentSearch: event.target.value }))} placeholder="Search department" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="mt-3 max-h-64 overflow-auto space-y-2">
              {loadingLookups ? <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div> : departments.length === 0 ? <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No departments found.</div> : departments.map(item => {
                const checked = filterDialog.draft.departmentIds.includes(item.id)
                return (
                  <button key={item.id} type="button" onClick={() => toggleDraftSelection('departmentIds', item.id)} className="flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition hover:bg-[var(--cream)]" style={{ borderColor: checked ? 'rgba(107,18,18,0.22)' : 'var(--cream-dark)', background: checked ? 'rgba(107,18,18,0.05)' : '#fff' }}>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{getOptionLabel(item)}</div>
                    </div>
                    <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ background: checked ? 'rgba(26,122,110,0.12)' : 'var(--cream-dark)', color: checked ? '#1A7A6E' : 'var(--text-muted)' }}>{checked ? 'Selected' : 'Add'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium" style={{ color: 'var(--text-mid)' }}>Places</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Multi-select with select all</div>
              </div>
              <button type="button" className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }} onClick={() => selectAllDraftSelection('placeIds', places)}>Select All</button>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input value={filterDialog.placeSearch} onChange={event => setFilterDialog(current => ({ ...current, placeSearch: event.target.value }))} placeholder="Search place" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="mt-3 max-h-64 overflow-auto space-y-2">
              {loadingLookups ? <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div> : places.length === 0 ? <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No places found.</div> : places.map(item => {
                const checked = filterDialog.draft.placeIds.includes(item.id)
                return (
                  <button key={item.id} type="button" onClick={() => toggleDraftSelection('placeIds', item.id)} className="flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition hover:bg-[var(--cream)]" style={{ borderColor: checked ? 'rgba(107,18,18,0.22)' : 'var(--cream-dark)', background: checked ? 'rgba(107,18,18,0.05)' : '#fff' }}>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{getOptionLabel(item)}</div>
                    </div>
                    <span className="rounded-full px-2 py-1 text-xs font-medium" style={{ background: checked ? 'rgba(26,122,110,0.12)' : 'var(--cream-dark)', color: checked ? '#1A7A6E' : 'var(--text-muted)' }}>{checked ? 'Selected' : 'Add'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setFilterDialog(current => ({ ...current, draft: { startDate: todayAsInputValue(), endDate: todayAsInputValue(), status: 'YES', departmentIds: [], placeIds: [] } }))} className="rounded-full px-4 py-2.5 text-sm font-medium" style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}>
            Reset
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={closeFilterDialog} className="rounded-full px-4 py-2.5 text-sm font-medium" style={{ background: '#F7F4EF', color: 'var(--text-mid)' }}>Cancel</button>
            <button type="button" onClick={applyFilters} disabled={saving} className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ background: 'var(--maroon)' }}>
              {saving ? 'Applying...' : 'Apply Filter'}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={detailDialog.open} title={detailDialog.title} onClose={() => setDetailDialog({ open: false, title: '', row: null })}>
        <DetailsTable row={detailDialog.row} />
      </Dialog>

      <Dialog open={paymentDialog.open} title={paymentDialog.title} subtitle={loadingPaymentStatus ? 'Loading payment status...' : activePaymentRow ? `Booking Id: ${activePaymentRow.bookingId}` : undefined} onClose={() => { setPaymentDialog({ open: false, title: '', row: null }); setPaymentStatus(null); setActivePaymentRow(null) }}>
        <div className="space-y-4">
          <DetailsTable row={paymentDialog.row} />
          <div className="rounded-[22px] border p-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
            <div className="font-medium" style={{ color: 'var(--text-mid)' }}>Payment Status</div>
            <div className="mt-2 text-sm" style={{ color: 'var(--text-dark)' }}>{paymentStatus ? JSON.stringify(paymentStatus, null, 2) : 'No status available.'}</div>
          </div>
        </div>
      </Dialog>

      <Dialog open={remarkDialog.open} title="Submit Remark" subtitle={remarkDialog.row ? `Booking Id: ${remarkDialog.row.bookingId}` : undefined} onClose={() => setRemarkDialog({ open: false, row: null, status: '', issueType: '', remark: '' })} maxWidth="max-w-2xl">
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>Select Status</span>
            <select value={remarkDialog.status} onChange={event => setRemarkDialog(current => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <option value="">Select Status</option>
              {REMARK_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>Select Issue Type</span>
            <select value={remarkDialog.issueType} onChange={event => setRemarkDialog(current => ({ ...current, issueType: event.target.value }))} className="w-full rounded-2xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <option value="">Select Issue Type</option>
              {ISSUE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>Remark</span>
            <textarea value={remarkDialog.remark} onChange={event => setRemarkDialog(current => ({ ...current, remark: event.target.value }))} rows={4} className="w-full rounded-2xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }} />
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setRemarkDialog({ open: false, row: null, status: '', issueType: '', remark: '' })} className="rounded-full px-4 py-2.5 text-sm font-medium" style={{ background: '#F7F4EF', color: 'var(--text-mid)' }}>Cancel</button>
          <button type="button" onClick={() => void submitRemark()} disabled={saving} className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ background: 'var(--maroon)' }}>{saving ? 'Submitting...' : 'Submit'}</button>
        </div>
      </Dialog>
    </div>
  )
}
