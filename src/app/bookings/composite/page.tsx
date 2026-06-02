'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, CheckCircle2, CreditCard, Mail, MapPin, Minus, Package2, PersonStanding, Phone, Plus, Printer, RefreshCw, Search, Ticket, User, Wallet, X } from 'lucide-react'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'
import { authFetch } from '@/lib/api/authFetch'

type SpecificCharge = { id: string, name: string }
type AddOnState = { id: string, name: string, amount: number, qty: number, remarkable: boolean, remarkFieldValue: string, remarkValue: string[] }
type TicketTypeState = { id: string, masterTicketTypeName: string, amount: number, quantity: number, specificCharges: unknown[], addOnList: AddOnState[] }
type PackageOption = { id: string, packageName: string, days: number, placeCount: number, active: boolean }
type PackageDetail = { id: string, packageName: string, days: number, placeNames: string[] }
type BookingFlags = { isDepartmentAdmin: boolean, onSite: boolean }
type CompositeInvoiceLine = { label: string, quantity: number, total: number, notes: string[] }
type CompositeTicketSummary = { ticketName: string, quantity: number, totalAmount: number }
type CompositeAddonSummary = { ticketName: string, name: string, quantity: number, totalAmount: number }
type CompositeInvoice = { bookingId: string, bookingDate: number, packageName: string, totalAmount: number, mobile: string, email: string, visitorName: string, placeNames: string[], validityDays: number, qrDetail: string, districtName: string, purchasePlaceName: string, totalUsers: number, lines: CompositeInvoiceLine[], ticketSummary: CompositeTicketSummary[], addonSummary: CompositeAddonSummary[] }

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

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 5) return null
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatDate(value: number | string) {
  const date = new Date(typeof value === 'number' ? value : toNumber(value))
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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

function getBookingFlags(user: AuthUser | null): BookingFlags {
  if (user?.isDepartmentAdmin === true && user?.onSiteBooking === false) return { isDepartmentAdmin: true, onSite: false }
  if (user?.isDepartmentAdmin === false && user?.onSiteBooking === true) return { isDepartmentAdmin: false, onSite: true }
  if (user?.isDepartmentAdmin === true && user?.onSiteBooking === true) return { isDepartmentAdmin: true, onSite: false }
  return { isDepartmentAdmin: false, onSite: true }
}

function getRoundedTotal(value: number, roundOff: boolean) {
  if (!roundOff) return value
  return value < 40 ? Math.ceil(value) : Math.round(value)
}

function getPackageList(payload: unknown): PackageOption[] {
  const result = payload && typeof payload === 'object' ? (payload as { result?: Record<string, unknown> }).result : null
  const packages = Array.isArray(result?.packagesGetAll) ? result?.packagesGetAll as Array<Record<string, unknown>> : findFirstArray(payload) as Array<Record<string, unknown>> | null
  return (packages ?? []).map(item => ({
    id: toText(item.id),
    packageName: toText(item.packageName || item.name, 'Unnamed Package'),
    days: toNumber(item.days || item.duration),
    placeCount: toNumber(item.placeCount),
    active: item.active !== false,
  })).filter(item => item.id)
}

function getPackageDetail(payload: unknown): PackageDetail | null {
  const result = payload && typeof payload === 'object' ? (payload as { result?: Record<string, unknown> }).result : null
  if (!result) return null
  const places = Array.isArray(result.placeDetailResponse) ? result.placeDetailResponse as Array<Record<string, unknown>> : []
  return {
    id: toText(result.id),
    packageName: toText(result.packageName || result.name, 'Selected Package'),
    days: toNumber(result.days || result.duration),
    placeNames: places.map(item => toText(item.placeName || item.name)).filter(Boolean),
  }
}

function getSpecificChargeDtos(payload: unknown) {
  const result = payload && typeof payload === 'object' ? (payload as { result?: Record<string, unknown> }).result : null
  return Array.isArray(result?.specificChargesDtos) ? result.specificChargesDtos as Array<Record<string, unknown>> : []
}

function normalizeCompositeInvoice(payload: unknown, packageDetail: PackageDetail | null, mobile: string, email: string, visitorName: string, selectedTickets: TicketTypeState[], totalAmount: number): CompositeInvoice {
  const result = payload && typeof payload === 'object' ? (payload as { result?: Record<string, unknown> }).result : null
  const lines = selectedTickets.flatMap(ticket => {
    const baseLine = ticket.quantity > 0 ? [{ label: ticket.masterTicketTypeName, quantity: ticket.quantity, total: ticket.quantity * ticket.amount, notes: [] as string[] }] : []
    const addonLines = ticket.addOnList.filter(addon => addon.qty > 0).map(addon => ({
      label: `${ticket.masterTicketTypeName} - ${addon.name}`,
      quantity: addon.qty,
      total: addon.qty * addon.amount,
      notes: addon.remarkValue.filter(Boolean),
    }))
    return [...baseLine, ...addonLines]
  })
  const invoiceBookingDtos = Array.isArray(result?.invoiceBookingDtos) ? result?.invoiceBookingDtos as Array<Record<string, unknown>> : []
  const ticketSummary = invoiceBookingDtos.length
    ? invoiceBookingDtos.map(item => ({
        ticketName: toText(item.ticketName || item.ticketTypeName, 'Ticket'),
        quantity: toNumber(item.quantity || item.qty),
        totalAmount: toNumber(item.totalAmount),
      }))
    : selectedTickets.filter(ticket => ticket.quantity > 0).map(ticket => ({
        ticketName: ticket.masterTicketTypeName,
        quantity: ticket.quantity,
        totalAmount: ticket.quantity * ticket.amount,
      }))
  const addonSummary = invoiceBookingDtos.length
    ? invoiceBookingDtos.flatMap(item => {
        const ticketName = toText(item.ticketName || item.ticketTypeName, 'Ticket')
        const addons = Array.isArray(item.addonItems) ? item.addonItems as Array<Record<string, unknown>> : []
        return addons.map(addon => ({
          ticketName,
          name: toText(addon.name, 'Add On'),
          quantity: toNumber(addon.quantity),
          totalAmount: toNumber(addon.totalAmount || addon.amount),
        }))
      })
    : selectedTickets.flatMap(ticket => ticket.addOnList.filter(addon => addon.qty > 0).map(addon => ({
        ticketName: ticket.masterTicketTypeName,
        name: addon.name,
        quantity: addon.qty,
        totalAmount: addon.qty * addon.amount,
      })))

  return {
    bookingId: toText(result?.bookingId, 'N/A'),
    bookingDate: toNumber(result?.bookingDate, Date.now()),
    packageName: toText((result?.packageDto as Record<string, unknown> | undefined)?.packageName, packageDetail?.packageName ?? 'Composite Booking'),
    totalAmount: toNumber(result?.totalAmountWithAddOn, totalAmount),
    mobile,
    email,
    visitorName: visitorName || 'Guest',
    placeNames: Array.isArray(result?.placeNames) ? (result?.placeNames as unknown[]).map(item => toText(item)).filter(Boolean) : packageDetail?.placeNames ?? [],
    validityDays: toNumber((result?.packageDto as Record<string, unknown> | undefined)?.duration, packageDetail?.days ?? 0),
    qrDetail: toText(result?.qrDetail),
    districtName: toText((result?.placeDetailDto as Record<string, unknown> | undefined)?.districtName),
    purchasePlaceName: toText((result?.purchasePlaceDto as Record<string, unknown> | undefined)?.name),
    totalUsers: toNumber(result?.totalUsers, ticketSummary.reduce((sum, item) => sum + item.quantity, 0)),
    lines,
    ticketSummary,
    addonSummary,
  }
}

function printCompositeInvoice(invoice: CompositeInvoice) {
  const popup = window.open('', '_blank', 'width=420,height=900')

  if (!popup) return

  const qrImageUrl = buildQrImageUrl(invoice.qrDetail)

  const ticketMarkup = invoice.ticketSummary
    .map(
      line => `
      <tr>
        <td style="padding:1px 0;color:#000;font-size:11px;font-weight:600;width:110px;">
          ${line.ticketName}
        </td>

        <td style="padding:1px 0;color:#000;font-size:11px;font-weight:600;text-align:right;">
          ${line.quantity}
        </td>
      </tr>
    `,
    )
    .join('')

  const addonMarkup = invoice.addonSummary
    .map(
      line => `
      <tr>
        <td style="padding:1px 0;color:#000;font-size:11px;font-weight:600;width:110px;">
          ${line.ticketName} - ${line.name}
        </td>

        <td style="padding:1px 0;color:#000;font-size:11px;font-weight:600;text-align:right;">
          ${line.quantity}
        </td>
      </tr>
    `,
    )
    .join('')

  popup.document.write(`
    <html>
      <head>
        <title>Composite Ticket ${invoice.bookingId}</title>

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
            width: 78mm;
            overflow: hidden;
            font-family: Arial, sans-serif;
            color: #000;
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
          div,
          img {
            page-break-inside: avoid !important;
          }

          * {
            box-sizing: border-box;
          }

          a {
            color: #000;
            text-decoration: none;
            word-break: break-word;
          }
        </style>
      </head>

      <body>
        <div class="ticket">

          <h5
            style="
              color:#0F172B;
              text-align:center;
              font-size:14px;
              font-weight:900;
              text-transform:uppercase;
              font-family:'Arial Black';
              margin:0 0 6px;
              line-height:1.3;
            "
          >
            ${invoice.purchasePlaceName || 'Composite Booking'}
          </h5>

          <h1
            style="
              color:#000;
              font-size:10px;
              text-transform:uppercase;
              font-weight:800;
              text-align:center;
              margin:0 0 6px;
            "
          >
            Government of Rajasthan
          </h1>

          <h5
            style="
              color:#0F172B;
              text-align:center;
              font-size:14px;
              font-weight:900;
              text-transform:uppercase;
              font-family:'Arial Black';
              margin:0;
              line-height:1.3;
            "
          >
            ${invoice.packageName}
            <br/>
            ${invoice.districtName || ''}
          </h5>

          ${
            invoice.purchasePlaceName === 'Amber Fort'
              ? `
            <h1
              style="
                color:#000;
                font-size:9px;
                text-transform:uppercase;
                font-weight:800;
                text-align:center;
                margin:6px 0;
              "
            >
              ( A UNESCO WORLD HERITAGE SITE )
            </h1>
          `
              : ''
          }

          ${
            qrImageUrl
              ? `
            <div>
              <img
                src="${qrImageUrl}"
                alt="QR code"
                style="
                  height:65px;
                  width:65px;
                  display:block;
                  margin:6px auto;
                "
              />
            </div>
          `
              : ''
          }

          <div
            style="
              display:flex;
              justify-content:space-between;
              border-top:1px dotted #676767;
              margin-top:4px;
              margin-bottom:4px;
              padding-top:4px;
              padding-bottom:4px;
            "
          >
            <div>
              <p style="color:#000;font-size:11px;font-weight:600;margin:0;">
                Visit Date
              </p>

              <p style="color:#000;font-size:11px;font-weight:600;margin:0;">
                Booking ID
              </p>
            </div>

            <div>
              <p
                style="
                  color:#000;
                  font-size:11px;
                  font-weight:500;
                  text-align:right;
                  margin:0;
                "
              >
                ${formatTicketDate(invoice.bookingDate)}
              </p>

              <p
                style="
                  color:#000;
                  font-size:11px;
                  font-weight:500;
                  text-align:right;
                  margin:0;
                "
              >
                ${invoice.bookingId}
              </p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th
                  style="
                    text-align:left;
                    color:#000;
                    font-size:11px;
                    font-weight:700;
                    padding-bottom:3px;
                  "
                >
                  Visitor Type
                </th>

                <th
                  style="
                    text-align:right;
                    color:#000;
                    font-size:11px;
                    font-weight:700;
                    padding-bottom:3px;
                  "
                >
                  Qty
                </th>
              </tr>
            </thead>

            <tbody>
              ${ticketMarkup}
            </tbody>
          </table>

          ${
            invoice.addonSummary.length
              ? `
            <div
              style="
                color:#000;
                font-size:12px;
                font-weight:700;
                margin-top:6px;
              "
            >
              Add On Charges :-
            </div>

            <table>
              <tbody>
                ${addonMarkup}
              </tbody>
            </table>
          `
              : ''
          }

          <div
            style="
              display:flex;
              justify-content:space-between;
              border-top:1px dotted #676767;
              margin-top:4px;
              padding-top:4px;
            "
          >
            <p style="color:#000;font-size:11px;font-weight:700;margin:0;">
              Total Visitors
            </p>

            <p style="color:#000;font-size:11px;font-weight:700;margin:0;">
              ${invoice.totalUsers}
            </p>
          </div>

          <div
            style="
              display:flex;
              justify-content:space-between;
              margin-top:2px;
              padding-top:2px;
            "
          >
            <p style="color:#000;font-size:11px;font-weight:700;margin:0;">
              Total Amount
            </p>

            <p style="color:#000;font-size:11px;font-weight:700;margin:0;">
              ${formatCurrency(invoice.totalAmount)}
            </p>
          </div>

          <div
            style="
              border-top:1px dotted #676767;
              margin-top:5px;
              padding-top:5px;
              text-align:center;
            "
          >
            <p
              style="
                color:#000;
                font-size:11px;
                font-weight:700;
                margin:0;
              "
            >
              T &amp; C Apply
            </p>

            <p
              style="
                color:#000;
                font-size:10px;
                font-weight:500;
                line-height:1.5;
                margin:4px 0 0;
              "
            >
              Composite Tickets Valid For ${
                invoice.validityDays || 0
              } Days Only.
            </p>
          </div>

          <div
            style="
              border-top:1px dotted #676767;
              margin-top:5px;
              padding-top:5px;
              text-align:center;
            "
          >
            <p
              style="
                color:#000;
                font-size:11px;
                font-weight:700;
                margin:0;
              "
            >
              Thanks For Visit
            </p>

            <p
              style="
                color:#000;
                font-size:10px;
                font-weight:400;
                margin-top:5px;
                margin-bottom:0;
              "
            >
              ${formatTicketDate(invoice.bookingDate)}
              ${formatTicketTime(invoice.bookingDate)}
            </p>
          </div>

        </div>

        <script>
          window.onload = () => {
            window.print()
          }
        </script>
      </body>
    </html>
  `)

  popup.document.close()
}

function CompositeTicketSlipPreview({ invoice }: { invoice: CompositeInvoice }) {
  const qrImageUrl = buildQrImageUrl(invoice.qrDetail)

  return (
    <div
      className="mx-auto w-full max-w-[320px] rounded-[22px] bg-white px-4 pb-4 pt-2 shadow-sm"
      style={{
        border: '1px solid #eadfd8',
      }}
    >
      <h5
        style={{
          color: '#0F172B',
          textAlign: 'center',
          fontSize: 15,
          fontWeight: 900,
          textTransform: 'uppercase',
          fontFamily: '"Arial Black"',
          marginBottom: 6,
          lineHeight: 1.2,
        }}
      >
        {invoice.purchasePlaceName || 'Composite Booking'}
      </h5>

      <h1
        style={{
          color: '#000',
          fontSize: 10,
          textTransform: 'uppercase',
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        Government of Rajasthan
      </h1>

      <h5
        style={{
          color: '#0F172B',
          textAlign: 'center',
          fontSize: 15,
          fontWeight: 900,
          textTransform: 'uppercase',
          fontFamily: '"Arial Black"',
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {invoice.packageName}
        <br />
        {invoice.districtName || ''}
      </h5>

      {invoice.purchasePlaceName === 'Amber Fort' ? (
        <h1
          style={{
            color: '#000',
            fontSize: 9,
            textTransform: 'uppercase',
            fontWeight: 800,
            textAlign: 'center',
            marginTop: 6,
            marginBottom: 6,
          }}
        >
          ( A UNESCO WORLD HERITAGE SITE )
        </h1>
      ) : null}

      {qrImageUrl ? (
        <img
          src={qrImageUrl}
          alt="QR code"
          style={{
            height: 62,
            width: 62,
            display: 'block',
            margin: '6px auto',
          }}
        />
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px dotted #676767',
          marginTop: 4,
          marginBottom: 4,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <div>
          <p style={{ color: '#000', fontSize: 12, fontWeight: 600, margin: 0 }}>
            Visit Date
          </p>

          <p style={{ color: '#000', fontSize: 12, fontWeight: 600, margin: 0 }}>
            Booking ID
          </p>
        </div>

        <div>
          <p
            style={{
              color: '#000',
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'right',
              margin: 0,
            }}
          >
            {formatTicketDate(invoice.bookingDate)}
          </p>

          <p
            style={{
              color: '#000',
              fontSize: 12,
              fontWeight: 500,
              margin: 0,
              textAlign: 'right',
            }}
          >
            {invoice.bookingId}
          </p>
        </div>
      </div>

      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                color: '#000',
                fontSize: 12,
                fontWeight: 700,
                paddingBottom: 3,
              }}
            >
              Visitor Type
            </th>

            <th
              style={{
                textAlign: 'right',
                color: '#000',
                fontSize: 12,
                fontWeight: 700,
                paddingBottom: 3,
              }}
            >
              Qty
            </th>
          </tr>
        </thead>

        <tbody>
          {invoice.ticketSummary.map(item => (
            <tr key={item.ticketName}>
              <td
                style={{
                  paddingBottom: 1,
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 600,
                  width: 120,
                }}
              >
                {item.ticketName}
              </td>

              <td
                style={{
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'right',
                }}
              >
                {item.quantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoice.addonSummary.length ? (
        <div
          style={{
            color: '#000',
            fontSize: 13,
            fontWeight: 700,
            marginTop: 6,
          }}
        >
          Add On Charges :-
        </div>
      ) : null}

      {invoice.addonSummary.length ? (
        <table style={{ width: '100%' }}>
          <tbody>
            {invoice.addonSummary.map(item => (
              <tr key={`${item.ticketName}-${item.name}`}>
                <td
                  style={{
                    paddingBottom: 1,
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 600,
                    width: 120,
                  }}
                >
                  {item.ticketName} - {item.name}
                </td>

                <td
                  style={{
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'right',
                  }}
                >
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px dotted #676767',
          marginTop: 4,
          paddingTop: 4,
        }}
      >
        <p style={{ color: '#000', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Total Visitors
        </p>

        <p style={{ color: '#000', fontSize: 12, fontWeight: 700, margin: 0 }}>
          {invoice.totalUsers}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 2,
          paddingTop: 2,
        }}
      >
        <p style={{ color: '#000', fontSize: 12, fontWeight: 700, margin: 0 }}>
          Total Amount
        </p>

        <p style={{ color: '#000', fontSize: 12, fontWeight: 700, margin: 0 }}>
          {formatCurrency(invoice.totalAmount)}
        </p>
      </div>

      <div
        style={{
          borderTop: '1px dotted #676767',
          marginTop: 5,
          paddingTop: 5,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#000',
            fontSize: 12,
            fontWeight: 700,
            margin: 0,
          }}
        >
          T &amp; C Apply
        </p>

        <p
          style={{
            color: '#000',
            fontSize: 10,
            fontWeight: 500,
            marginTop: 4,
            marginBottom: 0,
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          Composite Tickets Valid For {invoice.validityDays || 0} Days Only.
        </p>
      </div>

      <div
        style={{
          borderTop: '1px dotted #676767',
          marginTop: 5,
          paddingTop: 5,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: '#000',
            fontSize: 12,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Thanks For Visit
        </p>

        <p
          style={{
            color: '#000',
            fontSize: 10,
            fontWeight: 400,
            marginTop: 5,
            marginBottom: 0,
          }}
        >
          {formatTicketDate(invoice.bookingDate)}{' '}
          {formatTicketTime(invoice.bookingDate)}
        </p>
      </div>
    </div>
  )
}

export default function CompositeBookingPage() {
  const [extraDetails, setExtraDetails] = useState<{
    departmentName?: string
    assignedPlaces?: string[]
  } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryPackageId = searchParams.get('packageId')?.trim() ?? ''

  const [user, setUser] = useState<AuthUser | null>(() => readCachedAuthUser())
  const [bookingFlags, setBookingFlags] = useState<BookingFlags>(() => getBookingFlags(readCachedAuthUser()))
  const [packages, setPackages] = useState<PackageOption[]>([])
  const [packagesLoading, setPackagesLoading] = useState(true)
  const [packageSearch, setPackageSearch] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState(queryPackageId)
  const [selectedPackage, setSelectedPackage] = useState<PackageDetail | null>(null)
  const [selectedSpecificChargeId, setSelectedSpecificChargeId] = useState('')
  const [specificCharges, setSpecificCharges] = useState<SpecificCharge[]>([])
  const [ticketOptions, setTicketOptions] = useState<TicketTypeState[]>([])
  const [roundOff, setRoundOff] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [invoice, setInvoice] = useState<CompositeInvoice | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const bookingDate = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }, [])
  

  useEffect(() => {
    let isMounted = true
    async function loadSession() {
      try {
        const response = await authFetch('/auth/session', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Unable to read session.')
        const payload = await response.json() as { user?: AuthUser | null }
        if (!isMounted) return
        const sessionUser = payload.user ?? null
        setUser(sessionUser)
        setBookingFlags(getBookingFlags(sessionUser))
        writeCachedAuthUser(sessionUser)

        if (sessionUser?.sub) {
          void loadExtraDetails(sessionUser.sub)
        }
      } catch {
        if (!isMounted) return
        setUser(null)
        setBookingFlags(getBookingFlags(null))
        clearCachedAuthUser()
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
        if (!isMounted || !payload?.result) return

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
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    let active = true
    async function loadPackages() {
      setPackagesLoading(true)
      try {
        const response = await authFetch('/composite-booking/packages?offSet=0&size=100&statusList=true', { headers: { Accept: 'application/json' }, cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(toText((payload as Record<string, unknown> | null)?.message, 'Unable to fetch packages.'))
        if (!active) return
        setPackages(getPackageList(payload))
      } catch (packageError) {
        if (!active) return
        setPackages([])
        setError(packageError instanceof Error ? packageError.message : 'Unable to fetch packages.')
      } finally {
        if (active) setPackagesLoading(false)
      }
    }
    async function loadSpecificCharges() {
      try {
        const response = await authFetch('/specific-charges', { headers: { Accept: 'application/json' }, cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error('Unable to fetch specific charges.')
        if (!active) return
        const charges = getSpecificChargeDtos(payload).map(item => ({ id: toText(item.id), name: toText(item.name) })).filter(item => item.id)
        setSpecificCharges(charges)
        const offline = charges.find(item => item.name.toUpperCase() === 'OFFLINE')
        setSelectedSpecificChargeId(offline?.id ?? charges[0]?.id ?? '')
      } catch {
        if (!active) return
        setSpecificCharges([])
      }
    }
    loadPackages()
    loadSpecificCharges()
    return () => { active = false }
  }, [])

  const filteredPackages = useMemo(() => {
    const search = packageSearch.trim().toLowerCase()
    return packages.filter(item => item.active && (!search || item.packageName.toLowerCase().includes(search)))
  }, [packageSearch, packages])

  async function loadCompositeSetup(packageId: string) {
    if (!packageId || !selectedSpecificChargeId) return
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const [detailResponse, ticketResponse] = await Promise.all([
        fetch(`/api/operations/packages/${encodeURIComponent(packageId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }),
        fetch(`/api/composite-booking/ticket-details?placeId=${encodeURIComponent(packageId)}&date=${bookingDate}&specificChargesId=${encodeURIComponent(selectedSpecificChargeId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }),
      ])
      const detailPayload = await detailResponse.json().catch(() => null)
      const ticketPayload = await ticketResponse.json().catch(() => null)
      if (!detailResponse.ok) throw new Error(toText((detailPayload as Record<string, unknown> | null)?.message, 'Unable to fetch package details.'))
      if (!ticketResponse.ok) throw new Error(toText((ticketPayload as Record<string, unknown> | null)?.message, 'Unable to fetch composite ticket details.'))
      setSelectedPackage(getPackageDetail(detailPayload))
      const ticketTypes = Array.isArray((ticketPayload as Record<string, any>)?.result?.ticketTypeDtos) ? (ticketPayload as Record<string, any>).result.ticketTypeDtos as Array<Record<string, unknown>> : []
      const addOnResponses = await Promise.all(ticketTypes.map(ticketType =>
        authFetch(`/booking/addon?ticketTypeId=${encodeURIComponent(toText(ticketType.id))}&date=${bookingDate}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
          .then(async response => response.ok ? await response.json().catch(() => null) : null),
      ))
      setRoundOff(Boolean((ticketPayload as Record<string, any>)?.result?.roundOff))
      setTicketOptions(ticketTypes.map((ticketType, index) => ({
        id: toText(ticketType.id),
        masterTicketTypeName: toText(ticketType.masterTicketTypeName || ticketType.ticketTypeName, 'Ticket'),
        amount: toNumber(ticketType.amount),
        quantity: 0,
        specificCharges: Array.isArray(ticketType.specificCharges) ? ticketType.specificCharges : [],
        addOnList: (Array.isArray((addOnResponses[index] as Record<string, any> | null)?.result) ? (addOnResponses[index] as Record<string, any>).result as Array<Record<string, unknown>> : []).map(addOn => ({
          id: toText(addOn.id),
          name: toText(addOn.name, 'Add-on'),
          amount: toNumber(addOn.totalAmount),
          qty: 0,
          remarkable: Boolean(addOn.remarkable),
          remarkFieldValue: toText(addOn.remarkFieldValue),
          remarkValue: [],
        })),
      })))
    } catch (setupError) {
      setSelectedPackage(null)
      setTicketOptions([])
      setError(setupError instanceof Error ? setupError.message : 'Unable to load composite booking setup.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPackageId && selectedSpecificChargeId) void loadCompositeSetup(selectedPackageId)
  }, [selectedPackageId, selectedSpecificChargeId, bookingDate])

  useEffect(() => {
    if (queryPackageId) setSelectedPackageId(queryPackageId)
  }, [queryPackageId])

  function selectPackage(packageId: string) {
    setSelectedPackageId(packageId)
    router.replace(`/bookings/composite?packageId=${encodeURIComponent(packageId)}`)
  }

  function updateTicketQuantity(ticketId: string, nextValue: number) {
    setTicketOptions(current => current.map(ticket => ticket.id !== ticketId ? ticket : {
      ...ticket,
      quantity: Math.max(0, nextValue),
      addOnList: Math.max(0, nextValue) > 0 ? ticket.addOnList : ticket.addOnList.map(addon => ({ ...addon, qty: 0, remarkValue: [] })),
    }))
  }

  function updateAddonQuantity(ticketId: string, addonId: string, nextValue: number) {
    setTicketOptions(current => current.map(ticket => ticket.id !== ticketId ? ticket : ({
      ...ticket,
      addOnList: ticket.addOnList.map(addon => addon.id !== addonId ? addon : {
        ...addon,
        qty: Math.max(0, nextValue),
        remarkValue: Array.from({ length: Math.max(0, nextValue) }, (_, index) => addon.remarkValue[index] ?? ''),
      }),
    })))
  }

  function updateAddonRemark(ticketId: string, addonId: string, index: number, value: string) {
    setTicketOptions(current => current.map(ticket => ticket.id !== ticketId ? ticket : ({
      ...ticket,
      addOnList: ticket.addOnList.map(addon => {
        if (addon.id !== addonId) return addon
        const nextRemarks = [...addon.remarkValue]
        nextRemarks[index] = value
        return { ...addon, remarkValue: nextRemarks }
      }),
    })))
  }

  const ticketTotal = useMemo(() => ticketOptions.reduce((sum, ticket) => sum + (ticket.quantity * ticket.amount), 0), [ticketOptions])
  const addonTotal = useMemo(() => ticketOptions.reduce((sum, ticket) => sum + ticket.addOnList.reduce((inner, addon) => inner + (addon.qty * addon.amount), 0), 0), [ticketOptions])
  const totalTickets = useMemo(() => ticketOptions.reduce((sum, ticket) => sum + ticket.quantity, 0), [ticketOptions])
  const grandTotal = useMemo(() => getRoundedTotal(ticketTotal + addonTotal, roundOff), [ticketTotal, addonTotal, roundOff])

  async function createCompositeBooking() {
    if (!selectedPackageId) return setError('Select a composite package to continue.')
    if (!/^\d{10}$/.test(mobile)) return setError('Enter a valid 10-digit mobile number.')
    const selectedTickets = ticketOptions.filter(ticket => ticket.quantity > 0 || ticket.addOnList.some(addon => addon.qty > 0))
    if (!selectedTickets.length) return setError('Select at least one ticket or add-on to continue.')

    setSubmitting(true)
    setError('')
    try {
      const createResponse = await fetch(`/api/composite-booking/create-ticket?isDepartmentAdmin=${bookingFlags.isDepartmentAdmin}&onSite=${bookingFlags.onSite}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingDate,
          placeId: selectedPackageId,
          deviceId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          device: 'Web',
          shiftId: '',
          mobileNo: mobile,
          email,
          name: visitorName,
          ticketUserDtoClone: selectedTickets.map(ticket => ({
            ticketTypeId: ticket.id,
            qty: ticket.quantity,
            ...(ticket.specificCharges.length ? { specificChargeId: selectedSpecificChargeId } : {}),
            addOnList: ticket.addOnList.filter(addon => addon.qty > 0).map(addon => ({ addOnId: addon.id, qty: addon.qty, remarkValue: addon.remarkValue.filter(Boolean) })),
          })),
        }),
      })
      const createPayload = await createResponse.json().catch(() => null)
      if (!createResponse.ok) throw new Error(toText((createPayload as Record<string, unknown> | null)?.message, 'Unable to create composite booking.'))
      const bookingId = toText((createPayload as Record<string, any>)?.result?.bookingId)
      const invoiceResponse = bookingId ? await fetch(`/api/composite-booking/invoice?bookingId=${encodeURIComponent(bookingId)}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }) : null
      const invoicePayload = invoiceResponse ? await invoiceResponse.json().catch(() => null) : null
      setInvoice(normalizeCompositeInvoice(invoicePayload, selectedPackage, mobile, email, visitorName, selectedTickets, grandTotal))
      setShowSuccess(true)
      setSuccessMessage('Composite booking created successfully.')
      setTicketOptions(current => current.map(ticket => ({ ...ticket, quantity: 0, addOnList: ticket.addOnList.map(addon => ({ ...addon, qty: 0, remarkValue: [] })) })))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to complete composite booking.')
    } finally {
      setSubmitting(false)
      setPaymentModalOpen(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (user?.isDepartmentAdmin === true && user?.onSiteBooking === true) {
      setPaymentModalOpen(true)
      return
    }
    void createCompositeBooking()
  }

  function reloadBookingSetup() {
    if (selectedPackageId) void loadCompositeSetup(selectedPackageId)
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="overflow-hidden rounded-[30px] text-white" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}>
        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11 }}><Package2 size={13} />Package-based operator booking</div>
            <h1 className="mt-3 font-serif text-3xl font-bold">Composite Booking</h1>
          </div>
          <button onClick={reloadBookingSetup} disabled={!selectedPackageId || loading} className="rounded-2xl px-4 py-3 font-medium text-white disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 13 }}><span className="inline-flex items-center gap-2"><RefreshCw size={14} />Reload</span></button>
        </div>
        <div className="grid gap-px md:grid-cols-5" style={{ background: 'rgba(255,255,255,0.14)' }}>
          {[
            { label: 'Assigned Place', value: extraDetails?.assignedPlaces?.join(', ') || 'Not mapped' },
            // { label: 'Department', value: extraDetails?.departmentName || 'N/A' },
            { label: 'Packages', value: String(filteredPackages.length) },
            { label: 'Selected Package', value: selectedPackage?.packageName || 'Choose package' },
            { label: 'Included Places', value: String(selectedPackage?.placeNames.length ?? 0) },
            { label: 'Booking Mode', value: bookingFlags.onSite ? 'On-site' : 'Department' },
          ].map(item => <div key={item.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{item.label}</div><div className="mt-1 font-semibold" style={{ fontSize: 18, color: '#fff' }}>{item.value}</div></div>)}
        </div>
      </div>

      {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      <div className="grid gap-6">
        <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
          <div className="flex items-center gap-3 mb-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(200,146,42,0.10)', color: '#C8922A' }}><Search size={18} /></div><div><div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Select Package</div></div></div>
          <div className="flex items-center rounded-2xl px-4 py-3 mb-4" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}><Search size={14} style={{ color: 'var(--maroon)', marginRight: 10 }} /><input value={packageSearch} onChange={event => setPackageSearch(event.target.value)} placeholder="Search composite package" className="w-full bg-transparent outline-none" style={{ fontSize: 14 }} /></div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {packagesLoading ? <div className="rounded-2xl border px-4 py-10 text-center" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>Loading packages...</div> : null}
            {!packagesLoading && filteredPackages.length === 0 ? <div className="rounded-2xl border px-4 py-10 text-center" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>No active composite packages found.</div> : null}
            {filteredPackages.map(item => (
              <button key={item.id} type="button" onClick={() => selectPackage(item.id)} className="w-full rounded-[22px] border px-5 py-4 text-left transition" style={{ borderColor: selectedPackageId === item.id ? 'rgba(139,26,26,0.24)' : 'var(--sand)', background: selectedPackageId === item.id ? 'rgba(139,26,26,0.06)' : '#fff' }}>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>{item.packageName}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{item.days} day(s) · {item.placeCount} place(s)</div></div>
                  {selectedPackageId === item.id ? <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--maroon)' }}><CheckCircle2 size={15} color="#fff" /></div> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {!selectedPackageId ? <div className="rounded-[28px] border bg-white px-6 py-16 text-center" style={{ borderColor: 'var(--sand)' }}><div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>Choose a package to begin</div><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>The booking form loads after selecting a composite package.</p></div> : null}
          {selectedPackageId && loading ? <div className="rounded-[28px] border bg-white px-6 py-16 text-center" style={{ borderColor: 'var(--sand)' }}><div className="font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>Loading composite setup...</div><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Fetching package details, ticket types and add-ons.</p></div> : null}

          {selectedPackageId && !loading && selectedPackage ? (
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div className="space-y-6">
                {/* <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div><div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{selectedPackage.packageName}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Valid for {selectedPackage.days} day(s) across {selectedPackage.placeNames.length} place(s)</div></div>
                    <div className="rounded-2xl px-4 py-3" style={{ background: '#FCF7F0', border: '1px solid var(--sand)' }}><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Specific Charge</div><div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{specificCharges.find(item => item.id === selectedSpecificChargeId)?.name || 'N/A'}</div></div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">{selectedPackage.placeNames.map(place => <div key={place} className="rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}><div className="inline-flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}><MapPin size={14} style={{ color: 'var(--maroon)' }} />{place}</div></div>)}</div>
                </section> */}

                <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                  <div className="flex items-center gap-3 mb-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}><User size={18} /></div><div><div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Visitor Details</div></div></div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div><label className="mb-2 block"
                     style={{ fontSize: 11, color: 'var(--text-muted)',
                      fontWeight: 700, textTransform: 'uppercase',
                       letterSpacing: '0.5px' }}>Mobile Number</label>
                       <div className="flex items-center rounded-2xl px-4 py-3" 
                       style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
                        <Phone size={14} style={{ color: 'var(--maroon)', marginRight: 10 }} />
                        <input value={mobile} onChange={event => setMobile(event.target.value.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="Enter mobile number" className="w-full bg-transparent outline-none" style={{ fontSize: 14 }} /></div></div>
                    <div><label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label><div className="flex items-center rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}><Mail size={14} style={{ color: 'var(--maroon)', marginRight: 10 }} /><input value={email} onChange={event => setEmail(event.target.value.trim())} placeholder="Enter email address" className="w-full bg-transparent outline-none" style={{ fontSize: 14 }} /></div></div>
                    <div><label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visitor Name</label><div className="flex items-center rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}><User size={14} style={{ color: 'var(--maroon)', marginRight: 10 }} /><input value={visitorName} onChange={event => setVisitorName(event.target.value)} placeholder="Enter Visitor Name" className="w-full bg-transparent outline-none" style={{ fontSize: 14 }} /></div></div>
                    {/* <div className="md:col-span-2"><label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visitor Name</label><input value={visitorName}
                     onChange={event => setVisitorName(event.target.value)} placeholder="Enter visitor name" className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }} /></div> */}
                  </div>
                </section>

                <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-5"><div><div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Tourist Options</div></div></div>
                  <div className="space-y-4">
                    {ticketOptions.map(ticket => (
                      <div key={ticket.id} className="rounded-[22px] border overflow-hidden" style={{ borderColor: 'var(--sand)' }}>
                        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4" style={{ background: '#FCF7F0' }}>
                          <div><div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>{ticket.masterTicketTypeName}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{formatCurrency(ticket.amount)} per ticket</div></div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => updateTicketQuantity(ticket.id, ticket.quantity - 1)} disabled={ticket.quantity <= 0} className="flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40" style={{ background: '#fff', border: '1px solid var(--sand)' }}><Minus size={14} /></button>
                            <input value={ticket.quantity === 0 ? '' : ticket.quantity} onChange={event => updateTicketQuantity(ticket.id, toNumber(event.target.value))} className="w-20 rounded-xl px-3 py-2 text-center outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 14 }} />
                            <button type="button" onClick={() => updateTicketQuantity(ticket.id, ticket.quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#fff', border: '1px solid var(--sand)' }}><Plus size={14} /></button>
                          </div>
                        </div>
                        {ticket.addOnList.length > 0 ? <div className="px-5 py-4 space-y-4">{ticket.addOnList.map(addon => <div key={addon.id} className="rounded-2xl px-4 py-4" style={{ background: '#fffaf5', border: '1px solid #f0dfc7' }}><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="font-medium" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{addon.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{formatCurrency(addon.amount)} per add-on</div></div><input value={addon.qty === 0 ? '' : addon.qty} onChange={event => updateAddonQuantity(ticket.id, addon.id, toNumber(event.target.value))} className="w-24 rounded-xl px-3 py-2 text-center outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 14 }} /></div>{addon.remarkable && addon.qty > 0 ? <div className="grid gap-3 md:grid-cols-2 mt-4">{Array.from({ length: addon.qty }, (_, index) => <input key={`${addon.id}-${index}`} value={addon.remarkValue[index] ?? ''} onChange={event => updateAddonRemark(ticket.id, addon.id, index, event.target.value)} placeholder={`Enter ${addon.remarkFieldValue || 'remark'} ${index + 1}`} className="rounded-xl px-3 py-2 outline-none" style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13 }} />)}</div> : null}</div>)}</div> : null}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                  <div className="flex items-center gap-3 mb-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}><Ticket size={18} /></div><div><div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Payment Summary</div></div></div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: '#F8F4EE' }}><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Tickets</span><strong style={{ color: 'var(--text-dark)' }}>{totalTickets}</strong></div>
                    {ticketOptions.filter(ticket => ticket.quantity > 0).map(ticket => <div key={`summary-${ticket.id}`} className="flex items-center justify-between" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>{ticket.masterTicketTypeName} x {ticket.quantity}</span><span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{formatCurrency(ticket.quantity * ticket.amount)}</span></div>)}
                    {addonTotal > 0 ? <div className="flex items-center justify-between" style={{ fontSize: 13 }}><span style={{ color: 'var(--text-mid)' }}>Add-on Charges</span><span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{formatCurrency(addonTotal)}</span></div> : null}
                    <div className="h-px my-2" style={{ background: 'var(--sand)' }} />
                    <div className="flex items-center justify-between"><span className="font-semibold" style={{ color: 'var(--text-dark)' }}>Grand Total</span><span className="font-serif font-bold" style={{ fontSize: 28, color: 'var(--maroon)' }}>{formatCurrency(grandTotal)}</span></div>
                  </div>
                  <button type="submit" disabled={submitting || loading} className="mt-6 w-full rounded-2xl px-5 py-3.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 15 }}>{submitting ? 'Booking Composite Ticket...' : 'Book Composite Ticket'}</button>
                </section>
              </aside>
            </form>
          ) : null}
        </div>
      </div>

      {paymentModalOpen ? <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4 sm:p-6" style={{ background: 'rgba(28,16,8,0.48)', backdropFilter: 'blur(6px)' }} onClick={event => { if (event.target === event.currentTarget) setPaymentModalOpen(false) }}><div className="my-auto w-full max-w-lg overflow-hidden rounded-[28px] bg-white" style={{ boxShadow: '0 32px 90px rgba(107,18,18,0.24)' }}><div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}><div><div className="font-serif font-bold text-white" style={{ fontSize: 24 }}>Payment Method</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>Choose the booking mode before continuing.</div></div><button onClick={() => setPaymentModalOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}><X size={16} /></button></div><div className="p-6 space-y-4"><button type="button" onClick={() => setBookingFlags({ isDepartmentAdmin: true, onSite: false })} className="w-full rounded-2xl border px-5 py-4 text-left" style={{ borderColor: bookingFlags.isDepartmentAdmin && !bookingFlags.onSite ? 'rgba(139,26,26,0.24)' : 'var(--sand)', background: bookingFlags.isDepartmentAdmin && !bookingFlags.onSite ? 'rgba(139,26,26,0.06)' : '#fff' }}><div className="inline-flex items-center gap-3"><Wallet size={18} style={{ color: 'var(--maroon)' }} /><div><div className="font-semibold" style={{ color: 'var(--text-dark)' }}>Cash / Department</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Books as department-admin composite flow.</div></div></div></button><button type="button" onClick={() => setBookingFlags({ isDepartmentAdmin: false, onSite: true })} className="w-full rounded-2xl border px-5 py-4 text-left" style={{ borderColor: !bookingFlags.isDepartmentAdmin && bookingFlags.onSite ? 'rgba(139,26,26,0.24)' : 'var(--sand)', background: !bookingFlags.isDepartmentAdmin && bookingFlags.onSite ? 'rgba(139,26,26,0.06)' : '#fff' }}><div className="inline-flex items-center gap-3"><CreditCard size={18} style={{ color: '#1A7A6E' }} /><div><div className="font-semibold" style={{ color: 'var(--text-dark)' }}>E-Mitra Wallet</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Books as on-site operator composite flow.</div></div></div></button></div><div className="flex justify-end gap-3 px-6 py-5" style={{ borderTop: '1px solid var(--sand)', background: '#FCF7F0' }}><button onClick={() => setPaymentModalOpen(false)} className="rounded-2xl px-4 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}>Cancel</button><button onClick={() => void createCompositeBooking()} className="rounded-2xl px-5 py-2.5 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}>Continue</button></div></div></div> : null}

{showSuccess && invoice ? (
  <div
    className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5"
    style={{
      background: 'rgba(28,16,8,0.48)',
      backdropFilter: 'blur(6px)',
    }}
    onClick={event => {
      if (event.target === event.currentTarget) {
        setShowSuccess(false)
      }
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
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5 flex-shrink-0"
        style={{
          background:
            'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)',
        }}
      >
        <div>
          <div
            className="font-serif font-bold text-white"
            style={{ fontSize: 26 }}
          >
            Composite Booking Successful
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.76)',
            }}
          >
            Booking ID {invoice.bookingId}
          </div>
        </div>

        <button
          onClick={() => setShowSuccess(false)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
          style={{ background: 'rgba(255,255,255,0.14)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="grid flex-1 gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[1.3fr_0.7fr]">
        
        {/* LEFT SIDE */}
        <div className="min-h-0 overflow-hidden">
          <div
            className="flex h-full flex-col overflow-hidden rounded-[28px] border p-5"
            style={{
              borderColor: 'var(--sand)',
              background: '#FCF7F0',
            }}
          >
            <div
              className="mb-4 flex-shrink-0 font-serif font-bold"
              style={{
                fontSize: 22,
                color: 'var(--text-dark)',
              }}
            >
              Ticket Preview
            </div>

            <div className="flex flex-1 items-center justify-center overflow-hidden">
              <div
                style={{
                  transform: 'scale(0.72)',
                  transformOrigin: 'center center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CompositeTicketSlipPreview invoice={invoice} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-col gap-4 overflow-auto pr-1">
          
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--sand)',
              background: '#fff',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Grand Total
            </div>

            <div
              className="font-serif font-bold mt-2"
              style={{
                fontSize: 30,
                color: 'var(--maroon)',
              }}
            >
              {formatCurrency(invoice.totalAmount)}
            </div>
          </div>

          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--sand)',
              background: '#FCF7F0',
            }}
          >
            <div
              className="font-semibold mb-2"
              style={{ color: 'var(--text-dark)' }}
            >
              Composite Conditions
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.8,
              }}
            >
              1. Ticket layout and print match the composite operator ticket format.
              <br />
              2. Composite ticket valid for {invoice.validityDays || 0} day(s) only.
              <br />
              3. Verify included places and add-ons before printing.
            </div>
          </div>

          {/* <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: 'var(--sand)',
              background: '#fff',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Included Places
            </div>

            <div className="space-y-2">
              {invoice.placeNames.map(place => (
                <div
                  key={place}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mr-2 mb-2"
                  style={{
                    background: '#F8F4EE',
                    color: 'var(--text-dark)',
                    fontSize: 12,
                  }}
                >
                  <Building2
                    size={13}
                    style={{ color: 'var(--maroon)' }}
                  />

                  {place}
                </div>
              ))}
            </div>
          </div> */}

          <button
            onClick={() => printCompositeInvoice(invoice)}
            className="w-full rounded-2xl px-4 py-3 font-semibold text-white flex-shrink-0"
            style={{
              background:
                'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)',
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Printer size={15} />
              Print Ticket
            </span>
          </button>

          <button
            onClick={() => {
              setShowSuccess(false)
              reloadBookingSetup()
            }}
            className="w-full rounded-2xl px-4 py-3 font-medium flex-shrink-0"
            style={{
              background: '#fff',
              border: '1px solid var(--sand)',
              color: 'var(--text-mid)',
            }}
          >
            Continue Booking
          </button>
        </div>
      </div>
    </div>
  </div>
) : null}    </div>
  )
}
