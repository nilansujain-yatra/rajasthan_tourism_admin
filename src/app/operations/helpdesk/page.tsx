'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  Ticket,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'

type HelpdeskStatusKey = 'ongoing' | 'resolved' | 'cancelled'

type HelpdeskRow = {
  id?: string
  helpdeskId?: string
  ticketId?: string
  subject?: string
  issue?: string
  description?: string
  name?: string
  userName?: string
  fullName?: string
  placeName?: string
  status?: string
  createdDate?: string | number
  updatedDate?: string | number
  priority?: string
  [key: string]: unknown
}

type BookingLookupRow = {
  bookingId?: string
  bookingDate?: number
  visitDate?: number
  placeName?: string
  totalVisitors?: number
  totalAmount?: number
  transactionStatus?: string
  createdBy?: string
  mobile?: string
  [key: string]: unknown
}

type ChatMessage = {
  id: string
  senderName: string
  senderType: 'user' | 'admin'
  message: string
  dateText: string
  timeText: string
}

type AttachmentItem = {
  id: string
  fileName: string
  fileUrl: string | null
}

const STATUS_CONFIG: Record<HelpdeskStatusKey, { label: string; apiValue: string; icon: ReactNode; color: string; bg: string }> = {
  ongoing: {
    label: 'Ongoing',
    apiValue: 'IN_PROGRESS',
    icon: <Clock3 size={14} />,
    color: '#C8922A',
    bg: 'rgba(200,146,42,0.12)',
  },
  resolved: {
    label: 'Resolved',
    apiValue: 'RESOLVED',
    icon: <CheckCircle2 size={14} />,
    color: '#1A7A6E',
    bg: 'rgba(26,122,110,0.1)',
  },
  cancelled: {
    label: 'Cancelled',
    apiValue: 'CANCELLED',
    icon: <XCircle size={14} />,
    color: '#E53E3E',
    bg: 'rgba(229,62,62,0.1)',
  },
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const BOOKING_LOOKUP_START_DAY = '0'

function findFirstArray(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object' || depth >= 5) return null

  const obj = value as Record<string, unknown>
  const preferredKeys = ['result', 'data', 'content', 'list', 'rows', 'items', 'messages', 'attachments']

  for (const key of preferredKeys) {
    if (key in obj) {
      const found = findFirstArray(obj[key], depth + 1)
      if (found) return found
    }
  }

  for (const child of Object.values(obj)) {
    const found = findFirstArray(child, depth + 1)
    if (found) return found
  }

  return null
}

function extractHelpdeskRows(payload: unknown): HelpdeskRow[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as HelpdeskRow[]
}

function extractBookingRows(payload: unknown): BookingLookupRow[] {
  const list = findFirstArray(payload)
  if (!list) return []
  return list.filter(item => item && typeof item === 'object') as BookingLookupRow[]
}

function extractTotalRecords(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0

  const root = payload as Record<string, any>
  const candidate =
    root?.result?.totalRecords ??
    root?.result?.total ??
    root?.totalRecords ??
    root?.total ??
    root?.result?.meta?.totalRecords ??
    root?.meta?.totalRecords

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0
}

function formatDateTimeParts(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return {
        date: date.toLocaleDateString('en-IN'),
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }
    }
  }

  if (typeof value === 'string' && value.trim()) {
    const maybeNumber = Number(value)
    if (Number.isFinite(maybeNumber) && maybeNumber > 0) {
      return formatDateTimeParts(maybeNumber)
    }

    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return {
        date: date.toLocaleDateString('en-IN'),
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }
    }

    return { date: value, time: '' }
  }

  return { date: 'N/A', time: '' }
}

function formatDate(value: unknown) {
  return formatDateTimeParts(value).date
}

function getVisiblePages(page: number, totalPages: number) {
  const pages = new Set<number>([1])

  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
    pages.add(i)
  }

  if (totalPages > 1) pages.add(totalPages)

  return Array.from(pages).sort((a, b) => a - b)
}

function getText(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || 'N/A'
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return 'N/A'
}

function getAny(obj: unknown, key: string) {
  if (!obj || typeof obj !== 'object') return undefined
  return (obj as Record<string, unknown>)[key]
}

function getValueFromKeys(obj: unknown, keys: string[]) {
  for (const key of keys) {
    const direct = getAny(obj, key)
    if (direct !== undefined && direct !== null && direct !== '') return direct
  }
  return undefined
}

