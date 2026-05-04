'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import {
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  Eye,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  X,
} from 'lucide-react'

type MainTabKey = 'vendor-request' | 'inventory-request' | 'vendor-listing'
type InventoryTabKey = 'sub-inventory' | 'add-inventory' | 'release-inventory'
type RequestStatusKey = 'PENDING' | 'APPROVE' | 'REJECT'

type VendorTypeOption = {
  id: string
  name: string
}

type VerificationResult = {
  id: string
  userName: string
  email: string
  mobile: string
  ssoId: string
}

type VendorRequestRow = {
  id: string
  userId: string
  vendorName: string
  ssoId: string
  companyName: string
  registrationNo: string
  vendorTypeName: string
  companyAddress: string
  companyInfo: string
  email: string
  mobile: string
  requestStatus: string
  status: boolean
}

type SubInventoryRequestRow = {
  id: string
  vendorName: string
  ssoId: string
  companyName: string
  subInventoryTypeName: string
  inventoryTypeName: string
  requestStatus: string
}

type PlaceInventoryRequestRow = {
  id: string
  vendorName: string
  ssoId: string
  placeName: string
  subInventoryTypeName: string
  vehicleNumber: string
  requestStatus: string
}

type VendorListingRow = {
  id: string
  userId: string
  vendorName: string
  ssoId: string
  companyName: string
  registrationNo: string
  contactPerson: string
  email: string
  mobile: string
  vendorTypeName: string
  active: boolean
  companyAddress: string
  companyInfo: string
}

type CreateVendorForm = {
  ssoId: string
  verifiedUserId: string
  userName: string
  email: string
  mobile: string
  companyName: string
  companyRegistrationNo: string
  vendorTypeId: string
  officeAddress: string
  companyInfo: string
}

type InventoryActionRow = SubInventoryRequestRow | PlaceInventoryRequestRow
type ActionTarget = 'vendor-request' | 'sub-inventory' | 'add-inventory' | 'release-inventory'

type ActionDialogState =
  | { target: ActionTarget; mode: 'approve' | 'reject'; row: VendorRequestRow | InventoryActionRow }
  | null

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const MAIN_TABS: Array<{ key: MainTabKey; label: string; icon: typeof ClipboardList }> = [
  { key: 'vendor-request', label: 'Vendor Request', icon: ClipboardList },
  { key: 'inventory-request', label: 'Inventory Request', icon: Truck },
  { key: 'vendor-listing', label: 'Vendor Listing', icon: Store },
]

const INVENTORY_TABS: Array<{ key: InventoryTabKey; label: string }> = [
  { key: 'sub-inventory', label: 'Sub-Inventory Type' },
  { key: 'add-inventory', label: 'Add Inventory' },
  { key: 'release-inventory', label: 'Release Inventory' },
]

const STATUS_TABS: Array<{ key: RequestStatusKey; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVE', label: 'Approved' },
  { key: 'REJECT', label: 'Rejected' },
]

const DEFAULT_CREATE_FORM: CreateVendorForm = {
  ssoId: '',
  verifiedUserId: '',
  userName: '',
  email: '',
  mobile: '',
  companyName: '',
  companyRegistrationNo: '',
  vendorTypeId: '',
  officeAddress: '',
  companyInfo: '',
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }

  return fallback
}

function getText(value: unknown, fallback = 'N/A') {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }

  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
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

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 6) return null

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

function extractVendorRequests(payload: unknown): VendorRequestRow[] {
  const root = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray((root as { vendorRequestDtos?: unknown[] }).vendorRequestDtos)
    ? (root as { vendorRequestDtos: unknown[] }).vendorRequestDtos
    : findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      const vendorDetail = getAny(row, 'vendorDetail')

      return {
        id: getText(getValueFromKeys(row, ['id']), ''),
        userId: getText(getValueFromKeys(row, ['userId', 'vendorUserId', 'vendorDetailId']), ''),
        vendorName: getText(getValueFromKeys(row, ['userName', 'displayName']) ?? getAny(vendorDetail, 'displayName')),
        ssoId: getText(getValueFromKeys(row, ['ssoId']) ?? getAny(vendorDetail, 'ssoId')),
        companyName: getText(getValueFromKeys(row, ['companyName'])),
        registrationNo: getText(getValueFromKeys(row, ['registrationNo', 'companyRegistrationNo'])),
        vendorTypeName: getText(getValueFromKeys(row, ['vendorTypeName'])),
        companyAddress: getText(getValueFromKeys(row, ['companyAddress', 'officeAddress']), ''),
        companyInfo: getText(getValueFromKeys(row, ['companyInfo', 'officeInfo']), ''),
        email: getText(getValueFromKeys(row, ['email'])),
        mobile: getText(getValueFromKeys(row, ['mobile'])),
        requestStatus: getText(getValueFromKeys(row, ['requestStatus', 'status']), ''),
        status: Boolean(getValueFromKeys(row, ['status', 'active', 'isActive'])),
      }
    })
    .filter(row => row.id)
}

