'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, Filter, Minus, TrendingDown, TrendingUp, X } from 'lucide-react'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import SectionHeader from '@/components/ui/SectionHeader'
import type { HomeDetailsResponse, HomeDetailsReport, PlaceWiseReport, TicketHeadSummary } from '@/lib/api/services'

type MetricGroup = 'visitors' | 'revenue' | 'risl' | 'emitra' | 'charges' | 'fees'

interface MetricCard {
  key: string
  label: string
  value: number
  prefix?: string
  icon: string
  group: MetricGroup
  trend?: number
}

const GROUP_META: Record<MetricGroup, { label: string; color: string; bg: string; borderColor: string }> = {
  visitors: { label: 'Visitor Counts', color: '#1A7A6E', bg: 'rgba(26,122,110,0.07)', borderColor: 'rgba(26,122,110,0.2)' },
  revenue: { label: 'Bookings & Revenue', color: '#8B1A1A', bg: 'rgba(139,26,26,0.07)', borderColor: 'rgba(139,26,26,0.2)' },
  risl: { label: 'RISL Charges', color: '#6B1212', bg: 'rgba(107,18,18,0.07)', borderColor: 'rgba(107,18,18,0.2)' },
  emitra: { label: 'Emitra Commission', color: '#C8922A', bg: 'rgba(200,146,42,0.08)', borderColor: 'rgba(200,146,42,0.25)' },
  charges: { label: 'Dept. Charges', color: '#5A3A1A', bg: 'rgba(90,58,26,0.07)', borderColor: 'rgba(90,58,26,0.2)' },
  fees: { label: 'Fees & Development', color: '#8B1A1A', bg: 'rgba(139,26,26,0.07)', borderColor: 'rgba(139,26,26,0.2)' },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value)
}

function fmt(value: number, prefix?: string) {
  return prefix ? formatCurrency(value) : formatNumber(value)
}

function getMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthOptions() {
  const today = new Date()

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
    const value = getMonthValue(date)

    return {
      val: value,
      label: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    }
  })
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  const startDay = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime()
  const endDay = new Date(year, month, 0, 23, 59, 59, 999).getTime()

  return { startDay, endDay }
}

function formatMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  const startLabel = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const endLabel = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return `${startLabel} to ${endLabel}`
}

function classifyTicketHead(name: string): MetricGroup {
  const normalized = name.toLowerCase()

  if (normalized.includes('risl')) return 'risl'
  if (normalized.includes('emitra')) return 'emitra'
  if (normalized.includes('fee')) return 'fees'

  return 'charges'
}

function getHeadKey(head: string) {
  return head.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function aggregateHeads(places: PlaceWiseReport[]) {
  const headMap = new Map<string, TicketHeadSummary>()

  places.forEach(place => {
    place.ticketHeads.forEach(head => {
      const key = `${head.name}-${head.emitraId}`
      const current = headMap.get(key)

      headMap.set(key, {
        ...head,
        amount: (current?.amount ?? 0) + head.amount,
      })
    })
  })

  return Array.from(headMap.values()).sort((a, b) => b.amount - a.amount)
}

function aggregateTicketCounts(places: PlaceWiseReport[]) {
  const ticketCount: Record<string, number> = {}

  places.forEach(place => {
    place.ticketTypeListDtos.forEach(ticketType => {
      ticketCount[ticketType.ticketTypeName] = (ticketCount[ticketType.ticketTypeName] ?? 0) + ticketType.ticketCount
    })
  })

  return ticketCount
}

function getFilteredPlaces(report: HomeDetailsReport, placeFilter: string) {
  const normalizedFilter = placeFilter.trim().toLowerCase()

  if (!normalizedFilter) {
    return report.placeWiseReports
  }

  return report.placeWiseReports.filter(place => {
    return place.placeName.toLowerCase().includes(normalizedFilter)
      || place.placeCode.toLowerCase().includes(normalizedFilter)
  })
}

function getMetricCards(report: HomeDetailsReport, placeFilter: string): MetricCard[] {
  const filteredPlaces = getFilteredPlaces(report, placeFilter)
  const hasPlaceFilter = placeFilter.trim().length > 0
  const ticketCounts = hasPlaceFilter ? aggregateTicketCounts(filteredPlaces) : report.totalTicketCount
  const totalVisitors = hasPlaceFilter
    ? filteredPlaces.reduce((sum, place) => sum + place.totalVisitors, 0)
    : report.totalVisitors
  const totalAmount = hasPlaceFilter
    ? filteredPlaces.reduce((sum, place) => sum + place.totalAmount, 0)
    : report.totalAmount
  const totalBookingsOnline = hasPlaceFilter
    ? filteredPlaces.reduce((sum, place) => sum + place.totalBookingsOnline, 0)
    : report.totalBookingsOnline
  const totalBookingsOffline = hasPlaceFilter
    ? filteredPlaces.reduce((sum, place) => sum + place.totalBookingsOffline, 0)
    : report.totalBookingsOffline
  const headCards = aggregateHeads(filteredPlaces).map(head => ({
    key: `head-${getHeadKey(head.name)}-${head.emitraId}`,
    label: head.name.trim(),
    value: head.amount,
    prefix: 'INR',
    icon: 'INR',
    group: classifyTicketHead(head.name),
  }))

  const visitorCards = Object.entries(ticketCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({
      key: `visitor-${getHeadKey(label)}`,
      label,
      value,
      icon: 'CT',
      group: 'visitors' as const,
    }))

  return [
    ...visitorCards,
    { key: 'totalVisitors', label: 'Total Visitors', value: totalVisitors, icon: 'VI', group: 'revenue' },
    { key: 'totalBookings', label: 'Total Bookings', value: totalBookingsOnline + totalBookingsOffline, icon: 'BK', group: 'revenue' },
    { key: 'onlineBookings', label: 'Online Bookings', value: totalBookingsOnline, icon: 'ON', group: 'revenue' },
    { key: 'offlineBookings', label: 'Offline Bookings', value: totalBookingsOffline, icon: 'OF', group: 'revenue' },
    { key: 'totalAmount', label: 'Total Amount', value: totalAmount, prefix: 'INR', icon: 'INR', group: 'revenue' },
    ...headCards,
  ]
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) {
    return (
      <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, background: 'rgba(154,122,90,0.1)', color: '#9A7A5A' }}>
        <Minus size={9} /> 0%
      </span>
    )
  }

  if (pct > 0) {
    return (
      <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }}>
        <TrendingUp size={9} /> +{pct}%
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 10, background: 'rgba(229,62,62,0.1)', color: '#E53E3E' }}>
      <TrendingDown size={9} /> {pct}%
    </span>
  )
}

