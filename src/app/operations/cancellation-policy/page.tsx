'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { authFetch } from '@/lib/api/authFetch'

type Place = {
  id?: string | number
  placeId?: string | number
  name?: string
  placeName?: string
  abbreviation?: string
  [key: string]: unknown
}

type CancellationRule = {
  id: string
  timeFrame: string
  returnPercentage: number
  startDay: number
  endDay: number
  ruleNote: string
  sequence?: number
}

type CancellationPolicy = {
  id: string
  name: string
  description: string
  attachment: string
  active: boolean
  delete: boolean
  rulesCount: number
  placeId: string
  placeName: string
  cancellationRules: CancellationRule[]
}

type PolicyPlaceUsage = {
  id: string
  placeName: string
  seasonName: string
  departmentName: string
  policyUse: number
}

type PolicyFormState = {
  id: string | null
  name: string
  description: string
  attachment: string
  placeId: string
  cancellationRules: CancellationRule[]
}

type RuleFormState = {
  id: string | null
  timeFrame: string
  returnPercentage: string
  startDay: string
  endDay: string
  ruleNote: string
}

type FilterState = {
  placeId: string
  status: 'all' | 'active' | 'inactive'
}

type ConfirmState =
  | { type: 'delete'; item: CancellationPolicy }
  | { type: 'toggle'; item: CancellationPolicy }
  | null

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const DEFAULT_FILTERS: FilterState = {
  placeId: '',
  status: 'all',
}

const DEFAULT_FORM: PolicyFormState = {
  id: null,
  name: '',
  description: '',
  attachment: '',
  placeId: '',
  cancellationRules: [],
}

const DEFAULT_RULE_FORM: RuleFormState = {
  id: null,
  timeFrame: '',
  returnPercentage: '',
  startDay: '',
  endDay: '',
  ruleNote: '',
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
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

function extractPlaces(payload: unknown): Place[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as Place[]
}

function getPlaceId(place: Place) {
  const candidate =
    place.id ??
    place.placeId ??
    (place as { place_id?: string | number }).place_id ??
    (place as { placeCode?: string | number }).placeCode

  return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : ''
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    place.name ??
    (place as { place_name?: string }).place_name ??
    (place as { placename?: string }).placename

  return typeof candidate === 'string' ? candidate.trim() : ''
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

function normalizeRules(value: unknown): CancellationRule[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const row = item as Record<string, unknown>
      return {
        id: String(row.id ?? `rule-${index + 1}`),
        timeFrame: typeof row.timeFrame === 'string' ? row.timeFrame : '',
        returnPercentage: Number(row.returnPercentage ?? 0),
        startDay: Number(row.startDay ?? 0),
        endDay: Number(row.endDay ?? 0),
        ruleNote: typeof row.ruleNote === 'string' ? row.ruleNote : '',
        sequence: typeof row.sequence === 'number' ? row.sequence : index,
      }
    })
}

function extractPolicies(payload: unknown): CancellationPolicy[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const list = Array.isArray(result.cancellationPolicyDtos)
    ? result.cancellationPolicyDtos
    : result && typeof result === 'object' && ('id' in result || 'name' in result)
    ? [result]
    : []

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      const placeValue = row.placeId ?? row.placeID ?? row.place_id
      return {
        id: String(row.id ?? ''),
        name: typeof row.name === 'string' ? row.name : '',
        description: typeof row.description === 'string' ? row.description : '',
        attachment: typeof row.attachment === 'string' ? row.attachment : '',
        active: Boolean(row.active),
        delete: Boolean(row.delete),
        rulesCount: typeof row.rulesCount === 'number' ? row.rulesCount : Array.isArray(row.cancellationRules) ? row.cancellationRules.length : 0,
        placeId: typeof placeValue === 'string' || typeof placeValue === 'number' ? String(placeValue) : '',
        placeName: typeof row.placeName === 'string' ? row.placeName : '',
        cancellationRules: normalizeRules(row.cancellationRules),
      }
    })
}

function extractUploadUrl(payload: unknown) {
  if (payload && typeof payload === 'object') {
    const result = (payload as { result?: unknown }).result
    if (typeof result === 'string' && result.trim()) return result.trim()

    if (result && typeof result === 'object') {
      const candidate = (result as Record<string, unknown>).url ?? (result as Record<string, unknown>).path
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    }
  }

  return ''
}

function extractPolicyPlaceUsages(payload: unknown): PolicyPlaceUsage[] {
  const list = findFirstArray(payload)
  if (!list) return []

  return list
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const row = item as Record<string, unknown>
      return {
        id: String(row.id ?? `${row.placeId ?? row.placeName ?? index}`),
        placeName: typeof row.placeName === 'string' ? row.placeName : '',
        seasonName: typeof row.seasonName === 'string' ? row.seasonName : '',
        departmentName: typeof row.departmentName === 'string' ? row.departmentName : '',
        policyUse: Number(row.policyUse ?? row.policyUsed ?? 0),
      }
    })
}

function formatRuleRange(rule: CancellationRule) {
  return `${rule.startDay} to ${rule.endDay} days`
}

