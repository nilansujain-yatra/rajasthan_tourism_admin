'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Info, Minus, Phone, Plus, Printer, RefreshCw, Ticket, User, X } from 'lucide-react'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'
import { authFetch } from '@/lib/api/authFetch'

type SpecificCharge = {
  id: string
  name: string
}

type ShiftDto = {
  id: string
  name: string
  endTime?: number | string
}

type AddOnDto = {
  id: string
  name: string
  totalAmount: number
  remarkable?: boolean
  remarkFieldValue?: string
}

type AddOnState = {
  id: string
  name: string
  amount: number
  qty: number
  remarkable: boolean
  remarkFieldValue: string
  remarkValue: string[]
}

type TicketTypeState = {
  id: string
  masterTicketTypeName: string
  amount: number
  quantity: number
  specificCharges: unknown[]
  addOnList: AddOnState[]
}

type TicketAvailabilityResult = {
  id: string
  nameRequired?: boolean
  roundOff?: boolean
  shiftDtos?: ShiftDto[]
  ticketTypeDtos?: Array<Record<string, unknown>>
}

type TicketAvailabilityResponse = {
  result?: TicketAvailabilityResult
  message?: string
}

type InvoiceLine = {
  label: string
  quantity: number
  price: number
  total: number
  notes: string[]
}

type InvoiceSummaryLine = {
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
  lines: InvoiceLine[]
  ticketSummary: InvoiceSummaryLine[]
  addonSummary: InvoiceAddonLine[]
}

const SPECIAL_ADDON_ONLY_PLACES = new Set([
  'GOVERNMENT MUSEUM, AJMER',
  'NAHARGARH BIOLOGICAL PARK',
  'NAHARGARH FORT',
])

