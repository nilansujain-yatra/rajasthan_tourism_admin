'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react'
import { authFetch } from '@/lib/api/authFetch'

type Place = {
  placeId?: string | number
  placeName?: string
  id?: string | number
  name?: string
  [key: string]: unknown
}

type ReviewRow = {
  id?: string
  reviewId?: string
  userName?: string
  name?: string
  fullName?: string
  placeName?: string
  rating?: number | string
  review?: string
  feedback?: string
  message?: string
  comments?: string
  createdDate?: string | number
  reviewDate?: string | number
  [key: string]: unknown
}

type FeedbackFilters = {
  startDate: string
  endDate: string
  placeId: string
}

const DEFAULT_FILTERS: FeedbackFilters = {
  startDate: '',
  endDate: '',
  placeId: '',
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

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

function extractReviews(payload: unknown): ReviewRow[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as ReviewRow[]
}

function extractTotalRecords(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0

  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total ??
    root?.result?.meta?.totalRecords ??
    root?.meta?.totalRecords

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0
}

function getPlaceId(place: Place) {
  const candidate =
    place.placeId ??
    (place as any).place_id ??
    place.id ??
    (place as any).placeCode ??
    (place as any).placecode

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  return ''
}

function getPlaceName(place: Place) {
  const candidate =
    place.placeName ??
    (place as any).placename ??
    (place as any).place_name ??
    place.name

  return typeof candidate === 'string' ? candidate.trim() : ''
}

function toEpochRangeStart(dateValue: string) {
  return new Date(dateValue).setHours(0, 0, 0, 0)
}

function toEpochRangeEnd(dateValue: string) {
  return new Date(dateValue).setHours(23, 59, 59, 999)
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-IN')
  }

  if (typeof value === 'string' && value.trim()) {
    const maybeNumber = Number(value)
    if (Number.isFinite(maybeNumber) && maybeNumber > 0) {
      const date = new Date(maybeNumber)
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-IN')
    }

    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-IN')

    return value
  }

  return 'N/A'
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])

  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
    pages.add(i)
  }

  if (totalPages > 1) pages.add(totalPages)

  return Array.from(pages).sort((a, b) => a - b)
}

function getReviewId(review: ReviewRow, index: number) {
  const candidate =
    review.reviewId ??
    review.id ??
    (review as any).ratingId ??
    (review as any).reviewRatingId

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate)
  }

  return `review-${index + 1}`
}

function getReviewerName(review: ReviewRow) {
  const candidate =
    review.userName ??
    review.fullName ??
    review.name ??
    (review as any).visitorName ??
    (review as any).userDto?.displayName ??
    (review as any).createdBy

  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'Anonymous Visitor'
}

function getReviewPlaceName(review: ReviewRow) {
  const candidate =
    review.placeName ??
    (review as any).place?.placeName ??
    (review as any).placeDto?.placeName ??
    (review as any).siteName

  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'N/A'
}

function getReviewMessage(review: ReviewRow) {
  const candidate =
    review.review ??
    review.feedback ??
    review.message ??
    review.comments ??
    (review as any).description ??
    (review as any).remark

  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'No feedback message provided.'
}

function getReviewDateValue(review: ReviewRow) {
  return (
    review.createdDate ??
    review.reviewDate ??
    (review as any).createdAt ??
    (review as any).date ??
    (review as any).timestamp ??
    null
  )
}

function getReviewRating(review: ReviewRow) {
  const candidate =
    review.rating ??
    (review as any).reviewRating ??
    (review as any).starRating ??
    (review as any).ratingValue

  const ratingNumber =
    typeof candidate === 'string'
      ? Number(candidate)
      : typeof candidate === 'number'
      ? candidate
      : NaN

  if (!Number.isFinite(ratingNumber)) return 0
  return Math.max(0, Math.min(5, Math.round(ratingNumber)))
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AV'
  const first = parts[0]?.[0] ?? 'A'
  const second = parts.length > 1 ? parts[1]?.[0] ?? 'V' : parts[0]?.[1] ?? 'V'
  return `${first}${second}`.toUpperCase()
}

function PageBtn({ onClick, disabled, active, icon, label }: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  icon?: ReactNode
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-2"
      style={{
        minWidth: 28,
        height: 28,
        fontSize: 11,
        background: active ? 'var(--maroon)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-mid)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon ?? label}
    </button>
  )
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={14}
          fill={index < value ? '#C8922A' : 'transparent'}
          color={index < value ? '#C8922A' : '#D9C6A3'}
        />
      ))}
    </div>
  )
}

