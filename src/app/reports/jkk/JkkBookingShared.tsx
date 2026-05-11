'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Download, FileText, Paperclip, Printer, XCircle } from 'lucide-react'
import type { AuthUser } from '@/lib/auth/jwt'
import { DetailGrid, ModalShell, canUseJkkWorkflowAction, formatDate, formatDateTime, formatMoney, getAny, getPrimaryUserRole, toText, type JkkUser, type RecordRow } from './shared'

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

function openPrintWindow(row: RecordRow) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900')
  if (!win) return

  const sections = [
    ['Applicant', toText(row.applicantName, 'N/A')],
    ['Mobile', toText(row.mobileNo, 'N/A')],
    ['Email', toText(row.email, 'N/A')],
    ['Address', toText(row.address, 'N/A')],
    ['GST', toText(row.gstNo, 'N/A')],
    ['Applied For', `${toText(row.typeName, 'N/A')} - ${toText(row.subCategoryName, 'N/A')}`],
    ['Category', toText(row.category, 'N/A')],
    ['Projector Required', row.projector ? 'Yes' : 'No'],
    ['Audience Entry', row.audienceEntryByInvitation ? 'By Invitation' : row.audienceEntryByTicket ? 'By Ticket' : 'N/A'],
    ['Reservation For', `${formatDate(row.bookingStartDate)} - ${formatDate(row.bookingEndDate)}`],
    ['Shift', toText(row.shiftName, 'N/A')],
    ['Status', toText(row.approved ?? row.adminStatus, 'N/A')],
    ['Payment Status', toText(row.paymentStatus, 'N/A')],
    ['Transaction ID', toText(row.transactionId, 'N/A')],
    ['Amount', formatMoney(row.totalAmount)],
  ]

  const ticketHeads = Array.isArray(row.ticketHeads) ? row.ticketHeads as RecordRow[] : []
  const attachmentLinks = extractAttachments(row)

  win.document.write(`<!doctype html>
  <html>
    <head>
      <title>JKK Booking ${toText(row.bookingId, 'Form')}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
        h1, h2 { margin: 0 0 12px; }
        .top { background: #fff1f2; border-left: 4px solid #be185d; padding: 16px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
        .card { border: 1px solid #e7d7bf; border-radius: 12px; padding: 12px; }
        .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .value { margin-top: 6px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #fdf2f8; }
        a { color: #9f1239; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="top">
        <h1>JKK Booking Form</h1>
        <div>Booking ID: ${toText(row.bookingId, 'N/A')}</div>
        <div>Registration Date: ${formatDateTime(getAny(row, ['createdDate', 'bookingDate']))}</div>
      </div>
      <div class="grid">
        ${sections.map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join('')}
      </div>
      <h2>Ticket Heads</h2>
      <table>
        <thead><tr><th>Head</th><th>Amount</th></tr></thead>
        <tbody>
          ${ticketHeads.length ? ticketHeads.map(item => `<tr><td>${toText(getAny(item, ['name', 'headName', 'label']), 'N/A')}</td><td>${formatMoney(getAny(item, ['amount', 'value']))}</td></tr>`).join('') : '<tr><td colspan="2">No ticket head details available.</td></tr>'}
        </tbody>
      </table>
      <h2 style="margin-top:20px;">Attachments</h2>
      <div>
        ${attachmentLinks.length ? attachmentLinks.map(item => `<div><a href="${item.url}" target="_blank" rel="noreferrer">${item.label}</a></div>`).join('') : 'No attachments available.'}
      </div>
    </body>
  </html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 250)
}

function ProgramDetailsCard({
  row,
  showBankDetails = false,
}: {
  row: RecordRow
  showBankDetails?: boolean
}) {
  const programDetails = Array.isArray(row.detailsOfProgram) ? row.detailsOfProgram[0] as RecordRow : null
  const guestDetails = Array.isArray(row.guestDetails) ? row.guestDetails[0] as RecordRow : null
  const organizationDetails = Array.isArray(row.organizationDetails) ? row.organizationDetails[0] as RecordRow : null
  const previousDetails = Array.isArray(row.previousDetails) ? row.previousDetails[0] as RecordRow : null
  const ticketHeads = Array.isArray(row.ticketHeads) ? row.ticketHeads as RecordRow[] : []
  const attachments = extractAttachments(row)
  const days = (() => {
    const start = Number(row.bookingStartDate)
    const end = Number(row.bookingEndDate)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 'N/A'
    return `${Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1} Day(s)`
  })()

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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
        <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #be185d, #e11d48)' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-serif text-xl font-bold">JKK Booking Form</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                Booking ID {toText(row.bookingId, 'N/A')} · {formatDateTime(getAny(row, ['createdDate', 'bookingDate']))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openPrintWindow(row)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white" style={{ background: 'rgba(255,255,255,0.18)', fontSize: 12 }}>
                <Printer size={14} />
                Download Form
              </button>
              <button
                onClick={() => {
                  attachments.forEach(item => {
                    const link = document.createElement('a')
                    link.href = item.url
                    link.target = '_blank'
                    link.rel = 'noreferrer'
                    link.download = ''
                    link.click()
                  })
                }}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white"
                style={{ background: 'rgba(255,255,255,0.18)', fontSize: 12 }}
              >
                <Download size={14} />
                Download Attachment
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 md:grid-cols-[2fr_1fr]" style={{ background: '#fffaf7' }}>
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div className="mb-4 font-semibold" style={{ color: 'var(--maroon)' }}>Organiser Details</div>
            <DetailGrid
              entries={[
                { label: 'Full Name', value: toText(row.applicantName, 'N/A') },
                { label: 'Mobile Number', value: toText(row.mobileNo, 'N/A') },
                { label: 'Email Address', value: toText(row.email, 'N/A') },
                { label: 'Address', value: toText(row.address, 'N/A') },
                { label: 'GST Number', value: toText(row.gstNo, 'N/A') },
                {
                  label: 'Society Registered',
                  value: toText(row.societyRegisteredDocUrl)
                    ? <a href={toText(row.societyRegisteredDocUrl)} target="_blank" rel="noreferrer" style={{ color: 'var(--maroon)' }}>View</a>
                    : 'N/A',
                },
              ]}
            />
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div className="mb-4 font-semibold" style={{ color: 'var(--maroon)' }}>Booking</div>
            <DetailGrid
              entries={[
                { label: 'Booking ID', value: toText(row.bookingId, 'N/A') },
                { label: 'Status', value: toText(row.approved ?? row.adminStatus, 'N/A') },
                { label: 'Payment Status', value: toText(row.paymentStatus, 'N/A') },
              ]}
            />
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div className="mb-4 font-semibold" style={{ color: 'var(--maroon)' }}>Event Details</div>
            <DetailGrid
              entries={[
                { label: 'Applied For', value: `${toText(row.typeName, 'N/A')} - ${toText(row.subCategoryName, 'N/A')}` },
                { label: 'Category', value: toText(row.category, 'N/A') },
                { label: 'Projector Required', value: row.projector ? 'Yes' : 'No' },
                { label: 'Audience Entry', value: row.audienceEntryByInvitation ? 'By Invitation' : row.audienceEntryByTicket ? 'By Ticket' : 'N/A' },
                { label: 'Reservation For', value: `${formatDate(row.bookingStartDate)} - ${formatDate(row.bookingEndDate)}` },
                { label: 'Duration', value: `${days}${toText(row.shiftName) ? ` - ${toText(row.shiftName)}` : ''}` },
                { label: 'Preparation Days', value: toText(row.preDays, '0') },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
          {renderTextSection('Program Details', programDetails?.description, programDetails)}
          {renderTextSection('Guest Details', guestDetails?.description, guestDetails)}
          {renderTextSection('Organization Details', organizationDetails?.description, organizationDetails)}
          {renderTextSection('Previous Details', previousDetails?.description, previousDetails)}
        </div>

        <div className={`grid gap-5 px-5 pb-5 ${showBankDetails ? 'md:grid-cols-[2fr_1fr]' : ''}`}>
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold" style={{ color: 'var(--maroon)' }}>Payment Details</div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>{toText(row.paymentStatus, 'Pending')}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {ticketHeads.map((ticket, index) => (
                <div key={`ticket-${index}`} className="rounded-lg border px-3 py-3" style={{ borderColor: 'var(--sand)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{toText(ticket.name, `Head ${index + 1}`)}</div>
                  <div className="mt-1 font-semibold">{formatMoney(ticket.amount)}</div>
                </div>
              ))}
              <div className="rounded-lg border px-3 py-3" style={{ borderColor: 'var(--sand)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Amount</div>
                <div className="mt-1 font-semibold">{formatMoney(row.totalAmount)}</div>
              </div>
            </div>
          </div>

          {toText(row.transactionId) ? (
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <div className="mb-4 font-semibold" style={{ color: 'var(--maroon)' }}>Transaction Details</div>
              <DetailGrid
                entries={[
                  { label: 'Transaction ID', value: toText(row.transactionId, 'N/A') },
                  { label: 'Transaction Date', value: formatDateTime(row.transactionDate) },
                  { label: 'Emitra Transaction ID', value: toText(row.emitraTransactionId, 'N/A') },
                ]}
              />
            </div>
          ) : null}
        </div>

        {showBankDetails ? (
          <div className="grid gap-5 px-5 pb-5 md:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <div className="mb-4 font-semibold" style={{ color: 'var(--maroon)' }}>Bank Details</div>
              <DetailGrid
                entries={[
                  { label: 'Bank Name', value: toText(row.bankName, 'N/A') },
                  { label: 'Account Type', value: toText(row.accountType, 'N/A') },
                  { label: 'Account Holder Name', value: toText(row.accountHolderName, 'N/A') },
                  { label: 'Account Number', value: toText(row.accountNumber, 'N/A') },
                  { label: 'IFSC', value: toText(row.bankIfsc, 'N/A') },
                  { label: 'Refundable Amount', value: formatMoney(row.refundAmount) },
                ]}
              />
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <div className="mb-4 font-semibold" style={{ color: 'var(--maroon)' }}>Refund Details</div>
              <DetailGrid
                entries={[
                  { label: 'Refund Status', value: toText(row.status, 'N/A') },
                  { label: 'Reference ID', value: toText(row.refId, 'N/A') },
                  { label: 'Payment Mode', value: toText(row.paymentMode, 'N/A') },
                  { label: 'Refund Date', value: formatDateTime(row.refundDate) },
                ]}
              />
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
                  <a
                    key={`${item.label}-${item.url}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--sand)', minWidth: 160, color: 'var(--text-dark)' }}
                  >
                    <div className="flex items-center gap-3">
                      {renderAttachmentPreview(item.url)}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isImageUrl(item.url) ? 'Image' : 'Document'}</div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : null}
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
}: {
  row: RecordRow | null
  open: boolean
  onClose: () => void
}) {
  if (!row) return null

  return (
    <ModalShell open={open} title="JKK Booking Details" subtitle={toText(row.bookingId, 'Booking')} onClose={onClose}>
      <div className="px-6 py-5" style={{ background: 'var(--cream)' }}>
        <ProgramDetailsCard row={row} />
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
