'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, Calendar, ChevronLeft, ChevronRight, Download, MapPin, Search, SlidersHorizontal, Ticket, X } from 'lucide-react'

type RecordRow = Record<string, unknown>
type Department = Record<string, unknown>
type Place = Record<string, unknown>

type FilterState = {
  startDate: string
  endDate: string
  departmentId: string
  placeId: string
  bookingType: string
  transactionStatus: string
  ticketType: string
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

function formatMoney(value: number) {
  return `Rs. ${value.toLocaleString('en-IN')}`
}

function formatEpochDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-IN')
  }
  return toText(value, 'N/A')
}

function formatEpochDateTime(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return `${date.toLocaleDateString('en-IN')} | ${date.toLocaleTimeString('en-IN')}`
  }
  return toText(value, 'N/A')
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

function getAny(obj: unknown, keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key]
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')) return value
  }
  return undefined
}

function extractTotal(payload: unknown, fallback = 0) {
  if (!payload || typeof payload !== 'object') return fallback
  const root = payload as Record<string, any>
  const total = root?.result?.totalRecords ?? root?.result?.total ?? root?.totalRecords ?? root?.total
  return typeof total === 'number' && Number.isFinite(total) ? total : fallback
}

function departmentId(item: Department) {
  return toText(item.deptId ?? item.departmentId ?? item.id)
}

function departmentName(item: Department) {
  return toText(item.deptName ?? item.departmentName ?? item.name, 'Unnamed Department')
}

function placeId(item: Place) {
  return toText(item.placeId ?? item.id)
}

function placeName(item: Place) {
  return toText(item.placeName ?? item.place_name ?? item.name, 'Unnamed Place')
}