function openAttachmentInNewTab(url: string) {
  if (!url || typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function getOffset(page: number, pageSize: number) {
  return Math.max(0, (page - 1) * pageSize)
}

function getAttachmentLabel(url: string) {
  if (!url) return 'No attachment'
  const withoutQuery = url.split('?')[0] ?? url
  const segments = withoutQuery.split('/')
  const fileName = segments[segments.length - 1] ?? url
  const parts = fileName.split('_')
  return (parts[parts.length - 1] ?? fileName).trim()
}

function chipStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
    pages.add(i)
  }
  if (totalPages > 1) pages.add(totalPages)
  return Array.from(pages).sort((a, b) => a - b)
}

function validateRuleForm(rule: RuleFormState, existingRules: CancellationRule[], editingRuleId: string | null) {
  const timeFrame = rule.timeFrame.trim()
  const ruleNote = rule.ruleNote.trim()
  const returnPercentage = Number(rule.returnPercentage)
  const startDay = Number(rule.startDay)
  const endDay = Number(rule.endDay)

  if (!timeFrame) return 'Time frame is required.'
  if (!ruleNote) return 'Rule note is required.'
  if (rule.returnPercentage === '' || Number.isNaN(returnPercentage) || returnPercentage < 0 || returnPercentage > 100) {
    return 'Return percentage must be between 0 and 100.'
  }
  if (rule.startDay === '' || Number.isNaN(startDay) || startDay < 0) return 'Start day must be 0 or greater.'
  if (rule.endDay === '' || Number.isNaN(endDay) || endDay < 0) return 'End day must be 0 or greater.'
  if (startDay >= endDay) return 'End day must be greater than start day.'

  for (const item of existingRules) {
    if (editingRuleId && item.id === editingRuleId) continue

    if (item.timeFrame.trim().toLowerCase() === timeFrame.toLowerCase()) {
      return 'Time frame must be unique.'
    }

    const overlaps = startDay <= item.endDay && endDay >= item.startDay
    if (overlaps) {
      return 'Start day and end day overlap with an existing rule.'
    }
  }

  return ''
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

function FilterDialog({
  open,
  places,
  values,
  onChange,
  onClose,
  onApply,
  onReset,
}: {
  open: boolean
  places: Place[]
  values: FilterState
  onChange: (value: FilterState) => void
  onClose: () => void
  onApply: () => void
  onReset: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(28,16,8,0.54)', zIndex: 1000, backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: '0 36px 90px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.16)' }}>
              <SlidersHorizontal size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 22 }}>Filter Policies</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>Refine the cancellation policy listing</div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 px-7 py-7">
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Place</label>
            <select
              value={values.placeId}
              onChange={event => onChange({ ...values, placeId: event.target.value })}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            >
              <option value="">All Places</option>
              {places
                .slice()
                .sort((a, b) => getPlaceName(a).localeCompare(getPlaceName(b), 'en', { sensitivity: 'base' }))
                .map(place => (
                  <option key={getPlaceId(place)} value={getPlaceId(place)}>
                    {getPlaceName(place)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => onChange({ ...values, status: option.id as FilterState['status'] })}
                  className="rounded-full px-4 py-2 font-medium"
                  style={{
                    background: values.status === option.id ? 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' : '#F8F4EE',
                    color: values.status === option.id ? '#fff' : 'var(--text-mid)',
                    border: values.status === option.id ? 'none' : '1px solid var(--sand)',
                    fontSize: 13,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-7 py-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
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

function RuleDialog({
  open,
  form,
  error,
  loading,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean
  form: RuleFormState
  error: string
  loading: boolean
  onChange: (value: RuleFormState) => void
  onClose: () => void
  onSave: () => void
}) {
  if (!open) return null

  const returnPercentage = Number(form.returnPercentage || 0)

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 py-6" style={{ background: 'rgba(28,16,8,0.48)', zIndex: 1020, backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #942626 52%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>{form.id ? 'Update Rule' : 'Add Rule'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>Manage refund windows and return percentages</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-7">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Frame</label>
              <input value={form.timeFrame} onChange={event => onChange({ ...form, timeFrame: event.target.value })} placeholder="Enter time frame name" className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
            </div>

            <div>
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Return Percentage</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onChange({ ...form, returnPercentage: String(Math.max(0, returnPercentage - 1)) })}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                >
                  -
                </button>
                <input type="number" min="0" max="100" value={form.returnPercentage} onChange={event => onChange({ ...form, returnPercentage: event.target.value })} placeholder="0 to 100" className="w-full rounded-2xl px-4 py-3 text-center outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
                <button
                  type="button"
                  onClick={() => onChange({ ...form, returnPercentage: String(Math.min(100, returnPercentage + 1)) })}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start Day</label>
                <input type="number" min="0" value={form.startDay} onChange={event => onChange({ ...form, startDay: event.target.value })} placeholder="0" className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
              </div>
              <div>
                <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>End Day</label>
                <input type="number" min="0" value={form.endDay} onChange={event => onChange({ ...form, endDay: event.target.value })} placeholder="0" className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rule Note</label>
              <textarea value={form.ruleNote} onChange={event => onChange({ ...form, ruleNote: event.target.value })} rows={4} placeholder="Explain the refund rule" className="w-full resize-none rounded-[22px] px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, lineHeight: 1.6 }} />
            </div>

            {error ? <div className="lg:col-span-2 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-7 py-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={loading} className="rounded-xl px-8 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
            {loading ? 'Saving...' : form.id ? 'Update Rule' : 'Add Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PolicyEditorDialog({
  open,
  places,
  form,
  error,
  loading,
  uploading,
  onChange,
  onClose,
  onSave,
  onFileSelect,
  onAddRule,
  onEditRule,
  onDeleteRule,
}: {
  open: boolean
  places: Place[]
  form: PolicyFormState
  error: string
  loading: boolean
  uploading: boolean
  onChange: (value: PolicyFormState) => void
  onClose: () => void
  onSave: () => void
  onFileSelect: (file: File | null) => void
  onAddRule: () => void
  onEditRule: (rule: CancellationRule) => void
  onDeleteRule: (ruleId: string) => void
}) {
  const [placeDropdownOpen, setPlaceDropdownOpen] = useState(false)
  const [placeSearch, setPlaceSearch] = useState('')

  const sortedPlaces = useMemo(
    () => places.slice().sort((a, b) => getPlaceName(a).localeCompare(getPlaceName(b), 'en', { sensitivity: 'base' })),
    [places],
  )

  const filteredPlaces = useMemo(() => {
    const query = placeSearch.trim().toLowerCase()
    if (!query) return sortedPlaces

    return sortedPlaces.filter(place => {
      const name = getPlaceName(place).toLowerCase()
      const code = getPlaceId(place).toLowerCase()
      return name.includes(query) || code.includes(query)
    })
  }, [placeSearch, sortedPlaces])

  const selectedPlaceName = useMemo(() => {
    const selected = places.find(place => getPlaceId(place) === form.placeId)
    return selected ? getPlaceName(selected) : ''
  }, [places, form.placeId])

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 py-6" style={{ background: 'rgba(28,16,8,0.50)', zIndex: 1010, backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)', maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #942626 52%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>{form.id ? 'Update Cancellation Policy' : 'Create Cancellation Policy'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>Replicate the old module flow in the new Rajasthan admin design</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-7">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Policy Name</label>
              <input value={form.name} onChange={event => onChange({ ...form, name: event.target.value })} placeholder="Enter policy name" className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
            </div>

            <div>
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Place</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPlaceDropdownOpen(current => !current)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left outline-none"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                >
                  <span style={{ color: selectedPlaceName ? 'var(--text-dark)' : 'var(--text-muted)' }}>
                    {selectedPlaceName || 'Select Place'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{placeDropdownOpen ? '▲' : '▼'}</span>
                </button>

                {placeDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-[24px] bg-white" style={{ border: '1px solid var(--sand)', boxShadow: '0 20px 48px rgba(58,32,16,0.14)', zIndex: 20 }}>
                    <div className="border-b p-3" style={{ borderColor: 'var(--cream-dark)' }}>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input
                          value={placeSearch}
                          onChange={event => setPlaceSearch(event.target.value)}
                          placeholder="Search place"
                          className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none"
                          style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                        />
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2">
                      <button
                        type="button"
                        onClick={() => {
                          onChange({ ...form, placeId: '' })
                          setPlaceDropdownOpen(false)
                        }}
                        className="mb-1 w-full rounded-2xl px-3 py-3 text-left"
                        style={{ background: form.placeId === '' ? 'rgba(139,26,26,0.08)' : 'transparent', color: form.placeId === '' ? 'var(--maroon)' : 'var(--text-mid)', fontSize: 13 }}
                      >
                        Select Place
                      </button>
                      {filteredPlaces.length === 0 ? (
                        <div className="px-3 py-4 text-center" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          No places found.
                        </div>
                      ) : (
                        filteredPlaces.map(place => {
                          const placeId = getPlaceId(place)
                          const placeName = getPlaceName(place)
                          const selected = form.placeId === placeId

                          return (
                            <button
                              key={placeId}
                              type="button"
                              onClick={() => {
                                onChange({ ...form, placeId })
                                setPlaceDropdownOpen(false)
                              }}
                              className="mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
                              style={{ background: selected ? 'rgba(139,26,26,0.08)' : 'transparent', color: selected ? 'var(--maroon)' : 'var(--text-dark)', fontSize: 13 }}
                            >
                              <span>{placeName}</span>
                              {selected ? <CheckCircle2 size={15} /> : null}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
              <textarea value={form.description} onChange={event => onChange({ ...form, description: event.target.value })} rows={5} placeholder="Write policy description" className="w-full resize-none rounded-[22px] px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, lineHeight: 1.6 }} />
            </div>

            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attachment</label>
                {form.attachment ? (
                  <a href={form.attachment} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--maroon)', fontWeight: 600 }}>
                    View current PDF
                  </a>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-[24px] px-4 py-4" style={{ background: '#F8F4EE', border: '1px dashed var(--sand)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                    <Upload size={18} style={{ color: 'var(--maroon)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{uploading ? 'Uploading attachment...' : getAttachmentLabel(form.attachment)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Upload PDF for cancellation policy document</div>
                  </div>
                </div>
                <input type="file" accept="application/pdf" className="hidden" onChange={event => onFileSelect(event.target.files?.[0] ?? null)} />
                <span className="rounded-xl px-4 py-2 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>
                  Choose File
                </span>
              </label>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>Cancellation Rules</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add one or more refund windows exactly like the previous module</div>
                </div>
                <button onClick={onAddRule} className="rounded-2xl px-4 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 13 }}>
                  <span className="inline-flex items-center gap-2"><Plus size={15} />Add Rule</span>
                </button>
              </div>

              {form.cancellationRules.length === 0 ? (
                <div className="rounded-[24px] border border-dashed px-5 py-10 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
                  <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>No rules added yet</div>
                  <p className="mx-auto mt-2 max-w-lg" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    Each rule needs a time frame, start day, end day, return percentage, and note.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead style={{ background: 'linear-gradient(180deg, #FBF6EF 0%, #F4EBDF 100%)' }}>
                        <tr>
                          {['Time Frame', 'Range', 'Return %', 'Note', 'Actions'].map(label => (
                            <th key={label} className="px-4 py-4 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {form.cancellationRules.map((rule, index) => (
                          <tr key={rule.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{rule.timeFrame}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatRuleRange(rule)}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{rule.returnPercentage}%</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 280 }}>{rule.ruleNote}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => onEditRule(rule)} className="rounded-xl px-3 py-2 font-medium" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}>
                                  <span className="inline-flex items-center gap-1.5"><Pencil size={13} />Edit</span>
                                </button>
                                <button onClick={() => onDeleteRule(rule.id)} className="rounded-xl px-3 py-2 font-medium" style={{ background: 'rgba(159,31,31,0.08)', color: '#9F1F1F', fontSize: 12 }}>
                                  <span className="inline-flex items-center gap-1.5"><Trash2 size={13} />Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {error ? <div className="lg:col-span-2 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-7 py-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={loading || uploading} className="rounded-xl px-8 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
            {loading ? 'Saving...' : form.id ? 'Update Policy' : 'Create Policy'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PolicyDetailDialog({
  open,
  policy,
  placeUsages,
  placeUsagesLoading,
  placeUsageSearch,
  placeUsagePage,
  placeUsagePageSize,
  placeUsageTotalRecords,
  onPlaceUsageSearchChange,
  onPlaceUsagePageChange,
  onPlaceUsagePageSizeChange,
  onClose,
}: {
  open: boolean
  policy: CancellationPolicy | null
  placeUsages: PolicyPlaceUsage[]
  placeUsagesLoading: boolean
  placeUsageSearch: string
  placeUsagePage: number
  placeUsagePageSize: number
  placeUsageTotalRecords: number
  onPlaceUsageSearchChange: (value: string) => void
  onPlaceUsagePageChange: (page: number) => void
  onPlaceUsagePageSizeChange: (size: number) => void
  onClose: () => void
}) {
  if (!open || !policy) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 py-6" style={{ background: 'rgba(28,16,8,0.52)', zIndex: 1015, backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)', maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #942626 52%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>{policy.name || 'Cancellation Policy'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>{policy.placeName || 'No place mapped'}</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-7">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[24px] p-5" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Status</div>
              <div className="mt-2"><span className="rounded-full px-3 py-1" style={{ ...chipStyle(policy.active), fontSize: 11, fontWeight: 700 }}>{policy.active ? 'Active' : 'Inactive'}</span></div>
            </div>
            <div className="rounded-[24px] p-5" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Attachment</div>
              <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{getAttachmentLabel(policy.attachment)}</div>
              {policy.attachment ? (
                <button
                  type="button"
                  onClick={() => openAttachmentInNewTab(policy.attachment)}
                  style={{ fontSize: 12, color: 'var(--maroon)', fontWeight: 600 }}
                >
                  Open PDF
                </button>
              ) : null}
            </div>
            <div className="md:col-span-2 rounded-[24px] p-5" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Description</div>
              <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8 }}>{policy.description || 'No description available.'}</p>
            </div>
            <div className="md:col-span-2">
              <div className="mb-3 font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>Rules</div>
              {policy.cancellationRules.length === 0 ? (
                <div className="rounded-[24px] border border-dashed px-5 py-10 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No rules available.</div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {policy.cancellationRules.map(rule => (
                    <div key={rule.id} className="rounded-[24px] p-5" style={{ background: '#fff', border: '1px solid var(--cream-dark)' }}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <div style={{ fontSize: 16, color: 'var(--text-dark)', fontWeight: 700 }}>{rule.timeFrame}</div>
                        <span className="rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.14)', color: '#9A6700', fontSize: 11, fontWeight: 700 }}>
                          {rule.returnPercentage}% return
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatRuleRange(rule)}</div>
                      <p className="mt-2" style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7 }}>{rule.ruleNote}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>List of Places</div>
                <div className="relative sm:w-80">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={placeUsageSearch}
                    onChange={event => onPlaceUsageSearchChange(event.target.value)}
                    placeholder="Search place or season"
                    className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                  />
                </div>
              </div>

              {placeUsagesLoading ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-[24px]" style={{ background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)', border: '1px solid var(--cream-dark)' }}>
                  <RajasthanLoader label="Loading places..." />
                </div>
              ) : placeUsages.length === 0 ? (
                <div className="rounded-[24px] border border-dashed px-5 py-10 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    {placeUsageSearch.trim() ? 'No places matched the current search.' : 'No places are mapped to this policy.'}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border bg-white" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead style={{ background: 'linear-gradient(180deg, #FBF6EF 0%, #F4EBDF 100%)' }}>
                        <tr>
                          {['Place Name', 'Season', 'Department', 'Policy Used'].map(label => (
                            <th key={label} className="px-4 py-4 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {placeUsages.map((place, index) => (
                          <tr key={place.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{place.placeName || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{place.seasonName || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{place.departmentName || 'N/A'}</td>
                            <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{place.policyUse}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 pb-5">
                    <Pager
                      page={placeUsagePage}
                      pageSize={placeUsagePageSize}
                      totalRecords={placeUsageTotalRecords}
                      onPageChange={onPlaceUsagePageChange}
                      onPageSizeChange={onPlaceUsagePageSizeChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({
  state,
  loading,
  onClose,
  onConfirm,
}: {
  state: ConfirmState
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!state) return null

  const isDelete = state.type === 'delete'

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(28,16,8,0.46)', zIndex: 1030 }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-7" style={{ boxShadow: '0 30px 80px rgba(107,18,18,0.22)' }}>
        <div className="mb-3 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>
          {isDelete ? 'Delete policy?' : state.item.active ? 'Deactivate policy?' : 'Activate policy?'}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          {isDelete
            ? 'This will permanently remove the selected cancellation policy.'
            : `This will ${state.item.active ? 'deactivate' : 'activate'} the selected cancellation policy.`}
        </p>
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', fontSize: 13, color: 'var(--text-dark)' }}>
          {state.item.name}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
            style={{ background: isDelete ? 'linear-gradient(135deg, #9F1F1F 0%, #6B1212 100%)' : 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
          >
            {loading ? 'Please wait...' : isDelete ? 'Delete' : state.item.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CancellationPolicyPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [policies, setPolicies] = useState<CancellationPolicy[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [placesLoading, setPlacesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchText, setSearchText] = useState('sariska')
  const deferredSearch = useDeferredValue(searchText)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [editorOpen, setEditorOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [form, setForm] = useState<PolicyFormState>(DEFAULT_FORM)
  const [formError, setFormError] = useState('')
  const [ruleForm, setRuleForm] = useState<RuleFormState>(DEFAULT_RULE_FORM)
  const [ruleError, setRuleError] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState<CancellationPolicy | null>(null)
  const [detailPlaceUsages, setDetailPlaceUsages] = useState<PolicyPlaceUsage[]>([])
  const [detailPlaceUsagesLoading, setDetailPlaceUsagesLoading] = useState(false)
  const [detailPlaceUsageSearchText, setDetailPlaceUsageSearchText] = useState('')
  const detailPlaceUsageDeferredSearch = useDeferredValue(detailPlaceUsageSearchText)
  const [detailPlaceUsagePage, setDetailPlaceUsagePage] = useState(1)
  const [detailPlaceUsagePageSize, setDetailPlaceUsagePageSize] = useState(10)
  const [detailPlaceUsageTotalRecords, setDetailPlaceUsageTotalRecords] = useState(0)
  const hasInitializedListFilters = useRef(false)

  const filteredPlaceName = useMemo(() => {
    const place = places.find(item => getPlaceId(item) === appliedFilters.placeId)
    return place ? getPlaceName(place) : ''
  }, [places, appliedFilters.placeId])

  const activeCount = useMemo(() => policies.filter(item => item.active).length, [policies])

  async function loadPlaces() {
    setPlacesLoading(true)
    try {
      const response = await authFetch('/place?searchKey=&size=2000', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch places.'))

      setPlaces(extractPlaces(payload))
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to fetch places.')
    } finally {
      setPlacesLoading(false)
    }
  }

  async function loadPolicies() {
    setListLoading(true)
    setPageError('')

    const usingLocalFilters = Boolean(appliedFilters.placeId) || appliedFilters.status !== 'all'
    const requestedOffset = usingLocalFilters ? 0 : getOffset(page, pageSize)
    const requestedPageSize = usingLocalFilters ? 2000 : pageSize

    try {
      const query = new URLSearchParams({
        offSet: String(requestedOffset),
        size: String(requestedPageSize),
        searchKey: deferredSearch.trim(),
      })

      const response = await fetch(`/api/operations/cancellation-policy?${query.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch cancellation policies.'))

      const extractedPolicies = extractPolicies(payload).filter(item => !item.delete)

      if (usingLocalFilters) {
        const filtered = extractedPolicies.filter(item => {
          if (appliedFilters.placeId && item.placeId !== appliedFilters.placeId) return false
          if (appliedFilters.status === 'active' && !item.active) return false
          if (appliedFilters.status === 'inactive' && item.active) return false
          return true
        })

        const startIndex = (page - 1) * pageSize
        setTotalRecords(filtered.length)
        setPolicies(filtered.slice(startIndex, startIndex + pageSize))
      } else {
        setPolicies(extractedPolicies)
        setTotalRecords(extractTotalRecords(payload) || extractedPolicies.length)
      }
    } catch (error) {
      setPolicies([])
      setTotalRecords(0)
      setPageError(error instanceof Error ? error.message : 'Unable to fetch cancellation policies.')
    } finally {
      setListLoading(false)
    }
  }

  async function loadPolicyPlaceUsages(policyId: string, requestedPage: number, requestedPageSize: number, searchKey: string) {
    setDetailPlaceUsagesLoading(true)

    try {
      const query = new URLSearchParams({
        policyId,
        offSet: String(getOffset(requestedPage, requestedPageSize)),
        size: String(requestedPageSize),
        searchKey,
      })

      const response = await fetch(`/api/operations/cancellation-policy/places?${query.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to load mapped places for this cancellation policy.'))

      const placesList = extractPolicyPlaceUsages(payload)
      setDetailPlaceUsages(placesList)
      setDetailPlaceUsageTotalRecords(extractTotalRecords(payload) || placesList.length)
    } catch (error) {
      setDetailPlaceUsages([])
      setDetailPlaceUsageTotalRecords(0)
      setPageError(error instanceof Error ? error.message : 'Unable to load mapped places for this cancellation policy.')
    } finally {
      setDetailPlaceUsagesLoading(false)
    }
  }

  useEffect(() => {
    loadPlaces()
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [page, pageSize])

  useEffect(() => {
    if (!hasInitializedListFilters.current) {
      hasInitializedListFilters.current = true
      return
    }

    if (page !== 1) {
      setPage(1)
      return
    }

    loadPolicies()
  }, [deferredSearch, appliedFilters])

  useEffect(() => {
    if (!detailOpen || !selectedPolicy?.id) return

    loadPolicyPlaceUsages(
      selectedPolicy.id,
      detailPlaceUsagePage,
      detailPlaceUsagePageSize,
      detailPlaceUsageDeferredSearch.trim(),
    )
  }, [detailOpen, selectedPolicy?.id, detailPlaceUsagePage, detailPlaceUsagePageSize, detailPlaceUsageDeferredSearch])

  useEffect(() => {
    if (!detailOpen) return
    if (detailPlaceUsagePage !== 1) {
      setDetailPlaceUsagePage(1)
    }
  }, [detailPlaceUsageDeferredSearch, detailOpen])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  function openCreateDialog() {
    setForm({
      ...DEFAULT_FORM,
      placeId: appliedFilters.placeId,
    })
    setFormError('')
    setEditorOpen(true)
  }

  async function loadPolicyDetail(policyId: string) {
    const response = await fetch(`/api/operations/cancellation-policy?policyId=${encodeURIComponent(policyId)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractMessage(payload, 'Unable to load cancellation policy details.'))

    return extractPolicies(payload)[0] ?? null
  }

  async function openEditDialog(policyId: string) {
    setSaving(true)
    setPageError('')

    try {
      const item = await loadPolicyDetail(policyId)
      if (!item) throw new Error('Cancellation policy details were not found.')

      setForm({
        id: item.id,
        name: item.name,
        description: item.description,
        attachment: item.attachment,
        placeId: item.placeId,
        cancellationRules: item.cancellationRules,
      })
      setFormError('')
      setEditorOpen(true)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load cancellation policy details.')
    } finally {
      setSaving(false)
    }
  }

  async function openDetailDialog(policyId: string) {
    setSaving(true)
    setPageError('')

    try {
      const item = await loadPolicyDetail(policyId)
      if (!item) throw new Error('Cancellation policy details were not found.')
      setDetailPlaceUsageSearchText('')
      setDetailPlaceUsagePage(1)
      setSelectedPolicy(item)
      setDetailOpen(true)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load cancellation policy details.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAttachmentUpload(file: File | null) {
    if (!file) return
    if (file.type && file.type !== 'application/pdf') {
      setFormError('Only PDF files are supported.')
      return
    }

    setUploading(true)
    setFormError('')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/operations/cancellation-policy/upload', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to upload cancellation policy attachment.'))

      const fileUrl = extractUploadUrl(payload)
      if (!fileUrl) throw new Error('Attachment upload succeeded but no file URL was returned.')

      setForm(current => ({ ...current, attachment: fileUrl }))
      setSuccessMessage('Attachment uploaded successfully.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to upload cancellation policy attachment.')
    } finally {
      setUploading(false)
    }
  }

  function openAddRule() {
    setRuleForm(DEFAULT_RULE_FORM)
    setRuleError('')
    setRuleDialogOpen(true)
  }

  function openEditRule(rule: CancellationRule) {
    setRuleForm({
      id: rule.id,
      timeFrame: rule.timeFrame,
      returnPercentage: String(rule.returnPercentage),
      startDay: String(rule.startDay),
      endDay: String(rule.endDay),
      ruleNote: rule.ruleNote,
    })
    setRuleError('')
    setRuleDialogOpen(true)
  }

  function saveRule() {
    const validationMessage = validateRuleForm(ruleForm, form.cancellationRules, ruleForm.id)
    if (validationMessage) {
      setRuleError(validationMessage)
      return
    }

    const nextRule: CancellationRule = {
      id: ruleForm.id ?? `rule-${Date.now()}`,
      timeFrame: ruleForm.timeFrame.trim(),
      returnPercentage: Number(ruleForm.returnPercentage),
      startDay: Number(ruleForm.startDay),
      endDay: Number(ruleForm.endDay),
      ruleNote: ruleForm.ruleNote.trim(),
      sequence: 0,
    }

    setForm(current => {
      const nextRules = ruleForm.id
        ? current.cancellationRules.map(item => item.id === ruleForm.id ? nextRule : item)
        : [...current.cancellationRules, nextRule]

      return {
        ...current,
        cancellationRules: nextRules.map((item, index) => ({ ...item, sequence: index })),
      }
    })

    setRuleDialogOpen(false)
    setRuleForm(DEFAULT_RULE_FORM)
    setRuleError('')
  }

  function deleteRule(ruleId: string) {
    setForm(current => ({
      ...current,
      cancellationRules: current.cancellationRules
        .filter(item => item.id !== ruleId)
        .map((item, index) => ({ ...item, sequence: index })),
    }))
  }

  async function savePolicy() {
    if (!form.name.trim()) {
      setFormError('Policy name is required.')
      return
    }
    if (!form.description.trim()) {
      setFormError('Description is required.')
      return
    }
    if (!form.placeId.trim()) {
      setFormError('Place is required.')
      return
    }
    if (!form.attachment.trim()) {
      setFormError('Policy attachment is required.')
      return
    }
    if (form.cancellationRules.length === 0) {
      setFormError('Add at least one cancellation rule.')
      return
    }

    setSaving(true)
    setFormError('')

    try {
      const payloadBody = {
        name: form.name.trim(),
        description: form.description.trim(),
        attachment: form.attachment.trim(),
        placeId: form.placeId.trim(),
        cancellationRules: form.cancellationRules.map((item, index) => ({
          ...(item.id.startsWith('rule-') ? {} : { id: item.id }),
          timeFrame: item.timeFrame,
          returnPercentage: String(item.returnPercentage),
          ruleNote: item.ruleNote,
          startDay: item.startDay,
          endDay: item.endDay,
          sequence: index,
        })),
      }

      const response = await fetch(
        form.id
          ? `/api/operations/cancellation-policy?policyId=${encodeURIComponent(form.id)}`
          : '/api/operations/cancellation-policy',
        {
          method: form.id ? 'PUT' : 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payloadBody),
        },
      )

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save cancellation policy.'))

      setSuccessMessage(extractMessage(payload, form.id ? 'Cancellation policy updated successfully.' : 'Cancellation policy created successfully.'))
      setEditorOpen(false)
      setForm(DEFAULT_FORM)
      await loadPolicies()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save cancellation policy.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmAction() {
    if (!confirmState) return

    setSaving(true)
    setPageError('')

    try {
      if (confirmState.type === 'delete') {
        const response = await fetch(`/api/operations/cancellation-policy?policyId=${encodeURIComponent(confirmState.item.id)}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to delete cancellation policy.'))

        setSuccessMessage(extractMessage(payload, 'Cancellation policy deleted successfully.'))
      } else {
        const response = await fetch(`/api/operations/cancellation-policy/status?policyId=${encodeURIComponent(confirmState.item.id)}&active=${encodeURIComponent(String(!confirmState.item.active))}`, {
          method: 'PUT',
          headers: { Accept: 'application/json' },
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(extractMessage(payload, 'Unable to update cancellation policy status.'))

        setSuccessMessage(extractMessage(payload, confirmState.item.active ? 'Cancellation policy deactivated successfully.' : 'Cancellation policy activated successfully.'))
      }

      setConfirmState(null)
      await loadPolicies()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to complete action.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShellLayout>
      <div className="min-h-full px-6 py-6 lg:px-8">
        <SectionHeader
          title="Operations / Cancellation Policy"
          right={<div className="hidden md:flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}></div>}
        />

        <div className="mb-6 overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 45%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}>
          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, color: '#fff' }}>
                <FileText size={12} />
                Cancellation Policy Management
              </div>
              <h1 className="font-serif" style={{ fontSize: 28, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>Cancellation Policies</h1>
             
            </div>

            <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
             
              <button onClick={openCreateDialog} className="rounded-2xl px-4 py-3 font-semibold" style={{ background: '#fff', color: 'var(--maroon)', fontSize: 13 }}>
                <span className="inline-flex items-center gap-2"><Plus size={15} />Create Policy</span>
              </button>
            </div>
          </div>

        
        </div>

        {successMessage ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
        {pageError ? <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{pageError}</div> : null}

        <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-serif" style={{ fontSize: 28, color: 'var(--text-dark)', fontWeight: 700 }}>Policy Listing</div>
              
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Search policy name" className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-80" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
            </div>
          </div>

          {placesLoading || listLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <RajasthanLoader label="Loading cancellation policies..." />
            </div>
          ) : policies.length === 0 ? (
            <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: 'rgba(200,146,42,0.14)', color: 'var(--gold)' }}>
                <MapPin size={28} />
              </div>
              <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>No policies found</div>
              <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {searchText.trim() || appliedFilters.placeId || appliedFilters.status !== 'all'
                  ? 'No records match the current search or filter combination.'
                  : 'Create the first cancellation policy to populate this module.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {policies.map(policy => (
                  <div
                    key={policy.id}
                    className="overflow-hidden rounded-[28px] border bg-white cursor-pointer transition-shadow hover:shadow-[0_18px_38px_rgba(58,32,16,0.10)]"
                    style={{ borderColor: 'var(--cream-dark)', boxShadow: '0 14px 32px rgba(58,32,16,0.06)' }}
                    onClick={() => openDetailDialog(policy.id)}
                  >
                    <div className="border-b px-5 py-5" style={{ borderColor: 'var(--cream-dark)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{policy.name || 'Untitled policy'}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full px-3 py-1" style={{ ...chipStyle(policy.active), fontSize: 11, fontWeight: 700 }}>{policy.active ? 'Active' : 'Inactive'}</span>
                            <span className="rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.14)', color: '#9A6700', fontSize: 11, fontWeight: 700 }}>
                              {policy.rulesCount || policy.cancellationRules.length} Rules
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={event => {
                            event.stopPropagation()
                            openDetailDialog(policy.id)
                          }}
                          className="rounded-2xl px-3 py-2 font-medium"
                          style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                        >
                          <span className="inline-flex items-center gap-1.5"><Eye size={13} />View</span>
                        </button>
                      </div>
                    </div>

                    <div className="px-5 py-5">
                      <div className="mb-4 flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <MapPin size={14} style={{ color: 'var(--maroon)' }} />
                        {policy.placeName || filteredPlaceName || 'No place mapped'}
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.75 }}>
                        {policy.description || 'No description provided.'}
                      </p>

                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation()
                          openAttachmentInNewTab(policy.attachment)
                        }}
                        className="mt-4 w-full rounded-[22px] p-4 text-left"
                        style={{ background: '#F8F4EE', border: '1px solid var(--cream-dark)' }}
                      >
                        <div className="mb-2 flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                          <FileText size={14} style={{ color: 'var(--maroon)' }} />
                          Attachment
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{getAttachmentLabel(policy.attachment)}</div>
                        {policy.attachment ? <div style={{ fontSize: 12, color: 'var(--maroon)', fontWeight: 600 }}>Open PDF</div> : null}
                      </button>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={event => {
                            event.stopPropagation()
                            openEditDialog(policy.id)
                          }}
                          className="rounded-xl px-3 py-2 font-medium"
                          style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                        >
                          <span className="inline-flex items-center gap-1.5"><Pencil size={13} />Edit</span>
                        </button>
                        <button
                          onClick={event => {
                            event.stopPropagation()
                            setConfirmState({ type: 'toggle', item: policy })
                          }}
                          className="rounded-xl px-3 py-2 font-medium"
                          style={{ background: policy.active ? 'rgba(139,26,26,0.08)' : 'rgba(26,122,110,0.10)', color: policy.active ? 'var(--maroon)' : '#1A7A6E', fontSize: 12 }}
                        >
                          {policy.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={event => {
                            event.stopPropagation()
                            setConfirmState({ type: 'delete', item: policy })
                          }}
                          className="rounded-xl px-3 py-2 font-medium"
                          style={{ background: 'rgba(159,31,31,0.08)', color: '#9F1F1F', fontSize: 12 }}
                        >
                          <span className="inline-flex items-center gap-1.5"><Trash2 size={13} />Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pager page={page} pageSize={pageSize} totalRecords={totalRecords} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1) }} />
            </>
          )}
        </div>
      </div>

      <FilterDialog
        open={filterOpen}
        places={places}
        values={draftFilters}
        onChange={setDraftFilters}
        onClose={() => setFilterOpen(false)}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraftFilters(DEFAULT_FILTERS)
          setAppliedFilters(DEFAULT_FILTERS)
          setPage(1)
          setFilterOpen(false)
        }}
      />

      <PolicyEditorDialog
        open={editorOpen}
        places={places}
        form={form}
        error={formError}
        loading={saving}
        uploading={uploading}
        onChange={setForm}
        onClose={() => {
          setEditorOpen(false)
          setForm(DEFAULT_FORM)
          setFormError('')
        }}
        onSave={savePolicy}
        onFileSelect={handleAttachmentUpload}
        onAddRule={openAddRule}
        onEditRule={openEditRule}
        onDeleteRule={deleteRule}
      />

      <RuleDialog
        open={ruleDialogOpen}
        form={ruleForm}
        error={ruleError}
        loading={saving}
        onChange={setRuleForm}
        onClose={() => {
          setRuleDialogOpen(false)
          setRuleForm(DEFAULT_RULE_FORM)
          setRuleError('')
        }}
        onSave={saveRule}
      />

      <PolicyDetailDialog
        open={detailOpen}
        policy={selectedPolicy}
        placeUsages={detailPlaceUsages}
        placeUsagesLoading={detailPlaceUsagesLoading}
        placeUsageSearch={detailPlaceUsageSearchText}
        placeUsagePage={detailPlaceUsagePage}
        placeUsagePageSize={detailPlaceUsagePageSize}
        placeUsageTotalRecords={detailPlaceUsageTotalRecords}
        onPlaceUsageSearchChange={value => setDetailPlaceUsageSearchText(value)}
        onPlaceUsagePageChange={setDetailPlaceUsagePage}
        onPlaceUsagePageSizeChange={size => {
          setDetailPlaceUsagePageSize(size)
          setDetailPlaceUsagePage(1)
        }}
        onClose={() => {
          setDetailOpen(false)
          setSelectedPolicy(null)
          setDetailPlaceUsages([])
          setDetailPlaceUsageSearchText('')
          setDetailPlaceUsagePage(1)
          setDetailPlaceUsageTotalRecords(0)
        }}
      />

      <ConfirmDialog
        state={confirmState}
        loading={saving}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmAction}
      />
    </AdminShellLayout>
  )
}
