'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ClipboardList, Info, MapPin, Menu, RefreshCw, ShieldCheck, Calendar, Users, Store, Link as LinkIcon, Settings, IndianRupee, Ticket, FileBarChart2 } from 'lucide-react'
import BarChart, { type BarRow } from '@/components/charts/BarChart'
import DonutChart, { type DonutSegment } from '@/components/charts/DonutChart'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import SectionHeader from '@/components/ui/SectionHeader'
import StatCard from '@/components/ui/StatCard'
import { usePlaceStore } from '@/lib/store/use-place-store'
import type { PlaceWiseReport, TicketHeadSummary, TicketTypeSummary } from '@/lib/api/services'
import SeasonManagement from './SeasonManagement'
import PlaceMastersView from './PlaceMastersView'
import PlaceQuickLinksView from './PlaceQuickLinksView'
import PlaceReportsView from './PlaceReportsView'
import PlaceUserManagementView from './PlaceUserManagementView'
import PlaceVendorManagementView from './PlaceVendorManagementView'
import { authFetch } from '@/lib/api/authFetch'

type ManagementView = 'informations' | 'season' | 'masters' | 'users' | 'vendors' | 'links' | 'reports' | 'category'

const MANAGEMENT_OPTIONS: Array<{ id: ManagementView; label: string;  icon: any }> = [
  { id: 'informations', label: 'Informations', icon: Info },
  { id: 'season', label: 'Season Management',icon: Calendar },
  { id: 'masters', label: 'Masters', icon: Settings },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'vendors', label: 'Vendor Management', icon: Store },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'links', label: 'Quick Links', icon: LinkIcon },
]

const ticketColors = ['#8B1A1A', '#C8922A', '#1A7A6E', '#E8B84B', '#A83030', '#C9B48A']

type PlaceDetailsRecord = PlaceWiseReport & Record<string, any>

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
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
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

function mapPlaceItem(item: unknown): PlaceDetailsRecord | null {
  if (!item || typeof item !== 'object') return null
  const obj = item as Record<string, unknown>

  const placeId = toText(obj.placeId ?? obj.id ?? obj.place_id ?? obj.placeID)
  const placeCode = toText(obj.placeCode ?? obj.place_code ?? obj.placecode ?? obj.code)
  const placeName = toText(obj.placeName ?? obj.name ?? obj.place_name ?? obj.placename)

  if (!placeId && !placeCode && !placeName) return null

  return {
    ...(obj as Record<string, any>),
    placeId,
    placeCode,
    placeName,
    totalVisitors: toNumber(obj.totalVisitors),
    totalAmount: toNumber(obj.totalAmount),
    totalBooking: toNumber(obj.totalBooking),
    totalBookingsOnline: toNumber(obj.totalBookingsOnline),
    totalBookingsOffline: toNumber(obj.totalBookingsOffline),
    ticketTypeListDtos: Array.isArray(obj.ticketTypeListDtos) ? obj.ticketTypeListDtos as TicketTypeSummary[] : [],
    ticketHeads: Array.isArray(obj.ticketHeads) ? obj.ticketHeads as TicketHeadSummary[] : [],
    offlineTicketTypeListDtos: Array.isArray(obj.offlineTicketTypeListDtos) ? obj.offlineTicketTypeListDtos as TicketTypeSummary[] : [],
    onlineTicketTypeListDtos: Array.isArray(obj.onlineTicketTypeListDtos) ? obj.onlineTicketTypeListDtos as TicketTypeSummary[] : [],
    offlineTicketHeads: Array.isArray(obj.offlineTicketHeads) ? obj.offlineTicketHeads as TicketHeadSummary[] : [],
    onlineTicketHeads: Array.isArray(obj.onlineTicketHeads) ? obj.onlineTicketHeads as TicketHeadSummary[] : [],
  }
}

function getTotalBookings(place: PlaceDetailsRecord) {
  return place.totalBooking || (Number(place.totalBookingsOnline ?? 0) + Number(place.totalBookingsOffline ?? 0))
}

function getRislAmount(place: PlaceDetailsRecord) {
  if (!place.ticketHeads || !Array.isArray(place.ticketHeads)) return 0
  return place.ticketHeads.reduce((sum, head) => {
    return head.name.toLowerCase().includes('risl') ? sum + head.amount : sum
  }, 0)
}

