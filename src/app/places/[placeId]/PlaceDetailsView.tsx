'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ClipboardList, Info, MapPin, Menu, RefreshCw, ShieldCheck } from 'lucide-react'
import BarChart, { type BarRow } from '@/components/charts/BarChart'
import DonutChart, { type DonutSegment } from '@/components/charts/DonutChart'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import SectionHeader from '@/components/ui/SectionHeader'
import StatCard from '@/components/ui/StatCard'
import { usePlaceStore } from '@/lib/store/use-place-store'
import type { HomeDetailsResponse, PlaceWiseReport, TicketHeadSummary, TicketTypeSummary } from '@/lib/api/services'

const ticketColors = ['#8B1A1A', '#C8922A', '#1A7A6E', '#E8B84B', '#A83030', '#C9B48A']

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

function getPlaceKey(place: PlaceWiseReport) {
  return place.placeId || place.placeCode || place.placeName
}

function getTotalBookings(place: PlaceWiseReport) {
  return place.totalBooking || place.totalBookingsOnline + place.totalBookingsOffline
}

function getRislAmount(place: PlaceWiseReport) {
  if (!place.ticketHeads || !Array.isArray(place.ticketHeads)) return 0
  return place.ticketHeads.reduce((sum, head) => {
    return head.name.toLowerCase().includes('risl') ? sum + head.amount : sum
  }, 0)
}

function matchesPlace(place: PlaceWiseReport, routePlaceId: string) {
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

function getBookingBars(place: PlaceWiseReport): BarRow[] {
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

function getTopTicketTypes(place: PlaceWiseReport) {
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
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Use the selected place from the store exclusively
  const place = useMemo(() => {
    if (selectedPlace && matchesPlace(selectedPlace, placeId)) {
      return selectedPlace
    }
    return null
  }, [placeId, selectedPlace])

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
        <EmptyPanel title="Place not found" note="The selected place was not available in the store. Please go back to the list and select it again." />
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
    { label: 'Latitude', value: place.latitude || 'N/A', icon: MapPin },
    { label: 'Longitude', value: place.longitude || 'N/A', icon: MapPin },
    { label: 'Address', value: place.address || 'N/A', icon: MapPin },
    { label: 'Contact', value: place.contactNo || 'N/A', icon: Info },
  ]

  return (
    <div className="px-6 py-6 space-y-6">
      <div
        className="rounded-xl3 overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(107,18,18,0.9), rgba(107,18,18,0.45)), url(/place-card-placeholder.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid var(--sand)',
        }}
      >
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="/places"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium"
                style={{ fontSize: 11, background: 'rgba(255,255,255,0.14)', color: '#fff' }}
              >
                <ArrowLeft size={12} />
                Places
              </Link>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium transition-colors"
                  style={{ 
                    fontSize: 11, 
                    background: dropdownOpen ? 'var(--gold)' : 'rgba(255,255,255,0.14)', 
                    color: dropdownOpen ? 'var(--maroon)' : '#fff' 
                  }}
                >
                  <Menu size={12} />
                  Management
                  <ChevronDown size={10} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div 
                      className="absolute left-0 mt-2 w-56 rounded-xl shadow-2xl z-20 py-2 overflow-hidden"
                      style={{ background: '#fff', border: '1px solid var(--sand)' }}
                    >
                      {[
                        { label: 'Informations', href: `/places/${encodeURIComponent(placeId)}` },
                        { label: 'Season Management', href: '#' },
                        { label: 'Masters', href: '/operations/service-head' },
                        { label: 'User Management', href: '/users' },
                        { label: 'Vendor Management', href: '/operations/vendors' },
                        { label: 'Quick Links', href: '#' },
                        { label: 'Category', href: '#' },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="block px-4 py-2.5 text-xs font-medium hover:bg-[var(--cream)] transition-colors"
                          style={{ color: 'var(--text-dark)' }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              {place.placeCode || 'Place Detail'}
            </div>
            <h1 className="font-serif font-bold" style={{ fontSize: 32, color: '#fff', lineHeight: 1.1 }}>
              {place.placeName}
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
              Place-wise dashboard for visitors, bookings, revenue and available fee heads.
            </p>
          </div>
        </div>
      </div>

      {/* Information Section */}
      <section className="rounded-xl3 border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
            <Info size={18} />
          </div>
          <div>
            <div className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--text-dark)' }}>Informations</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Detailed attributes and configuration of the selected place.</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {infoFields.map(field => {
            const Icon = field.icon
            return (
              <div key={field.label} className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                <div className="inline-flex items-center gap-2" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Icon size={12} style={{ color: 'var(--maroon)' }} />
                  {field.label}
                </div>
                <div className="mt-2" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{field.value}</div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Bookings"
          value={formatNumber(placeData.totalBookings)}
          badge={`${formatNumber(place.totalBookingsOnline)} online`}
          icon="BK"
          variant="maroon"
        />
        <StatCard
          label="Total Visitors"
          value={formatNumber(place.totalVisitors)}
          badge="From tickets"
          icon="VI"
          variant="teal"
        />
        <StatCard
          label="Total Amount"
          value={formatCurrency(place.totalAmount)}
          badge="Collected"
          icon="INR"
          variant="gold"
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
  )
}
