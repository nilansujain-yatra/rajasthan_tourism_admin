'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  Upload,
  UserRound,
  X,
} from 'lucide-react'

type DriverRow = {
  id: string
  ssoId: string
  name: string
  email: string
  gender: string
  dob: string
  mobileNumber: string
  placeId: string
  placeName: string
  accountNumber: string
  bankName: string
  ifscCode: string
  registrationNumber: string
  licenceNumber: string
  uploadDocument: string
  active: boolean
}

type PlaceOption = {
  id: string
  name: string
}

type FilterState = {
  active: 'all' | 'active' | 'inactive'
  placeId: string
}

type FormState = {
  id: string
  ssoId: string
  name: string
  email: string
  gender: string
  dob: string
  mobileNumber: string
  placeId: string
  accountNumber: string
  bankName: string
  ifscCode: string
  registrationNumber: string
  licenceNumber: string
  uploadDocument: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const DEFAULT_FILTERS: FilterState = {
  active: 'all',
  placeId: '',
}

const DEFAULT_FORM: FormState = {
  id: '',
  ssoId: '',
  name: '',
  email: '',
  gender: '',
  dob: '',
  mobileNumber: '',
  placeId: '',
  accountNumber: '',
  bankName: '',
  ifscCode: '',
  registrationNumber: '',
  licenceNumber: '',
  uploadDocument: '',
}

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

function extractDrivers(payload: unknown): DriverRow[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray((result as { driverDtos?: unknown[] }).driverDtos)
    ? (result as { driverDtos: unknown[] }).driverDtos
    : findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: getText(getValueFromKeys(row, ['id']), ''),
        ssoId: getText(getValueFromKeys(row, ['ssoId']), ''),
        name: getText(getValueFromKeys(row, ['name'])),
        email: getText(getValueFromKeys(row, ['email'])),
        gender: getText(getValueFromKeys(row, ['gender'])),
        dob: getText(getValueFromKeys(row, ['dob'])),
        mobileNumber: getText(getValueFromKeys(row, ['mobileNumber'])),
        placeId: getText(getValueFromKeys(row, ['placeId']), ''),
        placeName: getText(getValueFromKeys(row, ['placeName'])),
        accountNumber: getText(getValueFromKeys(row, ['accountNumber'])),
        bankName: getText(getValueFromKeys(row, ['bankName'])),
        ifscCode: getText(getValueFromKeys(row, ['ifscCode'])),
        registrationNumber: getText(getValueFromKeys(row, ['registrationNumber'])),
        licenceNumber: getText(getValueFromKeys(row, ['licenceNumber'])),
        uploadDocument: getText(getValueFromKeys(row, ['uploadDocument'])),
        active: Boolean(getValueFromKeys(row, ['active', 'status'])),
      }
    })
    .filter(row => row.id)
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

function formatDobForInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`

  const dashMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dashMatch) return `${dashMatch[3]}-${dashMatch[2]}-${dashMatch[1]}`

  return ''
}

function formatDobForApi(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`

  return trimmed
}

function getDocumentLabel(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'No attachment'

  const parts = trimmed.split('/')
  const last = parts[parts.length - 1] || trimmed
  const splitByUnderscore = last.split('_')
  return splitByUnderscore[splitByUnderscore.length - 1] || last
}