function matchesPlace(place: PlaceDetailsRecord, routePlaceId: string) {
  if (!place || !routePlaceId) return false
  const decodedPlaceId = decodeURIComponent(routePlaceId)

  return [place.placeId, place.placeCode, place.placeName]
    .filter(Boolean)
    .some(value => String(value) === decodedPlaceId)
}

function getTicketSegments(ticketTypes: TicketTypeSummary[]): DonutSegment[] {
  if (!ticketTypes || !Array.isArray(ticketTypes)) return []
  const totalTicketCount = ticketTypes.reduce((sum, ticketType) => sum + ticketType.ticketCount, 0)

  if (!totalTicketCount) {
    return []
  }

  return ticketTypes
    .filter(ticketType => ticketType.ticketCount > 0)
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .map((ticketType, index) => ({
      label: ticketType.ticketTypeName,
      value: Math.round((ticketType.ticketCount / totalTicketCount) * 100),
      count: formatNumber(ticketType.ticketCount),
      color: ticketColors[index % ticketColors.length],
    }))
}

function getBookingBars(place: PlaceDetailsRecord): BarRow[] {
  const online = Number(place.totalBookingsOnline ?? 0)
  const offline = Number(place.totalBookingsOffline ?? 0)
  const totalBookings = online + offline
  const onlinePercent = totalBookings ? Math.round((online / totalBookings) * 100) : 0
  const offlinePercent = totalBookings ? 100 - onlinePercent : 0

  return [
    { label: 'Online', percent: onlinePercent, gradient: 'linear-gradient(90deg, #8B1A1A, #A83030)' },
    { label: 'Offline', percent: offlinePercent, gradient: 'linear-gradient(90deg, #C8922A, #E8B84B)' },
  ]
}

function getTopTicketTypes(place: PlaceDetailsRecord) {
  if (!place.ticketTypeListDtos || !Array.isArray(place.ticketTypeListDtos)) return []
  return [...place.ticketTypeListDtos]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 8)
}

function EmptyPanel({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-xl3 p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
      <div className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--text-dark)' }}>
        {title}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{note}</p>
    </div>
  )
}

function TicketTypeRow({ ticketType, isLast }: { ticketType: TicketTypeSummary; isLast: boolean }) {
  return (
    <tr
      className="transition-colors hover:bg-[var(--cream)]"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--cream-dark)' }}
    >
      <td className="px-5 py-3 font-serif font-semibold" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
        {ticketType.ticketTypeName}
      </td>
      <td className="px-5 py-3" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
        {formatNumber(ticketType.ticketCount)}
      </td>
      <td className="px-5 py-3 font-semibold" style={{ fontSize: 12, color: 'var(--text-dark)' }}>
        {formatCurrency(ticketType.totalAmount)}
      </td>
      <td className="px-5 py-3" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
        {formatCurrency(ticketType.addOnAmountSum)}
      </td>
    </tr>
  )
}

function TicketHeadCard({ head }: { head: TicketHeadSummary }) {
  return (
    <div
      className="rounded-xl3 px-5 py-4 flex items-center gap-4"
      style={{ background: '#fff', border: '1px solid var(--sand)' }}
    >
      <div
        className="flex items-center justify-center rounded-xl text-lg font-serif font-bold flex-shrink-0"
        style={{ width: 48, height: 48, background: 'var(--cream-dark)', color: 'var(--maroon)' }}
      >
        INR
      </div>
      <div className="min-w-0">
        <div className="truncate" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 300 }}>
          {head.name}
        </div>
        <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--maroon)', lineHeight: 1.2 }}>
          {formatCurrency(head.amount)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{head.emitraId || 'No emitra id'}</div>
      </div>
    </div>
  )
}