function MetricCardUI({ card }: { card: MetricCard }) {
  const gm = GROUP_META[card.group]
  const isEmpty = card.value === 0

  return (
    <div
      className="rounded-xl overflow-hidden card-lift flex flex-col"
      style={{ background: '#fff', border: `1px solid ${gm.borderColor}`, minHeight: 120 }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${gm.color}, ${gm.color}66)` }} />
      <div className="flex flex-col flex-1 px-5 py-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center justify-center rounded-lg flex-shrink-0 font-serif font-bold"
              style={{ width: 32, height: 32, background: gm.bg, fontSize: 12, color: gm.color }}
            >
              {card.icon}
            </span>
            <span
              className="font-semibold uppercase leading-tight"
              style={{ fontSize: 10, color: gm.color, letterSpacing: '0.8px', maxWidth: 160 }}
            >
              {card.label}
            </span>
          </div>
          {card.trend !== undefined && <TrendBadge pct={card.trend} />}
        </div>
        <div
          className="font-serif font-bold mt-auto"
          style={{
            fontSize: isEmpty ? 32 : card.value >= 1000000 ? 22 : card.value >= 100000 ? 26 : 30,
            color: isEmpty ? 'var(--text-muted)' : gm.color,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}
        >
          {fmt(card.value, card.prefix)}
        </div>
      </div>
    </div>
  )
}

function GroupSection({ group, cards }: { group: MetricGroup; cards: MetricCard[] }) {
  const gm = GROUP_META[group]
  const groupTotal = cards.filter(card => card.prefix).reduce((sum, card) => sum + card.value, 0)

  return (
    <div className="mb-6">
      <SectionHeader
        title={gm.label}
        right={
          groupTotal > 0 ? (
            <span className="font-serif font-semibold" style={{ fontSize: 13, color: gm.color }}>
              {formatCurrency(groupTotal)}
            </span>
          ) : undefined
        }
      />
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {cards.map(card => (
          <MetricCardUI key={card.key} card={card} />
        ))}
      </div>
    </div>
  )
}

export default function DashboardMonthWiseView() {
  const monthOptions = useMemo(() => getMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthValue())
  const [showFilter, setShowFilter] = useState(false)
  const [place, setPlace] = useState('')
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [report, setReport] = useState<HomeDetailsReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const { startDay, endDay } = getMonthRange(selectedMonth)

    async function loadMonthReport() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/dashboard/home-details?isFilter=true&startDay=${startDay}&endDay=${endDay}`, {
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
        setReport(payload.result)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch month-wise dashboard data.')
      } finally {
        setIsLoading(false)
      }
    }

    loadMonthReport()

    return () => controller.abort()
  }, [selectedMonth])

  const cards = useMemo(() => report ? getMetricCards(report, place) : [], [place, report])
  const grouped = useMemo(() => {
    return cards.reduce<Record<MetricGroup, MetricCard[]>>((map, card) => {
      map[card.group].push(card)
      return map
    }, {
      visitors: [],
      revenue: [],
      risl: [],
      emitra: [],
      charges: [],
      fees: [],
    })
  }, [cards])
  const grandTotal = cards.find(card => card.key === 'totalAmount')?.value ?? 0
  const totalVisitorCount = cards.find(card => card.key === 'totalVisitors')?.value ?? 0
  const totalBookingCount = cards.find(card => card.key === 'totalBookings')?.value ?? 0
  const selectedLabel = monthOptions.find(month => month.val === selectedMonth)?.label ?? selectedMonth

  if (isLoading && !report) {
    return <RajasthanLoader label="Loading month-wise dashboard..." />
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}
      >
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>
            DashBoard Month Wise
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Monthly breakdown of visitors, bookings and fee heads
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={event => setSelectedMonth(event.target.value)}
              className="appearance-none rounded-xl pl-9 pr-8 py-2 outline-none font-medium"
              style={{ fontSize: 12, background: 'var(--gold-pale)', border: '1px solid var(--gold)', color: 'var(--maroon)', minWidth: 160 }}
            >
              {monthOptions.map(month => <option key={month.val} value={month.val}>{month.label}</option>)}
            </select>
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gold)' }} />
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--gold)' }} />
          </div>

          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--sand)' }}>
            {(['grouped', 'flat'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  fontSize: 11,
                  background: viewMode === mode ? 'var(--maroon)' : '#fff',
                  color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilter(value => !value)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{
              fontSize: 12,
              background: showFilter ? 'var(--maroon)' : 'var(--cream-dark)',
              border: `1px solid ${showFilter ? 'var(--maroon)' : 'var(--sand)'}`,
              color: showFilter ? '#fff' : 'var(--text-mid)',
            }}
          >
            <Filter size={13} />
            Filter
          </button>
        </div>
      </div>

      {showFilter && (
        <div
          className="flex items-end gap-4 px-6 py-4 flex-wrap"
          style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}
        >
          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 180 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Place / Site
            </label>
            <input
              value={place}
              onChange={event => setPlace(event.target.value)}
              className="rounded-xl px-3 py-2 outline-none"
              style={{ fontSize: 12, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
              placeholder="Filter by place..."
            />
          </div>

          <button
            onClick={() => setShowFilter(false)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: 'var(--maroon)' }}
          >
            Apply
          </button>
          <button
            onClick={() => setPlace('')}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium"
            style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)' }}
          >
            <X size={11} /> Reset
          </button>
        </div>
      )}

      <div
        className="flex items-center justify-center py-2.5"
        style={{ borderBottom: '1px solid var(--sand)', background: 'var(--cream)' }}
      >
        <span className="font-medium" style={{ fontSize: 13, color: 'var(--maroon)' }}>
          {formatMonthLabel(selectedMonth)}
          {isLoading ? ' loading...' : ''}
        </span>
      </div>

      {error && (
        <div className="px-6 py-4" style={{ background: 'var(--cream)' }}>
          <div className="rounded-xl3 px-5 py-4" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--maroon)' }}>
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 px-6 py-5" style={{ background: 'var(--cream)' }}>
        <div
          className="rounded-xl3 px-6 py-5 col-span-1 relative overflow-hidden flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 100%)', color: '#fff' }}
        >
          <div style={{ position: 'absolute', top: -28, right: -28, width: 88, height: 88, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <span className="font-serif font-bold" style={{ fontSize: 28, flexShrink: 0 }}>INR</span>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Grand Total Revenue</div>
            <div className="font-serif font-bold" style={{ fontSize: 28, lineHeight: 1.1 }}>
              {formatCurrency(grandTotal)}
            </div>
            <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>{selectedLabel}</div>
          </div>
        </div>

        <div
          className="rounded-xl3 px-6 py-5 flex items-center gap-4"
          style={{ background: '#fff', border: '1px solid rgba(26,122,110,0.2)' }}
        >
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0 font-serif font-bold"
            style={{ width: 56, height: 56, background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}
          >
            VI
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Visitors</div>
            <div className="font-serif font-bold" style={{ fontSize: 32, color: '#1A7A6E', lineHeight: 1.1 }}>
              {formatNumber(totalVisitorCount)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{selectedLabel}</div>
          </div>
        </div>

        <div
          className="rounded-xl3 px-6 py-5 flex items-center gap-4"
          style={{ background: '#fff', border: '1px solid rgba(200,146,42,0.2)' }}
        >
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0 font-serif font-bold"
            style={{ width: 56, height: 56, background: 'rgba(200,146,42,0.08)', color: '#C8922A' }}
          >
            BK
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Bookings</div>
            <div className="font-serif font-bold" style={{ fontSize: 32, color: '#C8922A', lineHeight: 1.1 }}>
              {formatNumber(totalBookingCount)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{selectedLabel}</div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        {viewMode === 'grouped' ? (
          (Object.entries(grouped) as [MetricGroup, MetricCard[]][])
            .filter(([, groupCards]) => groupCards.length > 0)
            .map(([group, groupCards]) => (
              <GroupSection key={group} group={group} cards={groupCards} />
            ))
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 3, height: 18, background: 'linear-gradient(180deg, var(--gold), var(--maroon))', borderRadius: 99, flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--maroon)' }}>
                All Metrics - {selectedLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--sand)' }} />
              <span className="font-serif font-semibold" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {cards.length} metrics
              </span>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {cards.map(card => (
                <MetricCardUI key={card.key} card={card} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
