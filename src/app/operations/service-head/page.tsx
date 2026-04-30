'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import {
  BadgeIndianRupee,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers3,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'

type HeadItem = {
  id: string
  name: string
  emitraId: string
  active: boolean
  displayOnDashboard: boolean
}

type ServiceHeadRef = {
  id?: string
  name?: string
  emitraId?: string
}

type ServiceItem = {
  id: string
  name: string
  serviceId: string
  merchantCode: string
  subServiceId: string
  officeCode: string
  commonType: string
  checksumKey: string
  encryptionKey: string
  refundKey: string
  headCount: number
  headDtos: ServiceHeadRef[]
}

type HeadFormState = {
  id: string | null
  name: string
  emitraId: string
  displayOnDashboard: boolean
}

type ServiceFormState = {
  id: string | null
  name: string
  serviceId: string
  merchantCode: string
  officeCode: string
  commonType: string
  subServiceId: string
  checksumKey: string
  encryptionKey: string
  refundKey: string
  headIds: string[]
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const DEFAULT_HEAD_FORM: HeadFormState = {
  id: null,
  name: '',
  emitraId: '',
  displayOnDashboard: false,
}

const DEFAULT_SERVICE_FORM: ServiceFormState = {
  id: null,
  name: '',
  serviceId: '',
  merchantCode: '',
  officeCode: '',
  commonType: '',
  subServiceId: '',
  checksumKey: '',
  encryptionKey: '',
  refundKey: '',
  headIds: [],
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }

  return fallback
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

function extractHeads(payload: unknown): HeadItem[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray(result.headDtos) ? result.headDtos : []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: String(row.id ?? ''),
        name: typeof row.name === 'string' ? row.name : '',
        emitraId: typeof row.emitraId === 'string' ? row.emitraId : '',
        active: Boolean(row.active),
        displayOnDashboard: Boolean(row.displayOnDashboard),
      }
    })
}

function extractServices(payload: unknown): ServiceItem[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray(result.utilityServiceDetail)
    ? result.utilityServiceDetail
    : result && typeof result === 'object' && (
        'id' in result ||
        'serviceId' in result ||
        'merchantCode' in result ||
        'officeCode' in result
      )
    ? [result]
    : []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      const headDtos = Array.isArray(row.headDtos) ? row.headDtos : []

      return {
        id: String(row.id ?? ''),
        name: typeof row.name === 'string' ? row.name : '',
        serviceId: typeof row.serviceId === 'string' ? row.serviceId : '',
        merchantCode: typeof row.merchantCode === 'string' ? row.merchantCode : '',
        subServiceId: typeof row.subServiceId === 'string' ? row.subServiceId : '',
        officeCode: typeof row.officeCode === 'string' ? row.officeCode : '',
        commonType: typeof row.commonType === 'string' ? row.commonType : '',
        checksumKey: typeof row.checksumKey === 'string' ? row.checksumKey : '',
        encryptionKey: typeof row.encryptionKey === 'string' ? row.encryptionKey : '',
        refundKey: typeof row.refundKey === 'string' ? row.refundKey : '',
        headCount: typeof row.headCount === 'number' ? row.headCount : headDtos.length,
        headDtos: headDtos
          .filter(head => head && typeof head === 'object')
          .map(head => {
            const headRow = head as Record<string, unknown>
            return {
              id: typeof headRow.id === 'string' ? headRow.id : String(headRow.id ?? ''),
              name: typeof headRow.name === 'string' ? headRow.name : '',
              emitraId: typeof headRow.emitraId === 'string' ? headRow.emitraId : '',
            }
          }),
      }
    })
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
    pages.add(i)
  }
  if (totalPages > 1) pages.add(totalPages)
  return Array.from(pages).sort((a, b) => a - b)
}

function statusChipStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
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

