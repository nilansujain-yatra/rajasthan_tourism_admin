'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminShellLayout from '@/components/layout/AdminShell'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { authFetch } from '@/lib/api/authFetch'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'

type Place = {
  id?: string | number
  placeId?: string | number
  name?: string
  placeName?: string
  abbreviation?: string
  [key: string]: unknown
}

type TermItem = {
  id: string
  placeId: string
  termsCond: string
  active: boolean
  serialNo: number
  order: number
}

type PlaceFilterValues = {
  placeId: string
  search: string
}

type TermFormState = {
  id: string | null
  placeId: string
  termsCond: string
  active: boolean
}

type ConfirmState =
  | { type: 'delete'; item: TermItem }
  | { type: 'toggle'; item: TermItem }
  | null

const DEFAULT_FILTERS: PlaceFilterValues = {
  placeId: '',
  search: '',
}

const DEFAULT_FORM: TermFormState = {
  id: null,
  placeId: '',
  termsCond: '',
  active: true,
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

function extractTerms(payload: unknown): TermItem[] {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result ?? {}
    : {}

  const source = Array.isArray(result.termAndConditionDtos) ? result.termAndConditionDtos : []

  const nonZeroActive = source
    .filter(item => item && typeof item === 'object' && Boolean((item as any).active) && Number((item as any).serialNo ?? 0) !== 0)
    .sort((a: any, b: any) => Number(a.serialNo ?? 0) - Number(b.serialNo ?? 0))

  const zeroSerialActive = source
    .filter(item => item && typeof item === 'object' && Boolean((item as any).active) && Number((item as any).serialNo ?? 0) === 0)

  const inactive = source
    .filter(item => item && typeof item === 'object' && !Boolean((item as any).active))

  return [...nonZeroActive, ...zeroSerialActive, ...inactive].map((item: any, index) => ({
    id: String(item.id ?? `${item.termsCond ?? 'term'}-${index}`),
    placeId: String(item.placeId ?? ''),
    termsCond: typeof item.termsCond === 'string' ? item.termsCond : '',
    active: Boolean(item.active),
    serialNo: Number(item.serialNo ?? 0),
    order: index + 1,
  }))
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }

  return fallback
}

function chipStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function PlaceFilterDialog({
  open,
  values,
  places,
  onChange,
  onApply,
  onClose,
  onReset,
}: {
  open: boolean
  values: PlaceFilterValues
  places: Place[]
  onChange: (value: PlaceFilterValues) => void
  onApply: () => void
  onClose: () => void
  onReset: () => void
}) {
  if (!open) return null

  const normalizedSearch = values.search.trim().toLowerCase()
  const filteredPlaces = places.filter(place => {
    if (!normalizedSearch) return true
    const label = `${getPlaceName(place)} ${(place.abbreviation ?? '')}`.toLowerCase()
    return label.includes(normalizedSearch)
  })

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: 'rgba(28,16,8,0.54)', zIndex: 1000, backdropFilter: 'blur(6px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: '0 36px 90px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.16)' }}>
              <SlidersHorizontal size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 22 }}>Filter Terms</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>Choose a place to load its terms and conditions</div>
            </div>
          </div>

          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 px-7 py-7">
          <div>
            <label className="mb-2 flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              <Search size={12} style={{ color: 'var(--maroon)' }} />
              Search Place
            </label>
            <input
              value={values.search}
              onChange={event => onChange({ ...values, search: event.target.value })}
              placeholder="Type place name"
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              <MapPin size={12} style={{ color: 'var(--maroon)' }} />
              Select Place
            </label>
            <select
              value={values.placeId}
              onChange={event => onChange({ ...values, placeId: event.target.value })}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            >
              <option value="">Select Place</option>
              {filteredPlaces
                .sort((a, b) => getPlaceName(a).localeCompare(getPlaceName(b), 'en', { sensitivity: 'base' }))
                .map(place => (
                  <option key={getPlaceId(place)} value={getPlaceId(place)}>
                    {getPlaceName(place)}
                  </option>
                ))}
            </select>
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

