'use client'

import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { BadgeCheck, Calendar, CalendarRange, ChevronDown, MapPin, Paperclip, SlidersHorizontal, Trash2, Upload, UserRound, Workflow, X } from 'lucide-react'

type Place = {
  placeId?: string | number
  placeName?: string
  id?: string | number
  name?: string
  active?: boolean
  deptName?: string
  districtName?: string
  categoryDto?: {
    bookingType?: string
  }
  [key: string]: unknown
}

type FilterValues = {
  placeId: string
  search: string
}

type TicketType = 'All' | 'Online' | 'Kiosk' | 'Custom'

type PlaceStatusShift = {
  id?: string
  shiftName?: string
  online?: boolean
  kiosk?: boolean
}

type PlaceStatusZone = {
  id?: string
  placeName?: string
  online?: boolean
  kiosk?: boolean
}

type PlaceStatusRecord = {
  id: string
  remark: string
  blockAll: string | boolean
  placeName: string
  fromDate: string
  toDate: string
  createdByName: string
  isActive: string | boolean
  isDelete: string | boolean
  shiftNames: PlaceStatusShift[]
  zoneNames: PlaceStatusZone[]
  online: boolean
  kiosk: boolean
  attachmentName?: string
}

type PlaceStatusResult = {
  totalRecords: number
  totalVehicle: number
  totalNotification: number
  noTicketsSold: number
  collectedAmount: number
  totalUsers: number
  noOfRefunds: number
  totalBookingsOnline: number
  totalBookingsOffline: number
  placeActiveDeactiveDtoList: PlaceStatusRecord[]
}

type PlaceQuotaOption = {
  id: string
  name: string
}

type PlaceQuotaDetails = {
  shiftDto: PlaceQuotaOption[]
  zoneDto: PlaceQuotaOption[]
}

type RangeDialogForm = {
  id: string | null
  startDate: string
  endDate: string
  type: TicketType
  remark: string
  attachmentName: string
  shiftIds: string[]
  zoneIds: string[]
}

const DEFAULT_RANGE_FORM: RangeDialogForm = {
  id: null,
  startDate: '',
  endDate: '',
  type: 'All',
  remark: '',
  attachmentName: '',
  shiftIds: [],
  zoneIds: [],
}

const DEFAULT_FILTERS: FilterValues = { placeId: '', search: '' }

