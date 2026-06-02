'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { authFetch } from '@/lib/api/authFetch'

type PackageRow = {
  id: string
  packageName: string
  days: number
  durationLabel: string
  placeCount: number
  active: boolean
  placeIds: string[]
  placeNames: string[]
}

type PlaceOption = {
  id: string
  name: string
}

type PackageForm = {
  id: string
  packageName: string
  duration: string
  placeIds: string[]
}

type FilterState = {
  status: 'all' | 'active' | 'inactive'
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const DEFAULT_FORM: PackageForm = { id: '', packageName: '', duration: '', placeIds: [] }
const DEFAULT_FILTERS: FilterState = { status: 'all' }

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}

function getAny(obj: unknown, key: string) {
  if (!obj || typeof obj !== 'object') return undefined
  return (obj as Record<string, unknown>)[key]
}

function getValueFromKeys(obj: unknown, keys: string[]) {
  for (const key of keys) {
    const value = getAny(obj, key)
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function getText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function getNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
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

function extractPlaces(payload: unknown): PlaceOption[] {
  const list = findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      id: getText(getValueFromKeys(item, ['id', 'placeId', 'place_id', 'placeCode']), ''),
      name: getText(getValueFromKeys(item, ['placeName', 'name', 'place_name', 'placename']), ''),
    }))
    .filter(item => item.id && item.name)
}

function extractTotalRecords(payload: unknown, fallbackLength: number) {
  if (!payload || typeof payload !== 'object') return fallbackLength
  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallbackLength
}

function extractPackages(payload: unknown): PackageRow[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray((result as { packagesGetAll?: unknown[] }).packagesGetAll)
    ? (result as { packagesGetAll: unknown[] }).packagesGetAll
    : findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      const days = getNumber(getValueFromKeys(row, ['days', 'duration']), 0)
      const placeCount = getNumber(getValueFromKeys(row, ['placeCount']), 0)
      return {
        id: getText(getValueFromKeys(row, ['id']), ''),
        packageName: getText(getValueFromKeys(row, ['packageName', 'name'])),
        days,
        durationLabel: days ? `${days} Days` : 'N/A',
        placeCount,
        active: Boolean(getValueFromKeys(row, ['active', 'status'])),
        placeIds: [],
        placeNames: [],
      }
    })
    .filter(item => item.id)
}

function extractPackageDetail(payload: unknown): PackageForm {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const placeDetailResponse = Array.isArray((result as { placeDetailResponse?: unknown[] }).placeDetailResponse)
    ? (result as { placeDetailResponse: unknown[] }).placeDetailResponse
    : []

  return {
    id: getText(getValueFromKeys(result, ['id']), ''),
    packageName: getText(getValueFromKeys(result, ['packageName', 'name'])),
    duration: getText(getValueFromKeys(result, ['days', 'duration']), ''),
    placeIds: placeDetailResponse
      .map(item => getText(getValueFromKeys(item, ['placeId', 'id']), ''))
      .filter(Boolean),
  }
}

function extractPackagePlaceNames(payload: unknown): string[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const placeDetailResponse = Array.isArray((result as { placeDetailResponse?: unknown[] }).placeDetailResponse)
    ? (result as { placeDetailResponse: unknown[] }).placeDetailResponse
    : []

  return placeDetailResponse
    .map(item => getText(getValueFromKeys(item, ['placeName', 'name']), ''))
    .filter(Boolean)
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) pages.add(i)
  if (totalPages > 1) pages.add(totalPages)
  return Array.from(pages).sort((a, b) => a - b)
}

function PageButton({ active, disabled, label, onClick }: { active?: boolean; disabled?: boolean; label: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-w-9 rounded-xl px-3 py-2 font-medium disabled:opacity-40"
      style={{
        background: active ? 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' : '#F8F4EE',
        color: active ? '#fff' : 'var(--text-mid)',
        border: active ? 'none' : '1px solid var(--sand)',
        fontSize: 12,
      }}
    >
      {label}
    </button>
  )
}