function csv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const content = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function SelectField({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  icon?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
        {icon}
        {label}
      </label>
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

function FilterModal({
  open,
  title,
  values,
  setValues,
  departments,
  places,
  showTicketType = true,
  showTransactionStatus = true,
  showBookingType = true,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean
  title: string
  values: FilterState
  setValues: React.Dispatch<React.SetStateAction<FilterState>>
  departments: Department[]
  places: Place[]
  showTicketType?: boolean
  showTransactionStatus?: boolean
  showBookingType?: boolean
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between rounded-t-2xl px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <div className="font-serif text-xl font-bold">{title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>Dynamic non-inventory report filters</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.14)' }}>
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

          <SelectField
            label="Department"
            icon={<Building2 size={12} />}
            value={values.departmentId}
            options={[{ value: '', label: 'All Departments' }, ...departments.map(item => ({ value: departmentId(item), label: departmentName(item) }))]}
            onChange={value => setValues(current => ({ ...current, departmentId: value, placeId: '' }))}
          />

          <SelectField
            label="Place"
            icon={<MapPin size={12} />}
            value={values.placeId}
            options={[{ value: '', label: 'All Places' }, ...places.map(item => ({ value: placeId(item), label: placeName(item) }))]}
            onChange={value => setValues(current => ({ ...current, placeId: value }))}
          />

          {showBookingType ? (
            <SelectField
              label="Booking Type"
              icon={<Ticket size={12} />}
              value={values.bookingType}
              options={[
                { value: 'ALL', label: 'All Booking Types' },
                { value: 'ONLINE', label: 'Online' },
                { value: 'KIOSK', label: 'Offline / Kiosk' },
                { value: 'COUNTER', label: 'Counter' },
              ]}
              onChange={value => setValues(current => ({ ...current, bookingType: value }))}
            />
          ) : null}

          {showTransactionStatus ? (
            <SelectField
              label="Payment Status"
              icon={<Calendar size={12} />}
              value={values.transactionStatus}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'SUCCESS', label: 'Success' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'REFUNDED', label: 'Refunded' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              onChange={value => setValues(current => ({ ...current, transactionStatus: value }))}
            />
          ) : null}

          {showTicketType ? (
            <SelectField
              label="Ticket Type"
              icon={<Ticket size={12} />}
              value={values.ticketType}
              options={[
                { value: '', label: 'All Ticket Types' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'COMPOSITE', label: 'Composite' },
              ]}
              onChange={value => setValues(current => ({ ...current, ticketType: value }))}
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

function useLookups(deptId: string) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [places, setPlaces] = useState<Place[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const response = await fetch('/api/dept?offset=0&size=200&export=false&searchKey=', { cache: 'no-store' })
        const payload = await response.json()
        if (active) setDepartments((findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object') as Department[])
      } catch {
        if (active) setDepartments([])
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const params = new URLSearchParams({ districtId: '', searchKey: '', deptList: deptId, size: '2000' })
        const response = await fetch(`/api/place?${params.toString()}`, { cache: 'no-store' })
        const payload = await response.json()
        if (active) setPlaces((findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object') as Place[])
      } catch {
        if (active) setPlaces([])
      }
    })()
    return () => { active = false }
  }, [deptId])

  return { departments, places }
}

function ReportCard({ label, value, solid }: { label: string; value: string; solid?: boolean }) {
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

function ReportShell({
  title,
  subtitle,
  search,
  setSearch,
  searchPlaceholder,
  filterCount,
  onOpenFilters,
  onExport,
  cards,
  children,
}: {
  title: string
  subtitle: string
  search?: string
  setSearch?: React.Dispatch<React.SetStateAction<string>>
  searchPlaceholder?: string
  filterCount: number
  onOpenFilters: () => void
  onExport: () => void
  cards: Array<{ label: string; value: string; solid?: boolean }>
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--sand)' }}>
        <div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>{title}</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {typeof search === 'string' && setSearch ? (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 240 }}>
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={searchPlaceholder ?? 'Search'}
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

      <div className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-4" style={{ background: 'var(--cream)' }}>
        {cards.map(card => <ReportCard key={card.label} label={card.label} value={card.value} solid={card.solid} />)}
      </div>

      {children}
    </div>
  )
}

function defaultFilters(start: string): FilterState {
  return {
    startDate: start,
    endDate: todayInput(),
    departmentId: '',
    placeId: '',
    bookingType: 'ALL',
    transactionStatus: 'ALL',
    ticketType: '',
  }
}

function useBasicState(start: string) {
  const base = useMemo(() => defaultFilters(start), [start])
  const [draftFilters, setDraftFilters] = useState<FilterState>(base)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(base)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  return { base, draftFilters, setDraftFilters, appliedFilters, setAppliedFilters, filterOpen, setFilterOpen, page, setPage, pageSize, setPageSize, search, setSearch }
}

function mapMisRow(row: RecordRow, index: number) {
  const ticketList = (getAny(row, ['ticketTypeListDtos', 'ticketTypeListDto', 'ticketTypes']) as RecordRow[] | undefined) ?? []
  const counts = { indianCitizen: 0, indianStudent: 0, foreignCitizen: 0, foreignStudent: 0 }

  for (const item of ticketList) {
    const name = toText(getAny(item, ['ticketTypeName', 'ticketName', 'name'])).toLowerCase().replace(/[^a-z]/g, '')
    const count = toNumber(getAny(item, ['ticketCount', 'count', 'quantity']))
    if (name.includes('indiancitizen')) counts.indianCitizen += count
    else if (name.includes('indianstudent')) counts.indianStudent += count
    else if (name.includes('foreigncitizen')) counts.foreignCitizen += count
    else if (name.includes('foreignstudent')) counts.foreignStudent += count
  }

  return {
    srNo: index + 1,
    bookingDate: formatEpochDateTime(getAny(row, ['bookingDate', 'booking_date'])),
    visitDate: formatEpochDate(getAny(row, ['visitDate', 'visit_date'])),
    bookingId: toText(getAny(row, ['bookingId', 'booking_id', 'consumerKey']), `ROW-${index + 1}`),
    transactionId: toText(getAny(row, ['emitraTransactionId', 'emitraTxnId', 'transactionId']), 'N/A'),
    districtName: toText(getAny(row, ['districtName', 'district_name']), 'N/A'),
    placeName: toText(getAny(row, ['placeName', 'place_name']), 'N/A'),
    packageName: toText(getAny(row, ['packageName', 'compositePackageName', 'ticketName']), 'N/A'),
    totalAmount: toNumber(getAny(row, ['totalAmount', 'amount'])),
    totalVisitors: toNumber(getAny(row, ['totalVisitors', 'visitors']), counts.indianCitizen + counts.indianStudent + counts.foreignCitizen + counts.foreignStudent),
    addOnCount: toNumber(getAny(row, ['addOnCount', 'addonCount'])),
    addOnSum: toNumber(getAny(row, ['addOnSum', 'addonSum'])),
    bookingMode: toText(getAny(row, ['bookingMode', 'mode']), 'ONLINE'),
    status: toText(getAny(row, ['transactionStatus', 'paymentStatus', 'status']), 'SUCCESS'),
    createdBy: toText(getAny(row, ['createdBy', 'created_by']), 'Guest User'),
    ...counts,
  }
}

function MisView({ composite = false }: { composite?: boolean }) {
  const state = useBasicState(todayInput())
  const { departments, places } = useLookups(state.filterOpen ? state.draftFilters.departmentId : state.appliedFilters.departmentId)
  const [rows, setRows] = useState<ReturnType<typeof mapMisRow>[]>([])
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
          bookingType: state.appliedFilters.bookingType === 'ALL' ? '' : state.appliedFilters.bookingType,
          divisionId: '',
          districtId: '',
          endDay: String(endMs(state.appliedFilters.endDate)),
          offSet: String(state.page),
          placeId: state.appliedFilters.placeId,
          size: String(state.pageSize),
          startDay: String(startMs(state.appliedFilters.startDate)),
          transactionStatus: state.appliedFilters.transactionStatus === 'ALL' ? '' : state.appliedFilters.transactionStatus,
          departmentId: state.appliedFilters.departmentId,
          isFilter: 'true',
          printCount: 'ALL',
          searchKey: state.search.trim(),
          ticketType: composite ? 'COMPOSITE' : state.appliedFilters.ticketType,
          ticketTypes: composite ? 'COMPOSITE' : state.appliedFilters.ticketType,
        })
        const response = await fetch(`/api/non-inventory/reports/mis_V3?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const data = (findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object').map((item, index) => mapMisRow(item as RecordRow, index))
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
  }, [composite, state.appliedFilters, state.page, state.pageSize, state.search])

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.totalAmount, 0), [rows])
  const totalVisitors = useMemo(() => rows.reduce((sum, row) => sum + row.totalVisitors, 0), [rows])
  const totalAddOns = useMemo(() => rows.reduce((sum, row) => sum + row.addOnCount, 0), [rows])
  const filterCount = [state.appliedFilters.departmentId, state.appliedFilters.placeId, state.appliedFilters.bookingType !== 'ALL' ? state.appliedFilters.bookingType : '', state.appliedFilters.transactionStatus !== 'ALL' ? state.appliedFilters.transactionStatus : '', composite ? 'COMPOSITE' : state.appliedFilters.ticketType].filter(Boolean).length

  return (
    <>
      <ReportShell
        title={composite ? 'Composite MIS Report' : 'MIS Report'}
        subtitle={composite ? 'Non-Inventory Reports · Composite package booking MIS' : 'Non-Inventory Reports · Booking-level management information system'}
        search={state.search}
        setSearch={state.setSearch}
        searchPlaceholder="Search booking ID / transaction ID"
        filterCount={filterCount}
        onOpenFilters={() => state.setFilterOpen(true)}
        onExport={() => csv(`${composite ? 'composite' : 'non-inventory'}-mis-${Date.now()}.csv`, ['Booking ID', 'Place', ...(composite ? ['Package'] : []), 'Amount', 'Visitors', 'Status'], rows.map(row => [row.bookingId, row.placeName, ...(composite ? [row.packageName] : []), row.totalAmount, row.totalVisitors, row.status]))}
        cards={[
          { label: 'Rows Loaded', value: rows.length.toLocaleString('en-IN') },
          { label: 'Total Amount', value: formatMoney(totalAmount), solid: true },
          { label: 'Visitors', value: totalVisitors.toLocaleString('en-IN') },
          { label: 'Add Ons', value: totalAddOns.toLocaleString('en-IN') },
        ]}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Booking Date', 'Visit Date', 'Booking ID', 'Transaction ID', 'District', 'Place', ...(composite ? ['Package'] : []), 'Amount', 'Visitors', 'Mode', 'Status', 'Created By'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: header === 'Amount' || header === 'Visitors' ? 'right' : 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={composite ? 13 : 12} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading MIS report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={composite ? 13 : 12} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && rows.length === 0 ? <tr><td colSpan={composite ? 13 : 12} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && rows.map(row => (
                <tr key={`${row.bookingId}-${row.srNo}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(state.page - 1) * state.pageSize + row.srNo}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.bookingDate}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.visitDate}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.bookingId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.transactionId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.districtName}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.placeName}</td>
                  {composite ? <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.packageName}</td> : null}
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.totalAmount)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{row.totalVisitors}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.bookingMode}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.status}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageControls page={state.page} setPage={state.setPage} pageSize={state.pageSize} setPageSize={state.setPageSize} total={total || rows.length} />
      </ReportShell>

      <FilterModal
        open={state.filterOpen}
        title={composite ? 'Filter Composite MIS Report' : 'Filter MIS Report'}
        values={state.draftFilters}
        setValues={state.setDraftFilters}
        departments={departments}
        places={places}
        showTicketType={!composite}
        onApply={() => {
          state.setAppliedFilters(state.draftFilters)
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onReset={() => {
          state.setDraftFilters(state.base)
          state.setAppliedFilters(state.base)
          state.setSearch('')
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onClose={() => state.setFilterOpen(false)}
      />
    </>
  )
}

function mapPlaceRow(row: RecordRow, index: number) {
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

function monthStartMs(month: string) {
  const date = new Date(month + "-01")
  return date.getTime()
}

function monthEndMs(month: string) {
  const date = new Date(month + "-01")
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )
  return end.getTime()
}




function PlaceSummaryView({ title, reportPath, start }: { title: string; reportPath: string; start: string }) {
  const state = useBasicState(start)
  state.base.transactionStatus = 'SUCCESS'
  state.base.ticketType = 'NORMAL'
  const { departments, places } = useLookups(state.filterOpen ? state.draftFilters.departmentId : state.appliedFilters.departmentId)
  const [rows, setRows] = useState<ReturnType<typeof mapPlaceRow>[]>([])
  const [totals, setTotals] = useState<{ bookings: number; amount: number; amountWithAddOn: number; visitors: number; ticketCounts: Record<string, number>; ticketAmounts: Record<string, number> }>({ bookings: 0, amount: 0, amountWithAddOn: 0, visitors: 0, ticketCounts: {}, ticketAmounts: {} })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
      if (!departments.length) return; // ✅ prevents empty departmentId

    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          divisionId: '',
          districtId: '',
          endDay: String(endMs(state.appliedFilters.endDate)),
          offSet: String(state.page-1),
          placeId: state.appliedFilters.placeId,
          size: String(state.pageSize),
          startDay: String(startMs(state.appliedFilters.startDate)),
          ticketType: state.appliedFilters.ticketType || 'NORMAL',
          departmentId:state.appliedFilters.departmentId ||departments.map(d => d.id).join(','),    
          transactionStatus: state.appliedFilters.transactionStatus === 'ALL' ? 'SUCCESS' : state.appliedFilters.transactionStatus,
          bookingType: state.appliedFilters.bookingType === 'ALL' ? '' : state.appliedFilters.bookingType,
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
            ticketCounts: (result.totalTicketCount ?? {}) as Record<string, number>,
            ticketAmounts: (result.totalTicketAmount ?? {}) as Record<string, number>,
          })
          setTotal(extractTotal(payload, data.length))
        }
      } catch (err) {
        if (active) {
          setRows([])
          setTotals({ bookings: 0, amount: 0, amountWithAddOn: 0, visitors: 0, ticketCounts: {}, ticketAmounts: {} })
          setTotal(0)
          setError(err instanceof Error ? err.message : 'Unable to load report.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [reportPath, state.appliedFilters, state.page, state.pageSize])

  const ticketLabels = useMemo(() => Array.from(new Set(rows.flatMap(row => Object.keys(row.counts)))), [rows])
  const filterCount = [state.appliedFilters.departmentId, state.appliedFilters.placeId, state.appliedFilters.bookingType !== 'ALL' ? state.appliedFilters.bookingType : '', state.appliedFilters.transactionStatus !== 'ALL' ? state.appliedFilters.transactionStatus : '', state.appliedFilters.ticketType].filter(Boolean).length
  const hasPurchasePlace = rows.some(row => row.purchasePlaceName)

  return (
    <>
      <ReportShell
        title={title}
        subtitle={`Non-Inventory Reports · ${title === 'Day Wise Report' ? 'Place-wise daily booking and visitor aggregation' : 'Place-wise monthly booking and ticket summary'}`}
        filterCount={filterCount}
        onOpenFilters={() => state.setFilterOpen(true)}
        onExport={() => csv(`${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`, ['Place', 'Booking', 'Amount', 'Visitors'], rows.map(row => [row.placeName, row.totalBooking, row.totalAmount, row.totalVisitors]))}
        cards={[
          { label: 'Places', value: rows.length.toLocaleString('en-IN') },
          { label: 'Total Booking', value: totals.bookings.toLocaleString('en-IN') },
          { label: 'Total Amount', value: formatMoney(totals.amount), solid: true },
          { label: 'Visitors', value: totals.visitors.toLocaleString('en-IN') },
        ]}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Place Name', ...(hasPurchasePlace ? ['Purchase Place'] : []), 'Total Booking', 'Amount With Add On', 'Total Amount', ...ticketLabels, ...ticketLabels.map(label => `${label} Amount`), 'Total Visitors'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: header.includes('Place') ? 'left' : 'right', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
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
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(state.page - 1) * state.pageSize + row.srNo}</td>
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
        <PageControls page={state.page} setPage={state.setPage} pageSize={state.pageSize} setPageSize={state.setPageSize} total={total || rows.length} />
      </ReportShell>

      <FilterModal
        open={state.filterOpen}
        title={`Filter ${title}`}
        values={state.draftFilters}
        setValues={state.setDraftFilters}
        departments={departments}
        places={places}
        onApply={() => {
          state.setAppliedFilters(state.draftFilters)
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onReset={() => {
          state.setDraftFilters(state.base)
          state.setAppliedFilters(state.base)
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onClose={() => state.setFilterOpen(false)}
      />
    </>
  )
}

function HeadWiseView() {
  const state = useBasicState(todayInput())
  const { departments, places } = useLookups(state.filterOpen ? state.draftFilters.departmentId : state.appliedFilters.departmentId)
  const [rows, setRows] = useState<Array<{ srNo: number; emitraId: string; name: string; amount: number }>>([])
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
          endDay: String(endMs(state.appliedFilters.endDate)),
          offSet: String(state.page),
          size: String(state.pageSize),
          startDay: String(startMs(state.appliedFilters.startDate)),
          placeId: state.appliedFilters.placeId,
          ticketType: state.appliedFilters.ticketType || 'NORMAL',
          departmentId: state.appliedFilters.departmentId,
          bookingType: state.appliedFilters.bookingType === 'ALL' ? '' : state.appliedFilters.bookingType,
          isFilter: 'true',
          transactionStatus: state.appliedFilters.transactionStatus === 'ALL' ? '' : state.appliedFilters.transactionStatus,
          searchKey: state.search.trim(),
        })
        const response = await fetch(`/api/non-inventory/reports/head?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const data = (findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object').map((item, index) => ({
          srNo: index + 1,
          emitraId: toText(getAny(item, ['emitraId', 'emitraID', 'headId', 'id']), `HEAD-${index + 1}`),
          name: toText(getAny(item, ['name', 'headName', 'head_name']), 'Unnamed Head'),
          amount: toNumber(getAny(item, ['amount', 'totalAmount', 'headAmount'])),
        }))
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
  }, [state.appliedFilters, state.page, state.pageSize, state.search])

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows])
  const filterCount = [state.appliedFilters.departmentId, state.appliedFilters.placeId, state.appliedFilters.bookingType !== 'ALL' ? state.appliedFilters.bookingType : '', state.appliedFilters.transactionStatus !== 'ALL' ? state.appliedFilters.transactionStatus : '', state.appliedFilters.ticketType].filter(Boolean).length

  return (
    <>
      <ReportShell
        title="Head Wise Report"
        subtitle="Non-Inventory Reports · Head-wise collection summary"
        search={state.search}
        setSearch={state.setSearch}
        searchPlaceholder="Search head name / Emitra ID"
        filterCount={filterCount}
        onOpenFilters={() => state.setFilterOpen(true)}
        onExport={() => csv(`non-inventory-head-wise-${Date.now()}.csv`, ['Emitra ID', 'Head', 'Amount'], rows.map(row => [row.emitraId, row.name, row.amount]))}
        cards={[
          { label: 'Heads', value: rows.length.toLocaleString('en-IN') },
          { label: 'Total Amount', value: formatMoney(totalAmount), solid: true },
          { label: 'Filtered Department', value: state.appliedFilters.departmentId ? 'Selected' : 'All' },
          { label: 'Payment Status', value: state.appliedFilters.transactionStatus === 'ALL' ? 'All' : state.appliedFilters.transactionStatus },
        ]}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Emitra ID', 'Head Name', 'Amount'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: header === 'Amount' ? 'right' : 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading head-wise report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && rows.length === 0 ? <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && rows.map(row => (
                <tr key={`${row.emitraId}-${row.srNo}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(state.page - 1) * state.pageSize + row.srNo}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.emitraId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.name}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageControls page={state.page} setPage={state.setPage} pageSize={state.pageSize} setPageSize={state.setPageSize} total={total || rows.length} />
      </ReportShell>

      <FilterModal
        open={state.filterOpen}
        title="Filter Head Wise Report"
        values={state.draftFilters}
        setValues={state.setDraftFilters}
        departments={departments}
        places={places}
        onApply={() => {
          state.setAppliedFilters(state.draftFilters)
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onReset={() => {
          state.setDraftFilters(state.base)
          state.setAppliedFilters(state.base)
          state.setSearch('')
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onClose={() => state.setFilterOpen(false)}
      />
    </>
  )
}

function SummaryView() {
  const state = useBasicState(todayInput())
  const { departments, places } = useLookups(state.filterOpen ? state.draftFilters.departmentId : state.appliedFilters.departmentId)
  const [rows, setRows] = useState<Array<{ placeName: string; addOnDetails: Array<{ name: string; quantity: number; totalAmount: number }> }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          departmentId: state.appliedFilters.departmentId,
          districtId: '',
          divisionId: '',
          endDay: String(endMs(state.appliedFilters.endDate)),
          isFilter: 'true',
          offSet: '0',
          pagination: 'true',
          placeId: state.appliedFilters.placeId,
          size: '200',
          startDay: String(startMs(state.appliedFilters.startDate)),
          transactionStatus: state.appliedFilters.transactionStatus === 'ALL' ? '' : state.appliedFilters.transactionStatus,
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
  }, [state.appliedFilters])

  const totalQuantity = useMemo(() => rows.reduce((sum, row) => sum + row.addOnDetails.reduce((inner, item) => inner + item.quantity, 0), 0), [rows])
  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.addOnDetails.reduce((inner, item) => inner + item.totalAmount, 0), 0), [rows])
  const filterCount = [state.appliedFilters.departmentId, state.appliedFilters.placeId, state.appliedFilters.transactionStatus !== 'ALL' ? state.appliedFilters.transactionStatus : ''].filter(Boolean).length

  return (
    <>
      <ReportShell
        title="Summary Report"
        subtitle="Non-Inventory Reports · Add-on summary grouped by place"
        filterCount={filterCount}
        onOpenFilters={() => state.setFilterOpen(true)}
        onExport={() => csv(`non-inventory-summary-${Date.now()}.csv`, ['Place', 'Add On', 'Quantity', 'Amount'], rows.flatMap(row => row.addOnDetails.map(item => [row.placeName, item.name, item.quantity, item.totalAmount])))}
        cards={[
          { label: 'Places', value: rows.length.toLocaleString('en-IN') },
          { label: 'Add On Lines', value: rows.reduce((sum, row) => sum + row.addOnDetails.length, 0).toLocaleString('en-IN') },
          { label: 'Total Quantity', value: totalQuantity.toLocaleString('en-IN') },
          { label: 'Total Amount', value: formatMoney(totalAmount), solid: true },
        ]}
      >
        <div className="space-y-4 px-6 pb-6">
          {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading summary report...</div> : null}
          {!loading && error ? <div style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</div> : null}
          {!loading && !error && rows.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</div> : null}
          {!loading && !error && rows.map(row => (
            <div key={row.placeName} className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--sand)' }}>
              <div className="px-4 py-3 font-semibold" style={{ background: 'rgba(139,26,26,0.06)', color: 'var(--maroon)' }}>{row.placeName}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream-dark)' }}>
                    {['Add On Name', 'Quantity', 'Amount'].map(header => <th key={header} style={{ padding: '10px 14px', textAlign: header === 'Add On Name' ? 'left' : 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{header}</th>)}
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
      </ReportShell>

      <FilterModal
        open={state.filterOpen}
        title="Filter Summary Report"
        values={state.draftFilters}
        setValues={state.setDraftFilters}
        departments={departments}
        places={places}
        showBookingType={false}
        showTicketType={false}
        onApply={() => {
          state.setAppliedFilters(state.draftFilters)
          state.setFilterOpen(false)
        }}
        onReset={() => {
          state.setDraftFilters(state.base)
          state.setAppliedFilters(state.base)
          state.setFilterOpen(false)
        }}
        onClose={() => state.setFilterOpen(false)}
      />
    </>
  )
}

function RefundView() {
  const state = useBasicState(todayInput())
  state.base.transactionStatus = 'SUCCESS'
  state.base.ticketType = 'NORMAL'
  const { departments, places } = useLookups(state.filterOpen ? state.draftFilters.departmentId : state.appliedFilters.departmentId)
  const [rows, setRows] = useState<Array<{ srNo: number; bookingId: string; transactionId: string; placeName: string; bookingDate: string; amount: number; status: string }>>([])
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
          bookingType: state.appliedFilters.bookingType === 'ALL' ? '' : state.appliedFilters.bookingType,
          divisionId: '',
          districtId: '',
          endDay: String(endMs(state.appliedFilters.endDate)),
          offSet: String(state.page),
          placeId: state.appliedFilters.placeId,
          size: String(state.pageSize),
          startDay: String(startMs(state.appliedFilters.startDate)),
          ticketType: state.appliedFilters.ticketType || 'NORMAL',
          transactionStatus: state.appliedFilters.transactionStatus === 'ALL' ? '' : state.appliedFilters.transactionStatus,
          departmentId: state.appliedFilters.departmentId,
          isFilter: 'true',
          searchKey: state.search.trim(),
        })
        const response = await fetch(`/api/non-inventory/reports/refund?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const data = (findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object').map((item, index) => ({
          srNo: index + 1,
          bookingId: toText(getAny(item, ['bookingId', 'booking_id']), `ROW-${index + 1}`),
          transactionId: toText(getAny(item, ['transactionId', 'emitraTransactionId', 'emitraTxnId']), 'N/A'),
          placeName: toText(getAny(item, ['placeName', 'place_name']), 'N/A'),
          bookingDate: formatEpochDateTime(getAny(item, ['bookingDate', 'booking_date'])),
          amount: toNumber(getAny(item, ['totalAmount', 'amount'])),
          status: toText(getAny(item, ['transactionStatus', 'paymentStatus', 'status']), 'SUCCESS'),
        }))
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
  }, [state.appliedFilters, state.page, state.pageSize, state.search])

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows])
  const filterCount = [state.appliedFilters.departmentId, state.appliedFilters.placeId, state.appliedFilters.bookingType !== 'ALL' ? state.appliedFilters.bookingType : '', state.appliedFilters.transactionStatus !== 'ALL' ? state.appliedFilters.transactionStatus : '', state.appliedFilters.ticketType].filter(Boolean).length

  return (
    <>
      <ReportShell
        title="Refund Report"
        subtitle="Non-Inventory Reports · Refunded and refund-tracked bookings"
        search={state.search}
        setSearch={state.setSearch}
        searchPlaceholder="Search booking ID / transaction ID"
        filterCount={filterCount}
        onOpenFilters={() => state.setFilterOpen(true)}
        onExport={() => csv(`non-inventory-refund-${Date.now()}.csv`, ['Booking ID', 'Transaction ID', 'Place', 'Booking Date', 'Amount', 'Status'], rows.map(row => [row.bookingId, row.transactionId, row.placeName, row.bookingDate, row.amount, row.status]))}
        cards={[
          { label: 'Rows Loaded', value: rows.length.toLocaleString('en-IN') },
          { label: 'Total Amount', value: formatMoney(totalAmount), solid: true },
          { label: 'Payment Status', value: state.appliedFilters.transactionStatus === 'ALL' ? 'All' : state.appliedFilters.transactionStatus },
          { label: 'Booking Type', value: state.appliedFilters.bookingType === 'ALL' ? 'All' : state.appliedFilters.bookingType },
        ]}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Booking ID', 'Transaction ID', 'Place Name', 'Booking Date', 'Amount', 'Status'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: header === 'Amount' ? 'right' : 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading refund report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && rows.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && rows.map(row => (
                <tr key={`${row.bookingId}-${row.srNo}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(state.page - 1) * state.pageSize + row.srNo}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.bookingId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.transactionId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.placeName}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.bookingDate}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.amount)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageControls page={state.page} setPage={state.setPage} pageSize={state.pageSize} setPageSize={state.setPageSize} total={total || rows.length} />
      </ReportShell>

      <FilterModal
        open={state.filterOpen}
        title="Filter Refund Report"
        values={state.draftFilters}
        setValues={state.setDraftFilters}
        departments={departments}
        places={places}
        onApply={() => {
          state.setAppliedFilters(state.draftFilters)
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onReset={() => {
          state.setDraftFilters(state.base)
          state.setAppliedFilters(state.base)
          state.setSearch('')
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onClose={() => state.setFilterOpen(false)}
      />
    </>
  )
}

function HeadDetailView() {
  const state = useBasicState(todayInput())
  state.base.transactionStatus = 'SUCCESS'
  const { departments, places } = useLookups(state.filterOpen ? state.draftFilters.departmentId : state.appliedFilters.departmentId)
  const [rows, setRows] = useState<Array<{ bookingId: string; bookingDate: string; placeName: string; paymentStatus: string; amounts: Array<{ label: string; value: number }> }>>([])
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
          bookingType: state.appliedFilters.bookingType === 'ALL' ? '' : state.appliedFilters.bookingType,
          divisionId: '',
          districtId: '',
          endDay: String(endMs(state.appliedFilters.endDate)),
          offSet: String(state.page),
          placeId: state.appliedFilters.placeId,
          size: String(state.pageSize),
          startDay: String(startMs(state.appliedFilters.startDate)),
          transactionStatus: state.appliedFilters.transactionStatus === 'ALL' ? '' : state.appliedFilters.transactionStatus,
          departmentId: state.appliedFilters.departmentId,
          isFilter: 'true',
          searchKey: state.search.trim(),
          printCount: 'ALL',
          ticketType: state.appliedFilters.ticketType,
        })
        const response = await fetch(`/api/non-inventory/reports/head-detail?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const amountKeys = ['totalDepartmentCharge', 'totalDevelopmentFee', 'totalEmitraFee', 'totalEntryFee', 'totalForestCommission', 'totalFoundationFee', 'totalGstFee', 'totalJaipurMetro', 'totalMembers', 'totalMonumentOtherThanJaipurFee', 'totalMuseumAndMonumentJaipurFee', 'totalMuseumOtherThanJaipurFee', 'totalRislFee', 'totalRtdcDepartmentFee', 'totalTdsFee', 'totalZooTrustSurcharge']
        const data = (findFirstArray(payload) ?? []).filter(item => item && typeof item === 'object').map(item => ({
          bookingId: toText(getAny(item, ['bookingId', 'booking_id']), 'N/A'),
          bookingDate: formatEpochDateTime(getAny(item, ['bookingDate', 'booking_date'])),
          placeName: toText(getAny(item, ['placeName', 'place_name']), 'N/A'),
          paymentStatus: toText(getAny(item, ['paymentStatus', 'transactionStatus', 'status']), 'N/A'),
          amounts: amountKeys.filter(key => toNumber((item as RecordRow)[key]) !== 0).map(key => ({ label: key, value: toNumber((item as RecordRow)[key]) })),
        }))
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
  }, [state.appliedFilters, state.page, state.pageSize, state.search])

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.amounts.reduce((inner, item) => inner + item.value, 0), 0), [rows])
  const filterCount = [state.appliedFilters.departmentId, state.appliedFilters.placeId, state.appliedFilters.bookingType !== 'ALL' ? state.appliedFilters.bookingType : '', state.appliedFilters.transactionStatus !== 'ALL' ? state.appliedFilters.transactionStatus : ''].filter(Boolean).length

  return (
    <>
      <ReportShell
        title="Head Wise Detail Report"
        subtitle="Non-Inventory Reports · Booking-wise fee head breakup"
        search={state.search}
        setSearch={state.setSearch}
        searchPlaceholder="Search booking ID"
        filterCount={filterCount}
        onOpenFilters={() => state.setFilterOpen(true)}
        onExport={() => csv(`non-inventory-head-detail-${Date.now()}.csv`, ['Booking ID', 'Place', 'Payment Status', 'Head', 'Amount'], rows.flatMap(row => row.amounts.map(item => [row.bookingId, row.placeName, row.paymentStatus, item.label, item.value])))}
        cards={[
          { label: 'Bookings', value: rows.length.toLocaleString('en-IN') },
          { label: 'Head Entries', value: rows.reduce((sum, row) => sum + row.amounts.length, 0).toLocaleString('en-IN') },
          { label: 'Total Amount', value: formatMoney(totalAmount), solid: true },
          { label: 'Payment Status', value: state.appliedFilters.transactionStatus === 'ALL' ? 'All' : state.appliedFilters.transactionStatus },
        ]}
      >
        <div className="space-y-4 px-6 pb-6">
          {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading head-wise detail report...</div> : null}
          {!loading && error ? <div style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</div> : null}
          {!loading && !error && rows.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</div> : null}
          {!loading && !error && rows.map(row => (
            <div key={`${row.bookingId}-${row.bookingDate}`} className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: 'rgba(139,26,26,0.06)' }}>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--maroon)' }}>{row.bookingId}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.placeName} · {row.bookingDate}</div>
                </div>
                <div className="rounded-full px-3 py-1" style={{ fontSize: 11, background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}>{row.paymentStatus}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream-dark)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Head</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {row.amounts.length === 0 ? <tr><td colSpan={2} style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>No non-zero head amounts for this booking.</td></tr> : null}
                  {row.amounts.map(item => (
                    <tr key={`${row.bookingId}-${item.label}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                      <td style={{ padding: '9px 14px', fontSize: 11 }}>{item.label}</td>
                      <td style={{ padding: '9px 14px', fontSize: 11, textAlign: 'right' }}>{formatMoney(item.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <PageControls page={state.page} setPage={state.setPage} pageSize={state.pageSize} setPageSize={state.setPageSize} total={total || rows.length} />
      </ReportShell>

      <FilterModal
        open={state.filterOpen}
        title="Filter Head Wise Detail Report"
        values={state.draftFilters}
        setValues={state.setDraftFilters}
        departments={departments}
        places={places}
        onApply={() => {
          state.setAppliedFilters(state.draftFilters)
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onReset={() => {
          state.setDraftFilters(state.base)
          state.setAppliedFilters(state.base)
          state.setSearch('')
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onClose={() => state.setFilterOpen(false)}
      />
    </>
  )
}

function LspView() {
  const state = useBasicState(todayInput())
  const { departments, places } = useLookups(state.filterOpen ? state.draftFilters.departmentId : state.appliedFilters.departmentId)
  const [rows, setRows] = useState<Array<{ srNo: number; ssoId: string; kioskId: string; districtName: string; placeName: string; firstLogin: string; lastLogin: string }>>([])
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
          districtId: '',
          endDay: String(endMs(state.appliedFilters.endDate)),
          offSet: String(state.page),
          pagination: 'true',
          placeId: state.appliedFilters.placeId,
          searchKey: state.search.trim(),
          size: String(state.pageSize),
          startDay: String(startMs(state.appliedFilters.startDate)),
          bookingType: state.appliedFilters.bookingType === 'ALL' ? '' : state.appliedFilters.bookingType,
          isFilter: 'true',
        })
        const response = await fetch(`/api/non-inventory/reports/lsp?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const source = (((payload as any)?.result?.lspReportDtos ?? findFirstArray(payload)) ?? []) as RecordRow[]
        const data = source.filter(item => item && typeof item === 'object').map((item, index) => ({
          srNo: index + 1,
          ssoId: toText(getAny(item, ['ssoId', 'sso_id']), 'N/A'),
          kioskId: toText(getAny(item, ['kioskId', 'kiosk_id']), '-'),
          districtName: toText(getAny(item, ['districtName', 'district_name']), 'N/A'),
          placeName: toText(getAny(item, ['placeName', 'place_name']), 'N/A'),
          firstLogin: formatEpochDateTime(getAny(item, ['firstLogin', 'first_login'])),
          lastLogin: formatEpochDateTime(getAny(item, ['lastLogin', 'last_login'])),
        }))
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
  }, [state.appliedFilters, state.page, state.pageSize, state.search])

  const filterCount = [state.appliedFilters.placeId, state.appliedFilters.bookingType !== 'ALL' ? state.appliedFilters.bookingType : ''].filter(Boolean).length

  return (
    <>
      <ReportShell
        title="LSP Report"
        subtitle="Non-Inventory Reports · Kiosk session and login performance"
        search={state.search}
        setSearch={state.setSearch}
        searchPlaceholder="Search SSO ID"
        filterCount={filterCount}
        onOpenFilters={() => state.setFilterOpen(true)}
        onExport={() => csv(`non-inventory-lsp-${Date.now()}.csv`, ['SSO ID', 'Kiosk ID', 'District', 'Place', 'First Login', 'Last Login'], rows.map(row => [row.ssoId, row.kioskId, row.districtName, row.placeName, row.firstLogin, row.lastLogin]))}
        cards={[
          { label: 'Rows Loaded', value: rows.length.toLocaleString('en-IN') },
          { label: 'Filtered Place', value: state.appliedFilters.placeId ? 'Selected' : 'All' },
          { label: 'Booking Type', value: state.appliedFilters.bookingType === 'ALL' ? 'All' : state.appliedFilters.bookingType },
          { label: 'Search Key', value: state.search || 'None', solid: true },
        ]}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'SSO ID', 'Kiosk ID', 'District Name', 'Place Name', 'First Login', 'Last Login'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading LSP report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && rows.length === 0 ? <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && rows.map(row => (
                <tr key={`${row.ssoId}-${row.srNo}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(state.page - 1) * state.pageSize + row.srNo}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.ssoId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.kioskId}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.districtName}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.placeName}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.firstLogin}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{row.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageControls page={state.page} setPage={state.setPage} pageSize={state.pageSize} setPageSize={state.setPageSize} total={total || rows.length} />
      </ReportShell>

      <FilterModal
        open={state.filterOpen}
        title="Filter LSP Report"
        values={state.draftFilters}
        setValues={state.setDraftFilters}
        departments={departments}
        places={places}
        showTransactionStatus={false}
        showTicketType={false}
        onApply={() => {
          state.setAppliedFilters(state.draftFilters)
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onReset={() => {
          state.setDraftFilters(state.base)
          state.setAppliedFilters(state.base)
          state.setSearch('')
          state.setPage(1)
          state.setFilterOpen(false)
        }}
        onClose={() => state.setFilterOpen(false)}
      />
    </>
  )
}

export function NonInventoryDayWiseReportView() {
  return <PlaceSummaryView title="Day Wise Report" reportPath="/api/non-inventory/reports/daywise" start={todayInput()} />
}

export function NonInventoryMonthWiseReportView() {
  return <PlaceSummaryView title="Month Wise Report" reportPath="/api/non-inventory/reports/monthwise" start={monthStartInput()} />
}

export function NonInventoryMisReportView() {
  return <MisView />
}

export function NonInventoryCompositeMisReportView() {
  return <MisView composite />
}

export function NonInventoryHeadWiseReportView() {
  return <HeadWiseView />
}

export function NonInventorySummaryReportView() {
  return <SummaryView />
}

export function NonInventoryRefundReportView() {
  return <RefundView />
}

export function NonInventoryHeadWiseDetailReportView() {
  return <HeadDetailView />
}

export function NonInventoryLspReportView() {
  return <LspView />
}
