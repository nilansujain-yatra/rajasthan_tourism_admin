'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Calendar, Download, Eye, Filter, Loader2, MapPin, Printer, Search, Ticket, X } from 'lucide-react'
import { readCachedAuthUser } from '@/lib/auth/client-session'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ReportTab = 'pending' | 'generated'

type ApiPayload = {
  result?: unknown
  data?: unknown
  message?: string
  [key: string]: unknown
}

type Option = {
  id: string
  label: string
}

type PlaceOption = Option

type PendingRow = {
  bookingId: string
  bookingDateTime: string
  visitDate: string
  totalUsers: number
  totalAmount: number
  diffAmount: number
  vehicleNumber: string
  guideName: string
  transactionStatus: string
  bookingMode: string
}

type GeneratedRow = {
  bookingId: string
  bookingReferenceId: string
  boardingPassId: string
  createdDateTime: string
  vehicleNumber: string
  guideName: string
  generatedBy: string
  generatedBySsoId: string
  driverName: string
  driverMobile: string
  guideMobile: string
}

type Filters = {
  startDate: string
  endDate: string
  date: string
  placeId: string
  seasonId: string
  quotaId: string
  shiftId: string
  zoneId: string
  inventoryId: string
}

type InvoiceLine = {
  ticketName: string
  quantity: number
  totalAmount: number
}

type InvoiceAddonLine = {
  ticketName: string
  name: string
  quantity: number
  totalAmount: number
}

type InvoiceData = {
  bookingId: string
  bookingDate: number
  placeName: string
  districtName: string
  purchasePlaceName: string
  userName: string
  email: string
  mobile: string
  totalAmount: number
  totalUsers: number
  qrDetail: string
  kioskId: string
  ticketSummary: InvoiceLine[]
  addonSummary: InvoiceAddonLine[]
}

const PAGE_SIZE = 10

const emptyFilters = (): Filters => ({
  startDate: todayInput(),
  endDate: todayInput(),
  date: todayInput(),
  placeId: '',
  seasonId: '',
  quotaId: '',
  shiftId: '',
  zoneId: '',
  inventoryId: '',
})

function todayInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inputDateToStartMs(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '' : String(date.getTime())
}

function inputDateToEndMs(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? '' : String(date.getTime())
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function getAny(source: unknown, keys: string[]) {
  if (!source || typeof source !== 'object') return undefined
  const row = source as Record<string, unknown>
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  return undefined
}

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth > 5) return null

  const record = value as Record<string, unknown>
  for (const key of ['result', 'data', 'content', 'rows', 'items', 'list']) {
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

function formatEpochDate(value: unknown) {
  const date = new Date(toNumber(value))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatEpochDateTime(value: unknown) {
  const date = new Date(toNumber(value))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

function normalizeOption(item: unknown, labelKeys: string[] = ['name', 'label'], idKeys: string[] = ['id']) {
  if (!item || typeof item !== 'object') return null
  const value = item as Record<string, unknown>
  const id = toText(getAny(value, idKeys))
  const label = toText(getAny(value, labelKeys))
  if (!id || !label) return null
  return { id, label }
}

function extractOptions(payload: unknown, keys: string[], labelKeys?: string[], idKeys?: string[]) {
  const root = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>)
    : {}
  const result = root.result && typeof root.result === 'object'
    ? (root.result as Record<string, unknown>)
    : root

  for (const key of keys) {
    const list = findFirstArray(result[key])
    if (list) {
      return list
        .map(item => normalizeOption(item, labelKeys, idKeys))
        .filter((item): item is Option => Boolean(item))
    }
  }

  return [] as Option[]
}

function extractPlaces(payload: unknown) {
  const list = findFirstArray(payload)
  if (!list) return [] as PlaceOption[]

  return list
    .map(item => normalizeOption(item, ['placeName', 'name'], ['id', 'placeId']))
    .filter((item): item is PlaceOption => Boolean(item))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function extractTotalRecords(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0
  const root = payload as Record<string, unknown>
  const result = root.result && typeof root.result === 'object'
    ? (root.result as Record<string, unknown>)
    : root

  return toNumber(
    getAny(result, ['totalRecords', 'total', 'count']) ??
      getAny(root, ['totalRecords', 'total', 'count']),
    0,
  )
}

function extractPendingRows(payload: unknown) {
  const root = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>)
    : {}
  const result = root.result && typeof root.result === 'object'
    ? (root.result as Record<string, unknown>)
    : root
  const list = Array.isArray(result.ticketBookingDetailDtos) ? result.ticketBookingDetailDtos : findFirstArray(result)

  if (!list) return [] as PendingRow[]

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        bookingId: toText(getAny(row, ['bookingId', 'booking_id']), 'N/A'),
        bookingDateTime: formatEpochDateTime(getAny(row, ['createdDate', 'bookingDate', 'created_date'])),
        visitDate: formatEpochDate(getAny(row, ['bookingDate', 'visitDate', 'visit_date'])),
        totalUsers: toNumber(getAny(row, ['totalUsers', 'totalMember', 'totalVisitors'])),
        totalAmount: toNumber(getAny(row, ['totalAmount', 'paidAmount', 'amount'])),
        diffAmount: toNumber(getAny(row, ['diffAmount', 'differenceAmount'])),
        vehicleNumber: toText(getAny(row, ['vehicalNumber', 'vehicleNumber', 'vehicleNo']), 'N/A'),
        guideName: toText(getAny(row, ['guideName', 'guide', 'guideId']), 'N/A'),
        transactionStatus: toText(getAny(row, ['transactionStatus', 'paymentStatus', 'status']), 'SUCCESS'),
        bookingMode: toText(getAny(row, ['bookingMode', 'mode']), 'ONLINE'),
      }
    })
}

