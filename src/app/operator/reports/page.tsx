'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart2,
  MapPin,
  Printer,
  Search,
  SlidersHorizontal,
  Ticket,
  X,
} from 'lucide-react'

type RecordRow = Record<string, unknown>
type ReportTab = 'general-report' | 'day-wise' | 'month-wise' | 'add-on-summary'
type TicketTab = 'general' | 'composite'

type FilterState = {
  startDate: string
  endDate: string
  bookingType: string
  transactionStatus: string
}

type BookingRow = {
  srNo: number
  bookingId: string
  mobile: string
  members: number
  amount: number
  amountWithAddOn: number
  bookingDate: string
  bookingTime: string
  printCount: number
  status: string
  transactionId: string
  packageName: string
  bookingMode: string
}

type PlaceRow = {
  srNo: number
  placeName: string
  purchasePlaceName: string
  totalBooking: number
  totalAmountWithAddOn: number
  totalAmount: number
  totalVisitors: number
  counts: Record<string, number>
  amounts: Record<string, number>
}

type AddOnSummaryRow = {
  placeName: string
  addOnDetails: Array<{ name: string; quantity: number; totalAmount: number }>
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function todayInput() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function monthStartInput() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

function startMs(value: string) {
  return new Date(`${value}T00:00:00.000`).getTime()
}

function endMs(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime()
}

function formatMoney(value: number) {
  return `Rs. ${value.toLocaleString('en-IN')}`
}

function formatDateTime(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return {
        date: date.toLocaleDateString('en-IN'),
        time: date.toLocaleTimeString('en-IN'),
      }
    }
  }

  const text = toText(value, 'N/A')
  return { date: text, time: text === 'N/A' ? 'N/A' : '' }
}

function getAny(obj: unknown, keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key]
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')) return value
  }
  return undefined
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
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

function extractTotal(payload: unknown, fallback = 0) {
  if (!payload || typeof payload !== 'object') return fallback
  const root = payload as Record<string, any>
  const total = root?.result?.totalRecords ?? root?.result?.total ?? root?.totalRecords ?? root?.total
  return typeof total === 'number' && Number.isFinite(total) ? total : fallback
}

function pdf(filename: string, title: string, headers: string[], rows: Array<Array<string | number>>) {
  const doc = new jsPDF('landscape')
  doc.setFontSize(16)
  doc.text(title, 14, 15)
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [107, 18, 18], textColor: [255, 255, 255] },
  })

  doc.save(filename)
}

