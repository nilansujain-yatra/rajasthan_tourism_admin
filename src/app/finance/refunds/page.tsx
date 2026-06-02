'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { authFetch } from '@/lib/api/authFetch'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  MoreVertical,
  Search,
  X,
} from 'lucide-react'

type Place = {
  id?: string | number
  placeId?: string | number
  name?: string
  placeName?: string
  [key: string]: unknown
}

type Option = {
  id: string
  name: string
}

type CancellationRefundRow = {
  bookingId: string
  bookingDate: number | null
  createdDate: number | null
  cancelledDate: number | null
  placeName: string
  totalVisitors: number
  shiftName: string
  zoneName: string
  cancelledReason: string
  bankName: string
  bankAccount: string
  bankIfsc: string
  bankAccountName: string
  status: string
  statusReason: string
  emitraTransactionId: string
  totalAmount: number
  refundAmount: number
  statusCreatedBy: string
  statusChangedDate: number | null
  cancelledId: string
}

type FilterState = {
  startDate: string
  endDate: string
  placeId: string
  placeName: string
  shiftId: string
  shiftName: string
  zoneId: string
  zoneName: string
}

type ActionState =
  | { type: 'approve' | 'reject'; row: CancellationRefundRow }
  | null

const DEFAULT_FILTERS: FilterState = {
  startDate: '',
  endDate: '',
  placeId: '',
  placeName: '',
  shiftId: '',
  shiftName: '',
  zoneId: '',
  zoneName: '',
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }

  return fallback
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 5) return null

  const record = value as Record<string, unknown>
  for (const key of ['result', 'data', 'content', 'list', 'rows', 'items']) {
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

function extractPlaces(payload: unknown): Place[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as Place[]
}

function getPlaceId(place: Place) {
  const candidate =
    place.id ??
    place.placeId ??
    (place as { place_id?: string | number }).place_id ??
    (place as { placeCode?: string | number }).placeCode

  return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : ''
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    place.name ??
    (place as { place_name?: string }).place_name ??
    (place as { placename?: string }).placename

  return typeof candidate === 'string' ? candidate.trim() : ''
}

function extractOptions(payload: unknown, keys: string[]): Option[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  for (const key of keys) {
    const value = result[key]
    if (!Array.isArray(value)) continue

    return value
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const row = item as Record<string, unknown>
        return {
          id: String(row.id ?? ''),
          name: String(row.name ?? row.shiftName ?? row.placeName ?? ''),
        }
      })
      .filter(option => option.id && option.name)
  }

  return []
}

function extractTotalRecords(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0
  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toNullableNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function extractRefundRows(payload: unknown): CancellationRefundRow[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}
  const list = Array.isArray(result.inventoryOperatorReport)
    ? result.inventoryOperatorReport
    : Array.isArray(result.ticketBookingReports)
    ? result.ticketBookingReports
    : Array.isArray(result.ticketBookingReportForOperator)
    ? result.ticketBookingReportForOperator
    : []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        bookingId: String(row.bookingId ?? ''),
        bookingDate: toNullableNumber(row.bookingDate),
        createdDate: toNullableNumber(row.createdDate),
        cancelledDate: toNullableNumber(row.cancelledDate),
        placeName: String(row.placeName ?? ''),
        totalVisitors: toNumber(row.totalVisitors),
        shiftName: String(row.shiftName ?? ''),
        zoneName: String(row.zoneName ?? ''),
        cancelledReason: String(row.cancelledReason ?? ''),
        bankName: String(row.bankName ?? ''),
        bankAccount: String(row.bankAccount ?? ''),
        bankIfsc: String(row.bankIfsc ?? ''),
        bankAccountName: String(row.bankAccountName ?? ''),
        status: String(row.status ?? ''),
        statusReason: String(row.statusReason ?? ''),
        emitraTransactionId: String(row.emitraTransactionId ?? row.transactionId ?? ''),
        totalAmount: toNumber(row.totalAmount),
        refundAmount: toNumber(row.refundAmount),
        statusCreatedBy: String(row.statusCreatedBy ?? ''),
        statusChangedDate: toNullableNumber(row.statusChangedDate),
        cancelledId: String(row.cancelledId ?? row.id ?? ''),
      }
    })
}

function formatDate(value: number | null) {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function getOffset(page: number, pageSize: number) {
  return Math.max(0, page - 1)
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
    pages.add(i)
  }
  if (totalPages > 1) pages.add(totalPages)
  return Array.from(pages).sort((a, b) => a - b)
}

