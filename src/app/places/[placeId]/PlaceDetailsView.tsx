'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import BarChart, { type BarRow } from '@/components/charts/BarChart'
import DonutChart, { type DonutSegment } from '@/components/charts/DonutChart'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import SectionHeader from '@/components/ui/SectionHeader'
import StatCard from '@/components/ui/StatCard'
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
  return place.ticketHeads.reduce((sum, head) => {
    return head.name.toLowerCase().includes('risl') ? sum + head.amount : sum
  }, 0)
}

function matchesPlace(place: PlaceWiseReport, routePlaceId: string) {
  const decodedPlaceId = decodeURIComponent(routePlaceId)

  return [place.placeId, place.placeCode, place.placeName]
    .filter(Boolean)
    .some(value => value === decodedPlaceId)
}

function getTicketSegments(ticketTypes: TicketTypeSummary[]): DonutSegment[] {
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
  const totalBookings = place.totalBookingsOnline + place.totalBookingsOffline
  const onlinePercent = totalBookings ? Math.round((place.totalBookingsOnline / totalBookings) * 100) : 0
  const offlinePercent = totalBookings ? 100 - onlinePercent : 0

  return [
    { label: 'Online', percent: onlinePercent, gradient: 'linear-gradient(90deg, #8B1A1A, #A83030)' },
    { label: 'Offline', percent: offlinePercent, gradient: 'linear-gradient(90deg, #C8922A, #E8B84B)' },
  ]
}

function getTopTicketTypes(place: PlaceWiseReport) {
  return [...place.ticketTypeListDtos]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 8)
}

function LoadingDetails() {
  return <RajasthanLoader label="Loading place details..." />
}

function DetailsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-6 py-6">
      <div
        className="rounded-xl3 p-5 flex items-start justify-between gap-4"
        style={{ background: '#fff', border: '1px solid var(--sand)' }}
      >
        <div>
          <div className="font-serif font-bold mb-1" style={{ fontSize: 20, color: 'var(--maroon)' }}>
            Place details unavailable
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>
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
    </div>
  )
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
  const [places, setPlaces] = useState<PlaceWiseReport[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlaceDetails() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/dashboard/home-details?isFilter=true', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}.`)
        }

        const payload = await response.json() as HomeDetailsResponse
        setPlaces(payload.result.placeWiseReports)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch place details.')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlaceDetails()

    return () => controller.abort()
  }, [reloadKey])

  const place = useMemo(() => places.find(item => matchesPlace(item, placeId)) ?? null, [placeId, places])

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
      ticketHeads: [...place.ticketHeads].sort((a, b) => b.amount - a.amount),
    }
  }, [place])

  if (error) {
    return <DetailsError message={error} onRetry={() => setReloadKey(key => key + 1)} />
  }

  if (isLoading && !place) {
    return <LoadingDetails />
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
        <EmptyPanel title="Place not found" note="The selected place was not available in the latest place-wise report." />
      </div>
    )
  }

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
            <Link
              href="/places"
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium mb-4"
              style={{ fontSize: 11, background: 'rgba(255,255,255,0.14)', color: '#fff' }}
            >
              <ArrowLeft size={12} />
              Places
            </Link>
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
          <button
            onClick={() => setReloadKey(key => key + 1)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{ fontSize: 12, background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

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
