'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { authFetch } from '@/lib/api/authFetch'

type SettingsTab = 'inventory' | 'department' | 'category' | 'ticket' | 'quota' | 'vendor' | 'geo'

type Option = {
  id: string
  name: string
}

type InventoryTypeRow = {
  id: string
  name: string
  active: boolean
}

type SubInventoryTypeRow = {
  id: string
  inventoryId: string
  inventoryName: string
  name: string
  seats: number
  active: boolean
}

type DepartmentRow = {
  id: string
  name: string
  abbreviation: string
  placeCount: number
  active: boolean
}

type CategoryRow = {
  id: string
  name: string
  bookingType: string
  subBookingTypeId: string
  subBookingTypeName: string
  placeCount: number
  active: boolean
}

type TicketTypeRow = {
  id: string
  name: string
  note: string
  configCount: number
  active: boolean
}

type QuotaTypeRow = {
  id: string
  name: string
  duration: number
  tillDate: boolean
  active: boolean
}

type VendorTypeRow = {
  id: string
  name: string
  bookingType: string
  subBookingTypeId: string
  subBookingTypeName: string
  departmentIds: string[]
  departmentNames: string[]
  active: boolean
}

type DivisionRow = {
  id: string
  name: string
  nameMangal: string
  code: string
  active: boolean
}

type DistrictRow = {
  id: string
  name: string
  nameMangal: string
  code: string
  divisionId: string
  divisionName: string
  active: boolean
}

type InventoryDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: InventoryTypeRow | null
  name: string
}

type SubInventoryDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: SubInventoryTypeRow | null
  parentId: string
  parentName: string
  name: string
  seats: string
}

type DepartmentDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: DepartmentRow | null
  name: string
  abbreviation: string
}

type CategoryDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: CategoryRow | null
  name: string
  bookingType: string
  subBookingTypeId: string
  subBookingTypeName: string
}

type TicketDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: TicketTypeRow | null
  name: string
  note: string
}

type QuotaDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: QuotaTypeRow | null
  name: string
  duration: string
  tillDate: boolean
}

type VendorDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: VendorTypeRow | null
  name: string
  bookingType: string
  subBookingTypeId: string
  subBookingTypeName: string
  departmentIds: string[]
}

type DivisionDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: DivisionRow | null
  name: string
  nameMangal: string
  code: string
  active: boolean
}

type DistrictDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  row: DistrictRow | null
  divisionId: string
  name: string
  nameMangal: string
  code: string
}

type ConfirmState =
  | { kind: 'inventory'; action: 'delete' | 'toggle'; row: InventoryTypeRow }
  | { kind: 'subInventory'; action: 'delete' | 'toggle'; row: SubInventoryTypeRow }
  | { kind: 'department'; action: 'delete' | 'toggle'; row: DepartmentRow }
  | { kind: 'category'; action: 'delete' | 'toggle'; row: CategoryRow }
  | { kind: 'ticket'; action: 'delete' | 'toggle'; row: TicketTypeRow }
  | { kind: 'quota'; action: 'delete' | 'toggle'; row: QuotaTypeRow }
  | { kind: 'vendor'; action: 'delete' | 'toggle'; row: VendorTypeRow }
  | { kind: 'division'; action: 'delete' | 'toggle'; row: DivisionRow }
  | { kind: 'district'; action: 'delete' | 'toggle'; row: DistrictRow }
  | null

const TAB_OPTIONS: Array<{ value: SettingsTab; label: string }> = [
  { value: 'inventory', label: 'Inventory Type' },
  { value: 'department', label: 'Department' },
  { value: 'category', label: 'Category' },
  { value: 'ticket', label: 'Ticket Type' },
  { value: 'quota', label: 'Quota Type' },
  { value: 'vendor', label: 'Vendor Type' },
  { value: 'geo', label: 'Add District / Division' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const BOOKING_TYPE_OPTIONS = [
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'NON_INVENTORY', label: 'Non Inventory' },
]

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === 'active' || normalized === '1'
  }
  return false
}

function getRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 6) return null

  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = findFirstArray(child, depth + 1)
    if (found) return found
  }

  return null
}

function extractResult(payload: unknown) {
  const root = getRecord(payload)
  return getRecord(root?.result) ?? root
}

function extractTotal(payload: unknown, listLength: number) {
  const result = extractResult(payload)
  return toNumber(result?.totalRecords, listLength)
}

function extractMessage(payload: unknown, fallback: string) {
  const record = getRecord(payload)
  const message = record?.message
  return typeof message === 'string' && message.trim() ? message.trim() : fallback
}

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
  if (!response.ok) {
    throw new Error(extractMessage(payload, fallback))
  }

  return payload as T
}

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    border: '1px solid var(--sand)',
    borderRadius: 16,
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--text-dark)',
    outline: 'none',
    background: '#fff',
  }
}

