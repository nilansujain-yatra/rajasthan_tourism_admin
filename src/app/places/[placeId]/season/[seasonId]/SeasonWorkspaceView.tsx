'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  QrCode,
  Receipt,
  Search,
  Settings,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { usePlaceStore } from '@/lib/store/use-place-store'
import { authFetch } from '@/lib/api/authFetch'

type SeasonTab = 'dashboard' | 'configurations' | 'ticket' | 'availability' | 'refunds' | 'bookings' | 'scanned'

type SeasonRecord = {
  id: string
  name: string
  startTime: number
  endTime: number
  active: boolean
  zoneIds: string[]
  zoneNames: string[]
  seasonConfig: string
}

type ZoneOption = {
  id: string
  name: string
}

type OptionRow = {
  id: string
  name: string
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

type AvailabilityRow = {
  id: string
  date: number
  availabilityType: string
  note: string
}

type BookingRow = {
  id: string
  bookingId: string
  name: string
  members: number
  amount: number
  bookingDate: number
  status: string
  initiatedBy: string
}

type RefundRow = {
  id: string
  bookingId: string
  bookingUser: string
  initiatedBy: string
  refundDate: number
  scheduledDate: number
  status: string
}

type ScanRow = {
  id: string
  bookingId: string
  ticketId: string
  visitorName: string
  scannedDate: number
  status: string
  gateName: string
}

type SeasonFormState = {
  name: string
  startDate: string
  endDate: string
  zoneIds: string[]
}

type DashboardStat = {
  label: string
  value: string
  icon: React.ReactNode
}

type DashboardSeriesRow = {
  name: string
  count: number
  amount: number
}

const TABS: Array<{ id: SeasonTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'configurations', label: 'Configuration', icon: Settings },
  { id: 'ticket', label: 'Ticket', icon: Ticket },
  { id: 'availability', label: 'Availability', icon: Calendar },
  { id: 'refunds', label: 'Refunds', icon: Wallet },
  { id: 'bookings', label: 'Bookings', icon: Receipt },
  { id: 'scanned', label: 'Scanned Entries', icon: QrCode },
]

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function getAny(source: unknown, keys: string[]) {
  if (!source || typeof source !== 'object') return undefined
  const record = source as Record<string, unknown>
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key]
  }
  return undefined
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

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
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

