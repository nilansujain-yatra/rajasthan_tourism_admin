'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Search,
  SlidersHorizontal,
  Ticket,
  X,
} from 'lucide-react'

export interface HeadWiseRow {
  srNo: number
  emitraId: number | string
  name: string
  amount: number
}

type Department = {
  deptId?: string | number
  deptName?: string
  id?: string | number
  name?: string
  [key: string]: unknown
}

type Place = {
  placeId?: string | number
  placeName?: string
  id?: string | number
  name?: string
  [key: string]: unknown
}

type FilterState = {
  dateType: 'visit' | 'booking'
  startDate: string
  endDate: string
  departmentId: string
  placeId: string
  transactionStatus: 'ALL' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
}

type ApiRow = Record<string, unknown>

const SAMPLE_DATA: HeadWiseRow[] = [
  { srNo: 1, emitraId: 879, name: 'DEPARTMENT CHARGES', amount: 1252137 },
  { srNo: 2, emitraId: 6342, name: 'Member Entry Fee', amount: 175915 },
  { srNo: 3, emitraId: 6363, name: 'Member Eco-surcharge', amount: 220345 },
  { srNo: 4, emitraId: 6362, name: 'Vehicle Entry Fee', amount: 32963 },
]

function getTodayDateInput() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDayStartMs(value: string) {
  return new Date(`${value}T00:00:00.000`).getTime()
}

function getDayEndMs(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime()
}

function getDepartmentId(dept: Department) {
  const candidate =
    dept.deptId ??
    (dept as any).departmentId ??
    dept.id ??
    (dept as any).dept_id ??
    (dept as any).department_id ??
    (dept as any).deptCode ??
    (dept as any).departmentCode

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  return getDepartmentName(dept)
}

function getDepartmentName(dept: Department) {
  const candidate =
    dept.deptName ??
    (dept as any).departmentName ??
    dept.name ??
    (dept as any).dept_nm ??
    (dept as any).department_nm ??
    (dept as any).deptDesc ??
    (dept as any).departmentDesc

  return typeof candidate === 'string' ? candidate.trim() : ''
}

