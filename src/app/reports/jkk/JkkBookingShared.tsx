'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, FileText, XCircle } from 'lucide-react'
import type { AuthUser } from '@/lib/auth/jwt'
import { DetailGrid, ModalShell, formatDate, formatDateTime, formatMoney, getAny, toText, type JkkUser, type RecordRow } from './shared'

function userLabel(user: JkkUser) {
  return toText(user.fullName ?? user.userName ?? user.name ?? user.ssoId ?? user.ssoid, 'Unnamed User')
}

function userId(user: JkkUser) {
  return toText(user.id ?? user.userId)
}

function roleLabel(role: string) {
  if (!role) return 'Unknown'
  return role.replace(/^JKK_/, '').replace(/_/g, ' ')
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
  return toText(user?.userType).toUpperCase() === 'JKK_APPROVER'
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

  const ticketHeads = Array.isArray(row.ticketHeads) ? row.ticketHeads as RecordRow[] : []
  const sections = [
    { label: 'Booking ID', value: toText(row.bookingId, 'N/A') },
    { label: 'Registration Date', value: formatDateTime(getAny(row, ['createdDate', 'bookingDate'])) },
    { label: 'Applicant', value: toText(row.applicantName, 'N/A') },
    { label: 'Mobile', value: toText(row.mobileNo, 'N/A') },
    { label: 'Email', value: toText(row.email, 'N/A') },
    { label: 'Address', value: toText(row.address, 'N/A') },
    { label: 'GST Number', value: toText(row.gstNo, 'N/A') },
    { label: 'Category', value: toText(row.category, 'N/A') },
    { label: 'Applied For', value: `${toText(row.subCategoryName, 'N/A')} / ${toText(row.typeName, 'N/A')}` },
    { label: 'Shift', value: toText(row.shiftName, 'N/A') },
    { label: 'Booking Start', value: formatDate(row.bookingStartDate) },
    { label: 'Booking End', value: formatDate(row.bookingEndDate) },
    { label: 'Preparation Days', value: toText(row.preDays, '0') },
    { label: 'Projector Required', value: row.projector ? 'Yes' : 'No' },
    { label: 'Audience Entry', value: row.audienceEntryByInvitation ? 'By Invitation' : row.audienceEntryByTicket ? 'By Ticket' : 'N/A' },
    { label: 'Approval Status', value: toText(getAny(row, ['approved', 'adminStatus']), 'N/A') },
    { label: 'Payment Status', value: toText(row.paymentStatus, 'N/A') },
    { label: 'Transaction ID', value: toText(row.transactionId, 'N/A') },
    { label: 'Emitra Transaction ID', value: toText(row.emitraTransactionId, 'N/A') },
    { label: 'Total Amount', value: formatMoney(row.totalAmount) },
  ]

  return (
    <ModalShell open={open} title="JKK Booking Details" subtitle={toText(row.bookingId, 'Booking')} onClose={onClose}>
      <div className="space-y-5 px-6 py-5" style={{ background: 'var(--cream)' }}>
        <DetailGrid entries={sections} />

        {toText(row.societyRegisteredDocUrl) ? (
          <div className="rounded-xl border px-4 py-4" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Documents</div>
            <a href={toText(row.societyRegisteredDocUrl)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white" style={{ background: 'var(--maroon)', fontSize: 12 }}>
              <ExternalLink size={14} />
              View Society Registration Document
            </a>
          </div>
        ) : null}

        <div className="rounded-xl border" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
          <div className="border-b px-4 py-3 font-semibold" style={{ borderColor: 'var(--sand)', color: 'var(--maroon)' }}>Ticket Heads</div>
          <div className="space-y-3 px-4 py-4">
            {ticketHeads.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No ticket head details available.</div> : null}
            {ticketHeads.map((head, index) => (
              <div key={`${toText(head.name)}-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-3" style={{ borderColor: 'var(--sand)' }}>
                <div>{toText(getAny(head, ['name', 'headName', 'label']), `Head ${index + 1}`)}</div>
                <div className="font-semibold" style={{ color: 'var(--maroon)' }}>{formatMoney(getAny(head, ['amount', 'value']))}</div>
              </div>
            ))}
          </div>
        </div>
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
  const approvalMode = row ? canApprove(user) : false
  const approvalAllowed = approvalMode && toText(row?.paymentStatus).toUpperCase() === 'SUCCESS'

  const targetUsers = useMemo(
    () => (target ? users.filter(item => toText(item.userType).toUpperCase() === target.role) : []),
    [target, users],
  )

  if (!row) return null
  const activeRow = row

  async function submit() {
    setLoading(true)
    setError('')

    try {
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
        ) : target ? (
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
                  {userLabel(item)} ({roleLabel(toText(item.userType))})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--sand)', background: '#fff', color: 'var(--text-muted)', fontSize: 12 }}>
            No workflow action is available for this booking in the current stage.
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
            disabled={loading || (!approvalAllowed && !!target && !assigneeId)}
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
