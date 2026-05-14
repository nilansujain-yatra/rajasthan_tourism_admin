'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Download, FileText, Paperclip, Printer, XCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AuthUser } from '@/lib/auth/jwt'
import { DetailGrid, ModalShell, canUseJkkWorkflowAction, formatDate, formatDateTime, formatMoney, getAny, getPrimaryUserRole, maskSensitiveValue, toText, type JkkUser, type RecordRow } from './shared'

function userLabel(user: JkkUser) {
  const fullName = [toText(user.firstName), toText(user.lastName)].filter(Boolean).join(' ')
  return toText(user.displayName ?? user.fullName ?? fullName ?? user.userName ?? user.name ?? user.ssoId ?? user.ssoid, 'Unnamed User')
}

function userId(user: JkkUser) {
  return toText(user.id ?? user.userId)
}

function roleLabel(role: string) {
  if (!role) return 'Unknown'
  return role.replace(/^JKK_/, '').replace(/_/g, ' ')
}

type AttachmentItem = {
  label: string
  url: string
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|heic|heif|ico|raw|cr2|nef|orf|arw|psd)$/i.test(url)
}

function extractAttachments(row: RecordRow) {
  const attachments: AttachmentItem[] = []
  const societyUrl = toText(row.societyRegisteredDocUrl)

  if (societyUrl) {
    attachments.push({ label: 'Society Registration', url: societyUrl })
  }

  const detailSections = [
    { key: 'detailsOfProgram', label: 'Program Details' },
    { key: 'guestDetails', label: 'Guest Details' },
    { key: 'organizationDetails', label: 'Organization Details' },
    { key: 'previousDetails', label: 'Previous Details' },
  ]

  detailSections.forEach(section => {
    const items = Array.isArray(row[section.key]) ? row[section.key] as RecordRow[] : []
    const first = items[0] ?? {}
    const imageList = Array.isArray(first.imageList) ? first.imageList as RecordRow[] : []

    imageList.forEach((item, index) => {
      const url = toText(getAny(item, ['imageUrl', 'url', 'fileUrl']))
      if (url) {
        attachments.push({ label: `${section.label} ${index + 1}`, url })
      }
    })
  })

  return attachments
}

function renderAttachmentPreview(url: string) {
  if (isImageUrl(url)) {
    return <img src={url} alt="attachment" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--sand)' }} />
  }

  return (
    <div className="flex items-center justify-center rounded-lg border" style={{ width: 56, height: 56, borderColor: 'var(--sand)', color: 'var(--maroon)' }}>
      <FileText size={20} />
    </div>
  )
}