function getTicketId(row: HelpdeskRow, index: number) {
  const candidate = getValueFromKeys(row, ['helpdeskId', 'ticketId', 'id', 'grievanceId', 'complaintId'])
  if (typeof candidate === 'string' || typeof candidate === 'number') return String(candidate)
  return `HD-${index + 1}`
}

function getSubject(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['subject', 'issue', 'title', 'remark', 'description'])
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'No subject available'
}

function getDescription(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['description', 'message', 'issueDescription', 'remark', 'subject'])
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'No description available.'
}

function getRaisedBy(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['userName', 'fullName', 'name', 'createdBy', 'raisedBy'])
    ?? getAny(getAny(row, 'userDto'), 'displayName')
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'N/A'
}

function getPlaceName(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['placeName', 'siteName'])
    ?? getAny(getAny(row, 'placeDto'), 'placeName')
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'N/A'
}

function getPriority(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['priority', 'priorityType', 'severity'])
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : 'N/A'
}

function getStatusLabel(row: HelpdeskRow) {
  const raw = getValueFromKeys(row, ['status', 'ticketStatus', 'statusName'])
  if (typeof raw !== 'string' || !raw.trim()) return 'N/A'

  return raw
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getRaisedDateValue(row: HelpdeskRow) {
  return getValueFromKeys(row, ['createdDate', 'createdAt', 'raisedDate', 'ticketDate', 'insertedDate'])
}

function getCancelledDateValue(row: HelpdeskRow) {
  return getValueFromKeys(row, ['cancelledDate', 'cancelDate', 'closedDate', 'updatedDate', 'cancelledAt'])
}

function getEmail(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['email', 'emailId', 'mail'])
    ?? getAny(getAny(row, 'userDto'), 'email')
  return getText(candidate)
}

function getMobile(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['mobile', 'mobileNumber', 'phone', 'contactNumber'])
    ?? getAny(getAny(row, 'userDto'), 'mobile')
  return getText(candidate)
}

function getIssueType(row: HelpdeskRow) {
  return getText(getValueFromKeys(row, ['issueType', 'queryType', 'category', 'type']))
}

function getBookingNumber(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['bookingNumber', 'bookingId', 'bookingNo', 'referenceBookingId'])
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate)
  return ''
}

function getTicketNumber(row: HelpdeskRow, index: number) {
  return getTicketId(row, index)
}

function getUserImage(row: HelpdeskRow) {
  const candidate = getValueFromKeys(row, ['imageUrl', 'userImage', 'profileImage'])
    ?? getAny(getAny(row, 'userDto'), 'imageUrl')
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : ''
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'US'
  const first = parts[0]?.[0] ?? 'U'
  const second = parts.length > 1 ? parts[1]?.[0] ?? 'S' : parts[0]?.[1] ?? 'S'
  return `${first}${second}`.toUpperCase()
}

function flattenCandidateArrays(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []

  const obj = value as Record<string, unknown>
  const result: unknown[] = []
  for (const key of ['chatList', 'messageList', 'messages', 'conversation', 'replies', 'comments']) {
    if (Array.isArray(obj[key])) result.push(...obj[key] as unknown[])
  }
  return result
}

function extractChatMessages(row: HelpdeskRow): ChatMessage[] {
  const candidates = [
    ...flattenCandidateArrays(row),
    ...flattenCandidateArrays(getAny(row, 'ticketConversation')),
    ...flattenCandidateArrays(getAny(row, 'helpdeskConversation')),
  ]

  const messages = candidates
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const senderTypeRaw = getValueFromKeys(item, ['senderType', 'messageType', 'authorType', 'type'])
      const senderType: ChatMessage['senderType'] =
        typeof senderTypeRaw === 'string' && senderTypeRaw.toLowerCase().includes('admin') ? 'admin' : 'user'
      const senderNameValue =
        getValueFromKeys(item, ['senderName', 'name', 'createdBy', 'authorName'])
        ?? getAny(getAny(item, 'userDto'), 'displayName')

      const dateValue = getValueFromKeys(item, ['createdDate', 'date', 'createdAt', 'messageDate'])
      const parts = formatDateTimeParts(dateValue)

      return {
        id: `msg-${index + 1}`,
        senderName: typeof senderNameValue === 'string' && senderNameValue.trim()
          ? senderNameValue.trim()
          : senderType === 'admin'
          ? 'Admin'
          : 'User',
        senderType,
        message: getText(getValueFromKeys(item, ['message', 'comment', 'reply', 'text', 'description'])),
        dateText: parts.date,
        timeText: parts.time || 'N/A',
      }
    })
    .filter(message => message.message !== 'N/A')

  if (messages.length > 0) return messages

  const fallbackDate = formatDateTimeParts(getRaisedDateValue(row))
  return [
    {
      id: 'msg-fallback',
      senderName: getRaisedBy(row),
      senderType: 'user',
      message: getDescription(row),
      dateText: fallbackDate.date,
      timeText: fallbackDate.time || 'N/A',
    },
  ]
}

