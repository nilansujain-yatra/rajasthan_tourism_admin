'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { baseUrl } from '@/app/api/common.route'
import {
  BusFront,
  Clock3,
  ExternalLink,
  Layers3,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
} from 'lucide-react'

type MasterTab = 'zone' | 'shift' | 'inventory' | 'quota'

type ZoneItem = {
  id: string
  name: string
  address: string
  mapLink: string
  active: boolean
}

type ShiftItem = {
  id: string
  name: string
  startTime: number
  endTime: number
  active: boolean
}

type InventoryItem = {
  id: string
  inventoryTypeId: string
  inventoryTypeName: string
  subInventoryTypeId: string
  subInventoryTypeName: string
  active: boolean
}

type QuotaItem = {
  id: string
  inventoryQuotaId: string
  inventoryQuotaName: string
  duration: number
  tillDate: boolean
  active: boolean
}

type Option = {
  id: string
  name: string
}

type ZoneDraft = {
  id: string | null
  name: string
  address: string
  mapLink: string
}

type ShiftDraft = {
  id: string | null
  name: string
  startTime: string
  endTime: string
}

type InventoryDraft = {
  id: string | null
  inventoryTypeId: string
  subInventoryTypeId: string
}

type QuotaDraft = {
  id: string | null
  inventoryQuotaId: string
}

type ActionState = {
  kind: MasterTab
  id: string
  label: string
  active: boolean
} | null

type DeleteState = {
  kind: MasterTab
  id: string
  label: string
} | null

const DEFAULT_ZONE_DRAFT: ZoneDraft = {
  id: null,
  name: '',
  address: '',
  mapLink: '',
}

const DEFAULT_SHIFT_DRAFT: ShiftDraft = {
  id: null,
  name: '',
  startTime: '',
  endTime: '',
}

const DEFAULT_INVENTORY_DRAFT: InventoryDraft = {
  id: null,
  inventoryTypeId: '',
  subInventoryTypeId: '',
}

const DEFAULT_QUOTA_DRAFT: QuotaDraft = {
  id: null,
  inventoryQuotaId: '',
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function toBoolean(value: unknown) {
  return Boolean(value)
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }

  return fallback
}

function findArray(payload: unknown, keys: string[]): unknown[] {
  if (!payload || typeof payload !== 'object') return []

  const queue: unknown[] = [payload]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== 'object' || Array.isArray(current)) continue

    const row = current as Record<string, unknown>

    for (const key of keys) {
      if (Array.isArray(row[key])) {
        return row[key] as unknown[]
      }
    }

    Object.values(row).forEach(value => {
      if (value && typeof value === 'object') {
        queue.push(value)
      }
    })
  }

  return []
}

function extractZones(payload: unknown): ZoneItem[] {
  return findArray(payload, ['zones', 'zoneDto', 'zoneData'])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id ?? row.zoneId),
        name: toText(row.name ?? row.zoneName),
        address: toText(row.address),
        mapLink: toText(row.mapLink ?? row.addressUrl),
        active: toBoolean(row.active),
      }
    })
    .filter(item => item.id && item.name)
}

function extractShifts(payload: unknown): ShiftItem[] {
  return findArray(payload, ['shifts', 'shiftDto', 'shiftData'])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id ?? row.shiftId),
        name: toText(row.name ?? row.shiftName),
        startTime: toNumber(row.startTime),
        endTime: toNumber(row.endTime),
        active: toBoolean(row.active),
      }
    })
    .filter(item => item.id && item.name)
}

function extractInventories(payload: unknown): InventoryItem[] {
  return findArray(payload, ['inventory', 'inventoryDto', 'inventoryData'])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id ?? row.inventoryId),
        inventoryTypeId: toText(row.inventoryTypeId),
        inventoryTypeName: toText(row.inventoryTypeName),
        subInventoryTypeId: toText(row.subInventoryTypeId),
        subInventoryTypeName: toText(row.subInventoryTypeName),
        active: toBoolean(row.active),
      }
    })
    .filter(item => item.id && (item.inventoryTypeName || item.subInventoryTypeName))
}

