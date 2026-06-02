'use client'

import { useEffect, useMemo, useState } from 'react'
import StatCard from '@/components/ui/StatCard'
import SectionHeader from '@/components/ui/SectionHeader'
import DonutChart, { type DonutSegment } from '@/components/charts/DonutChart'
import BarChart, { type BarRow } from '@/components/charts/BarChart'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import type { HomeDetailsResponse, HomeDetailsReport, PlaceWiseReport } from '@/lib/api/services'
import { baseUrl } from '../api/common.route'
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

function sumRecordValues(record?: Record<string, number> | null) {
  return Object.values(record ?? {})
    .reduce((sum, value) => sum + value, 0)
}

function getTotalBookings(report: HomeDetailsReport) {
  return report.totalBookingsOnline + report.totalBookingsOffline
}

function getRislAmount(report: HomeDetailsReport) {
  return report.placeWiseReports.reduce((total, place) => {
    const rislAmount = place.ticketHeads.reduce((sum, head) => {
      return head.name.toLowerCase().includes('risl') ? sum + head.amount : sum
    }, 0)

    return total + rislAmount
  }, 0)
}

function getDonutSegments(report: HomeDetailsReport): DonutSegment[] {
  const ticketCount = report.totalTicketCount ?? {}

  const totalTicketCount = Object.values(ticketCount)
    .reduce((sum, count) => sum + count, 0)

  return Object.entries(ticketCount)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count], index) => ({
      label,
      value: totalTicketCount
        ? Math.round((count / totalTicketCount) * 100)
        : 0,
      count: formatNumber(count),
      color: ticketColors[index % ticketColors.length],
    }))
}

function getBookingBars(report: HomeDetailsReport): BarRow[] {
  const totalBookings = getTotalBookings(report)
  const onlinePercent = totalBookings ? Math.round((report.totalBookingsOnline / totalBookings) * 100) : 0
  const offlinePercent = totalBookings ? 100 - onlinePercent : 0

  return [
    { label: 'Online', percent: onlinePercent, gradient: 'linear-gradient(90deg, #8B1A1A, #A83030)' },
    { label: 'Offline', percent: offlinePercent, gradient: 'linear-gradient(90deg, #C8922A, #E8B84B)' },
  ]
}

function getTopPlaces(report: HomeDetailsReport) {
  return [...report.placeWiseReports]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 6)
}

function LoadingDashboard() {
  return <RajasthanLoader label="Loading dashboard..." />
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="px-6 py-6">
      <div className="rounded-xl3 p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
        <div className="font-serif font-bold mb-1" style={{ fontSize: 20, color: 'var(--maroon)' }}>
          Dashboard data unavailable
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>
      </div>
    </div>
  )
}

function PlaceRow({ place, isLast }: { place: PlaceWiseReport; isLast: boolean }) {
  return (
    <tr
      className="transition-colors hover:bg-[var(--cream)]"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--cream-dark)' }}
    >
      <td className="px-5 py-3 font-medium" style={{ fontSize: 12, color: 'var(--maroon)' }}>
        {place.placeCode}
      </td>
      <td className="px-5 py-3 font-serif font-semibold" style={{ fontSize: 13, color: 'var(--text-dark)' }}>
        {place.placeName}
      </td>
      <td className="px-5 py-3" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
        {formatNumber(place.totalVisitors)}
      </td>
      <td className="px-5 py-3 font-semibold" style={{ fontSize: 12, color: 'var(--text-dark)' }}>
        {formatCurrency(place.totalAmount)}
      </td>
      <td className="px-5 py-3" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
        {formatNumber(place.totalBookingsOnline)}
      </td>
      <td className="px-5 py-3" style={{ fontSize: 12, color: 'var(--text-mid)' }}>
        {formatNumber(place.totalBookingsOffline)}
      </td>
    </tr>
  )
}