function extractAttachments(row: HelpdeskRow): AttachmentItem[] {
  const arrays = [
    ...flattenCandidateArrays(getAny(row, 'attachments')),
    ...flattenCandidateArrays(getAny(row, 'attachmentList')),
    ...flattenCandidateArrays(getAny(row, 'files')),
  ]

  const attachments = arrays
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const fileName = getValueFromKeys(item, ['fileName', 'name', 'attachmentName', 'documentName'])
      const fileUrl = getValueFromKeys(item, ['fileUrl', 'url', 'downloadUrl', 'attachmentUrl'])

      return {
        id: `att-${index + 1}`,
        fileName: typeof fileName === 'string' && fileName.trim() ? fileName.trim() : `Attachment ${index + 1}`,
        fileUrl: typeof fileUrl === 'string' && fileUrl.trim() ? fileUrl.trim() : null,
      }
    })

  if (attachments.length > 0) return attachments

  const directFileName = getValueFromKeys(row, ['attachmentName', 'fileName', 'documentName'])
  const directFileUrl = getValueFromKeys(row, ['attachmentUrl', 'fileUrl', 'downloadUrl'])

  if (typeof directFileName === 'string' && directFileName.trim()) {
    return [{
      id: 'att-direct',
      fileName: directFileName.trim(),
      fileUrl: typeof directFileUrl === 'string' && directFileUrl.trim() ? directFileUrl.trim() : null,
    }]
  }

  return []
}