function escapeCsv(value: string | number | boolean) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(rows: DriverRow[]) {
  const headers = [
    'Name',
    'SSO ID',
    'Email',
    'Gender',
    'Date of Birth',
    'Mobile Number',
    'Place',
    'Account Number',
    'Bank Name',
    'IFSC Code',
    'Registration Number',
    'Licence Number',
    'Status',
    'Attachment',
  ]

  const body = rows.map(row => [
    row.name,
    row.ssoId,
    row.email,
    row.gender,
    row.dob,
    row.mobileNumber,
    row.placeName,
    row.accountNumber,
    row.bankName,
    row.ifscCode,
    row.registrationNumber,
    row.licenceNumber,
    row.active ? 'Active' : 'Inactive',
    row.uploadDocument,
  ].map(escapeCsv).join(','))

  const csv = [headers.join(','), ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `drivers-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function PageButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  label: React.ReactNode
  onClick: () => void
}) {
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

export default function DriverManagementPage() {
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDeferredValue(searchText)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [refreshKey, setRefreshKey] = useState(0)
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [serverTotal, setServerTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [places, setPlaces] = useState<PlaceOption[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const hasClientFilters = filters.active !== 'all' || Boolean(filters.placeId)

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, filters.active, filters.placeId])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlaces() {
      try {
        setPlacesLoading(true)
        const response = await fetch('/api/place?size=2000&searchKey=', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch places.'))
        setPlaces(extractPlaces(payload))
      } catch (err) {
        if (controller.signal.aborted) return
        setPlaces([])
      } finally {
        if (!controller.signal.aborted) setPlacesLoading(false)
      }
    }

    loadPlaces()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadDrivers() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({
          offSet: hasClientFilters ? '0' : String(page - 1),
          size: hasClientFilters ? '1000' : String(pageSize),
          searchKey: deferredSearch.trim(),
        })

        if (filters.active !== 'all') {
          params.set('active', String(filters.active === 'active'))
        }
        if (filters.placeId) {
          params.set('placeId', filters.placeId)
        }

        const response = await fetch(`/api/operations/drivers?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch drivers.'))

        const nextDrivers = extractDrivers(payload)
        setDrivers(nextDrivers)
        setServerTotal(extractTotalRecords(payload, nextDrivers.length))
      } catch (err) {
        if (controller.signal.aborted) return
        setDrivers([])
        setServerTotal(0)
        setError(err instanceof Error ? err.message : 'Unable to fetch drivers.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadDrivers()

    return () => controller.abort()
  }, [deferredSearch, filters.active, filters.placeId, hasClientFilters, page, pageSize, refreshKey])

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      if (filters.active === 'active' && !driver.active) return false
      if (filters.active === 'inactive' && driver.active) return false
      if (filters.placeId && driver.placeId !== filters.placeId) return false
      return true
    })
  }, [drivers, filters.active, filters.placeId])

  const totalRecords = hasClientFilters ? filteredDrivers.length : serverTotal
  const visibleRows = hasClientFilters
    ? filteredDrivers.slice((page - 1) * pageSize, page * pageSize)
    : filteredDrivers

  const totalPages = Math.max(1, Math.ceil(Math.max(totalRecords, 1) / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const stats = useMemo(() => {
    const source = filteredDrivers
    const activeCount = source.filter(item => item.active).length
    const inactiveCount = source.length - activeCount
    const placesCount = new Set(source.map(item => item.placeName).filter(Boolean)).size

    return [
      { label: 'Total Drivers', value: String(source.length), color: 'var(--maroon)' },
      { label: 'Active Drivers', value: String(activeCount), color: '#1A7A6E' },
      { label: 'Inactive Drivers', value: String(inactiveCount), color: '#9F1F1F' },
      { label: 'Mapped Places', value: String(placesCount), color: '#C8922A' },
    ]
  }, [filteredDrivers])

  const pages = useMemo(() => {
    const pageSet = new Set<number>([1])
    for (let index = Math.max(1, page - 1); index <= Math.min(totalPages, page + 1); index += 1) {
      pageSet.add(index)
    }
    if (totalPages > 1) pageSet.add(totalPages)
    return Array.from(pageSet).sort((left, right) => left - right)
  }, [page, totalPages])

  function openCreateModal() {
    setEditingDriver(null)
    setForm(DEFAULT_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEditModal(driver: DriverRow) {
    setEditingDriver(driver)
    setForm({
      id: driver.id,
      ssoId: driver.ssoId,
      name: driver.name,
      email: driver.email,
      gender: driver.gender.toUpperCase(),
      dob: formatDobForInput(driver.dob),
      mobileNumber: driver.mobileNumber,
      placeId: driver.placeId,
      accountNumber: driver.accountNumber,
      bankName: driver.bankName,
      ifscCode: driver.ifscCode,
      registrationNumber: driver.registrationNumber,
      licenceNumber: driver.licenceNumber,
      uploadDocument: driver.uploadDocument,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function validateForm(values: FormState) {
    const nextErrors: Partial<Record<keyof FormState, string>> = {}

    if (!values.name.trim()) nextErrors.name = 'Driver name is required.'
    if (!values.mobileNumber.trim()) {
      nextErrors.mobileNumber = 'Mobile number is required.'
    } else if (!/^[1-9]\d{9}$/.test(values.mobileNumber.trim())) {
      nextErrors.mobileNumber = 'Enter a valid 10 digit mobile number.'
    }

    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!values.placeId.trim()) nextErrors.placeId = 'Place is required.'

    return nextErrors
  }

  async function handleSubmit() {
    const nextErrors = validateForm(form)
    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setFormSubmitting(true)
      const payload = {
        ssoId: form.ssoId.trim(),
        accountNumber: form.accountNumber.trim(),
        active: editingDriver?.active ?? false,
        bankName: form.bankName.trim(),
        dob: formatDobForApi(form.dob),
        email: form.email.trim(),
        gender: form.gender.trim(),
        ifscCode: form.ifscCode.trim(),
        mobileNumber: form.mobileNumber.trim(),
        name: form.name.trim(),
        placeId: form.placeId.trim(),
        registrationNumber: form.registrationNumber.trim(),
        uploadDocument: form.uploadDocument.trim(),
        licenceNumber: form.licenceNumber.trim(),
      }

      const response = await fetch('/api/operations/drivers', {
        method: editingDriver ? 'PUT' : 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingDriver ? { ...payload, driverId: form.id } : payload),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, editingDriver ? 'Unable to update driver.' : 'Unable to create driver.'))

      setModalOpen(false)
      setEditingDriver(null)
      setForm(DEFAULT_FORM)
      setFormErrors({})
      setSuccessMessage(extractMessage(result, editingDriver ? 'Driver updated successfully.' : 'Driver created successfully.'))
      setRefreshKey(current => current + 1)
    } catch (err) {
      setFormErrors(current => ({
        ...current,
        name: current.name,
      }))
      setError(err instanceof Error ? err.message : 'Unable to save driver.')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleStatusToggle(driver: DriverRow) {
    try {
      setError('')
      const response = await fetch('/api/operations/drivers/status', {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: driver.id,
          activate: !driver.active,
        }),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to update driver status.'))

      setSuccessMessage(extractMessage(result, `Driver marked ${driver.active ? 'inactive' : 'active'}.`))
      setRefreshKey(current => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update driver status.')
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return

    if (file.type !== 'application/pdf') {
      setFormErrors(current => ({ ...current, uploadDocument: 'Only PDF files are allowed.' }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(current => ({ ...current, uploadDocument: 'Please upload a PDF smaller than 5 MB.' }))
      return
    }

    try {
      setUploading(true)
      setFormErrors(current => ({ ...current, uploadDocument: undefined }))
      const formData = new FormData()
      formData.append('pdfFile', file)

      const response = await fetch('/api/operations/drivers/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to upload driver document.'))

      const uploadedUrl = getText(getValueFromKeys(result, ['result', 'data']), '')
      if (!uploadedUrl) throw new Error('Driver document upload returned an empty file path.')

      setForm(current => ({ ...current, uploadDocument: uploadedUrl }))
      setSuccessMessage('Driver document uploaded successfully.')
    } catch (err) {
      setFormErrors(current => ({
        ...current,
        uploadDocument: err instanceof Error ? err.message : 'Unable to upload driver document.',
      }))
    } finally {
      setUploading(false)
    }
  }

  return (
    <AdminShellLayout>
      <div className="px-6 py-6">
        <div
          className="overflow-hidden rounded-[28px] px-6 py-6 text-white"
          style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
             
              <h1 className="mt-3 font-serif text-3xl font-bold">Driver Management</h1>
             
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(stat => (
                <div
                  key={stat.label}
                  className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.12)', minWidth: 160 }}
                >
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 6 }}>{stat.label}</div>
                  <div className="font-serif font-bold" style={{ fontSize: 30, lineHeight: 1, color: '#fff' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SectionHeader title="Driver Registry" />
        </div>

        <div className="mt-4 rounded-[28px] bg-white p-5 shadow-sm" style={{ border: '1px solid var(--sand)' }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                  placeholder="Search with name, mobile, email or registration number"
                  className="w-full rounded-[22px] py-3 pl-11 pr-4 outline-none"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
                />
              </div>

              <button
                onClick={() => setFilterOpen(current => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 font-medium"
                style={{ background: filterOpen ? 'rgba(107,18,18,0.10)' : '#F8F4EE', border: '1px solid var(--sand)', color: filterOpen ? 'var(--maroon)' : 'var(--text-mid)', fontSize: 13 }}
              >
                <Filter size={16} />
                Filter
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => downloadCsv(filteredDrivers)}
                className="inline-flex items-center gap-2 rounded-[22px] px-4 py-3 font-medium"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 13 }}
              >
                <Download size={16} />
                Export
              </button>

              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-[22px] px-4 py-3 font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}
              >
                <Plus size={16} />
                Add Driver
              </button>
            </div>
          </div>

          {filterOpen ? (
            <div className="mt-4 grid gap-4 rounded-[24px] p-4 md:grid-cols-3" style={{ background: 'var(--cream)', border: '1px solid var(--sand)' }}>
              <div>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Driver Status
                </label>
                <select
                  value={filters.active}
                  onChange={event => setFilters(current => ({ ...current, active: event.target.value as FilterState['active'] }))}
                  className="w-full rounded-[18px] px-4 py-3 outline-none"
                  style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Place
                </label>
                <select
                  value={filters.placeId}
                  onChange={event => setFilters(current => ({ ...current, placeId: event.target.value }))}
                  className="w-full rounded-[18px] px-4 py-3 outline-none"
                  style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                >
                  <option value="">{placesLoading ? 'Loading places...' : 'All places'}</option>
                  {places.map(place => (
                    <option key={place.id} value={place.id}>{place.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-3">
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="rounded-[18px] px-4 py-3 font-medium"
                  style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 13 }}
                >
                  Clear Filters
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {hasClientFilters ? 'Filtered view is active.' : 'Showing all drivers.'}
                </div>
              </div>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-[20px] px-4 py-3" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E', fontSize: 13 }}>
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[20px] px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
              {error}
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-[24px]" style={{ border: '1px solid var(--sand)' }}>
            {loading ? (
              <div className="flex justify-center py-16">
                <RajasthanLoader />
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(107,18,18,0.08)', color: 'var(--maroon)' }}>
                  <UserRound size={28} />
                </div>
                <h3 className="mt-4 font-serif text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>No drivers found</h3>
                <p className="mt-2 max-w-xl" style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
                  Try adjusting the search or filters, or create a new driver record to begin the registry.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1400px]">
                    <thead>
                      <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                        {['Driver', 'Contact', 'Gender', 'DOB', 'Place', 'Banking', 'Registration', 'Document', 'Status', 'Actions'].map(header => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left"
                            style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700 }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((driver, index) => (
                        <tr
                          key={driver.id}
                          style={{
                            borderBottom: index < visibleRows.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                            background: '#fff',
                          }}
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-start gap-3">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                                style={{ background: 'linear-gradient(135deg, #6B1212 0%, #C8922A 100%)', fontSize: 12, fontWeight: 700 }}
                              >
                                {driver.name.split(' ').filter(Boolean).map(word => word[0]).join('').slice(0, 2) || 'DR'}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{driver.name || 'N/A'}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SSO: {driver.ssoId || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{driver.mobileNumber || 'N/A'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{driver.email || 'No email'}</div>
                          </td>
                          <td className="px-4 py-4 align-top" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
                            {driver.gender || 'N/A'}
                          </td>
                          <td className="px-4 py-4 align-top" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
                            {driver.dob || 'N/A'}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.10)', color: '#9A6A00', fontSize: 12 }}>
                              <MapPin size={13} />
                              {driver.placeName || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{driver.bankName || 'N/A'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{driver.accountNumber || 'No account number'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{driver.ifscCode || 'No IFSC'}</div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div style={{ fontSize: 13, color: 'var(--text-dark)' }}>{driver.registrationNumber || 'N/A'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>License: {driver.licenceNumber || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            {driver.uploadDocument ? (
                              <a
                                href={driver.uploadDocument}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium"
                                style={{ background: 'rgba(107,18,18,0.08)', color: 'var(--maroon)', fontSize: 12 }}
                              >
                                <FileText size={13} />
                                {getDocumentLabel(driver.uploadDocument)}
                              </a>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No document</span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span
                              className="rounded-full px-3 py-1 font-medium"
                              style={{
                                fontSize: 11,
                                background: driver.active ? 'rgba(26,122,110,0.12)' : 'rgba(159,31,31,0.10)',
                                color: driver.active ? '#1A7A6E' : '#9F1F1F',
                              }}
                            >
                              {driver.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openEditModal(driver)}
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium"
                                style={{ background: 'rgba(200,146,42,0.12)', color: '#9A6A00', fontSize: 12 }}
                              >
                                <Pencil size={12} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleStatusToggle(driver)}
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium"
                                style={{
                                  background: driver.active ? 'rgba(159,31,31,0.10)' : 'rgba(26,122,110,0.10)',
                                  color: driver.active ? '#9F1F1F' : '#1A7A6E',
                                  fontSize: 12,
                                }}
                              >
                                <Check size={12} />
                                {driver.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--cream-dark)' }}>
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
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size} / page</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <PageButton
                        label={<ChevronLeft size={16} />}
                        disabled={page <= 1}
                        onClick={() => setPage(current => Math.max(1, current - 1))}
                      />
                      {pages.map(pageNumber => (
                        <PageButton
                          key={pageNumber}
                          label={pageNumber}
                          active={pageNumber === page}
                          onClick={() => setPage(pageNumber)}
                        />
                      ))}
                      <PageButton
                        label={<ChevronRight size={16} />}
                        disabled={page >= totalPages}
                        onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modalOpen ? (
        <ModalFrame
          title={editingDriver ? 'Edit Driver' : 'Create Driver'}
          subtitle={editingDriver ? `${editingDriver.name} | ${editingDriver.mobileNumber}` : 'Add a driver profile with live API integration'}
          onClose={() => {
            setModalOpen(false)
            setEditingDriver(null)
            setForm(DEFAULT_FORM)
            setFormErrors({})
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['ssoId', 'SSO ID', 'Enter SSO ID'],
              ['name', 'Driver Name', 'Enter driver name'],
              ['mobileNumber', 'Mobile Number', 'Enter mobile number'],
              ['email', 'Email', 'Enter email address'],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {label}
                  {(key === 'name' || key === 'mobileNumber') ? ' *' : ''}
                </label>
                <input
                  value={form[key as keyof FormState] as string}
                  onChange={event => {
                    const nextValue = key === 'mobileNumber'
                      ? event.target.value.replace(/\D/g, '').slice(0, 10)
                      : event.target.value
                    setForm(current => ({ ...current, [key]: nextValue }))
                  }}
                  placeholder={placeholder}
                  className="w-full rounded-[20px] px-4 py-3 outline-none"
                  style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                />
                {formErrors[key as keyof FormState] ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{formErrors[key as keyof FormState]}</div> : null}
              </div>
            ))}

            <div>
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Gender
              </label>
              <select
                value={form.gender}
                onChange={event => setForm(current => ({ ...current, gender: event.target.value }))}
                className="w-full rounded-[20px] px-4 py-3 outline-none"
                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Date of Birth
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={event => setForm(current => ({ ...current, dob: event.target.value }))}
                className="w-full rounded-[20px] px-4 py-3 outline-none"
                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Place *
              </label>
              <select
                value={form.placeId}
                onChange={event => setForm(current => ({ ...current, placeId: event.target.value }))}
                className="w-full rounded-[20px] px-4 py-3 outline-none"
                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
              >
                <option value="">{placesLoading ? 'Loading places...' : 'Select place'}</option>
                {places.map(place => (
                  <option key={place.id} value={place.id}>{place.name}</option>
                ))}
              </select>
              {formErrors.placeId ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{formErrors.placeId}</div> : null}
            </div>

            {[
              ['registrationNumber', 'Registration Number', 'Enter registration number'],
              ['licenceNumber', 'Licence Number', 'Enter licence number'],
              ['bankName', 'Bank Name', 'Enter bank name'],
              ['accountNumber', 'Account Number', 'Enter account number'],
              ['ifscCode', 'IFSC Code', 'Enter IFSC code'],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {label}
                </label>
                <input
                  value={form[key as keyof FormState] as string}
                  onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-[20px] px-4 py-3 outline-none"
                  style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                />
              </div>
            ))}

            <div className="md:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Attachment
              </label>
              <label
                className="flex cursor-pointer items-center justify-between gap-4 rounded-[22px] px-4 py-4"
                style={{ background: '#fff', border: '1px solid var(--sand)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: 'rgba(107,18,18,0.08)', color: 'var(--maroon)' }}>
                    <Upload size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>
                      {uploading ? 'Uploading attachment...' : getDocumentLabel(form.uploadDocument)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Upload PDF for driver document</div>
                  </div>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={event => handleUpload(event.target.files?.[0] ?? null)}
                />
                <span className="rounded-full px-3 py-1" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>
                  Choose PDF
                </span>
              </label>
              {formErrors.uploadDocument ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{formErrors.uploadDocument}</div> : null}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setModalOpen(false)
                setEditingDriver(null)
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
              disabled={formSubmitting || uploading}
              className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
            >
              {formSubmitting ? 'Saving...' : editingDriver ? 'Update Driver' : 'Create Driver'}
            </button>
          </div>
        </ModalFrame>
      ) : null}
    </AdminShellLayout>
  )
}
