'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  IndianRupee,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Users,
  X,
} from 'lucide-react'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import SectionHeader from '@/components/ui/SectionHeader'
import { usePlaceStore } from '@/lib/store/use-place-store'

type PlaceSummary = {
  id: string
  placeId: string
  placeCode: string
  placeName: string
  totalVisitors: number
  totalAmount: number
  totalBooking: number
  totalBookingsOnline: number
  totalBookingsOffline: number
  active: boolean
  deptId?: string
  deptName?: string
  divisionId?: string
  divisionName?: string
  districtId?: string
  districtName?: string
  categoryId?: string
  categoryName?: string
  bookingType?: string
  slot?: string
  nameRequired?: boolean
  asi?: boolean
  activity?: string
}

type LookupOption = {
  id: string
  name: string
  bookingType?: string
}

type EditForm = {
  placeName: string
  deptId: string
  divisionId: string
  districtId: string
  categoryId: string
  placeId: string
  placeCode: string
  slot: string
}

type CreateForm = {
  placeName: string
  placeCode: string
  deptId: string
  divisionId: string
  districtId: string
  categoryId: string
}

type PlaceFilters = {
  deptId: string
  divisionId: string
  districtId: string
  categoryId: string
  status: string
}

type ConfirmState =
  | { mode: 'delete'; place: PlaceSummary }
  | { mode: 'status'; place: PlaceSummary }
  | null

const SLOT_OPTIONS: LookupOption[] = [
  { id: 'F', name: 'Forenoon (6:00 am - 12:00 noon)' },
  { id: 'A', name: 'Afternoon (12:00 noon - 6:00 pm)' },
  { id: 'E', name: 'Evening (6:00 pm - 12:00 midnight)' },
]

const DEFAULT_CREATE_FORM: CreateForm = {
  placeName: '',
  placeCode: '',
  deptId: '',
  divisionId: '',
  districtId: '',
  categoryId: '',
}

const DEFAULT_FILTERS: PlaceFilters = {
  deptId: '',
  divisionId: '',
  districtId: '',
  categoryId: '',
  status: '',
}

const STATUS_OPTIONS: LookupOption[] = [
  { id: 'ACTIVE', name: 'Active' },
  { id: 'INACTIVE', name: 'Inactive' },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (typeof value === 'number') return value === 1
  return false
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
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

function getRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function extractPlaces(payload: unknown): unknown[] {
  const list = findFirstArray(payload)
  return Array.isArray(list) ? list : []
}

function mapPlaceItem(item: unknown): PlaceSummary | null {
  const obj = getRecord(item)
  if (!obj) return null

  const placeId = toText(obj.placeId ?? obj.id ?? obj.place_id ?? obj.placeID, '')
  const placeCode = toText(obj.placeCode ?? obj.place_code ?? obj.placecode ?? obj.code, '')
  const placeName = toText(obj.placeName ?? obj.name ?? obj.place_name ?? obj.placename, '')
  const categoryDto = getRecord(obj.categoryDto)

  if (!placeId && !placeCode && !placeName) return null

  return {
    ...obj,
    id: toText(obj.id ?? obj.placeId ?? obj.place_id ?? obj.placeID, placeId),
    placeId,
    placeCode,
    placeName,
    totalVisitors: toNumber(obj.totalVisitors),
    totalAmount: toNumber(obj.totalAmount),
    totalBooking: toNumber(obj.totalBooking),
    totalBookingsOnline: toNumber(obj.totalBookingsOnline),
    totalBookingsOffline: toNumber(obj.totalBookingsOffline),
    active: toBoolean(obj.active),
    deptId: toText(obj.deptId),
    deptName: toText(obj.deptName),
    divisionId: toText(obj.divisionId),
    divisionName: toText(obj.divisionName),
    districtId: toText(obj.districtId),
    districtName: toText(obj.districtName),
    categoryId: toText(obj.categoryId ?? categoryDto?.id),
    categoryName: toText(obj.categoryName ?? categoryDto?.name),
    bookingType: toText(obj.bookingType ?? categoryDto?.bookingType),
    slot: toText(obj.slot),
    nameRequired: toBoolean(obj.nameRequired),
    asi: toBoolean(obj.asi),
    activity: toText(obj.activity, 'A'),
  }
}

function getPlaceKey(place: PlaceSummary) {
  return place.id || place.placeId || place.placeCode || place.placeName
}

function getTotalBookings(place: PlaceSummary) {
  return place.totalBooking || place.totalBookingsOnline + place.totalBookingsOffline
}

function findOptionLabel(options: LookupOption[], id: string, fallback = 'N/A') {
  return options.find(option => option.id === id)?.name ?? fallback
}

function getSlotLabel(slot: string) {
  if (!slot.trim()) return 'N/A'
  const selected = slot
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  if (selected.length === 0) return 'N/A'

  return selected
    .map(value => findOptionLabel(SLOT_OPTIONS, value, value))
    .join(', ')
}

function mapLookupOptions(payload: unknown, type: 'department' | 'division' | 'district' | 'category'): LookupOption[] {
  const list = findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      if (type === 'department') {
        const abbreviation = toText(row.abbreviation)
        const name = toText(row.name)
        return {
          id: toText(row.id),
          name: abbreviation && name ? `${abbreviation.toUpperCase()} (${name})` : name || abbreviation,
        }
      }

      if (type === 'division') {
        return {
          id: toText(row.id),
          name: toText(row.division ?? row.name),
        }
      }

      if (type === 'district') {
        return {
          id: toText(row.id),
          name: toText(row.name),
        }
      }

      return {
        id: toText(row.id),
        name: toText(row.name),
        bookingType: toText(row.bookingType),
      }
    })
    .filter(option => option.id && option.name)
}

