'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Edit3,
  MoreVertical,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react'
import RajasthanLoader from '@/components/ui/RajasthanLoader'

type SeasonSection = 'draft' | 'ongoing' | 'archive'
type SetupStep = 'season' | 'shift' | 'inventory' | 'ticket'

type SeasonRow = {
  id: string
  name: string
  startTime: number
  endTime: number
  active: boolean
  deleted: boolean
  seasonConfig: string
  zoneIds: string[]
  zoneNames: string[]
  maxAllowedTickets: number
}

type ZoneOption = {
  id: string
  name: string
}

type SeasonFormState = {
  id: string
  name: string
  startDate: string
  endDate: string
  zoneIds: string[]
  totalTickets: string
}

type CopyFormState = {
  sourceSeasonId: string
  name: string
  startDate: string
  endDate: string
  totalTickets: string
  zoneIds: string[]
  zoneNames: string[]
}

type ShiftOption = {
  id: string
  name: string
  startTime: number
  endTime: number
}

type ShiftGroup = {
  id: string
  name: string
  shifts: ShiftOption[]
}

type InventoryQuotaValue = {
  inventoryQuotaId: string
  value: string
}

type InventorySelection = {
  zoneId: string
  inventoryId: string
  inventoryName: string
  quotas: InventoryQuotaValue[]
}

type InventoryOption = {
  id: string
  name: string
  quotas: Array<{ id: string; name: string }>
}

type InventoryZoneGroup = {
  id: string
  name: string
  inventories: InventoryOption[]
}

type TicketRow = {
  id: string
  name: string
  amount: number
  active: boolean
  config: boolean
  custom: boolean
  cancellationPolicyName: string
  masterActive: boolean
}

const EMPTY_FORM: SeasonFormState = {
  id: '',
  name: '',
  startDate: '',
  endDate: '',
  zoneIds: [],
  totalTickets: '',
}

const EMPTY_COPY_FORM: CopyFormState = {
  sourceSeasonId: '',
  name: '',
  startDate: '',
  endDate: '',
  totalTickets: '',
  zoneIds: [],
  zoneNames: [],
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function toDateInput(value: number) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatDisplayDate(value: number) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDisplayTime(value: number) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function extractZoneMeta(item: Record<string, unknown>) {
  const rawZoneCollections = [item.zoneDto, item.zoneDtos, item.zones, item.zoneList, item.zoneMapping]
  const zoneItems = rawZoneCollections.find(Array.isArray)

  if (Array.isArray(zoneItems)) {
    const names = zoneItems
      .map(zone => zone && typeof zone === 'object' ? toText((zone as Record<string, unknown>).name ?? (zone as Record<string, unknown>).zoneName) : '')
      .filter(Boolean)
    const ids = zoneItems
      .map(zone => zone && typeof zone === 'object' ? toText((zone as Record<string, unknown>).id ?? (zone as Record<string, unknown>).zoneId) : toText(zone))
      .filter(Boolean)

    return {
      zoneIds: Array.from(new Set(ids)),
      zoneNames: Array.from(new Set(names)),
    }
  }

  const rawIds = item.zoneIds ?? item.zoneId ?? item.zoneIdList ?? item.mappedZoneIds
  const rawNames = item.zoneNames ?? item.mappedZoneNames

  return {
    zoneIds: Array.isArray(rawIds) ? Array.from(new Set(rawIds.map(value => toText(value)).filter(Boolean))) : [],
    zoneNames: Array.isArray(rawNames) ? Array.from(new Set(rawNames.map(value => toText(value)).filter(Boolean))) : [],
  }
}

function extractSeasons(payload: unknown): SeasonRow[] {
  const root = payload && typeof payload === 'object' ? (payload as { result?: unknown }).result : null
  const list = Array.isArray((root as { seasons?: unknown[] } | null)?.seasons) ? (root as { seasons: unknown[] }).seasons : Array.isArray(root) ? root : []

  return list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => {
      const zoneMeta = extractZoneMeta(item)
      return {
        id: toText(item.id),
        name: toText(item.name),
        startTime: toNumber(item.startTime),
        endTime: toNumber(item.endTime),
        active: Boolean(item.active),
        deleted: Boolean(item.delete ?? item.deleted),
        seasonConfig: toText(item.seasonConfig).toUpperCase(),
        zoneIds: zoneMeta.zoneIds,
        zoneNames: zoneMeta.zoneNames,
        maxAllowedTickets: toNumber(item.maxAllowedTickets ?? item.totalTickets),
      }
    })
    .filter(item => item.id)
}

function extractZones(payload: unknown): ZoneOption[] {
  const result = payload && typeof payload === 'object' ? (payload as { result?: Record<string, unknown> }).result : null
  const list = Array.isArray(result?.zoneDto) ? result.zoneDto : Array.isArray(result?.zones) ? result.zones : []

  return list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => ({ id: toText(item.id), name: toText(item.name) }))
    .filter(item => item.id && item.name)
}

function getSeasonSection(season: SeasonRow, now: number): SeasonSection | null {
  if (season.deleted) return null
  if (season.seasonConfig === 'COMPLETE') {
    return season.endTime > now ? 'ongoing' : 'archive'
  }
  return 'draft'
}

function formatZoneSummary(season: SeasonRow) {
  if (season.zoneNames.length > 0) return season.zoneNames.join(', ')
  if (season.zoneIds.length > 0) return `${season.zoneIds.length} zone(s) mapped`
  return 'All zones'
}

function resolveZoneNames(zoneIds: string[], zoneNames: string[], zones: ZoneOption[]) {
  if (zoneNames.length > 0) return zoneNames

  const zoneNameMap = new Map(zones.map(zone => [zone.id, zone.name]))
  return zoneIds
    .map(zoneId => zoneNameMap.get(zoneId) ?? '')
    .filter(Boolean)
}