function getPlaceId(place: Place) {
  const candidate =
    place.id ??
    (place as { id?: string | number }).id ??
    place.placeId ??
    (place as { place_id?: string | number }).place_id ??
    (place as { placeCode?: string | number }).placeCode ??
    (place as { placecode?: string | number }).placecode

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  return ''
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    (place as { placename?: string }).placename ??
    (place as { place_name?: string }).place_name ??
    place.name ??
    (place as { name?: string }).name

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

function extractPlaces(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as Place[]
  return list.filter(item => item && typeof item === 'object') as Place[]
}

function formatDisplayDate(value: string) {
  if (!value) return 'N/A'
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateRange(fromDate: string, toDate: string) {
  const from = formatDisplayDate(fromDate)
  const to = formatDisplayDate(toDate)
  return from === to ? from : `${from} - ${to}`
}

function toDateInputValue(value: string) {
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toEpochString(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return String(date.getTime())
}

function getTomorrowInputValue() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toBool(value: string | boolean | undefined) {
  if (typeof value === 'boolean') return value
  return String(value).toLowerCase() === 'true'
}

function getRecordType(record: PlaceStatusRecord) {
  if (toBool(record.blockAll)) return 'All'
  if (record.online && record.kiosk) return 'All'
  if (record.online) return 'Online'
  if (record.kiosk) return 'Kiosk'
  return 'Custom'
}

function applyTypeToRecord(record: PlaceStatusRecord, type: TicketType) {
  return {
    ...record,
    blockAll: type === 'All' ? 'true' : 'false',
    online: type === 'All' || type === 'Online',
    kiosk: type === 'All' || type === 'Kiosk',
  }
}

function chipStyle(type: string) {
  if (type === 'Online') {
    return { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
  }
  if (type === 'Kiosk') {
    return { background: 'rgba(200,146,42,0.14)', color: '#9A6700' }
  }
  if (type === 'Custom') {
    return { background: 'rgba(86,96,112,0.12)', color: '#475569' }
  }
  return { background: 'rgba(139,26,26,0.1)', color: 'var(--maroon)' }
}

function extractPlaceStatusResult(payload: unknown): PlaceStatusResult {
  const result = payload && typeof payload === 'object' ? (payload as { result?: Record<string, unknown> }).result ?? {} : {}
  const rowsRaw = Array.isArray(result.placeActiveDeactiveDtoList) ? result.placeActiveDeactiveDtoList : []

  const rows = rowsRaw
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: String(row.id ?? ''),
        remark: typeof row.remark === 'string' ? row.remark : '',
        blockAll: (row.blockAll as string | boolean | undefined) ?? false,
        placeName: typeof row.placeName === 'string' ? row.placeName : '',
        fromDate: String(row.fromDate ?? ''),
        toDate: String(row.toDate ?? ''),
        createdByName: typeof row.createdByName === 'string' ? row.createdByName : 'N/A',
        isActive: (row.isActive as string | boolean | undefined) ?? false,
        isDelete: (row.isDelete as string | boolean | undefined) ?? false,
        shiftNames: Array.isArray(row.shiftNames) ? (row.shiftNames as PlaceStatusShift[]) : [],
        zoneNames: Array.isArray(row.zoneNames) ? (row.zoneNames as PlaceStatusZone[]) : [],
        online: Boolean(row.online),
        kiosk: Boolean(row.kiosk),
        attachmentName: '',
      }
    })

  return {
    totalRecords: typeof result.totalRecords === 'number' ? result.totalRecords : rows.length,
    totalVehicle: typeof result.totalVehicle === 'number' ? result.totalVehicle : 0,
    totalNotification: typeof result.totalNotification === 'number' ? result.totalNotification : 0,
    noTicketsSold: typeof result.noTicketsSold === 'number' ? result.noTicketsSold : 0,
    collectedAmount: typeof result.collectedAmount === 'number' ? result.collectedAmount : 0,
    totalUsers: typeof result.totalUsers === 'number' ? result.totalUsers : 0,
    noOfRefunds: typeof result.noOfRefunds === 'number' ? result.noOfRefunds : 0,
    totalBookingsOnline: typeof result.totalBookingsOnline === 'number' ? result.totalBookingsOnline : 0,
    totalBookingsOffline: typeof result.totalBookingsOffline === 'number' ? result.totalBookingsOffline : 0,
    placeActiveDeactiveDtoList: rows,
  }
}

function extractPlaceQuotaDetails(payload: unknown): PlaceQuotaDetails {
  const result = payload && typeof payload === 'object' ? (payload as { result?: Record<string, unknown> }).result ?? {} : {}
  const shiftDto = Array.isArray(result.shiftDto) ? result.shiftDto : Array.isArray(result.shifts) ? result.shifts : []
  const zoneDto = Array.isArray(result.zoneDto) ? result.zoneDto : Array.isArray(result.zones) ? result.zones : []

  return {
    shiftDto: shiftDto
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const row = item as Record<string, unknown>
        return {
          id: String(row.id ?? ''),
          name: String(row.name ?? row.shiftName ?? ''),
        }
      }),
    zoneDto: zoneDto
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const row = item as Record<string, unknown>
        return {
          id: String(row.id ?? ''),
          name: String(row.name ?? row.placeName ?? ''),
        }
      }),
  }
}

interface FilterDialogProps {
  open: boolean
  values: FilterValues
  places: Place[]
  onChange: (value: FilterValues) => void
  onApply: () => void
  onReset: () => void
  onClose: () => void
}