function buildQrImageUrl(value: string) {
  const normalized = value.trim()
  if (!normalized) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(normalized)}`
}

function bookingStatusValue(row: RecordRow) {
  return getAny(row, ['approved', 'adminStatus', 'approvedStatus', 'status'])
}

function formatStatusLabel(value: unknown, fallback = 'N/A') {
  const text = toText(value)
  if (!text) return fallback
  if (text.toUpperCase() === 'REJECT') return 'REJECTED'
  return text.replace(/_/g, ' ')
}

function statusBadgeTone(value: unknown) {
  const normalized = toText(value).toUpperCase()

  if (normalized === 'REJECT' || normalized === 'REJECTED' || normalized === 'REFUND_FAILED' || normalized === 'REFUND_REJECTED') {
    return { background: 'rgba(180, 35, 24, 0.14)', color: '#B42318' }
  }

  if (normalized === 'IN_PROGRESS' || normalized === 'PENDING' || normalized === 'REFUND_INITIATED' || normalized === 'REFUND_PROCESSING') {
    return { background: 'rgba(200, 146, 42, 0.18)', color: '#7A5900' }
  }

  if (normalized === 'SUCCESS' || normalized === 'APPROVED' || normalized === 'REFUND_SUCCESS') {
    return { background: 'rgba(26, 122, 110, 0.14)', color: '#1A7A6E' }
  }

  return { background: 'rgba(15, 23, 42, 0.08)', color: 'var(--text-dark)' }
}

function audienceLabel(row: RecordRow) {
  if (row.audienceEntryByInvitation) return 'By Invitation'
  if (row.audienceEntryByTicket) return 'By Ticket'
  return 'N/A'
}

function reservationLabel(row: RecordRow) {
  return `${formatDate(row.bookingStartDate)} - ${formatDate(row.bookingEndDate)}`
}

function durationLabel(row: RecordRow) {
  const start = Number(row.bookingStartDate)
  const end = Number(row.bookingEndDate)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'N/A'
  const dayCount = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
  const shift = toText(row.shiftName)
  return `${dayCount} Day(s)${shift ? ` - ${shift}` : ''}`
}

function preparationLabel(row: RecordRow) {
  const preDays = Number(row.preDays)
  if (!Number.isFinite(preDays) || preDays <= 0) return '0 Day(s)'

  const bookingStart = Number(row.bookingStartDate)
  if (!Number.isFinite(bookingStart) || bookingStart <= 0) return `${preDays} Day(s)`

  const oneDayMs = 1000 * 60 * 60 * 24
  const prepStart = bookingStart - (preDays * oneDayMs)
  const prepEnd = bookingStart - oneDayMs

  if (preDays === 1) {
    return `${preDays} Day(s) (${formatDate(prepStart)})`
  }

  return `${preDays} Day(s) (${formatDate(prepStart)} to ${formatDate(prepEnd)})`
}

function ticketHeadLabel(ticket: RecordRow, index: number) {
  const label = toText(getAny(ticket, ['name', 'headName', 'label']), `Head ${index + 1}`)
  const normalized = label.toLowerCase()
  if (normalized === 'with ac') return 'Electricity Charges/ With Ac'
  if (label === 'Security Charge') return 'Security Charge (Refundable)'
  return label
}

function downloadAttachment(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.download = ''
  link.click()
}

function downloadJkkFormPdf(row: RecordRow, bankDetails?: RecordRow | null, maskBankFields = false) {
  const doc = new jsPDF()
  const bookingId = toText(row.bookingId, 'Booking')
  const ticketHeads = Array.isArray(row.ticketHeads) ? row.ticketHeads as RecordRow[] : []
  const status = formatStatusLabel(bookingStatusValue(row))
  const regDate = formatDateTime(getAny(row, ['createdDate', 'bookingDate']))

  // Title
  doc.setFontSize(18)
  doc.setTextColor(190, 24, 93) // var(--maroon)
  doc.text('JKK Booking Form', 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('Jawahar Kala Kendra application details', 14, 26)

  // Header Info
  autoTable(doc, {
    startY: 32,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      ['Registration Date:', regDate, 'Booking ID:', bookingId, 'Status:', status],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 100, 100] },
      2: { fontStyle: 'bold', textColor: [100, 100, 100] },
      4: { fontStyle: 'bold', textColor: [100, 100, 100] },
    },
  })

  // Organiser Details
  doc.setFontSize(12)
  doc.setTextColor(30, 58, 138) // blue-900
  doc.text('Organiser Details', 14, (doc as any).lastAutoTable.finalY + 12)
  
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold' },
    body: [
      ['Full Name', toText(row.applicantName, 'N/A')],
      ['Mobile Number', toText(row.mobileNo, 'N/A')],
      ['Email Address', toText(row.email, 'N/A')],
      ['Address', toText(row.address, 'N/A')],
      ['GST Number', toText(row.gstNo, 'N/A')],
    ],
  })

  // Event Details
  doc.setFontSize(12)
  doc.setTextColor(131, 24, 67) // pink-900
  doc.text('Event Details', 14, (doc as any).lastAutoTable.finalY + 12)

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [255, 241, 242], textColor: [131, 24, 67], fontStyle: 'bold' },
    body: [
      ['Applied For', `${toText(row.typeName, 'N/A')} - ${toText(row.subCategoryName, 'N/A')}`],
      ['Category', toText(row.category, 'N/A')],
      ['Projector Required', row.projector ? 'Yes' : 'No'],
      ['Audience Entry', audienceLabel(row)],
      ['Reservation For', reservationLabel(row)],
      ['Duration', durationLabel(row)],
      ['Preparation Days', preparationLabel(row)],
    ],
  })

  // Payment Details
  doc.setFontSize(12)
  doc.setTextColor(131, 24, 67) // pink-900
  doc.text('Payment Details', 14, (doc as any).lastAutoTable.finalY + 12)

  const paymentRows = ticketHeads.map((item, index) => [ticketHeadLabel(item, index), formatMoney(getAny(item, ['amount', 'value']))])
  paymentRows.push([{ content: 'Total Amount', styles: { fontStyle: 'bold' } }, { content: formatMoney(row.totalAmount), styles: { fontStyle: 'bold' } }])

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [255, 241, 242], textColor: [131, 24, 67], fontStyle: 'bold' },
    body: paymentRows,
  })

  // Transaction Details
  if (toText(row.transactionId)) {
    doc.setFontSize(12)
    doc.setTextColor(131, 24, 67)
    doc.text('Transaction Details', 14, (doc as any).lastAutoTable.finalY + 12)

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      body: [
        ['Transaction ID', toText(row.transactionId, 'N/A')],
        ['Transaction Date', formatDateTime(row.transactionDate)],
        ['Emitra Transaction ID', toText(row.emitraTransactionId, 'N/A')],
      ],
    })
  }

  // Bank Details
  if (bankDetails) {
    doc.addPage()
    doc.setFontSize(12)
    doc.setTextColor(30, 58, 138)
    doc.text('Bank & Refund Details', 14, 20)

    autoTable(doc, {
      startY: 26,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      body: [
        ['Bank Name', toText(bankDetails.bankName, 'N/A')],
        ['Account Type', toText(bankDetails.accountType, 'N/A')],
        ['Account Holder Name', maskBankFields ? maskSensitiveValue(bankDetails.accountHolderName) : toText(bankDetails.accountHolderName, 'N/A')],
        ['Account Number', maskBankFields ? maskSensitiveValue(bankDetails.accountNumber) : toText(bankDetails.accountNumber, 'N/A')],
        ['IFSC', maskBankFields ? maskSensitiveValue(bankDetails.bankIfsc) : toText(bankDetails.bankIfsc, 'N/A')],
        ['Refund Status', formatStatusLabel(bankDetails.status)],
        ['Refundable Amount', formatMoney(bankDetails.refundAmount)],
      ],
    })
  }

  doc.save(`jkk_form_${bookingId}.pdf`)
}

async function downloadJkkAttachmentsPdf(attachments: AttachmentItem[], bookingId: string) {
  const doc = new jsPDF()
  
  doc.setFontSize(18)
  doc.setTextColor(190, 24, 93)
  doc.text('JKK Booking Attachments', 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Booking ID: ${bookingId}`, 14, 26)

  let y = 40
  for (const item of attachments) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(item.label, 14, y)
    
    doc.setFontSize(10)
    doc.setTextColor(30, 58, 138)
    doc.textWithLink('View Document', 14, y + 6, { url: item.url })
    
    y += 20
  }

  doc.save(`jkk_attachments_${bookingId}.pdf`)
}