function BookingDetailsDialog({
  data,
  onClose,
}: {
  data: BookingRow | null
  onClose: () => void
}) {
  if (!data) return null

  const downloadDetails = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Booking Details', 14, 20)
    
    const rows = Object.entries(data)
      .filter(([key]) => key !== 'srNo')
      .map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').trim(), String(v)])

    autoTable(doc, {
      startY: 30,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    })
    
    doc.save(`booking-${data.bookingId}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ background: '#F8F4EE' }}>
          <div>
            <div className="font-serif text-xl font-bold" style={{ color: 'var(--text-dark)' }}>Booking Details</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.bookingId}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(data)
              .filter(([key]) => key !== 'srNo')
              .map(([key, value]) => (
                <div key={key} className="rounded-xl border p-3" style={{ background: '#fcfaf7', borderColor: 'var(--sand)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="mt-1 font-medium" style={{ fontSize: 13, color: 'var(--text-dark)' }}>{String(value)}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4" style={{ background: '#f8fafc' }}>
          <button onClick={onClose} className="rounded-xl border px-4 py-2" style={{ borderColor: 'var(--sand)', fontSize: 13 }}>Close</button>
          <button
            onClick={downloadDetails}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white"
            style={{ background: 'var(--maroon)', fontSize: 13 }}
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function getPlaceId(user: AuthUser | null) {
  const placeId = user?.placeId
  if (Array.isArray(placeId)) {
    const first = placeId.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
    return first?.trim() ?? ''
  }
  return ''
}

function defaultFilters(start: string): FilterState {
  return {
    startDate: start,
    endDate: todayInput(),
    bookingType: 'ALL',
    transactionStatus: 'SUCCESS',
  }
}

function mapBookingRow(row: RecordRow, index: number): BookingRow {
  const { date, time } = formatDateTime(getAny(row, ['bookingDate', 'createdDate', 'createdAt']))
  return {
    srNo: index + 1,
    bookingId: toText(getAny(row, ['bookingId', 'booking_id']), `ROW-${index + 1}`),
    mobile: toText(getAny(row, ['mobileNo', 'mobile', 'phone']), 'N/A'),
    members: toNumber(getAny(row, ['totalUsers', 'totalMembers', 'members', 'qty'])),
    amount: toNumber(getAny(row, ['totalAmount', 'amount'])),
    amountWithAddOn: toNumber(getAny(row, ['totalAmountWithAddOn', 'totalAmountwithAddOn', 'amountWithAddOn']), toNumber(getAny(row, ['totalAmount', 'amount']))),
    bookingDate: date,
    bookingTime: time || '-',
    printCount: toNumber(getAny(row, ['printCount', 'print_count'])),
    status: toText(getAny(row, ['transactionStatus', 'status', 'paymentStatus']), 'N/A'),
    transactionId: toText(getAny(row, ['emitraTransactionId', 'transactionId', 'txnId']), 'N/A'),
    packageName: toText(getAny(row, ['packageName', 'package_name']), '-'),
    bookingMode: toText(getAny(row, ['bookingType', 'bookingMode', 'mode']), 'N/A').toUpperCase(),
  }
}

function mapPlaceRow(row: RecordRow, index: number): PlaceRow {
  const ticketItems = ((getAny(row, ['ticketTypeListDtos', 'ticketTypeListDto']) as RecordRow[]) ?? [])
  const counts: Record<string, number> = {}
  const amounts: Record<string, number> = {}

  for (const item of ticketItems) {
    const label = toText(getAny(item, ['ticketTypeName', 'ticketName', 'name']), 'Unknown')
    counts[label] = toNumber(getAny(item, ['ticketCount', 'count', 'quantity']))
    amounts[label] = toNumber(getAny(item, ['totalAmount', 'amount']))
  }

  return {
    srNo: index + 1,
    placeName: toText(getAny(row, ['placeName', 'place_name']), 'N/A'),
    purchasePlaceName: toText(getAny(row, ['purchasePlaceName', 'purchase_place_name']), ''),
    totalBooking: toNumber(getAny(row, ['totalBooking', 'totalBookings'])),
    totalAmountWithAddOn: toNumber(getAny(row, ['totalAmountWithAddOn', 'totalAmountwithAddOn'])),
    totalAmount: toNumber(getAny(row, ['totalAmount', 'amount'])),
    totalVisitors: toNumber(getAny(row, ['totalVisitors', 'visitors'])),
    counts,
    amounts,
  }
}

function StatCard({ label, value, solid }: { label: string; value: string; solid?: boolean }) {
  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{
        background: solid ? 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' : '#fff',
        border: solid ? 'none' : '1px solid var(--sand)',
      }}
    >
      <div style={{ fontSize: 10, color: solid ? 'rgba(255,255,255,0.74)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      <div className="mt-2 font-serif text-2xl font-bold" style={{ color: solid ? '#fff' : 'var(--maroon)' }}>{value}</div>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border bg-white" style={{ borderColor: 'var(--sand)' }}>
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5" style={{ borderBottom: '1px solid var(--sand)' }}>
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{title}</div>
          {subtitle ? <div className="mt-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function PageControls({
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

function FilterModal({
  open,
  values,
  setValues,
  title,
  placeName,
  showBookingType = true,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean
  values: FilterState
  setValues: React.Dispatch<React.SetStateAction<FilterState>>
  title: string
  placeName: string
  showBookingType?: boolean
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-[28px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between rounded-t-[28px] px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
          <div>
            <div className="font-serif text-2xl font-bold">{title}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>Operator scoped filters for {placeName || 'assigned place'}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              <Calendar size={12} />
              Start Date
            </label>
            <input
              type="date"
              value={values.startDate}
              onChange={event => setValues(current => ({ ...current, startDate: event.target.value }))}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ border: '1px solid var(--sand)', fontSize: 13 }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              <Calendar size={12} />
              End Date
            </label>
            <input
              type="date"
              value={values.endDate}
              min={values.startDate}
              onChange={event => setValues(current => ({ ...current, endDate: event.target.value }))}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ border: '1px solid var(--sand)', fontSize: 13 }}
            />
          </div>

          {showBookingType ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                <Ticket size={12} />
                Booking Type
              </label>
              <select
                value={values.bookingType}
                onChange={event => setValues(current => ({ ...current, bookingType: event.target.value }))}
                className="w-full rounded-2xl px-4 py-3 outline-none"
                style={{ border: '1px solid var(--sand)', fontSize: 13, background: '#fff' }}
              >
                <option value="ALL">All Booking Types</option>
                <option value="ONLINE">Online</option>
                <option value="KIOSK">Kiosk</option>
                <option value="COUNTER">Counter</option>
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              <Building2 size={12} />
              Payment Status
            </label>
            <select
              value={values.transactionStatus}
              onChange={event => setValues(current => ({ ...current, transactionStatus: event.target.value }))}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ border: '1px solid var(--sand)', fontSize: 13, background: '#fff' }}
            >
              <option value="SUCCESS">Success</option>
              <option value="ALL">All Statuses</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--sand)' }}>
          <button onClick={onReset} className="rounded-xl border px-4 py-2" style={{ borderColor: 'var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>
            Reset
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

function BookingReportView({
  placeName,
  departmentName,
  composite,
}: {
  placeName: string
  departmentName: string
  composite?: boolean
}) {
  const base = useMemo(() => defaultFilters(todayInput()), [])
  const [draftFilters, setDraftFilters] = useState<FilterState>(base)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(base)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<BookingRow | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          bookingId: search.trim(),
          offSet: String(Math.max(0, page - 1)),
          size: String(pageSize),
          isFilter: String(Boolean(search.trim() || appliedFilters.startDate || appliedFilters.endDate)),
          ticketType: composite ? 'COMPOSITE' : 'NORMAL',
        })

        if (composite) {
          params.set('date', String(startMs(appliedFilters.startDate)))
        } else {
          params.set('startDay', String(startMs(appliedFilters.startDate)))
          params.set('endDay', String(endMs(appliedFilters.endDate)))
          params.set('pagination', 'true')
          params.set('export', 'false')
        }

        const response = await fetch(`/api/operator-reports/bookings?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)

        const payload = await response.json()
        const source = (findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object')
        const rawData = source.map((item, index) => mapBookingRow(item as RecordRow, index))
        const data = rawData.filter(row => {
          if (appliedFilters.transactionStatus !== 'ALL' && row.status.toUpperCase() !== appliedFilters.transactionStatus.toUpperCase()) {
            return false
          }

          if (!composite && appliedFilters.bookingType !== 'ALL' && row.bookingMode !== appliedFilters.bookingType.toUpperCase()) {
            return false
          }

          return true
        })

        if (active) {
          setRows(data)
          setTotal(extractTotal(payload, data.length))
        }
      } catch (err) {
        if (active) {
          setRows([])
          setTotal(0)
          setError(err instanceof Error ? err.message : 'Unable to load report.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [appliedFilters, composite, page, pageSize, search])

  const filterCount = [appliedFilters.bookingType !== 'ALL' ? appliedFilters.bookingType : '', appliedFilters.transactionStatus !== 'ALL' ? appliedFilters.transactionStatus : ''].filter(Boolean).length
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows])
  const totalVisitors = useMemo(() => rows.reduce((sum, row) => sum + row.members, 0), [rows])
  const totalAmountWithAddOn = useMemo(() => rows.reduce((sum, row) => sum + row.amountWithAddOn, 0), [rows])
  const columnCount = composite ? 11 : 11

  return (
    <>
      <Panel
        title="General Report"
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 240 }}>
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search booking ID"
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 12 }}
              />
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="rounded-2xl px-4 py-2"
              style={{
                fontSize: 12,
                background: filterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
                color: filterCount > 0 ? '#fff' : 'var(--text-mid)',
                border: `1px solid ${filterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
              }}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal size={13} />
                Filters
              </span>
            </button>
            <button
              onClick={() => pdf(
                `${composite ? 'composite' : 'general'}-ticket-report-${Date.now()}.pdf`,
                `${composite ? 'Composite' : 'General'} Ticket Booking Report`,
                composite
                  ? ['Booking ID', 'Mobile', 'Members', 'Amount', 'Date', 'Time', 'Print Count', 'Status', 'Transaction ID', 'Package']
                  : ['Booking ID', 'Mobile', 'Members', 'Amount', 'Amount With Add On', 'Date', 'Time', 'Print Count', 'Status', 'Transaction ID'],
                rows.map(row => composite
                  ? [row.bookingId, row.mobile, row.members, row.amount, row.bookingDate, row.bookingTime, row.printCount, row.status, row.transactionId, row.packageName]
                  : [row.bookingId, row.mobile, row.members, row.amount, row.amountWithAddOn, row.bookingDate, row.bookingTime, row.printCount, row.status, row.transactionId]),
              )}
              className="rounded-2xl px-4 py-2 text-white"
              style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
            >
              <span className="inline-flex items-center gap-2">
                <Download size={13} />
                Export
              </span>
            </button>
          </div>
        )}
      >
        <div className="grid gap-3 px-6 py-4 md:grid-cols-3" style={{ background: 'var(--cream)' }}>
          {/* <StatCard label="Assigned Place" value={placeName || 'N/A'} />
          <StatCard label="Department" value={departmentName} /> */}
          <StatCard label="Rows Loaded" value={rows.length.toLocaleString('en-IN')} />
          <StatCard label="Visitors" value={totalVisitors.toLocaleString('en-IN')} />
          <StatCard label={composite ? 'Total Amount' : 'Amount With Add On'} value={formatMoney(composite ? totalAmount : totalAmountWithAddOn)} solid />
        </div>

        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {[
                  'Sr.',
                  'Booking ID',
                  'Mobile Number',
                  'Members',
                  'Amount',
                  ...(composite ? [] : ['Amount With Add On']),
                  'Date',
                  'Time',
                  'Print Count',
                  'Status',
                  'Transaction ID',
                  ...(composite ? ['Package'] : []),
                ].map(header => (
                  <th
                    key={header}
                    style={{
                      padding: '11px 14px',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      textAlign: ['Members', 'Amount', 'Amount With Add On', 'Print Count'].includes(header) ? 'right' : 'left',
                      color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                      background: header === 'Sr.' ? 'var(--maroon)' : undefined,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={columnCount} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading booking report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={columnCount} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && rows.length === 0 ? <tr><td colSpan={columnCount} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && rows.map(row => (
                <tr key={`${row.bookingId}-${row.srNo}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(page - 1) * pageSize + row.srNo}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>
                    <button
                      onClick={() => setSelectedRow(row)}
                      className="font-semibold transition hover:opacity-70"
                      style={{ color: 'var(--maroon)', textDecoration: 'underline' }}
                    >
                      {row.bookingId}
                    </button>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.mobile}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{row.members}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.amount)}</td>
                  {!composite ? <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.amountWithAddOn)}</td> : null}
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.bookingDate}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.bookingTime}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{row.printCount}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.status}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.transactionId}</td>
                  {composite ? <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.packageName}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PageControls page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total || rows.length} />
      </Panel>

      <FilterModal
        open={filterOpen}
        values={draftFilters}
        setValues={setDraftFilters}
        title={`Filter ${composite ? 'Composite' : 'General'} Booking Report`}
        placeName={placeName}
        showBookingType={!composite}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraftFilters(base)
          setAppliedFilters(base)
          setSearch('')
          setPage(1)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
      />

      {selectedRow ? (
        <BookingDetailsDialog
          data={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      ) : null}
    </>
  )
}