function getPlaceId(place: Place) {
  const candidate =
    place.id ??
    (place as any).id ??
    place.placeId ??
    (place as any).place_id ??
    (place as any).placeCode ??
    (place as any).placecode

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  return getPlaceName(place)
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    (place as any).placename ??
    (place as any).place_name ??
    place.name ??
    (place as any).name

  return typeof candidate === 'string' ? candidate.trim() : ''
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

function extractDepartments(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as Department[]
  return list.filter(item => item && typeof item === 'object') as Department[]
}

function extractPlaces(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as Place[]
  return list.filter(item => item && typeof item === 'object') as Place[]
}

function extractHeadRows(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as ApiRow[]
  return list.filter(item => item && typeof item === 'object') as ApiRow[]
}

function extractTotalRecords(payload: unknown, fallback: number) {
  if (!payload || typeof payload !== 'object') return fallback

  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total ??
    root?.result?.meta?.totalRecords ??
    root?.meta?.totalRecords

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback
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

function mapApiRowToHeadWiseRow(row: ApiRow, index: number): HeadWiseRow {
  return {
    srNo: index + 1,
    emitraId: toText(
      row.emitraId ??
      row.emitraID ??
      row.headId ??
      row.id ??
      row.code,
      `HEAD-${index + 1}`,
    ),
    name: toText(
      row.name ??
      row.headName ??
      row.head_name ??
      row.ticketHeadName ??
      row.particularName,
      'Unnamed Head',
    ),
    amount: toNumber(
      row.amount ??
      row.totalAmount ??
      row.headAmount ??
      row.value,
    ),
  }
}

function downloadCsv(rows: HeadWiseRow[]) {
  const header = ['Sr No', 'Emitra Id', 'Name', 'Amount']
  const body = rows.map(row => [
    String(row.srNo),
    `"${String(row.emitraId).replace(/"/g, '""')}"`,
    `"${row.name.replace(/"/g, '""')}"`,
    String(row.amount),
  ])

  const csv = [header.join(','), ...body.map(item => item.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `head-wise-report-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string
  value: string
  options: { v: string; l: string }[]
  onChange: (value: string) => void
  icon?: ReactNode
}) {
  return (
    <div className="space-y-2">
      <label
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl py-3 pl-4 pr-10 outline-none"
          style={{ fontSize: 12, border: '1px solid var(--sand)', background: '#fff', color: 'var(--text-dark)' }}
        >
          {options.map(option => (
            <option key={`${label}-${option.v}-${option.l}`} value={option.v}>
              {option.l}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  )
}

function PageBtn({
  onClick,
  disabled,
  active,
  icon,
  label,
}: {
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
      className="flex items-center justify-center gap-0.5 rounded-lg px-1 font-medium"
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

interface HeadWiseReportViewProps {
  data?: HeadWiseRow[]
  title?: string
  totalResults?: number
}

export default function HeadWiseReportView({
  data = SAMPLE_DATA,
  title = 'Head Wise Report',
  totalResults,
}: HeadWiseReportViewProps) {
  const today = useMemo(() => getTodayDateInput(), [])
  const defaultFilters = useMemo<FilterState>(() => ({
    dateType: 'visit',
    startDate: today,
    endDate: today,
    departmentId: '',
    placeId: '',
    transactionStatus: 'ALL',
  }), [today])

  const [rows, setRows] = useState<HeadWiseRow[]>(data)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [draftFilters, setDraftFilters] = useState<FilterState>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters)
  const [departments, setDepartments] = useState<Department[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [placesLoading, setPlacesLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState('')
  const [placesError, setPlacesError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalRecords, setTotalRecords] = useState(totalResults ?? data.length)

  const placeDeptId = filtersOpen ? draftFilters.departmentId : appliedFilters.departmentId
  const activeDepartment = departments.find(item => getDepartmentId(item) === appliedFilters.departmentId)
  const activePlace = places.find(item => getPlaceId(item) === appliedFilters.placeId)
  const activeDepartmentName = activeDepartment ? getDepartmentName(activeDepartment) : ''
  const activePlaceName = activePlace ? getPlaceName(activePlace) : ''

  useEffect(() => {
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
  }, [defaultFilters])

  useEffect(() => {
    let active = true

    const loadDepartments = async () => {
      setDepartmentsLoading(true)
      setDepartmentsError('')
      try {
        const response = await fetch('/api/dept?offset=0&size=200&export=false&searchKey=', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Department request failed with ${response.status}`)
        const payload = await response.json()
        if (!active) return
        setDepartments(extractDepartments(payload))
      } catch (err) {
        if (!active) return
        setDepartments([])
        setDepartmentsError(err instanceof Error ? err.message : 'Unable to load departments.')
      } finally {
        if (active) setDepartmentsLoading(false)
      }
    }

    loadDepartments()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadPlaces = async () => {
      setPlacesLoading(true)
      setPlacesError('')
      try {
        const params = new URLSearchParams({
          districtId: '',
          searchKey: '',
          deptList: placeDeptId,
          size: '2000',
        })
        const response = await fetch(`/api/place?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Place request failed with ${response.status}`)
        const payload = await response.json()
        if (!active) return

        const nextPlaces = extractPlaces(payload)
        setPlaces(nextPlaces)

        if (filtersOpen) {
          setDraftFilters(current => (
            current.placeId && !nextPlaces.some(place => getPlaceId(place) === current.placeId)
              ? { ...current, placeId: '' }
              : current
          ))
        } else {
          setAppliedFilters(current => (
            current.placeId && !nextPlaces.some(place => getPlaceId(place) === current.placeId)
              ? { ...current, placeId: '' }
              : current
          ))
        }
      } catch (err) {
        if (!active) return
        setPlaces([])
        setPlacesError(err instanceof Error ? err.message : 'Unable to load places.')
      } finally {
        if (active) setPlacesLoading(false)
      }
    }

    loadPlaces()

    return () => {
      active = false
    }
  }, [filtersOpen, placeDeptId])

  useEffect(() => {
    let active = true

    const loadRows = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          divisionId: '',
          districtId: '',
          endDay: String(getDayEndMs(appliedFilters.endDate)),
          offSet: String(page),
          size: String(pageSize),
          startDay: String(getDayStartMs(appliedFilters.startDate)),
          placeId: appliedFilters.placeId,
          ticketType: 'NORMAL',
          departmentId: appliedFilters.departmentId,
          bookingType: '',
          isFilter: 'true',
          transactionStatus: appliedFilters.transactionStatus,
          dateFilter: appliedFilters.dateType === 'visit' ? 'Visit' : 'Booking',
          searchKey: search.trim(),
        })

        const response = await fetch(`/api/inventory/reports/head_V2?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Head-wise report request failed with ${response.status}`)
        const payload = await response.json()
        if (!active) return

        const mappedRows = extractHeadRows(payload).map(mapApiRowToHeadWiseRow)
        setRows(mappedRows)
        setTotalRecords(extractTotalRecords(payload, mappedRows.length))
      } catch (err) {
        if (!active) return
        setRows([])
        setTotalRecords(0)
        setError(err instanceof Error ? err.message : 'Unable to load head-wise report.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRows()

    return () => {
      active = false
    }
  }, [appliedFilters, page, pageSize, search])

  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / pageSize))
  const firstResult = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1
  const lastResult = totalRecords === 0 ? 0 : Math.min(page * pageSize, totalRecords)
  const grandTotal = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows])
  const highestHead = useMemo(() => [...rows].sort((a, b) => b.amount - a.amount)[0], [rows])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const openFilters = () => {
    setDraftFilters(appliedFilters)
    setFiltersOpen(true)
  }

  const closeFilters = () => {
    setDraftFilters(appliedFilters)
    setFiltersOpen(false)
  }

  const applyFilters = () => {
    setAppliedFilters(draftFilters)
    setPage(1)
    setFiltersOpen(false)
  }

  const resetFilters = () => {
    setDraftFilters(defaultFilters)
  }

  const activeFilterCount = [
    appliedFilters.departmentId,
    appliedFilters.placeId,
    appliedFilters.transactionStatus !== 'ALL' ? appliedFilters.transactionStatus : '',
    appliedFilters.dateType !== 'visit' ? appliedFilters.dateType : '',
  ].filter(Boolean).length

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Inventory Reports · Head-wise collection summary
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 260 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search head name / Emitra ID"
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: 12, color: 'var(--text-dark)' }}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          <button
            onClick={openFilters}
            className="relative flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{
              fontSize: 12,
              background: filtersOpen || activeFilterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
              border: `1px solid ${filtersOpen || activeFilterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
              color: filtersOpen || activeFilterCount > 0 ? '#fff' : 'var(--text-mid)',
            }}
          >
            <SlidersHorizontal size={13} />
            Filter
            {activeFilterCount > 0 && (
              <span
                className="absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => downloadCsv(rows)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-5 px-6 py-2.5 flex-wrap" style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
        {[
          { label: 'Date Type', val: appliedFilters.dateType === 'visit' ? 'Visit Date' : 'Booking Date' },
          { label: 'Start Date', val: new Date(appliedFilters.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
          { label: 'End Date', val: new Date(appliedFilters.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
          { label: 'Department', val: activeDepartmentName || 'All' },
          { label: 'Place', val: activePlaceName || 'All' },
          { label: 'Payment Status', val: appliedFilters.transactionStatus === 'ALL' ? 'All' : appliedFilters.transactionStatus },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
              {item.label} :
            </span>
            <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 11, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}>
              {item.val}
            </span>
          </div>
        ))}
      </div>

      {filtersOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.34)' }}
          onClick={closeFilters}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl"
            style={{ background: '#fff', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)' }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 20 }}>Filter Head Wise Report</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>Dynamic inventory report filters</div>
                </div>
              </div>
              <button onClick={closeFilters} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b px-6 py-3" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              {[
                draftFilters.dateType === 'visit' ? 'Visit Date' : 'Booking Date',
                draftFilters.transactionStatus === 'ALL' ? 'All Statuses' : draftFilters.transactionStatus,
                departmentsLoading ? 'Loading Departments...' : activeDepartmentName || 'All Departments',
                placesLoading ? 'Loading Places...' : activePlaceName || 'All Places',
              ].map(chip => (
                <span key={chip} className="rounded-full px-3 py-1" style={{ fontSize: 11, background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontWeight: 600 }}>
                  {chip}
                </span>
              ))}
            </div>

            <div className="grid gap-5 px-6 py-5 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Date Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'visit', label: 'Visit Date', icon: <Calendar size={14} /> },
                    { value: 'booking', label: 'Booking Date', icon: <Ticket size={14} /> },
                  ].map(option => {
                    const active = draftFilters.dateType === option.value
                    return (
                      <button
                        key={option.value}
                        onClick={() => setDraftFilters(current => ({ ...current, dateType: option.value as FilterState['dateType'] }))}
                        className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium"
                        style={{
                          fontSize: 12,
                          border: `1px solid ${active ? 'var(--maroon)' : 'var(--sand)'}`,
                          background: active ? 'rgba(139,26,26,0.08)' : '#fff',
                          color: active ? 'var(--maroon)' : 'var(--text-mid)',
                        }}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={draftFilters.startDate}
                    max={today}
                    onChange={event => setDraftFilters(current => ({ ...current, startDate: event.target.value }))}
                    className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                    style={{ fontSize: 12, border: '1px solid var(--sand)', background: '#fff', color: 'var(--text-dark)' }}
                  />
                  <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={draftFilters.endDate}
                    max={today}
                    min={draftFilters.startDate}
                    onChange={event => setDraftFilters(current => ({ ...current, endDate: event.target.value }))}
                    className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
                    style={{ fontSize: 12, border: '1px solid var(--sand)', background: '#fff', color: 'var(--text-dark)' }}
                  />
                  <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <FilterSelect
                label="Department"
                value={draftFilters.departmentId}
                icon={<Building2 size={12} style={{ color: 'var(--maroon)' }} />}
                options={[
                  { v: '', l: departmentsLoading ? 'Loading departments...' : 'All Departments' },
                  ...departments.map(item => ({ v: getDepartmentId(item), l: getDepartmentName(item) })),
                ]}
                onChange={value => setDraftFilters(current => ({ ...current, departmentId: value, placeId: '' }))}
              />

              <FilterSelect
                label="Place"
                value={draftFilters.placeId}
                icon={<MapPin size={12} style={{ color: 'var(--maroon)' }} />}
                options={[
                  { v: '', l: placesLoading ? 'Loading places...' : 'All Places' },
                  ...places.map(item => ({ v: getPlaceId(item), l: getPlaceName(item) })),
                ]}
                onChange={value => setDraftFilters(current => ({ ...current, placeId: value }))}
              />

              <div className="space-y-2">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={12} style={{ color: 'var(--maroon)' }} />
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'ALL', label: 'All' },
                    { value: 'SUCCESS', label: 'Success' },
                    { value: 'FAILED', label: 'Fail' },
                    { value: 'CANCELLED', label: 'Cancel' },
                  ].map(option => {
                    const active = draftFilters.transactionStatus === option.value
                    return (
                      <button
                        key={option.value}
                        onClick={() => setDraftFilters(current => ({ ...current, transactionStatus: option.value as FilterState['transactionStatus'] }))}
                        className="rounded-xl px-4 py-3 font-medium"
                        style={{
                          fontSize: 12,
                          border: `1px solid ${active ? 'var(--maroon)' : 'var(--sand)'}`,
                          background: active ? 'rgba(139,26,26,0.08)' : '#fff',
                          color: active ? 'var(--maroon)' : 'var(--text-mid)',
                        }}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {(departmentsError || placesError) && (
              <div className="px-6 pb-2" style={{ fontSize: 12, color: '#B42318' }}>
                {[departmentsError, placesError].filter(Boolean).join(' ')}
              </div>
            )}

            <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <button onClick={resetFilters} className="rounded-xl px-4 py-2 font-medium" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                Reset All
              </button>
              <div className="flex items-center gap-3">
                <button onClick={closeFilters} className="rounded-xl px-4 py-2 font-medium" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                  Cancel
                </button>
                <button onClick={applyFilters} className="rounded-xl px-4 py-2 font-medium text-white" style={{ fontSize: 12, background: 'var(--maroon)' }}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 px-6 py-4" style={{ background: 'var(--cream)' }}>
        {[
          { label: 'Total Heads', value: rows.length.toLocaleString('en-IN'), icon: '📑', color: 'var(--maroon)', bg: '#fff' },
          { label: 'Total Amount', value: `₹${grandTotal.toLocaleString('en-IN')}`, icon: '₹', color: 'var(--maroon)', bg: 'linear-gradient(135deg,#6B1212,#A83030)', white: true },
          { label: 'Highest Head', value: highestHead?.name || '—', icon: '🏆', color: '#C8922A', bg: '#fff' },
          { label: 'Top Amount', value: highestHead ? `₹${highestHead.amount.toLocaleString('en-IN')}` : '₹0', icon: '💰', color: '#1A7A6E', bg: '#fff' },
        ].map(card => (
          <div
            key={card.label}
            className="relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3"
            style={{ background: card.bg, border: card.white ? 'none' : '1px solid var(--sand)' }}
          >
            {card.white && <div style={{ position: 'absolute', top: -24, right: -24, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
            <span style={{ fontSize: 22, flexShrink: 0 }}>{card.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: card.white ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{card.label}</div>
              <div
                className="font-serif font-bold"
                style={{
                  fontSize: card.label === 'Highest Head' ? 15 : 20,
                  color: card.white ? '#fff' : card.color,
                  lineHeight: 1.1,
                  whiteSpace: card.label === 'Highest Head' ? 'nowrap' : 'normal',
                  overflow: card.label === 'Highest Head' ? 'hidden' : 'visible',
                  textOverflow: card.label === 'Highest Head' ? 'ellipsis' : 'clip',
                }}
              >
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6">
        <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                <th style={{ padding: '11px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'rgba(255,255,255,0.85)', textAlign: 'center', width: 52, background: 'var(--maroon)', borderRight: '2px solid rgba(255,255,255,0.15)' }}>
                  Sr.
                </th>
                <th style={{ padding: '11px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-muted)', textAlign: 'left', borderRight: '1px solid var(--sand)' }}>
                  Emitra Id
                </th>
                <th style={{ padding: '11px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-muted)', textAlign: 'left', borderRight: '1px solid var(--sand)' }}>
                  Head Name
                </th>
                <th style={{ padding: '11px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Amount (INR)
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Loading head-wise report...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: '#B42318', fontSize: 13 }}>
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const rowBg = index % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'
                  return (
                    <tr
                      key={`${row.emitraId}-${row.name}-${index}`}
                      style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                      onMouseEnter={event => ((event.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.025)')}
                      onMouseLeave={event => ((event.currentTarget as HTMLElement).style.background = rowBg)}
                    >
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--maroon)', borderRight: '2px solid var(--sand)' }}>
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                        <span className="rounded-lg px-2.5 py-1 font-semibold" style={{ fontSize: 12, background: 'var(--cream-dark)', color: 'var(--text-mid)', fontFamily: 'monospace' }}>
                          {row.emitraId}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', borderRight: '1px solid var(--cream-dark)' }}>
                        <span className="font-serif font-semibold" style={{ fontSize: 14 }}>{row.name}</span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span className="font-serif font-bold" style={{ fontSize: 16, color: 'var(--maroon)' }}>
                          ₹{row.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}

              {!loading && !error && rows.length > 0 && (
                <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                  <td colSpan={3} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 11, color: 'var(--maroon)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Page Total - {rows.length} heads
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
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
                  {[10, 25, 50].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PageBtn onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1} icon={<><ChevronLeft size={12} /><span style={{ fontSize: 11 }}>Previous</span></>} />
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                let targetPage = index + 1
                if (totalPages > 5) {
                  if (page <= 3) targetPage = index + 1
                  else if (page >= totalPages - 2) targetPage = totalPages - 4 + index
                  else targetPage = page - 2 + index
                }
                return <PageBtn key={targetPage} onClick={() => setPage(targetPage)} active={page === targetPage} label={String(targetPage)} />
              })}
              {totalPages > 5 && page < totalPages - 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>...</span>}
              {totalPages > 5 && <PageBtn onClick={() => setPage(totalPages)} active={page === totalPages} label={String(totalPages)} />}
              <PageBtn onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page === totalPages} icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Result:{' '}
              <strong style={{ color: 'var(--text-dark)' }}>
                {totalRecords === 0 ? 0 : `${firstResult}-${lastResult}`}
              </strong>{' '}
              of{' '}
              <strong style={{ color: 'var(--maroon)' }}>{totalRecords}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