export default function DashboardView() {
  const [report, setReport] = useState<HomeDetailsReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      try {
        setError(null)

        const sessionResponse = await fetch('/api/auth/session', {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        if (!sessionResponse.ok) {
          throw new Error(`Unable to read auth session (${sessionResponse.status}).`)
        }

        const sessionPayload = await sessionResponse.json() as {
          authenticated?: boolean
          token?: string
        }

        if (!sessionPayload.authenticated || !sessionPayload.token) {
          throw new Error('Missing auth token.')
        }

        const response = await fetch(`${baseUrl}/home/details?isFilter=true`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${sessionPayload.token}`,
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}.`)
        }

        const payload = await response.json() as HomeDetailsResponse
        console.log('Dashboard API Response', payload.result)
        setReport(payload.result)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch dashboard data.')
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [])

  const dashboardData = useMemo(() => {
    if (!report) {
      return null
    }

    return {
      totalBookings: getTotalBookings(report),
      liveSites: report.placeWiseReports.length,
      rislAmount: getRislAmount(report),
      donutSegments: getDonutSegments(report),
      bookingBars: getBookingBars(report),
      topPlaces: getTopPlaces(report),
      offlineBookings: sumRecordValues(report.offlineTotalTicketCount),
      offlineAmount: sumRecordValues(report.offlineTotalTicketAmount),
      onlineBookings: sumRecordValues(report.onlineTotalTicketCount),
      onlineAmount: sumRecordValues(report.onlineTotalTicketAmount),
    }
  }, [report])

  if (error) {
    return <DashboardError message={error} />
  }

  if (!report || !dashboardData) {
    return <LoadingDashboard />
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between -mb-2">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 300 }}>
          Welcome to the Online Booking Management System
        </p>
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
          style={{ fontSize: 11, background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}
        >
          <span className="live-pulse rounded-full" style={{ width: 6, height: 6, background: '#1A7A6E', display: 'inline-block' }} />
          {formatNumber(dashboardData.liveSites)} Sites Live
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Bookings"
          value={formatNumber(dashboardData.totalBookings)}
          badge={`${formatNumber(report.totalBookingsOnline)} online`}
          icon="BK"
          variant="maroon"
        />
        <StatCard
          label="Total Visitors"
          value={formatNumber(report.totalVisitors)}
          badge="From tickets"
          icon="VI"
          variant="teal"
        />
        <StatCard
          label="Total Amount"
          value={formatCurrency(report.totalAmount)}
          badge="Collected"
          icon="INR"
          variant="gold"
        />
        <StatCard
          label="RISL Charge"
          value={formatCurrency(dashboardData.rislAmount)}
          badge="Total"
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
          <DonutChart segments={dashboardData.donutSegments} />
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
          <BarChart bars={dashboardData.bookingBars} />
        </div>
      </div>

      <div>
        <SectionHeader
          title="Place-wise Reports"
          right={
            <span className="font-medium" style={{ fontSize: 11, color: 'var(--maroon)' }}>
              Top by amount
            </span>
          }
        />
        <div className="rounded-xl3 overflow-hidden" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                {['Code', 'Place', 'Visitors', 'Amount', 'Online', 'Offline'].map(h => (
                  <th
                    key={h}
                    className="text-left font-semibold px-5 py-3"
                    style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboardData.topPlaces.map((place, index) => (
                <PlaceRow key={place.placeId} place={place} isLast={index === dashboardData.topPlaces.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: 'Offline Bookings',
            icon: 'OF',
            bookingValue: formatNumber(dashboardData.offlineBookings),
            amountValue: formatCurrency(dashboardData.offlineAmount),
          },
          {
            label: 'Online Bookings',
            icon: 'ON',
            bookingValue: formatNumber(dashboardData.onlineBookings),
            amountValue: formatCurrency(dashboardData.onlineAmount),
          },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl3 px-5 py-4 flex items-center gap-4"
            style={{ background: '#fff', border: '1px solid var(--sand)' }}
          >
            <div
              className="flex items-center justify-center rounded-xl text-xl font-serif font-bold flex-shrink-0"
              style={{ width: 48, height: 48, background: 'var(--cream-dark)', color: 'var(--maroon)' }}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 300 }}>{s.label}</div>
              <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--maroon)', lineHeight: 1.2 }}>{s.bookingValue}</div>
              <div className="font-serif" style={{ fontSize: 14, color: 'var(--maroon)', fontWeight: 600 }}>
                Total Amount: {s.amountValue}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