const TOURIST_PRIORITY: Record<string, number> = {
  'CHILD': 1,
  'DIVYANG': 2,
  'INDIAN STUDENT': 3,
  'STUDENT': 3,
  'INDIAN CITIZEN': 4,
  'ADULT': 4,
  'FOREIGN STUDENT': 5,
  'FOREIGN CITIZEN': 6,
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

function startOfTodayMs() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

function formatDate(value: number | string) {
  const date = new Date(typeof value === 'number' ? value : toNumber(value))
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatTicketDate(value: number | string) {
  const date = new Date(typeof value === 'number' ? value : toNumber(value))
  if (Number.isNaN(date.getTime())) return 'N/A'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function formatTicketTime(value: number | string) {
  const date = new Date(typeof value === 'number' ? value : toNumber(value))
  if (Number.isNaN(date.getTime())) return 'N/A'
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const formattedHours = hours % 12 || 12
  return `${String(formattedHours).padStart(2, '0')}:${minutes}:${seconds} ${meridiem}`
}

function buildQrImageUrl(qrDetail: string) {
  const value = qrDetail.trim()
  if (!value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(value)}`
}

function getPlaceId(user: AuthUser | null) {
  const placeId = user?.placeId
  if (Array.isArray(placeId)) {
    const first = placeId.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
    return first?.trim() ?? ''
  }
  return ''
}

function getSpecificChargeDtos(payload: unknown) {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const result = root.result && typeof root.result === 'object' ? root.result as Record<string, unknown> : {}

  return Array.isArray(result.specificChargesDtos)
    ? result.specificChargesDtos as Array<Record<string, unknown>>
    : []
}

function getBookingFlags(user: AuthUser | null) {
  if (user?.isDepartmentAdmin === true && user?.onSiteBooking === false) {
    return { isDepartmentAdmin: true, onSite: false }
  }

  if (user?.isDepartmentAdmin === false && user?.onSiteBooking === true) {
    return { isDepartmentAdmin: false, onSite: true }
  }

  if (user?.isDepartmentAdmin === true && user?.onSiteBooking === true) {
    return { isDepartmentAdmin: true, onSite: false }
  }

  return { isDepartmentAdmin: false, onSite: true }
}

function generateDeviceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getVisibleShifts(shifts: ShiftDto[]) {
  const now = Date.now()
  const visible = shifts.filter(shift => {
    if (!shift.endTime) return true
    const endTime = new Date(typeof shift.endTime === 'number' ? shift.endTime : String(shift.endTime)).getTime()
    return Number.isNaN(endTime) || endTime > now
  })

  return visible.length ? visible : shifts
}

function getRoundedTotal(value: number, roundOff: boolean) {
  if (!roundOff) {
    return value
  }

  return value < 40 ? Math.ceil(value) : Math.round(value)
}

function normalizeInvoiceData(payload: unknown): InvoiceData | null {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result
    : null

  if (!result) {
    return null
  }

  const freeTicket = Boolean(result.freeTicket)
  const lines: InvoiceLine[] = []
  const ticketSummaryMap = new Map<string, InvoiceSummaryLine>()
  const addonSummaryMap = new Map<string, InvoiceAddonLine>()

  function upsertTicketSummary(ticketName: string, quantity: number, totalAmount: number) {
    const key = ticketName || 'Ticket'
    const current = ticketSummaryMap.get(key)
    if (current) {
      current.quantity += quantity
      current.totalAmount += totalAmount
      return
    }
    ticketSummaryMap.set(key, { ticketName: key, quantity, totalAmount })
  }

  function upsertAddonSummary(ticketName: string, addonName: string, quantity: number, totalAmount: number) {
    const key = `${ticketName}__${addonName}`
    const current = addonSummaryMap.get(key)
    if (current) {
      current.quantity += quantity
      current.totalAmount += totalAmount
      return
    }
    addonSummaryMap.set(key, { ticketName, name: addonName, quantity, totalAmount })
  }

  const invoiceBookingDtos = Array.isArray(result.invoiceBookingDtos) ? result.invoiceBookingDtos as Array<Record<string, unknown>> : []
  invoiceBookingDtos.forEach(entry => {
    const ticketName = toText(entry.ticketName || entry.ticketTypeName, 'Ticket')
    const quantity = toNumber(entry.quantity || entry.qty, 0)
    const totalAmount = freeTicket ? 0 : toNumber(entry.totalAmount, 0)
    upsertTicketSummary(ticketName, quantity, totalAmount)

    const addonItems = Array.isArray(entry.addonItems) ? entry.addonItems as Array<Record<string, unknown>> : []
    addonItems.forEach(item => {
      const addonName = toText(item.name, 'Add On')
      const addonQuantity = toNumber(item.quantity, 0)
      const addonTotal = freeTicket ? 0 : toNumber(item.totalAmount || item.amount, 0)
      upsertAddonSummary(ticketName, addonName, addonQuantity, addonTotal)
    })
  })

  const invoiceBookingDtoV2 = Array.isArray(result.invoiceBookingDtoV2) ? result.invoiceBookingDtoV2 as Array<Record<string, unknown>> : []
  invoiceBookingDtoV2.forEach(entry => {
    const configs = Array.isArray(entry.ticketTypeConfigList) ? entry.ticketTypeConfigList as Array<Record<string, unknown>> : []
    const notes = configs
      .filter(item => toNumber(item.amount) !== 0)
      .map(item => `${toText(item.name)} - ${formatCurrency(freeTicket ? 0 : toNumber(item.amount))}`)

    lines.push({
      label: toText(entry.ticketTypeName, 'Ticket'),
      quantity: toNumber(entry.qty),
      price: freeTicket ? 0 : toNumber(entry.price),
      total: freeTicket ? 0 : toNumber(entry.totalAmount),
      notes,
    })

    if (invoiceBookingDtos.length === 0) {
      upsertTicketSummary(
        toText(entry.ticketTypeName, 'Ticket'),
        toNumber(entry.qty),
        freeTicket ? 0 : toNumber(entry.totalAmount),
      )
    }
  })

  ;['inventory', 'inventoryQuota'].forEach(key => {
    const entry = result[key]
    if (!entry || typeof entry !== 'object') return
    const record = entry as Record<string, unknown>
    const configs = Array.isArray(record.ticketTypeConfigList) ? record.ticketTypeConfigList as Array<Record<string, unknown>> : []
    const notes = configs
      .filter(item => toNumber(item.amount) !== 0)
      .map(item => `${toText(item.name)} - ${formatCurrency(freeTicket ? 0 : toNumber(item.amount))}`)

    lines.push({
      label: toText(record.ticketTypeName, 'Ticket'),
      quantity: toNumber(record.qty),
      price: freeTicket ? 0 : toNumber(record.price),
      total: freeTicket ? 0 : toNumber(record.totalAmount),
      notes,
    })

    if (invoiceBookingDtos.length === 0) {
      upsertTicketSummary(
        toText(record.ticketTypeName, 'Ticket'),
        toNumber(record.qty),
        freeTicket ? 0 : toNumber(record.totalAmount),
      )
    }
  })

  return {
    bookingId: toText(result.bookingId, 'N/A'),
    bookingDate: toNumber(result.bookingDate),
    placeName: toText((result.placeDetailDto as Record<string, unknown> | undefined)?.name, 'Selected Place'),
    districtName: toText((result.placeDetailDto as Record<string, unknown> | undefined)?.districtName),
    purchasePlaceName: toText((result.purchasePlaceDto as Record<string, unknown> | undefined)?.name),
    userName: toText((result.userDetailDto as Record<string, unknown> | undefined)?.displayName, 'Guest'),
    email: toText((result.userDetailDto as Record<string, unknown> | undefined)?.email),
    mobile: toText((result.userDetailDto as Record<string, unknown> | undefined)?.mobile),
    totalAmount: toNumber(result.totalAmountWithAddOn) || lines.reduce((sum, line) => sum + line.total, 0),
    totalUsers: toNumber(result.totalUsers),
    qrDetail: toText(result.qrDetail),
    kioskId: toText((result.userDetailDto as Record<string, unknown> | undefined)?.kisokId || (result.userDetailDto as Record<string, unknown> | undefined)?.kioskId),
    lines,
    ticketSummary: Array.from(ticketSummaryMap.values()),
    addonSummary: Array.from(addonSummaryMap.values()),
  }
}

function printInvoice(invoice: InvoiceData) {
  const popup = window.open('', '_blank', 'width=900,height=800')
  if (!popup) return
  const qrImageUrl = buildQrImageUrl(invoice.qrDetail)
  const addOnMarkup = invoice.addonSummary.map(item => `
    <tr>
      <td style="padding:1px 0;color:#000;font-size:12px;font-weight:600;width:110px;">${item.ticketName} - ${item.name}</td>
      <td style="padding:1px 0;color:#000;font-size:12px;font-weight:600;text-align:right;">${item.quantity}</td>
    </tr>
  `).join('')
  const ticketMarkup = invoice.ticketSummary.map(item => `
    <tr>
      <td style="padding:1px 0;color:#000;font-size:12px;font-weight:600;width:110px;">${item.ticketName}</td>
      <td style="padding:1px 0;color:#000;font-size:12px;font-weight:600;text-align:right;">${item.quantity}</td>
    </tr>
  `).join('')

  popup.document.write(`
    <html>
      <head>
        <title>Booking Ticket ${invoice.bookingId}</title>
        <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: Arial, sans-serif;
          color: #000;
          width: 78mm;
          overflow: hidden;
        }

        body {
          display: flex;
          justify-content: center;
        }

        .ticket {
          width: 76mm;
          padding: 2mm 3mm;
          box-sizing: border-box;
          background: #fff;
          page-break-inside: avoid;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        tr,
        td,
        p,
        div {
          page-break-inside: avoid !important;
        }

        a {
          color: #000;
          text-decoration: none;
          word-break: break-word;
        }

        img {
          page-break-inside: avoid;
        }
      </style>
      </head>
      <body>
        <div class="ticket">
          <h1 style="color:#000;font-size:10px;text-transform:uppercase;font-weight:800;text-align:center;margin-bottom:10px;">Government of Rajasthan</h1>
          <h5 style="color:#000;font-size:14px;text-transform:uppercase;font-weight:800;text-align:center;margin:0;">${invoice.placeName}<br/>${invoice.districtName || ''}</h5>
          ${invoice.purchasePlaceName === 'Amber Fort' ? '<h1 style="color:#000;font-size:10px;text-transform:uppercase;font-weight:800;text-align:center;margin-top:10px;margin-bottom:10px;">( A UNESCO WORLD HERITAGE SITE )</h1>' : ''}
          ${qrImageUrl ? `<div><img src="${qrImageUrl}" alt="QR code" style="height:65px;width:65px;display:block;margin:4px auto;" /></div>` : ''}
          <div style="display:flex;justify-content:space-between;border-top:2px dotted #676767;margin-top:5px;margin-bottom:5px;padding-top:5px;padding-bottom:5px;">
            <div>
              <p style="color:#000;font-size:12px;font-weight:600;margin:0;">Visit Date</p>
              <p style="color:#000;font-size:12px;font-weight:600;margin:0;">Booking ID</p>
            </div>
            <div>
              <p style="color:#000;font-size:12px;font-weight:500;text-align:right;margin:0;">${formatTicketDate(invoice.bookingDate)}</p>
              <p style="color:#000;font-size:12px;font-weight:500;margin:0;">${invoice.bookingId}</p>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:2px dotted #676767;"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;color:#000;font-size:12px;font-weight:600;padding:0 0 4px;">Visitor Type</th>
                <th style="text-align:right;color:#000;font-size:12px;font-weight:600;padding:0 0 4px;">Qty</th>
              </tr>
            </thead>
            <tbody>${ticketMarkup}</tbody>
          </table>
          ${invoice.addonSummary.length ? '<div style="color:#000;font-size:14px;font-weight:750;margin-top:8px;">Add On Charges :-</div>' : ''}
          ${invoice.addonSummary.length ? `<table><tbody>${addOnMarkup}</tbody></table>` : ''}
          <div style="display:flex;justify-content:space-between;border-top:2px dotted #676767;margin-top:2px;padding-top:2px;">
            <p style="color:#000;font-size:12px;font-weight:600;margin:0;">Total Visitors</p>
            <p style="color:#000;font-size:12px;font-weight:600;margin:0;">${invoice.totalUsers || invoice.ticketSummary.reduce((sum, item) => sum + item.quantity, 0)}</p>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:2px;padding-top:2px;">
            <p style="color:#000;font-size:12px;font-weight:600;margin:0;">Total Amount</p>
            <p style="color:#000;font-size:12px;font-weight:600;margin:0;">${formatCurrency(invoice.totalAmount)}</p>
          </div>
          <div style="border-top:2px dotted #676767;margin-top:5px;padding-top:5px;text-align:left;">
            <p style="color:#000;font-size:12px;font-weight:600;text-align:left;margin:0;">T &amp; C apply</p>
          </div>
          <div style="border-top:2px dotted #676767;margin-top:5px;margin-bottom:5px;padding-top:5px;padding-bottom:5px;">
            <p style="color:#000;font-size:11px;font-weight:500;text-align:left;margin:0 0 8px;">1. For your next visit, book ticket at <br/><a href="https://obms-tourist.rajasthan.gov.in">obms-tourist.rajasthan.gov.in</a></p>
            <p style="color:#000;font-size:11px;font-weight:500;text-align:left;margin:0;">2. Explore and purchase various products at <br/><a href="https://ebazaar.rajasthan.gov.in">ebazaar.rajasthan.gov.in</a></p>
          </div>
          <div style="border-top:2px dotted #676767;margin-top:5px;margin-bottom:5px;padding-top:5px;padding-bottom:5px;text-align:center;">
            <p style="color:#000;font-size:12px;font-weight:600;margin:0;">Thanks For Visit</p>
            <p style="color:#000;font-size:12px;font-weight:600;margin:0;">${invoice.kioskId || 'Kiosk'}</p>
            <p style="color:#000;font-size:11px;font-weight:400;margin-top:4px;margin-bottom:4px;">${formatTicketDate(invoice.bookingDate)} ${formatTicketTime(invoice.bookingDate)}</p>
          </div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `)
  popup.document.close()
}

function TicketSlipPreview({ invoice }: { invoice: InvoiceData }) {
  const qrImageUrl = buildQrImageUrl(invoice.qrDetail)
  const totalVisitors = invoice.totalUsers || invoice.ticketSummary.reduce((sum, item) => sum + item.quantity, 0)

  return (
        <div
          className="mx-auto w-full max-w-[340px] rounded-[24px] bg-white px-4 pb-4 pt-1 shadow-sm"
          style={{
            border: '1px solid #eadfd8',
          }}
        >    
          <h1 style={{ color: '#000', fontSize: 13, textTransform: 'uppercase', fontWeight: 800, textAlign: 'center', marginBottom: 10 }}>Government of Rajasthan</h1>
      <h5 style={{ color: '#000', fontSize: 12, textTransform: 'uppercase', fontWeight: 800, textAlign: 'center', margin: 0 }}>
        {invoice.placeName}
        <br />
        {invoice.districtName || ''}
      </h5>
      {invoice.purchasePlaceName === 'Amber Fort' ? (
        <h1 style={{ color: '#000', fontSize: 13, textTransform: 'uppercase', fontWeight: 800, textAlign: 'center', marginTop: 10, marginBottom: 10 }}>
          ( A UNESCO WORLD HERITAGE SITE )
        </h1>
      ) : null}
      {qrImageUrl ? <img src={qrImageUrl} alt="QR code" style={{ height: 72, width: 72, display: 'block', margin: '0 auto' }} /> : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dotted #676767', marginTop: 5, marginBottom: 5, paddingTop: 5, paddingBottom: 5 }}>
        <div>
          <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>Visit Date</p>
          <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>Booking ID</p>
        </div>
        <div>
          <p style={{ color: '#000', fontSize: 14, fontWeight: 500, textAlign: 'right', margin: 0 }}>{formatTicketDate(invoice.bookingDate)}</p>
          <p style={{ color: '#000', fontSize: 14, fontWeight: 500, margin: 0 }}>{invoice.bookingId}</p>
        </div>
      </div>

      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', color: '#000', fontSize: 14, fontWeight: 600, paddingBottom: 4 }}>Visitor Type</th>
            <th style={{ textAlign: 'right', color: '#000', fontSize: 14, fontWeight: 600, paddingBottom: 4 }}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {invoice.ticketSummary.map(item => (
            <tr key={item.ticketName}>
              <td style={{ paddingBottom: 1, color: '#000', fontSize: 14, fontWeight: 600, width: 170 }}>{item.ticketName}</td>
              <td style={{ color: '#000', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoice.addonSummary.length ? <div style={{ color: '#000', fontSize: 12, fontWeight: 750, marginTop: 8 }}>Add On Charges :-</div> : null}
      {invoice.addonSummary.length ? (
        <table style={{ width: '100%' }}>
          <tbody>
            {invoice.addonSummary.map(item => (
              <tr key={`${item.ticketName}-${item.name}`}>
                <td style={{ paddingBottom: 1, color: '#000', fontSize: 14, fontWeight: 600, width: 170 }}>{item.ticketName} - {item.name}</td>
                <td style={{ color: '#000', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dotted #676767', marginTop: 2, paddingTop: 2 }}>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>Total Visitors</p>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>{totalVisitors}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, paddingTop: 2 }}>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>Total Amount</p>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>{formatCurrency(invoice.totalAmount)}</p>
      </div>

      <div style={{ borderTop: '2px dotted #676767', marginTop: 5, paddingTop: 5, textAlign: 'left' }}>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>T &amp; C apply</p>
      </div>

      <div style={{ borderTop: '2px dotted #676767', marginTop: 5, marginBottom: 5, paddingTop: 5, paddingBottom: 5 }}>
        <p style={{ color: '#000', fontSize: 12, fontWeight: 500, textAlign: 'left', margin: '0 0 8px' }}>
          1. For your next visit, book ticket at <br />
          <a href="https://obms-tourist.rajasthan.gov.in" target="_blank" rel="noreferrer">obms-tourist.rajasthan.gov.in</a>
        </p>
        <p style={{ color: '#000', fontSize: 12, fontWeight: 500, textAlign: 'left', margin: 0 }}>
          2. Explore and purchase various products at <br />
          <a href="https://ebazaar.rajasthan.gov.in" target="_blank" rel="noreferrer">ebazaar.rajasthan.gov.in</a>
        </p>
      </div>

      <div style={{ borderTop: '2px dotted #676767', marginTop: 5, marginBottom: 5, paddingTop: 5, paddingBottom: 5, textAlign: 'center' }}>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>Thanks For Visit</p>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 600, margin: 0 }}>{invoice.kioskId || 'Kiosk'}</p>
        <p style={{ color: '#000', fontSize: 14, fontWeight: 400, marginTop: 10, marginBottom: 10 }}>{formatTicketDate(invoice.bookingDate)} {formatTicketTime(invoice.bookingDate)}</p>
      </div>
    </div>
  )
}

export default function OperatorTicketBookingPage() {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedAuthUser())
  const [extraDetails, setExtraDetails] = useState<{
    departmentName?: string
    assignedPlaces?: string[]
  } | null>(null)
  const [specificCharges, setSpecificCharges] = useState<SpecificCharge[]>([])
  const [selectedSpecificChargeId, setSelectedSpecificChargeId] = useState('')
  const [availability, setAvailability] = useState<TicketAvailabilityResult | null>(null)
  const [ticketOptions, setTicketOptions] = useState<TicketTypeState[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [addonOnly, setAddonOnly] = useState(false)
  const [globalAddons, setGlobalAddons] = useState<AddOnState[]>([])
  const [primaryTicketTypeId, setPrimaryTicketTypeId] = useState('')
  const [loadingAddons, setLoadingAddons] = useState(false)
  const [lastAddonTypeId, setLastAddonTypeId] = useState('')
  const [showAddons, setShowAddons] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const placeId = getPlaceId(user)
  const bookingFlags = getBookingFlags(user)
  const requiresName = Boolean(availability?.nameRequired)
  const visibleShifts = useMemo(() => getVisibleShifts(availability?.shiftDtos ?? []), [availability])
  const placeName = toText(user?.placeName)
  const allowAddonOnly = SPECIAL_ADDON_ONLY_PLACES.has(placeName.toUpperCase())

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
          clearCachedAuthUser()
          if (active) setUser(null)
          return
        }

        const payload = await response.json() as { user?: AuthUser }
        const nextUser = payload.user ?? null

        if (active) {
          setUser(nextUser)
          writeCachedAuthUser(nextUser)

          if (nextUser?.mobile) {
            setMobile(toText(nextUser.mobile))
          } else if ((nextUser as any)?.mobileNo) {
            setMobile(toText((nextUser as any).mobileNo))
          }

          if (nextUser?.sub) {
            void loadExtraDetails(nextUser.sub)
          }
        }
      } catch {
        clearCachedAuthUser()
        if (active) setUser(null)
      } finally {
        if (active) setLoadingSession(false)
      }
    }

    async function loadExtraDetails(userId: string) {
      try {
        const response = await authFetch(`/user/${userId}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) return

        const payload = await response.json()
        if (!active || !payload?.result) return

        const result = payload.result
        const roleData = result.roleResponseDto
        
        const departmentName = Array.isArray(roleData?.departmentDto)
          ? roleData.departmentDto[0]?.name
          : roleData?.departmentDto?.name

        const assignedPlaces = Array.isArray(roleData?.placeDtos)
          ? roleData.placeDtos.map((p: any) => p.name).filter(Boolean)
          : []

        setExtraDetails({ departmentName, assignedPlaces })
      } catch (err) {
        console.error('Failed to load extra user details:', err)
      }
    }

    loadSession()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!allowAddonOnly) {
      setAddonOnly(false)
    }
  }, [allowAddonOnly])

  useEffect(() => {
    setTicketOptions(current => current.map(ticket => ({
      ...ticket,
      quantity: addonOnly ? 1 : 0,
    })))
  }, [addonOnly])

  useEffect(() => {
    if (loadingSession || !placeId) {
      if (!loadingSession && !placeId) {
        setLoading(false)
        setError('No place is mapped to this operator. Please check the assigned place in SSO/user mapping.')
      }
      return
    }

    let active = true

    async function loadBookingSetup() {
      try {
        setLoading(true)
        setError('')

        const chargeResponse = await authFetch('/specific-charges', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        const chargePayload = await chargeResponse.json().catch(() => null)
        if (!chargeResponse.ok) {
          throw new Error(toText((chargePayload as Record<string, unknown> | null)?.message, 'Unable to fetch specific charges.'))
        }

        const charges = getSpecificChargeDtos(chargePayload)

        const normalizedCharges = charges.map(item => ({
          id: toText(item.id),
          name: toText(item.name),
        })).filter(item => item.id)

        const offlineCharge = normalizedCharges.find(item => item.name.toLowerCase() === 'offline') ?? normalizedCharges[0]
        if (!offlineCharge) {
          throw new Error('No specific charges are configured for this place.')
        }

        const bookingDate = startOfTodayMs()
        const detailResponse = await authFetch(
          `/booking/tickets?placeId=${encodeURIComponent(placeId)}&date=${bookingDate}&specificChargesId=${encodeURIComponent(offlineCharge.id)}&onSite=${bookingFlags.onSite}`,
          { headers: { Accept: 'application/json' }, cache: 'no-store' },
        )
        const detailPayload = await detailResponse.json().catch(() => null) as TicketAvailabilityResponse | null
        if (!detailResponse.ok) {
          throw new Error(toText(detailPayload?.message, 'Unable to fetch ticket availability.'))
        }

        const ticketTypes = detailPayload?.result?.ticketTypeDtos ?? []

        const normalizedTicketOptions = ticketTypes.map((ticketType) => ({
          id: toText(ticketType.id),
          masterTicketTypeName: toText(ticketType.masterTicketTypeName || ticketType.ticketTypeName, 'Ticket'),
          amount: toNumber(ticketType.amount),
          quantity: 0,
          specificCharges: Array.isArray(ticketType.specificCharges) ? ticketType.specificCharges : [],
          addOnList: [],
        }))

        if (!active) return

        setSpecificCharges(normalizedCharges)
        setSelectedSpecificChargeId(offlineCharge.id)
        setAvailability(detailPayload?.result ?? null)
        setTicketOptions(normalizedTicketOptions)
        setSelectedShiftId(getVisibleShifts(detailPayload?.result?.shiftDtos ?? [])[0]?.id ?? '')
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load booking setup.')
          setAvailability(null)
          setTicketOptions([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBookingSetup()
    return () => { active = false }
  }, [bookingFlags.onSite, loadingSession, placeId])

  useEffect(() => {
    const selectedTypes = ticketOptions.filter(t => t.quantity > 0)
    if (selectedTypes.length === 0) {
      setGlobalAddons([])
      setPrimaryTicketTypeId('')
      setLastAddonTypeId('')
      return
    }

    // Find highest priority ticket type
    let highestPriority = -1
    let bestType: TicketTypeState | null = null

    selectedTypes.forEach(t => {
      const typeName = t.masterTicketTypeName.toUpperCase()
      const priority = TOURIST_PRIORITY[typeName] || 0
      if (priority > highestPriority) {
        highestPriority = priority
        bestType = t
      }
    })

    if (!bestType) {
      // If no recognized priority, just take the first one
      bestType = selectedTypes[0]
    }

    const typeId = (bestType as TicketTypeState).id
    setPrimaryTicketTypeId(typeId)

    if (typeId === lastAddonTypeId) return

    let active = true
    async function fetchAddons() {
      try {
        setLoadingAddons(true)
        const bookingDate = startOfTodayMs()
        const response = await authFetch(`/booking/addon?ticketTypeId=${encodeURIComponent(typeId)}&date=${bookingDate}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!active) return

        if (response.ok && Array.isArray(payload?.result)) {
          const addons = (payload.result as Array<Record<string, unknown>>).map(addon => ({
            id: toText(addon.id),
            name: toText(addon.name, 'Add-on'),
            amount: toNumber(addon.totalAmount),
            qty: 0,
            remarkable: Boolean(addon.remarkable),
            remarkFieldValue: toText(addon.remarkFieldValue, 'Remark'),
            remarkValue: [],
          }))
          setGlobalAddons(addons)
          setLastAddonTypeId(typeId)
        } else {
          setGlobalAddons([])
        }
      } catch (err) {
        console.error('Addon fetch error:', err)
        if (active) setGlobalAddons([])
      } finally {
        if (active) setLoadingAddons(false)
      }
    }

    fetchAddons()
    return () => { active = false }
  }, [ticketOptions, lastAddonTypeId])

  const subtotal = useMemo(() => {
    return ticketOptions.reduce((sum, ticket) => {
      return addonOnly ? sum : sum + (ticket.quantity * ticket.amount)
    }, 0)
  }, [addonOnly, ticketOptions])

    const totalTickets = useMemo(() => {
    return ticketOptions.reduce((sum, ticket) => sum + ticket.quantity, 0)
  }, [ticketOptions])
  
  const addonTotal = useMemo(() => {
    return globalAddons.reduce((sum, addon) => sum + (addon.qty * addon.amount), 0)
  }, [globalAddons])



  const grandTotal = useMemo(() => {
    return getRoundedTotal(subtotal + addonTotal, Boolean(availability?.roundOff))
  }, [addonTotal, availability?.roundOff, subtotal])

  function updateTicketQuantity(ticketId: string, nextValue: number) {
    setTicketOptions(current => current.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      return {
        ...ticket,
        quantity: Math.max(0, nextValue),
        addOnList: [], // Always empty now
      }
    }))
  }

  function updateGlobalAddonQuantity(addonId: string, nextValue: number) {
    setGlobalAddons(current => current.map(addon => {
      if (addon.id !== addonId) return addon
      return {
        ...addon,
        qty: Math.max(0, nextValue),
      }
    }))
  }

  async function reloadBookingSetup() {
    setSuccessMessage('')
    setInvoice(null)
    setShowSuccess(false)
    setName('')
    setMobile('')
    setEmail('')
    setAddonOnly(false)
    setSelectedShiftId('')
    setAvailability(null)
    setTicketOptions([])
    setSpecificCharges([])
    setSelectedSpecificChargeId('')
    setLoadingSession(false)
    setLoading(true)
    setError('')

    const freshUser = user
    if (!freshUser) return

    const freshPlaceId = getPlaceId(freshUser)
    if (!freshPlaceId) return

    const flags = getBookingFlags(freshUser)
    try {
      const chargeResponse = await authFetch('/booking/create/v2', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const chargePayload = await chargeResponse.json().catch(() => null)
      if (!chargeResponse.ok) throw new Error(toText((chargePayload as Record<string, unknown> | null)?.message, 'Unable to fetch specific charges.'))
      const charges = getSpecificChargeDtos(chargePayload)
      const normalizedCharges = charges.map(item => ({ id: toText(item.id), name: toText(item.name) })).filter(item => item.id)
      const offlineCharge = normalizedCharges.find(item => item.name.toLowerCase() === 'offline') ?? normalizedCharges[0]
      if (!offlineCharge) throw new Error('No specific charges are configured for this place.')
      const bookingDate = startOfTodayMs()
      const detailResponse = await authFetch(`/booking/tickets?placeId=${encodeURIComponent(freshPlaceId)}&date=${bookingDate}&specificChargesId=${encodeURIComponent(offlineCharge.id)}&onSite=${flags.onSite}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const detailPayload = await detailResponse.json().catch(() => null) as TicketAvailabilityResponse | null
      if (!detailResponse.ok) throw new Error(toText(detailPayload?.message, 'Unable to fetch ticket availability.'))
      const ticketTypes = detailPayload?.result?.ticketTypeDtos ?? []

      setSpecificCharges(normalizedCharges)
      setSelectedSpecificChargeId(offlineCharge.id)
      setAvailability(detailPayload?.result ?? null)
      setTicketOptions(ticketTypes.map((ticketType) => ({
        id: toText(ticketType.id),
        masterTicketTypeName: toText(ticketType.masterTicketTypeName || ticketType.ticketTypeName, 'Ticket'),
        amount: toNumber(ticketType.amount),
        quantity: 0,
        specificCharges: Array.isArray(ticketType.specificCharges) ? ticketType.specificCharges : [],
        addOnList: [],
      })))
      setGlobalAddons([])
      setPrimaryTicketTypeId('')
      setLastAddonTypeId('')
      setSelectedShiftId(getVisibleShifts(detailPayload?.result?.shiftDtos ?? [])[0]?.id ?? '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to reload booking setup.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedShiftId) {
      setError('Please select a shift before booking.')
      return
    }

    if (requiresName && !name.trim()) {
      setError('Visitor name is required for this place.')
      return
    }

    if (!/^\d{10,}$/.test(mobile.trim())) {
      setError('Enter a valid mobile number.')
      return
    }

    const selectedTickets = ticketOptions.filter(ticket => ticket.quantity > 0 || ticket.addOnList.some(addon => addon.qty > 0))
    if (!selectedTickets.length) {
      setError('Select at least one ticket or add-on to continue.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const selectedAddons = globalAddons.filter(a => a.qty > 0)
      
      const payload = {
        ipAddress: '164.100.222.44',
        bookingDate: startOfTodayMs(),
        placeId,
        deviceId: generateDeviceId(),
        device: 'Web',
        shiftId: selectedShiftId,
        seasonId: availability?.id,
        mobileNo: mobile.trim(),
        userName: name.trim(),
        ticketUserDtoClone: selectedTickets.map((ticket) => ({
          ticketTypeId: ticket.id,
          qty: addonOnly ? 0 : ticket.quantity,
          ...(ticket.specificCharges.length ? { specificChargeId: selectedSpecificChargeId } : {}),
          addOnList: (ticket.id === primaryTicketTypeId && selectedAddons.length > 0) ? selectedAddons.map(addon => ({
            id: addon.id,
            qty: addon.qty,
            amount: addon.amount,
            name: addon.name,
            remarkable: addon.remarkable,
            remarkFieldValue: addon.remarkFieldValue,
            remarkValue: '', 
          })) : [],
        })),
      }

      const createResponse = await authFetch(
        `/booking/create/v2?isDepartmentAdmin=${bookingFlags.isDepartmentAdmin}&onSite=${bookingFlags.onSite}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      )

      const createPayload = await createResponse.json().catch(() => null)
      if (!createResponse.ok) {
        throw new Error(toText((createPayload as Record<string, unknown> | null)?.message, 'Unable to create ticket booking.'))
      }

      const bookingId = toText((createPayload as Record<string, unknown> | null)?.result && ((createPayload as Record<string, unknown>).result as Record<string, unknown>).bookingId)
      if (!bookingId) {
        throw new Error('Booking completed, but booking ID was not returned.')
      }

      const invoiceResponse = await authFetch(`/booking/get-invoice-v1?bookingId=${encodeURIComponent(bookingId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const invoicePayload = await invoiceResponse.json().catch(() => null)
      if (!invoiceResponse.ok) {
        throw new Error(toText((invoicePayload as Record<string, unknown> | null)?.message, 'Booking created, but invoice could not be loaded.'))
      }

      const normalizedInvoice = normalizeInvoiceData(invoicePayload)
      setInvoice(normalizedInvoice)
      setShowSuccess(true)
      setSuccessMessage(toText((createPayload as Record<string, unknown> | null)?.message, 'Ticket booked successfully.'))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete ticket booking.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div
        className="rounded-[24px] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 55%, #C8922A 100%)', boxShadow: '0 12px 30px rgba(107,18,18,0.12)' }}
      >
        <div className="px-5 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-2" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 10 }}>
                <Ticket size={10} />
                Live Operator Booking
              </div>
              <h1 className="font-serif font-bold" style={{ fontSize: 24, lineHeight: 1.05, color: '#fff' }}>
                Ticket Booking
              </h1>
            </div>

            <button
              onClick={reloadBookingSetup}
              className="rounded-xl px-3 py-2 font-medium text-white"
              style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 12 }}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={12} />
                Reload
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-px md:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
          {[
            { label: 'Assigned Place', value: extraDetails?.assignedPlaces?.join(', ') || placeName || placeId || 'Not mapped' },
            { label: 'Ticket Types', value: String(ticketOptions.length) },
            { label: 'Visible Shifts', value: String(visibleShifts.length) },
            { label: 'Booking Mode', value: bookingFlags.onSite ? 'On-site' : 'Department' },
          ].map(card => (
            <div key={card.label} className="px-5 py-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
              <div className="mt-0.5 font-semibold" style={{ fontSize: 13, color: '#fff' }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[24px] border bg-white px-6 py-12 text-center" style={{ borderColor: 'var(--sand)' }}>
          <div className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--text-dark)' }}>Loading booking setup...</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Fetching configured ticket types, shifts and add-ons.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-4">
            <section className="rounded-[24px] border bg-white p-4" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
                  <User size={16} />
                </div>
                <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>Visitor Details</div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mobile Number
                  </label>
                  <div className="flex items-center rounded-xl px-3 py-2" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
                    <Phone size={12} style={{ color: 'var(--maroon)', marginRight: 8 }} />
                    <input
                      value={mobile}
                      onChange={event => setMobile(event.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Mobile number"
                      className="w-full bg-transparent outline-none"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={event => setEmail(event.target.value.trim())}
                    placeholder="Email address"
                    className="w-full rounded-xl px-3 py-2 outline-none"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                  />
                </div>

                {requiresName ? (
                  <div className="md:col-span-2">
                    <label className="mb-1 block" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Visitor Name
                    </label>
                    <input
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder="Visitor name"
                      className="w-full rounded-xl px-3 py-2 outline-none"
                      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                    />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[24px] border bg-white p-4" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(200,146,42,0.10)', color: '#C8922A' }}>
                  <CalendarDays size={16} />
                </div>
                <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>Shift Selection</div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {visibleShifts.map(shift => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setSelectedShiftId(shift.id)}
                    className="rounded-xl px-3 py-3 text-left transition"
                    style={{
                      background: selectedShiftId === shift.id ? 'rgba(139,26,26,0.08)' : '#F8F4EE',
                      border: `1px solid ${selectedShiftId === shift.id ? 'rgba(139,26,26,0.24)' : 'var(--sand)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold" style={{ fontSize: 13, color: 'var(--text-dark)' }}>{shift.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {shift.endTime ? `Ends ${formatDate(shift.endTime)}` : 'Shift available'}
                        </div>
                      </div>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: selectedShiftId === shift.id ? 'var(--maroon)' : '#fff', border: '1px solid var(--sand)' }}>
                        {selectedShiftId === shift.id ? <CheckCircle2 size={12} color="#fff" /> : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border bg-white p-4" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>Tourist Options</div>

                {allowAddonOnly ? (
                  <label className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 11, color: 'var(--text-dark)' }}>
                    <input type="checkbox" checked={addonOnly} onChange={() => setAddonOnly(value => !value)} />
                    Add-ons only
                  </label>
                ) : null}
              </div>

              <div className="space-y-3">
                {ticketOptions.map(ticket => (
                  <div key={ticket.id} className="rounded-[18px] border overflow-hidden" style={{ borderColor: 'var(--sand)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ background: '#FCF7F0' }}>
                      <div>
                        <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{ticket.masterTicketTypeName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatCurrency(ticket.amount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateTicketQuantity(ticket.id, ticket.quantity - 1)}
                          disabled={ticket.quantity <= 0 || addonOnly}
                          className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40"
                          style={{ background: '#fff', border: '1px solid var(--sand)' }}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          value={ticket.quantity}
                          onChange={event => updateTicketQuantity(ticket.id, toNumber(event.target.value))}
                          className="w-14 rounded-lg px-2 py-1 text-center outline-none"
                          style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                          disabled={addonOnly}
                        />
                        <button
                          type="button"
                          onClick={() => updateTicketQuantity(ticket.id, ticket.quantity + 1)}
                          disabled={addonOnly}
                          className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40"
                          style={{ background: '#fff', border: '1px solid var(--sand)' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {globalAddons.length > 0 ? (
              <section className="rounded-[24px] border bg-white" style={{ borderColor: 'var(--sand)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddons(!showAddons)}
                  className="flex w-full items-center justify-between p-4 transition hover:bg-black/[0.02] rounded-t-[24px]"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(219,39,119,0.08)', color: '#DB2777' }}>
                      <Plus size={16} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>Available Add-ons Fees</div>
                      <div className="group relative z-20">
                        <Info size={14} className="cursor-help text-muted transition hover:text-maroon" />
                        <div className="invisible absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 p-2 text-[14px] leading-relaxed text-white opacity-0 transition group-hover:visible group-hover:opacity-100 shadow-xl border border-white/10 z-[100]">
                          These add-ons includes entry Fees and charges of tourist vehicles, camera and video camera etc.
                          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {showAddons ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
                </button>

                {showAddons && (
                  <div className="border-t p-4" style={{ borderColor: 'var(--sand)' }}>
                    {loadingAddons ? (
                      <div className="py-4 text-center text-xs text-muted">Updating add-ons...</div>
                    ) : (
                      <div className="grid gap-3">
                        {globalAddons.map(addon => (
                          <div
                            key={addon.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 transition"
                            style={{
                              background: addon.qty > 0 ? 'rgba(219,39,119,0.08)' : '#F8F4EE',
                              border: `1px solid ${addon.qty > 0 ? 'rgba(219,39,119,0.24)' : 'var(--sand)'}`,
                            }}
                          >
                            <div>
                              <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{addon.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {formatCurrency(addon.amount)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateGlobalAddonQuantity(addon.id, addon.qty - 1)}
                                disabled={addon.qty <= 0}
                                className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40"
                                style={{ background: '#fff', border: '1px solid var(--sand)' }}
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                value={addon.qty}
                                onChange={event => updateGlobalAddonQuantity(addon.id, toNumber(event.target.value))}
                                className="w-14 rounded-lg px-2 py-1 text-center outline-none"
                                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                              />
                              <button
                                type="button"
                                onClick={() => updateGlobalAddonQuantity(addon.id, addon.qty + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg"
                                style={{ background: '#fff', border: '1px solid var(--sand)' }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[24px] border bg-white p-4 sticky top-4" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>Summary</div>
                <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#F8F4EE' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Tickets</span>
                  <strong style={{ color: 'var(--text-dark)', fontSize: 13 }}>{totalTickets}</strong>
                </div>

                {ticketOptions.filter(ticket => ticket.quantity > 0 && !addonOnly).map(ticket => (
                  <div key={`summary-${ticket.id}`} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-mid)' }}>{ticket.masterTicketTypeName} x {ticket.quantity}</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{formatCurrency(ticket.quantity * ticket.amount)}</span>
                  </div>
                ))}

                {addonTotal > 0 ? (
                  <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-mid)' }}>Add-ons</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{formatCurrency(addonTotal)}</span>
                  </div>
                ) : null}

                <div className="h-px my-2" style={{ background: 'var(--sand)' }} />

                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-dark)', fontSize: 13 }}>Grand Total</span>
                  <span className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--maroon)' }}>{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="mt-4 w-full rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}
              >
                {submitting ? 'Booking...' : 'Book Ticket'}
              </button>
            </section>
          </aside>
        </form>
      )}

      {showSuccess && invoice ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5"
          style={{ background: 'rgba(28,16,8,0.48)', backdropFilter: 'blur(6px)' }}
          onClick={event => {
            if (event.target === event.currentTarget) setShowSuccess(false)
          }}
        >
              <div
                className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[30px] bg-white"
                style={{
                  height: '92vh',
                  maxHeight: '92vh',
                  boxShadow: '0 40px 96px rgba(107,18,18,0.24)',
                }}
              >        
              <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)' }}>
              <div>
                <div className="font-serif font-bold text-white" style={{ fontSize: 26 }}>Booking Successful</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>Booking ID {invoice.bookingId}</div>
              </div>
              <button onClick={() => setShowSuccess(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <X size={16} />
              </button>
            </div>

            <div
              className="grid flex-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[1.3fr_0.7fr]"
            >
              <div className="min-h-0 overflow-hidden">
                <div
                className="flex h-full flex-col overflow-hidden rounded-[28px] border p-5"
                style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}
              >
                <div
                  className="mb-4 font-serif font-bold flex-shrink-0"
                  style={{ fontSize: 22, color: 'var(--text-dark)' }}
                >
                  Ticket Preview
                </div>

              <div className="flex flex-1 items-center justify-center overflow-hidden">
                <div
                  style={{
                    transform: 'scale(0.72)',
                    transformOrigin: 'center center',
                    maxHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TicketSlipPreview invoice={invoice} />
                </div>
              </div>
              </div>
              </div>

              <div className="flex flex-col gap-4 overflow-auto pr-1">
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Grand Total</div>
                  <div className="font-serif font-bold mt-2" style={{ fontSize: 30, color: 'var(--maroon)' }}>{formatCurrency(invoice.totalAmount)}</div>
                </div>

                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                  <div className="font-semibold mb-2" style={{ color: 'var(--text-dark)' }}>Ticket Conditions</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                    1. Ticket layout and print match the operator ticket format.<br />
                    2. Carry a valid ID along with the printed ticket.<br />
                    3. Verify visitor counts and add-ons before printing.
                  </div>
                </div>

                <button
                  onClick={() => printInvoice(invoice)}
                  className="w-full rounded-2xl px-4 py-3 font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Printer size={15} />
                    Print Ticket
                  </span>
                </button>

                <button
                  onClick={reloadBookingSetup}
                  className="w-full rounded-2xl px-4 py-3 font-medium"
                  style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
                >
                  Continue Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