function statusStyle(active: boolean): CSSProperties {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function ActionButton({
  children,
  onClick,
  tone = 'plain',
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'plain' | 'danger' | 'accent'
}) {
  const toneStyles: Record<string, CSSProperties> = {
    plain: { background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' },
    danger: { background: 'rgba(139,26,26,0.08)', border: '1px solid rgba(139,26,26,0.16)', color: 'var(--maroon)' },
    accent: { background: 'rgba(200,146,42,0.12)', border: '1px solid rgba(200,146,42,0.24)', color: '#8C6421' },
  }

  return (
    <button
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      className="rounded-xl px-3 py-2 font-medium transition-opacity hover:opacity-90"
      style={{ fontSize: 12, ...toneStyles[tone] }}
    >
      {children}
    </button>
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</h3>
            {subtitle ? <p className="mt-1" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: '#F8F4EE', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
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
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  note: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center px-4" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</div>
        <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{note}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
            {loading ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-medium" style={{ fontSize: 13, color: 'var(--text-dark)' }}>{label}</span>
      {children}
    </label>
  )
}

function EmptyState({
  title,
  note,
}: {
  title: string
  note: string
}) {
  return (
    <div className="rounded-[28px] border px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'rgba(255,255,255,0.82)' }}>
      <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</div>
      <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{note}</p>
    </div>
  )
}

function PageControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (next: number) => void
  onPageSizeChange: (next: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Showing {Math.min(total, (page - 1) * pageSize + 1)} - {Math.min(total, page * pageSize)} of {total}
      </div>
      <div className="flex items-center gap-3">
        <select value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))} style={{ ...inputStyle(), width: 130, paddingTop: 10, paddingBottom: 10 }}>
          {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} / page</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded-xl px-4 py-2 disabled:opacity-50" style={{ border: '1px solid var(--sand)', background: '#fff', fontSize: 12 }}>Prev</button>
          <span style={{ fontSize: 12, color: 'var(--text-dark)' }}>Page {page} / {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="rounded-xl px-4 py-2 disabled:opacity-50" style={{ border: '1px solid var(--sand)', background: '#fff', fontSize: 12 }}>Next</button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('inventory')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [totalRecords, setTotalRecords] = useState(0)

  const [inventoryRows, setInventoryRows] = useState<InventoryTypeRow[]>([])
  const [subInventoryRows, setSubInventoryRows] = useState<Record<string, SubInventoryTypeRow[]>>({})
  const [expandedInventoryId, setExpandedInventoryId] = useState('')
  const [loadingSubInventoryId, setLoadingSubInventoryId] = useState('')

  const [departmentRows, setDepartmentRows] = useState<DepartmentRow[]>([])
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [ticketRows, setTicketRows] = useState<TicketTypeRow[]>([])
  const [quotaRows, setQuotaRows] = useState<QuotaTypeRow[]>([])
  const [vendorRows, setVendorRows] = useState<VendorTypeRow[]>([])
  const [divisionRows, setDivisionRows] = useState<DivisionRow[]>([])
  const [districtRows, setDistrictRows] = useState<DistrictRow[]>([])

  const [departmentOptions, setDepartmentOptions] = useState<Option[]>([])
  const [divisionOptions, setDivisionOptions] = useState<Option[]>([])
  const [categorySubBookingOptions, setCategorySubBookingOptions] = useState<Option[]>([])
  const [vendorSubBookingOptions, setVendorSubBookingOptions] = useState<Option[]>([])
  const [selectedDivisionId, setSelectedDivisionId] = useState('')

  const [inventoryDialog, setInventoryDialog] = useState<InventoryDialogState>({ open: false, mode: 'create', row: null, name: '' })
  const [subInventoryDialog, setSubInventoryDialog] = useState<SubInventoryDialogState>({ open: false, mode: 'create', row: null, parentId: '', parentName: '', name: '', seats: '' })
  const [departmentDialog, setDepartmentDialog] = useState<DepartmentDialogState>({ open: false, mode: 'create', row: null, name: '', abbreviation: '' })
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({ open: false, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '' })
  const [ticketDialog, setTicketDialog] = useState<TicketDialogState>({ open: false, mode: 'create', row: null, name: '', note: '' })
  const [quotaDialog, setQuotaDialog] = useState<QuotaDialogState>({ open: false, mode: 'create', row: null, name: '', duration: '0', tillDate: false })
  const [vendorDialog, setVendorDialog] = useState<VendorDialogState>({ open: false, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '', departmentIds: [] })
  const [divisionDialog, setDivisionDialog] = useState<DivisionDialogState>({ open: false, mode: 'create', row: null, name: '', nameMangal: '', code: '', active: true })
  const [districtDialog, setDistrictDialog] = useState<DistrictDialogState>({ open: false, mode: 'create', row: null, divisionId: '', name: '', nameMangal: '', code: '' })
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [vendorDepartmentDropdownOpen, setVendorDepartmentDropdownOpen] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalRecords / pageSize)), [pageSize, totalRecords])

  useEffect(() => {
    void loadReferenceOptions()
  }, [])

  useEffect(() => {
    setPage(1)
    setSearch('')
    setError('')
    setSuccessMessage('')
  }, [activeTab])

  useEffect(() => {
    void loadActiveTab()
  }, [activeTab, page, pageSize, search, selectedDivisionId])

  async function loadReferenceOptions() {
    try {
      const [deptPayload, divisionPayload] = await Promise.all([
        fetchJson('/dept?offset=0&size=500&export=false&searchKey=', 'Unable to fetch department options.'),
        fetchJson('/divisions?searchKey=', 'Unable to fetch division options.'),
      ])

      const deptSource: unknown[] = Array.isArray(extractResult(deptPayload)?.departmentDtos)
        ? extractResult(deptPayload)?.departmentDtos as unknown[]
        : findFirstArray(deptPayload) ?? []

      const deptList = deptSource
        .map((item: unknown) => {
          const row = getRecord(item)
          const id = toText(row?.id)
          const name = toText(row?.name)
          return id && name ? { id, name } : null
        })
        .filter((item): item is Option => Boolean(item))

      const divisionSource: unknown[] = Array.isArray(extractResult(divisionPayload)?.divisionDtos)
        ? extractResult(divisionPayload)?.divisionDtos as unknown[]
        : findFirstArray(divisionPayload) ?? []

      const divList = divisionSource
        .map((item: unknown) => {
          const row = getRecord(item)
          const id = toText(row?.id)
          const name = toText(row?.name) || toText(row?.division) || toText(row?.divisionName)
          return id && name ? { id, name } : null
        })
        .filter((item): item is Option => Boolean(item))

      setDepartmentOptions(deptList)
      setDivisionOptions(divList)
      setSelectedDivisionId(current => (current && divList.some(option => option.id === current) ? current : ''))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings references.')
    }
  }

  async function loadSubBookingOptions(kind: 'category' | 'vendor', bookingType: string) {
    if (!bookingType) {
      if (kind === 'category') setCategorySubBookingOptions([])
      if (kind === 'vendor') setVendorSubBookingOptions([])
      return
    }

    const payload = await fetchJson(`/sub-booking-type?bookingType=${encodeURIComponent(bookingType)}`, 'Unable to fetch sub booking types.')
    const optionSource: unknown[] = Array.isArray(extractResult(payload)?.result)
      ? extractResult(payload)?.result as unknown[]
      : findFirstArray(payload) ?? []

    const list = optionSource
      .map((item: unknown) => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        return id && name ? { id, name } : null
      })
      .filter((item): item is Option => Boolean(item))

    if (kind === 'category') setCategorySubBookingOptions(list)
    if (kind === 'vendor') setVendorSubBookingOptions(list)
  }

  function mapInventoryRows(payload: unknown) {
    const result = extractResult(payload)
    const list = Array.isArray(result?.inventoryTypeDtos) ? result.inventoryTypeDtos : findFirstArray(result) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        return id && name ? { id, name, active: toBoolean(row?.active) } : null
      })
      .filter((item): item is InventoryTypeRow => Boolean(item))

    return { rows, total: extractTotal(payload, rows.length) }
  }

  function mapSubInventoryRows(payload: unknown, inventoryId: string, inventoryName: string) {
    const result = extractResult(payload)
    const list = Array.isArray(result?.subInventoryTypeDtos) ? result.subInventoryTypeDtos : findFirstArray(result) ?? []
    return list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        return id && name
          ? {
              id,
              inventoryId: toText(row?.inventoryId, inventoryId),
              inventoryName: toText(row?.inventoryName, inventoryName),
              name,
              seats: toNumber(row?.seats),
              active: toBoolean(row?.active),
            }
          : null
      })
      .filter((item): item is SubInventoryTypeRow => Boolean(item))
  }

  function mapDepartmentRows(payload: unknown) {
    const result = extractResult(payload)
    const list = Array.isArray(result?.departmentDtos) ? result.departmentDtos : findFirstArray(result) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        return id && name
          ? {
              id,
              name,
              abbreviation: toText(row?.abbreviation),
              placeCount: toNumber(row?.placeCount),
              active: toBoolean(row?.active),
            }
          : null
      })
      .filter((item): item is DepartmentRow => Boolean(item))
    return { rows, total: extractTotal(payload, rows.length) }
  }

  function mapCategoryRows(payload: unknown) {
    const result = extractResult(payload)
    const list = Array.isArray(result?.categoryDtos) ? result.categoryDtos : findFirstArray(result) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        return id && name
          ? {
              id,
              name,
              bookingType: toText(row?.bookingType),
              subBookingTypeId: toText(row?.subBookingTypeId),
              subBookingTypeName: toText(row?.subBookingTypeName),
              placeCount: toNumber(row?.placeCount),
              active: toBoolean(row?.active),
            }
          : null
      })
      .filter((item): item is CategoryRow => Boolean(item))
    return { rows, total: extractTotal(payload, rows.length) }
  }

  function mapTicketRows(payload: unknown) {
    const result = extractResult(payload)
    const list = Array.isArray(result?.ticketMasterDtos) ? result.ticketMasterDtos : findFirstArray(result) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        return id && name
          ? {
              id,
              name,
              note: toText(row?.note),
              configCount: toNumber(row?.configCount),
              active: toBoolean(row?.active),
            }
          : null
      })
      .filter((item): item is TicketTypeRow => Boolean(item))
    return { rows, total: extractTotal(payload, rows.length) }
  }

  function mapQuotaRows(payload: unknown) {
    const result = extractResult(payload)
    const list = Array.isArray(result?.masterInventoryQuotaDtos) ? result.masterInventoryQuotaDtos : findFirstArray(result) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        return id && name
          ? {
              id,
              name,
              duration: toNumber(row?.duration),
              tillDate: toBoolean(row?.tillDate),
              active: toBoolean(row?.active),
            }
          : null
      })
      .filter((item): item is QuotaTypeRow => Boolean(item))
    return { rows, total: extractTotal(payload, rows.length) }
  }

  function mapVendorRows(payload: unknown) {
    const result = extractResult(payload)
    const list = Array.isArray(result?.masterVendorTypeDto) ? result.masterVendorTypeDto : findFirstArray(result) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name)
        if (!id || !name) return null

        const departmentIds = Array.isArray(row?.departmentIds) ? row.departmentIds.map(value => toText(value)).filter(Boolean) : []
        const departmentNames = Array.isArray(row?.departmentNames) ? row.departmentNames.map(value => toText(value)).filter(Boolean) : []

        return {
          id,
          name,
          bookingType: toText(row?.bookingType),
          subBookingTypeId: toText(row?.subBookingTypeId),
          subBookingTypeName: toText(row?.subBookingTypeName),
          departmentIds,
          departmentNames,
          active: toBoolean(row?.active),
        }
      })
      .filter((item): item is VendorTypeRow => Boolean(item))
    return { rows, total: extractTotal(payload, rows.length) }
  }

  function mapDivisionRows(payload: unknown) {
    const result = extractResult(payload)
    const root = getRecord(payload)
    const list = Array.isArray(result?.divisionDtos)
      ? result.divisionDtos
      : Array.isArray(root?.divisionDtos)
        ? root.divisionDtos
        : findFirstArray(result) ?? findFirstArray(payload) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name) || toText(row?.division) || toText(row?.divisionName)
        return id && name
          ? {
              id,
              name,
              nameMangal: toText(row?.divisionMangal) || toText(row?.nameMangal),
              code: toText(row?.code),
              active: toBoolean(row?.active),
            }
          : null
      })
      .filter((item): item is DivisionRow => Boolean(item))
    return { rows, total: rows.length }
  }

  function mapDistrictRows(payload: unknown) {
    const result = extractResult(payload)
    const root = getRecord(payload)
    const list = Array.isArray(result?.districtDtos)
      ? result.districtDtos
      : Array.isArray(root?.districtDtos)
        ? root.districtDtos
        : findFirstArray(result) ?? findFirstArray(payload) ?? []
    const rows = list
      .map(item => {
        const row = getRecord(item)
        const id = toText(row?.id)
        const name = toText(row?.name) || toText(row?.district) || toText(row?.districtName)
        return id && name
          ? {
              id,
              name,
              nameMangal: toText(row?.districtMangal) || toText(row?.nameMangal),
              code: toText(row?.code),
              divisionId: toText(row?.divisionId, selectedDivisionId),
              divisionName: toText(row?.divisionName) || toText(row?.division) || toText(divisionOptions.find(option => option.id === selectedDivisionId)?.name ?? ''),
              active: toBoolean(row?.active),
            }
          : null
      })
      .filter((item): item is DistrictRow => Boolean(item))
    return { rows, total: rows.length }
  }

  async function loadActiveTab() {
    setLoading(true)
    setError('')

    try {
      if (activeTab === 'inventory') {
        const payload = await fetchJson(`/inventory/type?offSet=${page - 1}&name=${encodeURIComponent(search)}&pagination=true&size=${pageSize}&status=true`, 'Unable to fetch inventory types.')
        const mapped = mapInventoryRows(payload)
        setInventoryRows(mapped.rows)
        setTotalRecords(mapped.total)
      } else if (activeTab === 'department') {
        const payload = await fetchJson(`/dept?offset=${page - 1}&size=${pageSize}&export=false&searchKey=${encodeURIComponent(search)}`, 'Unable to fetch departments.')
        const mapped = mapDepartmentRows(payload)
        setDepartmentRows(mapped.rows)
        setTotalRecords(mapped.total)
      } else if (activeTab === 'category') {
        const payload = await fetchJson(`/category?offSet=${page - 1}&size=${pageSize}&export=false&searchKey=${encodeURIComponent(search)}&bookingType=&statusList=`, 'Unable to fetch categories.')
        const mapped = mapCategoryRows(payload)
        setCategoryRows(mapped.rows)
        setTotalRecords(mapped.total)
      } else if (activeTab === 'ticket') {
        const payload = await fetchJson(`/master/ticketType?offSet=${page - 1}&size=${pageSize}&searchKey=${encodeURIComponent(search)}`, 'Unable to fetch ticket types.')
        const mapped = mapTicketRows(payload)
        setTicketRows(mapped.rows)
        setTotalRecords(mapped.total)
      } else if (activeTab === 'quota') {
        const payload = await fetchJson(`/master/inventory-quota?offSet=${page - 1}&size=${pageSize}&searchKey=${encodeURIComponent(search)}&pagination=true&status=true`, 'Unable to fetch quota types.')
        const mapped = mapQuotaRows(payload)
        setQuotaRows(mapped.rows)
        setTotalRecords(mapped.total)
      } else if (activeTab === 'vendor') {
        const payload = await fetchJson(`/master/vendor/type?bookingType=&offSet=${page - 1}&pagination=true&searchKey=${encodeURIComponent(search)}&size=${pageSize}&status=`, 'Unable to fetch vendor types.')
        const mapped = mapVendorRows(payload)
        setVendorRows(mapped.rows)
        setTotalRecords(mapped.total)
      } else {
        const [divisionPayload, districtPayload] = await Promise.all([
          fetchJson(`/division?searchKey=${encodeURIComponent(search)}`, 'Unable to fetch divisions.'),
          selectedDivisionId
            ? fetchJson(`/district?divisionId=${encodeURIComponent(selectedDivisionId)}&searchKey=${encodeURIComponent(search)}`, 'Unable to fetch districts.')
            : Promise.resolve({}),
        ])

        const mappedDivisions = mapDivisionRows(divisionPayload)
        const mappedDistricts = selectedDivisionId ? mapDistrictRows(districtPayload) : { rows: [], total: 0 }
        setDivisionRows(mappedDivisions.rows)
        setDistrictRows(mappedDistricts.rows)
        setTotalRecords(Math.max(mappedDivisions.total, mappedDistricts.total))
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSubInventory(inventory: InventoryTypeRow) {
    setLoadingSubInventoryId(inventory.id)

    try {
      const payload = await fetchJson(`/sub-inventory?inventoryId=${encodeURIComponent(inventory.id)}&name=&offSet=0&pagination=true&size=200&status=true&subInventoryId=`, 'Unable to fetch sub inventory types.')
      const rows = mapSubInventoryRows(payload, inventory.id, inventory.name)
      setSubInventoryRows(current => ({ ...current, [inventory.id]: rows }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch sub inventory types.')
    } finally {
      setLoadingSubInventoryId('')
    }
  }

  async function handleSaveInventory() {
    if (!inventoryDialog.name.trim()) {
      setError('Inventory type name is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson('/inventory/type', 'Unable to save inventory type.', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventoryDialog.mode === 'edit' && inventoryDialog.row
          ? { id: inventoryDialog.row.id, name: inventoryDialog.name.trim() }
          : { name: inventoryDialog.name.trim() }),
      })
      setInventoryDialog({ open: false, mode: 'create', row: null, name: '' })
      setSuccessMessage(`Inventory type ${inventoryDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await loadActiveTab()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save inventory type.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSubInventory() {
    if (!subInventoryDialog.name.trim()) {
      setError('Sub inventory type name is required.')
      return
    }
    if (!subInventoryDialog.seats.trim()) {
      setError('Seats is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson('/sub-inventory', 'Unable to save sub inventory type.', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(subInventoryDialog.mode === 'edit' && subInventoryDialog.row ? { id: subInventoryDialog.row.id } : {}),
          inventoryId: subInventoryDialog.parentId,
          inventoryName: subInventoryDialog.parentName,
          name: subInventoryDialog.name.trim(),
          seats: Number(subInventoryDialog.seats),
        }),
      })
      const inventory = inventoryRows.find(row => row.id === subInventoryDialog.parentId)
      if (inventory) await loadSubInventory(inventory)
      setSubInventoryDialog({ open: false, mode: 'create', row: null, parentId: '', parentName: '', name: '', seats: '' })
      setSuccessMessage(`Sub inventory type ${subInventoryDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save sub inventory type.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDepartment() {
    if (!departmentDialog.name.trim()) {
      setError('Department name is required.')
      return
    }
    if (!departmentDialog.abbreviation.trim()) {
      setError('Abbreviation is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson('/dept', 'Unable to save department.', {
        method: departmentDialog.mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(departmentDialog.mode === 'edit' && departmentDialog.row ? { id: departmentDialog.row.id } : {}),
          name: departmentDialog.name.trim(),
          abbreviation: departmentDialog.abbreviation.trim().toUpperCase(),
        }),
      })
      setDepartmentDialog({ open: false, mode: 'create', row: null, name: '', abbreviation: '' })
      setSuccessMessage(`Department ${departmentDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await Promise.all([loadActiveTab(), loadReferenceOptions()])
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save department.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCategory() {
    if (!categoryDialog.name.trim()) {
      setError('Category name is required.')
      return
    }
    if (!categoryDialog.bookingType) {
      setError('Booking type is required.')
      return
    }
    if (!categoryDialog.subBookingTypeId) {
      setError('Sub booking type is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson(
        categoryDialog.mode === 'edit' && categoryDialog.row
          ? `/category?categoryId=${encodeURIComponent(categoryDialog.row.id)}`
          : '/category',
        'Unable to save category.',
        {
          method: categoryDialog.mode === 'edit' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryDialog.name.trim(),
            bookingType: categoryDialog.bookingType,
            subBookingTypeId: categoryDialog.subBookingTypeId,
          }),
        },
      )
      setCategoryDialog({ open: false, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '' })
      setCategorySubBookingOptions([])
      setSuccessMessage(`Category ${categoryDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await loadActiveTab()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save category.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTicketType() {
    if (!ticketDialog.name.trim()) {
      setError('Ticket type name is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson(
        ticketDialog.mode === 'edit' && ticketDialog.row
          ? `/master/ticketType?ticketTypeId=${encodeURIComponent(ticketDialog.row.id)}`
          : '/master/ticketType',
        'Unable to save ticket type.',
        {
          method: ticketDialog.mode === 'edit' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(ticketDialog.mode === 'edit' && ticketDialog.row ? { id: ticketDialog.row.id } : {}),
            name: ticketDialog.name.trim(),
            note: ticketDialog.note.trim(),
          }),
        },
      )
      setTicketDialog({ open: false, mode: 'create', row: null, name: '', note: '' })
      setSuccessMessage(`Ticket type ${ticketDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await loadActiveTab()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save ticket type.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveQuota() {
    if (!quotaDialog.name.trim()) {
      setError('Quota name is required.')
      return
    }
    if (!quotaDialog.tillDate && Number(quotaDialog.duration) <= 0) {
      setError('Enter duration greater than 0.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson('/master/inventory-quota', 'Unable to save quota type.', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(quotaDialog.mode === 'edit' && quotaDialog.row ? { id: quotaDialog.row.id } : {}),
          name: quotaDialog.name.trim(),
          duration: Number(quotaDialog.duration),
          tillDate: quotaDialog.tillDate,
        }),
      })
      setQuotaDialog({ open: false, mode: 'create', row: null, name: '', duration: '0', tillDate: false })
      setSuccessMessage(`Quota type ${quotaDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await loadActiveTab()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save quota type.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveVendorType() {
    if (!vendorDialog.name.trim()) {
      setError('Vendor type name is required.')
      return
    }
    if (!vendorDialog.bookingType) {
      setError('Booking type is required.')
      return
    }
    if (!vendorDialog.subBookingTypeId) {
      setError('Sub booking type is required.')
      return
    }
    if (vendorDialog.departmentIds.length === 0) {
      setError('Select at least one department.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson('/master/vendor/type', 'Unable to save vendor type.', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(vendorDialog.mode === 'edit' && vendorDialog.row ? { id: vendorDialog.row.id } : {}),
          bookingType: vendorDialog.bookingType,
          subBookingTypeId: vendorDialog.subBookingTypeId,
          subBookingTypeName: vendorDialog.subBookingTypeName,
          name: vendorDialog.name.trim(),
          departmentIds: vendorDialog.departmentIds,
        }),
      })
      setVendorDialog({ open: false, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '', departmentIds: [] })
      setVendorSubBookingOptions([])
      setSuccessMessage(`Vendor type ${vendorDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await loadActiveTab()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save vendor type.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDivision() {
    if (!divisionDialog.name.trim()) {
      setError('Division name is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson('/division', 'Unable to save division.', {
        method: divisionDialog.mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(divisionDialog.mode === 'edit' && divisionDialog.row ? { id: divisionDialog.row.id } : {}),
          name: divisionDialog.name.trim(),
          division: divisionDialog.name.trim(),
          divisionMangal: divisionDialog.nameMangal.trim(),
          code: divisionDialog.code.trim(),
          active: divisionDialog.active,
        }),
      })
      setDivisionDialog({ open: false, mode: 'create', row: null, name: '', nameMangal: '', code: '', active: true })
      setSuccessMessage(`Division ${divisionDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await Promise.all([loadActiveTab(), loadReferenceOptions()])
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save division.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDistrict() {
    if (!districtDialog.divisionId) {
      setError('Division is required.')
      return
    }
    if (!districtDialog.name.trim()) {
      setError('District name is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await fetchJson('/district', 'Unable to save district.', {
        method: districtDialog.mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(districtDialog.mode === 'edit' && districtDialog.row ? { id: districtDialog.row.id } : {}),
          divisionId: districtDialog.divisionId,
          name: districtDialog.name.trim(),
          district: districtDialog.name.trim(),
          districtMangal: districtDialog.nameMangal.trim(),
          code: districtDialog.code.trim(),
        }),
      })
      setDistrictDialog({ open: false, mode: 'create', row: null, divisionId: selectedDivisionId, name: '', nameMangal: '', code: '' })
      setSuccessMessage(`District ${districtDialog.mode === 'edit' ? 'updated' : 'created'} successfully.`)
      await loadActiveTab()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save district.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmAction() {
    if (!confirmState) return

    setSaving(true)
    setError('')

    try {
      const { action, kind, row } = confirmState
      if (kind === 'inventory') {
        await fetchJson(
          action === 'delete'
            ? `//inventory/type?inventoryId=${encodeURIComponent(row.id)}`
            : `/inventory/type/active?active=${encodeURIComponent(String(!row.active))}&inventoryId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} inventory type.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
      } else if (kind === 'subInventory') {
        await fetchJson(
          action === 'delete'
            ? `/sub-inventory?inventoryId=${encodeURIComponent(row.id)}`
            : `/sub-inventory/active?active=${encodeURIComponent(String(!row.active))}&inventoryId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} sub inventory type.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
        const parent = inventoryRows.find(item => item.id === row.inventoryId)
        if (parent) await loadSubInventory(parent)
      } else if (kind === 'department') {
        await fetchJson(
          action === 'delete'
            ? `/dept?deptId=${encodeURIComponent(row.id)}`
            : `/dept/activate?activate=${encodeURIComponent(String(!row.active))}&deptId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} department.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
        await loadReferenceOptions()
      } else if (kind === 'category') {
        await fetchJson(
          action === 'delete'
            ? `category?categoryId=${encodeURIComponent(row.id)}`
            : `/category/active?active=${encodeURIComponent(String(!row.active))}&categoryId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} category.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
      } else if (kind === 'ticket') {
        await fetchJson(
          action === 'delete'
            ? `/master/ticketType?ticketTypeId=${encodeURIComponent(row.id)}`
            : `/master/ticketType/active?active=${encodeURIComponent(String(!row.active))}&ticketTypeMasterId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} ticket type.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
      } else if (kind === 'quota') {
        await fetchJson(
          action === 'delete'
            ? `/master/inventory-quota?masterInventoryQuotaId=${encodeURIComponent(row.id)}`
            : `/master/inventory-quota?active=${encodeURIComponent(String(!row.active))}&masterInventoryQuotaId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} quota type.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
      } else if (kind === 'vendor') {
        await fetchJson(
          action === 'delete'
            ? `/master/vendor/type?masterVendorTypeId=${encodeURIComponent(row.id)}`
            : `/master/vendor/type/active?active=${encodeURIComponent(String(!row.active))}&masterVendorTypeId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} vendor type.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
      } else if (kind === 'division') {
        await fetchJson(
          action === 'delete'
            ? `/division?divisionId=${encodeURIComponent(row.id)}`
            : `/division/active?active=${encodeURIComponent(String(!row.active))}&divisionId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} division.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
        if (action === 'delete' && selectedDivisionId === row.id) {
          setSelectedDivisionId('')
          setDistrictRows([])
        }
        await loadReferenceOptions()
      } else if (kind === 'district') {
        await fetchJson(
          action === 'delete'
            ? `/district?districtId=${encodeURIComponent(row.id)}`
            : `/district/active?active=${encodeURIComponent(String(!row.active))}&districtId=${encodeURIComponent(row.id)}`,
          `Unable to ${action} district.`,
          { method: action === 'delete' ? 'DELETE' : 'PUT' },
        )
      }

      setSuccessMessage(`${action === 'delete' ? 'Delete' : 'Status update'} completed successfully.`)
      setConfirmState(null)
      await loadActiveTab()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to complete action.')
    } finally {
      setSaving(false)
    }
  }

  function openInventoryCreate() {
    setInventoryDialog({ open: true, mode: 'create', row: null, name: '' })
  }

  function openInventoryEdit(row: InventoryTypeRow) {
    setInventoryDialog({ open: true, mode: 'edit', row, name: row.name })
  }

  function openSubInventoryCreate(parent: InventoryTypeRow) {
    setSubInventoryDialog({ open: true, mode: 'create', row: null, parentId: parent.id, parentName: parent.name, name: '', seats: '' })
  }

  function openSubInventoryEdit(row: SubInventoryTypeRow) {
    setSubInventoryDialog({ open: true, mode: 'edit', row, parentId: row.inventoryId, parentName: row.inventoryName, name: row.name, seats: String(row.seats) })
  }

  function openDepartmentDialog(row?: DepartmentRow) {
    setDepartmentDialog(row
      ? { open: true, mode: 'edit', row, name: row.name, abbreviation: row.abbreviation }
      : { open: true, mode: 'create', row: null, name: '', abbreviation: '' })
  }

  async function openCategoryDialog(row?: CategoryRow) {
    if (row?.bookingType) await loadSubBookingOptions('category', row.bookingType)
    setCategoryDialog(row
      ? { open: true, mode: 'edit', row, name: row.name, bookingType: row.bookingType, subBookingTypeId: row.subBookingTypeId, subBookingTypeName: row.subBookingTypeName }
      : { open: true, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '' })
  }

  function openTicketDialog(row?: TicketTypeRow) {
    setTicketDialog(row
      ? { open: true, mode: 'edit', row, name: row.name, note: row.note }
      : { open: true, mode: 'create', row: null, name: '', note: '' })
  }

  function openQuotaDialog(row?: QuotaTypeRow) {
    setQuotaDialog(row
      ? { open: true, mode: 'edit', row, name: row.name, duration: String(row.duration), tillDate: row.tillDate }
      : { open: true, mode: 'create', row: null, name: '', duration: '0', tillDate: false })
  }

  async function openVendorDialog(row?: VendorTypeRow) {
    if (row?.bookingType) await loadSubBookingOptions('vendor', row.bookingType)
    setVendorDepartmentDropdownOpen(false)
    setVendorDialog(row
      ? {
          open: true,
          mode: 'edit',
          row,
          name: row.name,
          bookingType: row.bookingType,
          subBookingTypeId: row.subBookingTypeId,
          subBookingTypeName: row.subBookingTypeName,
          departmentIds: row.departmentIds,
        }
      : { open: true, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '', departmentIds: [] })
  }

  function toggleVendorDepartment(departmentId: string) {
    setVendorDialog(current => {
      const nextIds = current.departmentIds.includes(departmentId)
        ? current.departmentIds.filter(id => id !== departmentId)
        : [...current.departmentIds, departmentId]

      return { ...current, departmentIds: nextIds }
    })
  }

  function openDivisionDialog(row?: DivisionRow) {
    setDivisionDialog(row
      ? { open: true, mode: 'edit', row, name: row.name, nameMangal: row.nameMangal, code: row.code, active: row.active }
      : { open: true, mode: 'create', row: null, name: '', nameMangal: '', code: '', active: true })
  }

  function openDistrictDialog(row?: DistrictRow) {
    setDistrictDialog(row
      ? { open: true, mode: 'edit', row, divisionId: row.divisionId || selectedDivisionId, name: row.name, nameMangal: row.nameMangal, code: row.code }
      : { open: true, mode: 'create', row: null, divisionId: selectedDivisionId, name: '', nameMangal: '', code: '' })
  }

  const tabLabel = TAB_OPTIONS.find(option => option.value === activeTab)?.label ?? 'Settings'

  const pageContent = (
    <main className="flex-1 overflow-y-auto page-enter px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[30px] border p-6" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,244,236,0.96) 100%)' }}>
          <SectionHeader
            title="System Settings"
            right={(
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px]">
                  <select
                    value={activeTab}
                    onChange={event => setActiveTab(event.target.value as SettingsTab)}
                    className="appearance-none pr-10"
                    style={inputStyle()}
                  >
                    {TAB_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16} color="var(--text-muted)" />
                </div>
                <div className="relative min-w-[240px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" size={15} color="var(--text-muted)" />
                  <input
                    value={search}
                    onChange={event => {
                      setPage(1)
                      setSearch(event.target.value)
                    }}
                    placeholder={`Search ${tabLabel.toLowerCase()}`}
                    style={{ ...inputStyle(), paddingLeft: 42 }}
                  />
                </div>
                {activeTab === 'inventory' && (
                  <button onClick={openInventoryCreate} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                    <Plus size={16} />
                    Add Inventory Type
                  </button>
                )}
                {activeTab === 'department' && (
                  <button onClick={() => openDepartmentDialog()} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                    <Plus size={16} />
                    Add Department
                  </button>
                )}
                {activeTab === 'category' && (
                  <button onClick={() => void openCategoryDialog()} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                    <Plus size={16} />
                    Add Category
                  </button>
                )}
                {activeTab === 'ticket' && (
                  <button onClick={() => openTicketDialog()} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                    <Plus size={16} />
                    Add Ticket Type
                  </button>
                )}
                {activeTab === 'quota' && (
                  <button onClick={() => openQuotaDialog()} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                    <Plus size={16} />
                    Add Quota Type
                  </button>
                )}
                {activeTab === 'vendor' && (
                  <button onClick={() => void openVendorDialog()} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                    <Plus size={16} />
                    Add Vendor Type
                  </button>
                )}
                {activeTab === 'geo' && (
                  <button onClick={() => openDivisionDialog()} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                    <Plus size={16} />
                    Add Division
                  </button>
                )}
              </div>
            )}
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
           
           
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.12)', color: '#1A7A6E', fontSize: 13 }}>
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)', fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="py-16">
            <RajasthanLoader />
          </div>
        ) : (
          <>
            {activeTab === 'inventory' && (
              inventoryRows.length === 0 ? (
                <EmptyState title="Inventory Types" note="No inventory type added yet." />
              ) : (
                <div className="space-y-4">
                  {inventoryRows.map(row => {
                    const expanded = expandedInventoryId === row.id
                    const children = subInventoryRows[row.id] ?? []

                    return (
                      <div key={row.id} className="overflow-hidden rounded-[28px] border bg-white" style={{ borderColor: 'var(--sand)' }}>
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                if (expanded) {
                                  setExpandedInventoryId('')
                                } else {
                                  setExpandedInventoryId(row.id)
                                  if (!subInventoryRows[row.id]) void loadSubInventory(row)
                                }
                              }}
                              className="rounded-full p-2"
                              style={{ background: '#F8F4EE', color: 'var(--text-muted)' }}
                            >
                              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <div>
                              <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{row.name}</div>
                              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sub inventory flow opens directly under the selected inventory type.</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(row.active) }}>{row.active ? 'Active' : 'Inactive'}</span>
                            <ActionButton tone="accent" onClick={() => openSubInventoryCreate(row)}>Add Sub Type</ActionButton>
                            <ActionButton onClick={() => openInventoryEdit(row)}>Edit</ActionButton>
                            <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'inventory', action: 'delete', row })}>Delete</ActionButton>
                            <ActionButton onClick={() => setConfirmState({ kind: 'inventory', action: 'toggle', row })}>{row.active ? 'Inactivate' : 'Activate'}</ActionButton>
                          </div>
                        </div>

                        {expanded ? (
                          <div className="border-t px-6 py-5" style={{ borderColor: 'var(--sand)', background: '#FCFAF7' }}>
                            {loadingSubInventoryId === row.id ? (
                              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading sub inventory types...</div>
                            ) : children.length === 0 ? (
                              <EmptyState title="Sub Inventory Types" note="No sub inventory types added for this inventory type yet." />
                            ) : (
                              <div className="grid gap-4 md:grid-cols-2">
                                {children.map(sub => (
                                  <div key={sub.id} className="rounded-[24px] border bg-white p-5" style={{ borderColor: 'var(--sand)' }}>
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <div className="font-serif" style={{ fontSize: 20, color: 'var(--text-dark)', fontWeight: 700 }}>{sub.name}</div>
                                        <div className="mt-2 flex flex-wrap gap-4" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                          <span>Seats: {sub.seats}</span>
                                          {/* <span>Parent: {sub.inventoryName}</span> */}
                                        </div>
                                      </div>
                                      <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(sub.active) }}>{sub.active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                      <ActionButton onClick={() => openSubInventoryEdit(sub)}>Edit</ActionButton>
                                      <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'subInventory', action: 'delete', row: sub })}>Delete</ActionButton>
                                      <ActionButton onClick={() => setConfirmState({ kind: 'subInventory', action: 'toggle', row: sub })}>{sub.active ? 'Inactivate' : 'Activate'}</ActionButton>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                  <PageControls page={page} pageSize={pageSize} total={totalRecords} onPageChange={setPage} onPageSizeChange={next => { setPage(1); setPageSize(next) }} />
                </div>
              )
            )}

            {activeTab === 'department' && (
              departmentRows.length === 0 ? (
                <EmptyState title="Departments" note="No department added yet." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {departmentRows.map(row => (
                    <div key={row.id} className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{row.name}</div>
                          <div className="mt-2 flex flex-wrap gap-4" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            <span>Abbreviation: {row.abbreviation || 'N/A'}</span>
                            <span>Places: {row.placeCount}</span>
                          </div>
                        </div>
                        <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(row.active) }}>{row.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <ActionButton onClick={() => openDepartmentDialog(row)}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'department', action: 'delete', row })}>Delete</ActionButton>
                        <ActionButton onClick={() => setConfirmState({ kind: 'department', action: 'toggle', row })}>{row.active ? 'Inactivate' : 'Activate'}</ActionButton>
                      </div>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <PageControls page={page} pageSize={pageSize} total={totalRecords} onPageChange={setPage} onPageSizeChange={next => { setPage(1); setPageSize(next) }} />
                  </div>
                </div>
              )
            )}

            {activeTab === 'category' && (
              categoryRows.length === 0 ? (
                <EmptyState title="Categories" note="No category added yet." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {categoryRows.map(row => (
                    <div key={row.id} className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{row.name}</div>
                          <div className="mt-2 flex flex-wrap gap-3" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            <span>{row.bookingType === 'INVENTORY' ? 'Inventory' : 'Non Inventory'}</span>
                            <span>{row.subBookingTypeName || 'No sub booking type'}</span>
                            <span>Places: {row.placeCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <ActionButton onClick={() => void openCategoryDialog(row)}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'category', action: 'delete', row })}>Delete</ActionButton>
                      </div>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <PageControls page={page} pageSize={pageSize} total={totalRecords} onPageChange={setPage} onPageSizeChange={next => { setPage(1); setPageSize(next) }} />
                  </div>
                </div>
              )
            )}

            {activeTab === 'ticket' && (
              ticketRows.length === 0 ? (
                <EmptyState title="Ticket Types" note="No ticket type added yet." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {ticketRows.map(row => (
                    <div key={row.id} className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{row.name}</div>
                          <div className="mt-2 flex flex-wrap gap-3" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            <span>Note: {row.note || 'N/A'}</span>
                            <span>Configured: {row.configCount}</span>
                          </div>
                        </div>
                        <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(row.active) }}>{row.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <ActionButton onClick={() => openTicketDialog(row)}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'ticket', action: 'delete', row })}>Delete</ActionButton>
                        <ActionButton onClick={() => setConfirmState({ kind: 'ticket', action: 'toggle', row })}>{row.active ? 'Inactivate' : 'Activate'}</ActionButton>
                      </div>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <PageControls page={page} pageSize={pageSize} total={totalRecords} onPageChange={setPage} onPageSizeChange={next => { setPage(1); setPageSize(next) }} />
                  </div>
                </div>
              )
            )}

            {activeTab === 'quota' && (
              quotaRows.length === 0 ? (
                <EmptyState title="Quota Types" note="No quota type added yet." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {quotaRows.map(row => (
                    <div key={row.id} className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{row.name}</div>
                          <div className="mt-2 flex flex-wrap gap-3" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            <span>{row.tillDate ? 'Applicable during season days' : `${row.duration} days before`}</span>
                          </div>
                        </div>
                        <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(row.active) }}>{row.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <ActionButton onClick={() => openQuotaDialog(row)}>Edit</ActionButton>
                        <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'quota', action: 'delete', row })}>Delete</ActionButton>
                        <ActionButton onClick={() => setConfirmState({ kind: 'quota', action: 'toggle', row })}>{row.active ? 'Inactivate' : 'Activate'}</ActionButton>
                      </div>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <PageControls page={page} pageSize={pageSize} total={totalRecords} onPageChange={setPage} onPageSizeChange={next => { setPage(1); setPageSize(next) }} />
                  </div>
                </div>
              )
            )}

            {activeTab === 'vendor' && (
              vendorRows.length === 0 ? (
                <EmptyState title="Vendor Types" note="No vendor type added yet." />
              ) : (
                <div className="space-y-4">
                  {vendorRows.map(row => (
                    <div key={row.id} className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{row.name}</div>
                          <div className="mt-2 flex flex-wrap gap-3" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            <span>{row.bookingType === 'INVENTORY' ? 'Inventory' : 'Non Inventory'}</span>
                            <span>{row.subBookingTypeName || 'No sub booking type'}</span>
                            <span>{row.departmentNames.length ? row.departmentNames.join(', ') : 'No departments mapped'}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(row.active) }}>{row.active ? 'Active' : 'Inactive'}</span>
                          <ActionButton onClick={() => void openVendorDialog(row)}>Edit</ActionButton>
                          <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'vendor', action: 'delete', row })}>Delete</ActionButton>
                          <ActionButton onClick={() => setConfirmState({ kind: 'vendor', action: 'toggle', row })}>{row.active ? 'Inactivate' : 'Activate'}</ActionButton>
                        </div>
                      </div>
                    </div>
                  ))}
                  <PageControls page={page} pageSize={pageSize} total={totalRecords} onPageChange={setPage} onPageSizeChange={next => { setPage(1); setPageSize(next) }} />
                </div>
              )
            )}

            {activeTab === 'geo' && (
              <div className="space-y-6">
                <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                  <div className="mb-5">
                    <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>Divisions</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage division masters and open a division to view its district list.</div>
                  </div>
                  {divisionRows.length === 0 ? (
                    <EmptyState title="Divisions" note="No division added yet." />
                  ) : (
                    <div className="space-y-4">
                      {divisionRows.map(row => {
                        const selected = row.id === selectedDivisionId

                        return (
                          <div
                            key={row.id}
                            className="rounded-[24px] border p-4 transition-all"
                            onClick={() => setSelectedDivisionId(current => (current === row.id ? '' : row.id))}
                            style={{
                              borderColor: selected ? 'rgba(200,146,42,0.6)' : 'var(--sand)',
                              background: selected ? 'linear-gradient(135deg, rgba(200,146,42,0.10) 0%, rgba(255,255,255,1) 100%)' : '#fff',
                              cursor: 'pointer',
                              boxShadow: selected ? '0 12px 30px rgba(140,100,33,0.10)' : 'none',
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold" style={{ fontSize: 16, color: 'var(--text-dark)' }}>{row.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  <span>{selected ? 'Click again to hide districts' : 'Click to view districts'}</span>
                                  <ChevronRight size={14} />
                                  {row.code ? <span>Code: {row.code}</span> : null}
                                </div>
                                {row.nameMangal ? (
                                  <div className="mt-1" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.nameMangal}</div>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(row.active) }}>{row.active ? 'Active' : 'Inactive'}</span>
                                <div className="flex flex-wrap justify-end gap-2">
                                  <ActionButton onClick={() => openDivisionDialog(row)}>Edit</ActionButton>
                                  <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'division', action: 'delete', row })}>Delete</ActionButton>
                                  <ActionButton onClick={() => setConfirmState({ kind: 'division', action: 'toggle', row })}>{row.active ? 'Inactivate' : 'Activate'}</ActionButton>
                                </div>
                              </div>
                            </div>
                            {selected ? (
                              <div className="mt-4 rounded-[22px] border bg-white/80 p-4" style={{ borderColor: 'rgba(200,146,42,0.35)' }}>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="font-serif" style={{ fontSize: 20, color: 'var(--text-dark)', fontWeight: 700 }}>
                                      {divisionOptions.find(option => option.id === selectedDivisionId)?.name || divisionRows.find(item => item.id === selectedDivisionId)?.name || 'Selected Division'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Districts associated with this division.</div>
                                  </div>
                                  <button onClick={event => { event.stopPropagation(); openDistrictDialog() }} className="flex items-center gap-2 rounded-2xl px-3 py-2 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 12 }}>
                                    <Plus size={16} />
                                    Add District
                                  </button>
                                </div>

                                {districtRows.length === 0 ? (
                                  <EmptyState title="Districts" note="No district added yet for this division." />
                                ) : (
                                  <div className="space-y-2">
                                    {districtRows.map(district => (
                                      <div key={district.id} className="rounded-[20px] border p-3" style={{ borderColor: 'var(--sand)' }}>
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0 flex-1">
                                            <div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>{district.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{district.divisionName || divisionOptions.find(option => option.id === district.divisionId)?.name || 'Division'}</div>
                                            {district.nameMangal || district.code ? (
                                              <div className="mt-1 flex flex-wrap gap-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {district.nameMangal ? <span>{district.nameMangal}</span> : null}
                                                {district.code ? <span>Code: {district.code}</span> : null}
                                              </div>
                                            ) : null}
                                          </div>
                                          <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(district.active) }}>{district.active ? 'Active' : 'Inactive'}</span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                          <ActionButton onClick={() => openDistrictDialog(district)}>Edit</ActionButton>
                                          <ActionButton tone="danger" onClick={() => setConfirmState({ kind: 'district', action: 'delete', row: district })}>Delete</ActionButton>
                                          <ActionButton onClick={() => setConfirmState({ kind: 'district', action: 'toggle', row: district })}>{district.active ? 'Inactivate' : 'Activate'}</ActionButton>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )

  return (
    <AdminShellLayout>
      {pageContent}

      <Modal open={inventoryDialog.open} onClose={() => setInventoryDialog({ open: false, mode: 'create', row: null, name: '' })} title={inventoryDialog.mode === 'edit' ? 'Edit Inventory Type' : 'Add Inventory Type'} subtitle="Setting > Inventory Type flow from the recent project.">
        <div className="space-y-4">
          <Field label="Inventory Type Name">
            <input value={inventoryDialog.name} onChange={event => setInventoryDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter inventory type name" />
          </Field>
          <div className="flex justify-end">
            <button onClick={() => void handleSaveInventory()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : inventoryDialog.mode === 'edit' ? 'Update Inventory Type' : 'Create Inventory Type'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={subInventoryDialog.open} onClose={() => setSubInventoryDialog({ open: false, mode: 'create', row: null, parentId: '', parentName: '', name: '', seats: '' })} title={subInventoryDialog.mode === 'edit' ? 'Edit Sub Inventory Type' : 'Add Sub Inventory Type'} subtitle={`Parent inventory: ${subInventoryDialog.parentName || 'Selected inventory type'}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Sub Inventory Type Name">
            <input value={subInventoryDialog.name} onChange={event => setSubInventoryDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter sub inventory type name" />
          </Field>
          <Field label="Seats">
            <input value={subInventoryDialog.seats} onChange={event => setSubInventoryDialog(current => ({ ...current, seats: event.target.value.replace(/[^0-9]/g, '') }))} style={inputStyle()} placeholder="Enter seats" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveSubInventory()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : subInventoryDialog.mode === 'edit' ? 'Update Sub Inventory Type' : 'Create Sub Inventory Type'}</button>
        </div>
      </Modal>

      <Modal open={departmentDialog.open} onClose={() => setDepartmentDialog({ open: false, mode: 'create', row: null, name: '', abbreviation: '' })} title={departmentDialog.mode === 'edit' ? 'Edit Department' : 'Add Department'}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Department Name">
            <input value={departmentDialog.name} onChange={event => setDepartmentDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter department name" />
          </Field>
          <Field label="Abbreviation">
            <input value={departmentDialog.abbreviation} onChange={event => setDepartmentDialog(current => ({ ...current, abbreviation: event.target.value.toUpperCase().slice(0, 10) }))} style={inputStyle()} placeholder="Enter abbreviation" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveDepartment()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : departmentDialog.mode === 'edit' ? 'Update Department' : 'Create Department'}</button>
        </div>
      </Modal>

      <Modal open={categoryDialog.open} onClose={() => { setCategoryDialog({ open: false, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '' }); setCategorySubBookingOptions([]) }} title={categoryDialog.mode === 'edit' ? 'Edit Category' : 'Add Category'}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Category Name">
            <input value={categoryDialog.name} onChange={event => setCategoryDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter category name" />
          </Field>
          <Field label="Booking Type">
            <select
              value={categoryDialog.bookingType}
              onChange={async event => {
                const bookingType = event.target.value
                setCategoryDialog(current => ({ ...current, bookingType, subBookingTypeId: '', subBookingTypeName: '' }))
                await loadSubBookingOptions('category', bookingType)
              }}
              style={inputStyle()}
            >
              <option value="">Select booking type</option>
              {BOOKING_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Sub Booking Type">
            <select
              value={categoryDialog.subBookingTypeId}
              onChange={event => {
                const selected = categorySubBookingOptions.find(option => option.id === event.target.value)
                setCategoryDialog(current => ({ ...current, subBookingTypeId: event.target.value, subBookingTypeName: selected?.name ?? '' }))
              }}
              style={inputStyle()}
              disabled={!categoryDialog.bookingType}
            >
              <option value="">Select sub booking type</option>
              {categorySubBookingOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveCategory()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : categoryDialog.mode === 'edit' ? 'Update Category' : 'Create Category'}</button>
        </div>
      </Modal>

      <Modal open={ticketDialog.open} onClose={() => setTicketDialog({ open: false, mode: 'create', row: null, name: '', note: '' })} title={ticketDialog.mode === 'edit' ? 'Edit Ticket Type' : 'Add Ticket Type'}>
        <div className="space-y-4">
          <Field label="Ticket Type Name">
            <input value={ticketDialog.name} onChange={event => setTicketDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter ticket type name" />
          </Field>
          <Field label="Note">
            <input value={ticketDialog.note} onChange={event => setTicketDialog(current => ({ ...current, note: event.target.value }))} style={inputStyle()} placeholder="Enter note" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveTicketType()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : ticketDialog.mode === 'edit' ? 'Update Ticket Type' : 'Create Ticket Type'}</button>
        </div>
      </Modal>

      <Modal open={quotaDialog.open} onClose={() => setQuotaDialog({ open: false, mode: 'create', row: null, name: '', duration: '0', tillDate: false })} title={quotaDialog.mode === 'edit' ? 'Edit Quota Type' : 'Add Quota Type'}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Quota Name">
            <input value={quotaDialog.name} onChange={event => setQuotaDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter quota name" />
          </Field>
          {!quotaDialog.tillDate ? (
            <Field label="Duration (Before Days)">
              <input value={quotaDialog.duration} onChange={event => setQuotaDialog(current => ({ ...current, duration: event.target.value.replace(/[^0-9]/g, '') || '0' }))} style={inputStyle()} placeholder="Enter duration" />
            </Field>
          ) : null}
        </div>
        <label className="mt-4 flex items-center gap-3" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
          <input type="checkbox" checked={quotaDialog.tillDate} onChange={event => setQuotaDialog(current => ({ ...current, tillDate: event.target.checked }))} />
          Applicable during season days
        </label>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveQuota()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : quotaDialog.mode === 'edit' ? 'Update Quota Type' : 'Create Quota Type'}</button>
        </div>
      </Modal>

      <Modal open={vendorDialog.open} onClose={() => { setVendorDialog({ open: false, mode: 'create', row: null, name: '', bookingType: '', subBookingTypeId: '', subBookingTypeName: '', departmentIds: [] }); setVendorSubBookingOptions([]); setVendorDepartmentDropdownOpen(false) }} title={vendorDialog.mode === 'edit' ? 'Edit Vendor Type' : 'Add Vendor Type'}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vendor Type Name">
            <input value={vendorDialog.name} onChange={event => setVendorDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter vendor type name" />
          </Field>
          <Field label="Booking Type">
            <select
              value={vendorDialog.bookingType}
              onChange={async event => {
                const bookingType = event.target.value
                setVendorDialog(current => ({ ...current, bookingType, subBookingTypeId: '', subBookingTypeName: '' }))
                await loadSubBookingOptions('vendor', bookingType)
              }}
              style={inputStyle()}
            >
              <option value="">Select booking type</option>
              {BOOKING_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Sub Booking Type">
            <select
              value={vendorDialog.subBookingTypeId}
              onChange={event => {
                const selected = vendorSubBookingOptions.find(option => option.id === event.target.value)
                setVendorDialog(current => ({ ...current, subBookingTypeId: event.target.value, subBookingTypeName: selected?.name ?? '' }))
              }}
              style={inputStyle()}
              disabled={!vendorDialog.bookingType}
            >
              <option value="">Select sub booking type</option>
              {vendorSubBookingOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </Field>
          <Field label="Departments">
            <div className="relative">
              <button
                type="button"
                onClick={() => setVendorDepartmentDropdownOpen(current => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
                style={inputStyle()}
              >
                <span style={{ color: vendorDialog.departmentIds.length ? 'var(--text-dark)' : 'var(--text-muted)' }}>
                  {vendorDialog.departmentIds.length
                    ? vendorDialog.departmentIds
                        .map(id => departmentOptions.find(option => option.id === id)?.name ?? id)
                        .join(', ')
                    : 'Select departments'}
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--text-muted)',
                    transform: vendorDepartmentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}
                />
              </button>

              {vendorDepartmentDropdownOpen ? (
                <div
                  className="absolute z-20 mt-2 w-full rounded-[18px] border bg-white p-2 shadow-xl"
                  style={{ borderColor: 'var(--sand)' }}
                >
                  <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                    {departmentOptions.length === 0 ? (
                      <div className="px-3 py-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        No departments available.
                      </div>
                    ) : departmentOptions.map(option => {
                      const checked = vendorDialog.departmentIds.includes(option.id)

                      return (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2"
                          style={{ background: checked ? 'rgba(200,146,42,0.10)' : 'transparent' }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVendorDepartment(option.id)}
                          />
                          <span style={{ fontSize: 13, color: 'var(--text-dark)' }}>{option.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveVendorType()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : vendorDialog.mode === 'edit' ? 'Update Vendor Type' : 'Create Vendor Type'}</button>
        </div>
      </Modal>

      <Modal open={divisionDialog.open} onClose={() => setDivisionDialog({ open: false, mode: 'create', row: null, name: '', nameMangal: '', code: '', active: true })} title={divisionDialog.mode === 'edit' ? 'Edit Division' : 'Add Division'}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Division">
            <input value={divisionDialog.name} onChange={event => setDivisionDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter division" />
          </Field>
          <Field label="Division Mangal">
            <input value={divisionDialog.nameMangal} onChange={event => setDivisionDialog(current => ({ ...current, nameMangal: event.target.value }))} style={inputStyle()} placeholder="Enter division mangal" />
          </Field>
          <Field label="Code">
            <input value={divisionDialog.code} onChange={event => setDivisionDialog(current => ({ ...current, code: event.target.value.toUpperCase() }))} style={inputStyle()} placeholder="Enter code" />
          </Field>
        </div>
        <label className="mt-4 flex items-center gap-3" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
          <input type="checkbox" checked={divisionDialog.active} onChange={event => setDivisionDialog(current => ({ ...current, active: event.target.checked }))} />
          Active
        </label>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveDivision()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : divisionDialog.mode === 'edit' ? 'Update Division' : 'Create Division'}</button>
        </div>
      </Modal>

      <Modal open={districtDialog.open} onClose={() => setDistrictDialog({ open: false, mode: 'create', row: null, divisionId: selectedDivisionId, name: '', nameMangal: '', code: '' })} title={districtDialog.mode === 'edit' ? 'Edit District' : 'Add District'}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input value={districtDialog.name} onChange={event => setDistrictDialog(current => ({ ...current, name: event.target.value }))} style={inputStyle()} placeholder="Enter district name" />
          </Field>
          <Field label="District Mangal">
            <input value={districtDialog.nameMangal} onChange={event => setDistrictDialog(current => ({ ...current, nameMangal: event.target.value }))} style={inputStyle()} placeholder="Enter district mangal" />
          </Field>
          <Field label="Division Id">
            <input value={districtDialog.divisionId} readOnly style={{ ...inputStyle(), background: '#F8F4EE', color: 'var(--text-muted)' }} placeholder="Division id will auto fill" />
          </Field>
          <Field label="Code">
            <input value={districtDialog.code} onChange={event => setDistrictDialog(current => ({ ...current, code: event.target.value.toUpperCase() }))} style={inputStyle()} placeholder="Enter code" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => void handleSaveDistrict()} disabled={saving} className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : districtDialog.mode === 'edit' ? 'Update District' : 'Create District'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.action === 'delete' ? 'Delete Record' : 'Update Status'}
        note={confirmState?.action === 'delete' ? 'This action will remove the selected record. Please confirm to continue.' : 'This action will change the active state for the selected record. Please confirm to continue.'}
        loading={saving}
        onClose={() => setConfirmState(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </AdminShellLayout>
  )
}