function PlaceSummaryReportView({
  placeId,
  placeName,
  departmentName,
  title,
  reportPath,
  composite,
  start,
}: {
  placeId: string
  placeName: string
  departmentName: string
  title: string
  reportPath: string
  composite?: boolean
  start: string
}) {
  const base = useMemo(() => defaultFilters(start), [start])
  const [draftFilters, setDraftFilters] = useState<FilterState>(base)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(base)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<PlaceRow[]>([])
  const [totals, setTotals] = useState<{ bookings: number; amount: number; amountWithAddOn: number; visitors: number }>({
    bookings: 0,
    amount: 0,
    amountWithAddOn: 0,
    visitors: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          divisionId: '',
          districtId: '',
          endDay: String(endMs(appliedFilters.endDate)),
          offSet: String(Math.max(0, page - 1)),
          placeId,
          size: String(pageSize),
          startDay: String(startMs(appliedFilters.startDate)),
          ticketType: composite ? 'COMPOSITE' : 'NORMAL',
          departmentId: '',
          transactionStatus: appliedFilters.transactionStatus === 'ALL' ? '' : appliedFilters.transactionStatus,
          bookingType: appliedFilters.bookingType === 'ALL' ? '' : appliedFilters.bookingType,
          isFilter: 'true',
        })
        const response = await fetch(`${reportPath}?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)

        const payload = await response.json()
        const data = (findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object').map((item, index) => mapPlaceRow(item as RecordRow, index))
        const result = (payload as any)?.result ?? {}

        if (active) {
          setRows(data)
          setTotals({
            bookings: toNumber(result.totalBooking),
            amount: toNumber(result.totalAmount),
            amountWithAddOn: toNumber(result.totalAmountWithAddOn),
            visitors: toNumber(result.totalVisitors),
          })
          setTotal(extractTotal(payload, data.length))
        }
      } catch (err) {
        if (active) {
          setRows([])
          setTotals({ bookings: 0, amount: 0, amountWithAddOn: 0, visitors: 0 })
          setTotal(0)
          setError(err instanceof Error ? err.message : 'Unable to load report.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [appliedFilters, composite, page, pageSize, placeId, reportPath])

  const ticketLabels = useMemo(() => Array.from(new Set(rows.flatMap(row => Object.keys(row.counts)))), [rows])
  const hasPurchasePlace = rows.some(row => row.purchasePlaceName)
  const filterCount = [appliedFilters.bookingType !== 'ALL' ? appliedFilters.bookingType : '', appliedFilters.transactionStatus !== 'ALL' ? appliedFilters.transactionStatus : ''].filter(Boolean).length

  return (
    <>
      <Panel
        title={title}
        action={(
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className="rounded-2xl px-4 py-2"
              style={{
                fontSize: 12,
                background: filterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
                color: filterCount > 0 ? '#fff' : 'var(--text-mid)',
                border: `1px solid ${filterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
              }}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal size={13} />
                Filters
              </span>
            </button>
            <button
              onClick={() => pdf(
                `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`,
                title,
                ['Place', 'Total Booking', 'Amount With Add On', 'Total Amount', 'Total Visitors'],
                rows.map(row => [row.placeName, row.totalBooking, row.totalAmountWithAddOn, row.totalAmount, row.totalVisitors]),
              )}
              className="rounded-2xl px-4 py-2 text-white"
              style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
            >
              <span className="inline-flex items-center gap-2">
                <Download size={13} />
                Export
              </span>
            </button>
          </div>
        )}
      >
        <div className="grid gap-3 px-6 py-4 md:grid-cols-5" style={{ background: 'var(--cream)' }}>
          <StatCard label="Assigned Place" value={placeName || 'N/A'} />
          <StatCard label="Department" value={departmentName} />
          <StatCard label="Total Bookings" value={totals.bookings.toLocaleString('en-IN')} />
          <StatCard label="Visitors" value={totals.visitors.toLocaleString('en-IN')} />
          <StatCard label="Total Amount" value={formatMoney(composite ? totals.amount : (totals.amountWithAddOn || totals.amount))} solid />
        </div>

        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Place Name', ...(hasPurchasePlace ? ['Purchase Place'] : []), 'Total Booking', 'Amount With Add On', 'Total Amount', ...ticketLabels, ...ticketLabels.map(label => `${label} Amount`), 'Total Visitors'].map(header => (
                  <th
                    key={header}
                    style={{
                      padding: '11px 14px',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      textAlign: header.includes('Place') ? 'left' : 'right',
                      color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                      background: header === 'Sr.' ? 'var(--maroon)' : undefined,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7 + (hasPurchasePlace ? 1 : 0) + ticketLabels.length * 2} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={7 + (hasPurchasePlace ? 1 : 0) + ticketLabels.length * 2} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && rows.length === 0 ? <tr><td colSpan={7 + (hasPurchasePlace ? 1 : 0) + ticketLabels.length * 2} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && rows.map(row => (
                <tr key={`${row.placeName}-${row.srNo}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(page - 1) * pageSize + row.srNo}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.placeName}</td>
                  {hasPurchasePlace ? <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.purchasePlaceName || '-'}</td> : null}
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{row.totalBooking}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.totalAmountWithAddOn)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.totalAmount)}</td>
                  {ticketLabels.map(label => <td key={`${row.placeName}-${label}-count`} style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{row.counts[label] ?? 0}</td>)}
                  {ticketLabels.map(label => <td key={`${row.placeName}-${label}-amount`} style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.amounts[label] ?? 0)}</td>)}
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{row.totalVisitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PageControls page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total || rows.length} />
      </Panel>

      <FilterModal
        open={filterOpen}
        values={draftFilters}
        setValues={setDraftFilters}
        title={`Filter ${title}`}
        placeName={placeName}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraftFilters(base)
          setAppliedFilters(base)
          setPage(1)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
      />
    </>
  )
}

function AddOnSummaryReportView({
  placeId,
  placeName,
  departmentName,
}: {
  placeId: string
  placeName: string
  departmentName: string
}) {
  const base = useMemo(() => defaultFilters(todayInput()), [])
  const [draftFilters, setDraftFilters] = useState<FilterState>(base)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(base)
  const [filterOpen, setFilterOpen] = useState(false)
  const [rows, setRows] = useState<AddOnSummaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          departmentId: '',
          districtId: '',
          divisionId: '',
          endDay: String(endMs(appliedFilters.endDate)),
          isFilter: 'true',
          offSet: '0',
          pagination: 'true',
          placeId,
          size: '200',
          startDay: String(startMs(appliedFilters.startDate)),
          transactionStatus: appliedFilters.transactionStatus === 'ALL' ? '' : appliedFilters.transactionStatus,
        })
        const response = await fetch(`/api/non-inventory/reports/summary?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)

        const payload = await response.json()
        const items = (((payload as any)?.result?.addonReportPlaceWises ?? []) as RecordRow[]).map(item => ({
          placeName: toText(getAny(item, ['placeName', 'place_name']), 'N/A'),
          addOnDetails: Array.isArray(item.addOnDetails)
            ? item.addOnDetails.map(detail => ({
              name: toText((detail as RecordRow).name, 'Unnamed Add On'),
              quantity: toNumber((detail as RecordRow).quantity),
              totalAmount: toNumber((detail as RecordRow).totalAmount),
            }))
            : [],
        }))
        if (active) setRows(items)
      } catch (err) {
        if (active) {
          setRows([])
          setError(err instanceof Error ? err.message : 'Unable to load report.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [appliedFilters, placeId])

  const totalQuantity = useMemo(() => rows.reduce((sum, row) => sum + row.addOnDetails.reduce((inner, item) => inner + item.quantity, 0), 0), [rows])
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.addOnDetails.reduce((inner, item) => inner + item.totalAmount, 0), 0), [rows])
  const filterCount = [appliedFilters.transactionStatus !== 'ALL' ? appliedFilters.transactionStatus : ''].filter(Boolean).length

  return (
    <>
      <Panel
        title="Add On Summary Report"
        action={(
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className="rounded-2xl px-4 py-2"
              style={{
                fontSize: 12,
                background: filterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
                color: filterCount > 0 ? '#fff' : 'var(--text-mid)',
                border: `1px solid ${filterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
              }}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal size={13} />
                Filters
              </span>
            </button>
            <button
              onClick={() => pdf(
                `add-on-summary-report-${Date.now()}.pdf`,
                'Add On Summary Report',
                ['Place', 'Add On', 'Quantity', 'Amount'],
                rows.flatMap(row => row.addOnDetails.map(item => [row.placeName, item.name, item.quantity, item.totalAmount])),
              )}
              className="rounded-2xl px-4 py-2 text-white"
              style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
            >
              <span className="inline-flex items-center gap-2">
                <Download size={13} />
                Export
              </span>
            </button>
          </div>
        )}
      >
        <div className="grid gap-3 px-6 py-4 md:grid-cols-5" style={{ background: 'var(--cream)' }}>
          <StatCard label="Assigned Place" value={placeName || 'N/A'} />
          <StatCard label="Department" value={departmentName} />
          <StatCard label="Places" value={rows.length.toLocaleString('en-IN')} />
          <StatCard label="Total Quantity" value={totalQuantity.toLocaleString('en-IN')} />
          <StatCard label="Total Amount" value={formatMoney(totalAmount)} solid />
        </div>

        <div className="space-y-4 px-6 pb-6">
          {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading add-on summary report...</div> : null}
          {!loading && error ? <div style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</div> : null}
          {!loading && !error && rows.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</div> : null}
          {!loading && !error && rows.map(row => (
            <div key={row.placeName} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--sand)' }}>
              <div className="px-4 py-3 font-semibold" style={{ background: 'rgba(139,26,26,0.06)', color: 'var(--maroon)' }}>{row.placeName}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream-dark)' }}>
                    {['Add On Name', 'Quantity', 'Amount'].map(header => (
                      <th key={header} style={{ padding: '10px 14px', textAlign: header === 'Add On Name' ? 'left' : 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {row.addOnDetails.map(item => (
                    <tr key={`${row.placeName}-${item.name}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                      <td style={{ padding: '9px 14px', fontSize: 11 }}>{item.name}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, textAlign: 'right' }}>{formatMoney(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Panel>

      <FilterModal
        open={filterOpen}
        values={draftFilters}
        setValues={setDraftFilters}
        title="Filter Add On Summary Report"
        placeName={placeName}
        showBookingType={false}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraftFilters(base)
          setAppliedFilters(base)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
      />
    </>
  )
}

export default function OperatorReportsPage() {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedAuthUser())
  const [extraDetails, setExtraDetails] = useState<{
    departmentName?: string
    assignedPlaces?: string[]
  } | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [ticketTab, setTicketTab] = useState<TicketTab>('general')
  const [reportTab, setReportTab] = useState<ReportTab>('general-report')

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        if (!response.ok) {
          clearCachedAuthUser()
          if (active) setUser(null)
          return
        }

        const payload = await response.json() as { user?: AuthUser | null }
        const nextUser = payload.user ?? null

        if (active) {
          setUser(nextUser)
          writeCachedAuthUser(nextUser)

          if (nextUser?.sub) {
            void loadExtraDetails(nextUser.sub)
          }
        }
      } catch {
        clearCachedAuthUser()
        if (active) setUser(null)
      } finally {
        if (active) setLoadingSession(false)
      }
    }

    async function loadExtraDetails(userId: string) {
      try {
        const response = await fetch(`/api/user/${userId}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) return

        const payload = await response.json()
        if (!active || !payload?.result) return

        const result = payload.result
        const roleData = result.roleResponseDto

        const departmentName = Array.isArray(roleData?.departmentDto)
          ? roleData.departmentDto[0]?.name
          : roleData?.departmentDto?.name

        const assignedPlaces = Array.isArray(roleData?.placeDtos)
          ? roleData.placeDtos.map((p: any) => p.name).filter(Boolean)
          : []

        setExtraDetails({ departmentName, assignedPlaces })
      } catch (err) {
        console.error('Failed to load extra user details:', err)
      }
    }

    loadSession()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (ticketTab === 'composite' && reportTab === 'add-on-summary') {
      setReportTab('general-report')
    }
  }, [reportTab, ticketTab])

  const placeId = getPlaceId(user)
  const placeName = extraDetails?.assignedPlaces?.join(', ') || toText(user?.placeName)
  const departmentName = extraDetails?.departmentName || 'N/A'
  const tabs = ticketTab === 'general'
    ? [
        { id: 'general-report' as const, label: 'General Report' },
        { id: 'day-wise' as const, label: 'Day Wise Report' },
        { id: 'month-wise' as const, label: 'Month Wise Report' },
        { id: 'add-on-summary' as const, label: 'Add On Summary Report' },
      ]
    : [
        { id: 'general-report' as const, label: 'General Report' },
        { id: 'day-wise' as const, label: 'Day Wise Report' },
        { id: 'month-wise' as const, label: 'Month Wise Report' },
      ]

  const content = useMemo(() => {
    if (!placeId) return null

    if (ticketTab === 'general') {
      if (reportTab === 'general-report') return <BookingReportView placeName={placeName} departmentName={departmentName}/>
      if (reportTab === 'day-wise') return <PlaceSummaryReportView placeId={placeId} placeName={placeName} departmentName={departmentName} title="Day Wise Report" reportPath="/api/non-inventory/reports/daywise" start={todayInput()} />
      if (reportTab === 'month-wise') return <PlaceSummaryReportView placeId={placeId} placeName={placeName} departmentName={departmentName} title="Month Wise Report" reportPath="/api/non-inventory/reports/monthwise" start={monthStartInput()} />
      return <AddOnSummaryReportView placeId={placeId} placeName={placeName} departmentName={departmentName}/>
    }

    if (reportTab === 'general-report') return <BookingReportView placeName={placeName} composite departmentName={departmentName} />
    if (reportTab === 'day-wise') return <PlaceSummaryReportView placeId={placeId} placeName={placeName} departmentName={departmentName} title="Day Wise Report" reportPath="/api/non-inventory/reports/daywise" composite start={todayInput()} />
    return <PlaceSummaryReportView placeId={placeId} placeName={placeName} departmentName={departmentName} title="Month Wise Report" reportPath="/api/non-inventory/reports/monthwise" composite start={monthStartInput()} />
  }, [placeId, placeName, reportTab, ticketTab])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="page-enter flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] text-white" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}>
              <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
            
                  <h1 className="mt-3 font-serif text-3xl font-bold">Report</h1>
               
                </div>
              </div>

              <div className="grid gap-px md:grid-cols-3" style={{ background: 'rgba(255,255,255,0.14)' }}>
                {[
                  { label: 'Assigned Place', value: placeName || 'Not mapped' },
                  // { label: 'Department', value: departmentName },
                  { label: 'Ticket Module', value: ticketTab === 'general' ? 'General Ticket' : 'Composite Ticket' },
                  { label: 'Report Type', value: tabs.find(tab => tab.id === reportTab)?.label ?? 'Report' },
                ].map(card => (
                  <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{card.label}</div>
                    <div className="mt-1 font-semibold" style={{ fontSize: 18, color: '#fff' }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>Ticket Type</div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {([
                    { id: 'general', label: 'General Ticket' },
                    { id: 'composite', label: 'Composite Ticket' },
                  ] as Array<{ id: TicketTab; label: string }>).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTicketTab(tab.id)}
                      className="rounded-2xl px-5 py-3 font-semibold transition"
                      style={{
                        background: ticketTab === tab.id ? 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' : '#FCF7F0',
                        color: ticketTab === tab.id ? '#fff' : 'var(--text-dark)',
                        border: `1px solid ${ticketTab === tab.id ? 'transparent' : 'var(--sand)'}`,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setReportTab(tab.id)}
                    className="rounded-full px-4 py-2 transition"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      background: reportTab === tab.id ? 'rgba(139,26,26,0.1)' : '#fff',
                      color: reportTab === tab.id ? 'var(--maroon)' : 'var(--text-mid)',
                      border: `1px solid ${reportTab === tab.id ? 'rgba(139,26,26,0.24)' : 'var(--sand)'}`,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {loadingSession ? (
              <section className="rounded-[28px] border bg-white px-6 py-12 text-center" style={{ borderColor: 'var(--sand)' }}>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading operator session...</div>
              </section>
            ) : !placeId ? (
              <section className="rounded-[28px] border bg-white px-6 py-12 text-center" style={{ borderColor: 'rgba(229,62,62,0.22)' }}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
                  <MapPin size={24} />
                </div>
                <div className="mt-4 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>No assigned place found</div>
                <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  This operator account does not have a mapped place, so the report module cannot load place-scoped data.
                </div>
              </section>
            ) : (
              content
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