function formatDisplayDateTime(value: number) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDateRange(start: number, end: number) {
  return `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function statusTone(status: string) {
  const upper = status.toUpperCase()
  if (upper.includes('SUCCESS') || upper.includes('ACTIVE') || upper.includes('FREE')) {
    return { bg: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
  }
  if (upper.includes('SCHEDULED') || upper.includes('PENDING') || upper.includes('IMPOSE')) {
    return { bg: 'rgba(200,146,42,0.16)', color: '#8A5B05' }
  }
  return { bg: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function extractZoneMeta(item: Record<string, unknown>) {
  const rawZoneCollections = [item.zoneDto, item.zoneDtos, item.zones, item.zoneList, item.zoneMapping]
  const zoneItems = rawZoneCollections.find(Array.isArray)

  if (Array.isArray(zoneItems)) {
    return {
      zoneIds: zoneItems
        .map(zone => zone && typeof zone === 'object' ? toText(getAny(zone, ['id', 'zoneId'])) : '')
        .filter(Boolean),
      zoneNames: zoneItems
        .map(zone => zone && typeof zone === 'object' ? toText(getAny(zone, ['name', 'zoneName'])) : '')
        .filter(Boolean),
    }
  }

  return {
    zoneIds: Array.isArray(item.zoneIds) ? item.zoneIds.map(zoneId => toText(zoneId)).filter(Boolean) : [],
    zoneNames: Array.isArray(item.zoneNames) ? item.zoneNames.map(zoneName => toText(zoneName)).filter(Boolean) : [],
  }
}

function extractSeason(payload: unknown, seasonId: string): SeasonRecord | null {
  const root = payload && typeof payload === 'object' ? (payload as { result?: unknown }).result : null
  const list = Array.isArray((root as { seasons?: unknown[] } | null)?.seasons)
    ? (root as { seasons: unknown[] }).seasons
    : Array.isArray(root)
      ? root
      : root && typeof root === 'object'
        ? [root]
        : []

  const seasons = list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => {
      const zoneMeta = extractZoneMeta(item)
      return {
        id: toText(item.id),
        name: toText(item.name),
        startTime: toNumber(item.startTime),
        endTime: toNumber(item.endTime),
        active: Boolean(item.active),
        zoneIds: Array.from(new Set(zoneMeta.zoneIds)),
        zoneNames: Array.from(new Set(zoneMeta.zoneNames)),
        seasonConfig: toText(item.seasonConfig).toUpperCase(),
      }
    })
    .filter(item => item.id)

  return seasons.find(item => item.id === seasonId) ?? seasons[0] ?? null
}

function extractSimpleOptions(payload: unknown, keys: string[]): OptionRow[] {
  const root = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}

  for (const key of keys) {
    const candidate = (root as Record<string, unknown>)[key]
    if (Array.isArray(candidate)) {
      return candidate
        .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map(item => ({
          id: toText(getAny(item, ['id', 'zoneId', 'quotaId', 'shiftId'])),
          name: toText(getAny(item, ['name', 'zoneName', 'quotaName', 'shiftName'])),
        }))
        .filter(item => item.id || item.name)
    }
  }

  return []
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
      name: toText(getAny(item, ['masterTicketTypeName', 'ticketTypeName', 'name']), 'Ticket'),
      amount: toNumber(item.amount),
      active: Boolean(item.active),
      config: Boolean(item.config),
      custom: Boolean(item.custom),
      cancellationPolicyName: toText(item.cancellationPolicyName),
      masterActive: Boolean(item.masterActive),
    }))
}

function extractAvailabilityRows(payload: unknown): AvailabilityRow[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const list = Array.isArray((result as Record<string, unknown>).availabilityDto)
    ? (result as Record<string, unknown>).availabilityDto as unknown[]
    : findFirstArray(result) ?? []

  return list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      id: toText(item.id, `availability-${index}`),
      date: toNumber(getAny(item, ['date', 'availabilityDate'])),
      availabilityType: toText(getAny(item, ['availabilityType', 'status']), 'N/A'),
      note: toText(getAny(item, ['note', 'remark', 'message'])),
    }))
}

function extractBookingRows(payload: unknown): BookingRow[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const list = findFirstArray(result) ?? []

  return list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      id: toText(getAny(item, ['id', 'bookingId']), `booking-${index}`),
      bookingId: toText(getAny(item, ['bookingId', 'id'])),
      name: toText(getAny(item, ['name', 'visitorName', 'bookingUserName', 'bookingUser'])),
      members: toNumber(getAny(item, ['members', 'totalUsers', 'memberCount', 'visitorCount'])),
      amount: toNumber(getAny(item, ['amount', 'totalAmount', 'netAmount'])),
      bookingDate: toNumber(getAny(item, ['bookingDate', 'createdDate', 'createdAt'])),
      status: toText(getAny(item, ['status', 'bookingStatus']), 'N/A'),
      initiatedBy: toText(getAny(item, ['initiatedBy', 'role', 'userRole', 'bookingType'])),
    }))
}

function extractRefundRows(payload: unknown): RefundRow[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const list = findFirstArray(result) ?? []

  return list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      id: toText(getAny(item, ['ticketBookingId', 'id', 'bookingId']), `refund-${index}`),
      bookingId: toText(getAny(item, ['bookingId', 'ticketBookingId', 'id'])),
      bookingUser: toText(getAny(item, ['bookingUser', 'bookingUserName', 'name'])),
      initiatedBy: toText(getAny(item, ['initiatedBy', 'role', 'updatedBy'])),
      refundDate: toNumber(getAny(item, ['refundDate', 'refundTime', 'updatedAt'])),
      scheduledDate: toNumber(getAny(item, ['scheduledDate', 'createdAt', 'createdDate'])),
      status: toText(getAny(item, ['status', 'refundStatus']), 'N/A'),
    }))
}

function extractScanRows(payload: unknown): ScanRow[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}
  const list = Array.isArray((result as Record<string, unknown>).scannedEntryDtos)
    ? (result as Record<string, unknown>).scannedEntryDtos as unknown[]
    : findFirstArray(result) ?? []

  return list
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      id: toText(getAny(item, ['id', 'bookingId', 'ticketId']), `scan-${index}`),
      bookingId: toText(getAny(item, ['bookingId'])),
      ticketId: toText(getAny(item, ['ticketId', 'qrDetail'])),
      visitorName: toText(getAny(item, ['name', 'visitorName', 'userName'])),
      scannedDate: toNumber(getAny(item, ['scanDate', 'scannedDate', 'createdAt'])),
      status: toText(getAny(item, ['status', 'entryType']), 'N/A'),
      gateName: toText(getAny(item, ['gateName', 'zoneName', 'scanPoint'])),
    }))
}

function extractDashboardSeries(payload: unknown): DashboardSeriesRow[] {
  const result = payload && typeof payload === 'object'
    ? ((payload as { result?: Record<string, unknown> }).result ?? (payload as Record<string, unknown>))
    : {}

  const rows = findFirstArray(getAny(result, ['ticketTypeListDtos', 'ticketTypeDtos', 'ticketTypes', 'chartData'])) ?? []
  return rows
    .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => ({
      name: toText(getAny(item, ['ticketTypeName', 'name', 'label']), 'Ticket'),
      count: toNumber(getAny(item, ['ticketCount', 'count', 'value'])),
      amount: toNumber(getAny(item, ['totalAmount', 'amount'])),
    }))
}

function SummaryCard({ label, value, icon }: DashboardStat) {
  return (
    <div className="rounded-[24px] bg-white px-5 py-4" style={{ border: '1px solid var(--sand)' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
          <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)', marginTop: 6 }}>{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function Panel({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-[28px] bg-white p-6" style={{ border: '1px solid var(--sand)' }}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{title}</div>
          {subtitle ? <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-[28px] bg-white px-6 py-12 text-center" style={{ border: '1px solid var(--sand)' }}>
      <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{title}</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{note}</p>
    </div>
  )
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="flex min-w-[240px] items-center gap-2 rounded-2xl px-4 py-3" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
      <Search size={15} style={{ color: 'var(--text-muted)' }} />
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none"
        style={{ fontSize: 13, color: 'var(--text-dark)' }}
      />
    </div>
  )
}

export default function SeasonWorkspaceView({ placeId, seasonId, apiPlaceId }: { placeId: string; seasonId: string; apiPlaceId: string }) {
  const searchParams = useSearchParams()
  const selectedPlace = usePlaceStore(state => state.selectedPlace)
  const [activeTab, setActiveTab] = useState<SeasonTab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [season, setSeason] = useState<SeasonRecord | null>(null)
  const [zones, setZones] = useState<ZoneOption[]>([])
  const [dashboardDate, setDashboardDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [dashboardData, setDashboardData] = useState<Record<string, unknown> | null>(null)
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>([])
  const [ticketRows, setTicketRows] = useState<TicketRow[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<Record<string, unknown> | null>(null)
  const [touristBookings, setTouristBookings] = useState<BookingRow[]>([])
  const [operatorBookings, setOperatorBookings] = useState<BookingRow[]>([])
  const [refundRows, setRefundRows] = useState<RefundRow[]>([])
  const [scanRows, setScanRows] = useState<ScanRow[]>([])
  const [bookingsMode, setBookingsMode] = useState<'tourist' | 'operator'>('tourist')
  const [bookingSearch, setBookingSearch] = useState('')
  const [refundSearch, setRefundSearch] = useState('')
  const [scanSearch, setScanSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<SeasonFormState>({ name: '', startDate: '', endDate: '', zoneIds: [] })

  const effectiveApiPlaceId = apiPlaceId || toText((selectedPlace as Record<string, unknown> | null)?.id) || placeId
  const requestedTab = searchParams.get('tab')

  useEffect(() => {
    if (!requestedTab) return
    if (TABS.some(tab => tab.id === requestedTab)) {
      setActiveTab(requestedTab as SeasonTab)
    }
  }, [requestedTab])
  const placeName = toText((selectedPlace as Record<string, unknown> | null)?.placeName, 'Place')

  async function fetchJson(url: string, fallback: string) {
    const response = await authFetch(url, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractMessage(payload, fallback))
    return payload
  }

  async function loadBaseData() {
    try {
      setLoading(true)
      setError('')
      setSeason(null)

      const [seasonPayload, zonePayload, availabilityPayload, ticketPayload] = await Promise.all([
        fetchJson(`/season?placeId=${encodeURIComponent(effectiveApiPlaceId)}`, 'Unable to fetch season details.'),
        fetchJson(`/zone?placeId=${encodeURIComponent(effectiveApiPlaceId)}`, 'Unable to fetch zones.'),
        fetchJson(`/availability?seasonId=${encodeURIComponent(seasonId)}`, 'Unable to fetch availability.'),
        fetchJson(`/ticket/config?seasonId=${encodeURIComponent(seasonId)}&ticketConfig=${encodeURIComponent('TICKET_TYPE')}`, 'Unable to fetch ticket configuration.'),
      ])

      const seasonRecord = extractSeason(seasonPayload, seasonId)
      if (!seasonRecord) {
        throw new Error('The requested season could not be found in this place.')
      }
      setSeason(seasonRecord)
      setZones(extractSimpleOptions(zonePayload, ['zoneDto', 'zoneData', 'zones']))
      setAvailabilityRows(extractAvailabilityRows(availabilityPayload))
      setTicketRows(extractTicketList(ticketPayload))

      if (seasonRecord) {
        setForm({
          name: seasonRecord.name,
          startDate: toDateInput(seasonRecord.startTime),
          endDate: toDateInput(seasonRecord.endTime),
          zoneIds: seasonRecord.zoneIds,
        })
        const today = new Date()
        const bounded = new Date(Math.min(Math.max(today.getTime(), seasonRecord.startTime), seasonRecord.endTime || today.getTime()))
        setDashboardDate(bounded.toISOString().slice(0, 10))
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load season workspace.')
    } finally {
      setLoading(false)
    }
  }

  async function loadDashboard() {
    if (!season) return
    try {
      const start = new Date(`${dashboardDate}T00:00:00`).getTime()
      const end = new Date(`${dashboardDate}T23:59:59`).getTime()
      const payload = await fetchJson(
        `/season/dashboard?seasonId=${encodeURIComponent(season.id)}&startDay=${encodeURIComponent(String(start))}&endDay=${encodeURIComponent(String(end))}`,
        'Unable to fetch season dashboard.',
      )
      setDashboardData(payload && typeof payload === 'object' ? ((payload as { result?: Record<string, unknown> }).result ?? payload as Record<string, unknown>) : null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch season dashboard.')
    }
  }

  async function loadBookings() {
    if (!season) return
    try {
      const [touristPayload, operatorPayload] = await Promise.all([
        fetchJson(
          `/season/bookings?seasonId=${encodeURIComponent(season.id)}&offSet=0&size=20&searchKey=${encodeURIComponent(bookingSearch)}&startDate=${encodeURIComponent(form.startDate)}&endDate=${encodeURIComponent(form.endDate)}`,
          'Unable to fetch season bookings.',
        ),
        fetchJson(
          `/season/operator/bookings?placeId=${encodeURIComponent(effectiveApiPlaceId)}&seasonId=${encodeURIComponent(season.id)}&offSet=0&size=20&searchKey=${encodeURIComponent(bookingSearch)}&startDate=${encodeURIComponent(form.startDate)}&endDate=${encodeURIComponent(form.endDate)}`,
          'Unable to fetch operator season bookings.',
        ),
      ])

      setTouristBookings(extractBookingRows(touristPayload))
      setOperatorBookings(extractBookingRows(operatorPayload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch bookings.')
    }
  }

  async function loadRefunds() {
    if (!season) return
    try {
      const payload = await fetchJson(
        `/booking/refund/tickets/v2?seasonId=${encodeURIComponent(season.id)}&offSet=0&size=20&searchKey=${encodeURIComponent(refundSearch)}`,
        'Unable to fetch refunds.',
      )
      setRefundRows(extractRefundRows(payload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch refunds.')
    }
  }

  async function loadScans() {
    try {
      const payload = await fetchJson(
        `/operator/scan-entry?placeId=${encodeURIComponent(effectiveApiPlaceId)}&offSet=0&size=20&searchKey=${encodeURIComponent(scanSearch)}`,
        'Unable to fetch scanned entries.',
      )
      setScanRows(extractScanRows(payload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch scanned entries.')
    }
  }

  async function loadTicketDetail(ticketTypeId: string) {
    try {
      const payload = await fetchJson(`/ticket/config/${encodeURIComponent(ticketTypeId)}`, 'Unable to fetch ticket details.')
      const result = payload && typeof payload === 'object' ? ((payload as { result?: Record<string, unknown> }).result ?? payload as Record<string, unknown>) : null
      setSelectedTicketId(ticketTypeId)
      setSelectedTicketDetail(result && typeof result === 'object' ? result : null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch ticket details.')
    }
  }

  useEffect(() => {
    void loadBaseData()
  }, [effectiveApiPlaceId, seasonId])

  useEffect(() => {
    if (!season) return
    void loadDashboard()
  }, [dashboardDate, season])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(''), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (activeTab === 'bookings' && season) void loadBookings()
  }, [activeTab, bookingSearch, season])

  useEffect(() => {
    if (activeTab === 'refunds' && season) void loadRefunds()
  }, [activeTab, refundSearch, season])

  useEffect(() => {
    if (activeTab === 'scanned') void loadScans()
  }, [activeTab, scanSearch, effectiveApiPlaceId])

  useEffect(() => {
    if (activeTab === 'ticket' && ticketRows.length > 0 && !selectedTicketId) {
      void loadTicketDetail(ticketRows[0].id)
    }
  }, [activeTab, selectedTicketId, ticketRows])

  const configuredTickets = useMemo(() => ticketRows.filter(item => item.config), [ticketRows])
  const availableTickets = useMemo(() => ticketRows.filter(item => !item.config), [ticketRows])
  const mappedZoneNames = useMemo(() => {
    if (!season) return []
    if (season.zoneNames.length > 0) return season.zoneNames
    return zones.filter(zone => season.zoneIds.includes(zone.id)).map(zone => zone.name)
  }, [season, zones])

  const dashboardStats: DashboardStat[] = useMemo(() => {
    const root = dashboardData ?? {}
    return [
      { label: 'Total Bookings', value: String(toNumber(getAny(root, ['totalBookings', 'bookingCount']))), icon: <Receipt size={18} /> },
      { label: 'Total Visitors', value: String(toNumber(getAny(root, ['totalVisitors', 'visitorCount']))), icon: <Users size={18} /> },
      { label: 'Collected Amount', value: formatCurrency(toNumber(getAny(root, ['totalAmount', 'collectedAmount']))), icon: <Wallet size={18} /> },
      { label: 'Mapped Zones', value: String(mappedZoneNames.length || zones.length), icon: <MapPin size={18} /> },
    ]
  }, [dashboardData, mappedZoneNames.length, zones.length])

  const dashboardSeries = useMemo(() => extractDashboardSeries({ result: dashboardData ?? {} }), [dashboardData])

  async function saveConfiguration() {
    if (!season) return

    const payload = {
      name: form.name.trim(),
      startTime: new Date(`${form.startDate}T00:00:00`).getTime(),
      endTime: new Date(`${form.endDate}T23:59:59`).getTime(),
      placeId: effectiveApiPlaceId,
      zoneIds: form.zoneIds.length > 0 ? form.zoneIds : zones.map(zone => zone.id),
    }

    if (!payload.name || !form.startDate || !form.endDate) {
      setError('Season name and date range are required.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await authFetch(`/season?seasonId=${encodeURIComponent(season.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to update season.'))

      setSuccess(extractMessage(result, 'Season updated.'))
      await loadBaseData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update season.')
    } finally {
      setSaving(false)
    }
  }

  async function updateRefundStatus(status: string, ticketBookingId: string) {
    try {
      setError('')
      const response = await authFetch(
        `/booking/refund-status?refundStatus=${encodeURIComponent(status)}&ticketBookingId=${encodeURIComponent(ticketBookingId)}`,
        { method: 'PUT' },
      )
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(result, 'Unable to update refund status.'))
      setSuccess(extractMessage(result, 'Refund status updated.'))
      await loadRefunds()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update refund status.')
    }
  }

  function toggleZone(zoneId: string) {
    setForm(current => ({
      ...current,
      zoneIds: current.zoneIds.includes(zoneId)
        ? current.zoneIds.filter(id => id !== zoneId)
        : [...current.zoneIds, zoneId],
    }))
  }

  if (loading) {
    return <RajasthanLoader label="Loading season workspace..." />
  }

  if (!season) {
    return (
      <div className="px-6 py-6 space-y-4">
        <Link
          href={`/places/${encodeURIComponent(placeId)}`}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
        >
          <ArrowLeft size={13} />
          Back to place
        </Link>
        <EmptyState title="Season not found" note={error || 'The requested season could not be loaded for this place.'} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="space-y-4">
        <Link
          href={`/places/${encodeURIComponent(placeId)}`}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
        >
          <ArrowLeft size={13} />
          Back to place
        </Link>

        <div className="rounded-[28px] bg-white p-6" style={{ border: '1px solid var(--sand)' }}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{placeName}</div>
                <div className="font-serif font-bold" style={{ fontSize: 34, color: 'var(--text-dark)', marginTop: 4 }}>{season.name}</div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl bg-[#fffaf5] px-4 py-3" style={{ border: '1px solid var(--sand)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Season Date</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700, marginTop: 4 }}>
                    {formatDateRange(season.startTime, season.endTime)}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#fffaf5] px-4 py-3" style={{ border: '1px solid var(--sand)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Zone Mapping</div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700, marginTop: 4 }}>
                    {mappedZoneNames.length > 0 ? mappedZoneNames.join(', ') : 'All zones'}
                  </div>
                </div>
              </div>
            </div>

            <span
              className="rounded-full px-4 py-2 font-semibold"
              style={{
                background: season.active ? 'rgba(26,122,110,0.12)' : 'rgba(139,26,26,0.10)',
                color: season.active ? '#1A7A6E' : 'var(--maroon)',
                fontSize: 12,
              }}
            >
              {season.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {success ? (
        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E', fontSize: 13 }}>
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <nav className="rounded-[24px] bg-white p-2" style={{ border: '1px solid var(--sand)' }}>
        <ul className="flex flex-wrap gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold transition-all"
                  style={{
                    background: isActive ? 'var(--maroon)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-dark)',
                    fontSize: 13,
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {activeTab === 'dashboard' ? (
        <div className="space-y-6">
          <Panel
            title="Dashboard"
            subtitle="Daily season summary and booking performance."
            right={
              <input
                type="date"
                value={dashboardDate}
                onChange={event => setDashboardDate(event.target.value)}
                className="rounded-2xl px-4 py-3 outline-none"
                style={{ border: '1px solid var(--sand)', fontSize: 13, background: '#fff' }}
              />
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dashboardStats.map(card => (
                <SummaryCard key={card.label} {...card} />
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Ticket Summary" subtitle="Ticket breakup returned by the season dashboard API.">
              {dashboardSeries.length > 0 ? (
                <div className="space-y-3">
                  {dashboardSeries.map(item => (
                    <div key={item.name} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: '#fffaf5', border: '1px solid var(--sand)' }}>
                      <div>
                        <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{item.count} bookings</div>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--maroon)', fontWeight: 700 }}>{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No ticket summary returned for the selected day.</div>
              )}
            </Panel>

            <Panel title="Zone Mapping" subtitle="Mapped zones visible in the current season workspace.">
              <div className="flex flex-wrap gap-2">
                {(mappedZoneNames.length > 0 ? mappedZoneNames : zones.map(zone => zone.name)).map(name => (
                  <span key={name} className="rounded-full px-3 py-1.5 font-medium" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 12 }}>
                    {name}
                  </span>
                ))}
                {mappedZoneNames.length === 0 && zones.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No zones available for this place.</span>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === 'configurations' ? (
        <Panel title="Configure" subtitle="Season date window and zone mapping.">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Season Name</label>
                <input
                  value={form.name}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl px-4 py-3 outline-none"
                  style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                />
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
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
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
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {zones.map(zone => {
                  const checked = form.zoneIds.includes(zone.id)
                  return (
                    <label
                      key={zone.id}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ background: '#fffaf5', border: checked ? '1px solid var(--maroon)' : '1px solid var(--sand)' }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleZone(zone.id)} />
                      <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{zone.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => void saveConfiguration()}
                disabled={saving}
                className="rounded-2xl px-6 py-3 font-semibold text-white disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

      {activeTab === 'ticket' ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <Panel title="Configured Tickets" subtitle="Season ticket configuration list from the reference ticket API.">
            <div className="space-y-3">
              {configuredTickets.length > 0 ? configuredTickets.map(ticket => {
                const tone = statusTone(ticket.active ? 'ACTIVE' : 'INACTIVE')
                return (
                  <button
                    key={ticket.id}
                    onClick={() => void loadTicketDetail(ticket.id)}
                    className="flex w-full items-start justify-between rounded-2xl px-4 py-4 text-left"
                    style={{ background: selectedTicketId === ticket.id ? 'rgba(139,26,26,0.06)' : '#fffaf5', border: '1px solid var(--sand)' }}
                  >
                    <div>
                      <div style={{ fontSize: 15, color: 'var(--text-dark)', fontWeight: 700 }}>{ticket.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        {ticket.cancellationPolicyName || 'No cancellation policy'}{ticket.custom ? ' • Custom Ticket' : ''}{ticket.masterActive ? ' • Master Active' : ' • Master Inactive'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontSize: 14, color: 'var(--maroon)', fontWeight: 700 }}>{ticket.amount ? formatCurrency(ticket.amount) : 'N/A'}</div>
                      <span className="mt-2 inline-flex rounded-full px-2.5 py-1 font-medium" style={{ background: tone.bg, color: tone.color, fontSize: 11 }}>
                        {ticket.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </button>
                )
              }) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No configured tickets returned.</div>}
            </div>
          </Panel>

          <Panel title="Ticket Details" subtitle="Selected ticket configuration details.">
            {selectedTicketDetail ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryCard label="Config Rows" value={String((findFirstArray(selectedTicketDetail)?.length ?? 0))} icon={<Ticket size={18} />} />
                  <SummaryCard label="Selected Ticket" value={toText(getAny(selectedTicketDetail, ['name', 'ticketTypeName', 'masterTicketTypeName']), 'Ticket')} icon={<CheckCircle2 size={18} />} />
                </div>
               
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a configured ticket to inspect its details.</div>
            )}
          </Panel>

          <Panel title="Available Ticket Types" subtitle="Ticket types present but not yet configured.">
            <div className="flex flex-wrap gap-2">
              {availableTickets.length > 0 ? availableTickets.map(ticket => (
                <span key={ticket.id} className="rounded-full px-3 py-1.5 font-medium" style={{ background: '#fffaf5', color: 'var(--text-dark)', border: '1px solid var(--sand)', fontSize: 12 }}>
                  {ticket.name}
                </span>
              )) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>All ticket types are already configured.</span>}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === 'availability' ? (
        <Panel title="Availability" subtitle="Season day-wise availability returned by the availability API.">
          {availabilityRows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--sand)' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--cream-dark)' }}>
                  <tr>
                    {['Date', 'Status', 'Note'].map(label => (
                      <th key={label} className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availabilityRows.map(row => {
                    const tone = statusTone(row.availabilityType)
                    return (
                      <tr key={row.id} style={{ borderTop: '1px solid var(--sand)' }}>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{formatDisplayDate(row.date)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 font-medium" style={{ background: tone.bg, color: tone.color, fontSize: 11 }}>
                            {row.availabilityType}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No availability rows returned for this season.</div>
          )}
        </Panel>
      ) : null}

      {activeTab === 'refunds' ? (
        <Panel
          title="Refund"
          subtitle="Season refund list with action states from the reference flow."
          right={<SearchField value={refundSearch} onChange={setRefundSearch} placeholder="Search booking or user..." />}
        >
          {refundRows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--sand)' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--cream-dark)' }}>
                  <tr>
                    {['Booking ID', 'Booking User', 'Initiated By', 'Refund Date', 'Scheduled Date', 'Status', 'Action'].map(label => (
                      <th key={label} className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {refundRows.map(row => {
                    const tone = statusTone(row.status)
                    return (
                      <tr key={row.id} style={{ borderTop: '1px solid var(--sand)' }}>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.bookingId || row.id}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.bookingUser || '—'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.initiatedBy || '—'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDisplayDateTime(row.refundDate)}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDisplayDateTime(row.scheduledDate)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 font-medium" style={{ background: tone.bg, color: tone.color, fontSize: 11 }}>{row.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {row.status.toUpperCase() === 'SCHEDULED' || row.status.toUpperCase() === 'FAIL' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => void updateRefundStatus('SUCCESS', row.id)}
                                className="rounded-xl px-3 py-2 font-semibold"
                                style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 11 }}
                              >
                                Mark Success
                              </button>
                              <button
                                onClick={() => void updateRefundStatus('FAIL', row.id)}
                                className="rounded-xl px-3 py-2 font-semibold"
                                style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 11 }}
                              >
                                Mark Fail
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No action</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No refunds returned for this season.</div>
          )}
        </Panel>
      ) : null}

      {activeTab === 'bookings' ? (
        <Panel
          title="Booking"
          subtitle="Tourist and operator booking lists following the reference season workspace split."
          right={<SearchField value={bookingSearch} onChange={setBookingSearch} placeholder="Search booking..." />}
        >
          <div className="mb-5 flex gap-2">
            {(['tourist', 'operator'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setBookingsMode(mode)}
                className="rounded-2xl px-4 py-3 font-semibold"
                style={{
                  background: bookingsMode === mode ? 'var(--maroon)' : '#fff',
                  color: bookingsMode === mode ? '#fff' : 'var(--text-dark)',
                  border: '1px solid var(--sand)',
                  fontSize: 13,
                }}
              >
                {mode === 'tourist' ? 'Tourist' : 'Operator'}
              </button>
            ))}
          </div>

          {(bookingsMode === 'tourist' ? touristBookings : operatorBookings).length > 0 ? (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--sand)' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--cream-dark)' }}>
                  <tr>
                    {['Booking ID', 'Name', 'Members', 'Amount', 'Booking Date', 'Status'].map(label => (
                      <th key={label} className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(bookingsMode === 'tourist' ? touristBookings : operatorBookings).map(row => {
                    const tone = statusTone(row.status)
                    return (
                      <tr key={row.id} style={{ borderTop: '1px solid var(--sand)' }}>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.bookingId || row.id}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.name || '—'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.members || 0}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDisplayDateTime(row.bookingDate)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 font-medium" style={{ background: tone.bg, color: tone.color, fontSize: 11 }}>{row.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No {bookingsMode} bookings returned for this season.</div>
          )}
        </Panel>
      ) : null}

      {activeTab === 'scanned' ? (
        <Panel
          title="Scanned Entries"
          subtitle="Scanned entry report sourced from the same operator scan-entry endpoint used in the reference project."
          right={<SearchField value={scanSearch} onChange={setScanSearch} placeholder="Search ticket or booking..." />}
        >
          {scanRows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--sand)' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--cream-dark)' }}>
                  <tr>
                    {['Booking ID', 'Ticket ID', 'Visitor', 'Scanned At', 'Gate', 'Status'].map(label => (
                      <th key={label} className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scanRows.map(row => {
                    const tone = statusTone(row.status)
                    return (
                      <tr key={row.id} style={{ borderTop: '1px solid var(--sand)' }}>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{row.bookingId || '—'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.ticketId || '—'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.visitorName || '—'}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDisplayDateTime(row.scannedDate)}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{row.gateName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 font-medium" style={{ background: tone.bg, color: tone.color, fontSize: 11 }}>{row.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No scanned entries returned for this place.</div>
          )}
        </Panel>
      ) : null}
    </div>
  )
}