function FeedbackTableLoader() {
  return (
    <div className="px-6 py-12">
      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className="rounded-full animate-spin"
          style={{
            width: 28,
            height: 28,
            border: '3px solid rgba(139,26,26,0.12)',
            borderTopColor: 'var(--maroon)',
          }}
        />
        <div className="font-serif font-semibold" style={{ fontSize: 16, color: 'var(--maroon)' }}>
          Loading feedback...
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fetching review ratings for the selected filters.</div>
      </div>
    </div>
  )
}

function EmptyFeedbackState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-6 py-12">
      <div
        className="mx-auto max-w-lg rounded-2xl border text-center"
        style={{
          background: 'linear-gradient(180deg, #fffdf9 0%, #f8efe4 100%)',
          borderColor: 'var(--sand)',
          padding: '32px 24px',
        }}
      >
        <div
          className="mx-auto mb-5 flex items-center justify-center rounded-2xl"
          style={{
            width: 180,
            height: 120,
            background: 'radial-gradient(circle at top, rgba(200,146,42,0.2), rgba(200,146,42,0.02) 58%), #fff',
            border: '1px solid rgba(200,146,42,0.18)',
          }}
        >
          <svg width="124" height="84" viewBox="0 0 124 84" fill="none" aria-hidden="true">
            <rect x="8" y="14" width="72" height="50" rx="12" fill="#fff7ec" stroke="#d7bf96" strokeWidth="2" />
            <path d="M32 64L25 76L42 67" fill="#fff7ec" stroke="#d7bf96" strokeWidth="2" strokeLinejoin="round" />
            <path d="M26 31H61" stroke="#8B1A1A" strokeWidth="3" strokeLinecap="round" />
            <path d="M26 43H52" stroke="#C8922A" strokeWidth="3" strokeLinecap="round" />
            <circle cx="96" cy="28" r="18" fill="#fff2cc" stroke="#d7bf96" strokeWidth="2" />
            <path d="M96 16L99.5 24.5L108 28L99.5 31.5L96 40L92.5 31.5L84 28L92.5 24.5L96 16Z" fill="#C8922A" />
            <rect x="77" y="54" width="36" height="10" rx="5" fill="#8B1A1A" opacity="0.1" />
          </svg>
        </div>
        <div className="font-serif font-bold mb-2" style={{ fontSize: 20, color: 'var(--maroon)' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
    </div>
  )
}