function extractVendorListing(payload: unknown): VendorListingRow[] {
  return extractVendorRequests(payload).map(row => ({
    id: row.id,
    userId: row.userId,
    vendorName: row.vendorName,
    ssoId: row.ssoId,
    companyName: row.companyName,
    registrationNo: row.registrationNo,
    contactPerson: row.vendorName,
    email: row.email,
    mobile: row.mobile,
    vendorTypeName: row.vendorTypeName,
    active: row.status,
    companyAddress: row.companyAddress,
    companyInfo: row.companyInfo,
  }))
}

function extractSubInventoryRequests(payload: unknown): SubInventoryRequestRow[] {
  const root = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray((root as { inventoryMasterDetailsDtos?: unknown[] }).inventoryMasterDetailsDtos)
    ? (root as { inventoryMasterDetailsDtos: unknown[] }).inventoryMasterDetailsDtos
    : findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      const vendorDetail = getAny(row, 'vendorDetail')
      const subInventoryTypeDto = getAny(row, 'subInventoryTypeDto')
      const inventoryTypeDto = getAny(row, 'inventoryTypeDto')

      return {
        id: getText(getValueFromKeys(row, ['id']), ''),
        vendorName: getText(getAny(vendorDetail, 'displayName')),
        ssoId: getText(getAny(vendorDetail, 'ssoId')),
        companyName: getText(getAny(vendorDetail, 'companyName'), ''),
        subInventoryTypeName: getText(getAny(subInventoryTypeDto, 'name')),
        inventoryTypeName: getText(getAny(inventoryTypeDto, 'name')),
        requestStatus: getText(getValueFromKeys(row, ['requestStatus', 'status']), ''),
      }
    })
    .filter(row => row.id)
}

function extractPlaceInventoryRequests(payload: unknown): PlaceInventoryRequestRow[] {
  const root = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray((root as { vendorPlaceDetailsDtos?: unknown[] }).vendorPlaceDetailsDtos)
    ? (root as { vendorPlaceDetailsDtos: unknown[] }).vendorPlaceDetailsDtos
    : findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: getText(getValueFromKeys(row, ['id']), ''),
        vendorName: getText(getValueFromKeys(row, ['displayName', 'userName', 'vendorName'])),
        ssoId: getText(getValueFromKeys(row, ['ssoId'])),
        placeName: getText(getValueFromKeys(row, ['placeName'])),
        subInventoryTypeName: getText(getValueFromKeys(row, ['subInventoryTypeName'])),
        vehicleNumber: getText(getValueFromKeys(row, ['vehicleNumber']), ''),
        requestStatus: getText(getValueFromKeys(row, ['requestStatus', 'status']), ''),
      }
    })
    .filter(row => row.id)
}

function extractVendorTypeOptions(payload: unknown): VendorTypeOption[] {
  const root = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray((root as { masterVendorTypeDto?: unknown[] }).masterVendorTypeDto)
    ? (root as { masterVendorTypeDto: unknown[] }).masterVendorTypeDto
    : findFirstArray(payload) ?? []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      id: getText(getValueFromKeys(item, ['id']), ''),
      name: getText(getValueFromKeys(item, ['name']), ''),
    }))
    .filter(option => option.id && option.name)
}

function extractVerificationResult(payload: unknown): VerificationResult | null {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result
    : null

  if (!result || typeof result !== 'object') return null

  return {
    id: getText(getValueFromKeys(result, ['id', 'userId']), ''),
    userName: getText(getValueFromKeys(result, ['displayName', 'userName', 'name']), ''),
    email: getText(getValueFromKeys(result, ['email']), ''),
    mobile: getText(getValueFromKeys(result, ['mobile']), ''),
    ssoId: getText(getValueFromKeys(result, ['ssoId']), ''),
  }
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
    pages.add(i)
  }
  if (totalPages > 1) pages.add(totalPages)
  return Array.from(pages).sort((a, b) => a - b)
}

function statusChipColor(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized === 'APPROVE' || normalized === 'APPROVED') {
    return { bg: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
  }
  if (normalized === 'REJECT' || normalized === 'REJECTED') {
    return { bg: 'rgba(229,62,62,0.12)', color: '#B83232' }
  }
  return { bg: 'rgba(200,146,42,0.14)', color: '#9A6A00' }
}