function buildEditForm(place: PlaceSummary): EditForm {
  return {
    placeName: place.placeName,
    deptId: place.deptId ?? '',
    divisionId: place.divisionId ?? '',
    districtId: place.districtId ?? '',
    categoryId: place.categoryId ?? '',
    placeId: place.id || place.placeId,
    placeCode: place.placeCode,
    slot: place.slot ?? '',
  }
}

function statusStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function LoadingState() {
  return <RajasthanLoader label="Loading places..." />
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-xl3 p-5"
      style={{ background: '#fff', border: '1px solid rgba(139,26,26,0.2)' }}
    >
      <div className="flex gap-3">
        <AlertCircle size={20} style={{ color: 'var(--maroon)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--maroon)' }}>
            Place data unavailable
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
        style={{ fontSize: 12, background: 'var(--maroon)', color: '#fff' }}
      >
        <RefreshCw size={13} />
        Retry
      </button>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  note,
  icon,
  color,
}: {
  label: string
  value: string
  note: string
  icon: ReactNode
  color: string
}) {
  return (
    <div
      className="rounded-xl3 px-5 py-4 flex items-center gap-4"
      style={{ background: '#fff', border: '1px solid var(--sand)', minHeight: 108 }}
    >
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: 46, height: 46, background: 'var(--cream-dark)', color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </div>
        <div className="font-serif font-bold truncate" style={{ fontSize: 24, color, lineHeight: 1.15 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>
      </div>
    </div>
  )
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</h3>
            {subtitle ? <p className="mt-1" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1.5" style={{ background: '#F8F4EE', color: 'var(--text-muted)', fontSize: 12 }}>Close</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({
  open,
  title,
  note,
  label,
  confirmLabel,
  loading,
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  note: string
  label: string
  confirmLabel: string
  loading: boolean
  danger?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center px-4" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</div>
        <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{note}</p>
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', fontSize: 13, color: 'var(--text-dark)' }}>{label}</div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: danger ? 'linear-gradient(135deg, #8B1A1A 0%, #C04E4E 100%)' : 'linear-gradient(135deg, #1A7A6E 0%, #58A99C 100%)', fontSize: 14 }}>{loading ? 'Please wait...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function FieldBlock({
  label,
  editing,
  value,
  children,
}: {
  label: string
  editing: boolean
  value: string
  children: ReactNode
}) {
  return (
    <label className="space-y-2">
      <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>{label}</span>
      {editing ? (
        children
      ) : (
        <div className="rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-dark)', minHeight: 48 }}>
          {value || 'N/A'}
        </div>
      )}
    </label>
  )
}

function inputStyle() {
  return {
    width: '100%',
    border: '1px solid var(--sand)',
    borderRadius: 16,
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--text-dark)',
    outline: 'none',
    background: '#fff',
  } as const
}

export default function PlacesManagementView() {
  const router = useRouter()
  const [places, setPlaces] = useState<PlaceSummary[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)
  const [menuOpenId, setMenuOpenId] = useState('')
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogLoading, setAddDialogLoading] = useState(false)
  const [addDialogError, setAddDialogError] = useState('')
  const [addForm, setAddForm] = useState<CreateForm>(DEFAULT_CREATE_FORM)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [filterDialogLoading, setFilterDialogLoading] = useState(false)
  const [filterDialogError, setFilterDialogError] = useState('')
  const [pendingFilters, setPendingFilters] = useState<PlaceFilters>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<PlaceFilters>(DEFAULT_FILTERS)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [editingPlace, setEditingPlace] = useState<PlaceSummary | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    placeName: '',
    deptId: '',
    divisionId: '',
    districtId: '',
    categoryId: '',
    placeId: '',
    placeCode: '',
    slot: '',
  })
  const [departmentOptions, setDepartmentOptions] = useState<LookupOption[]>([])
  const [divisionOptions, setDivisionOptions] = useState<LookupOption[]>([])
  const [districtOptions, setDistrictOptions] = useState<LookupOption[]>([])
  const [addDistrictOptions, setAddDistrictOptions] = useState<LookupOption[]>([])
  const [filterDistrictOptions, setFilterDistrictOptions] = useState<LookupOption[]>([])
  const [categoryOptions, setCategoryOptions] = useState<LookupOption[]>([])
  const selectedPlace = usePlaceStore((state) => state.selectedPlace)
  const setSelectedPlace = usePlaceStore((state) => state.setSelectedPlace)

  async function fetchJson(url: string, fallback: string) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractMessage(payload, fallback))
    return payload
  }

  async function loadLookupCatalogs() {
    const [deptPayload, divisionPayload, categoryPayload] = await Promise.all([
      fetchJson('/api/dept?offset=0&size=500&export=false&searchKey=', 'Unable to fetch departments.'),
      fetchJson('/api/division?searchKey=', 'Unable to fetch divisions.'),
      fetchJson('/api/category?bookingType=NON_INVENTORY%2CINVENTORY&searchKey=&statusList=ACTIVE', 'Unable to fetch categories.'),
    ])

    const nextDepartments = mapLookupOptions(deptPayload, 'department')
    const nextDivisions = mapLookupOptions(divisionPayload, 'division')
    const nextCategories = mapLookupOptions(categoryPayload, 'category')

    setDepartmentOptions(nextDepartments)
    setDivisionOptions(nextDivisions)
    setCategoryOptions(nextCategories)

    return {
      nextDepartments,
      nextDivisions,
      nextCategories,
    }
  }

  async function fetchDistrictOptions(divisionId: string) {
    if (!divisionId) return []
    const payload = await fetchJson(`/api/district?divisionId=${encodeURIComponent(divisionId)}&searchKey=`, 'Unable to fetch districts.')
    return mapLookupOptions(payload, 'district')
  }

  async function loadDistrictOptions(divisionId: string, preferredDistrictId = '') {
    if (!divisionId) {
      setDistrictOptions([])
      if (!preferredDistrictId) {
        setEditForm(current => ({ ...current, districtId: '' }))
      }
      return
    }

    const options = await fetchDistrictOptions(divisionId)
    setDistrictOptions(options)

    if (preferredDistrictId) {
      return
    }

    setEditForm(current => ({
      ...current,
      districtId: options.some(option => option.id === current.districtId) ? current.districtId : '',
    }))
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlaces() {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          offSet: String(page - 1),
          size: String(pageSize),
          export: 'false',
          searchKey: searchTerm,
          deptList: appliedFilters.deptId,
          divisionList: appliedFilters.divisionId,
          districtList: appliedFilters.districtId,
          categoryList: appliedFilters.categoryId,
          statusList: appliedFilters.status,
        })

        const response = await fetch(`/api/place?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
          cache: 'no-store',
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(extractMessage(payload, `API request failed with status ${response.status}.`))
        }

        const list = extractPlaces(payload)
        const total = payload && typeof payload === 'object'
          ? Number((payload as { result?: { totalRecords?: number }, totalRecords?: number, total?: number }).result?.totalRecords ?? (payload as { totalRecords?: number }).totalRecords ?? (payload as { total?: number }).total ?? list.length)
          : list.length

        setTotalRecords(Number.isFinite(total) ? total : list.length)
        setPlaces(list.map(mapPlaceItem).filter((item): item is PlaceSummary => Boolean(item)))
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch place data.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPlaces()

    return () => controller.abort()
  }, [appliedFilters.categoryId, appliedFilters.deptId, appliedFilters.districtId, appliedFilters.divisionId, appliedFilters.status, page, pageSize, reloadKey, searchTerm])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    function closeMenu() {
      setMenuOpenId('')
    }

    if (!menuOpenId) return
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [menuOpenId])

  const filteredPlaces = places

  const totals = useMemo(() => {
    return filteredPlaces.reduce(
      (summary, place) => ({
        visitors: summary.visitors + place.totalVisitors,
        revenue: summary.revenue + place.totalAmount,
        bookings: summary.bookings + getTotalBookings(place),
      }),
      { visitors: 0, revenue: 0, bookings: 0 }
    )
  }, [filteredPlaces])

  const activeFilterCount = [
    appliedFilters.deptId,
    appliedFilters.divisionId,
    appliedFilters.districtId,
    appliedFilters.categoryId,
    appliedFilters.status,
  ].filter(Boolean).length

  async function openAddDialog() {
    setAddDialogOpen(true)
    setAddDialogLoading(true)
    setAddDialogError('')
    setAddForm(DEFAULT_CREATE_FORM)
    setAddDistrictOptions([])

    try {
      await loadLookupCatalogs()
    } catch (loadError) {
      setAddDialogError(loadError instanceof Error ? loadError.message : 'Unable to load add-place form.')
    } finally {
      setAddDialogLoading(false)
    }
  }

  async function openFilterDialog() {
    setFilterDialogOpen(true)
    setFilterDialogLoading(true)
    setFilterDialogError('')
    setPendingFilters(appliedFilters)

    try {
      await loadLookupCatalogs()
      if (appliedFilters.divisionId) {
        const districts = await fetchDistrictOptions(appliedFilters.divisionId)
        setFilterDistrictOptions(districts)
      } else {
        setFilterDistrictOptions([])
      }
    } catch (loadError) {
      setFilterDialogError(loadError instanceof Error ? loadError.message : 'Unable to load place filters.')
    } finally {
      setFilterDialogLoading(false)
    }
  }

  async function handleAddDivisionChange(divisionId: string) {
    setAddForm(current => ({ ...current, divisionId, districtId: '' }))
    if (!divisionId) {
      setAddDistrictOptions([])
      return
    }

    try {
      const districts = await fetchDistrictOptions(divisionId)
      setAddDistrictOptions(districts)
    } catch (loadError) {
      setAddDialogError(loadError instanceof Error ? loadError.message : 'Unable to fetch districts.')
      setAddDistrictOptions([])
    }
  }

  async function handleFilterDivisionChange(divisionId: string) {
    setPendingFilters(current => ({ ...current, divisionId, districtId: '' }))
    if (!divisionId) {
      setFilterDistrictOptions([])
      return
    }

    try {
      const districts = await fetchDistrictOptions(divisionId)
      setFilterDistrictOptions(districts)
    } catch (loadError) {
      setFilterDialogError(loadError instanceof Error ? loadError.message : 'Unable to fetch districts.')
      setFilterDistrictOptions([])
    }
  }

  async function handleCreatePlace() {
    try {
      setIsSaving(true)
      setAddDialogError('')

      if (!addForm.placeName.trim()) throw new Error('Place Name is required.')
      if (!addForm.placeCode.trim()) throw new Error('Place Code is required.')
      if (!addForm.deptId) throw new Error('Department is required.')
      if (!addForm.divisionId) throw new Error('Division is required.')
      if (!addForm.districtId) throw new Error('District is required.')
      if (!addForm.categoryId) throw new Error('Category is required.')

      const payload = {
        categoryId: addForm.categoryId,
        deptId: addForm.deptId,
        districtId: addForm.districtId,
        divisionId: addForm.divisionId,
        name: addForm.placeName.trim(),
        placeCode: addForm.placeCode.trim(),
        nameRequired: false,
        asi: false,
        activity: 'A',
        slot: '',
      }

      const response = await fetch('/api/place', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to create place.'))

      const resultRecord = getRecord(result)
      const createdPlace = mapPlaceItem(resultRecord?.result ?? result)

      setAddDialogOpen(false)
      setAddForm(DEFAULT_CREATE_FORM)
      setAddDistrictOptions([])
      setSuccessMessage(extractMessage(result, 'Place created successfully.'))
      setPage(1)
      setReloadKey(key => key + 1)

      if (createdPlace?.placeId || createdPlace?.id) {
        const routePlaceId = createdPlace.placeId || createdPlace.id
        setSelectedPlace(createdPlace)
        router.push(`/places/${encodeURIComponent(routePlaceId)}`)
      }
    } catch (saveError) {
      setAddDialogError(saveError instanceof Error ? saveError.message : 'Unable to create place.')
    } finally {
      setIsSaving(false)
    }
  }

  function applyFilters() {
    setAppliedFilters(pendingFilters)
    setFilterDialogOpen(false)
    setPage(1)
  }

  function resetFilters() {
    setPendingFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    setFilterDistrictOptions([])
    setFilterDialogOpen(false)
    setPage(1)
  }

  async function openEditDialog(place: PlaceSummary) {
    setMenuOpenId('')
    setEditDialogOpen(true)
    setEditMode(false)
    setEditLoading(true)
    setDialogError('')
    setEditingPlace(place)
    setEditForm(buildEditForm(place))

    try {
      const [placePayload] = await Promise.all([
        fetchJson(`/api/place/${encodeURIComponent(place.id || place.placeId)}`, 'Unable to fetch place details.'),
        loadLookupCatalogs(),
      ])

      const placeDetail = mapPlaceItem(getRecord(placePayload)?.result ?? placePayload) ?? place
      setEditingPlace(placeDetail)
      setEditForm(buildEditForm(placeDetail))

      if (placeDetail.divisionId) {
        await loadDistrictOptions(placeDetail.divisionId, placeDetail.districtId ?? '')
      } else {
        setDistrictOptions([])
      }
    } catch (loadError) {
      setDialogError(loadError instanceof Error ? loadError.message : 'Unable to load place details.')
    } finally {
      setEditLoading(false)
    }
  }

  function closeEditDialog() {
    setEditDialogOpen(false)
    setEditMode(false)
    setEditLoading(false)
    setDialogError('')
    setEditingPlace(null)
    setDistrictOptions([])
  }

  async function handleConfirmAction() {
    if (!confirmState) return

    try {
      setIsSaving(true)

      if (confirmState.mode === 'delete') {
        const response = await fetch(`/api/place?placeId=${encodeURIComponent(confirmState.place.id || confirmState.place.placeId)}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to delete place.'))

        setPlaces(current => current.filter(item => (item.id || item.placeId) !== (confirmState.place.id || confirmState.place.placeId)))
        setTotalRecords(current => Math.max(0, current - 1))
        setSuccessMessage(extractMessage(payload, 'Place deleted successfully.'))

        if ((selectedPlace?.id || selectedPlace?.placeId) === (confirmState.place.id || confirmState.place.placeId)) {
          setSelectedPlace(null)
        }

        if (places.length === 1 && page > 1) {
          setPage(current => Math.max(1, current - 1))
        } else {
          setReloadKey(key => key + 1)
        }
      } else {
        const nextActive = !confirmState.place.active
        const response = await fetch('/api/system/placeActivate', {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            placeId: confirmState.place.id || confirmState.place.placeId,
            active: nextActive,
          }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to update place status.'))

        setPlaces(current => current.map(item =>
          (item.id || item.placeId) === (confirmState.place.id || confirmState.place.placeId)
            ? { ...item, active: nextActive }
            : item
        ))
        setSuccessMessage(extractMessage(payload, nextActive ? 'Place activated successfully.' : 'Place deactivated successfully.'))

        if ((selectedPlace?.id || selectedPlace?.placeId) === (confirmState.place.id || confirmState.place.placeId)) {
          setSelectedPlace({ ...selectedPlace, active: nextActive })
        }
      }

      setConfirmState(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to process place action.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingPlace) return

    try {
      setIsSaving(true)
      setDialogError('')

      if (!editForm.placeName.trim()) throw new Error('Place Name is required.')
      if (!editForm.deptId) throw new Error('Department is required.')
      if (!editForm.divisionId) throw new Error('Division is required.')
      if (!editForm.districtId) throw new Error('District is required.')
      if (!editForm.categoryId) throw new Error('Category is required.')
      if (!editForm.placeCode.trim()) throw new Error('Place Code is required.')

      const payload = {
        id: editingPlace.id || editingPlace.placeId,
        categoryId: editForm.categoryId,
        deptId: editForm.deptId,
        districtId: editForm.districtId,
        divisionId: editForm.divisionId,
        name: editForm.placeName,
        placeCode: editForm.placeCode,
        nameRequired: editingPlace.nameRequired ?? false,
        asi: editingPlace.asi ?? false,
        activity: editingPlace.activity || 'A',
        slot: editForm.slot,
      }

      const response = await fetch(`/api/place?placeId=${encodeURIComponent(editingPlace.id || editingPlace.placeId)}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to update place details.'))

      const updatedPlace: PlaceSummary = {
        ...editingPlace,
        placeName: editForm.placeName,
        placeCode: editForm.placeCode,
        deptId: editForm.deptId,
        divisionId: editForm.divisionId,
        districtId: editForm.districtId,
        categoryId: editForm.categoryId,
        deptName: findOptionLabel(departmentOptions, editForm.deptId, editingPlace.deptName || 'N/A'),
        divisionName: findOptionLabel(divisionOptions, editForm.divisionId, editingPlace.divisionName || 'N/A'),
        districtName: findOptionLabel(districtOptions, editForm.districtId, editingPlace.districtName || 'N/A'),
        categoryName: findOptionLabel(categoryOptions, editForm.categoryId, editingPlace.categoryName || 'N/A'),
        bookingType: categoryOptions.find(option => option.id === editForm.categoryId)?.bookingType ?? editingPlace.bookingType,
        slot: editForm.slot,
      }

      setPlaces(current => current.map(item =>
        (item.id || item.placeId) === (updatedPlace.id || updatedPlace.placeId)
          ? updatedPlace
          : item
      ))

      if ((selectedPlace?.id || selectedPlace?.placeId) === (updatedPlace.id || updatedPlace.placeId)) {
        setSelectedPlace({ ...selectedPlace, ...updatedPlace })
      }

      setEditingPlace(updatedPlace)
      setEditMode(false)
      setSuccessMessage(extractMessage(result, 'Place updated successfully.'))
      setReloadKey(key => key + 1)
    } catch (saveError) {
      setDialogError(saveError instanceof Error ? saveError.message : 'Unable to update place details.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!error && isLoading && places.length === 0) {
    return <LoadingState />
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif font-bold" style={{ fontSize: 28, color: 'var(--text-dark)', lineHeight: 1.1 }}>
            Place Management
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Live place-wise visitors, bookings and revenue from Rajasthan Tourism.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => void openFilterDialog()}
            className="relative flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{
              fontSize: 12,
              background: activeFilterCount > 0 ? 'rgba(139,26,26,0.08)' : '#fff',
              border: '1px solid var(--sand)',
              color: activeFilterCount > 0 ? 'var(--maroon)' : 'var(--text-mid)',
            }}
          >
            <Filter size={13} />
            Filter
            {activeFilterCount > 0 ? (
              <span
                className="inline-flex items-center justify-center rounded-full font-semibold text-white"
                style={{ minWidth: 18, height: 18, paddingInline: 5, background: 'var(--maroon)', fontSize: 10 }}
              >
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => void openAddDialog()}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}
          >
            <Plus size={14} />
            Add Place
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2"
          style={{ background: '#fff', border: '1px solid var(--sand)', minWidth: 260, maxWidth: 420 }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={searchTerm}
            onChange={event => {
              setSearchTerm(event.target.value)
              setPage(1)
            }}
            placeholder="Search by place name or code..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 12, color: 'var(--text-dark)' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="flex items-center justify-center rounded-full"
              style={{ width: 22, height: 22, color: 'var(--text-muted)' }}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {activeFilterCount > 0 ? (
          <button
            onClick={resetFilters}
            className="rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
          >
            Clear Filters
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Visible Places"
          value={formatNumber(filteredPlaces.length)}
          note={`${formatNumber(places.length)} total places`}
          icon={<Building2 size={20} />}
          color="var(--maroon)"
        />
        <SummaryCard
          label="Visitors"
          value={formatNumber(totals.visitors)}
          note="For current filter"
          icon={<Users size={20} />}
          color="var(--teal)"
        />
        <SummaryCard
          label="Revenue"
          value={formatCurrency(totals.revenue)}
          note="For current filter"
          icon={<IndianRupee size={20} />}
          color="var(--gold)"
        />
        <SummaryCard
          label="Bookings"
          value={formatNumber(totals.bookings)}
          note="Online and offline"
          icon={<Ticket size={20} />}
          color="var(--text-mid)"
        />
      </div>

      {successMessage ? (
        <div className="rounded-xl3 px-5 py-4" style={{ background: 'rgba(26,122,110,0.08)', border: '1px solid rgba(26,122,110,0.2)', color: '#1A7A6E', fontSize: 13 }}>
          {successMessage}
        </div>
      ) : null}

      {error && <ErrorState message={error} onRetry={() => setReloadKey(key => key + 1)} />}

      {!error && places.length > 0 && (
        <div>
          <SectionHeader
            title="Dept. of Archaeology - Live Sites"
            right={
              <span className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Showing {formatNumber(Math.min((page - 1) * pageSize + 1, totalRecords))} - {formatNumber(Math.min(page * pageSize, totalRecords))} of {formatNumber(totalRecords)}
              </span>
            }
          />

          {filteredPlaces.length > 0 ? (
            <div className="space-y-6">
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
                {filteredPlaces.map(place => {
                  const detailHref = `/places/${encodeURIComponent(place.placeId || getPlaceKey(place))}`
                  const hasOnlineBookings = place.totalBookingsOnline > 0
                  const hasOfflineBookings = place.totalBookingsOffline > 0
                  const isMenuOpen = menuOpenId === (place.id || place.placeId)

                  return (
                    <div
                      key={getPlaceKey(place)}
                      className="relative rounded-xl3 card-lift cursor-pointer"
                      style={{
                        background: '#fff',
                        border: '1px solid var(--sand)',
                      }}
                      onClick={() => {
                        setSelectedPlace(place)
                      }}
                    >
                      <div className="px-4 py-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                            {place.placeCode || 'Archaeological Site'}
                          </div>
                          <div className="relative flex items-center gap-2">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 font-medium"
                              style={{
                                fontSize: 10,
                                ...statusStyle(place.active),
                              }}
                            >
                              {place.active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              type="button"
                              aria-label="Open place actions"
                              className="flex h-8 w-8 items-center justify-center rounded-full"
                              style={{ background: '#F8F4EE', color: 'var(--text-mid)' }}
                              onClick={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                setMenuOpenId(current => current === (place.id || place.placeId) ? '' : (place.id || place.placeId))
                              }}
                            >
                              <Menu size={16} />
                            </button>

                            {isMenuOpen ? (
                              <div
                                className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-2xl"
                                style={{ background: '#fff', border: '1px solid var(--sand)', boxShadow: '0 16px 32px rgba(27,18,10,0.12)' }}
                                onClick={event => {
                                  event.stopPropagation()
                                }}
                              >
                                <button
                                  type="button"
                                  className="block w-full px-4 py-3 text-left"
                                  style={{ fontSize: 13, color: 'var(--text-dark)' }}
                                  onClick={event => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    void openEditDialog(place)
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="block w-full px-4 py-3 text-left"
                                  style={{ fontSize: 13, color: place.active ? 'var(--maroon)' : '#1A7A6E', borderTop: '1px solid var(--sand)' }}
                                  onClick={event => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setMenuOpenId('')
                                    setConfirmState({ mode: 'status', place })
                                  }}
                                >
                                  {place.active ? 'Inactive' : 'Active'}
                                </button>
                                <button
                                  type="button"
                                  className="block w-full px-4 py-3 text-left"
                                  style={{ fontSize: 13, color: 'var(--maroon)', borderTop: '1px solid var(--sand)' }}
                                  onClick={event => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setMenuOpenId('')
                                    setConfirmState({ mode: 'delete', place })
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className="font-serif font-bold leading-tight mb-3"
                          style={{ fontSize: 15, color: 'var(--text-dark)', minHeight: 38 }}
                        >
                          {place.placeName}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium"
                            style={{
                              fontSize: 10,
                              background: hasOnlineBookings ? 'rgba(26,122,110,0.12)' : 'rgba(154,122,90,0.1)',
                              color: hasOnlineBookings ? 'var(--teal)' : 'var(--text-muted)',
                            }}
                          >
                            <span
                              className="rounded-full inline-block"
                              style={{ width: 6, height: 6, background: hasOnlineBookings ? 'var(--teal)' : 'var(--text-muted)' }}
                            />
                            Online {formatNumber(place.totalBookingsOnline)}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium"
                            style={{
                              fontSize: 10,
                              background: hasOfflineBookings ? 'rgba(200,146,42,0.14)' : 'rgba(154,122,90,0.1)',
                              color: hasOfflineBookings ? 'var(--gold)' : 'var(--text-muted)',
                            }}
                          >
                            <span
                              className="rounded-full inline-block"
                              style={{ width: 6, height: 6, background: hasOfflineBookings ? 'var(--gold)' : 'var(--text-muted)' }}
                            />
                            Offline {formatNumber(place.totalBookingsOffline)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 300 }}>Total Visitors</div>
                            <div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>
                              {formatNumber(place.totalVisitors)}
                            </div>
                          </div>
                          <div
                            className="inline-flex flex-col items-end rounded-lg px-2 py-1"
                            style={{
                              background: 'rgba(200,146,42,0.1)',
                              color: 'var(--maroon)',
                              minWidth: 92,
                            }}
                          >
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Revenue</span>
                            <span className="font-semibold" style={{ fontSize: 11 }}>{formatCurrency(place.totalAmount)}</span>
                          </div>
                        </div>

                        <Link
                          href={detailHref}
                          className="w-full rounded-lg py-2 text-white font-medium transition-colors"
                          style={{
                            background: 'var(--maroon)',
                            fontSize: 11,
                            letterSpacing: '0.4px',
                            display: 'block',
                            textAlign: 'center',
                          }}
                          onMouseEnter={event => (event.currentTarget.style.background = 'var(--maroon-light)')}
                          onMouseLeave={event => (event.currentTarget.style.background = 'var(--maroon)')}
                          onClick={event => {
                            event.stopPropagation()
                            setSelectedPlace(place)
                          }}
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--sand)] pt-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setPage(1)
                      }}
                      className="appearance-none rounded-xl pl-4 pr-10 py-2 outline-none font-medium transition-all hover:border-[var(--maroon)]"
                      style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 120 }}
                    >
                      {[10, 20, 50, 100].map(size => (
                        <option key={size} value={size}>{size} per page</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Total {formatNumber(totalRecords)} places
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1 || isLoading}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="flex items-center justify-center rounded-xl w-9 h-9 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--cream)]"
                    style={{ border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(totalRecords / pageSize)) }, (_, i) => {
                      const pageNum = i + 1
                      const isCurrent = page === pageNum
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className="flex items-center justify-center rounded-xl w-9 h-9 font-medium transition-all"
                          style={{
                            fontSize: 12,
                            background: isCurrent ? 'var(--maroon)' : 'transparent',
                            color: isCurrent ? '#fff' : 'var(--text-dark)',
                            border: isCurrent ? '1px solid var(--maroon)' : '1px solid transparent'
                          }}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    {Math.ceil(totalRecords / pageSize) > 5 && (
                      <span className="px-1 text-[var(--text-muted)]">...</span>
                    )}
                  </div>

                  <button
                    disabled={page >= Math.ceil(totalRecords / pageSize) || isLoading}
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center justify-center rounded-xl w-9 h-9 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--cream)]"
                    style={{ border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl3 px-5 py-8 text-center" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--text-dark)' }}>
                No places match this filter
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Try another search term.
              </p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={addDialogOpen}
        title="Add Place"
        onClose={() => {
          setAddDialogOpen(false)
          setAddDialogError('')
          setAddForm(DEFAULT_CREATE_FORM)
          setAddDistrictOptions([])
        }}
      >
        {addDialogLoading ? (
          <RajasthanLoader label="Loading add-place form..." />
        ) : (
          <div className="space-y-6">
            {addDialogError ? (
              <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', border: '1px solid rgba(139,26,26,0.18)', color: 'var(--maroon)', fontSize: 13 }}>
                {addDialogError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Place Name</span>
                <input
                  value={addForm.placeName}
                  onChange={event => setAddForm(current => ({ ...current, placeName: event.target.value }))}
                  style={inputStyle()}
                  placeholder="Enter place name"
                />
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Place Code</span>
                <input
                  value={addForm.placeCode}
                  onChange={event => setAddForm(current => ({ ...current, placeCode: event.target.value }))}
                  style={inputStyle()}
                  placeholder="Enter place code"
                />
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Department</span>
                <select value={addForm.deptId} onChange={event => setAddForm(current => ({ ...current, deptId: event.target.value }))} style={inputStyle()}>
                  <option value="">Select Department</option>
                  {departmentOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Division</span>
                <select value={addForm.divisionId} onChange={event => void handleAddDivisionChange(event.target.value)} style={inputStyle()}>
                  <option value="">Select Division</option>
                  {divisionOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>District</span>
                <select value={addForm.districtId} onChange={event => setAddForm(current => ({ ...current, districtId: event.target.value }))} style={inputStyle()} disabled={!addForm.divisionId}>
                  <option value="">Select District</option>
                  {addDistrictOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Category</span>
                <select value={addForm.categoryId} onChange={event => setAddForm(current => ({ ...current, categoryId: event.target.value }))} style={inputStyle()}>
                  <option value="">Select Category</option>
                  {categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setAddDialogOpen(false)
                  setAddDialogError('')
                  setAddForm(DEFAULT_CREATE_FORM)
                  setAddDistrictOptions([])
                }}
                className="rounded-xl px-5 py-2.5 font-medium"
                style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreatePlace()}
                disabled={isSaving}
                className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
              >
                {isSaving ? 'Saving...' : 'Add Place'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={filterDialogOpen}
        title="Place Filters"
        subtitle="Filter places using the same department, division, district, category, and status flow."
        onClose={() => {
          setFilterDialogOpen(false)
          setFilterDialogError('')
          setPendingFilters(appliedFilters)
        }}
      >
        {filterDialogLoading ? (
          <RajasthanLoader label="Loading filters..." />
        ) : (
          <div className="space-y-6">
            {filterDialogError ? (
              <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', border: '1px solid rgba(139,26,26,0.18)', color: 'var(--maroon)', fontSize: 13 }}>
                {filterDialogError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Department</span>
                <select value={pendingFilters.deptId} onChange={event => setPendingFilters(current => ({ ...current, deptId: event.target.value }))} style={inputStyle()}>
                  <option value="">All Departments</option>
                  {departmentOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Division</span>
                <select value={pendingFilters.divisionId} onChange={event => void handleFilterDivisionChange(event.target.value)} style={inputStyle()}>
                  <option value="">All Divisions</option>
                  {divisionOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>District</span>
                <select value={pendingFilters.districtId} onChange={event => setPendingFilters(current => ({ ...current, districtId: event.target.value }))} style={inputStyle()} disabled={!pendingFilters.divisionId}>
                  <option value="">All Districts</option>
                  {filterDistrictOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Category</span>
                <select value={pendingFilters.categoryId} onChange={event => setPendingFilters(current => ({ ...current, categoryId: event.target.value }))} style={inputStyle()}>
                  <option value="">All Categories</option>
                  {categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Status</span>
                <select value={pendingFilters.status} onChange={event => setPendingFilters(current => ({ ...current, status: event.target.value }))} style={inputStyle()}>
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={resetFilters}
                className="rounded-xl px-5 py-2.5 font-medium"
                style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', fontSize: 13 }}
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setFilterDialogOpen(false)
                  setFilterDialogError('')
                  setPendingFilters(appliedFilters)
                }}
                className="rounded-xl px-5 py-2.5 font-medium"
                style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={applyFilters}
                className="rounded-xl px-6 py-2.5 font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editDialogOpen}
        title="Place Details"
        subtitle={editingPlace?.placeName || 'Review and update place details.'}
        onClose={closeEditDialog}
      >
        {editLoading ? (
          <RajasthanLoader label="Loading place details..." />
        ) : (
          <div className="space-y-6">
            {dialogError ? (
              <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', border: '1px solid rgba(139,26,26,0.18)', color: 'var(--maroon)', fontSize: 13 }}>
                {dialogError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock label="Place Name" editing={editMode} value={editForm.placeName}>
                <input value={editForm.placeName} onChange={event => setEditForm(current => ({ ...current, placeName: event.target.value }))} style={inputStyle()} />
              </FieldBlock>

              <FieldBlock label="Department" editing={editMode} value={findOptionLabel(departmentOptions, editForm.deptId, editingPlace?.deptName || 'N/A')}>
                <select value={editForm.deptId} onChange={event => setEditForm(current => ({ ...current, deptId: event.target.value }))} style={inputStyle()}>
                  <option value="">Select Department</option>
                  {departmentOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </FieldBlock>

              <FieldBlock label="Division" editing={editMode} value={findOptionLabel(divisionOptions, editForm.divisionId, editingPlace?.divisionName || 'N/A')}>
                <select
                  value={editForm.divisionId}
                  onChange={event => {
                    const value = event.target.value
                    setEditForm(current => ({ ...current, divisionId: value, districtId: '' }))
                    void loadDistrictOptions(value)
                  }}
                  style={inputStyle()}
                >
                  <option value="">Select Division</option>
                  {divisionOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </FieldBlock>

              <FieldBlock label="District" editing={editMode} value={findOptionLabel(districtOptions, editForm.districtId, editingPlace?.districtName || 'N/A')}>
                <select value={editForm.districtId} onChange={event => setEditForm(current => ({ ...current, districtId: event.target.value }))} style={inputStyle()} disabled={!editForm.divisionId}>
                  <option value="">Select District</option>
                  {districtOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </FieldBlock>

              <FieldBlock label="Category" editing={editMode} value={findOptionLabel(categoryOptions, editForm.categoryId, editingPlace?.categoryName || 'N/A')}>
                <select value={editForm.categoryId} onChange={event => setEditForm(current => ({ ...current, categoryId: event.target.value }))} style={inputStyle()}>
                  <option value="">Select Category</option>
                  {categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </FieldBlock>

              <FieldBlock label="Place ID" editing={false} value={editForm.placeId}>
                <></>
              </FieldBlock>

              <FieldBlock label="Place Code" editing={editMode} value={editForm.placeCode}>
                <input value={editForm.placeCode} onChange={event => setEditForm(current => ({ ...current, placeCode: event.target.value }))} style={inputStyle()} />
              </FieldBlock>

              <FieldBlock label="Slot" editing={editMode} value={getSlotLabel(editForm.slot)}>
                <select value={editForm.slot} onChange={event => setEditForm(current => ({ ...current, slot: event.target.value }))} style={inputStyle()}>
                  <option value="">Select Slot</option>
                  {SLOT_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </FieldBlock>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button onClick={closeEditDialog} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
                Close
              </button>
              {editMode ? (
                <>
                  <button
                    onClick={() => {
                      if (editingPlace) {
                        setEditForm(buildEditForm(editingPlace))
                      }
                      setEditMode(false)
                    }}
                    className="rounded-xl px-5 py-2.5 font-medium"
                    style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSaveEdit()}
                    disabled={isSaving}
                    className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="rounded-xl px-6 py-2.5 font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.mode === 'delete' ? 'Delete place?' : confirmState?.place.active ? 'Deactivate place?' : 'Activate place?'}
        note={confirmState?.mode === 'delete' ? 'This will permanently remove the selected place.' : `This will ${confirmState?.place.active ? 'deactivate' : 'activate'} the selected place.`}
        label={confirmState?.place.placeName ?? ''}
        confirmLabel={confirmState?.mode === 'delete' ? 'Delete' : confirmState?.place.active ? 'Deactivate' : 'Activate'}
        loading={isSaving}
        danger={confirmState?.mode === 'delete' || Boolean(confirmState?.place.active)}
        onClose={() => setConfirmState(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </div>
  )
}