function HeadDialog({
  open,
  form,
  error,
  loading,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean
  form: HeadFormState
  error: string
  loading: boolean
  onChange: (value: HeadFormState) => void
  onClose: () => void
  onSave: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(28,16,8,0.50)', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-xl overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #942626 52%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>{form.id ? 'Update Head' : 'Add Head'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>Create or update financial heads used by services</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 px-7 py-7">
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Head Name</label>
            <input value={form.name} onChange={event => onChange({ ...form, name: event.target.value })} placeholder="Enter Head Name" className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
          </div>
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>E-Mitra ID</label>
            <input value={form.emitraId} onChange={event => onChange({ ...form, emitraId: event.target.value })} placeholder="Enter E-Mitra ID" className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
          </div>
          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
            <input type="checkbox" checked={form.displayOnDashboard} onChange={event => onChange({ ...form, displayOnDashboard: event.target.checked })} />
            <span style={{ fontSize: 13, color: 'var(--text-dark)' }}>Display on Dashboard</span>
          </label>
          {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-7 py-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={onSave} disabled={loading} className="rounded-xl px-8 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{loading ? 'Saving...' : form.id ? 'Update Head' : 'Add Head'}</button>
        </div>
      </div>
    </div>
  )
}

function ServiceDialog({
  open,
  form,
  error,
  loading,
  headOptions,
  headSearch,
  onHeadSearchChange,
  onToggleHead,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean
  form: ServiceFormState
  error: string
  loading: boolean
  headOptions: HeadItem[]
  headSearch: string
  onHeadSearchChange: (value: string) => void
  onToggleHead: (headId: string) => void
  onChange: (value: ServiceFormState) => void
  onClose: () => void
  onSave: () => void
}) {
  if (!open) return null

  const inputFields: Array<[string, keyof ServiceFormState, string]> = [
    ['Service Name', 'name', 'Enter Service Name'],
    ['Service ID', 'serviceId', 'Enter Service ID'],
    ['Merchant Code', 'merchantCode', 'Enter Merchant Code'],
    ['Office Code', 'officeCode', 'Enter Office Code'],
    ['Common Type', 'commonType', 'Enter Common Type'],
    ['Sub Service', 'subServiceId', 'Enter Sub Service'],
    ['Checksum Key', 'checksumKey', 'Enter Checksum Key'],
    ['Encryption Key', 'encryptionKey', 'Enter Encryption Key'],
    ['Refund Key', 'refundKey', 'Enter Refund Key'],
  ]

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 py-6 sm:py-8" style={{ background: 'rgba(28,16,8,0.52)', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)', maxHeight: 'min(92vh, 920px)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #942626 52%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>{form.id ? 'Update Service' : 'Add Service'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>Configure service credentials, identifiers, and mapped heads</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-7">
          <div className="grid gap-5 lg:grid-cols-2">
          {inputFields.map(([label, key, placeholder]) => (
            <div key={key} className={key === 'refundKey' ? 'lg:col-span-2' : ''}>
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
              <input
                value={form[key] as string}
                onChange={event => onChange({ ...form, [key]: event.target.value })}
                placeholder={placeholder}
                className="w-full rounded-2xl px-4 py-3 outline-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
              />
            </div>
          ))}

          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Heads</label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.headIds.length} selected</span>
            </div>
            <div className="rounded-[24px] p-4" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input value={headSearch} onChange={event => onHeadSearchChange(event.target.value)} placeholder="Search head name or E-Mitra ID" className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }} />
              </div>
              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {headOptions.map(head => (
                  <label key={head.id} className="flex items-start gap-3 rounded-2xl px-3 py-3" style={{ background: '#fff', border: '1px solid var(--cream-dark)' }}>
                    <input type="checkbox" checked={form.headIds.includes(head.id)} onChange={() => onToggleHead(head.id)} />
                    <span>
                      <span className="block" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{head.name || 'Unnamed Head'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{head.emitraId || 'No E-Mitra ID'}</span>
                    </span>
                  </label>
                ))}
                {headOptions.length === 0 ? <div className="rounded-2xl px-4 py-5 text-center md:col-span-2" style={{ background: '#fff', color: 'var(--text-muted)', fontSize: 13 }}>No heads match the current search.</div> : null}
              </div>
            </div>
          </div>

          {error ? <div className="lg:col-span-2 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-7 py-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={onSave} disabled={loading} className="rounded-xl px-8 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{loading ? 'Saving...' : form.id ? 'Update Service' : 'Add Service'}</button>
        </div>
      </div>
    </div>
  )
}