function Pager({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const pages = getVisiblePages(page, totalPages)
  const start = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalRecords)

  return (
    <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--cream-dark)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text-dark)' }}>{start}-{end}</strong> of <strong style={{ color: 'var(--text-dark)' }}>{totalRecords}</strong>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={String(pageSize)}
          onChange={event => onPageSizeChange(Number(event.target.value))}
          className="rounded-xl px-3 py-2 outline-none"
          style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12 }}
        >
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
            style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
          >
            <ChevronLeft size={16} />
          </button>
          {pages.map(itemPage => (
            <button
              key={itemPage}
              onClick={() => onPageChange(itemPage)}
              className="min-w-9 rounded-xl px-3 py-2 font-medium"
              style={{
                background: itemPage === page ? 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' : '#F8F4EE',
                color: itemPage === page ? '#fff' : 'var(--text-mid)',
                border: itemPage === page ? 'none' : '1px solid var(--sand)',
                fontSize: 12,
              }}
            >
              {itemPage}
            </button>
          ))}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
            style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function PlaceSelector({
  places,
  value,
  onChange,
}: {
  places: Place[]
  value: string
  onChange: (placeId: string, placeName: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredPlaces = useMemo(() => {
    const query = search.trim().toLowerCase()
    const sorted = places.slice().sort((a, b) => getPlaceName(a).localeCompare(getPlaceName(b), 'en', { sensitivity: 'base' }))
    if (!query) return sorted
    return sorted.filter(place => getPlaceName(place).toLowerCase().includes(query))
  }, [places, search])

  const selectedPlaceName = useMemo(() => {
    const selected = places.find(place => getPlaceId(place) === value)
    return selected ? getPlaceName(selected) : ''
  }, [places, value])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
        style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
      >
        <span style={{ color: selectedPlaceName ? 'var(--text-dark)' : 'var(--text-muted)' }}>
          {selectedPlaceName || 'Select Place'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-[24px] bg-white" style={{ border: '1px solid var(--sand)', boxShadow: '0 20px 48px rgba(58,32,16,0.14)', zIndex: 30 }}>
          <div className="border-b p-3" style={{ borderColor: 'var(--cream-dark)' }}>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search place"
                className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => {
                onChange('', '')
                setOpen(false)
              }}
              className="mb-1 w-full rounded-2xl px-3 py-3 text-left"
              style={{ background: value === '' ? 'rgba(139,26,26,0.08)' : 'transparent', color: value === '' ? 'var(--maroon)' : 'var(--text-mid)', fontSize: 13 }}
            >
              Select Place
            </button>
            {filteredPlaces.length === 0 ? (
              <div className="px-3 py-4 text-center" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                No places found.
              </div>
            ) : (
              filteredPlaces.map(place => {
                const placeId = getPlaceId(place)
                const placeName = getPlaceName(place)
                const selected = value === placeId
                return (
                  <button
                    key={placeId}
                    type="button"
                    onClick={() => {
                      onChange(placeId, placeName)
                      setOpen(false)
                    }}
                    className="mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
                    style={{ background: selected ? 'rgba(139,26,26,0.08)' : 'transparent', color: selected ? 'var(--maroon)' : 'var(--text-dark)', fontSize: 13 }}
                  >
                    <span>{placeName}</span>
                    {selected ? <Check size={15} /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterDialog({
  open,
  places,
  values,
  shiftOptions,
  zoneOptions,
  loadingOptions,
  onChange,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean
  places: Place[]
  values: FilterState
  shiftOptions: Option[]
  zoneOptions: Option[]
  loadingOptions: boolean
  onChange: (next: FilterState) => void
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(28,16,8,0.54)', zIndex: 1000, backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: '0 36px 90px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.16)' }}>
              <Filter size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 22 }}>Cancellation Refund Filter</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>Apply place, shift, zone, and date filters</div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 px-7 py-7 lg:grid-cols-2">
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start Date</label>
            <input type="date" value={values.startDate} onChange={event => onChange({ ...values, startDate: event.target.value })} className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>End Date</label>
            <input type="date" value={values.endDate} onChange={event => onChange({ ...values, endDate: event.target.value })} className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Place</label>
            <PlaceSelector
              places={places}
              value={values.placeId}
              onChange={(placeId, placeName) => onChange({ ...values, placeId, placeName, shiftId: '', shiftName: '', zoneId: '', zoneName: '' })}
            />
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shift</label>
            <select
              value={values.shiftId}
              onChange={event => {
                const selected = shiftOptions.find(option => option.id === event.target.value)
                onChange({ ...values, shiftId: event.target.value, shiftName: selected?.name ?? '' })
              }}
              disabled={!values.placeId || loadingOptions}
              className="w-full rounded-2xl px-4 py-3 outline-none disabled:opacity-60"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            >
              <option value="">{loadingOptions ? 'Loading shifts...' : 'Select Shift'}</option>
              {shiftOptions.map(option => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zone</label>
            <select
              value={values.zoneId}
              onChange={event => {
                const selected = zoneOptions.find(option => option.id === event.target.value)
                onChange({ ...values, zoneId: event.target.value, zoneName: selected?.name ?? '' })
              }}
              disabled={!values.placeId || loadingOptions}
              className="w-full rounded-2xl px-4 py-3 outline-none disabled:opacity-60"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            >
              <option value="">{loadingOptions ? 'Loading zones...' : 'Select Zone'}</option>
              {zoneOptions.map(option => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-7 py-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onReset} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
            Clear
          </button>
          <button onClick={onApply} className="rounded-xl px-8 py-2.5 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionDialog({
  state,
  values,
  error,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  state: ActionState
  values: { transactionId: string; statusReason: string }
  error: string
  loading: boolean
  onChange: (next: { transactionId: string; statusReason: string }) => void
  onClose: () => void
  onSubmit: () => void
}) {
  if (!state) return null

  const isApprove = state.type === 'approve'
  const row = state.row

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(28,16,8,0.46)', zIndex: 1030 }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-7" style={{ boxShadow: '0 30px 80px rgba(107,18,18,0.22)' }}>
        <div className="mb-3 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>
          {isApprove ? `Approve refund request of ${formatCurrency(row.refundAmount)}?` : `Reject refund request of ${formatCurrency(row.refundAmount)}?`}
        </div>
        <div className="grid gap-5">
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Transaction ID{isApprove ? '' : ' *'}
            </label>
            <input
              value={values.transactionId}
              onChange={event => onChange({ ...values, transactionId: event.target.value })}
              placeholder="Enter transaction ID"
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            />
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isApprove ? 'Reason For Approve' : 'Reason For Reject *'}
            </label>
            <textarea
              value={values.statusReason}
              onChange={event => onChange({ ...values, statusReason: event.target.value })}
              rows={4}
              placeholder="Write here..."
              className="w-full resize-none rounded-[22px] px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, lineHeight: 1.6 }}
            />
          </div>

          {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
            style={{ background: isApprove ? 'linear-gradient(135deg, #1A7A6E 0%, #2A9D8F 100%)' : 'linear-gradient(135deg, #9F1F1F 0%, #6B1212 100%)', fontSize: 14 }}
          >
            {loading ? 'Please wait...' : isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

const tableColumns = [
  'Booking Id',
  'Visit Date',
  'Booking Date',
  'Cancelled Date',
  'Place Name',
  'Total Visitors',
  'Shift Name',
  'Zone Name',
  'Cancelled Reason',
  'Bank Name',
  'Bank Account',
  'Bank Ifsc',
  'Bank Account Name',
  'Status',
  'Status Reason',
  'Transaction Id',
  'Total Amount',
  'Refund Amount',
  'Status Created By',
  'Status Changed Date',
  'Actions',
]

export default function CancellationRefundsPage() {
  const [rows, setRows] = useState<CancellationRefundRow[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [shiftOptions, setShiftOptions] = useState<Option[]>([])
  const [zoneOptions, setZoneOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [placesLoading, setPlacesLoading] = useState(true)
  const [placeMetaLoading, setPlaceMetaLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDeferredValue(searchText)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [actionState, setActionState] = useState<ActionState>(null)
  const [actionForm, setActionForm] = useState({ transactionId: '', statusReason: '' })
  const [actionError, setActionError] = useState('')

  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) return rows

    return rows.filter(row => (
      row.bookingId.toLowerCase().includes(query) ||
      row.placeName.toLowerCase().includes(query) ||
      row.bankAccountName.toLowerCase().includes(query) ||
      row.emitraTransactionId.toLowerCase().includes(query)
    ))
  }, [rows, deferredSearch])

  async function loadPlaces() {
    setPlacesLoading(true)
    try {
      const response = await authFetch('/place?searchKey=&size=2000', {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch places.'))
      setPlaces(extractPlaces(payload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch places.')
    } finally {
      setPlacesLoading(false)
    }
  }

  async function loadPlaceMeta(placeId: string) {
    if (!placeId) {
      setShiftOptions([])
      setZoneOptions([])
      return
    }

    setPlaceMetaLoading(true)
    try {
      const response = await authFetch(`/system/placeQuota?placeId=${encodeURIComponent(placeId)}`, {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch place shift and zone details.'))

      setShiftOptions(extractOptions(payload, ['shiftDto', 'shiftData', 'shifts']))
      setZoneOptions(extractOptions(payload, ['zoneDto', 'zoneData', 'zones']))
    } catch (loadError) {
      setShiftOptions([])
      setZoneOptions([])
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch place shift and zone details.')
    } finally {
      setPlaceMetaLoading(false)
    }
  }

  async function loadRows() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        offSet: String(getOffset(page, pageSize)),
        size: String(pageSize),
        paymentType: 'SUCCESS',
        boardingPassStatus: 'ALL',
        isFilter: String(Boolean(appliedFilters.placeId || appliedFilters.shiftId || appliedFilters.zoneId || appliedFilters.startDate || appliedFilters.endDate)),
      })

      if (appliedFilters.placeId) params.set('placeId', appliedFilters.placeId)
      if (appliedFilters.shiftId) params.set('shiftId', appliedFilters.shiftId)
      if (appliedFilters.zoneId) params.set('zoneId', appliedFilters.zoneId)
      if (appliedFilters.startDate) params.set('startDay', String(new Date(`${appliedFilters.startDate}T00:00:00`).getTime()))
      if (appliedFilters.endDate) params.set('endDay', String(new Date(`${appliedFilters.endDate}T23:59:59`).getTime()))

      const response = await authFetch(`/finance/cancellation-refunds?${params.toString()}`, {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch cancellation refund data.'))

      const nextRows = extractRefundRows(payload)
      setRows(nextRows)
      setTotalRecords(extractTotalRecords(payload) || nextRows.length)
    } catch (loadError) {
      setRows([])
      setTotalRecords(0)
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch cancellation refund data.')
    } finally {
      setLoading(false)
    }
  }

  async function submitAction() {
    if (!actionState) return

    const isApprove = actionState.type === 'approve'
    if (!isApprove && !actionForm.transactionId.trim()) {
      setActionError('Transaction ID is required for reject.')
      return
    }
    if (!isApprove && !actionForm.statusReason.trim()) {
      setActionError('Reject reason is required.')
      return
    }

    setActionLoading(true)
    setActionError('')

    try {
      const payloadBody = {
        id: actionState.row.cancelledId,
        status: isApprove ? 'Approved' : 'Reject',
        statusReason: actionForm.statusReason.trim(),
        transactionId: actionForm.transactionId.trim() || '0',
        refundAmount: actionState.row.refundAmount,
        bookingId: actionState.row.bookingId,
      }

      const response = await authFetch('/finance/cancellation-refunds/status', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadBody),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to update cancellation refund status.'))

      setSuccessMessage(extractMessage(payload, isApprove ? 'Refund approved successfully.' : 'Refund rejected successfully.'))
      setActionState(null)
      setActionForm({ transactionId: '', statusReason: '' })
      await loadRows()
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Unable to update cancellation refund status.')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    loadPlaces()
  }, [])

  useEffect(() => {
    loadRows()
  }, [page, pageSize, appliedFilters])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    if (!draftFilters.placeId) {
      setShiftOptions([])
      setZoneOptions([])
      return
    }

    loadPlaceMeta(draftFilters.placeId)
  }, [draftFilters.placeId])

  return (
    <AdminShellLayout>
      <div className="min-h-full px-6 py-6 lg:px-8">
        <SectionHeader title="Finance / Cancellation Refund" />

        <div className="mb-6 overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 45%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}>
          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, color: '#fff' }}>
                <MapPin size={12} />
                Cancellation Refund
              </div>
              <h1 className="font-serif" style={{ fontSize: 28, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>Refund Management</h1>
              
            </div>

            <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
              <button onClick={() => setFilterOpen(true)} className="rounded-2xl px-4 py-3 font-medium text-white" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 13 }}>
                <span className="inline-flex items-center gap-2"><Filter size={15} />Filter</span>
              </button>
            </div>
          </div>

          <div className="grid gap-px sm:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
            {[
              { label: 'Visible Records', value: String(totalRecords) },
              { label: 'Selected Place', value: appliedFilters.placeName || 'All Places' },
              { label: 'Selected Shift', value: appliedFilters.shiftName || 'All Shifts' },
              { label: 'Selected Zone', value: appliedFilters.zoneName || 'All Zones' },
            ].map(card => (
              <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        {successMessage ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
        {error ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

        <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-serif" style={{ fontSize: 28, color: 'var(--text-dark)', fontWeight: 700 }}>Cancellation Refund Listing</div>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Search booking, place, account holder" className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-80" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
            </div>
          </div>

          {placesLoading || loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <RajasthanLoader label="Loading cancellation refunds..." />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: 'rgba(200,146,42,0.14)', color: 'var(--gold)' }}>
                <MapPin size={28} />
              </div>
              <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>No refund requests found</div>
              <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {searchText.trim() || appliedFilters.placeId || appliedFilters.shiftId || appliedFilters.zoneId || appliedFilters.startDate || appliedFilters.endDate
                  ? 'Try changing the current search or filter combination.'
                  : 'Apply filters to view cancellation refund requests.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--cream-dark)' }}>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead style={{ background: 'linear-gradient(180deg, #FBF6EF 0%, #F4EBDF 100%)' }}>
                      <tr>
                        {tableColumns.map(label => (
                          <th key={label} className="px-4 py-4 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, index) => (
                        <tr key={`${row.bookingId}-${row.cancelledId}-${index}`} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.bookingId}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDate(row.bookingDate)}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDate(row.createdDate)}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDate(row.cancelledDate)}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)' }}>{row.placeName || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.totalVisitors}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.shiftName || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.zoneName || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 220 }}>{row.cancelledReason || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.bankName || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.bankAccount || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.bankIfsc || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.bankAccountName || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: row.status.toLowerCase().includes('approve') ? '#1A7A6E' : row.status.toLowerCase().includes('reject') ? '#9F1F1F' : 'var(--text-mid)', fontWeight: 600 }}>{row.status || 'Pending'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 220 }}>{row.statusReason || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.emitraTransactionId || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{formatCurrency(row.totalAmount)}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: '#1A7A6E', fontWeight: 600 }}>{formatCurrency(row.refundAmount)}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.statusCreatedBy || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDate(row.statusChangedDate)}</td>
                          <td className="px-4 py-4">
                            <div className="relative">
                              <button
                                onClick={() => setMenuOpenFor(current => current === row.cancelledId ? null : row.cancelledId)}
                                className="rounded-xl p-2"
                                style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {menuOpenFor === row.cancelledId ? (
                                <div className="absolute right-0 top-[calc(100%+8px)] w-40 overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid var(--sand)', boxShadow: '0 20px 48px rgba(58,32,16,0.14)', zIndex: 20 }}>
                                  <button
                                    onClick={() => {
                                      setMenuOpenFor(null)
                                      setActionState({ type: 'approve', row })
                                      setActionForm({ transactionId: '', statusReason: '' })
                                      setActionError('')
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-3 text-left"
                                    style={{ fontSize: 13, color: '#1A7A6E' }}
                                  >
                                    <Check size={14} />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setMenuOpenFor(null)
                                      setActionState({ type: 'reject', row })
                                      setActionForm({ transactionId: '', statusReason: '' })
                                      setActionError('')
                                    }}
                                    className="flex w-full items-center gap-2 border-t px-4 py-3 text-left"
                                    style={{ fontSize: 13, color: '#9F1F1F', borderColor: 'var(--cream-dark)' }}
                                  >
                                    <X size={14} />
                                    Reject
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pager page={page} pageSize={pageSize} totalRecords={totalRecords} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1) }} />
            </>
          )}
        </div>
      </div>

      <FilterDialog
        open={filterOpen}
        places={places}
        values={draftFilters}
        shiftOptions={shiftOptions}
        zoneOptions={zoneOptions}
        loadingOptions={placeMetaLoading}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraftFilters(DEFAULT_FILTERS)
          setAppliedFilters(DEFAULT_FILTERS)
          setShiftOptions([])
          setZoneOptions([])
          setPage(1)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
      />

      <ActionDialog
        state={actionState}
        values={actionForm}
        error={actionError}
        loading={actionLoading}
        onChange={setActionForm}
        onClose={() => {
          setActionState(null)
          setActionError('')
        }}
        onSubmit={submitAction}
      />
    </AdminShellLayout>
  )
}