export default function PlaceDetailsView({ placeId }: { placeId: string }) {
  const selectedPlace = usePlaceStore((state) => state.selectedPlace)
  const setSelectedPlace = usePlaceStore((state) => state.setSelectedPlace)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeView, setActiveView] = useState<ManagementView>('informations')
  const [fallbackPlace, setFallbackPlace] = useState<PlaceDetailsRecord | null>(null)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [placeError, setPlaceError] = useState('')

  const place = useMemo(() => {
    if (selectedPlace && matchesPlace(selectedPlace, placeId)) {
      return selectedPlace as PlaceDetailsRecord
    }
    if (fallbackPlace && matchesPlace(fallbackPlace, placeId)) {
      return fallbackPlace
    }
    return null
  }, [fallbackPlace, placeId, selectedPlace])

  useEffect(() => {
    if (selectedPlace && matchesPlace(selectedPlace as PlaceDetailsRecord, placeId)) {
      setFallbackPlace(selectedPlace as PlaceDetailsRecord)
      setPlaceError('')
      return
    }

    const controller = new AbortController()

    async function loadPlace() {
      try {
        setPlaceLoading(true)
        setPlaceError('')

        const params = new URLSearchParams({
          offSet: '0',
          size: '2000',
          export: 'false',
          searchKey: decodeURIComponent(placeId),
          deptList: '',
          divisionList: '',
          districtList: '',
          categoryList: '',
          statusList: '',
        })

        const response = await authFetch(`/place?${params.toString()}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}.`)
        }

        const payload = await response.json()
        const matchedPlace = extractPlaces(payload)
          .map(mapPlaceItem)
          .filter((item): item is PlaceDetailsRecord => Boolean(item))
          .find(item => matchesPlace(item, placeId))

        if (!matchedPlace) {
          throw new Error('Place details could not be found for the selected route.')
        }

        setFallbackPlace(matchedPlace)
        setSelectedPlace(matchedPlace)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setPlaceError(loadError instanceof Error ? loadError.message : 'Unable to load place details.')
      } finally {
        setPlaceLoading(false)
      }
    }

    void loadPlace()

    return () => controller.abort()
  }, [placeId, selectedPlace, setSelectedPlace])

  const placeType = useMemo(
    () =>
      toText((place as Record<string, unknown> | null)?.placeType)
      || toText((place as Record<string, unknown> | null)?.bookingType)
      || toText((((place as Record<string, unknown> | null)?.categoryDto as Record<string, unknown> | undefined)?.bookingType)),
    [place],
  )

  const isInventoryPlace = useMemo(
    () => String(placeType).toUpperCase() === 'INVENTORY',
    [placeType],
  )

  const visibleManagementOptions = useMemo(
    () => MANAGEMENT_OPTIONS.filter(option => {
      if (option.id === 'reports') return !isInventoryPlace
      if (option.id === 'vendors') return isInventoryPlace
      return true
    }),
    [isInventoryPlace],
  )

  useEffect(() => {
    if (!visibleManagementOptions.some(option => option.id === activeView)) {
      setActiveView('informations')
    }
  }, [activeView, visibleManagementOptions])

  const activeOption = useMemo(
    () => visibleManagementOptions.find(opt => opt.id === activeView) || visibleManagementOptions[0] || MANAGEMENT_OPTIONS[0],
    [activeView, visibleManagementOptions],
  )

  const placeData = useMemo(() => {
    if (!place) {
      return null
    }

    return {
      totalBookings: getTotalBookings(place),
      rislAmount: getRislAmount(place),
      ticketSegments: getTicketSegments(place.ticketTypeListDtos),
      bookingBars: getBookingBars(place),
      topTicketTypes: getTopTicketTypes(place),
      ticketHeads: Array.isArray(place.ticketHeads) ? [...place.ticketHeads].sort((a, b) => b.amount - a.amount) : [],
    }
  }, [place])

  if (!place && placeLoading) {
    return <RajasthanLoader label="Loading place details..." />
  }

  if (!place || !placeData) {
    return (
      <div className="px-6 py-6 space-y-4">
        <Link
          href="/places"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
          style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
        >
          <ArrowLeft size={13} />
          Back to places
        </Link>
        <EmptyPanel title="Place not found" note={placeError || 'The selected place could not be loaded for this route.'} />
      </div>
    )
  }

  const infoFields = [
    { label: 'Place Name', value: place.placeName || 'N/A', icon: MapPin },
    { label: 'Place Code', value: place.placeCode || 'N/A', icon: Info },
    { label: 'Department', value: place.departmentName || 'N/A', icon: ClipboardList },
    { label: 'Division', value: place.divisionName || 'N/A', icon: Info },
    { label: 'District', value: place.districtName || 'N/A', icon: Info },
    { label: 'Category', value: place.categoryDto?.categoryName || 'N/A', icon: Info },
    { label: 'Booking Type', value: place.categoryDto?.bookingType || 'N/A', icon: Info },
    { label: 'Status', value: place.active ? 'Active' : 'Inactive', icon: ShieldCheck },
  ]

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Redesigned Management Dropdown - Above Place Container */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/places"
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-[var(--sand)] text-[var(--text-mid)] hover:bg-[var(--cream)] transition-all"
          style={{ fontSize: 12 }}
        >
          <ArrowLeft size={14} />
          All Places
        </Link>

        <div className="relative flex-1 max-w-md">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-4 px-5 py-3.5 bg-white rounded-2xl border-2 transition-all"
            style={{ 
              borderColor: dropdownOpen ? 'var(--maroon)' : 'var(--sand)',
              boxShadow: dropdownOpen ? '0 8px 30px rgba(139, 26, 26, 0.12)' : 'none'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--cream)', color: 'var(--maroon)' }}>
                <activeOption.icon size={20} />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Management View</div>
                <div className="text-sm font-bold text-[var(--text-dark)]">{activeOption.label}</div>
              </div>
            </div>
            <ChevronDown size={20} className={`text-[var(--text-muted)] transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
              <div 
                className="absolute top-full left-0 right-0 mt-3 rounded-2xl border-2 bg-white shadow-2xl z-30 overflow-hidden animate-in slide-in-from-top-2 duration-200"
                style={{ borderColor: 'var(--sand)' }}
              >
                <div className="max-h-[300px] overflow-y-auto smooth-scroll"> 
                  {visibleManagementOptions.map((option) => {
                    const isActive = activeView === option.id
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          setActiveView(option.id)
                          setDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-[var(--cream)] ${
                          isActive ? 'bg-[var(--cream-dark)]' : ''
                        }`}
                      >
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                          isActive ? 'bg-[var(--maroon)] text-white' : 'bg-[var(--cream)] text-[var(--text-muted)]'
                        }`}>
                          <option.icon size={16} />
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${isActive ? 'text-[var(--maroon)]' : 'text-[var(--text-dark)]'}`}>
                            {option.label}
                          </div>
                         
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-[100px]" /> {/* Spacer to center dropdown */}
      </div>

      <div
        className="rounded-xl3 overflow-hidden shadow-sm"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(107,18,18,0.95), rgba(107,18,18,0.5)), url(/place-card-placeholder.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid var(--sand)',
        }}
      >
        <div className="px-8 py-8">
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 700 }}>
            {place.placeCode || 'Archaeological Site'}
          </div>
          <h1 className="font-serif font-bold mt-2" style={{ fontSize: 36, color: '#fff', lineHeight: 1.1 }}>
            {place.placeName}
          </h1>
          <p className="max-w-2xl" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8, lineHeight: 1.6 }}>
            Live analytics and management dashboard for visitors, revenue and operational configurations.
          </p>
        </div>
      </div>

      {/* Conditional Rendering Based on activeView */}
      {activeView === 'informations' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Information Section */}
          <section className="rounded-xl3 border bg-white p-6 shadow-sm" style={{ borderColor: 'var(--sand)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
                <Info size={24} />
              </div>
              <div>
                <div className="font-serif font-bold text-2xl text-[var(--text-dark)]">Place Informations</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Detailed operational attributes and configuration of the selected site.</div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {infoFields.map(field => {
                const Icon = field.icon
                return (
                  <div key={field.label} className="rounded-2xl border px-5 py-4 transition-all hover:shadow-md" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                    <div className="inline-flex items-center gap-2" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                      <Icon size={14} style={{ color: 'var(--maroon)' }} />
                      {field.label}
                    </div>
                    <div className="mt-2 text-base font-bold text-[var(--text-dark)]">{field.value}</div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <StatCard
              label="Total Visitors"
              value={formatNumber(place.totalVisitors)}
              badge="Lifetime footfall"
              icon="VI"
              variant="teal"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(place.totalAmount)}
              badge="Collected"
              icon="INR"
              variant="gold"
            />
            <StatCard
              label="Total Bookings"
              value={formatNumber(placeData.totalBookings)}
              badge="Online & Offline"
              icon="BK"
              variant="maroon"
            />
            <StatCard
              label="RISL Charge"
              value={formatCurrency(placeData.rislAmount)}
              badge="Available heads"
              icon="RC"
              variant="light"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl3 p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--text-dark)' }}>
                  Visitor Breakdown
                </h3>
                <span
                  className="rounded-full px-3 py-0.5 font-medium"
                  style={{ fontSize: 10, background: 'var(--gold-pale)', color: 'var(--gold)' }}
                >
                  Ticket Type
                </span>
              </div>
              {placeData.ticketSegments.length > 0 ? (
                <DonutChart segments={placeData.ticketSegments} />
              ) : (
                <EmptyPanel title="No ticket breakdown" note="No ticket type counts are available for this place." />
              )}
            </div>

            <div className="rounded-xl3 p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif font-bold" style={{ fontSize: 17, color: 'var(--text-dark)' }}>
                  Booking Sources
                </h3>
                <span
                  className="rounded-full px-3 py-0.5 font-medium"
                  style={{ fontSize: 10, background: 'var(--gold-pale)', color: 'var(--gold)' }}
                >
                  Online vs Offline
                </span>
              </div>
              <BarChart bars={placeData.bookingBars} />
            </div>
          </div>

          <div>
            <SectionHeader
              title="Ticket Type Reports"
              right={
                <span className="font-medium" style={{ fontSize: 11, color: 'var(--maroon)' }}>
                  Top by amount
                </span>
              }
            />
            {placeData.topTicketTypes.length > 0 ? (
              <div className="rounded-xl3 overflow-hidden" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                      {['Ticket Type', 'Tickets', 'Amount', 'Add-on Amount'].map(heading => (
                        <th
                          key={heading}
                          className="text-left font-semibold px-5 py-3"
                          style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {placeData.topTicketTypes.map((ticketType, index) => (
                      <TicketTypeRow
                        key={ticketType.ticketTypeName}
                        ticketType={ticketType}
                        isLast={index === placeData.topTicketTypes.length - 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel title="No ticket type reports" note="No ticket type values are available for this place." />
            )}
          </div>

          <div>
            <SectionHeader title="Fee Heads" />
            {placeData.ticketHeads.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {placeData.ticketHeads.map(head => (
                  <TicketHeadCard key={`${head.name}-${head.emitraId}`} head={head} />
                ))}
              </div>
            ) : (
              <EmptyPanel title="No fee heads" note="No fee head values are available for this place." />
            )}
          </div>
        </div>
      )}

      {activeView === 'season' && (
        <SeasonManagement
          placeId={place.id || place.placeId || placeId}
          routePlaceId={place.placeId || placeId}
          placeType={placeType}
        />
      )}

      {activeView === 'masters' && (
        <PlaceMastersView placeId={place.id || place.placeId || placeId} placeName={place.placeName} />
      )}

      {activeView === 'links' && (
        <PlaceQuickLinksView placeId={place.id || place.placeId || placeId} placeName={place.placeName} />
      )}

      {activeView === 'users' && (
        <PlaceUserManagementView place={{ id: place.id || place.placeId || placeId, deptId: place.deptId, districtId: place.districtId, divisionId: place.divisionId }} />
      )}

      {activeView === 'vendors' && (
        <PlaceVendorManagementView placeId={place.id || place.placeId || placeId} />
      )}

      {activeView === 'reports' && (
        <PlaceReportsView
          placeId={place.id || place.placeId || placeId}
          placeName={place.placeName}
        />
      )}

      {activeView !== 'informations' && activeView !== 'season' && activeView !== 'masters' && activeView !== 'links' && activeView !== 'users' && activeView !== 'vendors' && activeView !== 'reports' && (
        <div className="py-20 text-center animate-in fade-in duration-500 bg-white rounded-3xl border border-[var(--sand)]">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--cream)] text-[var(--maroon)] mb-4">
            <activeOption.icon size={40} />
          </div>
          <h2 className="font-serif font-bold text-2xl text-[var(--text-dark)]">{activeOption.label}</h2>
          <p className="text-[var(--text-muted)] mt-2 max-w-md mx-auto">
            The {activeOption.label.toLowerCase()} management module is currently under development. Please check back later for updates.
          </p>
        </div>
      )}
    </div>
  )
}
