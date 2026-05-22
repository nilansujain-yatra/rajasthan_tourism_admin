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

export interface HeadSummaryStats {
  gypsy: number
  canter: number
  indianCitizen: number
  indianCitizenGypsy: number
  indianCitizenCanter: number
  foreignCitizen: number
  foreignCitizenGypsy: number
  foreignCitizenCanter: number
  indianStudent: number
  indianStudentGypsy: number
  indianStudentCanter: number
  foreignStudent: number
  totalVisitor: number
}

export interface HeadSummaryRow {
  srNo: number
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

const DEFAULT_STATS: HeadSummaryStats = {
  gypsy: 0,
  canter: 0,
  indianCitizen: 0,
  indianCitizenGypsy: 0,
  indianCitizenCanter: 0,
  foreignCitizen: 0,
  foreignCitizenGypsy: 0,
  foreignCitizenCanter: 0,
  indianStudent: 0,
  indianStudentGypsy: 0,
  indianStudentCanter: 0,
  foreignStudent: 0,
  totalVisitor: 0,
}

const DEFAULT_ROWS: HeadSummaryRow[] = [
  { srNo: 1, name: 'VEHICLE RENT', amount: 0 },
  { srNo: 2, name: 'RISL CHARGES', amount: 0 },
  { srNo: 3, name: 'GST ON VEHICLE', amount: 0 },
  { srNo: 4, name: 'VEHICLE ENTRY FEE', amount: 0 },
]

interface StatGroup {
  groupLabel: string
  groupColor: string
  groupBg: string
  icon: string
  items: { key: keyof HeadSummaryStats; label: string }[]
}

const STAT_GROUPS: StatGroup[] = [
  {
    groupLabel: 'Vehicle Type',
    groupColor: '#8B1A1A',
    groupBg: 'rgba(139,26,26,0.07)',
    icon: '🚗',
    items: [
      { key: 'gypsy', label: 'Gypsy' },
      { key: 'canter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Indian Citizen',
    groupColor: '#1A7A6E',
    groupBg: 'rgba(26,122,110,0.07)',
    icon: 'IN',
    items: [
      { key: 'indianCitizen', label: 'Total' },
      { key: 'indianCitizenGypsy', label: 'Gypsy' },
      { key: 'indianCitizenCanter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Foreign Citizen',
    groupColor: '#C8922A',
    groupBg: 'rgba(200,146,42,0.07)',
    icon: '🌍',
    items: [
      { key: 'foreignCitizen', label: 'Total' },
      { key: 'foreignCitizenGypsy', label: 'Gypsy' },
      { key: 'foreignCitizenCanter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Indian Student',
    groupColor: '#5A3A1A',
    groupBg: 'rgba(90,58,26,0.07)',
    icon: '🎓',
    items: [
      { key: 'indianStudent', label: 'Total' },
      { key: 'indianStudentGypsy', label: 'Gypsy' },
      { key: 'indianStudentCanter', label: 'Canter' },
    ],
  },
  {
    groupLabel: 'Foreign Student',
    groupColor: '#6B1212',
    groupBg: 'rgba(107,18,18,0.07)',
    icon: '🎒',
    items: [{ key: 'foreignStudent', label: 'Total' }],
  },
]

const HEAD_CONFIG: Record<string, { bg: string; color: string; icon: string }> = {
  'VEHICLE RENT': { bg: 'rgba(200,146,42,0.1)', color: '#C8922A', icon: '🚗' },
  'RISL CHARGES': { bg: 'rgba(107,18,18,0.1)', color: '#6B1212', icon: '📋' },
  'GST ON VEHICLE': { bg: 'rgba(26,122,110,0.1)', color: '#1A7A6E', icon: '🧾' },
  'VEHICLE ENTRY FEE': { bg: 'rgba(200,146,42,0.1)', color: '#C8922A', icon: '🎫' },
  'MEMBER ECO SURCHARGE': { bg: 'rgba(90,138,58,0.1)', color: '#5A8A3A', icon: '🌿' },
  'MEMBER ENTRY FEE': { bg: 'rgba(139,26,26,0.1)', color: '#8B1A1A', icon: '👥' },
  'SURCHARGE-RPACS': { bg: 'rgba(90,58,26,0.1)', color: '#5A3A1A', icon: '⚡' },
}

function getHeadConfig(name: string) {
  return HEAD_CONFIG[name] ?? { bg: 'rgba(90,58,26,0.07)', color: '#5A3A1A', icon: '💰' }
}

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

function extractRows(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as ApiRow[]
  return list.filter(item => item && typeof item === 'object') as ApiRow[]
}

function getAny(obj: unknown, keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    const value = (obj as any)[key]
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')) {
      return value
    }
  }
  return undefined
}

function findStatsObject(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || depth >= 4) return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStatsObject(item, depth + 1)
      if (found) return found
    }
    return null
  }

  const obj = value as Record<string, unknown>
  const statHintKeys = ['gypsy', 'canter', 'indianCitizen', 'foreignCitizen', 'totalVisitor']
  if (statHintKeys.some(key => key in obj)) {
    return obj
  }

  for (const child of Object.values(obj)) {
    const found = findStatsObject(child, depth + 1)
    if (found) return found
  }

  return null
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

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function collectNumericEntries(value: unknown, target: Record<string, number>, depth = 0) {
  if (depth >= 5 || value === null || value === undefined) return

  if (Array.isArray(value)) {
    for (const item of value) {
      collectNumericEntries(item, target, depth + 1)
    }
    return
  }

  if (typeof value !== 'object') return

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (typeof child === 'number' && Number.isFinite(child)) {
      target[normalizeKey(key)] = child
      continue
    }

    if (typeof child === 'string' && child.trim()) {
      const parsed = Number(child)
      if (Number.isFinite(parsed)) {
        target[normalizeKey(key)] = parsed
        continue
      }
    }

    collectNumericEntries(child, target, depth + 1)
  }
}

function pickNumber(source: Record<string, number>, aliases: string[], fallback = 0) {
  for (const alias of aliases) {
    const normalized = normalizeKey(alias)
    if (normalized in source) return source[normalized]
  }
  return fallback
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

function mapApiRowToSummaryRow(row: ApiRow, index: number): HeadSummaryRow {
  return {
    srNo: index + 1,
    name: toText(
      getAny(row, ['name', 'headName', 'head_name', 'ticketHeadName', 'particularName']),
      `Head ${index + 1}`,
    ),
    amount: toNumber(
      getAny(row, ['amount', 'totalAmount', 'headAmount', 'value']),
    ),
  }
}

function mapStats(payload: unknown): HeadSummaryStats {
  const stats = findStatsObject(payload)
  const numericMap: Record<string, number> = {}

  if (stats) {
    collectNumericEntries(stats, numericMap)
  } else {
    collectNumericEntries(payload, numericMap)
  }

  if (Object.keys(numericMap).length === 0) return DEFAULT_STATS

  const indianCitizenGypsy = pickNumber(numericMap, [
    'indianCitizenGypsy',
    'indianCitizenInGypsy',
    'indianCitizenGypsyCount',
    'indianCitizenGypsyVisitor',
    'indian_citizen_gypsy',
    'indianMemberGypsy'
  ])
  const indianCitizenCanter = pickNumber(numericMap, [
    'indianCitizenCanter',
    'indianCitizenInCanter',
    'indianCitizenCanterCount',
    'indianCitizenCanterVisitor',
    'indian_citizen_canter',
    'indianMemberCanter'
  ])
  const foreignCitizenGypsy = pickNumber(numericMap, [
    'foreignCitizenGypsy',
    'foreignCitizenInGypsy',
    'foreignCitizenGypsyCount',
    'foreignCitizenGypsyVisitor',
    'foreign_citizen_gypsy',
    'foreignerMemberGypsy'
  ])
  const foreignCitizenCanter = pickNumber(numericMap, [
    'foreignCitizenCanter',
    'foreignCitizenInCanter',
    'foreignCitizenCanterCount',
    'foreignCitizenCanterVisitor',
    'foreign_citizen_canter',
    'foreignerMemberCanter'
  ])
  const indianStudentGypsy = pickNumber(numericMap, [
    'indianStudentMemberGypsy',
    'indianStudentInGypsy',
    'indianStudentGypsyCount',
    'indianStudentGypsyVisitor',
    'indian_student_gypsy',
    ''
  ])
  const indianStudentCanter = pickNumber(numericMap, [
    'indianStudentMemberCanter',
    'indianStudentInCanter',
    'indianStudentCanterCount',
    'indianStudentCanterVisitor',
    'indian_student_canter',
  ])

  const indianCitizen = pickNumber(numericMap, [
    '/* indianCitizen */',
    'totalIndianCitizen',
    'indianCitizenTotal',
    'indianCitizenCount',
    'indian_citizen',
    'indianMember'
  ], indianCitizenGypsy + indianCitizenCanter)

  const foreignCitizen = pickNumber(numericMap, [
    'foreignerMember',
    'totalForeignCitizen',
    'foreignCitizenTotal',
    'foreignCitizenCount',
    'foreign_citizen',
  ], foreignCitizenGypsy + foreignCitizenCanter)

  const indianStudent = pickNumber(numericMap, [
    'indianStudentMember',
    'totalIndianStudent',
    'indianStudentTotal',
    'indianStudentCount',
    'indian_student',
  ], indianStudentGypsy + indianStudentCanter)
  const foreignStudent = pickNumber(numericMap, [
    'foreignerStudentMember',
    'totalForeignStudent',
    'foreignStudentTotal',
    'foreignStudentCount',
    'foreign_student',
  ])

  const gypsy = pickNumber(numericMap, [
    'gypsy',
    'totalGypsy',
    'gypsyCount',
    'gypsyVehicle',
    'gypsyVisitorCount',
  ], indianCitizenGypsy + foreignCitizenGypsy + indianStudentGypsy)
  const canter = pickNumber(numericMap, [
    'canter',
    'totalCanter',
    'canterCount',
    'canterVehicle',
    'canterVisitorCount',
  ], indianCitizenCanter + foreignCitizenCanter + indianStudentCanter)

  const totalVisitor = pickNumber(numericMap, [
    'totalVisitor',
    'totalVisitors',
    'visitorTotal',
    'visitorCount',
    'grandTotalVisitor',
  ], indianCitizen + foreignCitizen + indianStudent + foreignStudent)

  return {
    gypsy,
    canter,
    indianCitizen,
    indianCitizenGypsy,
    indianCitizenCanter,
    foreignCitizen,
    foreignCitizenGypsy,
    foreignCitizenCanter,
    indianStudent,
    indianStudentGypsy,
    indianStudentCanter,
    foreignStudent,
    totalVisitor,
  }
}

function downloadCsv(rows: HeadSummaryRow[]) {
  const header = ['Sr No', 'Name', 'Amount']
  const body = rows.map(row => [
    String(row.srNo),
    `"${row.name.replace(/"/g, '""')}"`,
    String(row.amount),
  ])
  const csv = [header.join(','), ...body.map(item => item.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `head-summary-report-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  icon,
  disabled,
}: {
  label: string
  value: string
  options: { v: string; l: string }[]
  onChange: (v: string) => void
  icon?: ReactNode
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl py-3 pl-4 pr-10 outline-none"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          {options.map(option => <option key={`${label}-${option.v}-${option.l}`} value={option.v}>{option.l}</option>)}
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
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-1"
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

interface HeadSummaryReportViewProps {
  stats?: HeadSummaryStats
  data?: HeadSummaryRow[]
  title?: string
  totalResults?: number
  lockedPlaceId?: string
  lockedPlaceName?: string
  lockedDepartmentId?: string
}

export default function HeadSummaryReportView({
  stats = DEFAULT_STATS,
  data = DEFAULT_ROWS,
  title = 'Head Summary Report',
  totalResults,
  lockedPlaceId = '',
  lockedPlaceName,
  lockedDepartmentId = '',
}: HeadSummaryReportViewProps) {
  const today = useMemo(() => getTodayDateInput(), [])
  const defaultFilters = useMemo<FilterState>(() => ({
    dateType: 'visit',
    startDate: today,
    endDate: today,
    departmentId: lockedDepartmentId,
    placeId: lockedPlaceId || 'ALL',
    transactionStatus: 'ALL',
  }), [lockedDepartmentId, lockedPlaceId, today])
  const placeLocked = Boolean(lockedPlaceId)
  const departmentLocked = Boolean(lockedDepartmentId)

  const [rows, setRows] = useState<HeadSummaryRow[]>(data)
  const [summaryStats, setSummaryStats] = useState<HeadSummaryStats>(stats)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterOpen, setFilterOpen] = useState(false)
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

  const placeDeptId = filterOpen ? draftFilters.departmentId : appliedFilters.departmentId
  const activeDepartment = departments.find(item => getDepartmentId(item) === appliedFilters.departmentId)
  const activePlace = places.find(item => getPlaceId(item) === appliedFilters.placeId)
  const activeDepartmentName = activeDepartment ? getDepartmentName(activeDepartment) : ''
  const activePlaceName = placeLocked ? (lockedPlaceName || activePlace?.placeName || '') : activePlace ? getPlaceName(activePlace) : ''

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

        const firstPlaceId = nextPlaces.length > 0 ? getPlaceId(nextPlaces[0]) : ''

        if (filterOpen) {
          setDraftFilters(current => {
            if (!current.placeId && firstPlaceId && !placeLocked) {
              return { ...current, placeId: firstPlaceId }
            }
            if (!placeLocked && current.placeId && !nextPlaces.some(place => getPlaceId(place) === current.placeId)) {
              return { ...current, placeId: firstPlaceId }
            }
            return current
          })
        } else {
          setAppliedFilters(current => {
            if (!current.placeId && firstPlaceId && !placeLocked) {
              return { ...current, placeId: firstPlaceId }
            }
            if (!placeLocked && current.placeId && !nextPlaces.some(place => getPlaceId(place) === current.placeId)) {
              return { ...current, placeId: firstPlaceId }
            }
            return current
          })
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
  }, [filterOpen, placeDeptId, placeLocked])

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
          dateFilter: appliedFilters.dateType === 'visit' ? 'Visit' : 'Current',
        })

        const response = await fetch(`/api/inventory/reports/summary/headReport/v2?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Head summary report request failed with ${response.status}`)

        const payload = await response.json()
        if (!active) return

        const mappedRows = extractRows(payload).map(mapApiRowToSummaryRow)
        setRows(mappedRows)
        setSummaryStats(mapStats(payload))
        setTotalRecords(extractTotalRecords(payload, mappedRows.length))
      } catch (err) {
        if (!active) return
        setRows([])
        setSummaryStats(DEFAULT_STATS)
        setTotalRecords(0)
        setError(err instanceof Error ? err.message : 'Unable to load head summary report.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRows()

    return () => {
      active = false
    }
  }, [appliedFilters, page, pageSize])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const query = search.toLowerCase()
    return rows.filter(row => row.name.toLowerCase().includes(query) || String(row.srNo).includes(query))
  }, [rows, search])

  const grandTotal = useMemo(() => filteredRows.reduce((sum, row) => sum + row.amount, 0), [filteredRows])
  const pageTotal = grandTotal
  const maxAmount = Math.max(...filteredRows.map(row => row.amount), 1)
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / pageSize))
  const firstResult = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1
  const lastResult = totalRecords === 0 ? 0 : Math.min(page * pageSize, totalRecords)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const openFilter = () => {
    setDraftFilters(appliedFilters)
    setFilterOpen(true)
  }

  const closeFilter = () => {
    setDraftFilters(appliedFilters)
    setFilterOpen(false)
  }

  const applyFilter = () => {
    setAppliedFilters(draftFilters)
    setPage(1)
    setFilterOpen(false)
  }

  const resetFilter = () => {
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
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>
            {title}
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Inventory Reports · Fee Head Summary with Visitor Breakdown
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 210 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search head name..."
              className="bg-transparent outline-none flex-1"
              style={{ fontSize: 12, color: 'var(--text-dark)' }}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          <button
            onClick={openFilter}
            className="relative flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{
              fontSize: 12,
              background: filterOpen || activeFilterCount > 0 ? 'var(--maroon)' : 'var(--cream-dark)',
              border: `1px solid ${filterOpen || activeFilterCount > 0 ? 'var(--maroon)' : 'var(--sand)'}`,
              color: filterOpen || activeFilterCount > 0 ? '#fff' : 'var(--text-mid)',
            }}
          >
            <SlidersHorizontal size={13} />
            Filter
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full text-white font-bold" style={{ width: 16, height: 16, background: 'var(--gold)', fontSize: 9 }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => downloadCsv(filteredRows)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 px-6 py-2.5 flex-wrap" style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
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

      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.34)' }} onClick={closeFilter}>
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl" style={{ background: '#fff', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)' }} onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 20 }}>Filter Head Summary Report</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>Dynamic inventory summary filters</div>
                </div>
              </div>
              <button onClick={closeFilter} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b px-6 py-3" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              {[
                draftFilters.dateType === 'visit' ? 'Visit Date' : 'Booking Date',
                draftFilters.transactionStatus === 'ALL' ? 'All Statuses' : draftFilters.transactionStatus,
                activeDepartmentName || 'All Departments',
                activePlaceName || 'All Places',
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
                options={[{ v: '', l: departmentsLoading ? 'Loading departments...' : 'All Departments' }, ...departments.map(item => ({ v: getDepartmentId(item), l: getDepartmentName(item) }))]}
                onChange={value => setDraftFilters(current => ({ ...current, departmentId: value, placeId: '' }))}
                disabled={departmentLocked}
              />

              <FilterSelect
                label="Place"
                value={draftFilters.placeId}
                icon={<MapPin size={12} style={{ color: 'var(--maroon)' }} />}
                options={[{ v: '', l: placesLoading ? 'Loading places...' : 'All Places' }, ...places.map(item => ({ v: getPlaceId(item), l: getPlaceName(item) }))]}
                onChange={value => setDraftFilters(current => ({ ...current, placeId: value }))}
                disabled={placeLocked}
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
              <button onClick={resetFilter} className="rounded-xl px-4 py-2 font-medium" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                Reset All
              </button>
              <div className="flex items-center gap-3">
                <button onClick={closeFilter} className="rounded-xl px-4 py-2 font-medium" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                  Cancel
                </button>
                <button onClick={applyFilter} className="rounded-xl px-4 py-2 font-medium text-white" style={{ fontSize: 12, background: 'var(--maroon)' }}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pt-5 pb-2" style={{ background: 'var(--cream)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--gold), var(--maroon))', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
            Visitor Breakdown
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--sand)' }} />
          <div className="flex items-center gap-2 rounded-xl px-4 py-1.5" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Total Visitors</span>
            <span className="font-serif font-bold" style={{ fontSize: 20, color: '#fff' }}>
              {summaryStats.totalVisitor.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap mb-5">
          {STAT_GROUPS.map(group => (
            <div key={group.groupLabel} className="rounded-xl overflow-hidden flex-1" style={{ minWidth: 140, border: `1px solid ${group.groupColor}22`, background: '#fff' }}>
              <div className="flex items-center gap-2 px-3 py-2" style={{ background: group.groupBg, borderBottom: `1px solid ${group.groupColor}22` }}>
                <span style={{ fontSize: 14 }}>{group.icon}</span>
                <span className="font-semibold" style={{ fontSize: 10, color: group.groupColor, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {group.groupLabel}
                </span>
              </div>

              <div className="flex divide-x" style={{ borderColor: 'var(--cream-dark)' }}>
                {group.items.map(item => {
                  const val = summaryStats[item.key]
                  const isEmpty = val === 0
                  return (
                    <div key={item.key} className="flex-1 flex flex-col items-center justify-center py-3 px-2">
                      <div className="font-serif font-bold" style={{ fontSize: 22, lineHeight: 1, color: isEmpty ? 'var(--text-muted)' : group.groupColor }}>
                        {val.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, textAlign: 'center' }}>
                        {item.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff', marginBottom: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: 'var(--maroon)' }}>
                  {[
                    'Gypsy', 'Canter',
                    'Indian Citizen', 'Indian Citizen Gypsy', 'Indian Citizen Canter',
                    'Foreign Citizen', 'Foreign Citizen Gypsy', 'Foreign Citizen Canter',
                    'Indian Student', 'Indian Student Gypsy', 'Indian Student Canter',
                    'Foreign Student',
                    'Total Visitor',
                  ].map((col, i, arr) => (
                    <th
                      key={col}
                      style={{
                        padding: '8px 12px',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                        color: 'rgba(255,255,255,0.85)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                        background: i === arr.length - 1 ? 'rgba(200,146,42,0.35)' : undefined,
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {([
                    summaryStats.gypsy, summaryStats.canter,
                    summaryStats.indianCitizen, summaryStats.indianCitizenGypsy, summaryStats.indianCitizenCanter,
                    summaryStats.foreignCitizen, summaryStats.foreignCitizenGypsy, summaryStats.foreignCitizenCanter,
                    summaryStats.indianStudent, summaryStats.indianStudentGypsy, summaryStats.indianStudentCanter,
                    summaryStats.foreignStudent,
                    summaryStats.totalVisitor,
                  ] as number[]).map((val, i, arr) => (
                    <td
                      key={i}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'center',
                        fontSize: i === arr.length - 1 ? 16 : 14,
                        fontWeight: i === arr.length - 1 ? 700 : val === 0 ? 400 : 600,
                        fontFamily: i === arr.length - 1 ? "'Cormorant Garamond', serif" : 'inherit',
                        color: i === arr.length - 1 ? 'var(--maroon)' : val === 0 ? 'var(--text-muted)' : 'var(--text-dark)',
                        borderRight: i < arr.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                        background: i === arr.length - 1 ? 'var(--gold-pale)' : undefined,
                        borderBottom: 'none',
                      }}
                    >
                      {val === 0 ? <span style={{ color: 'var(--text-muted)', fontWeight: 300 }}>0</span> : val.toLocaleString('en-IN')}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--gold), var(--maroon))', borderRadius: 99, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
            Fee Head Amounts
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--sand)' }} />
          <span className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {filteredRows.length} heads
          </span>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {[
                  { label: 'Sr.No', align: 'center' as const, w: 64 },
                  { label: 'Name', align: 'left' as const, w: undefined },
                  { label: 'Share', align: 'left' as const, w: 180 },
                  { label: 'Amount (INR)', align: 'right' as const, w: 160 },
                ].map(col => (
                  <th
                    key={col.label}
                    style={{
                      padding: '11px 16px',
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'var(--text-muted)',
                      textAlign: col.align,
                      width: col.w,
                      borderRight: '1px solid var(--sand)',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Loading head summary report...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#B42318', fontSize: 13 }}>
                    {error}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => {
                  const cfg = getHeadConfig(r.name)
                  const pct = grandTotal > 0 ? ((r.amount / grandTotal) * 100).toFixed(1) : '0.0'
                  const barPct = maxAmount > 0 ? (r.amount / maxAmount) * 100 : 0
                  const rowBg = i % 2 === 0 ? '#fff' : 'rgba(251,246,239,0.55)'

                  return (
                    <tr
                      key={`${r.name}-${r.srNo}-${i}`}
                      style={{ background: rowBg, transition: 'background 0.12s', borderBottom: '1px solid var(--cream-dark)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.03)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = rowBg)}
                    >
                      <td style={{ padding: '13px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--maroon)', borderRight: '1px solid var(--cream-dark)' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>

                      <td style={{ padding: '13px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 34, height: 34, background: cfg.bg, fontSize: 16 }}>
                            {cfg.icon}
                          </span>
                          <div>
                            <div className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>
                              {r.name}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                              Head #{(page - 1) * pageSize + i + 1}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '13px 16px', borderRight: '1px solid var(--cream-dark)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: 'var(--cream-dark)' }}>
                            <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600, minWidth: 38, textAlign: 'right' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                        <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--maroon)', lineHeight: 1 }}>
                          ₹{r.amount.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                          {pct}% of total
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}

              {filteredRows.length > 0 && (
                <tr style={{ background: 'var(--cream-dark)', borderTop: '2px solid var(--sand)' }}>
                  <td colSpan={2} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
                    Page Total
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                    {filteredRows.length} head{filteredRows.length !== 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>
                    ₹{pageTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {filteredRows.length > 0 && (
                <tr style={{ background: 'linear-gradient(135deg, rgba(139,26,26,0.05), rgba(200,146,42,0.05))', borderTop: '1px solid var(--sand)' }}>
                  <td colSpan={2} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
                    Grand Total
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                    All {filteredRows.length} heads
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: 'var(--maroon)' }}>
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
                  onChange={e => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                  style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                >
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} icon={<><ChevronLeft size={12} /><span style={{ fontSize: 11 }}>Previous</span></>} />
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else p = page - 2 + i
                }
                return <PageBtn key={p} onClick={() => setPage(p)} active={page === p} label={String(p)} />
              })}
              {totalPages > 5 && page < totalPages - 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>...</span>}
              {totalPages > 5 && <PageBtn onClick={() => setPage(totalPages)} active={page === totalPages} label={String(totalPages)} />}
              <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Result:{' '}
              <strong style={{ color: 'var(--text-dark)' }}>
                {totalRecords === 0 ? 0 : `${firstResult}-${lastResult}`}
              </strong>{' '}
              of{' '}
              <strong style={{ color: 'var(--maroon)' }}>
                {totalRecords}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