function TermEditorDialog({
  open,
  loading,
  form,
  places,
  error,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean
  loading: boolean
  form: TermFormState
  places: Place[]
  error: string
  onChange: (value: TermFormState) => void
  onClose: () => void
  onSave: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: 'rgba(28,16,8,0.50)', zIndex: 1010, backdropFilter: 'blur(6px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #942626 52%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>
              {form.id ? 'Edit Terms & Condition' : 'Create Terms & Condition'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)' }}>
              Keep place-specific visitor rules synced with the selected location
            </div>
          </div>

          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 px-7 py-7">
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Place
            </label>
            <select
              value={form.placeId}
              onChange={event => onChange({ ...form, placeId: event.target.value })}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
            >
              <option value="">Select Place</option>
              {places
                .sort((a, b) => getPlaceName(a).localeCompare(getPlaceName(b), 'en', { sensitivity: 'base' }))
                .map(place => (
                  <option key={getPlaceId(place)} value={getPlaceId(place)}>
                    {getPlaceName(place)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Terms & Condition
            </label>
            <textarea
              value={form.termsCond}
              onChange={event => onChange({ ...form, termsCond: event.target.value })}
              placeholder="Add terms and condition"
              rows={7}
              className="w-full rounded-[22px] px-4 py-3 outline-none resize-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, lineHeight: 1.6 }}
            />
          </div>

          {error ? (
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-7 py-4" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="rounded-xl px-8 py-2.5 font-semibold text-white disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
          >
            {loading ? 'Saving...' : form.id ? 'Update' : 'Create'}
          </button>
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
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: 'rgba(28,16,8,0.46)', zIndex: 1020 }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-[28px] bg-white p-7" style={{ boxShadow: '0 30px 80px rgba(107,18,18,0.22)' }}>
        <div className="mb-3 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>
          {isDelete ? 'Delete term?' : state.item.active ? 'Deactivate term?' : 'Activate term?'}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          {isDelete
            ? 'This will remove the selected terms and condition item for the selected place.'
            : `This will ${state.item.active ? 'deactivate' : 'activate'} the selected term for the place.`}
        </p>
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', fontSize: 13, color: 'var(--text-dark)' }}>
          {state.item.termsCond}
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

export default function TermsConditionsPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [placesLoading, setPlacesLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [draftFilters, setDraftFilters] = useState<PlaceFilterValues>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<PlaceFilterValues>(DEFAULT_FILTERS)
  const [terms, setTerms] = useState<TermItem[]>([])
  const [originalActiveOrder, setOriginalActiveOrder] = useState<string[]>([])
  const [listSearch, setListSearch] = useState('')
  const [form, setForm] = useState<TermFormState>(DEFAULT_FORM)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedPlace = useMemo(
    () => places.find(place => getPlaceId(place) === appliedFilters.placeId) ?? null,
    [places, appliedFilters.placeId],
  )

  const activeTerms = useMemo(() => terms.filter(item => item.active), [terms])
  const inactiveTerms = useMemo(() => terms.filter(item => !item.active), [terms])

  const filteredTerms = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    if (!query) return terms
    return terms.filter(item => item.termsCond.toLowerCase().includes(query))
  }, [terms, listSearch])

  const isOrderChanged = useMemo(() => {
    const current = activeTerms.map(item => item.id)
    return JSON.stringify(current) !== JSON.stringify(originalActiveOrder)
  }, [activeTerms, originalActiveOrder])

  async function loadPlaces() {
    setPlacesLoading(true)
    try {
      const response = await authFetch('/place?searchKey=&size=2000', {
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(extractMessage(payload, 'Unable to fetch places.'))
      }

      setPlaces(extractPlaces(payload))
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to fetch places.')
    } finally {
      setPlacesLoading(false)
    }
  }

  async function loadTerms(placeId: string) {
    if (!placeId) {
      setTerms([])
      setOriginalActiveOrder([])
      return
    }

    setListLoading(true)
    setPageError('')

    try {
      const response = await authFetch(`/t&c/all?placeId=${encodeURIComponent(placeId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(extractMessage(payload, 'Unable to fetch terms and conditions.'))
      }

      const nextTerms = extractTerms(payload)
      setTerms(nextTerms)
      setOriginalActiveOrder(nextTerms.filter(item => item.active).map(item => item.id))
    } catch (error) {
      setTerms([])
      setOriginalActiveOrder([])
      setPageError(error instanceof Error ? error.message : 'Unable to fetch terms and conditions.')
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    loadPlaces()
  }, [])

  useEffect(() => {
    loadTerms(appliedFilters.placeId)
  }, [appliedFilters.placeId])

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

  function openEditDialog(item: TermItem) {
    setForm({
      id: item.id,
      placeId: item.placeId,
      termsCond: item.termsCond,
      active: item.active,
    })
    setFormError('')
    setEditorOpen(true)
  }

  function resetAppliedFilters() {
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    setTerms([])
    setOriginalActiveOrder([])
    setListSearch('')
    setPageError('')
  }

  function moveActiveItem(itemId: string, direction: 'up' | 'down') {
    setTerms(current => {
      const active = current.filter(item => item.active)
      const inactive = current.filter(item => !item.active)
      const index = active.findIndex(item => item.id === itemId)

      if (index === -1) return current
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= active.length) return current

      const reordered = [...active]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(targetIndex, 0, moved)

      return [...reordered, ...inactive].map((item, orderIndex) => ({
        ...item,
        order: orderIndex + 1,
        serialNo: item.active ? reordered.findIndex(activeItem => activeItem.id === item.id) + 1 : item.serialNo,
      }))
    })
  }

  async function saveTerm() {
    const trimmedTerm = form.termsCond.trim()
    const targetPlaceId = (appliedFilters.placeId || form.placeId).trim()

    if (!targetPlaceId) {
      setFormError('Please select a place before saving.')
      return
    }

    if (!trimmedTerm) {
      setFormError('Terms & condition is required.')
      return
    }

    setSaving(true)
    setFormError('')

    try {
      const response = await authFetch('/system/terms', {
        method: form.id ? 'PUT' : 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(form.id ? { id: form.id } : {}),
          placeId: targetPlaceId,
          termsCond: trimmedTerm,
          active: form.active,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(extractMessage(payload, 'Unable to save term and condition.'))
      }

      setEditorOpen(false)
      setForm(DEFAULT_FORM)
      setSuccessMessage(extractMessage(payload, form.id ? 'Term updated successfully.' : 'Term created successfully.'))

      if (!appliedFilters.placeId) {
        setAppliedFilters(current => ({ ...current, placeId: targetPlaceId }))
        setDraftFilters(current => ({ ...current, placeId: targetPlaceId }))
      } else {
        await loadTerms(appliedFilters.placeId)
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save term and condition.')
    } finally {
      setSaving(false)
    }
  }

  async function applyReorderedTerms() {
    if (!appliedFilters.placeId || !isOrderChanged) return

    setSaving(true)
    setPageError('')

    try {
      const payloadBody = activeTerms.map((item, index) => ({
        id: item.id,
        serialNo: index + 1,
        active: true,
        placeId: item.placeId,
      }))

      const response = await authFetch('/system/terms', {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadBody),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(extractMessage(payload, 'Unable to apply term order.'))
      }

      setSuccessMessage(extractMessage(payload, 'Term order applied successfully.'))
      await loadTerms(appliedFilters.placeId)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to apply term order.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmAction() {
    if (!confirmState || !appliedFilters.placeId) return

    setSaving(true)
    setPageError('')

    try {
      if (confirmState.type === 'delete') {
        const response = await authFetch(
          `/system/terms?id=${encodeURIComponent(confirmState.item.id)}&placeId=${encodeURIComponent(appliedFilters.placeId)}`,
          { method: 'DELETE' },
        )
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(extractMessage(payload, 'Unable to delete term and condition.'))
        }

        setSuccessMessage(extractMessage(payload, 'Term deleted successfully.'))
      } else {
        const response = await authFetch('/system/terms', {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: confirmState.item.id,
            placeId: confirmState.item.placeId,
            termsCond: confirmState.item.termsCond,
            active: !confirmState.item.active,
          }),
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(extractMessage(payload, 'Unable to update term status.'))
        }

        setSuccessMessage(extractMessage(payload, confirmState.item.active ? 'Term deactivated successfully.' : 'Term activated successfully.'))
      }

      setConfirmState(null)
      await loadTerms(appliedFilters.placeId)
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
          title="Operations / Terms & Conditions"
          right={
            <div className="hidden md:flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <CheckCircle2 size={13} style={{ color: 'var(--teal)' }} />
              Place-scoped policy management
            </div>
          }
        />

        <div className="mb-6 overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 45%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}>
          <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, color: '#fff' }}>
                <MapPin size={12} />
                {selectedPlace ? getPlaceName(selectedPlace) : 'No place selected'}
              </div>
              <h1 className="font-serif" style={{ fontSize: 24, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>
                Terms & Conditions
              </h1>
              
            </div>

            <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
              <button
                onClick={() => setFilterOpen(true)}
                className="rounded-2xl px-4 py-3 font-medium text-white"
                style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 13 }}
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal size={15} />
                  Filter Place
                </span>
              </button>
              <button
                onClick={openCreateDialog}
                className="rounded-2xl px-4 py-3 font-semibold"
                style={{ background: '#fff', color: 'var(--maroon)', fontSize: 13 }}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={15} />
                  Create Term
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-px sm:grid-cols-3" style={{ background: 'rgba(255,255,255,0.14)' }}>
            {[
              { label: 'Active Terms', value: activeTerms.length.toString() },
              { label: 'Inactive Terms', value: inactiveTerms.length.toString() },
              { label: 'Selected Place', value: selectedPlace ? getPlaceName(selectedPlace) : 'Choose from filter' },
            ].map(card => (
              <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>
            {successMessage}
          </div>
        ) : null}

        {pageError ? (
          <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
            {pageError}
          </div>
        ) : null}

        <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-serif" style={{ fontSize: 28, color: 'var(--text-dark)', fontWeight: 700 }}>
                Terms Listing
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selectedPlace ? `Showing terms for ${getPlaceName(selectedPlace)}` : 'Select a place from filter to load the terms list.'}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={listSearch}
                  onChange={event => setListSearch(event.target.value)}
                  placeholder="Search in terms"
                  className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-72"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                />
              </div>

              {isOrderChanged ? (
                <button
                  onClick={applyReorderedTerms}
                  disabled={saving}
                  className="rounded-2xl px-4 py-3 font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--teal) 0%, #C8922A 100%)', fontSize: 13 }}
                >
                  Apply Order
                </button>
              ) : null}
            </div>
          </div>

          {placesLoading || listLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <RajasthanLoader label="Loading terms and conditions..." />
            </div>
          ) : !appliedFilters.placeId ? (
            <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: 'rgba(200,146,42,0.14)', color: 'var(--gold)' }}>
                <MapPin size={28} />
              </div>
              <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>Pick a place to begin</div>
              <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                This flow is place-specific. Use the filter above, select a place, and the listing plus all APIs will work against that selected place.
              </p>
            </div>
          ) : filteredTerms.length === 0 ? (
            <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
              <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>
                {terms.length === 0 ? 'No terms found' : 'No matching term found'}
              </div>
              <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {terms.length === 0
                  ? 'Create the first terms and condition item for this place.'
                  : 'Try another search keyword or clear the search field.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--cream-dark)' }}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead style={{ background: 'linear-gradient(180deg, #FBF6EF 0%, #F4EBDF 100%)' }}>
                    <tr>
                      {['Sr. No.', 'Status', 'Terms & Condition', 'Actions'].map(label => (
                        <th key={label} className="px-4 py-4 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTerms.map((item, index) => {
                      const activeIndex = activeTerms.findIndex(activeItem => activeItem.id === item.id)
                      const canMoveUp = item.active && activeIndex > 0
                      const canMoveDown = item.active && activeIndex < activeTerms.length - 1

                      return (
                        <tr key={item.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                          <td className="px-4 py-4 align-top" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>
                            {item.active ? activeIndex + 1 : activeTerms.length + inactiveTerms.findIndex(inactive => inactive.id === item.id) + 1}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span className="rounded-full px-3 py-1" style={{ ...chipStyle(item.active), fontSize: 11, fontWeight: 700 }}>
                              {item.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top" style={{ fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.7 }}>
                            {item.termsCond}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openEditDialog(item)}
                                className="rounded-xl px-3 py-2 font-medium"
                                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <Pencil size={13} />
                                  Edit
                                </span>
                              </button>
                              <button
                                onClick={() => setConfirmState({ type: 'toggle', item })}
                                className="rounded-xl px-3 py-2 font-medium"
                                style={{ background: item.active ? 'rgba(139,26,26,0.08)' : 'rgba(26,122,110,0.10)', color: item.active ? 'var(--maroon)' : '#1A7A6E', fontSize: 12 }}
                              >
                                {item.active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => setConfirmState({ type: 'delete', item })}
                                className="rounded-xl px-3 py-2 font-medium"
                                style={{ background: 'rgba(159,31,31,0.08)', color: '#9F1F1F', fontSize: 12 }}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <Trash2 size={13} />
                                  Delete
                                </span>
                              </button>
                              {item.active ? (
                                <>
                                  <button
                                    onClick={() => moveActiveItem(item.id, 'up')}
                                    disabled={!canMoveUp}
                                    className="rounded-xl px-3 py-2 font-medium disabled:opacity-40"
                                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      <ArrowUp size={13} />
                                      Up
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => moveActiveItem(item.id, 'down')}
                                    disabled={!canMoveDown}
                                    className="rounded-xl px-3 py-2 font-medium disabled:opacity-40"
                                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      <ArrowDown size={13} />
                                      Down
                                    </span>
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <PlaceFilterDialog
        open={filterOpen}
        values={draftFilters}
        places={places}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setFilterOpen(false)
          setListSearch('')
        }}
        onClose={() => setFilterOpen(false)}
        onReset={() => {
          resetAppliedFilters()
          setFilterOpen(false)
        }}
      />

      <TermEditorDialog
        open={editorOpen}
        loading={saving}
        form={form}
        places={places}
        error={formError}
        onChange={setForm}
        onClose={() => {
          setEditorOpen(false)
          setForm(DEFAULT_FORM)
          setFormError('')
        }}
        onSave={saveTerm}
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