function tableEmptyText(mainTab: MainTabKey, inventoryTab: InventoryTabKey, status: RequestStatusKey) {
  if (mainTab === 'vendor-request') return 'No vendor requests found.'
  if (mainTab === 'vendor-listing') return 'No vendors found.'
  const label = inventoryTab === 'sub-inventory'
    ? 'sub-inventory'
    : inventoryTab === 'add-inventory'
    ? 'add inventory'
    : 'release inventory'
  return `No ${status.toLowerCase()} ${label} requests found.`
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
        style={{ maxWidth: 760, boxShadow: '0 32px 90px rgba(107,18,18,0.24)' }}
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

export default function VendorManagementPage() {
  const [mainTab, setMainTab] = useState<MainTabKey>('vendor-request')
  const [inventoryTab, setInventoryTab] = useState<InventoryTabKey>('sub-inventory')
  const [requestStatus, setRequestStatus] = useState<RequestStatusKey>('PENDING')
  const [searchText, setSearchText] = useState('')
  const deferredSearch = useDeferredValue(searchText)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [totalRecords, setTotalRecords] = useState(0)
  const [vendorRequests, setVendorRequests] = useState<VendorRequestRow[]>([])
  const [vendorListing, setVendorListing] = useState<VendorListingRow[]>([])
  const [subInventoryRows, setSubInventoryRows] = useState<SubInventoryRequestRow[]>([])
  const [addInventoryRows, setAddInventoryRows] = useState<PlaceInventoryRequestRow[]>([])
  const [releaseInventoryRows, setReleaseInventoryRows] = useState<PlaceInventoryRequestRow[]>([])
  const [vendorTypeOptions, setVendorTypeOptions] = useState<VendorTypeOption[]>([])
  const [vendorTypesLoading, setVendorTypesLoading] = useState(false)
  const [selectedVendorRequest, setSelectedVendorRequest] = useState<VendorRequestRow | null>(null)
  const [selectedVendorListing, setSelectedVendorListing] = useState<VendorListingRow | null>(null)
  const [actionDialog, setActionDialog] = useState<ActionDialogState>(null)
  const [actionReason, setActionReason] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)
  const [actionError, setActionError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateVendorForm>(DEFAULT_CREATE_FORM)
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateVendorForm, string>>>({})
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [verifyingSSO, setVerifyingSSO] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const queryLabel = mainTab === 'vendor-request'
    ? 'vendor requests'
    : mainTab === 'vendor-listing'
    ? 'vendors'
    : inventoryTab === 'sub-inventory'
    ? 'sub-inventory requests'
    : inventoryTab === 'add-inventory'
    ? 'add inventory requests'
    : 'release inventory requests'

  useEffect(() => {
    setPage(1)
  }, [mainTab, inventoryTab, requestStatus])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    const controller = new AbortController()

    async function loadRows() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({
          offSet: String(page - 1),
          size: String(pageSize),
          searchKey: deferredSearch.trim(),
        })

        let endpoint = '/api/operations/vendors/requests'
        let parser: (payload: unknown) => unknown[] = extractVendorRequests

        if (mainTab === 'vendor-request') {
          params.set('status', 'PENDING')
          endpoint = '/api/operations/vendors/requests'
          parser = extractVendorRequests
        } else if (mainTab === 'vendor-listing') {
          params.set('status', 'APPROVE')
          endpoint = '/api/operations/vendors/listing'
          parser = extractVendorListing
        } else if (inventoryTab === 'sub-inventory') {
          params.set('requestStatus', requestStatus)
          endpoint = '/api/operations/vendors/inventory/sub'
          parser = extractSubInventoryRequests
        } else if (inventoryTab === 'add-inventory') {
          params.set('requestStatus', requestStatus)
          endpoint = '/api/operations/vendors/inventory/add'
          parser = extractPlaceInventoryRequests
        } else {
          params.set('requestStatus', requestStatus)
          endpoint = '/api/operations/vendors/inventory/release'
          parser = extractPlaceInventoryRequests
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, `Unable to fetch ${queryLabel}.`))

        const nextRows = parser(payload)
        const nextTotal = extractTotalRecords(payload, nextRows.length)

        setTotalRecords(nextTotal)

        if (mainTab === 'vendor-request') {
          setVendorRequests(nextRows as VendorRequestRow[])
        } else if (mainTab === 'vendor-listing') {
          setVendorListing(nextRows as VendorListingRow[])
        } else if (inventoryTab === 'sub-inventory') {
          setSubInventoryRows(nextRows as SubInventoryRequestRow[])
        } else if (inventoryTab === 'add-inventory') {
          setAddInventoryRows(nextRows as PlaceInventoryRequestRow[])
        } else {
          setReleaseInventoryRows(nextRows as PlaceInventoryRequestRow[])
        }
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setTotalRecords(0)
        if (mainTab === 'vendor-request') setVendorRequests([])
        if (mainTab === 'vendor-listing') setVendorListing([])
        if (mainTab === 'inventory-request' && inventoryTab === 'sub-inventory') setSubInventoryRows([])
        if (mainTab === 'inventory-request' && inventoryTab === 'add-inventory') setAddInventoryRows([])
        if (mainTab === 'inventory-request' && inventoryTab === 'release-inventory') setReleaseInventoryRows([])
        setError(loadError instanceof Error ? loadError.message : `Unable to fetch ${queryLabel}.`)
      } finally {
        setLoading(false)
      }
    }

    loadRows()

    return () => controller.abort()
  }, [deferredSearch, inventoryTab, mainTab, page, pageSize, queryLabel, refreshKey, requestStatus])

  useEffect(() => {
    if (!createOpen) return

    const controller = new AbortController()

    async function loadVendorTypes() {
      try {
        setVendorTypesLoading(true)
        const response = await fetch('/api/operations/vendors/master-types?pagination=false&size=200&searchKey=&status=', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch vendor types.'))
        setVendorTypeOptions(extractVendorTypeOptions(payload))
      } catch {
        setVendorTypeOptions([])
      } finally {
        setVendorTypesLoading(false)
      }
    }

    loadVendorTypes()
    return () => controller.abort()
  }, [createOpen])

  const currentRows = useMemo(() => {
    if (mainTab === 'vendor-request') return vendorRequests
    if (mainTab === 'vendor-listing') return vendorListing
    if (inventoryTab === 'sub-inventory') return subInventoryRows
    if (inventoryTab === 'add-inventory') return addInventoryRows
    return releaseInventoryRows
  }, [addInventoryRows, inventoryTab, mainTab, releaseInventoryRows, subInventoryRows, vendorListing, vendorRequests])

  const stats = useMemo(() => {
    const rowsCount = currentRows.length
    return [
      { label: 'Current Module', value: mainTab === 'inventory-request' ? 'Inventory Request' : mainTab === 'vendor-request' ? 'Vendor Request' : 'Vendor Listing' },
      { label: 'Visible Records', value: String(totalRecords) },
      { label: 'Page Size', value: String(pageSize) },
      { label: 'Rows Loaded', value: String(rowsCount) },
    ]
  }, [currentRows.length, mainTab, pageSize, totalRecords])

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const pages = getVisiblePages(page, totalPages)

  const validateCreateForm = () => {
    const nextErrors: Partial<Record<keyof CreateVendorForm, string>> = {}
    if (!createForm.ssoId.trim()) nextErrors.ssoId = 'SSO ID is required.'
    if (!createForm.verifiedUserId.trim()) nextErrors.ssoId = 'Verify the SSO ID before creating the vendor.'
    if (!createForm.userName.trim()) nextErrors.userName = 'Vendor name is required.'
    if (!createForm.email.trim()) nextErrors.email = 'Email is required.'
    if (!createForm.mobile.trim()) nextErrors.mobile = 'Mobile number is required.'
    if (!createForm.companyName.trim()) nextErrors.companyName = 'Company name is required.'
    if (!createForm.companyRegistrationNo.trim()) nextErrors.companyRegistrationNo = 'Company registration number is required.'
    if (!createForm.vendorTypeId.trim()) nextErrors.vendorTypeId = 'Vendor type is required.'
    if (!createForm.officeAddress.trim()) nextErrors.officeAddress = 'Office address is required.'
    if (!createForm.companyInfo.trim()) nextErrors.companyInfo = 'Company information is required.'
    setCreateErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleVerifySSO() {
    const ssoId = createForm.ssoId.trim()
    if (!ssoId) {
      setCreateErrors(current => ({ ...current, ssoId: 'SSO ID is required.' }))
      return
    }

    try {
      setVerifyingSSO(true)
      setVerificationStatus(null)
      setCreateErrors(current => ({ ...current, ssoId: undefined }))

      const response = await fetch(`/api/operations/vendors/verify-sso?ssoId=${encodeURIComponent(ssoId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to verify SSO ID.'))

      const verified = extractVerificationResult(payload)
      if (!verified?.id) throw new Error('No user id returned from SSO verification.')

      setCreateForm(current => ({
        ...current,
        verifiedUserId: verified.id,
        userName: verified.userName || current.userName,
        email: verified.email || current.email,
        mobile: verified.mobile || current.mobile,
      }))
      setVerificationStatus({ type: 'success', message: `SSO ID ${verified.ssoId || ssoId} verified successfully.` })
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : 'Unable to verify SSO ID.'
      setVerificationStatus({ type: 'error', message })
      setCreateForm(current => ({ ...current, verifiedUserId: '' }))
      setCreateErrors(current => ({ ...current, ssoId: message }))
    } finally {
      setVerifyingSSO(false)
    }
  }

  async function handleCreateVendor() {
    if (!validateCreateForm()) return

    try {
      setCreateSubmitting(true)

      const response = await fetch('/api/operations/vendors/listing', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: createForm.verifiedUserId,
          companyAddress: createForm.officeAddress.trim(),
          companyInfo: createForm.companyInfo.trim(),
          companyName: createForm.companyName.trim(),
          email: createForm.email.trim(),
          mobile: createForm.mobile.trim(),
          registrationNo: createForm.companyRegistrationNo.trim(),
          userName: createForm.userName.trim(),
          vendorTypeId: createForm.vendorTypeId,
          ssoId: createForm.ssoId.trim(),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to create vendor.'))

      setCreateOpen(false)
      setCreateForm(DEFAULT_CREATE_FORM)
      setCreateErrors({})
      setVerificationStatus(null)
      setSuccessMessage(extractMessage(payload, 'Vendor created successfully.'))
      setMainTab('vendor-listing')
      setRefreshKey(current => current + 1)
    } catch (submitError) {
      setVerificationStatus({
        type: 'error',
        message: submitError instanceof Error ? submitError.message : 'Unable to create vendor.',
      })
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleActionSubmit() {
    if (!actionDialog) return
    if (actionDialog.mode === 'reject' && !actionReason.trim()) {
      setActionError('Reason is required for rejection.')
      return
    }

    try {
      setSubmittingAction(true)
      setActionError('')

      const requestStatusValue = actionDialog.mode === 'approve' ? 'APPROVE' : 'REJECT'
      let endpoint = '/api/operations/vendors/requests/decision'
      const payload: Record<string, unknown> = {
        id: actionDialog.row.id,
        requestStatus: requestStatusValue,
      }

      if (actionDialog.mode === 'reject') {
        payload.reason = actionReason.trim()
      }

      if (actionDialog.target === 'sub-inventory') {
        endpoint = '/api/operations/vendors/inventory/sub/decision'
      } else if (actionDialog.target === 'add-inventory') {
        endpoint = '/api/operations/vendors/inventory/add/decision'
      } else if (actionDialog.target === 'release-inventory') {
        endpoint = '/api/operations/vendors/inventory/release/decision'
      }

      const response = await fetch(endpoint, {
        method: actionDialog.target === 'vendor-request' ? 'POST' : 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responsePayload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(responsePayload, 'Unable to process the request.'))

      setActionDialog(null)
      setActionReason('')
      setSuccessMessage(extractMessage(responsePayload, 'Request updated successfully.'))
      setRefreshKey(current => current + 1)
      if (selectedVendorRequest && actionDialog.target === 'vendor-request') {
        setSelectedVendorRequest(null)
      }
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Unable to process the request.')
    } finally {
      setSubmittingAction(false)
    }
  }

  async function handleToggleVendorStatus(row: VendorListingRow) {
    try {
      setLoading(true)
      const response = await fetch('/api/operations/vendors/listing', {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssoId: row.ssoId,
          activate: !row.active,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to update vendor status.'))

      setSuccessMessage(extractMessage(payload, `Vendor ${row.active ? 'deactivated' : 'activated'} successfully.`))
      setRefreshKey(current => current + 1)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update vendor status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShellLayout>
      <div className="min-h-full px-6 py-6 lg:px-8">
        <SectionHeader title="Operations / Vendor Management" />

        <div className="mb-6 overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 42%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}>
          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.45fr_auto] lg:px-8 lg:py-8">
            <div>
              
              <h1 className="font-serif" style={{ fontSize: 30, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>
                Vendor Management
              </h1>
             
            </div>

            <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
              {mainTab === 'vendor-listing' ? (
                <button
                  onClick={() => {
                    setCreateOpen(true)
                    setCreateForm(DEFAULT_CREATE_FORM)
                    setCreateErrors({})
                    setVerificationStatus(null)
                  }}
                  className="rounded-2xl px-4 py-3 font-medium text-white"
                  style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 13 }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus size={15} />
                    Create Vendor
                  </span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-px sm:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
            {stats.map(card => (
              <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        {successMessage ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
        {error ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

        <div className="mb-5 flex flex-wrap gap-3">
          {MAIN_TABS.map(tab => {
            const Icon = tab.icon
            const active = tab.key === mainTab
            return (
              <button
                key={tab.key}
                onClick={() => setMainTab(tab.key)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-medium"
                style={{
                  background: active ? 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' : '#fff',
                  color: active ? '#fff' : 'var(--text-mid)',
                  border: active ? '1px solid transparent' : '1px solid var(--sand)',
                  fontSize: 13,
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {mainTab === 'inventory-request' ? (
          <div className="mb-5 flex flex-wrap gap-3">
            {INVENTORY_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setInventoryTab(tab.key)}
                className="rounded-2xl px-4 py-2.5 font-medium"
                style={{
                  background: tab.key === inventoryTab ? 'rgba(139,26,26,0.10)' : '#fff',
                  color: tab.key === inventoryTab ? 'var(--maroon)' : 'var(--text-mid)',
                  border: tab.key === inventoryTab ? '1px solid rgba(139,26,26,0.18)' : '1px solid var(--sand)',
                  fontSize: 12,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {mainTab === 'inventory-request' ? (
          <div className="mb-5 flex flex-wrap gap-3">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setRequestStatus(tab.key)}
                className="rounded-full px-4 py-2 font-medium"
                style={{
                  background: tab.key === requestStatus ? 'var(--maroon)' : '#fff',
                  color: tab.key === requestStatus ? '#fff' : 'var(--text-mid)',
                  border: `1px solid ${tab.key === requestStatus ? 'var(--maroon)' : 'var(--sand)'}`,
                  fontSize: 12,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-serif" style={{ fontSize: 28, color: 'var(--text-dark)', fontWeight: 700 }}>
                {mainTab === 'vendor-request'
                  ? 'Vendor Request Queue'
                  : mainTab === 'vendor-listing'
                  ? 'Vendor Listing'
                  : inventoryTab === 'sub-inventory'
                  ? 'Sub-Inventory Requests'
                  : inventoryTab === 'add-inventory'
                  ? 'Add Inventory Requests'
                  : 'Release Inventory Requests'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Search across {queryLabel} and work through the current approvals.
              </div>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={searchText}
                onChange={event => setSearchText(event.target.value)}
                placeholder={`Search ${queryLabel}`}
                className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-80"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <RajasthanLoader label={`Loading ${queryLabel}...`} />
            </div>
          ) : currentRows.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
                <Store size={30} />
              </div>
              <div className="font-serif" style={{ fontSize: 28, color: 'var(--text-dark)', fontWeight: 700 }}>
                {mainTab === 'vendor-listing' ? 'No vendors found' : 'No records found'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420 }}>
                {searchText.trim() ? 'Try a different search phrase to view matching records.' : tableEmptyText(mainTab, inventoryTab, requestStatus)}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--cream-dark)', background: '#FCFAF7' }}>
                      {mainTab === 'vendor-request' ? (
                        <>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Company</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registration No.</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor Type</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                        </>
                      ) : null}

                      {mainTab === 'vendor-listing' ? (
                        <>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Company</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registration No.</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mobile</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                        </>
                      ) : null}

                      {mainTab === 'inventory-request' && inventoryTab === 'sub-inventory' ? (
                        <>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sub-Inventory</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inventory Type</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                        </>
                      ) : null}

                      {mainTab === 'inventory-request' && inventoryTab !== 'sub-inventory' ? (
                        <>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sub-Inventory</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {inventoryTab === 'release-inventory' ? 'Vehicle Number' : 'Place'}
                          </th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                          <th className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>

                  <tbody>
                    {mainTab === 'vendor-request'
                      ? vendorRequests.map(row => {
                          const statusStyle = statusChipColor(row.requestStatus)
                          return (
                            <tr key={row.id} style={{ borderTop: '1px solid var(--cream-dark)' }}>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
                                    <UserRound size={18} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.vendorName}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.ssoId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.companyName}</td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.registrationNo}</td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.vendorTypeName}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, background: statusStyle.bg, color: statusStyle.color }}>
                                    {row.requestStatus || 'Pending'}
                                  </span>
                                  <button
                                    onClick={() => setSelectedVendorRequest(row)}
                                    className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium"
                                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                                  >
                                    <Eye size={14} />
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      : null}

                    {mainTab === 'vendor-listing'
                      ? vendorListing.map(row => (
                          <tr key={row.id} style={{ borderTop: '1px solid var(--cream-dark)' }}>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: 'linear-gradient(135deg, #1A7A6E, #2A9D8F)' }}>
                                  <Building2 size={18} />
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.vendorName}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.ssoId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.companyName}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.registrationNo}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.email}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.mobile}</td>
                            <td className="px-4 py-4">
                              <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, background: row.active ? 'rgba(26,122,110,0.12)' : 'rgba(229,62,62,0.12)', color: row.active ? '#1A7A6E' : '#B83232' }}>
                                {row.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedVendorListing(row)}
                                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium"
                                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                                >
                                  <Eye size={14} />
                                  View
                                </button>
                                <button
                                  onClick={() => handleToggleVendorStatus(row)}
                                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium"
                                  style={{ background: row.active ? 'rgba(229,62,62,0.10)' : 'rgba(26,122,110,0.10)', color: row.active ? '#B83232' : '#1A7A6E', fontSize: 12 }}
                                >
                                  {row.active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      : null}

                    {mainTab === 'inventory-request' && inventoryTab === 'sub-inventory'
                      ? subInventoryRows.map(row => {
                          const statusStyle = statusChipColor(row.requestStatus)
                          return (
                            <tr key={row.id} style={{ borderTop: '1px solid var(--cream-dark)' }}>
                              <td className="px-4 py-4">
                                <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.vendorName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.ssoId}</div>
                              </td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.subInventoryTypeName}</td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.inventoryTypeName}</td>
                              <td className="px-4 py-4">
                                <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, background: statusStyle.bg, color: statusStyle.color }}>
                                  {row.requestStatus || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {requestStatus === 'PENDING' ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setActionDialog({ target: 'sub-inventory', mode: 'approve', row })}
                                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium text-white"
                                      style={{ background: '#1A7A6E', fontSize: 12 }}
                                    >
                                      <Check size={14} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setActionDialog({ target: 'sub-inventory', mode: 'reject', row })}
                                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium text-white"
                                      style={{ background: '#B83232', fontSize: 12 }}
                                    >
                                      <X size={14} />
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completed</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      : null}

                    {mainTab === 'inventory-request' && inventoryTab === 'add-inventory'
                      ? addInventoryRows.map(row => {
                          const statusStyle = statusChipColor(row.requestStatus)
                          return (
                            <tr key={row.id} style={{ borderTop: '1px solid var(--cream-dark)' }}>
                              <td className="px-4 py-4">
                                <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.vendorName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.ssoId}</div>
                              </td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.subInventoryTypeName}</td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.placeName}</td>
                              <td className="px-4 py-4">
                                <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, background: statusStyle.bg, color: statusStyle.color }}>
                                  {row.requestStatus || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {requestStatus === 'PENDING' ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setActionDialog({ target: 'add-inventory', mode: 'approve', row })}
                                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium text-white"
                                      style={{ background: '#1A7A6E', fontSize: 12 }}
                                    >
                                      <Check size={14} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setActionDialog({ target: 'add-inventory', mode: 'reject', row })}
                                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium text-white"
                                      style={{ background: '#B83232', fontSize: 12 }}
                                    >
                                      <X size={14} />
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completed</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      : null}

                    {mainTab === 'inventory-request' && inventoryTab === 'release-inventory'
                      ? releaseInventoryRows.map(row => {
                          const statusStyle = statusChipColor(row.requestStatus)
                          return (
                            <tr key={row.id} style={{ borderTop: '1px solid var(--cream-dark)' }}>
                              <td className="px-4 py-4">
                                <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.vendorName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.ssoId}</div>
                              </td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.subInventoryTypeName}</td>
                              <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.vehicleNumber || 'N/A'}</td>
                              <td className="px-4 py-4">
                                <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, background: statusStyle.bg, color: statusStyle.color }}>
                                  {row.requestStatus || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                {requestStatus === 'PENDING' ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setActionDialog({ target: 'release-inventory', mode: 'approve', row })}
                                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium text-white"
                                      style={{ background: '#1A7A6E', fontSize: 12 }}
                                    >
                                      <Check size={14} />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setActionDialog({ target: 'release-inventory', mode: 'reject', row })}
                                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 font-medium text-white"
                                      style={{ background: '#B83232', fontSize: 12 }}
                                    >
                                      <X size={14} />
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completed</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      : null}
                  </tbody>
                </table>
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

      {selectedVendorRequest ? (
        <ModalFrame
          title="Vendor Request Details"
          subtitle={`${selectedVendorRequest.vendorName} | ${selectedVendorRequest.ssoId}`}
          onClose={() => setSelectedVendorRequest(null)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Vendor Name', selectedVendorRequest.vendorName],
              ['SSO ID', selectedVendorRequest.ssoId],
              ['Company Name', selectedVendorRequest.companyName],
              ['Registration No.', selectedVendorRequest.registrationNo],
              ['Vendor Type', selectedVendorRequest.vendorTypeName],
              ['Email', selectedVendorRequest.email],
              ['Mobile', selectedVendorRequest.mobile],
              ['Request Status', selectedVendorRequest.requestStatus || 'PENDING'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
                <div className="mt-1" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4" style={{ border: '1px solid var(--sand)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Office Address</div>
            <div className="mt-1" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{selectedVendorRequest.companyAddress || 'N/A'}</div>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4" style={{ border: '1px solid var(--sand)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Company Information</div>
            <div className="mt-1" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{selectedVendorRequest.companyInfo || 'N/A'}</div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              onClick={() => setActionDialog({ target: 'vendor-request', mode: 'reject', row: selectedVendorRequest })}
              className="rounded-xl px-5 py-2.5 font-medium text-white"
              style={{ background: '#B83232', fontSize: 13 }}
            >
              Reject
            </button>
            <button
              onClick={() => setActionDialog({ target: 'vendor-request', mode: 'approve', row: selectedVendorRequest })}
              className="rounded-xl px-5 py-2.5 font-medium text-white"
              style={{ background: '#1A7A6E', fontSize: 13 }}
            >
              Approve
            </button>
          </div>
        </ModalFrame>
      ) : null}

      {selectedVendorListing ? (
        <ModalFrame
          title="Vendor Details"
          subtitle={`${selectedVendorListing.vendorName} | ${selectedVendorListing.ssoId}`}
          onClose={() => setSelectedVendorListing(null)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Vendor Name', selectedVendorListing.vendorName],
              ['Vendor Type', selectedVendorListing.vendorTypeName],
              ['Company Name', selectedVendorListing.companyName],
              ['Registration No.', selectedVendorListing.registrationNo],
              ['Email', selectedVendorListing.email],
              ['Mobile', selectedVendorListing.mobile],
              ['Status', selectedVendorListing.active ? 'Active' : 'Inactive'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
                <div className="mt-1" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4" style={{ border: '1px solid var(--sand)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Office Address</div>
            <div className="mt-1" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{selectedVendorListing.companyAddress || 'N/A'}</div>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4" style={{ border: '1px solid var(--sand)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Company Information</div>
            <div className="mt-1" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{selectedVendorListing.companyInfo || 'N/A'}</div>
          </div>
        </ModalFrame>
      ) : null}

      {actionDialog ? (
        <ModalFrame
          title={actionDialog.mode === 'approve' ? 'Approve Request' : 'Reject Request'}
          subtitle={mainTab === 'inventory-request' ? 'Inventory management action' : 'Vendor management action'}
          onClose={() => {
            setActionDialog(null)
            setActionReason('')
            setActionError('')
          }}
        >
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid var(--sand)' }}>
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ background: actionDialog.mode === 'approve' ? 'rgba(26,122,110,0.10)' : 'rgba(229,62,62,0.10)', color: actionDialog.mode === 'approve' ? '#1A7A6E' : '#B83232' }}>
              {actionDialog.mode === 'approve' ? <CircleCheckBig size={22} /> : <AlertCircle size={22} />}
            </div>
            <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>
              {actionDialog.mode === 'approve' ? 'Confirm approval?' : 'Confirm rejection?'}
            </div>
            <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {actionDialog.mode === 'approve'
                ? 'This action will approve the selected request and refresh the live vendor management queue.'
                : 'This action will reject the selected request. Please provide a reason below.'}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ background: 'var(--cream)', border: '1px solid var(--sand)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Name</div>
                <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>
                  {'vendorName' in actionDialog.row ? actionDialog.row.vendorName : 'N/A'}
                </div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--cream)', border: '1px solid var(--sand)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identifier</div>
                <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>
                  {actionDialog.row.ssoId}
                </div>
              </div>
            </div>

            {actionDialog.mode === 'reject' ? (
              <div className="mt-4">
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reason for Rejection
                </label>
                <textarea
                  value={actionReason}
                  onChange={event => setActionReason(event.target.value)}
                  rows={4}
                  placeholder="Write here..."
                  className="w-full resize-none rounded-[22px] px-4 py-3 outline-none"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, lineHeight: 1.6 }}
                />
              </div>
            ) : null}

            {actionError ? <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{actionError}</div> : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setActionDialog(null)
                  setActionReason('')
                  setActionError('')
                }}
                className="rounded-xl px-5 py-2.5 font-medium"
                style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={submittingAction}
                className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
                style={{ background: actionDialog.mode === 'approve' ? 'linear-gradient(135deg, #1A7A6E 0%, #2A9D8F 100%)' : 'linear-gradient(135deg, #9F1F1F 0%, #6B1212 100%)', fontSize: 14 }}
              >
                {submittingAction ? 'Please wait...' : actionDialog.mode === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {createOpen ? (
        <ModalFrame
          title="Create Vendor"
          subtitle="Verify the SSO user and register the vendor in the current system"
          onClose={() => {
            setCreateOpen(false)
            setCreateForm(DEFAULT_CREATE_FORM)
            setCreateErrors({})
            setVerificationStatus(null)
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl bg-white p-4" style={{ border: '1px solid var(--sand)' }}>
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SSO ID
              </label>
              <div className="flex gap-3">
                <input
                  value={createForm.ssoId}
                  onChange={event => setCreateForm(current => ({ ...current, ssoId: event.target.value, verifiedUserId: '' }))}
                  placeholder="Enter SSO ID"
                  className="flex-1 rounded-2xl px-4 py-3 outline-none"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                />
                <button
                  onClick={handleVerifySSO}
                  disabled={verifyingSSO}
                  className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}
                >
                  {verifyingSSO ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              {createErrors.ssoId ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{createErrors.ssoId}</div> : null}
              {verificationStatus ? (
                <div className="mt-3 rounded-2xl px-4 py-3" style={{ background: verificationStatus.type === 'success' ? 'rgba(26,122,110,0.08)' : 'rgba(139,26,26,0.08)', color: verificationStatus.type === 'success' ? '#1A7A6E' : 'var(--maroon)', fontSize: 13 }}>
                  {verificationStatus.message}
                </div>
              ) : null}
            </div>

            {[
              ['userName', 'Vendor Name', 'Enter vendor name'],
              ['email', 'Email ID', 'Enter email'],
              ['mobile', 'Mobile Number', 'Enter mobile number'],
              ['companyName', 'Company Name', 'Enter company name'],
              ['companyRegistrationNo', 'Company Registration No.', 'Enter company registration number'],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                <input
                  value={createForm[key as keyof CreateVendorForm] as string}
                  onChange={event => setCreateForm(current => ({ ...current, [key]: event.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-2xl px-4 py-3 outline-none"
                  style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                />
                {createErrors[key as keyof CreateVendorForm] ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{createErrors[key as keyof CreateVendorForm]}</div> : null}
              </div>
            ))}

            <div className="md:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vendor Type</label>
              <select
                value={createForm.vendorTypeId}
                onChange={event => setCreateForm(current => ({ ...current, vendorTypeId: event.target.value }))}
                className="w-full rounded-2xl px-4 py-3 outline-none"
                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
              >
                <option value="">{vendorTypesLoading ? 'Loading vendor types...' : 'Select vendor type'}</option>
                {vendorTypeOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
              {createErrors.vendorTypeId ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{createErrors.vendorTypeId}</div> : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Office Address</label>
              <textarea
                value={createForm.officeAddress}
                onChange={event => setCreateForm(current => ({ ...current, officeAddress: event.target.value }))}
                rows={3}
                placeholder="Enter office address"
                className="w-full resize-none rounded-[22px] px-4 py-3 outline-none"
                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 14, lineHeight: 1.6 }}
              />
              {createErrors.officeAddress ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{createErrors.officeAddress}</div> : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Information</label>
              <textarea
                value={createForm.companyInfo}
                onChange={event => setCreateForm(current => ({ ...current, companyInfo: event.target.value }))}
                rows={4}
                placeholder="Enter company information"
                className="w-full resize-none rounded-[22px] px-4 py-3 outline-none"
                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 14, lineHeight: 1.6 }}
              />
              {createErrors.companyInfo ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{createErrors.companyInfo}</div> : null}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setCreateOpen(false)
                setCreateForm(DEFAULT_CREATE_FORM)
                setCreateErrors({})
                setVerificationStatus(null)
              }}
              className="rounded-xl px-5 py-2.5 font-medium"
              style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateVendor}
              disabled={createSubmitting}
              className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
            >
              {createSubmitting ? 'Creating...' : 'Create Vendor'}
            </button>
          </div>
        </ModalFrame>
      ) : null}
    </AdminShellLayout>
  )
}