function FilterDialog({ open, values, places, onChange, onApply, onReset, onClose }: FilterDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const normalizedSearch = values.search.trim().toLowerCase()
  const filteredPlaces = [...places]
    .sort((a, b) => getPlaceName(a).localeCompare(getPlaceName(b), 'en', { sensitivity: 'base' }))
    .filter(place => {
      if (!normalizedSearch) return true
      return getPlaceName(place).toLowerCase().includes(normalizedSearch)
    })

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: 'rgba(28,16,8,0.50)', zIndex: 1000, backdropFilter: 'blur(6px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl" style={{ background: '#fff', boxShadow: '0 32px 80px rgba(139,26,26,0.26)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 55%, #C8922A 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.16)' }}>
              <SlidersHorizontal size={19} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: '#fff' }}>
                Filter Place
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                Select one place to load live place status data
              </div>
            </div>
          </div>

          <button onClick={onClose} className="flex items-center justify-center rounded-xl" style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.16)', color: '#fff' }}>
            <ChevronDown size={15} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>

        <div className="px-7 py-7">
          <label className="mb-2 flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <SlidersHorizontal size={12} style={{ color: 'var(--maroon)' }} />
            Search Place
          </label>
          <input
            value={values.search}
            onChange={event => onChange({ ...values, search: event.target.value })}
            placeholder="Search place name"
            className="mb-5 w-full rounded-2xl px-4 py-3 outline-none"
            style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-dark)' }}
          />

          <label className="mb-2 flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <MapPin size={12} style={{ color: 'var(--maroon)' }} />
            Place List
          </label>
          <div className="relative">
            <select
              value={values.placeId}
              onChange={event => onChange({ ...values, placeId: event.target.value })}
              className="w-full appearance-none rounded-2xl px-4 py-3 pr-10 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-dark)' }}
            >
              <option value="">Select Place</option>
              {filteredPlaces.map(place => (
                <option key={getPlaceId(place)} value={getPlaceId(place)}>
                  {getPlaceName(place)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--sand-dark)' }} />
          </div>
        </div>

        <div className="flex items-center justify-between px-7 py-4" style={{ background: 'var(--cream)', borderTop: '1px solid var(--sand)' }}>
          <button onClick={onReset} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
            Clear
          </button>
          <button onClick={onApply} className="rounded-xl px-8 py-2.5 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

interface RangeDialogProps {
  open: boolean
  title: string
  values: RangeDialogForm
  isInventory: boolean
  quotaDetails: PlaceQuotaDetails | null
  onChange: (value: RangeDialogForm) => void
  onClose: () => void
  onSave: () => void
}

function RangeDialog({ open, title, values, isInventory, quotaDetails, onChange, onClose, onSave }: RangeDialogProps) {
  if (!open) return null

  const minDate = getTomorrowInputValue()
  const hasType = values.type === 'All' || values.type === 'Online' || values.type === 'Kiosk'
  const isFormValid = isInventory
    ? hasType && values.zoneIds.length > 0 && values.shiftIds.length > 0 && values.remark.trim().length > 0
    : hasType && values.remark.trim().length > 0

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: 'rgba(28,16,8,0.46)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl" style={{ background: '#fff', boxShadow: '0 24px 60px rgba(48,16,8,0.18)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 55%, #C8922A 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.14)' }}>
              <CalendarRange size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: '#fff' }}>
                {title}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>
                Select date range, type, remark and attachment
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.16)' }}>
            <X size={15} color="#fff" />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
          <DialogField label="From Date" icon={<Calendar size={12} style={{ color: 'var(--maroon)' }} />}>
            <input
              type="date"
              value={values.startDate}
              onChange={event => onChange({ ...values, startDate: event.target.value })}
              min={minDate}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            />
          </DialogField>

          <DialogField label="To Date" icon={<Calendar size={12} style={{ color: 'var(--maroon)' }} />}>
            <input
              type="date"
              value={values.endDate}
              onChange={event => onChange({ ...values, endDate: event.target.value })}
              min={values.startDate || minDate}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            />
          </DialogField>

          <DialogField label="Select Type" icon={<BadgeCheck size={12} style={{ color: 'var(--maroon)' }} />}>
            <div className="relative">
              <select
                value={values.type}
                onChange={event => onChange({ ...values, type: event.target.value as TicketType })}
                className="w-full appearance-none rounded-2xl px-4 py-3 pr-10 outline-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
              >
                <option value="All">All</option>
                <option value="Online">Online</option>
                <option value="Kiosk">Kiosk</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--sand-dark)' }} />
            </div>
          </DialogField>

          {isInventory && quotaDetails ? (
            <>
              <DialogField label="Select Zone" icon={<MapPin size={12} style={{ color: 'var(--maroon)' }} />}>
                <div className="relative">
                  <select
                    value={values.zoneIds.length === quotaDetails.zoneDto.length ? 'ALL' : values.zoneIds[0] || ''}
                    onChange={event => {
                      const value = event.target.value
                      if (value === 'ALL') {
                        onChange({ ...values, zoneIds: quotaDetails.zoneDto.map(item => item.id) })
                      } else {
                        onChange({ ...values, zoneIds: value ? [value] : [] })
                      }
                    }}
                    className="w-full appearance-none rounded-2xl px-4 py-3 pr-10 outline-none"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                  >
                    <option value="">Select Zone</option>
                    <option value="ALL">All Zones</option>
                    {quotaDetails.zoneDto.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--sand-dark)' }} />
                </div>
              </DialogField>

              <DialogField label="Select Shift" icon={<CalendarRange size={12} style={{ color: 'var(--maroon)' }} />}>
                <div className="relative">
                  <select
                    value={values.shiftIds.length === quotaDetails.shiftDto.length ? 'ALL' : values.shiftIds[0] || ''}
                    onChange={event => {
                      const value = event.target.value
                      if (value === 'ALL') {
                        onChange({ ...values, shiftIds: quotaDetails.shiftDto.map(item => item.id) })
                      } else {
                        onChange({ ...values, shiftIds: value ? [value] : [] })
                      }
                    }}
                    className="w-full appearance-none rounded-2xl px-4 py-3 pr-10 outline-none"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                  >
                    <option value="">Select Shift</option>
                    <option value="ALL">All Shifts</option>
                    {quotaDetails.shiftDto.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--sand-dark)' }} />
                </div>
              </DialogField>
            </>
          ) : null}

          <DialogField label="Attachment" icon={<Paperclip size={12} style={{ color: 'var(--maroon)' }} />}>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px dashed var(--sand-dark)' }}>
              <Upload size={15} style={{ color: 'var(--maroon)' }} />
              <div className="min-w-0">
                <div style={{ fontSize: 12, color: 'var(--text-dark)', fontWeight: 500 }}>
                  {values.attachmentName || 'Upload supporting file'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>JPG, PNG or PDF</div>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={event => onChange({ ...values, attachmentName: event.target.files?.[0]?.name ?? '' })}
              />
            </label>
          </DialogField>

          <div className="md:col-span-2">
            <DialogField label="Remark" icon={<Paperclip size={12} style={{ color: 'var(--maroon)' }} />}>
              <textarea
                value={values.remark}
                onChange={event => onChange({ ...values, remark: event.target.value })}
                rows={4}
                placeholder="Add a short remark"
                className="w-full rounded-2xl px-4 py-3 outline-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13, resize: 'none' }}
              />
            </DialogField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={!isFormValid} className="rounded-xl px-7 py-2.5 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14, opacity: isFormValid ? 1 : 0.5 }}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function DialogField({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.45px' }}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

export function PlaceActiveStatusScreen() {
  const [places, setPlaces] = useState<Place[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState('')

  const [filterOpen, setFilterOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS)

  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [statusResult, setStatusResult] = useState<PlaceStatusResult | null>(null)
  const [editableRows, setEditableRows] = useState<PlaceStatusRecord[]>([])
  const [placeActive, setPlaceActive] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [quotaLoading, setQuotaLoading] = useState(false)
  const [quotaDetails, setQuotaDetails] = useState<PlaceQuotaDetails | null>(null)
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false)
  const [rangeDialogTitle, setRangeDialogTitle] = useState('Inactive By Date Range')
  const [rangeForm, setRangeForm] = useState<RangeDialogForm>(DEFAULT_RANGE_FORM)

  useEffect(() => {
    let active = true

    const loadPlaces = async () => {
      setPlacesLoading(true)
      setPlacesError('')
      try {
        const response = await fetch('/api/place?size=2000', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to fetch places.')
        }
        const payload = await response.json()
        if (!active) return
        const nextPlaces = extractPlaces(payload)
        setPlaces(nextPlaces)
      } catch (error) {
        if (!active) return
        setPlacesError(error instanceof Error ? error.message : 'Unable to load places.')
      } finally {
        if (active) setPlacesLoading(false)
      }
    }

    loadPlaces()
    return () => {
      active = false
    }
  }, [])

  const refreshPlaceStatus = async (placeId: string) => {
    setStatusLoading(true)
    setStatusError('')
    try {
      const response = await fetch(`/api/system/placeStatus?placeId=${encodeURIComponent(placeId)}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(typeof payload?.message === 'string' ? payload.message : `Failed to fetch place status (${response.status}).`)
      }
      const parsed = extractPlaceStatusResult(payload)
      setStatusResult(parsed)
      setEditableRows(parsed.placeActiveDeactiveDtoList)
      setPlaceActive(
        parsed.placeActiveDeactiveDtoList.length > 0
          ? toBool(parsed.placeActiveDeactiveDtoList[0]?.isActive)
          : true
      )
    } catch (error) {
      setStatusResult(null)
      setEditableRows([])
      setStatusError(error instanceof Error ? error.message : 'Unable to load place status.')
    } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => {
    if (!appliedFilters.placeId) {
      setStatusResult(null)
      setEditableRows([])
      setStatusError('')
      return
    }

    let active = true

    const loadPlaceStatus = async () => {
      setStatusLoading(true)
      setStatusError('')
      try {
        const response = await fetch(`/api/system/placeStatus?placeId=${encodeURIComponent(appliedFilters.placeId)}`, {
          cache: 'no-store',
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(typeof payload?.message === 'string' ? payload.message : `Failed to fetch place status (${response.status}).`)
        }
        if (!active) return
        const parsed = extractPlaceStatusResult(payload)
        setStatusResult(parsed)
        setEditableRows(parsed.placeActiveDeactiveDtoList)
        setPlaceActive(
          parsed.placeActiveDeactiveDtoList.length > 0
            ? toBool(parsed.placeActiveDeactiveDtoList[0]?.isActive)
            : true
        )
      } catch (error) {
        if (!active) return
        setStatusResult(null)
        setEditableRows([])
        setStatusError(error instanceof Error ? error.message : 'Unable to load place status.')
      } finally {
        if (active) setStatusLoading(false)
      }
    }

    loadPlaceStatus()
    return () => {
      active = false
    }
  }, [appliedFilters.placeId])

  const selectedPlace = useMemo(
    () => places.find(place => getPlaceId(place) === appliedFilters.placeId) ?? null,
    [places, appliedFilters.placeId]
  )

  const selectedPlaceName = selectedPlace ? getPlaceName(selectedPlace) : ''
  const isInventory = String(selectedPlace?.categoryDto?.bookingType ?? '').toUpperCase() === 'INVENTORY'
  const placeRows = editableRows
  const placeDisplayName = placeRows[0]?.placeName || selectedPlaceName

  const statusChips = useMemo(() => {
    const total = placeRows.length
    const all = placeRows.filter(row => getRecordType(row) === 'All').length
    const online = placeRows.filter(row => getRecordType(row) === 'Online').length
    const kiosk = placeRows.filter(row => getRecordType(row) === 'Kiosk').length
    return { total, all, online, kiosk }
  }, [placeRows])

  const applyFilter = () => {
    setAppliedFilters(pendingFilters)
    setFilterOpen(false)
  }

  const resetFilter = () => {
    setPendingFilters(DEFAULT_FILTERS)
  }

  const loadQuotaDetails = async (placeId: string) => {
    setQuotaLoading(true)
    try {
      const response = await fetch(`/api/system/placeQuota?placeId=${encodeURIComponent(placeId)}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(typeof payload?.message === 'string' ? payload.message : 'Unable to load place details.')
      }
      setQuotaDetails(extractPlaceQuotaDetails(payload))
    } catch (error) {
      setQuotaDetails(null)
      setStatusError(error instanceof Error ? error.message : 'Unable to load place details.')
    } finally {
      setQuotaLoading(false)
    }
  }

  const openCreateRangeDialog = () => {
    const tomorrow = getTomorrowInputValue()
    if (isInventory && appliedFilters.placeId) {
      void loadQuotaDetails(appliedFilters.placeId)
    } else {
      setQuotaDetails(null)
    }
    setRangeDialogTitle('Inactive By Date Range')
    setRangeForm({
      ...DEFAULT_RANGE_FORM,
      startDate: tomorrow,
      endDate: tomorrow,
      type: 'All',
    })
    setRangeDialogOpen(true)
  }

  const openEditRangeDialog = (row: PlaceStatusRecord) => {
    if (isInventory && appliedFilters.placeId) {
      void loadQuotaDetails(appliedFilters.placeId)
    } else {
      setQuotaDetails(null)
    }
    setRangeDialogTitle('Update Inactive Date Range')
    setRangeForm({
      id: row.id,
      startDate: toDateInputValue(row.fromDate),
      endDate: toDateInputValue(row.toDate),
      type: getRecordType(row),
      remark: row.remark,
      attachmentName: row.attachmentName ?? '',
      shiftIds: row.shiftNames.map(item => item.id).filter(Boolean) as string[],
      zoneIds: row.zoneNames.map(item => item.id).filter(Boolean) as string[],
    })
    setRangeDialogOpen(true)
  }

  const saveRange = async () => {
    if (!rangeForm.startDate || !rangeForm.endDate || !appliedFilters.placeId) return

    setActionLoading(true)
    setStatusError('')
    try {
      const payload = {
        ...(rangeForm.id ? { id: rangeForm.id } : {}),
        attachment: rangeForm.attachmentName || '',
        blockAll: false,
        fromDate: Number(toEpochString(rangeForm.startDate)),
        kiosk: rangeForm.type === 'All' || rangeForm.type === 'Kiosk',
        online: rangeForm.type === 'All' || rangeForm.type === 'Online',
        placeId: appliedFilters.placeId,
        remark: rangeForm.remark,
        shiftIds: rangeForm.shiftIds,
        toDate: Number(toEpochString(rangeForm.endDate)),
        zoneIds: rangeForm.zoneIds,
      }

      const response = await fetch('/api/system/placeStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(typeof result?.message === 'string' ? result.message : 'Unable to save inactive date range.')
      }

      setRangeDialogOpen(false)
      setRangeForm(DEFAULT_RANGE_FORM)
      await refreshPlaceStatus(appliedFilters.placeId)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Unable to save inactive date range.')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteRange = async (id: string) => {
    if (!appliedFilters.placeId) return
    setActionLoading(true)
    setStatusError('')
    try {
      const response = await fetch(`/api/system/placeStatus?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(typeof result?.message === 'string' ? result.message : 'Unable to delete inactive date range.')
      }
      await refreshPlaceStatus(appliedFilters.placeId)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Unable to delete inactive date range.')
    } finally {
      setActionLoading(false)
    }
  }

  const togglePlaceActive = async () => {
    if (!appliedFilters.placeId) return
    setActionLoading(true)
    setStatusError('')
    try {
      const nextActive = placeActive ? false : true
      const response = await fetch('/api/system/placeActivate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: appliedFilters.placeId, active: nextActive }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(typeof result?.message === 'string' ? result.message : 'Unable to update place active status.')
      }
      setPlaceActive(nextActive)
      await refreshPlaceStatus(appliedFilters.placeId)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Unable to update place active status.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <FilterDialog
        open={filterOpen}
        values={pendingFilters}
        places={places}
        onChange={setPendingFilters}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterOpen(false)}
      />
      <RangeDialog
        open={rangeDialogOpen}
        title={rangeDialogTitle}
        values={rangeForm}
        isInventory={isInventory}
        quotaDetails={quotaDetails}
        onChange={setRangeForm}
        onClose={() => setRangeDialogOpen(false)}
        onSave={saveRange}
      />

      <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="page-enter flex-1 overflow-y-auto">
            <div style={{ fontFamily: "'Outfit',sans-serif", color: 'var(--text-dark)' }}>
              <div className="px-6 py-2.5" style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>System</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 6px' }}>›</span>
                <span style={{ fontSize: 12, color: 'var(--maroon)', fontWeight: 500 }}>Place Active Status</span>
              </div>

              <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
                <div>
                  <h2 className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>
                    Place Active / Inactive Control
                  </h2>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Live place status details loaded by selected place id.
                  </p>
                </div>

                <button
                  onClick={() => setFilterOpen(true)}
                  className="relative flex items-center gap-2 rounded-2xl px-4 py-2.5 font-medium"
                  style={{
                    fontSize: 12,
                    background: appliedFilters.placeId ? 'var(--maroon)' : 'var(--cream-dark)',
                    border: `1px solid ${appliedFilters.placeId ? 'var(--maroon)' : 'var(--sand)'}`,
                    color: appliedFilters.placeId ? '#fff' : 'var(--text-mid)',
                  }}
                >
                  <SlidersHorizontal size={14} />
                  Filter
                </button>
              </div>

              <div className="p-6">
                {!appliedFilters.placeId ? (
                  <EmptyState
                    title={placesLoading ? 'Loading places...' : 'Select a place to continue'}
                    description={placesError || 'Use the filter button to choose one place and load its place status data.'}
                    onOpen={() => setFilterOpen(true)}
                  />
                ) : statusLoading ? (
                  <EmptyState title="Loading place status..." description="Fetching live place details and inactive ranges for the selected place." />
                ) : statusError ? (
                  <EmptyState title="Unable to load place status" description={statusError} onOpen={() => setFilterOpen(true)} />
                ) : (
                  <div className="space-y-5">
                    <div
                      className="overflow-hidden rounded-[28px]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(107,18,18,0.96) 0%, rgba(160,48,48,0.96) 48%, rgba(200,146,42,0.95) 100%)',
                        boxShadow: '0 24px 55px rgba(139,26,26,0.16)',
                      }}
                    >
                      <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.35fr_0.9fr]">
                        <div className="space-y-4">
                          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.14)' }}>
                            <MapPin size={13} color="#F9E1A7" />
                            <span style={{ fontSize: 11, color: '#FFF3D2', fontWeight: 600, letterSpacing: '0.3px' }}>Selected Place</span>
                          </div>

                          <div>
                            <div className="font-serif font-bold" style={{ fontSize: 28, lineHeight: 1.15, color: '#fff' }}>
                              {placeDisplayName || 'N/A'}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full px-3 py-1 font-semibold" style={{ fontSize: 11, background: 'rgba(255,255,255,0.14)', color: '#FFF3D2' }}>
                                {statusChips.total} range entr{statusChips.total === 1 ? 'y' : 'ies'}
                              </span>
                              <span className="rounded-full px-3 py-1 font-semibold" style={{ fontSize: 11, background: 'rgba(26,122,110,0.18)', color: '#D8FFF7' }}>
                                Online {statusResult?.totalBookingsOnline ?? 0}
                              </span>
                              <span className="rounded-full px-3 py-1 font-semibold" style={{ fontSize: 11, background: 'rgba(200,146,42,0.18)', color: '#FFF1C7' }}>
                                Offline {statusResult?.totalBookingsOffline ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <HeroInfo icon={<CalendarRange size={14} color="#fff" />} label="Inactive Range Records" value={String(statusResult?.totalRecords ?? 0)} />
                          <HeroInfo icon={<UserRound size={14} color="#fff" />} label="Latest Created By" value={placeRows[0]?.createdByName || 'N/A'} />
                          <HeroInfo icon={<Workflow size={14} color="#fff" />} label="Type Split" value={`All ${statusChips.all} | Online ${statusChips.online} | Kiosk ${statusChips.kiosk}`} />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-6">
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: 12, color: '#FFF3D2', fontWeight: 600 }}>Place Action</span>
                          <button
                            onClick={togglePlaceActive}
                            disabled={actionLoading}
                            className="relative rounded-full"
                            style={{ width: 54, height: 30, background: placeActive ? '#1A7A6E' : '#C53030', border: '1px solid rgba(255,255,255,0.28)', opacity: actionLoading ? 0.6 : 1 }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: 3,
                                left: placeActive ? 28 : 3,
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                background: '#fff',
                                transition: 'left 0.15s ease',
                              }}
                            />
                          </button>
                          <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{placeActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <button
                          onClick={openCreateRangeDialog}
                          disabled={actionLoading}
                          className="rounded-2xl px-4 py-2.5 font-semibold text-white"
                          style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 12, opacity: actionLoading ? 0.6 : 1 }}
                        >
                          Inactive By Date Range
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[26px]" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                      <div className="flex items-center justify-between px-5 py-4" style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                        <div>
                          <div className="font-serif font-semibold" style={{ fontSize: 19, color: 'var(--text-dark)' }}>
                            Inactive Ranges By Place
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Showing live rows from `placeActiveDeactiveDtoList`
                          </div>
                        </div>
                        <div className="rounded-full px-3 py-1" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 11, color: 'var(--maroon)', fontWeight: 600 }}>
                          {placeRows.length} entries
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr style={{ background: '#fff7eb', borderBottom: '1px solid var(--sand)' }}>
                              {['Sr.No', 'Inactive Date Range', 'Type', 'Remark', 'Attachment', 'Shifts', 'Zones', 'Created By', 'Status', 'Action'].map((heading, index) => (
                                <th
                                  key={heading}
                                  style={{
                                    padding: '12px 16px',
                                    textAlign: index === 0 ? 'center' : 'left',
                                    fontSize: 10,
                                    color: 'var(--text-muted)',
                                    letterSpacing: '0.75px',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {heading}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {placeRows.length === 0 ? (
                              <tr>
                                <td colSpan={10} style={{ padding: 44, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                  No inactive ranges returned for this place.
                                </td>
                              </tr>
                            ) : (
                              placeRows.map((row, index) => {
                                const type = getRecordType(row)
                                return (
                                  <tr key={row.id || `${row.fromDate}-${row.toDate}-${index}`} style={{ borderBottom: '1px solid var(--cream-dark)', background: index % 2 === 0 ? '#fff' : '#FFFCF8' }}>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: 'var(--maroon)', fontWeight: 700 }}>{index + 1}</td>
                                    <td style={{ padding: '14px 16px', minWidth: 180 }}>
                                      <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-dark)', fontWeight: 600 }}>
                                        <Calendar size={13} style={{ color: 'var(--maroon)' }} />
                                        {formatDateRange(row.fromDate, row.toDate)}
                                      </div>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                      <span className="rounded-full px-3 py-1 font-semibold" style={{ fontSize: 10, ...chipStyle(type) }}>
                                        {type}
                                      </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-mid)', minWidth: 260 }}>
                                      {row.remark || 'No remark added'}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontSize: 11, color: row.attachmentName ? 'var(--text-dark)' : 'var(--text-muted)', minWidth: 150 }}>
                                      {row.attachmentName || 'No file'}
                                    </td>
                                    <td style={{ padding: '14px 16px', minWidth: 210 }}>
                                      <BadgeList values={row.shiftNames.map(item => item.shiftName).filter(Boolean) as string[]} fallback="No shifts" />
                                    </td>
                                    <td style={{ padding: '14px 16px', minWidth: 210 }}>
                                      <BadgeList values={row.zoneNames.map(item => item.placeName).filter(Boolean) as string[]} fallback="No zones" />
                                    </td>
                                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-dark)', fontWeight: 600 }}>
                                      {row.createdByName || 'N/A'}
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                      <span
                                        className="rounded-full px-3 py-1 font-semibold"
                                        style={{
                                          fontSize: 10,
                                          background: toBool(row.isActive) ? 'rgba(26,122,110,0.12)' : 'rgba(229,62,62,0.10)',
                                          color: toBool(row.isActive) ? '#1A7A6E' : '#C53030',
                                        }}
                                      >
                                        {toBool(row.isActive) ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => openEditRangeDialog(row)}
                                          disabled={actionLoading}
                                          className="flex items-center gap-1.5 rounded-xl px-3 py-2"
                                          style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 11, fontWeight: 600, opacity: actionLoading ? 0.6 : 1 }}
                                        >
                                          <Calendar size={12} />
                                          Calendar
                                        </button>
                                        <button
                                          onClick={() => deleteRange(row.id)}
                                          disabled={actionLoading}
                                          className="flex items-center gap-1.5 rounded-xl px-3 py-2"
                                          style={{ background: 'rgba(229,62,62,0.1)', color: '#C53030', fontSize: 11, fontWeight: 600, opacity: actionLoading ? 0.6 : 1 }}
                                        >
                                          <Trash2 size={12} />
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default function PaymentReverifyView() {
  return <PlaceActiveStatusScreen />
}

function EmptyState({
  title,
  description,
  onOpen,
}: {
  title: string
  description: string
  onOpen?: () => void
}) {
  return (
    <div className="rounded-[28px] px-6 py-12 text-center" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--cream-dark)' }}>
        <MapPin size={22} style={{ color: 'var(--maroon)' }} />
      </div>
      <div className="font-serif font-semibold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>
        {title}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{description}</p>
      {onOpen ? (
        <button
          onClick={onOpen}
          className="mt-5 rounded-2xl px-5 py-2.5 font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}
        >
          Open Filter
        </button>
      ) : null}
    </div>
  )
}

function HeroInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-[22px] px-4 py-4" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.16)' }}>
      <div className="flex items-center gap-2">
        {icon}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: 700 }}>
          {label}
        </div>
      </div>
      <div className="mt-2 font-serif font-bold" style={{ fontSize: 18, color: '#fff', lineHeight: 1.25 }}>
        {value}
      </div>
    </div>
  )
}

function BadgeList({ values, fallback }: { values: string[]; fallback: string }) {
  if (values.length === 0) {
    return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fallback}</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map(value => (
        <span key={value} className="rounded-full px-2.5 py-1" style={{ fontSize: 10, background: 'var(--cream-dark)', color: 'var(--text-mid)', fontWeight: 600 }}>
          {value}
        </span>
      ))}
    </div>
  )
}
