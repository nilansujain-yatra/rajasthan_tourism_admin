'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronDown, Minus, Phone, Plus, Printer, RefreshCw, Ticket, User, X } from 'lucide-react'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'

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
      <td style="padding:1px 0;color:#000;font-size:18px;font-weight:600;width:170px;">${item.ticketName} - ${item.name}</td>
      <td style="padding:1px 0;color:#000;font-size:18px;font-weight:600;text-align:right;">${item.quantity}</td>
    </tr>
  `).join('')
  const ticketMarkup = invoice.ticketSummary.map(item => `
    <tr>
      <td style="padding:1px 0;color:#000;font-size:18px;font-weight:600;width:170px;">${item.ticketName}</td>
      <td style="padding:1px 0;color:#000;font-size:18px;font-weight:600;text-align:right;">${item.quantity}</td>
    </tr>
  `).join('')

  popup.document.write(`
    <html>
      <head>
        <title>Booking Ticket ${invoice.bookingId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #000; background: #fff; }
          .ticket { width: 400px; margin: 0 auto; background: #fff; padding: 0 25px 25px; }
          table { width: 100%; border-collapse: collapse; }
          a { color: #000; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h1 style="color:#000;font-size:13px;text-transform:uppercase;font-weight:800;text-align:center;margin-bottom:10px;">Government of Rajasthan</h1>
          <h5 style="color:#000;font-size:20px;text-transform:uppercase;font-weight:800;text-align:center;margin:0;">${invoice.placeName}<br/>${invoice.districtName || ''}</h5>
          ${invoice.purchasePlaceName === 'Amber Fort' ? '<h1 style="color:#000;font-size:13px;text-transform:uppercase;font-weight:800;text-align:center;margin-top:10px;margin-bottom:10px;">( A UNESCO WORLD HERITAGE SITE )</h1>' : ''}
          ${qrImageUrl ? `<div><img src="${qrImageUrl}" alt="QR code" style="height:100px;width:100px;display:block;margin:0 auto;" /></div>` : ''}
          <div style="display:flex;justify-content:space-between;border-top:2px dotted #676767;margin-top:5px;margin-bottom:5px;padding-top:5px;padding-bottom:5px;">
            <div>
              <p style="color:#000;font-size:18px;font-weight:600;margin:0;">Visit Date</p>
              <p style="color:#000;font-size:18px;font-weight:600;margin:0;">Booking ID</p>
            </div>
            <div>
              <p style="color:#000;font-size:18px;font-weight:500;text-align:right;margin:0;">${formatTicketDate(invoice.bookingDate)}</p>
              <p style="color:#000;font-size:18px;font-weight:500;margin:0;">${invoice.bookingId}</p>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:2px dotted #676767;"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;color:#000;font-size:18px;font-weight:600;padding:0 0 4px;">Visitor Type</th>
                <th style="text-align:right;color:#000;font-size:18px;font-weight:600;padding:0 0 4px;">Qty</th>
              </tr>
            </thead>
            <tbody>${ticketMarkup}</tbody>
          </table>
          ${invoice.addonSummary.length ? '<div style="color:#000;font-size:20px;font-weight:750;margin-top:8px;">Add On Charges :-</div>' : ''}
          ${invoice.addonSummary.length ? `<table><tbody>${addOnMarkup}</tbody></table>` : ''}
          <div style="display:flex;justify-content:space-between;border-top:2px dotted #676767;margin-top:2px;padding-top:2px;">
            <p style="color:#000;font-size:18px;font-weight:600;margin:0;">Total Visitors</p>
            <p style="color:#000;font-size:18px;font-weight:600;margin:0;">${invoice.totalUsers || invoice.ticketSummary.reduce((sum, item) => sum + item.quantity, 0)}</p>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:2px;padding-top:2px;">
            <p style="color:#000;font-size:18px;font-weight:600;margin:0;">Total Amount</p>
            <p style="color:#000;font-size:18px;font-weight:600;margin:0;">${formatCurrency(invoice.totalAmount)}</p>
          </div>
          <div style="border-top:2px dotted #676767;margin-top:5px;padding-top:5px;text-align:left;">
            <p style="color:#000;font-size:18px;font-weight:600;text-align:left;margin:0;">T &amp; C apply</p>
          </div>
          <div style="border-top:2px dotted #676767;margin-top:5px;margin-bottom:5px;padding-top:5px;padding-bottom:5px;">
            <p style="color:#000;font-size:16px;font-weight:500;text-align:left;margin:0 0 8px;">1. For your next visit, book ticket at <br/><a href="https://obms-tourist.rajasthan.gov.in">obms-tourist.rajasthan.gov.in</a></p>
            <p style="color:#000;font-size:16px;font-weight:500;text-align:left;margin:0;">2. Explore and purchase various products at <br/><a href="https://ebazaar.rajasthan.gov.in">ebazaar.rajasthan.gov.in</a></p>
          </div>
          <div style="border-top:2px dotted #676767;margin-top:5px;margin-bottom:5px;padding-top:5px;padding-bottom:5px;text-align:center;">
            <p style="color:#000;font-size:18px;font-weight:600;margin:0;">Thanks For Visit</p>
            <p style="color:#000;font-size:18px;font-weight:600;margin:0;">${invoice.kioskId || 'Kiosk'}</p>
            <p style="color:#000;font-size:18px;font-weight:400;margin-top:10px;margin-bottom:10px;">${formatTicketDate(invoice.bookingDate)} ${formatTicketTime(invoice.bookingDate)}</p>
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
    <div className="mx-auto w-full max-w-[400px] rounded-[28px] bg-white px-6 pb-6 pt-1 shadow-sm" style={{ border: '1px solid #eadfd8' }}>
      <h1 style={{ color: '#000', fontSize: 13, textTransform: 'uppercase', fontWeight: 800, textAlign: 'center', marginBottom: 10 }}>Government of Rajasthan</h1>
      <h5 style={{ color: '#000', fontSize: 20, textTransform: 'uppercase', fontWeight: 800, textAlign: 'center', margin: 0 }}>
        {invoice.placeName}
        <br />
        {invoice.districtName || ''}
      </h5>
      {invoice.purchasePlaceName === 'Amber Fort' ? (
        <h1 style={{ color: '#000', fontSize: 13, textTransform: 'uppercase', fontWeight: 800, textAlign: 'center', marginTop: 10, marginBottom: 10 }}>
          ( A UNESCO WORLD HERITAGE SITE )
        </h1>
      ) : null}
      {qrImageUrl ? <img src={qrImageUrl} alt="QR code" style={{ height: 100, width: 100, display: 'block', margin: '0 auto' }} /> : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dotted #676767', marginTop: 5, marginBottom: 5, paddingTop: 5, paddingBottom: 5 }}>
        <div>
          <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>Visit Date</p>
          <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>Booking ID</p>
        </div>
        <div>
          <p style={{ color: '#000', fontSize: 18, fontWeight: 500, textAlign: 'right', margin: 0 }}>{formatTicketDate(invoice.bookingDate)}</p>
          <p style={{ color: '#000', fontSize: 18, fontWeight: 500, margin: 0 }}>{invoice.bookingId}</p>
        </div>
      </div>

      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', color: '#000', fontSize: 18, fontWeight: 600, paddingBottom: 4 }}>Visitor Type</th>
            <th style={{ textAlign: 'right', color: '#000', fontSize: 18, fontWeight: 600, paddingBottom: 4 }}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {invoice.ticketSummary.map(item => (
            <tr key={item.ticketName}>
              <td style={{ paddingBottom: 1, color: '#000', fontSize: 18, fontWeight: 600, width: 170 }}>{item.ticketName}</td>
              <td style={{ color: '#000', fontSize: 18, fontWeight: 600, textAlign: 'right' }}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoice.addonSummary.length ? <div style={{ color: '#000', fontSize: 20, fontWeight: 750, marginTop: 8 }}>Add On Charges :-</div> : null}
      {invoice.addonSummary.length ? (
        <table style={{ width: '100%' }}>
          <tbody>
            {invoice.addonSummary.map(item => (
              <tr key={`${item.ticketName}-${item.name}`}>
                <td style={{ paddingBottom: 1, color: '#000', fontSize: 18, fontWeight: 600, width: 170 }}>{item.ticketName} - {item.name}</td>
                <td style={{ color: '#000', fontSize: 18, fontWeight: 600, textAlign: 'right' }}>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dotted #676767', marginTop: 2, paddingTop: 2 }}>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>Total Visitors</p>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>{totalVisitors}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, paddingTop: 2 }}>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>Total Amount</p>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>{formatCurrency(invoice.totalAmount)}</p>
      </div>

      <div style={{ borderTop: '2px dotted #676767', marginTop: 5, paddingTop: 5, textAlign: 'left' }}>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>T &amp; C apply</p>
      </div>

      <div style={{ borderTop: '2px dotted #676767', marginTop: 5, marginBottom: 5, paddingTop: 5, paddingBottom: 5 }}>
        <p style={{ color: '#000', fontSize: 16, fontWeight: 500, textAlign: 'left', margin: '0 0 8px' }}>
          1. For your next visit, book ticket at <br />
          <a href="https://obms-tourist.rajasthan.gov.in" target="_blank" rel="noreferrer">obms-tourist.rajasthan.gov.in</a>
        </p>
        <p style={{ color: '#000', fontSize: 16, fontWeight: 500, textAlign: 'left', margin: 0 }}>
          2. Explore and purchase various products at <br />
          <a href="https://ebazaar.rajasthan.gov.in" target="_blank" rel="noreferrer">ebazaar.rajasthan.gov.in</a>
        </p>
      </div>

      <div style={{ borderTop: '2px dotted #676767', marginTop: 5, marginBottom: 5, paddingTop: 5, paddingBottom: 5, textAlign: 'center' }}>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>Thanks For Visit</p>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 600, margin: 0 }}>{invoice.kioskId || 'Kiosk'}</p>
        <p style={{ color: '#000', fontSize: 18, fontWeight: 400, marginTop: 10, marginBottom: 10 }}>{formatTicketDate(invoice.bookingDate)} {formatTicketTime(invoice.bookingDate)}</p>
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
          cache: 'no-store',
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
        const response = await fetch(`/api/user/${userId}`, {
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
    if (!placeId) {
      if (!loadingSession) {
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

        const chargeResponse = await fetch('/api/operator-booking/specific-charges', {
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
        const detailResponse = await fetch(
          `/api/operator-booking/ticket-details?placeId=${encodeURIComponent(placeId)}&date=${bookingDate}&specificChargesId=${encodeURIComponent(offlineCharge.id)}&onSite=${bookingFlags.onSite}`,
          { headers: { Accept: 'application/json' }, cache: 'no-store' },
        )
        const detailPayload = await detailResponse.json().catch(() => null) as TicketAvailabilityResponse | null
        if (!detailResponse.ok) {
          throw new Error(toText(detailPayload?.message, 'Unable to fetch ticket availability.'))
        }

        const ticketTypes = detailPayload?.result?.ticketTypeDtos ?? []
        const addOnResponses = await Promise.all(ticketTypes.map(ticketType => {
          return fetch(`/api/operator-booking/ticket-addons?ticketTypeId=${encodeURIComponent(toText(ticketType.id))}&date=${bookingDate}`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }).then(async response => {
            const payload = await response.json().catch(() => null)
            if (!response.ok) {
              return []
            }
            return Array.isArray((payload as Record<string, unknown> | null)?.result)
              ? (payload as Record<string, unknown>).result as Array<Record<string, unknown>>
              : []
          })
        }))

        const normalizedTicketOptions = ticketTypes.map((ticketType, index) => ({
          id: toText(ticketType.id),
          masterTicketTypeName: toText(ticketType.masterTicketTypeName || ticketType.ticketTypeName, 'Ticket'),
          amount: toNumber(ticketType.amount),
          quantity: 0,
          specificCharges: Array.isArray(ticketType.specificCharges) ? ticketType.specificCharges : [],
          addOnList: addOnResponses[index].map(addon => ({
            id: toText(addon.id),
            name: toText(addon.name, 'Add-on'),
            amount: toNumber(addon.totalAmount),
            qty: 0,
            remarkable: Boolean(addon.remarkable),
            remarkFieldValue: toText(addon.remarkFieldValue, 'Remark'),
            remarkValue: [],
          })),
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

  const subtotal = useMemo(() => {
    return ticketOptions.reduce((sum, ticket) => {
      return addonOnly ? sum : sum + (ticket.quantity * ticket.amount)
    }, 0)
  }, [addonOnly, ticketOptions])

  const addonTotal = useMemo(() => {
    return ticketOptions.reduce((sum, ticket) => {
      return sum + ticket.addOnList.reduce((inner, addon) => inner + (addon.qty * addon.amount), 0)
    }, 0)
  }, [ticketOptions])

  const totalTickets = useMemo(() => {
    return ticketOptions.reduce((sum, ticket) => sum + ticket.quantity, 0)
  }, [ticketOptions])

  const grandTotal = useMemo(() => {
    return getRoundedTotal(subtotal + addonTotal, Boolean(availability?.roundOff))
  }, [addonTotal, availability?.roundOff, subtotal])

  function updateTicketQuantity(ticketId: string, nextValue: number) {
    setTicketOptions(current => current.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      return {
        ...ticket,
        quantity: Math.max(0, nextValue),
        addOnList: nextValue > 0 ? ticket.addOnList : ticket.addOnList.map(addon => ({ ...addon, qty: 0, remarkValue: [] })),
      }
    }))
  }

  function updateAddonQuantity(ticketId: string, addonId: string, nextValue: number) {
    setTicketOptions(current => current.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      return {
        ...ticket,
        addOnList: ticket.addOnList.map(addon => {
          if (addon.id !== addonId) return addon
          return {
            ...addon,
            qty: Math.max(0, nextValue),
            remarkValue: nextValue > 0 ? addon.remarkValue.slice(0, Math.max(0, nextValue)) : [],
          }
        }),
      }
    }))
  }

  function updateAddonRemark(ticketId: string, addonId: string, index: number, value: string) {
    setTicketOptions(current => current.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      return {
        ...ticket,
        addOnList: ticket.addOnList.map(addon => {
          if (addon.id !== addonId) return addon
          const nextRemarks = [...addon.remarkValue]
          nextRemarks[index] = value
          return { ...addon, remarkValue: nextRemarks }
        }),
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
      const chargeResponse = await fetch('/api/operator-booking/specific-charges', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const chargePayload = await chargeResponse.json().catch(() => null)
      if (!chargeResponse.ok) throw new Error(toText((chargePayload as Record<string, unknown> | null)?.message, 'Unable to fetch specific charges.'))
      const charges = getSpecificChargeDtos(chargePayload)
      const normalizedCharges = charges.map(item => ({ id: toText(item.id), name: toText(item.name) })).filter(item => item.id)
      const offlineCharge = normalizedCharges.find(item => item.name.toLowerCase() === 'offline') ?? normalizedCharges[0]
      if (!offlineCharge) throw new Error('No specific charges are configured for this place.')
      const bookingDate = startOfTodayMs()
      const detailResponse = await fetch(`/api/operator-booking/ticket-details?placeId=${encodeURIComponent(freshPlaceId)}&date=${bookingDate}&specificChargesId=${encodeURIComponent(offlineCharge.id)}&onSite=${flags.onSite}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const detailPayload = await detailResponse.json().catch(() => null) as TicketAvailabilityResponse | null
      if (!detailResponse.ok) throw new Error(toText(detailPayload?.message, 'Unable to fetch ticket availability.'))
      const ticketTypes = detailPayload?.result?.ticketTypeDtos ?? []
      const addOnResponses = await Promise.all(ticketTypes.map(ticketType =>
        fetch(`/api/operator-booking/ticket-addons?ticketTypeId=${encodeURIComponent(toText(ticketType.id))}&date=${bookingDate}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
          .then(async response => {
            const payload = await response.json().catch(() => null)
            return response.ok && Array.isArray((payload as Record<string, unknown> | null)?.result)
              ? (payload as Record<string, unknown>).result as Array<Record<string, unknown>>
              : []
          }),
      ))
      setSpecificCharges(normalizedCharges)
      setSelectedSpecificChargeId(offlineCharge.id)
      setAvailability(detailPayload?.result ?? null)
      setTicketOptions(ticketTypes.map((ticketType, index) => ({
        id: toText(ticketType.id),
        masterTicketTypeName: toText(ticketType.masterTicketTypeName || ticketType.ticketTypeName, 'Ticket'),
        amount: toNumber(ticketType.amount),
        quantity: 0,
        specificCharges: Array.isArray(ticketType.specificCharges) ? ticketType.specificCharges : [],
        addOnList: addOnResponses[index].map(addon => ({
          id: toText(addon.id),
          name: toText(addon.name, 'Add-on'),
          amount: toNumber(addon.totalAmount),
          qty: 0,
          remarkable: Boolean(addon.remarkable),
          remarkFieldValue: toText(addon.remarkFieldValue, 'Remark'),
          remarkValue: [],
        })),
      })))
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
        ticketUserDtoClone: selectedTickets.map(ticket => ({
          ticketTypeId: ticket.id,
          qty: addonOnly ? 0 : ticket.quantity,
          ...(ticket.specificCharges.length ? { specificChargeId: selectedSpecificChargeId } : {}),
          addOnList: ticket.addOnList
            .filter(addon => addon.qty > 0)
            .map(addon => ({
              id: addon.id,
              qty: addon.qty,
              amount: addon.amount,
              name: addon.name,
              remarkable: addon.remarkable,
              remarkFieldValue: addon.remarkFieldValue,
              remarkValue: addon.remarkValue.filter(Boolean).join(','),
            })),
        })),
      }

      const createResponse = await fetch(
        `/api/operator-booking/create-ticket?isDepartmentAdmin=${bookingFlags.isDepartmentAdmin}&onSite=${bookingFlags.onSite}`,
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

      const invoiceResponse = await fetch(`/api/operator-booking/invoice?bookingId=${encodeURIComponent(bookingId)}`, {
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
    <div className="px-6 py-6 space-y-6">
      <div
        className="rounded-[28px] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 55%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}
      >
        <div className="px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 11 }}>
                <Ticket size={12} />
                Live Operator Booking
              </div>
              <h1 className="font-serif font-bold" style={{ fontSize: 30, lineHeight: 1.05, color: '#fff' }}>
                Ticket Booking
              </h1>
             
            </div>

            <button
              onClick={reloadBookingSetup}
              className="rounded-2xl px-4 py-3 font-medium text-white"
              style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 13 }}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={14} />
                Reload
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-px md:grid-cols-5" style={{ background: 'rgba(255,255,255,0.14)' }}>
          {[
            { label: 'Assigned Place', value: extraDetails?.assignedPlaces?.join(', ') || placeName || placeId || 'Not mapped' },
            { label: 'Department', value: extraDetails?.departmentName || 'N/A' },
            { label: 'Ticket Types', value: String(ticketOptions.length) },
            { label: 'Visible Shifts', value: String(visibleShifts.length) },
            { label: 'Booking Mode', value: bookingFlags.onSite ? 'On-site' : 'Department' },
          ].map(card => (
            <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{card.label}</div>
              <div className="mt-1 font-semibold" style={{ fontSize: 18, color: '#fff' }}>{card.value}</div>
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
        <div className="rounded-[28px] border bg-white px-6 py-16 text-center" style={{ borderColor: 'var(--sand)' }}>
          <div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>Loading booking setup...</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Fetching configured ticket types, shifts and add-ons.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
                  <User size={18} />
                </div>
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Visitor Details</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mobile Number
                  </label>
                  <div className="flex items-center rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
                    <Phone size={14} style={{ color: 'var(--maroon)', marginRight: 10 }} />
                    <input
                      value={mobile}
                      onChange={event => setMobile(event.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter mobile number"
                      className="w-full bg-transparent outline-none"
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={event => setEmail(event.target.value.trim())}
                    placeholder="Enter email address"
                    className="w-full rounded-2xl px-4 py-3 outline-none"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
                  />
                </div>

                {requiresName ? (
                  <div className="md:col-span-2">
                    <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Visitor Name
                    </label>
                    <input
                      value={name}
                      onChange={event => setName(event.target.value)}
                      placeholder="Enter visitor name"
                      className="w-full rounded-2xl px-4 py-3 outline-none"
                      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
                    />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(200,146,42,0.10)', color: '#C8922A' }}>
                  <CalendarDays size={18} />
                </div>
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Shift Selection</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {visibleShifts.map(shift => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setSelectedShiftId(shift.id)}
                    className="rounded-2xl px-4 py-4 text-left transition"
                    style={{
                      background: selectedShiftId === shift.id ? 'rgba(139,26,26,0.08)' : '#F8F4EE',
                      border: `1px solid ${selectedShiftId === shift.id ? 'rgba(139,26,26,0.24)' : 'var(--sand)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{shift.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          {shift.endTime ? `Ends ${formatDate(shift.endTime)}` : 'Shift available'}
                        </div>
                      </div>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: selectedShiftId === shift.id ? 'var(--maroon)' : '#fff', border: '1px solid var(--sand)' }}>
                        {selectedShiftId === shift.id ? <CheckCircle2 size={14} color="#fff" /> : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Ticket Options</div>
                </div>

                {allowAddonOnly ? (
                  <label className="inline-flex items-center gap-2 rounded-full px-3 py-2" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-dark)' }}>
                    <input type="checkbox" checked={addonOnly} onChange={() => setAddonOnly(value => !value)} />
                    Book this place with add-ons only
                  </label>
                ) : null}
              </div>

              <div className="space-y-4">
                {ticketOptions.map(ticket => (
                  <div key={ticket.id} className="rounded-[22px] border overflow-hidden" style={{ borderColor: 'var(--sand)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4" style={{ background: '#FCF7F0' }}>
                      <div>
                        <div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>{ticket.masterTicketTypeName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {formatCurrency(ticket.amount)} per ticket
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateTicketQuantity(ticket.id, ticket.quantity - 1)}
                          disabled={ticket.quantity <= 0 || addonOnly}
                          className="flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40"
                          style={{ background: '#fff', border: '1px solid var(--sand)' }}
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          value={ticket.quantity === 0 ? '' : ticket.quantity}
                          onChange={event => updateTicketQuantity(ticket.id, toNumber(event.target.value))}
                          className="w-20 rounded-xl px-3 py-2 text-center outline-none"
                          style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 14 }}
                          disabled={addonOnly}
                        />
                        <button
                          type="button"
                          onClick={() => updateTicketQuantity(ticket.id, ticket.quantity + 1)}
                          disabled={addonOnly}
                          className="flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40"
                          style={{ background: '#fff', border: '1px solid var(--sand)' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {ticket.addOnList.length > 0 ? (
                      <div className="px-5 py-4 space-y-4">
                        {ticket.addOnList.map(addon => (
                          <div key={addon.id} className="rounded-2xl px-4 py-4" style={{ background: '#fffaf5', border: '1px solid #f0dfc7' }}>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <div className="font-medium" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{addon.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                  {formatCurrency(addon.amount)} per add-on
                                </div>
                              </div>

                              <input
                                value={addon.qty === 0 ? '' : addon.qty}
                                onChange={event => updateAddonQuantity(ticket.id, addon.id, toNumber(event.target.value))}
                                className="w-24 rounded-xl px-3 py-2 text-center outline-none"
                                style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 14 }}
                              />
                            </div>

                            {addon.remarkable && addon.qty > 0 ? (
                              <div className="grid gap-3 md:grid-cols-2 mt-4">
                                {Array.from({ length: addon.qty }, (_, index) => (
                                  <input
                                    key={`${addon.id}-${index}`}
                                    value={addon.remarkValue[index] ?? ''}
                                    onChange={event => updateAddonRemark(ticket.id, addon.id, index, event.target.value)}
                                    placeholder={`Enter ${addon.remarkFieldValue || 'remark'} ${index + 1}`}
                                    className="rounded-xl px-3 py-2 outline-none"
                                    style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }}
                                  />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[28px] border bg-white p-6 sticky top-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Payment Summary</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Review totals before creating the booking.</div>
                </div>
                <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: '#F8F4EE' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Tickets</span>
                  <strong style={{ color: 'var(--text-dark)' }}>{totalTickets}</strong>
                </div>

                {ticketOptions.filter(ticket => ticket.quantity > 0 && !addonOnly).map(ticket => (
                  <div key={`summary-${ticket.id}`} className="flex items-center justify-between" style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text-mid)' }}>{ticket.masterTicketTypeName} x {ticket.quantity}</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{formatCurrency(ticket.quantity * ticket.amount)}</span>
                  </div>
                ))}

                {addonTotal > 0 ? (
                  <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text-mid)' }}>Add-on Charges</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{formatCurrency(addonTotal)}</span>
                  </div>
                ) : null}

                <div className="h-px my-2" style={{ background: 'var(--sand)' }} />

                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>Grand Total</span>
                  <span className="font-serif font-bold" style={{ fontSize: 28, color: 'var(--maroon)' }}>{formatCurrency(grandTotal)}</span>
                </div>

               
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="mt-6 w-full rounded-2xl px-5 py-3.5 font-semibold text-white disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 15 }}
              >
                {submitting ? 'Booking Ticket...' : 'Book Ticket'}
              </button>
            </section>
          </aside>
        </form>
      )}

      {showSuccess && invoice ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
          style={{ background: 'rgba(28,16,8,0.48)', backdropFilter: 'blur(6px)' }}
          onClick={event => {
            if (event.target === event.currentTarget) setShowSuccess(false)
          }}
        >
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)' }}>
              <div>
                <div className="font-serif font-bold text-white" style={{ fontSize: 26 }}>Booking Successful</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>Booking ID {invoice.bookingId}</div>
              </div>
              <button onClick={() => setShowSuccess(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-4">
                <div className="rounded-[28px] border p-5" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                  <div className="font-serif font-bold mb-4" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Ticket Preview</div>
                  <TicketSlipPreview invoice={invoice} />
                </div>
              </div>

              <div className="space-y-4">
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
