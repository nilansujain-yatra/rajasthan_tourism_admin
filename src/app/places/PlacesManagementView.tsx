'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Building2, ChevronDown, ChevronLeft, ChevronRight, IndianRupee, RefreshCw, Search, Ticket, Users, X } from 'lucide-react'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import SectionHeader from '@/components/ui/SectionHeader'
import { usePlaceStore } from '@/lib/store/use-place-store'

type PlaceSummary = {
  placeId: string
  placeCode: string
  placeName: string
  totalVisitors: number
  totalAmount: number
  totalBooking: number
  totalBookingsOnline: number
  totalBookingsOffline: number
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback
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

function extractPlaces(payload: unknown): unknown[] {
  const list = findFirstArray(payload)
  return Array.isArray(list) ? list : []
}

function mapPlaceItem(item: unknown): PlaceSummary | null {
  if (!item || typeof item !== 'object') return null
  const obj = item as Record<string, unknown>

  const placeId = toText(obj.placeId ?? obj.id ?? obj.place_id ?? obj.placeID, '')
  const placeCode = toText(obj.placeCode ?? obj.place_code ?? obj.placecode ?? obj.code, '')
  const placeName = toText(obj.placeName ?? obj.name ?? obj.place_name ?? obj.placename, '')

  if (!placeId && !placeCode && !placeName) return null

  return {
    ...obj,
    placeId,
    placeCode,
    placeName,
    totalVisitors: Number(obj.totalVisitors ?? 0),
    totalAmount: Number(obj.totalAmount ?? 0),
    totalBooking: Number(obj.totalBooking ?? 0),
    totalBookingsOnline: Number(obj.totalBookingsOnline ?? 0),
    totalBookingsOffline: Number(obj.totalBookingsOffline ?? 0),
    // Ensure nested objects are preserved correctly if needed, 
    // though ...obj already does this.
  } as any
}

function getPlaceKey(place: PlaceSummary) {
  return place.placeId || place.placeCode || place.placeName
}

function getTotalBookings(place: PlaceSummary) {
  return place.totalBooking || place.totalBookingsOnline + place.totalBookingsOffline
}

function getFilteredPlaces(places: PlaceSummary[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase()

  return places.filter(place => {
    const matchesSearch = !normalizedSearch
      || place.placeName.toLowerCase().includes(normalizedSearch)
      || place.placeCode.toLowerCase().includes(normalizedSearch)

    return matchesSearch
  })
}

function LoadingState() {
  return <RajasthanLoader label="Loading places..." />
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-xl3 p-5"
      style={{ background: '#fff', border: '1px solid rgba(139,26,26,0.2)' }}
    >
      <div className="flex gap-3">
        <AlertCircle size={20} style={{ color: 'var(--maroon)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--maroon)' }}>
            Place data unavailable
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
        style={{ fontSize: 12, background: 'var(--maroon)', color: '#fff' }}
      >
        <RefreshCw size={13} />
        Retry
      </button>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  note,
  icon,
  color,
}: {
  label: string
  value: string
  note: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div
      className="rounded-xl3 px-5 py-4 flex items-center gap-4"
      style={{ background: '#fff', border: '1px solid var(--sand)', minHeight: 108 }}
    >
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: 46, height: 46, background: 'var(--cream-dark)', color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </div>
        <div className="font-serif font-bold truncate" style={{ fontSize: 24, color, lineHeight: 1.15 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>
      </div>
    </div>
  )
}

function PlaceCard({ place }: { place: PlaceSummary }) {
  const detailHref = `/places/${encodeURIComponent(getPlaceKey(place))}`
  const hasOnlineBookings = place.totalBookingsOnline > 0
  const hasOfflineBookings = place.totalBookingsOffline > 0
  const setSelectedPlace = usePlaceStore((state) => state.setSelectedPlace)

  return (
    <div
      className="rounded-xl3 card-lift cursor-pointer"
      style={{
        background: '#fff',
        border: '1px solid var(--sand)',
      }}
      onClick={() => {
        setSelectedPlace(place)
      }}
    >
      <div className="px-4 py-3">
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.5px' }}>
          {place.placeCode || 'Archaeological Site'}
        </div>

        <div
          className="font-serif font-bold leading-tight mb-3"
          style={{ fontSize: 15, color: 'var(--text-dark)', minHeight: 38 }}
        >
          {place.placeName}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium"
            style={{
              fontSize: 10,
              background: hasOnlineBookings ? 'rgba(26,122,110,0.12)' : 'rgba(154,122,90,0.1)',
              color: hasOnlineBookings ? 'var(--teal)' : 'var(--text-muted)',
            }}
          >
            <span
              className="rounded-full inline-block"
              style={{ width: 6, height: 6, background: hasOnlineBookings ? 'var(--teal)' : 'var(--text-muted)' }}
            />
            Online {formatNumber(place.totalBookingsOnline)}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium"
            style={{
              fontSize: 10,
              background: hasOfflineBookings ? 'rgba(200,146,42,0.14)' : 'rgba(154,122,90,0.1)',
              color: hasOfflineBookings ? 'var(--gold)' : 'var(--text-muted)',
            }}
          >
            <span
              className="rounded-full inline-block"
              style={{ width: 6, height: 6, background: hasOfflineBookings ? 'var(--gold)' : 'var(--text-muted)' }}
            />
            Offline {formatNumber(place.totalBookingsOffline)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 300 }}>Total Visitors</div>
            <div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>
              {formatNumber(place.totalVisitors)}
            </div>
          </div>
          <div
            className="inline-flex flex-col items-end rounded-lg px-2 py-1"
            style={{
              background: 'rgba(200,146,42,0.1)',
              color: 'var(--maroon)',
              minWidth: 92,
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Revenue</span>
            <span className="font-semibold" style={{ fontSize: 11 }}>{formatCurrency(place.totalAmount)}</span>
          </div>
        </div>

        <Link
          href={detailHref}
          className="w-full rounded-lg py-2 text-white font-medium transition-colors"
          style={{
            background: 'var(--maroon)',
            fontSize: 11,
            letterSpacing: '0.4px',
            display: 'block',
            textAlign: 'center',
          }}
          onMouseEnter={event => (event.currentTarget.style.background = 'var(--maroon-light)')}
          onMouseLeave={event => (event.currentTarget.style.background = 'var(--maroon)')}
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

export default function PlacesManagementView() {
  const [places, setPlaces] = useState<PlaceSummary[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalRecords, setTotalRecords] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlaces() {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          offSet: String(page - 1),
          size: String(pageSize),
          export: 'false',
          searchKey: searchTerm,
          deptList: '',
          divisionList: '',
          districtList: '',
          categoryList: '',
          statusList: '',
        })

        const response = await fetch(`/api/place?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}.`)
        }

        const payload = await response.json()
        const list = extractPlaces(payload)
        
        // Extract total records if available
        const total = payload?.result?.totalRecords ?? payload?.totalRecords ?? payload?.total ?? list.length
        setTotalRecords(total)

        const nextPlaces = list
          .map(mapPlaceItem)
          .filter((item): item is PlaceSummary => Boolean(item))
        setPlaces(nextPlaces)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch place data.')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlaces()

    return () => controller.abort()
  }, [reloadKey, page, pageSize, searchTerm])

  const filteredPlaces = places // We are now filtering on the server side via searchKey

  const totals = useMemo(() => {
    return filteredPlaces.reduce(
      (summary, place) => ({
        visitors: summary.visitors + place.totalVisitors,
        revenue: summary.revenue + place.totalAmount,
        bookings: summary.bookings + getTotalBookings(place),
      }),
      { visitors: 0, revenue: 0, bookings: 0 }
    )
  }, [filteredPlaces])

  if (!error && isLoading && places.length === 0) {
    return <LoadingState />
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif font-bold" style={{ fontSize: 28, color: 'var(--text-dark)', lineHeight: 1.1 }}>
            Place Management
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Live place-wise visitors, bookings and revenue from Rajasthan Tourism.
          </p>
        </div>
        <button
          onClick={() => setReloadKey(key => key + 1)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
          disabled={isLoading}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2"
          style={{ background: '#fff', border: '1px solid var(--sand)', minWidth: 260, maxWidth: 420 }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={searchTerm}
            onChange={event => {
              setSearchTerm(event.target.value)
              setPage(1)
            }}
            placeholder="Search by place name or code..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 12, color: 'var(--text-dark)' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="flex items-center justify-center rounded-full"
              style={{ width: 22, height: 22, color: 'var(--text-muted)' }}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Visible Places"
          value={formatNumber(filteredPlaces.length)}
          note={`${formatNumber(places.length)} total places`}
          icon={<Building2 size={20} />}
          color="var(--maroon)"
        />
        <SummaryCard
          label="Visitors"
          value={formatNumber(totals.visitors)}
          note="For current filter"
          icon={<Users size={20} />}
          color="var(--teal)"
        />
        <SummaryCard
          label="Revenue"
          value={formatCurrency(totals.revenue)}
          note="For current filter"
          icon={<IndianRupee size={20} />}
          color="var(--gold)"
        />
        <SummaryCard
          label="Bookings"
          value={formatNumber(totals.bookings)}
          note="Online and offline"
          icon={<Ticket size={20} />}
          color="var(--text-mid)"
        />
      </div>

      {error && <ErrorState message={error} onRetry={() => setReloadKey(key => key + 1)} />}

      {!error && places.length > 0 && (
        <div>
          <SectionHeader
            title="Dept. of Archaeology - Live Sites"
            right={
              <span className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Showing {formatNumber(Math.min((page - 1) * pageSize + 1, totalRecords))} - {formatNumber(Math.min(page * pageSize, totalRecords))} of {formatNumber(totalRecords)}
              </span>
            }
          />

          {filteredPlaces.length > 0 ? (
            <div className="space-y-6">
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
                {filteredPlaces.map(place => (
                  <PlaceCard key={getPlaceKey(place)} place={place} />
                ))}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t border-[var(--sand)] pt-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setPage(1)
                      }}
                      className="appearance-none rounded-xl pl-4 pr-10 py-2 outline-none font-medium transition-all hover:border-[var(--maroon)]"
                      style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', minWidth: 120 }}
                    >
                      {[10, 20, 50, 100].map(size => (
                        <option key={size} value={size}>{size} per page</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Total {formatNumber(totalRecords)} places
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1 || isLoading}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="flex items-center justify-center rounded-xl w-9 h-9 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--cream)]"
                    style={{ border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(totalRecords / pageSize)) }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrent = page === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className="flex items-center justify-center rounded-xl w-9 h-9 font-medium transition-all"
                          style={{ 
                            fontSize: 12,
                            background: isCurrent ? 'var(--maroon)' : 'transparent',
                            color: isCurrent ? '#fff' : 'var(--text-dark)',
                            border: isCurrent ? '1px solid var(--maroon)' : '1px solid transparent'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {Math.ceil(totalRecords / pageSize) > 5 && (
                      <span className="px-1 text-[var(--text-muted)]">...</span>
                    )}
                  </div>

                  <button
                    disabled={page >= Math.ceil(totalRecords / pageSize) || isLoading}
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center justify-center rounded-xl w-9 h-9 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--cream)]"
                    style={{ border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl3 px-5 py-8 text-center" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
              <div className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--text-dark)' }}>
                No places match this filter
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Try another search term.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