function extractGeneratedRows(payload: unknown) {
  const root = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>)
    : {}
  const result = root.result && typeof root.result === 'object'
    ? (root.result as Record<string, unknown>)
    : root
  const list = Array.isArray(result.boardingPassDetailDtos) ? result.boardingPassDetailDtos : findFirstArray(result)

  if (!list) return [] as GeneratedRow[]

  return list
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      const operatorDetail = row.operatorDetail && typeof row.operatorDetail === 'object'
        ? row.operatorDetail as Record<string, unknown>
        : null

      return {
        bookingId: toText(getAny(row, ['bookingId', 'bookingNo']), 'N/A'),
        bookingReferenceId: toText(getAny(row, ['bookingObjectId', 'bookingRefId', 'bookingId']), 'N/A'),
        boardingPassId: toText(getAny(row, ['boardingPassId', 'boardingPassNo']), ''),
        createdDateTime: formatEpochDateTime(getAny(row, ['createdDate', 'boardingDate', 'date'])),
        vehicleNumber: toText(getAny(row, ['vehicleNo', 'vehicleNumber', 'vehicleId']), 'N/A'),
        guideName: toText(getAny(row, ['guideId']), 'N/A'),
        generatedBy: toText(getAny(operatorDetail, ['displayName']) ?? getAny(row, ['generatedBy']), 'System'),
        generatedBySsoId: toText(getAny(operatorDetail, ['ssoId']), ''),
        driverName: toText(getAny(row, ['driverName']), 'N/A'),
        driverMobile: toText(getAny(row, ['driverMobile']), 'N/A'),
        guideMobile: toText(getAny(row, ['guideMobile']), 'N/A'),
      }
    })
}