function FeedbackFilterDialog({
  open,
  values,
  todayMaxDate,
  placesLoading,
  placesError,
  placeOptions,
  validationError,
  loading,
  onChange,
  onApply,
  onClose,
  onReset,
}: {
  open: boolean
  values: FeedbackFilters
  todayMaxDate: string
  placesLoading: boolean
  placesError: string | null
  placeOptions: Array<{ id: string; name: string }>
  validationError: string | null
  loading: boolean
  onChange: (next: FeedbackFilters) => void
  onApply: () => void
  onClose: () => void
  onReset: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.45)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', width: 760, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(139,26,26,0.22)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
              <SlidersHorizontal size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 18 }}>Feedback Filters</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Choose place and date range to load reviews</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-xl"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={12} style={{ color: 'var(--maroon)' }} />
                Start Date
              </label>
              <input
                type="date"
                value={values.startDate}
                max={todayMaxDate}
                onChange={e => {
                  const nextStartDate = e.target.value
                  const nextEndDate =
                    values.endDate && nextStartDate && values.endDate < nextStartDate
                      ? nextStartDate
                      : values.endDate
                  onChange({ ...values, startDate: nextStartDate, endDate: nextEndDate })
                }}
                className="rounded-xl px-3 py-2.5 outline-none"
                style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={12} style={{ color: 'var(--maroon)' }} />
                End Date
              </label>
              <input
                type="date"
                value={values.endDate}
                min={values.startDate || undefined}
                max={todayMaxDate}
                onChange={e => {
                  const requestedEndDate = e.target.value
                  const nextEndDate =
                    values.startDate && requestedEndDate && requestedEndDate < values.startDate
                      ? values.startDate
                      : requestedEndDate
                  onChange({ ...values, endDate: nextEndDate })
                }}
                className="rounded-xl px-3 py-2.5 outline-none"
                style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} style={{ color: 'var(--maroon)' }} />
                Place
              </label>
              <div className="relative">
                <select
                  value={values.placeId}
                  disabled={placesLoading}
                  onChange={e => onChange({ ...values, placeId: e.target.value })}
                  className="appearance-none w-full rounded-xl pr-8 pl-3 py-2.5 outline-none"
                  style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                >
                  <option value="">
                    {placesLoading
                      ? 'Loading Places...'
                      : placesError
                      ? 'Places unavailable'
                      : 'Select Place'}
                  </option>
                  {placeOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {validationError && (
            <div className="mt-4 rounded-xl px-4 py-3" style={{ background: '#fff4f4', border: '1px solid #ffd6d6', color: '#8B1A1A', fontSize: 12 }}>
              {validationError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium"
            style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            disabled={loading}
          >
            <X size={13} /> Reset All
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 font-medium"
              style={{ fontSize: 13, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white"
              style={{ fontSize: 13, background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              disabled={loading}
            >
              <SlidersHorizontal size={13} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState<string | null>(null)

  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [totalRecords, setTotalRecords] = useState(0)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const todayMaxDate = useMemo(() => getTodayInputValue(), [])
  const [pendingFilters, setPendingFilters] = useState<FeedbackFilters>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FeedbackFilters>(DEFAULT_FILTERS)

  useEffect(() => {
    let isMounted = true

    async function loadPlaces() {
      setPlacesLoading(true)
      setPlacesError(null)

      try {
        const response = await authFetch('/place?districtId=&searchKey=&deptList=&size=2000', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        const payload = await response.json() as unknown

        if (!response.ok) {
          const message =
            typeof (payload as any)?.message === 'string'
              ? (payload as any).message
              : 'Unable to load places.'
          throw new Error(message)
        }

        const list = extractPlaces(payload)
          .filter(place => Boolean(getPlaceId(place)) && Boolean(getPlaceName(place)))

        if (isMounted) setPlaces(list)
      } catch (error) {
        if (isMounted) {
          setPlaces([])
          setPlacesError(error instanceof Error ? error.message : 'Unable to load places.')
        }
      } finally {
        if (isMounted) setPlacesLoading(false)
      }
    }

    loadPlaces()

    return () => {
      isMounted = false
    }
  }, [])

  const placeOptions = useMemo(() => {
    return places
      .map(place => ({ id: getPlaceId(place), name: getPlaceName(place) }))
      .filter(option => Boolean(option.id) && Boolean(option.name))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [places])

  useEffect(() => {
    if (!hasAppliedFilters) {
      setReviews([])
      setReviewsError(null)
      setTotalRecords(0)
      return
    }

    let isMounted = true
    const controller = new AbortController()

    async function loadReviews() {
      setReviewsLoading(true)
      setReviewsError(null)

      try {
        const params = new URLSearchParams()
        params.set('placeId', appliedFilters.placeId)
        params.set('isFilter', 'true')
        params.set('offSet', String(page - 1))
        params.set('size', String(pageSize))
        params.set('startDay', String(toEpochRangeStart(appliedFilters.startDate)))
        params.set('endDay', String(toEpochRangeEnd(appliedFilters.endDate)))

        const response = await fetch(`/api/reviewRating/getReviewRatingList?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = await response.json() as unknown

        if (!response.ok) {
          const message =
            typeof (payload as any)?.message === 'string'
              ? (payload as any).message
              : 'Unable to load feedback.'
          throw new Error(message)
        }

        const list = extractReviews(payload)
        const total = extractTotalRecords(payload) || list.length

        if (isMounted) {
          setReviews(list)
          setTotalRecords(total)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return

        if (isMounted) {
          setReviews([])
          setTotalRecords(0)
          setReviewsError(error instanceof Error ? error.message : 'Unable to load feedback.')
        }
      } finally {
        if (isMounted) setReviewsLoading(false)
      }
    }

    loadReviews()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [appliedFilters, hasAppliedFilters, page, pageSize])

  const selectedPlaceName = useMemo(() => {
    return placeOptions.find(place => place.id === appliedFilters.placeId)?.name ?? 'Selected Place'
  }, [appliedFilters.placeId, placeOptions])

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const visiblePages = getVisiblePages(page, totalPages)
  const activeFilterCount = [appliedFilters.startDate, appliedFilters.endDate, appliedFilters.placeId].filter(Boolean).length

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openFilters = () => {
    setPendingFilters(appliedFilters)
    setValidationError(null)
    setFiltersOpen(true)
  }

  const applyFilters = () => {
    if (!pendingFilters.startDate || !pendingFilters.endDate || !pendingFilters.placeId) {
      setValidationError('Please select start date, end date, and place before applying filters.')
      return
    }

    setAppliedFilters(pendingFilters)
    setHasAppliedFilters(true)
    setPage(1)
    setValidationError(null)
    setFiltersOpen(false)
  }

  const resetFilters = () => {
    setPendingFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    setHasAppliedFilters(false)
    setValidationError(null)
    setPage(1)
    setReviews([])
    setReviewsError(null)
    setTotalRecords(0)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />

        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <SectionHeader
                title="Feedback Management"
                right={
                  hasAppliedFilters ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {selectedPlaceName} | {appliedFilters.startDate} to {appliedFilters.endDate}
                    </span>
                  ) : undefined
                }
              />
            </div>

            <button
              onClick={openFilters}
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
              style={{
                fontSize: 12,
                background: activeFilterCount ? 'rgba(139,26,26,0.08)' : '#fff',
                color: 'var(--maroon)',
                border: '1px solid var(--sand)',
              }}
            >
              <SlidersHorizontal size={13} />
              Filter
              {activeFilterCount > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5"
                  style={{ fontSize: 10, color: '#fff', background: 'var(--maroon)' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
            {reviewsLoading ? (
              <FeedbackTableLoader />
            ) : reviewsError ? (
              <div className="px-6 py-6">
                <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ffe0e0' }}>
                  <div className="font-serif font-bold mb-1" style={{ fontSize: 18, color: 'var(--maroon)' }}>
                    Feedback data unavailable
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{reviewsError}</div>
                </div>
              </div>
            ) : !hasAppliedFilters ? (
              <EmptyFeedbackState
                title="Apply filters to view feedback"
                description="Select a place and a date range from the filter panel. The review list API will only run after filters are applied."
              />
            ) : reviews.length === 0 ? (
              <EmptyFeedbackState
                title="No data found"
                description="No feedback records were returned for the selected place and date range. Try adjusting the dates or choosing another place."
              />
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                      {['Visitor', 'Place', 'Rating', 'Feedback', 'Date', 'Reference'].map(header => (
                        <th
                          key={header}
                          className="text-left px-5 py-3"
                          style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review, index) => {
                      const reviewerName = getReviewerName(review)
                      const rating = getReviewRating(review)
                      const reviewId = getReviewId(review, index)

                      return (
                        <tr
                          key={reviewId}
                          style={{
                            borderBottom: index < reviews.length - 1 ? '1px solid var(--cream-dark)' : 'none',
                            transition: 'background-color 0.2s',
                          }}
                          className="hover:bg-opacity-50 hover:[background-color:var(--cream)]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex items-center justify-center rounded-full text-white font-semibold"
                                style={{ width: 34, height: 34, background: 'var(--maroon)', fontSize: 11, flexShrink: 0 }}
                              >
                                {getInitials(reviewerName)}
                              </div>
                              <div>
                                <div className="font-medium" style={{ fontSize: 12, color: 'var(--text-dark)' }}>
                                  {reviewerName}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {reviewId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4" style={{ fontSize: 12, color: 'var(--text-dark)' }}>
                            {getReviewPlaceName(review)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <RatingStars value={rating} />
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rating}/5</span>
                            </div>
                          </td>
                          <td className="px-5 py-4" style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6, maxWidth: 380 }}>
                            {getReviewMessage(review)}
                          </td>
                          <td className="px-5 py-4" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {formatDate(getReviewDateValue(review))}
                          </td>
                          <td className="px-5 py-4" style={{ fontSize: 11, color: 'var(--maroon)', fontFamily: 'monospace' }}>
                            {reviewId}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Page Size:</span>
                    <div className="relative">
                      <select
                        value={String(pageSize)}
                        onChange={e => {
                          setPageSize(Number(e.target.value))
                          setPage(1)
                        }}
                        className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                        style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                      >
                        {PAGE_SIZE_OPTIONS.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <PageBtn
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                      disabled={page === 1}
                      icon={<><ChevronLeft size={12} /><span style={{ fontSize: 11 }}>Prev</span></>}
                    />
                    {visiblePages.map((pageNumber, index) => (
                      <div key={pageNumber} className="flex items-center gap-1">
                        {index > 0 && pageNumber - visiblePages[index - 1] > 1 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>...</span>
                        )}
                        <PageBtn
                          onClick={() => setPage(pageNumber)}
                          active={page === pageNumber}
                          label={String(pageNumber)}
                        />
                      </div>
                    ))}
                    <PageBtn
                      onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                      disabled={page === totalPages}
                      icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>}
                    />
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Result:{' '}
                    <strong style={{ color: 'var(--text-dark)' }}>
                      {totalRecords === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalRecords)}`}
                    </strong>{' '}of{' '}
                    <strong style={{ color: 'var(--maroon)' }}>{totalRecords}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <FeedbackFilterDialog
        open={filtersOpen}
        values={pendingFilters}
        todayMaxDate={todayMaxDate}
        placesLoading={placesLoading}
        placesError={placesError}
        placeOptions={placeOptions}
        validationError={validationError}
        loading={reviewsLoading}
        onChange={setPendingFilters}
        onApply={applyFilters}
        onClose={() => {
          setValidationError(null)
          setFiltersOpen(false)
        }}
        onReset={resetFilters}
      />
    </div>
  )
}