function extractQuotas(payload: unknown): QuotaItem[] {
  return findArray(payload, ['inventoryQuotaDtos', 'quotaDto', 'quotaData', 'quotas'])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id ?? row.quotaId ?? row.inventoryQuotaId),
        inventoryQuotaId: toText(row.inventoryQuotaId ?? row.quotaId ?? row.id),
        inventoryQuotaName: toText(row.inventoryQuotaName ?? row.quotaName ?? row.name),
        duration: toNumber(row.duration),
        tillDate: toBoolean(row.tillDate),
        active: toBoolean(row.active),
      }
    })
    .filter(item => item.id && item.inventoryQuotaName)
}

function extractOptions(payload: unknown, keys: string[]): Option[] {
  return findArray(payload, keys)
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id ?? row.inventoryId ?? row.quotaId),
        name: toText(row.name ?? row.inventoryQuotaName ?? row.quotaName),
      }
    })
    .filter(item => item.id && item.name)
}

function formatTime(value: number) {
  if (!value) return 'N/A'

  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatTimeInput(value: number) {
  if (!value) return ''
  const date = new Date(value)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function timeInputToEpoch(value: string) {
  if (!value) return 0
  const [hours, minutes] = value.split(':').map(part => Number(part))
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date.getTime()
}

function statusStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function ModalFrame({
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className="w-full max-w-2xl rounded-[30px] bg-white p-6 shadow-2xl lg:p-7" style={{ boxShadow: '0 30px 80px rgba(107,18,18,0.24)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</h3>
            {subtitle ? <p className="mt-1" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1.5" style={{ background: '#F8F4EE', color: 'var(--text-muted)', fontSize: 12 }}>Close</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>
        {label}{required ? <span style={{ color: 'var(--maroon)' }}> *</span> : null}
      </div>
      {children}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl px-4 py-3 outline-none ${props.className ?? ''}`}
      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, ...(props.style ?? {}) }}
    />
  )
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl px-4 py-3 outline-none ${props.className ?? ''}`}
      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, ...(props.style ?? {}) }}
    />
  )
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl px-4 py-3 outline-none ${props.className ?? ''}`}
      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, minHeight: 96, ...(props.style ?? {}) }}
    />
  )
}

function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
      <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</div>
      <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{note}</p>
    </div>
  )
}

function ActionDialog({
  open,
  title,
  note,
  label,
  confirmLabel,
  loading,
  tone,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  note: string
  label: string
  confirmLabel: string
  loading: boolean
  tone: 'danger' | 'success'
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
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
            style={{ background: tone === 'danger' ? 'linear-gradient(135deg, #8B1A1A 0%, #C04E4E 100%)' : 'linear-gradient(135deg, #1A7A6E 0%, #58A99C 100%)', fontSize: 14 }}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function MasterCard({
  title,
  badge,
  status,
  children,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string
  badge?: string
  status: boolean
  children: ReactNode
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-[28px] border bg-white p-5 shadow-sm" style={{ borderColor: 'var(--cream-dark)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</div>
          {badge ? <div className="mt-2 inline-flex rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.14)', color: '#9A6700', fontSize: 11, fontWeight: 700 }}>{badge}</div> : null}
        </div>
        <span className="rounded-full px-3 py-1" style={{ ...statusStyle(status), fontSize: 11, fontWeight: 700 }}>{status ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="mt-4 space-y-2">{children}</div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={onEdit} className="rounded-xl px-3 py-2 font-medium" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}>
          <span className="inline-flex items-center gap-1.5"><Pencil size={13} />Edit</span>
        </button>
        <button onClick={onToggle} className="rounded-xl px-3 py-2 font-medium" style={{ background: status ? 'rgba(139,26,26,0.08)' : 'rgba(26,122,110,0.10)', color: status ? 'var(--maroon)' : '#1A7A6E', fontSize: 12 }}>
          <span className="inline-flex items-center gap-1.5"><Power size={13} />{status ? 'Deactivate' : 'Activate'}</span>
        </button>
        <button onClick={onDelete} className="rounded-xl px-3 py-2 font-medium" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 12 }}>
          <span className="inline-flex items-center gap-1.5"><Trash2 size={13} />Delete</span>
        </button>
      </div>
    </div>
  )
}

export default function PlaceMastersView({
  placeId,
  placeName,
}: {
  placeId: string
  placeName?: string
}) {
  const [activeTab, setActiveTab] = useState<MasterTab>('zone')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [zones, setZones] = useState<ZoneItem[]>([])
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [inventories, setInventories] = useState<InventoryItem[]>([])
  const [quotas, setQuotas] = useState<QuotaItem[]>([])

  const [inventoryTypes, setInventoryTypes] = useState<Option[]>([])
  const [subInventoryTypes, setSubInventoryTypes] = useState<Option[]>([])
  const [masterQuotaOptions, setMasterQuotaOptions] = useState<Option[]>([])

  const [zoneDialogOpen, setZoneDialogOpen] = useState(false)
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false)
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)

  const [zoneDraft, setZoneDraft] = useState<ZoneDraft>(DEFAULT_ZONE_DRAFT)
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft>(DEFAULT_SHIFT_DRAFT)
  const [inventoryDraft, setInventoryDraft] = useState<InventoryDraft>(DEFAULT_INVENTORY_DRAFT)
  const [quotaDraft, setQuotaDraft] = useState<QuotaDraft>(DEFAULT_QUOTA_DRAFT)

  const [actionState, setActionState] = useState<ActionState>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)

  async function fetchJson(url: string, fallback: string) {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractMessage(payload, fallback))
    return payload
  }

  async function loadSubInventoryOptions(inventoryTypeId: string) {
    if (!inventoryTypeId) {
      setSubInventoryTypes([])
      return
    }

    try {
      const payload = await fetchJson(`/api/sub-inventory?inventoryId=${encodeURIComponent(inventoryTypeId)}&name=&offSet=0&pagination=true&size=200&status=true&subInventoryId=`, 'Unable to fetch sub inventory options.')
      setSubInventoryTypes(extractOptions(payload, ['subInventoryTypeDtos', 'subInventoryTypeDto']))
    } catch {
      setSubInventoryTypes([])
    }
  }

  async function refreshData(showLoader = false) {
    if (!placeId) return

    if (showLoader) setLoading(true)

    try {
      setError('')

      const results = await Promise.allSettled([
        fetchJson(`/api/zone?placeId=${encodeURIComponent(placeId)}`, 'Unable to fetch zones.'),
        fetchJson(`/api/shift?placeId=${encodeURIComponent(placeId)}`, 'Unable to fetch shifts.'),
        fetchJson(`/api/inventory?placeId=${encodeURIComponent(placeId)}`, 'Unable to fetch inventories.'),
        fetchJson(`/api/quota?offSet=0&pagination=true&placeId=${encodeURIComponent(placeId)}&size=200&status=true`, 'Unable to fetch quotas.'),
        fetchJson('/api/inventory/type?offSet=0&name=&pagination=true&size=200&status=true', 'Unable to fetch inventory types.'),
        fetchJson('/api/master/inventory-quota?offSet=0&size=200&searchKey=&pagination=true&status=true', 'Unable to fetch quota options.'),
      ])

      const [zoneResult, shiftResult, inventoryResult, quotaResult, inventoryTypeResult, masterQuotaResult] = results

      if (zoneResult.status === 'fulfilled') setZones(extractZones(zoneResult.value))
      if (shiftResult.status === 'fulfilled') setShifts(extractShifts(shiftResult.value))
      if (inventoryResult.status === 'fulfilled') setInventories(extractInventories(inventoryResult.value))
      if (quotaResult.status === 'fulfilled') setQuotas(extractQuotas(quotaResult.value))
      if (inventoryTypeResult.status === 'fulfilled') setInventoryTypes(extractOptions(inventoryTypeResult.value, ['inventoryTypeDtos', 'inventoryTypeDto']))
      if (masterQuotaResult.status === 'fulfilled') setMasterQuotaOptions(extractOptions(masterQuotaResult.value, ['masterInventoryQuotaDtos', 'masterInventoryQuotaDto']))

      const firstRejected = results.find(result => result.status === 'rejected')
      if (firstRejected?.status === 'rejected') {
        setError(firstRejected.reason instanceof Error ? firstRejected.reason.message : 'Unable to load place masters.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshData(true)
  }, [placeId])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    if (!inventoryDialogOpen) return
    void loadSubInventoryOptions(inventoryDraft.inventoryTypeId)
  }, [inventoryDialogOpen, inventoryDraft.inventoryTypeId])

  const filteredZones = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return zones
    return zones.filter(item => item.name.toLowerCase().includes(query) || item.address.toLowerCase().includes(query))
  }, [search, zones])

  const filteredShifts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return shifts
    return shifts.filter(item => item.name.toLowerCase().includes(query))
  }, [search, shifts])

  const filteredInventories = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return inventories
    return inventories.filter(item =>
      item.inventoryTypeName.toLowerCase().includes(query) ||
      item.subInventoryTypeName.toLowerCase().includes(query),
    )
  }, [inventories, search])

  const filteredQuotas = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return quotas
    return quotas.filter(item => item.inventoryQuotaName.toLowerCase().includes(query))
  }, [quotas, search])

  async function saveZone() {
    if (!zoneDraft.name.trim()) {
      setError('Zone name is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${baseUrl}/zone`, {
        method: zoneDraft.id ? 'PUT' : 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(zoneDraft.id ? { id: zoneDraft.id } : {}),
          name: zoneDraft.name.trim(),
          address: zoneDraft.address.trim(),
          mapLink: zoneDraft.mapLink.trim(),
          placeId,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save zone.'))

      setSuccessMessage(extractMessage(payload, zoneDraft.id ? 'Zone updated successfully.' : 'Zone created successfully.'))
      setZoneDialogOpen(false)
      setZoneDraft(DEFAULT_ZONE_DRAFT)
      await refreshData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save zone.')
    } finally {
      setSaving(false)
    }
  }

  async function saveShift() {
    if (!shiftDraft.name.trim()) {
      setError('Shift name is required.')
      return
    }
    if (!shiftDraft.startTime || !shiftDraft.endTime) {
      setError('Start time and end time are required.')
      return
    }
    if (shiftDraft.startTime >= shiftDraft.endTime) {
      setError('Start time must be before end time.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${baseUrl}/shift`, {
        method: shiftDraft.id ? 'PUT' : 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(shiftDraft.id ? { id: shiftDraft.id } : {}),
          name: shiftDraft.name.trim(),
          startTime: timeInputToEpoch(shiftDraft.startTime),
          endTime: timeInputToEpoch(shiftDraft.endTime),
          placeId,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save shift.'))

      setSuccessMessage(extractMessage(payload, shiftDraft.id ? 'Shift updated successfully.' : 'Shift created successfully.'))
      setShiftDialogOpen(false)
      setShiftDraft(DEFAULT_SHIFT_DRAFT)
      await refreshData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save shift.')
    } finally {
      setSaving(false)
    }
  }

  async function saveInventory() {
    if (!inventoryDraft.inventoryTypeId) {
      setError('Inventory type is required.')
      return
    }
    if (!inventoryDraft.subInventoryTypeId) {
      setError('Sub inventory type is required.')
      return
    }

    const inventoryType = inventoryTypes.find(item => item.id === inventoryDraft.inventoryTypeId)
    const subInventoryType = subInventoryTypes.find(item => item.id === inventoryDraft.subInventoryTypeId)

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${baseUrl}/inventory`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(inventoryDraft.id ? { id: inventoryDraft.id } : {}),
          inventoryTypeId: inventoryDraft.inventoryTypeId,
          subInventoryTypeId: inventoryDraft.subInventoryTypeId,
          inventoryTypeName: inventoryType?.name ?? '',
          subInventoryTypeName: subInventoryType?.name ?? '',
          placeId,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save inventory.'))

      setSuccessMessage(extractMessage(payload, inventoryDraft.id ? 'Inventory updated successfully.' : 'Inventory created successfully.'))
      setInventoryDialogOpen(false)
      setInventoryDraft(DEFAULT_INVENTORY_DRAFT)
      setSubInventoryTypes([])
      await refreshData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save inventory.')
    } finally {
      setSaving(false)
    }
  }

  async function saveQuota() {
    if (!quotaDraft.inventoryQuotaId) {
      setError('Quota type is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${baseUrl}/quota`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(quotaDraft.id ? { id: quotaDraft.id } : {}),
          inventoryQuotaId: quotaDraft.inventoryQuotaId,
          placeId,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save quota.'))

      setSuccessMessage(extractMessage(payload, quotaDraft.id ? 'Quota updated successfully.' : 'Quota created successfully.'))
      setQuotaDialogOpen(false)
      setQuotaDraft(DEFAULT_QUOTA_DRAFT)
      await refreshData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save quota.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus() {
    if (!actionState) return

    setSaving(true)
    setError('')

    const pathByKind: Record<MasterTab, string> = {
      zone: `/api/zone/status?active=${encodeURIComponent(String(!actionState.active))}&zoneId=${encodeURIComponent(actionState.id)}`,
      shift: `/api/shift/status?active=${encodeURIComponent(String(!actionState.active))}&shiftId=${encodeURIComponent(actionState.id)}`,
      inventory: `/api/inventory/status?active=${encodeURIComponent(String(!actionState.active))}&inventoryId=${encodeURIComponent(actionState.id)}`,
      quota: `/api/quota/status?active=${encodeURIComponent(String(!actionState.active))}&inventoryQuotaId=${encodeURIComponent(actionState.id)}`,
    }

    try {
      const response = await fetch(pathByKind[actionState.kind], { method: 'PUT', headers: { Accept: 'application/json' } })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, `Unable to update ${actionState.kind} status.`))

      setSuccessMessage(extractMessage(payload, `${actionState.kind} status updated successfully.`))
      setActionState(null)
      await refreshData()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : `Unable to update ${actionState.kind} status.`)
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem() {
    if (!deleteState) return

    setSaving(true)
    setError('')

    const requestByKind: Record<MasterTab, { url: string; method: 'DELETE' }> = {
      zone: { url: `/api/zone?zoneId=${encodeURIComponent(deleteState.id)}`, method: 'DELETE' },
      shift: { url: `/api/shift?shiftId=${encodeURIComponent(deleteState.id)}`, method: 'DELETE' },
      inventory: { url: `/api/inventory?inventoryId=${encodeURIComponent(deleteState.id)}`, method: 'DELETE' },
      quota: { url: `/api/quota?inventoryQuotaId=${encodeURIComponent(deleteState.id)}`, method: 'DELETE' },
    }

    try {
      const request = requestByKind[deleteState.kind]
      const response = await fetch(request.url, { method: request.method, headers: { Accept: 'application/json' } })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, `Unable to delete ${deleteState.kind}.`))

      setSuccessMessage(extractMessage(payload, `${deleteState.kind} deleted successfully.`))
      setDeleteState(null)
      await refreshData()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Unable to delete ${deleteState.kind}.`)
    } finally {
      setSaving(false)
    }
  }

  const summaryCards = [
    { label: 'Zones', value: String(zones.length), icon: <MapPin size={16} /> },
    { label: 'Shifts', value: String(shifts.length), icon: <Clock3 size={16} /> },
    { label: 'Inventories', value: String(inventories.length), icon: <BusFront size={16} /> },
    { label: 'Quotas', value: String(quotas.length), icon: <Ticket size={16} /> },
  ]

  const filteredCount = activeTab === 'zone'
    ? filteredZones.length
    : activeTab === 'shift'
      ? filteredShifts.length
      : activeTab === 'inventory'
        ? filteredInventories.length
        : filteredQuotas.length

  const activeTabLabel = activeTab === 'zone'
    ? 'Zones'
    : activeTab === 'shift'
      ? 'Shifts'
      : activeTab === 'inventory'
        ? 'Inventories'
        : 'Quotas'

  if (loading) {
    return <RajasthanLoader label="Loading place masters..." />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionHeader
        title="Place Management / Masters"
        // right={<div className="hidden md:flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}><ShieldCheck size={13} style={{ color: 'var(--teal)' }} />Place-level zone, shift, inventory, and quota configuration</div>}
      />

      <div className="overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 45%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}>
        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
          <div>
            {/* <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, color: '#fff' }}><Layers3 size={12} />Masters</div> */}
            <h2 className="font-serif" style={{ fontSize: 32, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>Place Masters</h2>
            {/* <p className="mt-2 max-w-2xl" style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)' }}>
              {placeName ? `${placeName} master setup for zones, shifts, inventory mapping, and quota mapping.` : 'Configure zones, shifts, inventory mapping, and quota mapping for the selected place.'}
            </p> */}
          </div>
          <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
            <button
              onClick={() => {
                setError('')
                if (activeTab === 'zone') {
                  setZoneDraft(DEFAULT_ZONE_DRAFT)
                  setZoneDialogOpen(true)
                } else if (activeTab === 'shift') {
                  setShiftDraft(DEFAULT_SHIFT_DRAFT)
                  setShiftDialogOpen(true)
                } else if (activeTab === 'inventory') {
                  setInventoryDraft(DEFAULT_INVENTORY_DRAFT)
                  setSubInventoryTypes([])
                  setInventoryDialogOpen(true)
                } else {
                  setQuotaDraft(DEFAULT_QUOTA_DRAFT)
                  setQuotaDialogOpen(true)
                }
              }}
              className="rounded-2xl px-4 py-3 font-semibold"
              style={{ background: '#fff', color: 'var(--maroon)', fontSize: 13 }}
            >
              <span className="inline-flex items-center gap-2"><Plus size={15} />Add {activeTab === 'inventory' ? 'Inventory' : activeTabLabel.slice(0, -1)}</span>
            </button>
          </div>
        </div>

        {/* <div className="grid gap-px sm:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
          {summaryCards.map(card => (
            <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2" style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.icon}{card.label}</div>
              <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{card.value}</div>
            </div>
          ))}
        </div> */}
      </div>

      {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'zone', label: 'Zone' },
              { id: 'shift', label: 'Shift' },
              { id: 'inventory', label: 'Inventory' },
              { id: 'quota', label: 'Quota' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MasterTab)}
                className="rounded-full px-4 py-2 font-medium"
                style={{
                  background: activeTab === tab.id ? 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' : '#F8F4EE',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-mid)',
                  border: activeTab === tab.id ? 'none' : '1px solid var(--sand)',
                  fontSize: 13,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredCount} record{filteredCount === 1 ? '' : 's'}</div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={`Search ${activeTabLabel.toLowerCase()}...`}
                className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-80"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        {activeTab === 'zone' && (
          filteredZones.length === 0 ? (
            <EmptyState title="Zone Management" note={search.trim() ? 'No zones match the current search.' : 'No zone has been added yet for this place.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredZones.map(item => (
                <MasterCard
                  key={item.id}
                  title={item.name}
                  badge="Zone"
                  status={item.active}
                  onEdit={() => {
                    setError('')
                    setZoneDraft({ id: item.id, name: item.name, address: item.address, mapLink: item.mapLink })
                    setZoneDialogOpen(true)
                  }}
                  onToggle={() => setActionState({ kind: 'zone', id: item.id, label: item.name, active: item.active })}
                  onDelete={() => setDeleteState({ kind: 'zone', id: item.id, label: item.name })}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Address</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{item.address || 'No address added'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Map Link</div>
                  {item.mapLink ? (
                    <a href={item.mapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5" style={{ fontSize: 13, color: '#1A7A6E', fontWeight: 600 }}>
                      Open location <ExternalLink size={13} />
                    </a>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>No map link added</div>
                  )}
                </MasterCard>
              ))}
            </div>
          )
        )}

        {activeTab === 'shift' && (
          filteredShifts.length === 0 ? (
            <EmptyState title="Shift Management" note={search.trim() ? 'No shifts match the current search.' : 'No shift has been added yet for this place.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredShifts.map(item => (
                <MasterCard
                  key={item.id}
                  title={item.name}
                  badge="Shift"
                  status={item.active}
                  onEdit={() => {
                    setError('')
                    setShiftDraft({
                      id: item.id,
                      name: item.name,
                      startTime: formatTimeInput(item.startTime),
                      endTime: formatTimeInput(item.endTime),
                    })
                    setShiftDialogOpen(true)
                  }}
                  onToggle={() => setActionState({ kind: 'shift', id: item.id, label: item.name, active: item.active })}
                  onDelete={() => setDeleteState({ kind: 'shift', id: item.id, label: item.name })}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Shift Slot</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{formatTime(item.startTime)} - {formatTime(item.endTime)}</div>
                </MasterCard>
              ))}
            </div>
          )
        )}

        {activeTab === 'inventory' && (
          filteredInventories.length === 0 ? (
            <EmptyState title="Inventory Management" note={search.trim() ? 'No inventory mappings match the current search.' : 'No inventory has been mapped yet for this place.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredInventories.map(item => (
                <MasterCard
                  key={item.id}
                  title={item.inventoryTypeName || 'Inventory'}
                  badge={item.subInventoryTypeName || 'Sub inventory'}
                  status={item.active}
                  onEdit={() => {
                    setError('')
                    setInventoryDraft({
                      id: item.id,
                      inventoryTypeId: item.inventoryTypeId,
                      subInventoryTypeId: item.subInventoryTypeId,
                    })
                    setInventoryDialogOpen(true)
                  }}
                  onToggle={() => setActionState({ kind: 'inventory', id: item.id, label: `${item.inventoryTypeName} / ${item.subInventoryTypeName}`, active: item.active })}
                  onDelete={() => setDeleteState({ kind: 'inventory', id: item.id, label: `${item.inventoryTypeName} / ${item.subInventoryTypeName}` })}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Inventory Type</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{item.inventoryTypeName || 'N/A'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sub Inventory Type</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{item.subInventoryTypeName || 'N/A'}</div>
                </MasterCard>
              ))}
            </div>
          )
        )}

        {activeTab === 'quota' && (
          filteredQuotas.length === 0 ? (
            <EmptyState title="Quota Management" note={search.trim() ? 'No quotas match the current search.' : 'No quota has been mapped yet for this place.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredQuotas.map(item => (
                <MasterCard
                  key={item.id}
                  title={item.inventoryQuotaName}
                  badge="Quota"
                  status={item.active}
                  onEdit={() => {
                    setError('')
                    setQuotaDraft({
                      id: item.id,
                      inventoryQuotaId: item.inventoryQuotaId,
                    })
                    setQuotaDialogOpen(true)
                  }}
                  onToggle={() => setActionState({ kind: 'quota', id: item.id, label: item.inventoryQuotaName, active: item.active })}
                  onDelete={() => setDeleteState({ kind: 'quota', id: item.id, label: item.inventoryQuotaName })}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Availability Rule</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>
                    {!item.tillDate && item.duration === 0 ? 'Applicable during season days' : `${item.duration} day(s) before`}
                  </div>
                </MasterCard>
              ))}
            </div>
          )
        )}
      </div>

      <ModalFrame
        open={zoneDialogOpen}
        title={zoneDraft.id ? 'Edit Zone' : 'Add Zone'}
        subtitle="Create or update zone details for this place."
        onClose={() => {
          setZoneDialogOpen(false)
          setZoneDraft(DEFAULT_ZONE_DRAFT)
        }}
      >
        <div className="grid gap-4">
          <Field label="Zone Name" required>
            <TextInput value={zoneDraft.name} onChange={event => setZoneDraft(current => ({ ...current, name: event.target.value }))} placeholder="Enter zone name" />
          </Field>
          <Field label="Address">
            <TextArea value={zoneDraft.address} onChange={event => setZoneDraft(current => ({ ...current, address: event.target.value }))} placeholder="Enter address" />
          </Field>
          <Field label="Map Link">
            <TextInput value={zoneDraft.mapLink} onChange={event => setZoneDraft(current => ({ ...current, mapLink: event.target.value }))} placeholder="Paste map link" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setZoneDialogOpen(false); setZoneDraft(DEFAULT_ZONE_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void saveZone()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : zoneDraft.id ? 'Update Zone' : 'Create Zone'}</button>
        </div>
      </ModalFrame>

      <ModalFrame
        open={shiftDialogOpen}
        title={shiftDraft.id ? 'Edit Shift' : 'Add Shift'}
        subtitle="Configure shift timing for the selected place."
        onClose={() => {
          setShiftDialogOpen(false)
          setShiftDraft(DEFAULT_SHIFT_DRAFT)
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Shift Name" required>
              <TextInput value={shiftDraft.name} onChange={event => setShiftDraft(current => ({ ...current, name: event.target.value }))} placeholder="Enter shift name" />
            </Field>
          </div>
          <Field label="Start Time" required>
            <TextInput type="time" value={shiftDraft.startTime} onChange={event => setShiftDraft(current => ({ ...current, startTime: event.target.value }))} />
          </Field>
          <Field label="End Time" required>
            <TextInput type="time" value={shiftDraft.endTime} onChange={event => setShiftDraft(current => ({ ...current, endTime: event.target.value }))} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setShiftDialogOpen(false); setShiftDraft(DEFAULT_SHIFT_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void saveShift()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : shiftDraft.id ? 'Update Shift' : 'Create Shift'}</button>
        </div>
      </ModalFrame>

      <ModalFrame
        open={inventoryDialogOpen}
        title={inventoryDraft.id ? 'Edit Inventory' : 'Add Inventory'}
        subtitle="Map inventory and sub inventory to this place."
        onClose={() => {
          setInventoryDialogOpen(false)
          setInventoryDraft(DEFAULT_INVENTORY_DRAFT)
          setSubInventoryTypes([])
        }}
      >
        <div className="grid gap-4">
          <Field label="Inventory Type" required>
            <SelectInput
              value={inventoryDraft.inventoryTypeId}
              onChange={event => setInventoryDraft(current => ({ ...current, inventoryTypeId: event.target.value, subInventoryTypeId: '' }))}
            >
              <option value="">Select inventory type</option>
              {inventoryTypes.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Sub Inventory Type" required>
            <SelectInput
              value={inventoryDraft.subInventoryTypeId}
              onChange={event => setInventoryDraft(current => ({ ...current, subInventoryTypeId: event.target.value }))}
              disabled={!inventoryDraft.inventoryTypeId}
            >
              <option value="">{inventoryDraft.inventoryTypeId ? 'Select sub inventory type' : 'Choose inventory type first'}</option>
              {subInventoryTypes.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setInventoryDialogOpen(false); setInventoryDraft(DEFAULT_INVENTORY_DRAFT); setSubInventoryTypes([]) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void saveInventory()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : inventoryDraft.id ? 'Update Inventory' : 'Create Inventory'}</button>
        </div>
      </ModalFrame>

      <ModalFrame
        open={quotaDialogOpen}
        title={quotaDraft.id ? 'Edit Quota' : 'Add Quota'}
        subtitle="Map quota types to this place."
        onClose={() => {
          setQuotaDialogOpen(false)
          setQuotaDraft(DEFAULT_QUOTA_DRAFT)
        }}
      >
        <div className="grid gap-4">
          <Field label="Quota Type" required>
            <SelectInput value={quotaDraft.inventoryQuotaId} onChange={event => setQuotaDraft(current => ({ ...current, inventoryQuotaId: event.target.value }))}>
              <option value="">Select quota type</option>
              {masterQuotaOptions.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setQuotaDialogOpen(false); setQuotaDraft(DEFAULT_QUOTA_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void saveQuota()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : quotaDraft.id ? 'Update Quota' : 'Create Quota'}</button>
        </div>
      </ModalFrame>

      <ActionDialog
        open={Boolean(actionState)}
        title={actionState?.active ? `Deactivate ${actionState?.kind}?` : `Activate ${actionState?.kind}?`}
        note={`This will ${actionState?.active ? 'deactivate' : 'activate'} the selected ${actionState?.kind}.`}
        label={actionState?.label ?? ''}
        confirmLabel={actionState?.active ? 'Deactivate' : 'Activate'}
        loading={saving}
        tone={actionState?.active ? 'danger' : 'success'}
        onClose={() => setActionState(null)}
        onConfirm={() => void updateStatus()}
      />

      <ActionDialog
        open={Boolean(deleteState)}
        title={`Delete ${deleteState?.kind}?`}
        note={`This will remove the selected ${deleteState?.kind} from the place masters configuration.`}
        label={deleteState?.label ?? ''}
        confirmLabel="Delete"
        loading={saving}
        tone="danger"
        onClose={() => setDeleteState(null)}
        onConfirm={() => void deleteItem()}
      />
    </div>
  )
}