function buildQrImageUrl(qrDetail: string) {
  if (!qrDetail.trim()) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrDetail)}`
}

function normalizeInvoiceData(payload: unknown) {
  const root = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : {}
  const result = root.result && typeof root.result === 'object'
    ? root.result as Record<string, unknown>
    : null

  if (!result) return null

  const ticketSummary = findFirstArray(result.ticketTypeCountDto ?? result.ticketSummary ?? result.lines)
    ?.filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        ticketName: toText(getAny(row, ['ticketTypeName', 'name', 'ticketName']), 'Ticket'),
        quantity: toNumber(getAny(row, ['totalCount', 'quantity', 'qty']), 0),
        totalAmount: toNumber(getAny(row, ['totalAmount', 'amount']), 0),
      }
    })
    ?? []

  const addonSummary = findFirstArray(result.addOnSummary ?? result.addOnList)
    ?.filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        ticketName: toText(getAny(row, ['ticketName', 'ticketTypeName']), 'Add-on'),
        name: toText(getAny(row, ['name', 'addOnName']), 'Add-on'),
        quantity: toNumber(getAny(row, ['quantity', 'qty', 'count']), 0),
        totalAmount: toNumber(getAny(row, ['totalAmount', 'amount']), 0),
      }
    })
    ?? []

  return {
    bookingId: toText(getAny(result, ['bookingId', 'booking_id']), 'N/A'),
    bookingDate: toNumber(getAny(result, ['bookingDate', 'createdDate'])),
    placeName: toText(getAny(result.placeDetailDto, ['name']) ?? getAny(result.placeDto, ['name']) ?? getAny(result, ['placeName']), 'N/A'),
    districtName: toText(getAny(result.placeDetailDto, ['districtName']) ?? getAny(result.districtDto, ['name']) ?? getAny(result, ['districtName'])),
    purchasePlaceName: toText(getAny(result.purchasePlaceDto, ['name'])),
    userName: toText(getAny(result.userDetailDto, ['displayName', 'name']), 'Guest'),
    email: toText(getAny(result.userDetailDto, ['email'])),
    mobile: toText(getAny(result.userDetailDto, ['mobile'])),
    totalAmount: toNumber(getAny(result, ['totalAmountWithAddOn', 'totalAmount'])),
    totalUsers: toNumber(getAny(result, ['totalUsers'])),
    qrDetail: toText(getAny(result, ['qrDetail'])),
    kioskId: toText(getAny(result.userDetailDto, ['kisokId', 'kioskId'])),
    ticketSummary,
    addonSummary,
  } satisfies InvoiceData
}

function printInvoice(invoice: InvoiceData) {
  const popup = window.open('', '_blank', 'width=920,height=840')
  if (!popup) return

  const qrImageUrl = buildQrImageUrl(invoice.qrDetail)
  const ticketRows = invoice.ticketSummary.map(item => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px dotted #d7c8bf;">${item.ticketName}</td>
      <td style="padding:6px 0;border-bottom:1px dotted #d7c8bf;text-align:right;">${item.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px dotted #d7c8bf;text-align:right;">${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalAmount)}</td>
    </tr>
  `).join('')

  const addonRows = invoice.addonSummary.map(item => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px dotted #d7c8bf;">${item.ticketName} - ${item.name}</td>
      <td style="padding:6px 0;border-bottom:1px dotted #d7c8bf;text-align:right;">${item.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px dotted #d7c8bf;text-align:right;">${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalAmount)}</td>
    </tr>
  `).join('')

  popup.document.write(`
    <html>
      <head>
        <title>Booking ${invoice.bookingId}</title>
        <style>
          body { font-family: Arial, sans-serif; background:#fff; color:#111; margin:0; padding:24px; }
          .card { max-width:780px; margin:0 auto; border:1px solid #eadfd8; border-radius:18px; padding:24px; }
          .muted { color:#6b7280; }
          table { width:100%; border-collapse:collapse; margin-top:12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin:0 0 4px;">${invoice.placeName}</h2>
          <div class="muted">${invoice.districtName || ''}</div>
          ${qrImageUrl ? `<img src="${qrImageUrl}" alt="QR" style="display:block;margin:18px auto 12px;width:120px;height:120px;" />` : ''}
          <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:8px;">
            <div><strong>Booking ID</strong><div>${invoice.bookingId}</div></div>
            <div><strong>Booking Date</strong><div>${formatEpochDateTime(invoice.bookingDate)}</div></div>
            <div><strong>User</strong><div>${invoice.userName}</div></div>
            <div><strong>Visitors</strong><div>${invoice.totalUsers}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;padding:8px 0;border-bottom:2px solid #eadfd8;">Ticket</th>
                <th style="text-align:right;padding:8px 0;border-bottom:2px solid #eadfd8;">Qty</th>
                <th style="text-align:right;padding:8px 0;border-bottom:2px solid #eadfd8;">Amount</th>
              </tr>
            </thead>
            <tbody>${ticketRows || '<tr><td colspan="3" style="padding:10px 0;">No ticket summary available.</td></tr>'}</tbody>
          </table>
          ${addonRows ? `
            <table>
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px 0;border-bottom:2px solid #eadfd8;">Add-on</th>
                  <th style="text-align:right;padding:8px 0;border-bottom:2px solid #eadfd8;">Qty</th>
                  <th style="text-align:right;padding:8px 0;border-bottom:2px solid #eadfd8;">Amount</th>
                </tr>
              </thead>
              <tbody>${addonRows}</tbody>
            </table>
          ` : ''}
          <div style="display:flex;justify-content:space-between;margin-top:18px;font-size:18px;font-weight:700;">
            <span>Total Amount</span>
            <span>${formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
    </html>
  `)
  popup.document.close()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="space-y-2">
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl px-4 py-3 outline-none"
        style={{ fontSize: 12, border: '1px solid var(--sand)', background: disabled ? 'var(--cream)' : '#fff', color: 'var(--text-dark)' }}
      >
        <option value="">All</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function VehicleDetailsDialog({
  data,
  onClose,
}: {
  data: GeneratedRow | PendingRow
  onClose: () => void
}) {
  const isGenerated = 'boardingPassId' in data
  const genData = isGenerated ? data as GeneratedRow : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.38)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl"
        style={{ background: '#fff', boxShadow: '0 32px 80px rgba(15,23,42,0.24)' }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, #1A7A6E, #2A9A8C)' }}>
          <div>
            <div className="font-serif font-bold" style={{ fontSize: 20 }}>Vehicle Details</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Vehicle information for booking {data.bookingId}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Vehicle Number</div>
              <div className="mt-1 font-bold" style={{ fontSize: 16, color: 'var(--text-dark)' }}>{data.vehicleNumber}</div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Guide Name</div>
              <div className="mt-1 font-bold" style={{ fontSize: 16, color: 'var(--text-dark)' }}>{data.guideName}</div>
            </div>
          </div>

          {isGenerated && genData && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Driver Name</div>
                <div className="mt-1 font-bold" style={{ fontSize: 16, color: 'var(--text-dark)' }}>{genData.driverName}</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Driver Mobile</div>
                <div className="mt-1 font-bold" style={{ fontSize: 16, color: 'var(--text-dark)' }}>{genData.driverMobile}</div>
              </div>
              <div className="rounded-2xl p-4 md:col-span-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Guide Mobile</div>
                <div className="mt-1 font-bold" style={{ fontSize: 16, color: 'var(--text-dark)' }}>{genData.guideMobile}</div>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Booking Context</div>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Booking ID</span>
                <span className="font-semibold">{data.bookingId}</span>
              </div>
              {'createdDateTime' in data ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Generated On</span>
                  <span className="font-semibold">{data.createdDateTime}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Visit Date</span>
                  <span className="font-semibold">{data.visitDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t px-6 py-4" style={{ borderColor: '#e2e8f0' }}>
          <button onClick={onClose} className="rounded-xl px-6 py-2.5 font-semibold text-white" style={{ background: '#1A7A6E', fontSize: 14 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

async function downloadBoardingPassPdf(row: GeneratedRow) {
  const doc = new jsPDF()
  const qrUrl = buildQrImageUrl(row.boardingPassId || row.bookingId)

  // Title & Header
  doc.setFontSize(16)
  doc.setTextColor(107, 18, 18) // var(--maroon)
  doc.text('Government of Rajasthan', 105, 15, { align: 'center' })
  doc.setFontSize(12)
  doc.text('Department of Tourism', 105, 22, { align: 'center' })
  
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 28, 196, 28)

  doc.setFontSize(18)
  doc.text('BOARDING PASS', 105, 38, { align: 'center' })
  
  // Main Info Table
  autoTable(doc, {
    startY: 45,
    theme: 'grid',
    head: [['Field', 'Information']],
    body: [
      ['Boarding Pass ID', row.boardingPassId || 'N/A'],
      ['Booking ID', row.bookingId],
      ['Created Date', row.createdDateTime],
      ['Vehicle Number', row.vehicleNumber],
      ['Guide Name', row.guideName],
      ['Generated By', row.generatedBy],
    ],
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [107, 18, 18], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  })

  // Add QR Code placeholder (or actual if we could load it)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('Scan for Verification', 105, (doc as any).lastAutoTable.finalY + 30, { align: 'center' })
  
  // Footer
  doc.setFontSize(9)
  doc.text('This is a computer generated boarding pass.', 105, 280, { align: 'center' })

  doc.save(`boarding-pass-${row.boardingPassId || row.bookingId}.pdf`)
}

function StatCard({ label, value, accent = 'var(--maroon)' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div className="font-serif font-bold" style={{ fontSize: 24, color: accent, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function InvoiceModal({
  bookingId,
  onClose,
}: {
  bookingId: string
  onClose: () => void
}) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const fetchInvoice = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/operator-booking/invoice?bookingId=${encodeURIComponent(bookingId)}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch invoice')
        const payload = await res.json()
        if (active) setData(payload?.result)
      } catch (err) {
        if (active) setError('Unable to load invoice details.')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchInvoice()
    return () => { active = false }
  }, [bookingId])

  const downloadPdf = () => {
    if (!data) return
    const doc = new jsPDF()
    // Minimal PDF implementation for now
    doc.setFontSize(16)
    doc.text('Invoice', 105, 15, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Booking ID: ${data.bookingId}`, 20, 25)
    doc.text(`Visit Date: ${data.visitDate || 'N/A'}`, 20, 30)
    doc.save(`invoice-${bookingId}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-[32px] bg-white shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-6 top-6 z-10 p-2 rounded-full bg-black/5 hover:bg-black/10 transition text-gray-500">
          <X size={20} />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={32} className="animate-spin text-maroon" />
            <div className="text-muted font-medium">Preparing your invoice...</div>
          </div>
        ) : error ? (
          <div className="py-32 text-center text-red-600 font-medium">{error}</div>
        ) : data ? (
          <div className="flex flex-col min-h-full">
            {/* Header with Gradient Background */}
            <div className="relative p-8 pb-12 overflow-hidden">
              <div 
                className="absolute inset-0 z-0 opacity-10"
                style={{ 
                  backgroundImage: 'url(https://admin-tourist.rajasthan.gov.in/images/pdf-gradient.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              
              <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-4">
                  <h1 className="text-4xl font-serif font-bold text-gray-900">Invoice</h1>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Invoice Details:</div>
                    <div className="text-sm"><span className="text-gray-500">Booking ID:</span> <span className="font-mono font-bold">#{data.bookingId}</span></div>
                    <div className="text-sm"><span className="text-gray-500">Visit Date:</span> <span className="font-semibold">{data.visitDate || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right space-y-6">
                  <img src="https://admin-tourist.rajasthan.gov.in/images/main-logo.png" alt="Rajasthan Tourism" className="h-16 object-contain" />
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 min-w-[200px]">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice To:</div>
                    <div className="text-sm font-bold text-gray-800 break-all">{data.userDetailDto?.email}</div>
                    <div className="text-sm text-gray-600">{data.userDetailDto?.mobile}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="px-8 pb-8 flex-1">
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Visitor's Entry Ticket : {data.placeDetailDto?.name}</h2>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin size={14} />
                  Location: {data.placeDetailDto?.name}, {data.districtDto?.name}, Rajasthan
                </div>
              </div>

              {/* Items Table */}
              <div className="w-full">
                <div className="grid grid-cols-[1fr_80px_120px_120px] px-4 py-3 bg-gray-50 rounded-xl mb-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  <div>Item</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Total</div>
                </div>

                <div className="space-y-6 px-2">
                  {/* Ticket Types Grouped */}
                  {data.ticketTypeCountDto?.map((item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_120px_120px] items-start border-b border-gray-50 pb-4 last:border-0">
                      <div>
                        <div className="font-bold text-gray-900 mb-2">{item.ticketTypeName}</div>
                        <div className="space-y-1.5 pl-2 border-l-2 border-gray-100">
                          {/* Item Breakdown (simulated since actual breakdown fields vary) */}
                          <div className="text-[12px] text-gray-500 flex justify-between pr-8">
                            <span>Base Fee</span>
                            <span>{formatCurrency(item.totalAmount / item.totalCount)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center font-bold text-gray-700">{item.totalCount}</div>
                      <div className="text-right text-gray-500">{formatCurrency(item.totalAmount / item.totalCount)}</div>
                      <div className="text-right font-bold text-gray-900">{formatCurrency(item.totalAmount)}</div>
                    </div>
                  ))}

                  {/* Addons if any */}
                  {data.addOnSummary?.map((addon: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_120px_120px] items-center py-4 border-t border-dashed border-gray-200">
                      <div className="font-bold text-gray-900">Add-On ({addon.name})</div>
                      <div className="text-center font-bold text-gray-700">{addon.quantity}</div>
                      <div className="text-right text-gray-500">{formatCurrency(addon.totalAmount / addon.quantity)}</div>
                      <div className="text-right font-bold text-gray-900">{formatCurrency(addon.totalAmount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Footer */}
              <div className="mt-12 pt-6 border-t-2 border-gray-900 flex justify-between items-center px-4">
                <div className="text-xl font-bold text-gray-900">Total Payment</div>
                <div className="text-3xl font-serif font-bold text-maroon">{formatCurrency(data.totalAmountWithAddOn || data.totalAmount)}</div>
              </div>
            </div>
            
            <div className="p-8 bg-gray-50 flex justify-end gap-3">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-white transition">Close</button>
              <button onClick={downloadPdf} className="px-8 py-2.5 rounded-xl bg-maroon text-white font-bold shadow-lg shadow-maroon/20 hover:opacity-90 transition flex items-center gap-2">
                <Printer size={18} />
                Print Invoice
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function BoardingPassReport({
  lockedPlaceId = '',
  lockedPlaceName,
}: {
  lockedPlaceId?: string
  lockedPlaceName?: string
}) {
  const [activeTab, setActiveTab] = useState<ReportTab>('pending')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters)

  const [places, setPlaces] = useState<PlaceOption[]>([])
  const [seasons, setSeasons] = useState<Option[]>([])
  const [quotas, setQuotas] = useState<Option[]>([])
  const [shifts, setShifts] = useState<Option[]>([])
  const [zones, setZones] = useState<Option[]>([])
  const [inventoryTypes, setInventoryTypes] = useState<Option[]>([])

  const [siteAdminPlaceId, setSiteAdminPlaceId] = useState('')
  const [isSiteAdmin, setIsSiteAdmin] = useState(false)

  const [pendingRows, setPendingRows] = useState<PendingRow[]>([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [generatedRows, setGeneratedRows] = useState<GeneratedRow[]>([])
  const [generatedTotal, setGeneratedTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const [invoiceOpen, setInvoiceOpen] = useState<string | null>(null)
  const [vehicleDetailsRow, setVehicleDetailsRow] = useState<GeneratedRow | PendingRow | null>(null)

  const lockedPlace = lockedPlaceId.trim()
  const treatAsLockedPlace = Boolean(lockedPlace)
  const effectivePlaceId = (treatAsLockedPlace ? lockedPlace : isSiteAdmin ? siteAdminPlaceId : appliedFilters.placeId).trim()
  const effectiveDraftPlaceId = (treatAsLockedPlace ? lockedPlace : isSiteAdmin ? siteAdminPlaceId : draftFilters.placeId).trim()

  const currentRows = activeTab === 'pending' ? pendingRows : generatedRows
  const visiblePendingRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return pendingRows.slice(start, start + PAGE_SIZE)
  }, [currentPage, pendingRows])
  const visibleRows = activeTab === 'pending' ? visiblePendingRows : generatedRows
  const totalRecords = activeTab === 'pending' ? pendingTotal : generatedTotal
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))

  const selectedPlaceLabel = useMemo(
    () => lockedPlaceName || (places.find(place => place.id === effectivePlaceId)?.label ?? 'All Places'),
    [effectivePlaceId, lockedPlaceName, places],
  )
  const selectedSeasonLabel = useMemo(
    () => seasons.find(item => item.id === appliedFilters.seasonId)?.label ?? 'All Seasons',
    [appliedFilters.seasonId, seasons],
  )
  const selectedQuotaLabel = useMemo(
    () => quotas.find(item => item.id === appliedFilters.quotaId)?.label ?? 'All Quotas',
    [appliedFilters.quotaId, quotas],
  )
  const selectedShiftLabel = useMemo(
    () => shifts.find(item => item.id === appliedFilters.shiftId)?.label ?? 'All Shifts',
    [appliedFilters.shiftId, shifts],
  )
  const selectedZoneLabel = useMemo(
    () => zones.find(item => item.id === appliedFilters.zoneId)?.label ?? 'All Zones',
    [appliedFilters.zoneId, zones],
  )
  const selectedVehicleLabel = useMemo(
    () => inventoryTypes.find(item => item.id === appliedFilters.inventoryId)?.label ?? 'All Vehicle Types',
    [appliedFilters.inventoryId, inventoryTypes],
  )

  const totalAmount = useMemo(
    () => currentRows.reduce((sum, row) => sum + ('totalAmount' in row ? row.totalAmount : 0), 0),
    [currentRows],
  )

  useEffect(() => {
    const user = readCachedAuthUser()
    const placeId = Array.isArray(user?.placeId) ? toText(user?.placeId[0]) : ''
    const isCurrentSiteAdmin = String(user?.userType ?? '').toUpperCase() === 'SITE_ADMIN'
    setIsSiteAdmin(isCurrentSiteAdmin)
    setSiteAdminPlaceId(placeId)

    if (treatAsLockedPlace) {
      const next = emptyFilters()
      next.placeId = lockedPlace
      setDraftFilters(next)
      setAppliedFilters(next)
    } else if (isCurrentSiteAdmin && placeId) {
      const next = emptyFilters()
      next.placeId = placeId
      setDraftFilters(next)
      setAppliedFilters(next)
    }
  }, [lockedPlace, treatAsLockedPlace])

  useEffect(() => {
    let cancelled = false

    async function loadPlaces() {
      try {
        const response = await fetch('/api/place?districtId=&searchKey=&deptList=&size=2000', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(toText((payload as ApiPayload).message, 'Unable to load places.'))
        if (!cancelled) {
          setPlaces(extractPlaces(payload))
        }
      } catch {
        if (!cancelled) {
          setPlaces([])
        }
      }
    }

    loadPlaces()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const placeId = effectiveDraftPlaceId
    if (!placeId) {
      setSeasons([])
      setQuotas([])
      setShifts([])
      setZones([])
      setInventoryTypes([])
      return
    }

    let cancelled = false

    async function loadContextOptions() {
      try {
        const [seasonResponse, detailResponse] = await Promise.all([
          fetch(`/season?placeId=${encodeURIComponent(placeId)}`, { cache: 'no-store' }),
          fetch(`/api/booking/placeDetails/v2?placeId=${encodeURIComponent(placeId)}${draftFilters.seasonId ? `&seasonId=${encodeURIComponent(draftFilters.seasonId)}` : ''}`, { cache: 'no-store' }),
        ])

        const seasonPayload = await seasonResponse.json().catch(() => ({}))
        const detailPayload = await detailResponse.json().catch(() => ({}))

        if (!cancelled) {
          setSeasons(extractOptions(seasonPayload, ['seasons', 'seasonDto', 'result'], ['seasonName', 'name'], ['id', 'seasonId']))
          setQuotas(extractOptions(detailPayload, ['quota', 'quotaData', 'quotaDto', 'quotas'], ['name', 'quotaName'], ['id', 'quotaId']))
          setShifts(extractOptions(detailPayload, ['shiftData', 'shiftDto', 'shifts'], ['name', 'shiftName'], ['id', 'shiftId']))
          setZones(extractOptions(detailPayload, ['zoneData', 'zoneDto', 'zones'], ['name', 'zoneName'], ['id', 'zoneId']))
          setInventoryTypes(extractOptions(detailPayload, ['inventoryList', 'inventoryData', 'inventoryDto'], ['masterTicketTypeName', 'name'], ['id', 'inventoryId']))
        }
      } catch {
        if (!cancelled) {
          setSeasons([])
          setQuotas([])
          setShifts([])
          setZones([])
          setInventoryTypes([])
        }
      }
    }

    loadContextOptions()

    return () => {
      cancelled = true
    }
  }, [draftFilters.seasonId, effectiveDraftPlaceId])

  useEffect(() => {
    const placeId = effectivePlaceId
    if (!placeId) {
      setPendingRows([])
      setPendingTotal(0)
      setGeneratedRows([])
      setGeneratedTotal(0)
      return
    }

    let cancelled = false

    async function loadReport() {
      setLoading(true)
      setError(null)

      try {
        if (activeTab === 'pending') {
          const params = new URLSearchParams({
            startDate: inputDateToStartMs(appliedFilters.startDate),
            endDate: inputDateToEndMs(appliedFilters.endDate),
            placeId,
            quotaId: appliedFilters.quotaId,
            shiftId: appliedFilters.shiftId,
            zoneId: appliedFilters.zoneId,
            inventoryId: appliedFilters.inventoryId,
            bookingId: searchApplied,
          })

          const response = await fetch(`/api/boarding/reports/pending?${params.toString()}`, { cache: 'no-store' })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(toText((payload as ApiPayload).message, 'Unable to load pending boarding passes.'))

          const rows = extractPendingRows(payload)
          if (!cancelled) {
            setPendingRows(rows)
            setPendingTotal(extractTotalRecords(payload) || rows.length)
          }
        } else {
          const params = new URLSearchParams({
            date: inputDateToStartMs(appliedFilters.date),
            offSet: String(Math.max(0, currentPage - 1)),
            size: String(PAGE_SIZE),
            placeId,
            shiftId: appliedFilters.shiftId,
            zoneId: appliedFilters.zoneId,
            inventoryId: appliedFilters.inventoryId,
            searchKey: searchApplied,
          })

          const response = await fetch(`/api/boarding/reports/generated?${params.toString()}`, { cache: 'no-store' })
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(toText((payload as ApiPayload).message, 'Unable to load generated boarding passes.'))

          const rows = extractGeneratedRows(payload)
          if (!cancelled) {
            setGeneratedRows(rows)
            setGeneratedTotal(extractTotalRecords(payload) || rows.length)
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load report.')
          if (activeTab === 'pending') {
            setPendingRows([])
            setPendingTotal(0)
          } else {
            setGeneratedRows([])
            setGeneratedTotal(0)
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadReport()

    return () => {
      cancelled = true
    }
  }, [activeTab, appliedFilters, currentPage, effectivePlaceId, searchApplied])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  const applyFilters = () => {
    setAppliedFilters({
      ...draftFilters,
      placeId: treatAsLockedPlace ? lockedPlace : isSiteAdmin ? siteAdminPlaceId : draftFilters.placeId,
    })
    setCurrentPage(1)
    setFiltersOpen(false)
  }

  const resetFilters = () => {
    const next = emptyFilters()
    if (treatAsLockedPlace && lockedPlace) {
      next.placeId = lockedPlace
    } else if (isSiteAdmin && siteAdminPlaceId) {
      next.placeId = siteAdminPlaceId
    }
    setDraftFilters(next)
    setAppliedFilters(next)
    setSearchInput('')
    setSearchApplied('')
    setCurrentPage(1)
  }

  const handleDraftPlaceChange = (placeId: string) => {
    setDraftFilters(current => ({
      ...current,
      placeId,
      seasonId: '',
      quotaId: '',
      shiftId: '',
      zoneId: '',
      inventoryId: '',
    }))
  }

  const handleExport = async () => {
    if (!effectivePlaceId) return

    setExporting(true)
    try {
      const params = new URLSearchParams({
        placeId: effectivePlaceId,
        shiftId: appliedFilters.shiftId,
        zoneId: appliedFilters.zoneId,
        inventoryId: appliedFilters.inventoryId,
      })

      if (activeTab === 'pending') {
        params.set('startDate', inputDateToStartMs(appliedFilters.startDate))
        params.set('endDate', inputDateToEndMs(appliedFilters.endDate))
        params.set('quotaId', appliedFilters.quotaId)
        params.set('bookingId', searchApplied)
        params.set('export', 'true')
        params.set('pagination', 'false')
      } else {
        params.set('date', inputDateToStartMs(appliedFilters.date))
        params.set('searchKey', searchApplied)
        params.set('export', 'true')
        params.set('pagination', 'false')
      }

      const response = await fetch(`/api/boarding/reports/${activeTab}?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(toText((payload as ApiPayload).message, 'Unable to export report.'))
      }

      const blob = await response.blob()
      downloadBlob(blob, `${activeTab}-boarding-pass-report-${Date.now()}.csv`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export report.')
    } finally {
      setExporting(false)
    }
  }

  const openInvoice = async (bookingId: string) => {
    setInvoiceOpen(bookingId)
  }

  const openBoardingPass = (bookingReferenceId: string, boardingPassId: string) => {
    const url = `/api/boarding/invoice?bookingId=${encodeURIComponent(bookingReferenceId)}&boardingPassId=${encodeURIComponent(boardingPassId)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-dark)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--sand)', background: '#fff' }}>
        <div>
          <h2 className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Boarding Pass Report</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)', minWidth: 250 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  setSearchApplied(searchInput.trim())
                  setCurrentPage(1)
                }
              }}
              placeholder={activeTab === 'pending' ? 'Search booking ID…' : 'Search booking / boarding…'}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: 12, color: 'var(--text-dark)' }}
            />
            {searchInput ? (
              <button onClick={() => { setSearchInput(''); setSearchApplied(''); setCurrentPage(1) }}>
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            ) : null}
          </div>

          <button
            onClick={() => { setSearchApplied(searchInput.trim()); setCurrentPage(1) }}
            className="rounded-xl px-4 py-2"
            style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)', background: '#fff' }}
          >
            Apply Search
          </button>

          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
            style={{ fontSize: 12, background: 'var(--cream-dark)', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
          >
            <Filter size={13} /> Filters
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || !effectivePlaceId}
            className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-white"
            style={{ fontSize: 12, background: exporting || !effectivePlaceId ? '#bba8a1' : 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}
          >
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-3" style={{ background: 'var(--cream)', borderBottom: '1px solid var(--sand)' }}>
        {[
          { id: 'pending' as const, label: 'Pending Boarding Passes' },
          { id: 'generated' as const, label: 'Generated Boarding Passes' },
        ].map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1) }}
              className="rounded-full px-4 py-2 font-medium"
              style={{ fontSize: 12, background: active ? 'var(--maroon)' : '#fff', color: active ? '#fff' : 'var(--text-mid)', border: `1px solid ${active ? 'var(--maroon)' : 'var(--sand)'}` }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-6 py-3" style={{ background: '#fff', borderBottom: '1px solid var(--sand)' }}>
        {activeTab === 'pending' ? (
          <>
            <Chip label="Start Date" value={appliedFilters.startDate || '-'} />
            <Chip label="End Date" value={appliedFilters.endDate || '-'} />
            <Chip label="Place" value={selectedPlaceLabel} />
            <Chip label="Season" value={selectedSeasonLabel} />
            <Chip label="Quota" value={selectedQuotaLabel} />
            <Chip label="Shift" value={selectedShiftLabel} />
            <Chip label="Zone" value={selectedZoneLabel} />
            <Chip label="Vehicle" value={selectedVehicleLabel} />
          </>
        ) : (
          <>
            <Chip label="Date" value={appliedFilters.date || '-'} />
            <Chip label="Place" value={selectedPlaceLabel} />
            <Chip label="Zone" value={selectedZoneLabel} />
            <Chip label="Shift" value={selectedShiftLabel} />
            <Chip label="Vehicle" value={selectedVehicleLabel} />
          </>
        )}
      </div>

      <div className="grid gap-3 px-6 py-4 md:grid-cols-2 xl:grid-cols-4" style={{ background: 'var(--cream)' }}>
        <StatCard label={activeTab === 'pending' ? 'Pending Records' : 'Generated Records'} value={totalRecords.toLocaleString('en-IN')} />
        <StatCard label="Visible Rows" value={visibleRows.length.toLocaleString('en-IN')} accent="#1A7A6E" />
        <StatCard label="Search" value={searchApplied || 'All'} accent="#9A7A5A" />
        <StatCard label="Amount" value={formatCurrency(totalAmount)} accent="#7C3AED" />
      </div>

      <div className="px-6 pb-6">
        <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--sand)', background: '#fff' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: activeTab === 'pending' ? 1100 : 980 }}>
              <thead style={{ background: 'var(--cream)' }}>
                <tr>
                  {activeTab === 'pending'
                    ? ['Booking ID', 'Booking Date & Time', 'Visit Date', 'Total Users', 'Paid Amount', 'Difference Amount', 'Vehicle Number', 'Guide Name', 'Mode', 'Status']
                        .map(header => <Th key={header} label={header} />)
                    : ['Booking ID',  'Created Date', 'Vehicle Number', 'Guide Name', 'Generated By', 'Action']
                        .map(header => <Th key={header} label={header} />)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={activeTab === 'pending' ? 10 : 7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading boarding pass report…</td></tr>
                ) : error ? (
                  <tr><td colSpan={activeTab === 'pending' ? 10 : 7} style={{ padding: 40, textAlign: 'center', color: '#B42318', fontSize: 13 }}>{error}</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={activeTab === 'pending' ? 10 : 7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No boarding pass records found for the selected filters.</td></tr>
                ) : activeTab === 'pending' ? (
                  (visibleRows as PendingRow[]).map((row, index) => (
                    <tr key={`${row.bookingId}-${index}`} style={{ borderTop: '1px solid var(--sand)' }}>
                      <Td>
                        <button onClick={() => openInvoice(row.bookingId)} style={{ color: 'var(--maroon)', fontWeight: 700, textDecoration: 'underline', fontFamily: 'monospace', fontSize: 12 }}>
                          {row.bookingId}
                        </button>
                      </Td>
                      <Td>{row.bookingDateTime}</Td>
                      <Td>{row.visitDate}</Td>
                      <Td align="right">{row.totalUsers}</Td>
                      <Td align="right">{formatCurrency(row.totalAmount)}</Td>
                      <Td align="right">{formatCurrency(row.diffAmount)}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setVehicleDetailsRow(row)}
                            className="text-left"
                            style={{ color: 'var(--text-dark)', fontWeight: 600 }}
                          >
                            {row.vehicleNumber}
                          </button>
                          <button
                            onClick={() => setVehicleDetailsRow(row)}
                            className="text-muted hover:text-maroon transition"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </Td>
                      <Td>{row.guideName}</Td>
                      <Td><StatusPill label={row.bookingMode} tone="soft" /></Td>
                      <Td><StatusPill label={row.transactionStatus} tone={row.transactionStatus === 'SUCCESS' ? 'success' : 'warn'} /></Td>
                    </tr>
                  ))
                ) : (
                  (visibleRows as GeneratedRow[]).map((row, index) => (
                    <tr key={`${row.boardingPassId || row.bookingId}-${index}`} style={{ borderTop: '1px solid var(--sand)' }}>
                      <Td>
                        <button
                          onClick={() => setInvoiceOpen(row.bookingId)}
                          style={{ color: 'var(--maroon)', fontWeight: 700, textDecoration: 'underline', fontFamily: 'monospace', fontSize: 12 }}
                        >
                          {row.bookingId}
                        </button>
                      </Td>
                      {/* <Td>{row.boardingPassId || 'N/A'}</Td> */}
                      <Td>{row.createdDateTime}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {row.vehicleNumber}
                          <button
                            onClick={() => setVehicleDetailsRow(row)}
                            className="text-muted hover:text-maroon transition"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </Td>
                      <Td>{row.guideName}</Td>
                      <Td>
                        <div className="flex flex-col">
                          <span className="font-semibold" style={{ fontSize: 13, color: 'var(--text-dark)' }}>{row.generatedBy}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.generatedBySsoId}</span>
                        </div>
                      </Td>
                      <Td>
                        <button
                          onClick={() => downloadBoardingPassPdf(row)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:opacity-80"
                          style={{ background: 'var(--maroon)' }}
                          title="Print Boarding Pass"
                        >
                          <Printer size={14} />
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages} · {totalRecords.toLocaleString('en-IN')} total records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                className="rounded-xl px-3 py-2"
                style={{ fontSize: 12, border: '1px solid var(--sand)', color: currentPage <= 1 ? '#bba8a1' : 'var(--text-mid)' }}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-xl px-3 py-2"
                style={{ fontSize: 12, border: '1px solid var(--sand)', color: currentPage >= totalPages ? '#bba8a1' : 'var(--text-mid)' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.34)' }} onClick={() => setFiltersOpen(false)}>
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl"
            style={{ background: '#fff', boxShadow: '0 24px 70px rgba(15,23,42,0.22)' }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))' }}>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 22 }}>
                  {activeTab === 'pending' ? 'Filter Pending Boarding Passes' : 'Filter Generated Boarding Passes'}
                </div>
              
              </div>
              <button onClick={() => setFiltersOpen(false)} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-5 px-6 py-5 md:grid-cols-2 xl:grid-cols-3">
              {activeTab === 'pending' ? (
                <>
                  <DateInput label="Start Date" value={draftFilters.startDate} min={todayInput()} onChange={value => setDraftFilters(current => ({ ...current, startDate: value }))} />
                  <DateInput label="End Date" value={draftFilters.endDate} min={draftFilters.startDate || todayInput()} onChange={value => setDraftFilters(current => ({ ...current, endDate: value }))} />
                  <FilterSelect label="Place" value={treatAsLockedPlace ? lockedPlace : isSiteAdmin ? siteAdminPlaceId : draftFilters.placeId} options={places} onChange={handleDraftPlaceChange} disabled={isSiteAdmin || treatAsLockedPlace} />
                  <FilterSelect label="Season" value={draftFilters.seasonId} options={seasons} onChange={value => setDraftFilters(current => ({ ...current, seasonId: value }))} />
                  <FilterSelect label="Quota" value={draftFilters.quotaId} options={quotas} onChange={value => setDraftFilters(current => ({ ...current, quotaId: value }))} />
                  <FilterSelect label="Shift" value={draftFilters.shiftId} options={shifts} onChange={value => setDraftFilters(current => ({ ...current, shiftId: value }))} />
                  <FilterSelect label="Zone" value={draftFilters.zoneId} options={zones} onChange={value => setDraftFilters(current => ({ ...current, zoneId: value }))} />
                  <FilterSelect label="Vehicle Type" value={draftFilters.inventoryId} options={inventoryTypes} onChange={value => setDraftFilters(current => ({ ...current, inventoryId: value }))} />
                </>
              ) : (
                <>
                  <DateInput label="Date" value={draftFilters.date} max={todayInput()} onChange={value => setDraftFilters(current => ({ ...current, date: value }))} />
                  <FilterSelect label="Place" value={treatAsLockedPlace ? lockedPlace : isSiteAdmin ? siteAdminPlaceId : draftFilters.placeId} options={places} onChange={handleDraftPlaceChange} disabled={isSiteAdmin || treatAsLockedPlace} />
                  <FilterSelect label="Zone" value={draftFilters.zoneId} options={zones} onChange={value => setDraftFilters(current => ({ ...current, zoneId: value }))} />
                  <FilterSelect label="Shift" value={draftFilters.shiftId} options={shifts} onChange={value => setDraftFilters(current => ({ ...current, shiftId: value }))} />
                  <FilterSelect label="Vehicle Type" value={draftFilters.inventoryId} options={inventoryTypes} onChange={value => setDraftFilters(current => ({ ...current, inventoryId: value }))} />
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--sand)' }}>
              <button onClick={resetFilters} className="rounded-xl px-4 py-2" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                Reset All
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setFiltersOpen(false)} className="rounded-xl px-4 py-2" style={{ fontSize: 12, border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>
                  Cancel
                </button>
                <button onClick={applyFilters} className="rounded-xl px-4 py-2 text-white" style={{ fontSize: 12, background: 'var(--maroon)' }}>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {invoiceOpen ? (
        <InvoiceModal
          bookingId={invoiceOpen}
          onClose={() => setInvoiceOpen(null)}
        />
      ) : null}

      {vehicleDetailsRow ? (
        <VehicleDetailsDialog
          data={vehicleDetailsRow}
          onClose={() => setVehicleDetailsRow(null)}
        />
      ) : null}
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{label}:</span>
      <span className="rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 11, background: 'rgba(139,26,26,0.07)', color: 'var(--maroon)' }}>{value}</span>
    </div>
  )
}

function DateInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}) {
  return (
    <label className="space-y-2">
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div className="relative">
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={event => onChange(event.target.value)}
          className="w-full rounded-xl py-3 pl-4 pr-10 outline-none"
          style={{ fontSize: 12, border: '1px solid var(--sand)', background: '#fff', color: 'var(--text-dark)' }}
        />
        <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
      </div>
    </label>
  )
}

function Th({ label }: { label: string }) {
  return (
    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
      {label}
    </th>
  )
}

function Td({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-dark)', textAlign: align }}>
      {children}
    </td>
  )
}

function StatusPill({ label, tone }: { label: string; tone: 'success' | 'warn' | 'soft' }) {
  const style = tone === 'success'
    ? { background: 'rgba(26,122,110,0.1)', color: '#1A7A6E' }
    : tone === 'warn'
      ? { background: 'rgba(154,122,90,0.12)', color: '#9A7A5A' }
      : { background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }

  return (
    <span className="rounded-full px-2.5 py-1 font-medium" style={{ ...style, fontSize: 10 }}>
      {label}
    </span>
  )
}