function PageBtn({ onClick, disabled, active, icon, label }: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  icon?: ReactNode
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg flex items-center justify-center font-medium gap-0.5 px-2"
      style={{
        minWidth: 28,
        height: 28,
        fontSize: 11,
        background: active ? 'var(--maroon)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text-mid)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon ?? label}
    </button>
  )
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}

function HelpdeskDetailsDialog({
  row,
  rowIndex,
  statusKey,
  onClose,
}: {
  row: HelpdeskRow
  rowIndex: number
  statusKey: HelpdeskStatusKey
  onClose: () => void
}) {
  const statusConfig = STATUS_CONFIG[statusKey]
  const raisedParts = formatDateTimeParts(getRaisedDateValue(row))
  const cancelledParts = formatDateTimeParts(getCancelledDateValue(row))
  const userName = getRaisedBy(row)
  const userImage = getUserImage(row)
  const baseChatMessages = useMemo(() => extractChatMessages(row), [row])
  const attachments = useMemo(() => extractAttachments(row), [row])
  const initialBookingNumber = getBookingNumber(row)

  const [bookingLookupId, setBookingLookupId] = useState(initialBookingNumber)
  const [bookingLookupError, setBookingLookupError] = useState<string | null>(null)
  const [bookingLookupLoading, setBookingLookupLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [localReplies, setLocalReplies] = useState<ChatMessage[]>([])

  const chatMessages = useMemo(
    () => [...baseChatMessages, ...localReplies],
    [baseChatMessages, localReplies]
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  async function handleDownloadTicket() {
    if (!bookingLookupId.trim()) {
      setBookingLookupError('Enter a booking id to fetch and download the ticket.')
      return
    }

    setBookingLookupLoading(true)
    setBookingLookupError(null)

    try {
      const params = new URLSearchParams()
      params.set('bookingType', '')
      params.set('divisionId', '')
      params.set('districtId', '')
      params.set('endDay', String(new Date().setHours(23, 59, 59, 999)))
      params.set('offSet', '0')
      params.set('placeId', '')
      params.set('size', '1')
      params.set('startDay', BOOKING_LOOKUP_START_DAY)
      params.set('transactionStatus', '')
      params.set('departmentId', '')
      params.set('isFilter', 'true')
      params.set('dateFilter', 'Booking')
      params.set('searchKey', bookingLookupId.trim())
      params.set('printCount', 'ALL')
      params.set('ticketType', '')
      params.set('zoneId', '')
      params.set('shiftId', '')
      params.set('quotaId', '')
      params.set('inventoryId', '')
      params.set('entryVerify', 'ALL')
      params.set('driverVerify', 'ALL')

      const response = await fetch(`/api/inventory/reports/mis_V3?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      const payload = await response.json() as unknown

      if (!response.ok) {
        const message =
          typeof (payload as any)?.message === 'string'
            ? (payload as any).message
            : 'Unable to fetch booking ticket.'
        throw new Error(message)
      }

      const booking = extractBookingRows(payload)[0]
      if (!booking) {
        throw new Error('No booking found for the entered booking id.')
      }

      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.setTextColor(139, 30, 30)
      doc.text('Booking Ticket', 14, 18)

      autoTable(doc, {
        startY: 26,
        head: [['Field', 'Details']],
        body: [
          ['Booking ID', getText(booking.bookingId)],
          ['Booking Date', formatDate(booking.bookingDate)],
          ['Visit Date', formatDate(booking.visitDate)],
          ['Place', getText(booking.placeName)],
          ['Visitors', getText(booking.totalVisitors)],
          ['Amount', typeof booking.totalAmount === 'number' ? `Rs ${booking.totalAmount}` : getText(booking.totalAmount)],
          ['Transaction Status', getText(booking.transactionStatus)],
          ['Raised By', getText(booking.createdBy)],
          ['Mobile', getText(booking.mobile)],
        ],
        headStyles: {
          fillColor: [139, 30, 30],
          textColor: 255,
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
      })

      doc.save(`ticket_${getText(booking.bookingId)}.pdf`)
    } catch (error) {
      setBookingLookupError(error instanceof Error ? error.message : 'Unable to download ticket.')
    } finally {
      setBookingLookupLoading(false)
    }
  }

  function handleSendReply() {
    const trimmedReply = replyText.trim()
    if (!trimmedReply) return

    const now = new Date()
    setLocalReplies(current => ([
      ...current,
      {
        id: `local-reply-${now.getTime()}`,
        senderName: 'Admin',
        senderType: 'admin',
        message: trimmedReply,
        dateText: now.toLocaleDateString('en-IN'),
        timeText: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]))
    setReplyText('')
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28,16,8,0.45)', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#fff', width: 1080, maxWidth: '96vw', maxHeight: '92vh', boxShadow: '0 24px 64px rgba(139,26,26,0.22)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #6B1212, #A83030)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)' }}>
              <MessageSquareText size={18} color="#fff" />
            </div>
            <div>
              <div className="font-serif font-bold text-white" style={{ fontSize: 18 }}>
                Helpdesk Ticket Details
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
                {getTicketNumber(row, rowIndex)} | {getStatusLabel(row)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-xl"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(92vh - 74px)', background: 'var(--cream)' }}>
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
            <div className="space-y-5">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {getPlaceName(row)}
                    </div>
                    <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)', marginTop: 4 }}>
                      {getSubject(row)}
                    </div>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-medium"
                    style={{ fontSize: 11, background: statusConfig.bg, color: statusConfig.color }}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <DetailCard label="Raised Date" value={raisedParts.date} icon={<CalendarDays size={11} />} />
                  <DetailCard label="Raised Time" value={raisedParts.time || 'N/A'} icon={<Clock3 size={11} />} />
                  {statusKey === 'cancelled' ? (
                    <DetailCard label="Cancel Date & Time" value={`${cancelledParts.date}${cancelledParts.time ? ` | ${cancelledParts.time}` : ''}`} icon={<XCircle size={11} />} />
                  ) : (
                    <DetailCard label="Priority" value={getPriority(row)} icon={<AlertCircle size={11} />} />
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <div className="font-serif font-bold mb-4" style={{ fontSize: 18, color: 'var(--maroon)' }}>
                  Chat Box
                </div>
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    background: 'linear-gradient(180deg, #fffdf9 0%, #faf3e8 100%)',
                    border: '1px solid var(--sand)',
                  }}
                >
                  {chatMessages.map(message => (
                    <div
                      key={message.id}
                      className="relative rounded-2xl px-4 py-3 mb-3 last:mb-0"
                      style={{
                        background: message.senderType === 'admin' ? 'rgba(139,26,26,0.06)' : '#fff',
                        border: `1px solid ${message.senderType === 'admin' ? 'rgba(139,26,26,0.15)' : 'rgba(200,146,42,0.18)'}`,
                        marginLeft: message.senderType === 'admin' ? 56 : 0,
                        marginRight: message.senderType === 'user' ? 56 : 0,
                        boxShadow: '0 4px 18px rgba(28,16,8,0.04)',
                      }}
                    >
                      <div
                        className="absolute top-3"
                        style={{
                          [message.senderType === 'admin' ? 'left' : 'right']: -44,
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          background: message.senderType === 'admin' ? 'var(--maroon)' : 'var(--gold)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                        } as React.CSSProperties}
                      >
                        {getInitials(message.senderName)}
                      </div>

                      <div className="flex items-center justify-between gap-3 flex-wrap mb-1.5">
                        <div>
                          <div className="font-medium" style={{ fontSize: 12, color: 'var(--text-dark)' }}>
                            {message.senderName}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            {message.senderType === 'admin' ? 'Admin Reply' : 'Ticket Raised By'}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {message.dateText} | {message.timeText}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                        {message.message}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                  <div className="mb-2" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Send Message
                  </div>
                  <textarea
                    value={replyText}
                    onChange={event => setReplyText(event.target.value)}
                    placeholder="Type your reply to continue this ticket trail..."
                    className="w-full rounded-2xl px-4 py-3 outline-none resize-none"
                    rows={4}
                    style={{
                      fontSize: 13,
                      background: 'var(--cream)',
                      border: '1px solid var(--sand)',
                      color: 'var(--text-dark)',
                      lineHeight: 1.6,
                    }}
                  />
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Replies added here are shown in the conversation trail immediately.
                    </div>
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="rounded-xl px-4 py-2 font-medium text-white"
                      style={{
                        fontSize: 12,
                        background: !replyText.trim() ? 'rgba(139,26,26,0.45)' : 'var(--maroon)',
                        cursor: !replyText.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <div className="font-serif font-bold mb-4" style={{ fontSize: 18, color: 'var(--maroon)' }}>
                  User Details
                </div>

                <div className="flex items-center gap-3 mb-4">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="rounded-2xl object-cover"
                      style={{ width: 58, height: 58, border: '1px solid var(--sand)' }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-2xl text-white font-semibold"
                      style={{ width: 58, height: 58, background: 'var(--maroon)', fontSize: 18 }}
                    >
                      {getInitials(userName)}
                    </div>
                  )}
                  <div>
                    <div className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--text-dark)' }}>
                      {userName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Ticket Number: #{getTicketNumber(row, rowIndex)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <DetailCard label="Email ID" value={getEmail(row)} icon={<Mail size={11} />} />
                  <DetailCard label="Mobile Number" value={getMobile(row)} icon={<Phone size={11} />} />
                  <DetailCard label="Issue Type" value={getIssueType(row)} icon={<AlertCircle size={11} />} />
                  <DetailCard label="Booking Number" value={getBookingNumber(row) ? `#${getBookingNumber(row)}` : 'N/A'} icon={<Ticket size={11} />} />
                  <DetailCard label="Ticket Number" value={`#${getTicketNumber(row, rowIndex)}`} icon={<FileText size={11} />} />
                  <DetailCard label="Place" value={getPlaceName(row)} icon={<UserRound size={11} />} />
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <div className="font-serif font-bold mb-4" style={{ fontSize: 18, color: 'var(--maroon)' }}>
                  Attachment
                </div>

                {attachments.length === 0 ? (
                  <div className="rounded-xl px-4 py-4 text-center" style={{ background: 'var(--cream)', color: 'var(--text-muted)', fontSize: 12 }}>
                    No attachment available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attachments.map(attachment => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                        style={{ background: 'var(--cream)', border: '1px solid var(--sand)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} style={{ color: 'var(--maroon)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text-dark)', wordBreak: 'break-word' }}>{attachment.fileName}</span>
                        </div>
                        {attachment.fileUrl ? (
                          <a
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium"
                            style={{ fontSize: 11, background: 'var(--maroon)', color: '#fff', flexShrink: 0 }}
                          >
                            <Download size={12} />
                            Download
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unavailable</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
                <div className="font-serif font-bold mb-4" style={{ fontSize: 18, color: 'var(--maroon)' }}>
                  Fetch Booking Ticket
                </div>
                <div className="flex flex-col gap-3">
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Enter Booking ID
                  </label>
                  <input
                    value={bookingLookupId}
                    onChange={event => setBookingLookupId(event.target.value)}
                    placeholder="Enter booking id"
                    className="rounded-xl px-3 py-2.5 outline-none"
                    style={{ fontSize: 13, background: 'var(--cream)', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                  />
                  {bookingLookupError && (
                    <div className="rounded-xl px-3 py-2.5" style={{ fontSize: 12, background: '#fff4f4', border: '1px solid #ffd6d6', color: '#8B1A1A' }}>
                      {bookingLookupError}
                    </div>
                  )}
                  <button
                    onClick={handleDownloadTicket}
                    disabled={bookingLookupLoading}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white"
                    style={{
                      fontSize: 13,
                      background: 'linear-gradient(135deg, var(--maroon), var(--maroon-light))',
                      cursor: bookingLookupLoading ? 'not-allowed' : 'pointer',
                      opacity: bookingLookupLoading ? 0.6 : 1,
                    }}
                  >
                    <Download size={14} />
                    {bookingLookupLoading ? 'Fetching Ticket...' : 'Fetch & Download Ticket'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HelpDeskPage() {
  const [activeTab, setActiveTab] = useState<HelpdeskStatusKey>('ongoing')
  const [searchKey, setSearchKey] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<HelpdeskRow[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadHelpdeskRows() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('size', String(pageSize))
        params.set('offSet', String(page - 1))
        params.set('searchKey', searchKey)
        params.set('statusList', STATUS_CONFIG[activeTab].apiValue)

        const response = await fetch(`/api/helpdesk/getAll?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        })

        const payload = await response.json() as unknown

        if (!response.ok) {
          const message =
            typeof (payload as any)?.message === 'string'
              ? (payload as any).message
              : 'Unable to load helpdesk tickets.'
          throw new Error(message)
        }

        const list = extractHelpdeskRows(payload)
        const total = extractTotalRecords(payload) || list.length

        setRows(list)
        setTotalRecords(total)
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') return

        setRows([])
        setTotalRecords(0)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load helpdesk tickets.')
      } finally {
        setLoading(false)
      }
    }

    loadHelpdeskRows()

    return () => controller.abort()
  }, [activeTab, page, pageSize, searchKey])

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const visiblePages = getVisiblePages(page, totalPages)
  const selectedRow = selectedRowIndex !== null ? rows[selectedRowIndex] ?? null : null

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setSelectedRowIndex(null)
  }, [activeTab, page, pageSize, searchKey])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SectionHeader
              title="Helpdesk Management"
              right={
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {STATUS_CONFIG[activeTab].label} tickets
                </span>
              }
            />

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: '#fff', border: '1px solid var(--sand)', minWidth: 260 }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                value={searchKey}
                onChange={event => {
                  setSearchKey(event.target.value)
                  setPage(1)
                }}
                placeholder="Search helpdesk tickets..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 12, color: 'var(--text-dark)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {(Object.keys(STATUS_CONFIG) as HelpdeskStatusKey[]).map(key => {
              const config = STATUS_CONFIG[key]
              const isActive = key === activeTab

              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key)
                    setPage(1)
                  }}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
                  style={{
                    fontSize: 12,
                    background: isActive ? 'var(--maroon)' : '#fff',
                    color: isActive ? '#fff' : config.color,
                    border: `1px solid ${isActive ? 'var(--maroon)' : 'var(--sand)'}`,
                  }}
                >
                  {config.icon}
                  {config.label}
                </button>
              )
            })}
          </div>

          <div className="rounded-xl3 overflow-hidden" style={{ background: '#fff', border: '1px solid var(--sand)' }}>
            {loading ? (
              <div className="px-6 py-10">
                <RajasthanLoader label="Loading helpdesk tickets..." />
              </div>
            ) : error ? (
              <div className="px-6 py-6">
                <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#fff', border: '1px solid #ffe0e0' }}>
                  <AlertCircle size={18} style={{ color: 'var(--maroon)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="font-serif font-bold mb-1" style={{ fontSize: 18, color: 'var(--maroon)' }}>
                      Helpdesk data unavailable
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{error}</div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--cream-dark)', borderBottom: '1px solid var(--sand)' }}>
                      {[
                        'Ticket ID',
                        'Subject',
                        'Raised By',
                        'Place',
                        'Raised Date',
                        'Raised Time',
                        ...(activeTab === 'cancelled' ? ['Cancel Date', 'Cancel Time'] : []),
                        'Status',
                        'Action',
                      ].map(header => (
                        <th
                          key={header}
                          className="text-left px-4 py-3"
                          style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeTab === 'cancelled' ? 10 : 8}
                          className="px-6 py-10 text-center"
                          style={{ fontSize: 12, color: 'var(--text-muted)' }}
                        >
                          No data found for {STATUS_CONFIG[activeTab].label.toLowerCase()} tickets.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => {
                        const statusBadge = STATUS_CONFIG[activeTab]
                        const raisedParts = formatDateTimeParts(getRaisedDateValue(row))
                        const cancelledParts = formatDateTimeParts(getCancelledDateValue(row))

                        return (
                          <tr
                            key={getTicketId(row, index)}
                            style={{ borderBottom: index < rows.length - 1 ? '1px solid var(--cream-dark)' : 'none' }}
                            onMouseEnter={event => ((event.currentTarget as HTMLElement).style.background = 'var(--cream)')}
                            onMouseLeave={event => ((event.currentTarget as HTMLElement).style.background = '')}
                          >
                            <td className="px-4 py-3 font-medium" style={{ fontSize: 12, color: 'var(--maroon)' }}>
                              {getTicketId(row, index)}
                            </td>
                            <td className="px-4 py-3" style={{ fontSize: 12, maxWidth: 240 }}>
                              {getSubject(row)}
                            </td>
                            <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {getRaisedBy(row)}
                            </td>
                            <td className="px-4 py-3 font-serif font-semibold" style={{ fontSize: 12 }}>
                              {getPlaceName(row)}
                            </td>
                            <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {raisedParts.date}
                            </td>
                            <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {raisedParts.time || 'N/A'}
                            </td>
                            {activeTab === 'cancelled' && (
                              <>
                                <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {cancelledParts.date}
                                </td>
                                <td className="px-4 py-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {cancelledParts.time || 'N/A'}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3">
                              <span
                                className="rounded-full px-2.5 py-0.5 font-medium inline-flex items-center gap-1.5"
                                style={{ fontSize: 10, background: statusBadge.bg, color: statusBadge.color }}
                              >
                                {statusBadge.icon}
                                {getStatusLabel(row)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setSelectedRowIndex(index)}
                                className="rounded-lg px-3 py-1.5 font-medium"
                                style={{ fontSize: 11, background: 'var(--cream-dark)', color: 'var(--maroon)' }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--sand)', background: 'var(--cream)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Page Size:</span>
                    <div className="relative">
                      <select
                        value={String(pageSize)}
                        onChange={event => {
                          setPageSize(Number(event.target.value))
                          setPage(1)
                        }}
                        className="appearance-none rounded-lg pl-2.5 pr-6 py-1 outline-none"
                        style={{ fontSize: 11, background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)' }}
                      >
                        {PAGE_SIZE_OPTIONS.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <PageBtn
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                      disabled={page === 1}
                      icon={<><ChevronLeft size={12} /><span style={{ fontSize: 11 }}>Prev</span></>}
                    />
                    {visiblePages.map((pageNumber, index) => (
                      <div key={pageNumber} className="flex items-center gap-1">
                        {index > 0 && pageNumber - visiblePages[index - 1] > 1 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>...</span>
                        )}
                        <PageBtn
                          onClick={() => setPage(pageNumber)}
                          active={page === pageNumber}
                          label={String(pageNumber)}
                        />
                      </div>
                    ))}
                    <PageBtn
                      onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                      disabled={page === totalPages}
                      icon={<><span style={{ fontSize: 11 }}>Next</span><ChevronRight size={12} /></>}
                    />
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Result:{' '}
                    <strong style={{ color: 'var(--text-dark)' }}>
                      {totalRecords === 0 ? 0 : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalRecords)}`}
                    </strong>{' '}of{' '}
                    <strong style={{ color: 'var(--maroon)' }}>{totalRecords}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {selectedRow && (
        <HelpdeskDetailsDialog
          row={selectedRow}
          rowIndex={selectedRowIndex ?? 0}
          statusKey={activeTab}
          onClose={() => setSelectedRowIndex(null)}
        />
      )}
    </div>
  )
}