function ServiceViewDialog({
  open,
  service,
  onClose,
}: {
  open: boolean
  service: ServiceItem | null
  onClose: () => void
}) {
  if (!open || !service) return null

  const rows: Array<[string, string]> = [
    ['Service ID', service.serviceId],
    ['Merchant Code', service.merchantCode],
    ['Office Code', service.officeCode],
    ['Common Type', service.commonType],
    ['Sub Service', service.subServiceId],
    ['Checksum Key', service.checksumKey],
    ['Encryption Key', service.encryptionKey],
    ['Refund Key', service.refundKey || 'N/A'],
  ]

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(28,16,8,0.52)', zIndex: 1000 }}>
      <div className="w-full max-w-3xl overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #942626 52%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>Service Details</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>{service.name}</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-7 py-7 md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-2xl px-4 py-4" style={{ background: '#F8F4EE', border: '1px solid var(--cream-dark)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{label}</div>
              <div className="mt-1 break-all" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
          <div className="rounded-2xl px-4 py-4 md:col-span-2" style={{ background: '#F8F4EE', border: '1px solid var(--cream-dark)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Mapped Heads</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {service.headDtos.length > 0
                ? service.headDtos.map(head => (
                    <span key={head.id ?? head.name} className="rounded-full px-3 py-1" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>
                      {head.name} {head.emitraId ? `(${head.emitraId})` : ''}
                    </span>
                  ))
                : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No heads mapped.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmStatusDialog({
  item,
  loading,
  onClose,
  onConfirm,
}: {
  item: HeadItem | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!item) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(28,16,8,0.46)', zIndex: 1000 }}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-7" style={{ boxShadow: '0 30px 80px rgba(107,18,18,0.22)' }}>
        <div className="mb-3 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{item.active ? 'Deactivate head?' : 'Activate head?'}</div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>This will {item.active ? 'deactivate' : 'activate'} the selected head.</p>
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', fontSize: 13, color: 'var(--text-dark)' }}>{item.name} {item.emitraId ? `(${item.emitraId})` : ''}</div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{loading ? 'Please wait...' : item.active ? 'Deactivate' : 'Activate'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ServiceHeadManagementPage() {
  const [activeTab, setActiveTab] = useState<'services' | 'heads'>('services')
  const [serviceSearch, setServiceSearch] = useState('')
  const [headSearch, setHeadSearch] = useState('')
  const deferredServiceSearch = useDeferredValue(serviceSearch)
  const deferredHeadSearch = useDeferredValue(headSearch)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [heads, setHeads] = useState<HeadItem[]>([])
  const [serviceTotal, setServiceTotal] = useState(0)
  const [headTotal, setHeadTotal] = useState(0)
  const [servicePage, setServicePage] = useState(1)
  const [headPage, setHeadPage] = useState(1)
  const [servicePageSize, setServicePageSize] = useState(10)
  const [headPageSize, setHeadPageSize] = useState(10)
  const [headOptions, setHeadOptions] = useState<HeadItem[]>([])
  const [headOptionSearch, setHeadOptionSearch] = useState('')
  const deferredHeadOptionSearch = useDeferredValue(headOptionSearch)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [headDialogOpen, setHeadDialogOpen] = useState(false)
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [serviceViewOpen, setServiceViewOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedHeadForStatus, setSelectedHeadForStatus] = useState<HeadItem | null>(null)
  const [headForm, setHeadForm] = useState<HeadFormState>(DEFAULT_HEAD_FORM)
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(DEFAULT_SERVICE_FORM)
  const [headFormError, setHeadFormError] = useState('')
  const [serviceFormError, setServiceFormError] = useState('')

  async function loadHeadsList() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        offSet: String(headPage - 1),
        size: String(headPageSize),
        searchKey: deferredHeadSearch.trim(),
      })
      const response = await fetch(`/api/system/head?${params.toString()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch heads.'))
      setHeads(extractHeads(payload))
      setHeadTotal(extractTotalRecords(payload))
      setPageError('')
    } catch (error) {
      setHeads([])
      setHeadTotal(0)
      setPageError(error instanceof Error ? error.message : 'Unable to fetch heads.')
    } finally {
      setLoading(false)
    }
  }

  async function loadServicesList() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        offSet: String(servicePage - 1),
        size: String(servicePageSize),
        searchKey: deferredServiceSearch.trim(),
      })
      const response = await fetch(`/api/system/utility-service?${params.toString()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch services.'))
      setServices(extractServices(payload))
      setServiceTotal(extractTotalRecords(payload))
      setPageError('')
    } catch (error) {
      setServices([])
      setServiceTotal(0)
      setPageError(error instanceof Error ? error.message : 'Unable to fetch services.')
    } finally {
      setLoading(false)
    }
  }

  async function loadHeadOptions() {
    try {
      const params = new URLSearchParams({
        offSet: '0',
        size: '50',
        searchKey: deferredHeadOptionSearch.trim(),
      })
      const response = await fetch(`/api/system/head?${params.toString()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch head options.'))
      setHeadOptions(extractHeads(payload))
    } catch {
      setHeadOptions([])
    }
  }

  useEffect(() => {
    if (activeTab === 'services') {
      loadServicesList()
    }
  }, [activeTab, servicePage, servicePageSize, deferredServiceSearch])

  useEffect(() => {
    if (activeTab === 'heads') {
      loadHeadsList()
    }
  }, [activeTab, headPage, headPageSize, deferredHeadSearch])

  useEffect(() => {
    if (serviceDialogOpen) {
      loadHeadOptions()
    }
  }, [serviceDialogOpen, deferredHeadOptionSearch])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    setServicePage(1)
  }, [deferredServiceSearch])

  useEffect(() => {
    setHeadPage(1)
  }, [deferredHeadSearch])

  const dashboardHeadCount = useMemo(() => heads.filter(item => item.displayOnDashboard).length, [heads])
  const activeHeadCount = useMemo(() => heads.filter(item => item.active).length, [heads])

  async function saveHead() {
    if (!headForm.name.trim()) {
      setHeadFormError('Head name is required.')
      return
    }
    if (!headForm.emitraId.trim()) {
      setHeadFormError('E-Mitra ID is required.')
      return
    }

    setSaving(true)
    setHeadFormError('')

    try {
      const response = await fetch('/api/system/head', {
        method: headForm.id ? 'PUT' : 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(headForm.id ? { id: headForm.id } : {}),
          name: headForm.name.trim(),
          emitraId: headForm.emitraId.trim(),
          displayOnDashboard: headForm.displayOnDashboard,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save head.'))

      setSuccessMessage(extractMessage(payload, headForm.id ? 'Head updated successfully.' : 'Head created successfully.'))
      setHeadDialogOpen(false)
      setHeadForm(DEFAULT_HEAD_FORM)
      if (activeTab === 'heads') await loadHeadsList()
    } catch (error) {
      setHeadFormError(error instanceof Error ? error.message : 'Unable to save head.')
    } finally {
      setSaving(false)
    }
  }

  async function saveService() {
    const requiredFields: Array<[keyof ServiceFormState, string]> = [
      ['name', 'Service name is required.'],
      ['serviceId', 'Service ID is required.'],
      ['merchantCode', 'Merchant code is required.'],
      ['officeCode', 'Office code is required.'],
      ['commonType', 'Common type is required.'],
      ['subServiceId', 'Sub service is required.'],
      ['checksumKey', 'Checksum key is required.'],
      ['encryptionKey', 'Encryption key is required.'],
    ]

    for (const [key, message] of requiredFields) {
      if (!(serviceForm[key] as string).trim()) {
        setServiceFormError(message)
        return
      }
    }

    if (serviceForm.headIds.length === 0) {
      setServiceFormError('Please select at least one head.')
      return
    }

    setSaving(true)
    setServiceFormError('')

    try {
      const response = await fetch('/api/system/utility-service', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(serviceForm.id ? { id: serviceForm.id } : {}),
          name: serviceForm.name.trim(),
          serviceId: serviceForm.serviceId.trim(),
          merchantCode: serviceForm.merchantCode.trim(),
          officeCode: serviceForm.officeCode.trim(),
          commonType: serviceForm.commonType.trim(),
          subServiceId: serviceForm.subServiceId.trim(),
          checksumKey: serviceForm.checksumKey.trim(),
          encryptionKey: serviceForm.encryptionKey.trim(),
          refundKey: serviceForm.refundKey.trim(),
          headIds: serviceForm.headIds,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save service.'))

      setSuccessMessage(extractMessage(payload, serviceForm.id ? 'Service updated successfully.' : 'Service created successfully.'))
      setServiceDialogOpen(false)
      setServiceForm(DEFAULT_SERVICE_FORM)
      setHeadOptionSearch('')
      if (activeTab === 'services') await loadServicesList()
    } catch (error) {
      setServiceFormError(error instanceof Error ? error.message : 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  async function openEditService(serviceId: string) {
    setSaving(true)
    setServiceFormError('')

    try {
      const response = await fetch(`/api/system/utility-service?id=${encodeURIComponent(serviceId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to load service details.'))

      const item = extractServices(payload)[0]
      if (!item) throw new Error('Service details were not found.')

      setServiceForm({
        id: item.id,
        name: item.name,
        serviceId: item.serviceId,
        merchantCode: item.merchantCode,
        officeCode: item.officeCode,
        commonType: item.commonType,
        subServiceId: item.subServiceId,
        checksumKey: item.checksumKey,
        encryptionKey: item.encryptionKey,
        refundKey: item.refundKey,
        headIds: item.headDtos.map(head => String(head.id ?? '')).filter(Boolean),
      })
      setServiceDialogOpen(true)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load service details.')
    } finally {
      setSaving(false)
    }
  }

  async function openViewService(serviceId: string) {
    setSaving(true)
    try {
      const response = await fetch(`/api/system/utility-service?id=${encodeURIComponent(serviceId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to load service details.'))

      const item = extractServices(payload)[0]
      if (!item) throw new Error('Service details were not found.')

      setSelectedService(item)
      setServiceViewOpen(true)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load service details.')
    } finally {
      setSaving(false)
    }
  }

  async function updateHeadStatus() {
    if (!selectedHeadForStatus) return

    setSaving(true)
    try {
      const nextActive = !selectedHeadForStatus.active
      const response = await fetch(`/api/system/head/status?headId=${encodeURIComponent(selectedHeadForStatus.id)}&isActive=${encodeURIComponent(String(nextActive))}`, { method: 'PUT', headers: { Accept: 'application/json' } })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to update head status.'))

      setSuccessMessage(extractMessage(payload, nextActive ? 'Head activated successfully.' : 'Head deactivated successfully.'))
      setSelectedHeadForStatus(null)
      if (activeTab === 'heads') await loadHeadsList()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to update head status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShellLayout>
      <div className="min-h-full px-6 py-6 lg:px-8">
        <SectionHeader title="Operations / Service & Head Management" right={<div className="hidden md:flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}><ShieldCheck size={13} style={{ color: 'var(--teal)' }} />Recreated from the old admin flow in the current theme</div>} />

        <div className="mb-6 overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 45%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}>
          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, color: '#fff' }}><Layers3 size={12} />Service / Head Management</div>
              <h1 className="font-serif" style={{ fontSize: 32, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>Service and Heads</h1>
            </div>
            <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
              {activeTab === 'services' ? (
                <button onClick={() => { setServiceForm(DEFAULT_SERVICE_FORM); setServiceFormError(''); setHeadOptionSearch(''); setServiceDialogOpen(true) }} className="rounded-2xl px-4 py-3 font-semibold" style={{ background: '#fff', color: 'var(--maroon)', fontSize: 13 }}>
                  <span className="inline-flex items-center gap-2"><Plus size={15} />Create Service</span>
                </button>
              ) : (
                <button onClick={() => { setHeadForm(DEFAULT_HEAD_FORM); setHeadFormError(''); setHeadDialogOpen(true) }} className="rounded-2xl px-4 py-3 font-semibold" style={{ background: '#fff', color: 'var(--maroon)', fontSize: 13 }}>
                  <span className="inline-flex items-center gap-2"><Plus size={15} />Add Head</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-px sm:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
            {[
              { label: 'Services', value: serviceTotal.toString(), icon: <BadgeIndianRupee size={15} /> },
              { label: 'Heads', value: headTotal.toString(), icon: <Layers3 size={15} /> },
              { label: 'Active Heads', value: activeHeadCount.toString(), icon: <CheckCircle2 size={15} /> },
              { label: 'Dashboard Heads', value: dashboardHeadCount.toString(), icon: <ShieldCheck size={15} /> },
            ].map(card => (
              <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2" style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.icon}{card.label}</div>
                <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        {successMessage ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
        {pageError ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{pageError}</div> : null}

        <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'services', label: 'Services' },
                { id: 'heads', label: 'Heads' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as 'services' | 'heads')} className="rounded-full px-4 py-2 font-medium" style={{ background: activeTab === tab.id ? 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' : '#F8F4EE', color: activeTab === tab.id ? '#fff' : 'var(--text-mid)', border: activeTab === tab.id ? 'none' : '1px solid var(--sand)', fontSize: 13 }}>{tab.label}</button>
              ))}
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input value={activeTab === 'services' ? serviceSearch : headSearch} onChange={event => activeTab === 'services' ? setServiceSearch(event.target.value) : setHeadSearch(event.target.value)} placeholder={activeTab === 'services' ? 'Search with name or service ID' : 'Search with name or E-Mitra ID'} className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-80" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <RajasthanLoader label={`Loading ${activeTab}...`} />
            </div>
          ) : activeTab === 'services' ? (
            services.length === 0 ? (
              <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
                <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>Service Management</div>
                <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{serviceSearch.trim() ? 'No records match the current search.' : 'No service has been added yet.'}</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead style={{ background: 'linear-gradient(180deg, #FBF6EF 0%, #F4EBDF 100%)' }}>
                        <tr>
                          {['Name', 'Service ID', 'Merchant Code', 'Sub Service', 'Office Code', 'Common Type', 'Heads', 'Actions'].map(label => (
                            <th key={label} className="px-4 py-4 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((item, index) => (
                          <tr key={item.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{item.name || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.serviceId || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.merchantCode || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.subServiceId || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.officeCode || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.commonType || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)' }}><span className="rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.14)', color: '#9A6700', fontSize: 11, fontWeight: 700 }}>{item.headCount}</span></td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => openEditService(item.id)} className="rounded-xl px-3 py-2 font-medium" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}><span className="inline-flex items-center gap-1.5"><Pencil size={13} />Edit</span></button>
                                <button onClick={() => openViewService(item.id)} className="rounded-xl px-3 py-2 font-medium" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 12 }}><span className="inline-flex items-center gap-1.5"><Eye size={13} />View</span></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Pager page={servicePage} pageSize={servicePageSize} totalRecords={serviceTotal} onPageChange={setServicePage} onPageSizeChange={size => { setServicePageSize(size); setServicePage(1) }} />
              </>
            )
          ) : heads.length === 0 ? (
            <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
              <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>Head Management</div>
              <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{headSearch.trim() ? 'No records match the current search.' : 'No head has been added yet.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--cream-dark)' }}>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead style={{ background: 'linear-gradient(180deg, #FBF6EF 0%, #F4EBDF 100%)' }}>
                      <tr>
                        {['Head Name', 'E-Mitra ID', 'Status', 'Dashboard', 'Actions'].map(label => (
                          <th key={label} className="px-4 py-4 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heads.map((item, index) => (
                        <tr key={item.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{item.name || 'N/A'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.emitraId || 'N/A'}</td>
                          <td className="px-4 py-4"><span className="rounded-full px-3 py-1" style={{ ...statusChipStyle(item.active), fontSize: 11, fontWeight: 700 }}>{item.active ? 'Active' : 'Inactive'}</span></td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: item.displayOnDashboard ? '#1A7A6E' : 'var(--text-muted)', fontWeight: 500 }}>{item.displayOnDashboard ? 'Visible' : 'Hidden'}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => { setHeadForm({ id: item.id, name: item.name, emitraId: item.emitraId, displayOnDashboard: item.displayOnDashboard }); setHeadFormError(''); setHeadDialogOpen(true) }} className="rounded-xl px-3 py-2 font-medium" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}><span className="inline-flex items-center gap-1.5"><Pencil size={13} />Edit</span></button>
                              <button onClick={() => setSelectedHeadForStatus(item)} className="rounded-xl px-3 py-2 font-medium" style={{ background: item.active ? 'rgba(139,26,26,0.08)' : 'rgba(26,122,110,0.10)', color: item.active ? 'var(--maroon)' : '#1A7A6E', fontSize: 12 }}>{item.active ? 'Deactivate' : 'Activate'}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pager page={headPage} pageSize={headPageSize} totalRecords={headTotal} onPageChange={setHeadPage} onPageSizeChange={size => { setHeadPageSize(size); setHeadPage(1) }} />
            </>
          )}
        </div>
      </div>

      <HeadDialog open={headDialogOpen} form={headForm} error={headFormError} loading={saving} onChange={setHeadForm} onClose={() => { setHeadDialogOpen(false); setHeadForm(DEFAULT_HEAD_FORM); setHeadFormError('') }} onSave={saveHead} />
      <ServiceDialog open={serviceDialogOpen} form={serviceForm} error={serviceFormError} loading={saving} headOptions={headOptions} headSearch={headOptionSearch} onHeadSearchChange={setHeadOptionSearch} onToggleHead={headId => setServiceForm(current => ({ ...current, headIds: current.headIds.includes(headId) ? current.headIds.filter(id => id !== headId) : [...current.headIds, headId] }))} onChange={setServiceForm} onClose={() => { setServiceDialogOpen(false); setServiceForm(DEFAULT_SERVICE_FORM); setServiceFormError(''); setHeadOptionSearch('') }} onSave={saveService} />
      <ServiceViewDialog open={serviceViewOpen} service={selectedService} onClose={() => { setServiceViewOpen(false); setSelectedService(null) }} />
      <ConfirmStatusDialog item={selectedHeadForStatus} loading={saving} onClose={() => setSelectedHeadForStatus(null)} onConfirm={updateHeadStatus} />
    </AdminShellLayout>
  )
}