function ProgramDetailsCard({
  row,
  showBankDetails = false,
  bankDetails = null,
  maskBankFields = false,
}: {
  row: RecordRow
  showBankDetails?: boolean
  bankDetails?: RecordRow | null
  maskBankFields?: boolean
}) {
  const programDetails = Array.isArray(row.detailsOfProgram) ? row.detailsOfProgram[0] as RecordRow : null
  const guestDetails = Array.isArray(row.guestDetails) ? row.guestDetails[0] as RecordRow : null
  const organizationDetails = Array.isArray(row.organizationDetails) ? row.organizationDetails[0] as RecordRow : null
  const previousDetails = Array.isArray(row.previousDetails) ? row.previousDetails[0] as RecordRow : null
  const ticketHeads = Array.isArray(row.ticketHeads) ? row.ticketHeads as RecordRow[] : []
  const attachments = extractAttachments(row)
  const qrImageUrl = buildQrImageUrl(toText(row.bookingId))
  const status = bookingStatusValue(row)
  const bookingTone = statusBadgeTone(status)
  const paymentTone = statusBadgeTone(row.paymentStatus)

  function renderTextSection(title: string, value: unknown, imageSource?: RecordRow | null) {
    const text = toText(value)
    const imageList = Array.isArray(imageSource?.imageList) ? imageSource?.imageList as RecordRow[] : []
    if (!text && imageList.length === 0) return null

    return (
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>{title}</div>
        {text ? <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>{text}</div> : null}
        {imageList.length ? (
          <div className="mt-3 flex flex-wrap gap-3">
            {imageList.map((item, index) => {
              const url = toText(getAny(item, ['imageUrl', 'url', 'fileUrl']))
              if (!url) return null
              return (
                <a key={`${title}-${index}`} href={url} target="_blank" rel="noreferrer">
                  {renderAttachmentPreview(url)}
                </a>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  function renderValueCard(label: string, value: ReactNode) {
    return (
      <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(15, 23, 42, 0.08)', background: '#fff' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div className="mt-2" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-dark)', wordBreak: 'break-word' }}>{value}</div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
        <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #be185d, #e11d48)' }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-serif text-xl font-bold">JKK Booking Form</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Jawahar Kala Kendra application details</div>
            </div>
            <div className="rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.08)' }}>
              Rajasthan Tourism
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-l-4 px-5 py-4 md:grid-cols-3" style={{ background: '#fff1f6', borderLeftColor: 'var(--maroon)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reg Date</div>
            <div className="mt-2 text-sm font-semibold">{formatDateTime(getAny(row, ['createdDate', 'bookingDate']))}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Booking ID</div>
            <div className="mt-2 text-sm font-semibold">{toText(row.bookingId, 'N/A')}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Booking Status</div>
            <div className="mt-2">
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: bookingTone.background, color: bookingTone.color }}>
                {formatStatusLabel(status)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[2fr_1fr]">
          <div className="border-l-4 px-5 py-5" style={{ background: '#eff6ff', borderLeftColor: '#1d4ed8' }}>
            <div className="mb-5 border-b-2 pb-2 text-lg font-semibold" style={{ color: '#1e3a8a', borderColor: 'rgba(30, 58, 138, 0.12)' }}>
              Organiser Details
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {renderValueCard('Full Name', toText(row.applicantName, 'N/A'))}
              {renderValueCard('Mobile Number', toText(row.mobileNo, 'N/A'))}
              {renderValueCard('Email Address', toText(row.email, 'N/A'))}
              {renderValueCard('Address', toText(row.address, 'N/A'))}
              {toText(row.gstNo) ? renderValueCard('GST Number', toText(row.gstNo, 'N/A')) : null}
              {renderValueCard(
                'Society Registered',
                toText(row.societyRegisteredDocUrl)
                  ? <a href={toText(row.societyRegisteredDocUrl)} target="_blank" rel="noreferrer" style={{ color: 'var(--maroon)', fontWeight: 600 }}>View</a>
                  : 'N/A',
              )}
            </div>
          </div>

          <div className="border-l-4 px-5 py-5" style={{ background: '#eff6ff', borderLeftColor: '#cbd5e1' }}>
            <div className="mb-5 border-b-2 pb-2 text-lg font-semibold" style={{ color: '#1e3a8a', borderColor: 'rgba(30, 58, 138, 0.12)' }}>
              Booking
            </div>
            <div className="rounded-2xl border p-4 text-center" style={{ borderColor: '#dbeafe', background: '#fff' }}>
              {qrImageUrl ? <img src={qrImageUrl} alt="QR code" className="mx-auto h-[140px] w-[140px]" /> : null}
              <div className="mt-3 text-sm font-semibold">{toText(row.bookingId, 'N/A')}</div>
            </div>
          </div>
        </div>

        <div className="border-l-4 px-5 py-5" style={{ background: '#fff1f2', borderLeftColor: '#be185d' }}>
          <div className="mb-5 border-b-2 pb-2 text-lg font-semibold" style={{ color: '#831843', borderColor: 'rgba(131, 24, 67, 0.12)' }}>
            Event Details
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {renderValueCard('Applied For', `${toText(row.typeName, 'N/A')} - ${toText(row.subCategoryName, 'N/A')}`)}
            {renderValueCard('Category', toText(row.category, 'N/A'))}
            {renderValueCard('Projector Required', row.projector ? 'Yes' : 'No')}
            {renderValueCard('Audience Entry', audienceLabel(row))}
            {renderValueCard('Reservation For', reservationLabel(row))}
            {renderValueCard('Duration', durationLabel(row))}
            {renderValueCard('Preparation Days', preparationLabel(row))}
          </div>
        </div>

        <div className="border-l-4 px-5 py-5" style={{ background: '#eff6ff', borderLeftColor: '#1d4ed8' }}>
          <div className="mb-5 border-b-2 pb-2 text-lg font-semibold" style={{ color: '#1e3a8a', borderColor: 'rgba(30, 58, 138, 0.12)' }}>
            More Details & Attachments
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {renderTextSection('Program Details', programDetails?.description, programDetails)}
            {renderTextSection('Guest Details', guestDetails?.description, guestDetails)}
            {renderTextSection('Organization Details', organizationDetails?.description, organizationDetails)}
            {renderTextSection('Previous Details', previousDetails?.description, previousDetails)}
          </div>
        </div>

        <div className={`grid ${toText(row.transactionId) ? 'md:grid-cols-[2fr_1fr]' : ''}`}>
          <div className="border-l-4 px-5 py-5" style={{ background: '#fff1f2', borderLeftColor: '#be185d' }}>
            <div className="mb-5 flex items-center justify-between gap-3 border-b-2 pb-2" style={{ borderColor: 'rgba(131, 24, 67, 0.12)' }}>
              <div className="text-lg font-semibold" style={{ color: '#831843' }}>Payment Details</div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: paymentTone.background, color: paymentTone.color }}>
                {formatStatusLabel(toText(row.paymentStatus, 'Pending'))}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {ticketHeads.map((ticket, index) => (
                <div key={`ticket-${index}`}>
                  {renderValueCard(ticketHeadLabel(ticket, index), formatMoney(getAny(ticket, ['amount', 'value'])))}
                </div>
              ))}
              {renderValueCard('Total Amount', formatMoney(row.totalAmount))}
            </div>
            <div className="mt-4 text-sm" style={{ color: 'var(--text-mid)' }}>GST is not applicable on the Security Charges.</div>
          </div>

          {toText(row.transactionId) ? (
            <div className="border-l-4 px-5 py-5" style={{ background: '#fff1f2', borderLeftColor: '#e5e7eb' }}>
              <div className="mb-5 border-b-2 pb-2 text-lg font-semibold" style={{ color: '#831843', borderColor: 'rgba(131, 24, 67, 0.12)' }}>
                Transaction Details
              </div>
              <div className="grid gap-4">
                {renderValueCard('Transaction ID', toText(row.transactionId, 'N/A'))}
                {renderValueCard('Transaction Date & Time', formatDateTime(row.transactionDate))}
                {toText(row.emitraTransactionId) ? renderValueCard('Emitra Transaction ID', toText(row.emitraTransactionId, 'N/A')) : null}
              </div>
            </div>
          ) : null}
        </div>

        {showBankDetails && bankDetails ? (
          <div className="grid md:grid-cols-[2fr_1fr]">
            <div className="border-l-4 px-5 py-5" style={{ background: '#eff6ff', borderLeftColor: '#1d4ed8' }}>
              <div className="mb-5 border-b-2 pb-2 text-lg font-semibold" style={{ color: '#1e3a8a', borderColor: 'rgba(30, 58, 138, 0.12)' }}>
                Bank Details
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {renderValueCard('Bank Name', toText(bankDetails.bankName, 'N/A'))}
                {renderValueCard('Account Type', toText(bankDetails.accountType, 'N/A'))}
                {renderValueCard('Account Holder Name', maskBankFields ? maskSensitiveValue(bankDetails.accountHolderName) : toText(bankDetails.accountHolderName, 'N/A'))}
                {renderValueCard('Account Number', maskBankFields ? maskSensitiveValue(bankDetails.accountNumber) : toText(bankDetails.accountNumber, 'N/A'))}
                {renderValueCard('IFSC', maskBankFields ? maskSensitiveValue(bankDetails.bankIfsc) : toText(bankDetails.bankIfsc, 'N/A'))}
                {renderValueCard('Remark', toText(bankDetails.remark, 'N/A'))}
                {renderValueCard('Refundable Amount', formatMoney(bankDetails.refundAmount))}
              </div>
            </div>

            <div className="border-l-4 px-5 py-5" style={{ background: '#eff6ff', borderLeftColor: '#cbd5e1' }}>
              <div className="mb-5 border-b-2 pb-2 text-lg font-semibold" style={{ color: '#1e3a8a', borderColor: 'rgba(30, 58, 138, 0.12)' }}>
                Refund Details
              </div>
              <div className="grid gap-4">
                {renderValueCard('Refund Status', formatStatusLabel(bankDetails.status))}
                {renderValueCard('Reference ID', toText(bankDetails.refId, 'N/A'))}
                {renderValueCard('Payment Mode', toText(bankDetails.paymentMode, 'N/A'))}
                {renderValueCard('Refund Date', formatDateTime(bankDetails.refundDate))}
              </div>
            </div>
          </div>
        ) : null}

        {attachments.length ? (
          <div className="px-5 pb-5">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <div className="mb-4 flex items-center gap-2 font-semibold" style={{ color: 'var(--maroon)' }}>
                <Paperclip size={16} />
                Attachments
              </div>
              <div className="flex flex-wrap gap-3">
                {attachments.map(item => (
                  <button
                    key={`${item.label}-${item.url}`}
                    type="button"
                    onClick={() => downloadAttachment(item.url)}
                    className="rounded-xl border p-3 text-left"
                    style={{ borderColor: 'var(--sand)', minWidth: 160, color: 'var(--text-dark)' }}
                  >
                    <div className="flex items-center gap-3">
                      {renderAttachmentPreview(item.url)}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isImageUrl(item.url) ? 'Image' : 'Document'}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-5 py-6 text-center" style={{ background: '#f8fafc' }}>
          <button onClick={() => downloadJkkFormPdf(row, bankDetails, maskBankFields)} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-white" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)', fontSize: 13 }}>
            <Printer size={16} />
            Download Form
          </button>
          <button
            onClick={() => downloadJkkAttachmentsPdf(attachments, toText(row.bookingId))}
            className="ml-3 inline-flex items-center gap-2 rounded-full border px-6 py-3"
            style={{ borderColor: 'var(--maroon)', fontSize: 13, color: 'var(--maroon)', background: '#fff' }}
          >
            <Download size={16} />
            Download Attachment
          </button>
        </div>

        <div className="px-5 py-5 text-center text-white" style={{ background: 'linear-gradient(135deg, #be185d, #f43f5e)' }}>
          <div style={{ fontSize: 14 }}>For any queries, please contact</div>
          <div className="mt-2 text-sm">Phone: 01412820384 | Email: helpdesk[dot]tourist[at]rajasthan[dot]gov[dot]in</div>
        </div>
      </div>
    </div>
  )
}

function nextAssignmentTarget(row: RecordRow) {
  const adminStatus = toText(getAny(row, ['adminStatus', 'approvedStatus', 'status'])).toUpperCase()

  if (adminStatus === 'ASSIGNER') {
    return { endpoint: '/api/jkk/actions/assign-reviewer', role: 'JKK_REVIEWER', label: 'Pass To Reviewer' }
  }

  if (adminStatus === 'REVIEWER') {
    return { endpoint: '/api/jkk/actions/assign-moderator', role: 'JKK_MODERATOR', label: 'Pass To Moderator' }
  }

  if (adminStatus === 'MODERATOR') {
    return { endpoint: '/api/jkk/actions/assign-approver', role: 'JKK_APPROVER', label: 'Pass To Approver' }
  }

  return null
}

function canApprove(user: AuthUser | null) {
  return getPrimaryUserRole(user) === 'JKK_APPROVER'
}

export function JkkBookingDetailModal({
  row,
  open,
  onClose,
  bankDetails = null,
  showBankDetails = false,
  maskBankFields = false,
}: {
  row: RecordRow | null
  open: boolean
  onClose: () => void
  bankDetails?: RecordRow | null
  showBankDetails?: boolean
  maskBankFields?: boolean
}) {
  if (!row) return null

  return (
    <ModalShell open={open} title="JKK Booking Details" subtitle={toText(row.bookingId, 'Booking')} onClose={onClose}>
      <div className="px-6 py-5" style={{ background: 'var(--cream)' }}>
        <ProgramDetailsCard row={row} showBankDetails={showBankDetails} bankDetails={bankDetails} maskBankFields={maskBankFields} />
      </div>
    </ModalShell>
  )
}

export function JkkTrailModal({
  row,
  open,
  onClose,
}: {
  row: RecordRow | null
  open: boolean
  onClose: () => void
}) {
  if (!row) return null

  const stages = [
    { key: 'Assigner', by: toText(row.assignedBy, 'N/A'), remark: toText(row.assignedRemark, 'N/A'), date: formatDateTime(row.assignedDate), file: toText(row.assignerFile) },
    { key: 'Reviewer', by: toText(row.reviewerBy, 'N/A'), remark: toText(row.reviewerRemark, 'N/A'), date: formatDateTime(row.reviewerDate), file: toText(row.reviewerFile) },
    { key: 'Moderator', by: toText(row.moderatorBy, 'N/A'), remark: toText(row.moderatorRemark, 'N/A'), date: formatDateTime(row.moderatorDate), file: toText(row.moderatorFile) },
    { key: 'Approver', by: toText(row.approvedBy ?? row.approverBy, 'N/A'), remark: toText(row.approvedRemark ?? row.approverRemark, 'N/A'), date: formatDateTime(row.approvedDate ?? row.approverDate), file: '' },
  ]

  return (
    <ModalShell open={open} title="Approval Trail" subtitle={toText(row.bookingId, 'Booking')} onClose={onClose}>
      <div className="space-y-4 px-6 py-5" style={{ background: 'var(--cream)' }}>
        {stages.map(stage => (
          <div key={stage.key} className="rounded-xl border px-4 py-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold" style={{ color: 'var(--maroon)' }}>{stage.key}</div>
              {stage.by !== 'N/A' || stage.remark !== 'N/A' || stage.date !== 'N/A'
                ? <CheckCircle2 size={16} color="#1A7A6E" />
                : <XCircle size={16} color="#B42318" />}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>By</div>
                <div style={{ fontSize: 13 }}>{stage.by}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Remark</div>
                <div style={{ fontSize: 13 }}>{stage.remark}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date</div>
                <div style={{ fontSize: 13 }}>{stage.date}</div>
              </div>
            </div>
            {stage.file ? (
              <a href={stage.file} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--sand)', fontSize: 12, color: 'var(--text-dark)' }}>
                <FileText size={14} />
                View Document
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

export function JkkActionModal({
  row,
  open,
  user,
  users,
  onClose,
  onSuccess,
}: {
  row: RecordRow | null
  open: boolean
  user: AuthUser | null
  users: JkkUser[]
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const [assigneeId, setAssigneeId] = useState('')
  const [remark, setRemark] = useState('')
  const [approvalStatus, setApprovalStatus] = useState('APPROVED')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const target = row ? nextAssignmentTarget(row) : null
  const workflowAllowed = canUseJkkWorkflowAction(user, row)
  const approvalMode = workflowAllowed && row ? canApprove(user) : false
  const approvalAllowed = approvalMode && toText(row?.paymentStatus).toUpperCase() === 'SUCCESS'

  const targetUsers = useMemo(
    () => (target ? users.filter(item => {
      const userRole = toText(item.userType ?? item.role).toUpperCase()
      return userRole === target.role || userRole.includes(target.role.replace('JKK_', ''))
    }) : []),
    [target, users],
  )

  if (!row) return null
  const activeRow = row

  async function submit() {
    setLoading(true)
    setError('')

    try {
      if (!workflowAllowed) {
        throw new Error('No workflow action is available for your role on this booking.')
      }

      if (approvalAllowed) {
        const response = await fetch('/api/jkk/actions/approve-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: toText(activeRow.id ?? activeRow.bookingId),
            status: approvalStatus,
            remark,
          }),
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.message ?? `Request failed with ${response.status}`)
        onSuccess(`Booking ${approvalStatus === 'APPROVED' ? 'approved' : 'rejected'} successfully.`)
        onClose()
        return
      }

      if (!target) {
        throw new Error('No assignment action available for this booking.')
      }

      if (!assigneeId) {
        throw new Error('Select a user before continuing.')
      }

      const response = await fetch(target.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: toText(activeRow.id ?? activeRow.bookingId),
          status: toText(getAny(activeRow, ['adminStatus', 'approvedStatus', 'status'])),
          remark,
          fileUrl: '',
          reviewerId: assigneeId,
          moderatorId: assigneeId,
          approverId: assigneeId,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message ?? `Request failed with ${response.status}`)
      onSuccess(`${target.label} completed successfully.`)
      onClose()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to complete action.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell open={open} title="JKK Booking Action" subtitle={toText(row.bookingId, 'Booking')} onClose={onClose}>
      <div className="space-y-5 px-6 py-5" style={{ background: 'var(--cream)' }}>
        <DetailGrid
          entries={[
            { label: 'Booking ID', value: toText(row.bookingId, 'N/A') },
            { label: 'Applicant', value: toText(row.applicantName, 'N/A') },
            { label: 'Approval Stage', value: toText(getAny(row, ['adminStatus', 'approved']), 'N/A') },
            { label: 'Payment Status', value: toText(row.paymentStatus, 'N/A') },
          ]}
        />

        {approvalAllowed ? (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Approval Decision</label>
            <div className="mt-3 flex gap-3">
              {['APPROVED', 'REJECT'].map(option => (
                <button
                  key={option}
                  onClick={() => setApprovalStatus(option)}
                  className="rounded-xl px-4 py-2"
                  style={{
                    fontSize: 12,
                    background: approvalStatus === option ? 'var(--maroon)' : '#fff',
                    color: approvalStatus === option ? '#fff' : 'var(--text-dark)',
                    border: `1px solid ${approvalStatus === option ? 'var(--maroon)' : 'var(--sand)'}`,
                  }}
                >
                  {option === 'APPROVED' ? 'Approve' : 'Reject'}
                </button>
              ))}
            </div>
          </div>
        ) : workflowAllowed && target ? (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{target.label}</label>
            <select
              value={assigneeId}
              onChange={event => setAssigneeId(event.target.value)}
              className="mt-3 w-full rounded-xl px-4 py-3 outline-none"
              style={{ fontSize: 12, border: '1px solid var(--sand)' }}
            >
              <option value="">Select User</option>
              {targetUsers.map(item => (
                <option key={userId(item)} value={userId(item)}>
                  {userLabel(item)} ({roleLabel(toText(item.userType ?? item.role))})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff', color: 'var(--text-muted)', fontSize: 12 }}>
            {!workflowAllowed
              ? 'Your role does not have any pending workflow action on this booking.'
              : approvalMode
                ? 'Payment is still pending, so the approver action is not available yet.'
                : 'No workflow action is available for this booking in the current stage.'}
          </div>
        )}

        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Remark</label>
          <textarea
            value={remark}
            onChange={event => setRemark(event.target.value)}
            rows={4}
            className="mt-3 w-full rounded-xl px-4 py-3 outline-none"
            style={{ fontSize: 12, border: '1px solid var(--sand)', resize: 'vertical' }}
            placeholder="Enter remark"
          />
        </div>

        {error ? <div style={{ fontSize: 12, color: '#B42318' }}>{error}</div> : null}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border px-4 py-2" style={{ borderColor: 'var(--sand)', fontSize: 12, color: 'var(--text-mid)' }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !workflowAllowed || (!approvalAllowed && !!target && !assigneeId)}
            className="rounded-xl px-4 py-2 text-white disabled:opacity-50"
            style={{ fontSize: 12, background: 'var(--maroon)' }}
          >
            {loading ? 'Submitting...' : approvalAllowed ? 'Submit Decision' : 'Submit Action'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