function getSeasonTone(section: SeasonSection, index: number) {
  if (section === 'draft') return 'rgba(148, 163, 184, 0.12)'
  if (section === 'archive') return 'rgba(200,146,42,0.10)'
  return index % 2 === 0 ? 'rgba(26,122,110,0.08)' : 'rgba(91,157,254,0.08)'
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

function extractShiftGroups(payload: unknown): ShiftGroup[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const rows = Array.isArray((result as Record<string, unknown>).shifts)
    ? (result as Record<string, unknown>).shifts as unknown[]
    : []

  return rows
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => {
      const nestedShifts = Array.isArray(item.shifts) ? item.shifts as unknown[] : []
      const shifts = nestedShifts
        .filter((shift: unknown): shift is Record<string, unknown> => Boolean(shift && typeof shift === 'object'))
        .map(shift => ({
          id: toText(shift.id),
          name: toText(shift.name, 'Shift'),
          startTime: toNumber(shift.startTime),
          endTime: toNumber(shift.endTime),
        }))
        .filter(shift => shift.id)

      if (shifts.length > 0) {
        return {
          id: toText(item.id),
          name: toText(item.name, 'Zone'),
          shifts,
        }
      }

      return {
        id: 'default',
        name: 'Shifts',
        shifts: [{
          id: toText(item.id),
          name: toText(item.name, 'Shift'),
          startTime: toNumber(item.startTime),
          endTime: toNumber(item.endTime),
        }].filter(shift => shift.id),
      }
    })
    .filter(group => group.shifts.length > 0)
    .reduce<ShiftGroup[]>((acc, group) => {
      const existing = acc.find(item => item.id === group.id)
      if (existing) {
        existing.shifts = [...existing.shifts, ...group.shifts]
        return acc
      }
      acc.push(group)
      return acc
    }, [])
}

function extractSelectedShiftIds(payload: unknown) {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const rows = Array.isArray((result as Record<string, unknown>).shifts)
    ? (result as Record<string, unknown>).shifts as unknown[]
    : []

  return rows
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .flatMap(item => {
      if (Array.isArray(item.shifts)) {
        return (item.shifts as unknown[])
          .filter((shift: unknown): shift is Record<string, unknown> => Boolean(shift && typeof shift === 'object'))
          .filter(shift => Boolean(shift.selected))
          .map(shift => `${toText(item.id)}::${toText(shift.id)}`)
      }

      return Boolean(item.selected) && toText(item.id) ? [`default::${toText(item.id)}`] : []
    })
}

function extractInventoryGroups(payload: unknown): InventoryZoneGroup[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const zones = Array.isArray((result as Record<string, unknown>).inventory)
    ? (result as Record<string, unknown>).inventory as unknown[]
    : []

  return zones
    .filter((zone: unknown): zone is Record<string, unknown> => Boolean(zone && typeof zone === 'object'))
    .map(zone => ({
      id: toText(zone.id),
      name: toText(zone.name, 'Zone'),
      inventories: Array.isArray(zone.inventoryDtos)
        ? (zone.inventoryDtos as unknown[])
            .filter((inventory: unknown): inventory is Record<string, unknown> => Boolean(inventory && typeof inventory === 'object'))
            .map(inventory => ({
              id: toText(inventory.id),
              name: toText(inventory.subInventoryTypeName ?? inventory.inventoryTypeName ?? inventory.name, 'Inventory'),
              quotas: Array.isArray(inventory.inventoryQuotaDtos)
                ? (inventory.inventoryQuotaDtos as unknown[])
                    .filter((quota: unknown): quota is Record<string, unknown> => Boolean(quota && typeof quota === 'object'))
                    .map(quota => ({
                      id: toText(quota.id),
                      name: toText(quota.inventoryQuotaName ?? quota.name, 'Quota'),
                    }))
                    .filter(quota => quota.id)
                : [],
            }))
            .filter(inventory => inventory.id)
        : [],
    }))
    .filter(zone => zone.id && zone.inventories.length > 0)
}

function extractSelectedInventories(payload: unknown): InventorySelection[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const zones = Array.isArray((result as Record<string, unknown>).inventory)
    ? (result as Record<string, unknown>).inventory as unknown[]
    : []

  const selections: InventorySelection[] = []

  for (const zone of zones) {
    if (!zone || typeof zone !== 'object') continue
    const zoneRecord = zone as Record<string, unknown>
    const zoneId = toText(zoneRecord.id)
    const inventoryList = Array.isArray(zoneRecord.inventoryDtos) ? zoneRecord.inventoryDtos as unknown[] : []

    for (const inventory of inventoryList) {
      if (!inventory || typeof inventory !== 'object') continue
      const inventoryRecord = inventory as Record<string, unknown>
      if (!inventoryRecord.selected) continue

      const quotas = Array.isArray(inventoryRecord.inventoryQuotaDtos)
        ? (inventoryRecord.inventoryQuotaDtos as unknown[])
            .filter((quota: unknown): quota is Record<string, unknown> => Boolean(quota && typeof quota === 'object'))
            .filter(quota => Boolean(quota.selected) || toNumber(quota.value) > 0)
            .map(quota => ({
              inventoryQuotaId: toText(quota.id),
              value: toText(quota.value),
            }))
            .filter(quota => quota.inventoryQuotaId)
        : []

      selections.push({
        zoneId,
        inventoryId: toText(inventoryRecord.id),
        inventoryName: toText(inventoryRecord.subInventoryTypeName ?? inventoryRecord.inventoryTypeName ?? inventoryRecord.name, 'Inventory'),
        quotas,
      })
    }
  }

  return selections
}

function extractTicketList(payload: unknown): TicketRow[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const list = Array.isArray((result as Record<string, unknown>).ticketTypeDtos)
    ? (result as Record<string, unknown>).ticketTypeDtos as unknown[]
    : []

  return list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => ({
      id: toText(item.id),
      name: toText(item.masterTicketTypeName ?? item.ticketTypeName ?? item.name, 'Ticket'),
      amount: toNumber(item.amount),
      active: Boolean(item.active),
      config: Boolean(item.config),
      custom: Boolean(item.custom),
      cancellationPolicyName: toText(item.cancellationPolicyName),
      masterActive: Boolean(item.masterActive),
    }))
    .filter(item => item.id)
}

function SectionBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-full px-3 py-1 font-semibold"
      style={{ background: 'rgba(200,146,42,0.12)', color: '#8A5B05', fontSize: 11 }}
    >
      {label}
    </span>
  )
}