function ModalFrame({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
      style={{ background: 'rgba(28,16,8,0.46)', backdropFilter: 'blur(5px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="w-full overflow-hidden rounded-[28px] bg-white"
        style={{ maxWidth: 860, boxShadow: '0 32px 90px rgba(107,18,18,0.24)' }}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 62%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>{title}</div>
            {subtitle ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>{subtitle}</div> : null}
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto px-6 py-6" style={{ background: 'var(--cream)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function PackageManagementPage() {
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDeferredValue(searchText)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [refreshKey, setRefreshKey] = useState(0)
  const [packages, setPackages] = useState<PackageRow[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [places, setPlaces] = useState<PlaceOption[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageRow | null>(null)
  const [form, setForm] = useState<PackageForm>(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PackageForm, string>>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, filters.status])

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlaces() {
      try {
        setPlacesLoading(true)
        const response = await authFetch('/place?size=2000&searchKey=', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch places.'))
        setPlaces(extractPlaces(payload))
      } catch {
        if (!controller.signal.aborted) setPlaces([])
      } finally {
        if (!controller.signal.aborted) setPlacesLoading(false)
      }
    }

    loadPlaces()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadPackages() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({
          offSet: String(page - 1),
          size: String(pageSize),
          searchKey: deferredSearch.trim(),
          statusList: '',
        })

        const response = await fetch(`/api/operations/packages?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch packages.'))

        const nextPackages = extractPackages(payload)
        setPackages(nextPackages)
        setTotalRecords(extractTotalRecords(payload, nextPackages.length))
      } catch (err) {
        if (controller.signal.aborted) return
        setPackages([])
        setTotalRecords(0)
        setError(err instanceof Error ? err.message : 'Unable to fetch packages.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPackages()
    return () => controller.abort()
  }, [deferredSearch, page, pageSize, refreshKey])

  const filteredPackages = useMemo(() => {
    return packages.filter(item => {
      if (filters.status === 'active' && !item.active) return false
      if (filters.status === 'inactive' && item.active) return false
      return true
    })
  }, [packages, filters.status])

  const stats = useMemo(() => {
    const activeCount = filteredPackages.filter(item => item.active).length
    const inactiveCount = filteredPackages.length - activeCount
    const totalPlaces = filteredPackages.reduce((count, item) => count + item.placeCount, 0)
    return [
      { label: 'Listed Packages', value: String(filteredPackages.length) },
      { label: 'Active Packages', value: String(activeCount) },
      { label: 'Inactive Packages', value: String(inactiveCount) },
      { label: 'Mapped Places', value: String(totalPlaces) },
    ]
  }, [filteredPackages])

  const totalPages = Math.max(1, Math.ceil(Math.max(totalRecords, 1) / pageSize))
  const pages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])

  function validateForm(values: PackageForm) {
    const nextErrors: Partial<Record<keyof PackageForm, string>> = {}
    if (!values.packageName.trim()) nextErrors.packageName = 'Package name is required.'
    if (!values.duration.trim()) {
      nextErrors.duration = 'Duration is required.'
    } else if (!/^\d{1,3}$/.test(values.duration.trim())) {
      nextErrors.duration = 'Enter a valid duration in days.'
    }
    if (!values.placeIds.length) nextErrors.placeIds = 'Select at least one place.'
    return nextErrors
  }

  async function openCreateModal() {
    setEditingPackage(null)
    setForm(DEFAULT_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  async function openEditModal(pkg: PackageRow) {
    setEditingPackage(pkg)
    setFormErrors({})
    setModalOpen(true)
    setLoadingDetail(true)

    try {
      const response = await fetch(`/api/operations/packages/${pkg.id}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch package details.'))

      const detail = extractPackageDetail(payload)
      const placeNames = extractPackagePlaceNames(payload)
      setEditingPackage(current => current ? { ...current, placeIds: detail.placeIds, placeNames } : current)
      setForm(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch package details.')
      setModalOpen(false)
      setEditingPackage(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleSubmit() {
    const nextErrors = validateForm(form)
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setFormSubmitting(true)
      setError('')

      const payload = editingPackage
        ? { id: editingPackage.id, packageName: form.packageName.trim(), placeIds: form.placeIds, duration: form.duration.trim() }
        : { packageName: form.packageName.trim(), placeIds: form.placeIds, duration: form.duration.trim() }

      const response = await fetch('/api/operations/packages', {
        method: editingPackage ? 'PUT' : 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, editingPackage ? 'Unable to update package.' : 'Unable to create package.'))

      setModalOpen(false)
      setEditingPackage(null)
      setForm(DEFAULT_FORM)
      setSuccessMessage(extractMessage(result, editingPackage ? 'Package updated successfully.' : 'Package created successfully.'))
      setRefreshKey(current => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save package.')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleStatusToggle(pkg: PackageRow) {
    try {
      setError('')
      const response = await fetch('/api/operations/packages/status', {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: pkg.id, activate: !pkg.active }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to update package status.'))

      setSuccessMessage(extractMessage(result, `Package marked ${pkg.active ? 'inactive' : 'active'}.`))
      setRefreshKey(current => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update package status.')
    }
  }

  return (
    <AdminShellLayout>
      <div className="px-6 py-6">
        <div className="overflow-hidden rounded-[28px] px-6 py-6 text-white" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
             
              <h1 className="mt-3 font-serif text-3xl font-bold">Package Management</h1>
             
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(stat => (
                <div key={stat.label} className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.12)', minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 6 }}>{stat.label}</div>
                  <div className="font-serif font-bold" style={{ fontSize: 30, lineHeight: 1, color: '#fff' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SectionHeader title="Package Registry" />
        </div>

        <div className="mt-4 rounded-[28px] bg-white p-5 shadow-sm" style={{ border: '1px solid var(--sand)' }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                  placeholder="Search packages by name"
                  className="w-full rounded-[22px] py-3 pl-11 pr-4 outline-none"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
                />
              </div>
              <button
                onClick={() => setFilterOpen(current => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 font-medium"
                style={{ background: filterOpen ? 'rgba(107,18,18,0.10)' : '#F8F4EE', border: '1px solid var(--sand)', color: filterOpen ? 'var(--maroon)' : 'var(--text-mid)', fontSize: 13 }}
              >
                <SlidersHorizontal size={16} />
                Filter
              </button>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-[22px] px-4 py-3 font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}
            >
              <Plus size={16} />
              Add Package
            </button>
          </div>

          {filterOpen ? (
            <div className="mt-4 grid gap-4 rounded-[24px] p-4 md:grid-cols-3" style={{ background: 'var(--cream)', border: '1px solid var(--sand)' }}>
              <div>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Package Status
                </label>
                <select
                  value={filters.status}
                  onChange={event => setFilters({ status: event.target.value as FilterState['status'] })}
                  className="w-full rounded-[18px] px-4 py-3 outline-none"
                  style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-end gap-3 md:col-span-2">
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="rounded-[18px] px-4 py-3 font-medium"
                  style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 13 }}
                >
                  Clear Filters
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {filters.status === 'all' ? 'Showing all packages.' : `Showing ${filters.status} packages.`}
                </div>
              </div>
            </div>
          ) : null}

          {successMessage ? <div className="mt-4 rounded-[20px] px-4 py-3" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
          {error ? <div className="mt-4 rounded-[20px] px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

          {loading ? (
            <div className="flex justify-center py-16"><RajasthanLoader /></div>
          ) : filteredPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(107,18,18,0.08)', color: 'var(--maroon)' }}>
                <FolderKanban size={28} />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>No packages found</h3>
              <p className="mt-2 max-w-xl" style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
                Try a different search or create a new package to start the listing.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4">
                {filteredPackages.map(item => (
                  <div key={item.id} className="rounded-[26px] p-5" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF6EF 100%)', border: '1px solid var(--sand)', boxShadow: '0 12px 28px rgba(80, 45, 15, 0.05)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>{item.packageName || 'Untitled Package'}</h3>
                          <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, background: item.active ? 'rgba(26,122,110,0.12)' : 'rgba(159,31,31,0.10)', color: item.active ? '#1A7A6E' : '#9F1F1F' }}>
                            {item.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4">
                          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.10)', color: '#9A6A00', fontSize: 12 }}>
                            <MapPin size={13} />
                            {item.placeCount} Places
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(107,18,18,0.08)', color: 'var(--maroon)', fontSize: 12 }}>
                            <Clock3 size={13} />
                            {item.durationLabel}
                          </div>
                        </div>
                        {item.placeNames.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.placeNames.slice(0, 4).map(place => (
                              <span key={place} className="rounded-full px-3 py-1" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>{place}</span>
                            ))}
                            {item.placeNames.length > 4 ? <span className="rounded-full px-3 py-1" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>+{item.placeNames.length - 4} more</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => openEditModal(item)} className="inline-flex items-center gap-2 rounded-[18px] px-4 py-3 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: '#9A6A00', fontSize: 13 }}>
                          <Pencil size={15} />
                          Edit Package
                        </button>
                        <button onClick={() => handleStatusToggle(item)} className="inline-flex items-center gap-2 rounded-[18px] px-4 py-3 font-medium" style={{ background: item.active ? 'rgba(159,31,31,0.10)' : 'rgba(26,122,110,0.10)', color: item.active ? '#9F1F1F' : '#1A7A6E', fontSize: 13 }}>
                          <Check size={15} />
                          {item.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--cream-dark)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing <strong style={{ color: 'var(--text-dark)' }}>{totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRecords)}</strong> of <strong style={{ color: 'var(--text-dark)' }}>{totalRecords}</strong>
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
                    <PageButton label={<ChevronLeft size={16} />} disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))} />
                    {pages.map(pageNumber => <PageButton key={pageNumber} label={pageNumber} active={pageNumber === page} onClick={() => setPage(pageNumber)} />)}
                    <PageButton label={<ChevronRight size={16} />} disabled={page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen ? (
        <ModalFrame
          title={editingPackage ? 'Edit Package' : 'Create Package'}
          subtitle={editingPackage ? `${editingPackage.packageName} | ${editingPackage.durationLabel}` : 'Create a package with duration and mapped places'}
          onClose={() => {
            setModalOpen(false)
            setEditingPackage(null)
            setForm(DEFAULT_FORM)
            setFormErrors({})
          }}
        >
          {loadingDetail ? (
            <div className="flex justify-center py-16"><RajasthanLoader /></div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Package Name *
                  </label>
                  <input
                    value={form.packageName}
                    onChange={event => setForm(current => ({ ...current, packageName: event.target.value }))}
                    placeholder="Enter package name"
                    className="w-full rounded-[20px] px-4 py-3 outline-none"
                    style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                  />
                  {formErrors.packageName ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{formErrors.packageName}</div> : null}
                </div>
                <div>
                  <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Duration (Days) *
                  </label>
                  <input
                    value={form.duration}
                    onChange={event => setForm(current => ({ ...current, duration: event.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    placeholder="00"
                    className="w-full rounded-[20px] px-4 py-3 outline-none"
                    style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                  />
                  {formErrors.duration ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{formErrors.duration}</div> : null}
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Select Places *
                </label>
                <div className="rounded-[22px] bg-white p-4" style={{ border: '1px solid var(--sand)' }}>
                  {placesLoading ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading places...</div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {places.map(place => {
                        const checked = form.placeIds.includes(place.id)
                        return (
                          <label key={place.id} className="flex cursor-pointer items-center gap-3 rounded-[18px] px-3 py-3" style={{ background: checked ? 'rgba(200,146,42,0.10)' : '#F8F4EE', border: checked ? '1px solid rgba(200,146,42,0.35)' : '1px solid var(--sand)' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setForm(current => ({
                                  ...current,
                                  placeIds: checked ? current.placeIds.filter(id => id !== place.id) : [...current.placeIds, place.id],
                                }))
                              }}
                            />
                            <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 500 }}>{place.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                {formErrors.placeIds ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{formErrors.placeIds}</div> : null}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setModalOpen(false)
                    setEditingPackage(null)
                    setForm(DEFAULT_FORM)
                    setFormErrors({})
                  }}
                  className="rounded-xl px-5 py-2.5 font-medium"
                  style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={formSubmitting}
                  className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
                >
                  {formSubmitting ? 'Saving...' : editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </>
          )}
        </ModalFrame>
      ) : null}
    </AdminShellLayout>
  )
}