function MenuItemButton({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
      style={{ fontSize: 13, color: danger ? 'var(--maroon)' : 'var(--text-dark)' }}
    >
      {icon}
      {label}
    </button>
  )
}

export default function SeasonManagement({
  placeId,
  routePlaceId,
  placeType,
}: {
  placeId: string
  routePlaceId: string
  placeType?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [stepLoading, setStepLoading] = useState(false)
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [zones, setZones] = useState<ZoneOption[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [copyDialogError, setCopyDialogError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<SeasonSection>('ongoing')
  const [form, setForm] = useState<SeasonFormState>(EMPTY_FORM)
  const [copyForm, setCopyForm] = useState<CopyFormState>(EMPTY_COPY_FORM)
  const [confirmState, setConfirmState] = useState<{ type: 'delete' | 'status'; season: SeasonRow } | null>(null)
  const [menuState, setMenuState] = useState<{ seasonId: string; section: SeasonSection } | null>(null)
  const [setupSeasonId, setSetupSeasonId] = useState('')
  const [setupStepIndex, setSetupStepIndex] = useState(0)
  const [selectedShiftKeys, setSelectedShiftKeys] = useState<string[]>([])
  const [shiftGroups, setShiftGroups] = useState<ShiftGroup[]>([])
  const [inventoryGroups, setInventoryGroups] = useState<InventoryZoneGroup[]>([])
  const [inventorySelections, setInventorySelections] = useState<InventorySelection[]>([])
  const [ticketRows, setTicketRows] = useState<TicketRow[]>([])

  const isInventoryPlace = String(placeType || '').toUpperCase() === 'INVENTORY'
  const setupSteps = useMemo<SetupStep[]>(
    () => (isInventoryPlace ? ['season', 'shift', 'inventory', 'ticket'] : ['season', 'shift', 'ticket']),
    [isInventoryPlace],
  )
  const currentStep = setupSteps[setupStepIndex] ?? 'season'
  const configuredTickets = useMemo(() => ticketRows.filter(item => item.config), [ticketRows])
  const availableTickets = useMemo(() => ticketRows.filter(item => !item.config), [ticketRows])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [seasonRes, zoneRes] = await Promise.all([
        fetch(`/api/season?placeId=${encodeURIComponent(placeId)}`, { cache: 'no-store' }),
        fetch(`/api/zone?placeId=${encodeURIComponent(placeId)}`, { cache: 'no-store' }),
      ])

      const seasonPayload = await seasonRes.json().catch(() => null)
      const zonePayload = await zoneRes.json().catch(() => null)

      if (!seasonRes.ok) {
        throw new Error(extractMessage(seasonPayload, 'Unable to fetch seasons.'))
      }

      setSeasons(extractSeasons(seasonPayload))
      if (zoneRes.ok) setZones(extractZones(zonePayload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load season management.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [placeId])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(''), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (!menuState) return
    function closeMenu() {
      setMenuState(null)
    }
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [menuState])

  const seasonBuckets = useMemo(() => {
    const now = Date.now()
    return seasons.reduce<Record<SeasonSection, SeasonRow[]>>(
      (acc, season) => {
        const section = getSeasonSection(season, now)
        if (section) acc[section].push(season)
        return acc
      },
      { draft: [], ongoing: [], archive: [] },
    )
  }, [seasons])

  const activeSeasons = seasonBuckets[activeSection]

  async function loadShiftStep(seasonId: string) {
    setStepLoading(true)
    try {
      const response = await fetch(`/api/season/shift?seasonId=${encodeURIComponent(seasonId)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch season shifts.'))
      setShiftGroups(extractShiftGroups(payload))
      setSelectedShiftKeys(extractSelectedShiftIds(payload))
    } finally {
      setStepLoading(false)
    }
  }

  async function loadInventoryStep(seasonId: string) {
    setStepLoading(true)
    try {
      const response = await fetch(`/api/season/inventory?seasonId=${encodeURIComponent(seasonId)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch season inventory mapping.'))
      setInventoryGroups(extractInventoryGroups(payload))
      setInventorySelections(extractSelectedInventories(payload))
    } finally {
      setStepLoading(false)
    }
  }

  async function loadTicketStep(seasonId: string) {
    setStepLoading(true)
    try {
      const response = await fetch(`/api/ticket/config?seasonId=${encodeURIComponent(seasonId)}&ticketConfig=${encodeURIComponent('TICKET_TYPE')}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch season ticket configuration.'))
      setTicketRows(extractTicketList(payload))
    } finally {
      setStepLoading(false)
    }
  }

  async function loadSetupStep(step: SetupStep, seasonId: string) {
    if (!seasonId) return
    if (step === 'shift') return loadShiftStep(seasonId)
    if (step === 'inventory') return loadInventoryStep(seasonId)
    if (step === 'ticket') return loadTicketStep(seasonId)
  }

  async function goToStep(index: number, seasonId: string) {
    const bounded = Math.max(0, Math.min(index, setupSteps.length - 1))
    setSetupStepIndex(bounded)
    await loadSetupStep(setupSteps[bounded], seasonId)
  }

  async function submitSeasonBasics() {
    setDialogError('')
    const name = form.name.trim()
    const startDate = form.startDate.trim()
    const endDate = form.endDate.trim()

    if (!name || !startDate || !endDate) {
      setDialogError('Season name and date range are required.')
      return
    }

    if (isInventoryPlace && form.zoneIds.length === 0) {
      setDialogError('At least one zone must be mapped for inventory places.')
      return
    }

    if (!isInventoryPlace) {
      const totalTickets = Number(form.totalTickets)
      if (!Number.isFinite(totalTickets) || totalTickets < 0) {
        setDialogError('Season ticket count is required for non-inventory places.')
        return
      }
    }

    const payload: Record<string, unknown> = {
      name,
      startTime: new Date(`${startDate}T00:00:00`).getTime(),
      endTime: new Date(`${endDate}T23:59:59`).getTime(),
      placeId,
    }

    if (isInventoryPlace) {
      payload.zoneIds = form.zoneIds
      payload.zoneId = form.zoneIds
    } else {
      payload.maxAllowedTickets = Number(form.totalTickets)
    }

    try {
      setSubmitting(true)
      setError('')
      setDialogError('')

      const response = await fetch(form.id ? `/api/season?seasonId=${encodeURIComponent(form.id)}` : '/api/season', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to save season.'))

      const nextSeasonId = toText((result as Record<string, unknown> | null)?.result && typeof (result as Record<string, unknown>).result === 'object'
        ? ((result as { result?: Record<string, unknown> }).result?.id)
        : undefined) || form.id

      setSetupSeasonId(nextSeasonId)
      setForm(current => ({ ...current, id: nextSeasonId }))
      setSuccess(extractMessage(result, form.id ? 'Season updated.' : 'Season created.'))
      await loadData()
      await goToStep(1, nextSeasonId)
    } catch (submitError) {
      setDialogError(submitError instanceof Error ? submitError.message : 'Unable to save season.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitShiftStep() {
    if (!setupSeasonId) return
    setDialogError('')

    const shiftConfigs = isInventoryPlace
      ? selectedShiftKeys
          .map(key => {
            const [zoneId, shiftId] = key.split('::')
            return zoneId && shiftId && zoneId !== 'default' ? { zoneId, shiftId } : null
          })
          .filter((item): item is { zoneId: string; shiftId: string } => Boolean(item))
      : selectedShiftKeys
          .map(key => {
            const [, shiftId] = key.split('::')
            return shiftId ? { shiftId } : null
          })
          .filter((item): item is { shiftId: string } => Boolean(item))

    if (shiftConfigs.length === 0) {
      setDialogError('Please select at least one shift to continue.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setDialogError('')
      const response = await fetch('/api/season/shift', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: setupSeasonId,
          shiftConfigs,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to save season shifts.'))

      setSuccess(extractMessage(result, 'Shift mapping updated.'))
      await goToStep(setupStepIndex + 1, setupSeasonId)
    } catch (submitError) {
      setDialogError(submitError instanceof Error ? submitError.message : 'Unable to save season shifts.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitInventoryStep() {
    if (!setupSeasonId) return
    setDialogError('')

    const inventoryConfigs = inventorySelections
      .filter(selection => selection.quotas.length > 0)
      .map(selection => ({
        zoneId: selection.zoneId,
        inventoryId: selection.inventoryId,
        inventoryQuotaConfigs: selection.quotas
          .filter(quota => quota.value.trim() && Number(quota.value) >= 0)
          .map(quota => ({
            inventoryQuotaId: quota.inventoryQuotaId,
            value: Number(quota.value),
          })),
      }))
      .filter(selection => selection.inventoryQuotaConfigs.length > 0)

    if (inventoryConfigs.length === 0) {
      setDialogError('Please configure at least one inventory quota to continue.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setDialogError('')
      const response = await fetch('/api/season/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: setupSeasonId,
          inventoryConfigs,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to save season inventory mapping.'))

      setSuccess(extractMessage(result, 'Inventory mapping updated.'))
      await goToStep(setupStepIndex + 1, setupSeasonId)
    } catch (submitError) {
      setDialogError(submitError instanceof Error ? submitError.message : 'Unable to save season inventory mapping.')
    } finally {
      setSubmitting(false)
    }
  }

  async function finishSetup() {
    if (!setupSeasonId) return
    try {
      setSubmitting(true)
      setError('')
      setDialogError('')
      const response = await fetch(`/api/season/save?seasonId=${encodeURIComponent(setupSeasonId)}`, { method: 'PUT' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to complete season setup.'))

      setSuccess(extractMessage(result, 'Season setup completed.'))
      setModalOpen(false)
      setSetupSeasonId('')
      setSetupStepIndex(0)
      setSelectedShiftKeys([])
      setInventorySelections([])
      setTicketRows([])
      setForm(EMPTY_FORM)
      await loadData()
    } catch (submitError) {
      setDialogError(submitError instanceof Error ? submitError.message : 'Unable to complete season setup.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyConfiguration() {
    setCopyDialogError('')
    const sourceSeason = seasons.find(item => item.id === copyForm.sourceSeasonId)
    const name = copyForm.name.trim()
    const startDate = copyForm.startDate.trim()
    const endDate = copyForm.endDate.trim()

    if (!sourceSeason) {
      setCopyDialogError('Source season was not found.')
      return
    }
    if (isInventoryPlace && copyForm.zoneIds.length === 0) {
      setCopyDialogError('Zone mapping is not available for this inventory season. Please configure zones before copying.')
      return
    }
    if (!name || !startDate || !endDate) {
      setCopyDialogError('Season name and date range are required to copy configuration.')
      return
    }
    if (!isInventoryPlace) {
      const totalTickets = Number(copyForm.totalTickets)
      if (!Number.isFinite(totalTickets) || totalTickets < 0) {
        setCopyDialogError('Season ticket count is required for non-inventory places.')
        return
      }
    }

    const payload: Record<string, unknown> = {
      copyFromSeasonId: sourceSeason.id,
      seasonDto: {
        name,
        startTime: new Date(`${startDate}T00:00:00`).getTime(),
        endTime: new Date(`${endDate}T23:59:59`).getTime(),
        placeId,
        ...(isInventoryPlace
          ? { zoneId: copyForm.zoneIds }
          : { maxAllowedTickets: Number(copyForm.totalTickets) }),
      },
    }

    try {
      setSubmitting(true)
      setError('')
      setCopyDialogError('')
      const response = await fetch('/api/season/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to copy season configuration.'))

      setCopyModalOpen(false)
      setCopyForm(EMPTY_COPY_FORM)
      setSuccess(extractMessage(result, 'Season configuration copied successfully.'))
      await loadData()
    } catch (copyError) {
      setCopyDialogError(copyError instanceof Error ? copyError.message : 'Unable to copy season configuration.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirm() {
    if (!confirmState) return
    try {
      setSubmitting(true)
      setError('')

      const response = confirmState.type === 'delete'
        ? await fetch(`/api/season?seasonId=${encodeURIComponent(confirmState.season.id)}`, { method: 'DELETE' })
        : await fetch(`/api/season/active?seasonId=${encodeURIComponent(confirmState.season.id)}&active=${encodeURIComponent(String(!confirmState.season.active))}`, { method: 'PUT' })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to update season.'))

      setConfirmState(null)
      setSuccess(
        confirmState.type === 'delete'
          ? extractMessage(result, 'Season deleted.')
          : extractMessage(result, `Season ${confirmState.season.active ? 'deactivated' : 'activated'}.`),
      )
      await loadData()
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Unable to update season.')
    } finally {
      setSubmitting(false)
    }
  }

  function openCreateModal() {
    setMenuState(null)
    setDialogError('')
    setSetupSeasonId('')
    setSetupStepIndex(0)
    setSelectedShiftKeys([])
    setInventorySelections([])
    setShiftGroups([])
    setInventoryGroups([])
    setTicketRows([])
    setForm({
      ...EMPTY_FORM,
      zoneIds: isInventoryPlace ? zones.map(zone => zone.id) : [],
    })
    setModalOpen(true)
  }

  function openEditModal(season: SeasonRow) {
    setMenuState(null)
    setDialogError('')
    setSetupSeasonId(season.id)
    setSetupStepIndex(0)
    setSelectedShiftKeys([])
    setInventorySelections([])
    setShiftGroups([])
    setInventoryGroups([])
    setTicketRows([])
    setForm({
      id: season.id,
      name: season.name,
      startDate: toDateInput(season.startTime),
      endDate: toDateInput(season.endTime),
      zoneIds: season.zoneIds.length > 0 ? season.zoneIds : zones.map(zone => zone.id),
      totalTickets: season.maxAllowedTickets ? String(season.maxAllowedTickets) : '',
    })
    setModalOpen(true)
  }

  function openCopyModal(season: SeasonRow) {
    setMenuState(null)
    setCopyDialogError('')
    const resolvedZoneNames = resolveZoneNames(season.zoneIds, season.zoneNames, zones)
    setCopyForm({
      sourceSeasonId: season.id,
      name: `${season.name} Copy`,
      startDate: toDateInput(season.startTime),
      endDate: toDateInput(season.endTime),
      totalTickets: season.maxAllowedTickets ? String(season.maxAllowedTickets) : '',
      zoneIds: [...season.zoneIds],
      zoneNames: [...resolvedZoneNames],
    })
    setCopyModalOpen(true)
  }

function toggleZone(zoneId: string) {
  setForm(current => ({
    ...current,
    zoneIds: current.zoneIds.includes(zoneId) ? current.zoneIds.filter(id => id !== zoneId) : [...current.zoneIds, zoneId],
  }))
}

function toggleCopyZone(zoneId: string) {
  setCopyForm(current => {
    const nextZoneIds = current.zoneIds.includes(zoneId)
      ? current.zoneIds.filter(id => id !== zoneId)
      : [...current.zoneIds, zoneId]

    return {
      ...current,
      zoneIds: nextZoneIds,
      zoneNames: resolveZoneNames(nextZoneIds, [], zones),
    }
  })
}

  function openWorkspace(seasonId: string, tab?: string) {
    router.push(
      `/places/${encodeURIComponent(routePlaceId)}/season/${encodeURIComponent(seasonId)}?apiPlaceId=${encodeURIComponent(placeId)}${tab ? `&tab=${encodeURIComponent(tab)}` : ''}`,
    )
  }

  function toggleShiftSelection(key: string) {
    setSelectedShiftKeys(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key])
  }

  function selectionKey(zoneId: string, shiftId: string) {
    return `${zoneId}::${shiftId}`
  }

  function inventorySelectionFor(zoneId: string, inventoryId: string, inventoryName: string) {
    return inventorySelections.find(item => item.zoneId === zoneId && item.inventoryId === inventoryId)
      ?? { zoneId, inventoryId, inventoryName, quotas: [] }
  }

  function toggleInventory(zoneId: string, inventoryId: string, inventoryName: string) {
    setInventorySelections(current => {
      const exists = current.some(item => item.zoneId === zoneId && item.inventoryId === inventoryId)
      if (exists) return current.filter(item => !(item.zoneId === zoneId && item.inventoryId === inventoryId))
      return [...current, { zoneId, inventoryId, inventoryName, quotas: [] }]
    })
  }

  function updateInventoryQuota(zoneId: string, inventoryId: string, inventoryName: string, quotaId: string, value: string) {
    setInventorySelections(current => {
      const existing = current.find(item => item.zoneId === zoneId && item.inventoryId === inventoryId)
      const base = existing ?? { zoneId, inventoryId, inventoryName, quotas: [] }
      const nextQuotas = base.quotas.filter(item => item.inventoryQuotaId !== quotaId)
      if (value.trim()) nextQuotas.push({ inventoryQuotaId: quotaId, value })
      const nextItem = { ...base, quotas: nextQuotas }
      const filtered = current.filter(item => !(item.zoneId === zoneId && item.inventoryId === inventoryId))
      return nextQuotas.length > 0 || existing ? [...filtered, nextItem] : filtered
    })
  }

  const sectionMeta: Array<{ id: SeasonSection; label: string; description: string }> = [
    { id: 'draft', label: 'Draft Seasons', description: 'Ticket or configuration setup pending.' },
    { id: 'ongoing', label: 'Ongoing Seasons', description: 'Active season workspaces for this place.' },
    { id: 'archive', label: 'Archive Seasons', description: 'Completed seasons for historical lookup.' },
  ]
  const activeSectionMeta = sectionMeta.find(item => item.id === activeSection) ?? sectionMeta[1]
  const stepLabels: Record<SetupStep, string> = {
    season: 'Season',
    shift: isInventoryPlace ? 'Zone & Shifts' : 'Shifts',
    inventory: 'Inventory Mapping',
    ticket: 'Ticket Configuration',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 28, color: 'var(--text-dark)' }}>
            Season Management
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            {isInventoryPlace
              ? 'Inventory place flow with zone mapping, season shift mapping, inventory mapping, and ticket configuration.'
              : 'Non-inventory place flow with season ticket count, season shift mapping, and ticket configuration.'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', fontSize: 13 }}
        >
          <Plus size={16} />
          Add Season
        </button>
      </div>

      {success ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E', fontSize: 13 }}>{success}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      <div className="rounded-[28px] bg-white p-5" style={{ border: '1px solid var(--sand)' }}>
        <div className="mb-5 flex flex-wrap gap-3">
          {sectionMeta.map(section => {
            const selected = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="rounded-2xl px-4 py-3 text-left transition-all"
                style={{
                  minWidth: 180,
                  background: selected ? 'rgba(107,18,18,0.08)' : '#fff',
                  border: selected ? '1px solid var(--maroon)' : '1px solid var(--sand)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span style={{ fontSize: 13, color: selected ? 'var(--maroon)' : 'var(--text-dark)', fontWeight: 700 }}>{section.label}</span>
                  <span className="rounded-full px-2.5 py-1" style={{ background: selected ? 'var(--maroon)' : 'var(--cream)', color: selected ? '#fff' : 'var(--text-dark)', fontSize: 11, fontWeight: 700 }}>
                    {seasonBuckets[section.id].length}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{section.description}</div>
              </button>
            )
          })}
        </div>

        <div className="mb-4">
          <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{activeSectionMeta.label}</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{activeSectionMeta.description}</p>
        </div>

        {loading ? (
          <div className="py-20"><RajasthanLoader label="Loading seasons..." /></div>
        ) : activeSeasons.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--cream)', color: 'var(--maroon)' }}>
              <Calendar size={30} />
            </div>
            <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{`No ${activeSection} seasons found`}</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              {activeSection === 'ongoing'
                ? 'Create or complete a season to start managing this place.'
                : activeSection === 'draft'
                  ? 'Draft seasons will appear here until configuration is completed.'
                  : 'Archived seasons will appear here after completion.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeSeasons.map((season, index) => {
              const section = getSeasonSection(season, Date.now()) ?? activeSection
              const menuOpen = menuState?.seasonId === season.id && menuState.section === activeSection

              return (
                <div
                  key={season.id}
                  className={`rounded-[24px] p-5 ${section !== 'draft' ? 'cursor-pointer' : ''}`}
                  style={{ background: getSeasonTone(section, index), border: '1px solid var(--sand)' }}
                  onClick={() => { if (section !== 'draft') openWorkspace(season.id) }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Season Name</div>
                      <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)', marginTop: 4 }}>{season.name}</div>
                    </div>

                    <div className="relative flex items-start gap-2">
                      {section === 'draft'
                        ? <SectionBadge label="Setup pending" />
                        : (
                          <span className="rounded-full px-3 py-1 font-semibold" style={{ background: season.active ? 'rgba(26,122,110,0.12)' : 'rgba(139,26,26,0.10)', color: season.active ? '#1A7A6E' : 'var(--maroon)', fontSize: 11 }}>
                            {season.active ? 'Active' : 'Inactive'}
                          </span>
                        )}

                      {(section === 'ongoing' || section === 'draft') ? (
                        <button
                          onClick={event => {
                            event.stopPropagation()
                            setMenuState(current => current?.seasonId === season.id ? null : { seasonId: season.id, section })
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      ) : null}

                      {menuOpen ? (
                        <div
                          className="absolute right-0 top-11 z-20 min-w-[230px] rounded-2xl bg-white p-2"
                          style={{ border: '1px solid var(--sand)', boxShadow: '0 20px 60px rgba(28, 16, 8, 0.16)' }}
                          onClick={event => event.stopPropagation()}
                        >
                          {section === 'ongoing' ? (
                            <>
                              <MenuItemButton icon={<ArrowRight size={15} />} label="View Workspace" onClick={() => openWorkspace(season.id)} />
                              <MenuItemButton icon={<Edit3 size={15} />} label="Edit Setup" onClick={() => openEditModal(season)} />
                              <MenuItemButton icon={<Power size={15} />} label={season.active ? 'Deactivate' : 'Activate'} onClick={() => setConfirmState({ type: 'status', season })} />
                              <MenuItemButton icon={<Copy size={15} />} label="Copy Configuration" onClick={() => openCopyModal(season)} />
                              <MenuItemButton icon={<Trash2 size={15} />} label="Delete" onClick={() => setConfirmState({ type: 'delete', season })} danger />
                            </>
                          ) : (
                            <>
                              <MenuItemButton icon={<Edit3 size={15} />} label="Continue Setup" onClick={() => openEditModal(season)} />
                              <MenuItemButton icon={<Trash2 size={15} />} label="Delete" onClick={() => setConfirmState({ type: 'delete', season })} danger />
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3" style={{ border: '1px solid var(--sand)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Start Date</div>
                      <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{formatDisplayDate(season.startTime)}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3" style={{ border: '1px solid var(--sand)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>End Date</div>
                      <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{formatDisplayDate(season.endTime)}</div>
                    </div>
                  </div>

                  {isInventoryPlace ? (
                    <div className="mt-3 rounded-2xl bg-white px-4 py-3" style={{ border: '1px solid var(--sand)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Zone Mapping</div>
                      <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{formatZoneSummary(season)}</div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-white px-4 py-3" style={{ border: '1px solid var(--sand)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Season Tickets</div>
                      <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{season.maxAllowedTickets || 'N/A'}</div>
                    </div>
                  )}

                  {section !== 'draft' ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/places/${encodeURIComponent(routePlaceId)}/season/${encodeURIComponent(season.id)}?apiPlaceId=${encodeURIComponent(placeId)}`}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
                        style={{ background: 'var(--maroon)', color: '#fff', fontSize: 12 }}
                        onClick={event => event.stopPropagation()}
                      >
                        View
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto px-4 py-6" style={{ background: 'rgba(28,16,8,0.46)', backdropFilter: 'blur(5px)' }} onClick={event => { if (event.target === event.currentTarget) setModalOpen(false) }}>
          <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: '0 32px 90px rgba(107,18,18,0.24)' }}>
            <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 62%, #C8922A 100%)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>{form.id ? 'Edit Season Setup' : 'Add Season Setup'}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)', marginTop: 4 }}>
                    {isInventoryPlace
                      ? 'Reference flow: season details, zone and shift mapping, inventory mapping, then ticket configuration.'
                      : 'Reference flow: season details, shift mapping, then ticket configuration.'}
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {setupSteps.map((step, index) => {
                  const active = index === setupStepIndex
                  const done = index < setupStepIndex
                  return (
                    <div
                      key={step}
                      className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                      style={{ background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)', color: '#fff' }}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: done ? '#1A7A6E' : active ? '#fff' : 'rgba(255,255,255,0.18)', color: done ? '#fff' : active ? 'var(--maroon)' : '#fff', fontSize: 12, fontWeight: 700 }}>
                        {done ? <Check size={14} /> : index + 1}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{stepLabels[step]}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="min-h-[520px] flex-1 overflow-y-auto space-y-5 px-6 py-6" style={{ background: 'var(--cream)' }}>
              {dialogError ? (
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
                  {dialogError}
                </div>
              ) : null}
              {currentStep === 'season' ? (
                <>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Season Name</label>
                      <input
                        value={form.name}
                        onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                        placeholder="Enter season name"
                        className="w-full rounded-2xl px-4 py-3 outline-none"
                        style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                      />
                    </div>
                    {!isInventoryPlace ? (
                      <div>
                        <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Max Ticket Count</label>
                        <input
                          type="number"
                          min="0"
                          value={form.totalTickets}
                          onChange={event => setForm(current => ({ ...current, totalTickets: event.target.value }))}
                          placeholder="Enter max ticket count"
                          className="w-full rounded-2xl px-4 py-3 outline-none"
                          style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Start Date</label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))}
                        className="w-full rounded-2xl px-4 py-3 outline-none"
                        style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>End Date</label>
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))}
                        className="w-full rounded-2xl px-4 py-3 outline-none"
                        style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {isInventoryPlace ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Zone Mapping</label>
                        <button
                          type="button"
                          onClick={() => setForm(current => ({ ...current, zoneIds: current.zoneIds.length === zones.length ? [] : zones.map(zone => zone.id) }))}
                          className="rounded-full px-3 py-1 font-semibold"
                          style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', fontSize: 11 }}
                        >
                          {form.zoneIds.length === zones.length ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {zones.map(zone => {
                          const checked = form.zoneIds.includes(zone.id)
                          return (
                            <label key={zone.id} className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#fff', border: checked ? '1px solid var(--maroon)' : '1px solid var(--sand)' }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleZone(zone.id)} />
                              <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{zone.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {currentStep === 'shift' ? (
                stepLoading ? <RajasthanLoader label="Loading season shifts..." /> : (
                  <div className="space-y-4">
                    <div>
                      <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>
                        {isInventoryPlace ? 'Select Zones & Shifts' : 'Select Shifts'}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                        {isInventoryPlace
                          ? 'This matches the inventory season flow in the reference project: shift selection is mapped zone by zone.'
                          : 'This matches the non-inventory season flow in the reference project: choose the shifts before ticket setup.'}
                      </p>
                    </div>

                    {shiftGroups.length > 0 ? shiftGroups.map(group => (
                      <div key={group.id} className="rounded-[24px] bg-white p-5" style={{ border: '1px solid var(--sand)' }}>
                        <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>{group.name}</div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {group.shifts.map(shift => {
                            const key = selectionKey(group.id, shift.id)
                            const checked = selectedShiftKeys.includes(key)
                            return (
                              <label key={shift.id} className="flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-4" style={{ background: checked ? 'rgba(107,18,18,0.06)' : '#fffaf5', border: checked ? '1px solid var(--maroon)' : '1px solid var(--sand)' }}>
                                <input type="checkbox" checked={checked} onChange={() => toggleShiftSelection(key)} />
                                <div>
                                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{shift.name}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {formatDisplayTime(shift.startTime)} - {formatDisplayTime(shift.endTime)}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )) : <div className="rounded-[24px] bg-white px-5 py-8" style={{ border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-muted)' }}>No season shifts were returned for this place.</div>}
                  </div>
                )
              ) : null}

              {currentStep === 'inventory' ? (
                stepLoading ? <RajasthanLoader label="Loading season inventory mapping..." /> : (
                  <div className="space-y-4">
                    <div>
                      <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>Inventory Mapping</div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                        This step follows the reference inventory season flow: after zone and shift mapping, configure season inventory quota values.
                      </p>
                    </div>

                    {inventoryGroups.length > 0 ? inventoryGroups.map(group => (
                      <div key={group.id} className="rounded-[24px] bg-white p-5" style={{ border: '1px solid var(--sand)' }}>
                        <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>{group.name}</div>
                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          {group.inventories.map(inventory => {
                            const selection = inventorySelectionFor(group.id, inventory.id, inventory.name)
                            const checked = inventorySelections.some(item => item.zoneId === group.id && item.inventoryId === inventory.id)
                            return (
                              <div key={inventory.id} className="rounded-2xl px-4 py-4" style={{ background: checked ? 'rgba(107,18,18,0.06)' : '#fffaf5', border: checked ? '1px solid var(--maroon)' : '1px solid var(--sand)' }}>
                                <label className="flex cursor-pointer items-center gap-3">
                                  <input type="checkbox" checked={checked} onChange={() => toggleInventory(group.id, inventory.id, inventory.name)} />
                                  <span style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{inventory.name}</span>
                                </label>

                                {checked ? (
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {inventory.quotas.map(quota => (
                                      <div key={quota.id}>
                                        <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{quota.name}</label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={selection.quotas.find(item => item.inventoryQuotaId === quota.id)?.value ?? ''}
                                          onChange={event => updateInventoryQuota(group.id, inventory.id, inventory.name, quota.id, event.target.value)}
                                          placeholder="Enter quota value"
                                          className="w-full rounded-2xl px-4 py-3 outline-none"
                                          style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )) : <div className="rounded-[24px] bg-white px-5 py-8" style={{ border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-muted)' }}>No inventory mappings were returned for this season.</div>}
                  </div>
                )
              ) : null}

              {currentStep === 'ticket' ? (
                stepLoading ? <RajasthanLoader label="Loading ticket configuration..." /> : (
                  <div className="space-y-5">
                    <div>
                      <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>Ticket Configuration</div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                        This step shows the season ticket configuration status after the earlier setup steps, matching the final stage of the reference flow.
                      </p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[24px] bg-white p-5" style={{ border: '1px solid var(--sand)' }}>
                        <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>Configured Tickets</div>
                        <div className="mt-4 space-y-3">
                          {configuredTickets.length > 0 ? configuredTickets.map(ticket => (
                            <div key={ticket.id} className="rounded-2xl px-4 py-4" style={{ background: '#fffaf5', border: '1px solid var(--sand)' }}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{ticket.name}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {ticket.cancellationPolicyName || 'No cancellation policy'}{ticket.custom ? ' • Custom' : ''}{ticket.masterActive ? ' • Master active' : ' • Master inactive'}
                                  </div>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--maroon)', fontWeight: 700 }}>{ticket.amount ? formatCurrency(ticket.amount) : 'N/A'}</div>
                              </div>
                            </div>
                          )) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No configured tickets returned yet for this season.</div>}
                        </div>
                      </div>

                      <div className="rounded-[24px] bg-white p-5" style={{ border: '1px solid var(--sand)' }}>
                        <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>Available Ticket Types</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {availableTickets.length > 0 ? availableTickets.map(ticket => (
                            <span key={ticket.id} className="rounded-full px-3 py-1.5 font-medium" style={{ background: '#fffaf5', color: 'var(--text-dark)', border: '1px solid var(--sand)', fontSize: 12 }}>
                              {ticket.name}
                            </span>
                          )) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>All ticket types are already configured.</span>}
                        </div>

                        <div className="mt-6 space-y-3">
                          <button
                            onClick={() => openWorkspace(setupSeasonId, 'ticket')}
                            className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white"
                            style={{ background: 'var(--maroon)', fontSize: 13 }}
                          >
                            Open Ticket Workspace
                            <ArrowRight size={15} />
                          </button>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Use the season workspace to continue ticket configuration details after this guided setup.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : null}

              <div className="flex justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    if (setupStepIndex === 0) setModalOpen(false)
                    else void goToStep(setupStepIndex - 1, setupSeasonId)
                  }}
                  className="rounded-xl px-5 py-2.5 font-medium"
                  style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}
                >
                  {setupStepIndex === 0 ? 'Cancel' : 'Back'}
                </button>

                <button
                  onClick={() => {
                    if (currentStep === 'season') void submitSeasonBasics()
                    else if (currentStep === 'shift') void submitShiftStep()
                    else if (currentStep === 'inventory') void submitInventoryStep()
                    else void finishSetup()
                  }}
                  disabled={submitting || stepLoading}
                  className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
                >
                  {submitting
                    ? 'Please wait...'
                    : currentStep === 'ticket'
                      ? 'Finish Setup'
                      : 'Save & Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {copyModalOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto px-4 py-6" style={{ background: 'rgba(28,16,8,0.46)', backdropFilter: 'blur(5px)' }} onClick={event => { if (event.target === event.currentTarget) setCopyModalOpen(false) }}>
          <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: '0 32px 90px rgba(107,18,18,0.24)' }}>
            <div className="flex items-start justify-between gap-3 px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 62%, #C8922A 100%)' }}>
              <div>
                <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>Copy Configuration</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>Create a new season from an existing season configuration.</div>
              </div>
              <button onClick={() => setCopyModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 px-6 py-6" style={{ background: 'var(--cream)' }}>
              {copyDialogError ? (
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
                  {copyDialogError}
                </div>
              ) : null}
              <div>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Season Name</label>
                <input value={copyForm.name} onChange={event => setCopyForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start Date</label>
                  <input type="date" value={copyForm.startDate} onChange={event => setCopyForm(current => ({ ...current, startDate: event.target.value }))} className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }} />
                </div>
                <div>
                  <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>End Date</label>
                  <input type="date" value={copyForm.endDate} onChange={event => setCopyForm(current => ({ ...current, endDate: event.target.value }))} className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }} />
                </div>
              </div>
              {isInventoryPlace ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zone Mapping</label>
                    <button
                      type="button"
                      onClick={() => setCopyForm(current => {
                        const nextZoneIds = current.zoneIds.length === zones.length ? [] : zones.map(zone => zone.id)
                        return {
                          ...current,
                          zoneIds: nextZoneIds,
                          zoneNames: resolveZoneNames(nextZoneIds, [], zones),
                        }
                      })}
                      className="rounded-full px-3 py-1 font-semibold"
                      style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', fontSize: 11 }}
                    >
                      {copyForm.zoneIds.length === zones.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {zones.map(zone => {
                      const checked = copyForm.zoneIds.includes(zone.id)
                      return (
                        <label
                          key={zone.id}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3"
                          style={{ background: '#fff', border: checked ? '1px solid var(--maroon)' : '1px solid var(--sand)' }}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleCopyZone(zone.id)} />
                          <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{zone.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {!isInventoryPlace ? (
                <div>
                  <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Season Tickets</label>
                  <input type="number" min="0" value={copyForm.totalTickets} onChange={event => setCopyForm(current => ({ ...current, totalTickets: event.target.value }))} className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }} />
                </div>
              ) : null}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setCopyModalOpen(false)} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
                <button onClick={() => void handleCopyConfiguration()} disabled={submitting} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
                  {submitting ? 'Copying...' : 'Copy Season'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto px-4 py-6" style={{ background: 'rgba(28,16,8,0.46)', backdropFilter: 'blur(5px)' }} onClick={event => { if (event.target === event.currentTarget) setConfirmState(null) }}>
          <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: '0 32px 90px rgba(107,18,18,0.24)' }}>
            <div className="px-6 py-6" style={{ background: 'var(--cream)' }}>
              <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>
                {confirmState.type === 'delete' ? 'Delete season?' : `${confirmState.season.active ? 'Deactivate' : 'Activate'} season?`}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{confirmState.season.name}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setConfirmState(null)} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
                <button onClick={() => void handleConfirm()} disabled={submitting} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
                  {submitting ? 'Please wait...' : confirmState.type === 'delete' ? 'Delete' : confirmState.season.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
