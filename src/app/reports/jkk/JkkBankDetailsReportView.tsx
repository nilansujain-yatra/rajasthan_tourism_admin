'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, Landmark, RefreshCw } from 'lucide-react'
import { JkkBookingDetailModal } from './JkkBookingShared'
import {
  canManageJkkRefundDetails,
  DetailGrid,
  JkkFilterModal,
  maskSensitiveValue,
  ModalShell,
  PaginationControls,
  ReportShell,
  csv,
  defaultJkkFilters,
  endMs,
  extractTotal,
  formatDateTime,
  formatMoney,
  refundStatusOptions,
  shouldMaskJkkBankFields,
  startMs,
  toText,
  useSessionUser,
  type RecordRow,
} from './shared'

type BankRow = RecordRow & {
  jkkReportList?: RecordRow[]
}

function refundBadge(status: string) {
  const normalized = status.toUpperCase()

  if (normalized === 'REFUND_SUCCESS') return { background: 'rgba(26, 122, 110, 0.12)', color: '#1A7A6E' }
  if (normalized === 'REFUND_FAILED' || normalized === 'REFUND_REJECTED') return { background: 'rgba(180, 35, 24, 0.12)', color: '#B42318' }
  if (normalized === 'REFUND_INITIATED' || normalized === 'REFUND_PROCESSING') return { background: 'rgba(200, 146, 42, 0.14)', color: '#8B6A13' }

  return { background: 'rgba(15, 23, 42, 0.08)', color: 'var(--text-dark)' }
}

function RefundUpdateModal({
  row,
  open,
  onClose,
  onSuccess,
}: {
  row: BankRow | null
  open: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const [status, setStatus] = useState('PENDING')
  const [paymentMode, setPaymentMode] = useState('')
  const [refundDate, setRefundDate] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [paymentReferenceId, setPaymentReferenceId] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!row) return null
  const activeRow = row

  async function submit() {
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/jkk/actions/update-bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeRow.id,
          status,
          remark,
          refundDate: refundDate ? new Date(`${refundDate}T12:00:00`).getTime() : null,
          refundAmount: refundAmount ? Number(refundAmount) : null,
          paymentMode: paymentMode || null,
          refId: paymentReferenceId || null,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message ?? `Request failed with ${response.status}`)
      onSuccess('Refund details updated successfully.')
      onClose()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to update refund details.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell open={open} title="Update Refund Details" subtitle={toText(row.jkkReportList?.[0]?.bookingId, 'Booking')} onClose={onClose}>
      <div className="space-y-5 px-6 py-5" style={{ background: 'var(--cream)' }}>
        <DetailGrid
          entries={[
            { label: 'Booking ID', value: toText(row.jkkReportList?.[0]?.bookingId, 'N/A') },
            { label: 'Applicant', value: toText(row.jkkReportList?.[0]?.applicantName, 'N/A') },
            { label: 'Current Refund Status', value: toText(row.status, 'N/A') },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Refund Status</label>
            <select value={status} onChange={event => setStatus(event.target.value)} className="w-full rounded-xl px-4 py-3 outline-none" style={{ fontSize: 12, border: '1px solid var(--sand)' }}>
              {refundStatusOptions().filter(item => item.value).map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Payment Mode</label>
            <input value={paymentMode} onChange={event => setPaymentMode(event.target.value)} className="w-full rounded-xl px-4 py-3 outline-none" style={{ fontSize: 12, border: '1px solid var(--sand)' }} placeholder="Cash / Online / Cheque / DD" />
          </div>
          <div className="space-y-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Refund Date</label>
            <input type="date" value={refundDate} onChange={event => setRefundDate(event.target.value)} className="w-full rounded-xl px-4 py-3 outline-none" style={{ fontSize: 12, border: '1px solid var(--sand)' }} />
          </div>
          <div className="space-y-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Refund Amount</label>
            <input type="number" min="0" value={refundAmount} onChange={event => setRefundAmount(event.target.value)} className="w-full rounded-xl px-4 py-3 outline-none" style={{ fontSize: 12, border: '1px solid var(--sand)' }} placeholder="Enter amount" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Payment Reference ID</label>
            <input value={paymentReferenceId} onChange={event => setPaymentReferenceId(event.target.value)} className="w-full rounded-xl px-4 py-3 outline-none" style={{ fontSize: 12, border: '1px solid var(--sand)' }} placeholder="Reference ID" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Remark</label>
            <textarea value={remark} onChange={event => setRemark(event.target.value)} rows={4} className="w-full rounded-xl px-4 py-3 outline-none" style={{ fontSize: 12, border: '1px solid var(--sand)' }} placeholder="Enter remark" />
          </div>
        </div>

        {error ? <div style={{ fontSize: 12, color: '#B42318' }}>{error}</div> : null}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border px-4 py-2" style={{ borderColor: 'var(--sand)', fontSize: 12 }}>Cancel</button>
          <button onClick={submit} disabled={submitting} className="rounded-xl px-4 py-2 text-white disabled:opacity-50" style={{ background: 'var(--maroon)', fontSize: 12 }}>
            {submitting ? 'Submitting...' : 'Submit Update'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function RefundInfoModal({
  row,
  open,
  onClose,
}: {
  row: BankRow | null
  open: boolean
  onClose: () => void
}) {
  if (!row) return null

  return (
    <ModalShell open={open} title="Refund Details" subtitle={toText(row.jkkReportList?.[0]?.bookingId, 'Booking')} onClose={onClose}>
      <div className="px-6 py-5" style={{ background: 'var(--cream)' }}>
        <DetailGrid
          entries={[
            { label: 'Refund Status', value: toText(row.status, 'N/A') },
            { label: 'Changed By', value: toText(row.statusChangedBy, 'N/A') },
            { label: 'Changed Date', value: formatDateTime(row.statusChangedDate) },
            { label: 'Refund Date', value: formatDateTime(row.refundDate) },
            { label: 'Refund Amount', value: formatMoney(row.refundAmount) },
            { label: 'Payment Mode', value: toText(row.paymentMode, 'N/A') },
            { label: 'Reference ID', value: toText(row.refId, 'N/A') },
            { label: 'Remark', value: toText(row.remark, 'N/A') },
          ]}
        />
      </div>
    </ModalShell>
  )
}

export default function JkkBankDetailsReportView() {
  const [draftFilters, setDraftFilters] = useState(defaultJkkFilters)
  const [appliedFilters, setAppliedFilters] = useState(defaultJkkFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<BankRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [selectedRow, setSelectedRow] = useState<BankRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [refundInfoOpen, setRefundInfoOpen] = useState(false)
  const [refundUpdateOpen, setRefundUpdateOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const user = useSessionUser()

  useEffect(() => {
    let active = true

    ;(async () => {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          startDay: String(startMs(appliedFilters.startDate)),
          endDay: String(endMs(appliedFilters.endDate)),
          status: appliedFilters.refundStatus,
          offSet: String(Math.max(page - 1, 0)),
          size: String(pageSize),
          pagination: 'true',
        })

        const response = await fetch(`/api/jkk/reports/bank-details?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const data = ((payload?.result?.jkkBankDetailsReport ?? []) as BankRow[]).filter(item => item && typeof item === 'object')

        if (active) {
          setRows(data)
          setTotal(extractTotal(payload, data.length))
        }
      } catch (requestError) {
        if (active) {
          setRows([])
          setTotal(0)
          setError(requestError instanceof Error ? requestError.message : 'Unable to load report.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [appliedFilters, page, pageSize])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows

    return rows.filter(row => {
      const booking = row.jkkReportList?.[0] ?? {}
      return [
        booking.bookingId,
        booking.applicantName,
        booking.mobileNo,
        booking.email,
        row.bankName,
        row.accountNumber,
        row.bankIfsc,
        row.accountHolderName,
        row.status,
      ].some(value => toText(value).toLowerCase().includes(query))
    })
  }, [rows, search])

  const filterCount = [appliedFilters.refundStatus].filter(Boolean).length
  const maskBankData = shouldMaskJkkBankFields(user)
  const canUpdateRefund = canManageJkkRefundDetails(user)

  return (
    <>
      <ReportShell
        title="JKK Bank Details Report"
        subtitle="JKK reports · Refund handling, bank verification and audit trail"
        search={search}
        setSearch={setSearch}
        filterCount={filterCount}
        onOpenFilters={() => setFilterOpen(true)}
        onExport={() => csv(
          `jkk-bank-details-${Date.now()}.csv`,
          ['Booking ID', 'Registration Date', 'Applicant', 'Mobile', 'Email', 'Bank Name', 'Account Number', 'IFSC', 'Account Holder', 'Account Type', 'Refund Status'],
          filteredRows.map(row => {
            const booking = row.jkkReportList?.[0] ?? {}
            return [
              toText(booking.bookingId, 'N/A'),
              formatDateTime(booking.createdDate),
              toText(booking.applicantName, 'N/A'),
              toText(booking.mobileNo, 'N/A'),
              toText(booking.email, 'N/A'),
              toText(row.bankName, 'N/A'),
              maskBankData ? maskSensitiveValue(row.accountNumber) : toText(row.accountNumber, 'N/A'),
              maskBankData ? maskSensitiveValue(row.bankIfsc) : toText(row.bankIfsc, 'N/A'),
              maskBankData ? maskSensitiveValue(row.accountHolderName) : toText(row.accountHolderName, 'N/A'),
              toText(row.accountType, 'N/A'),
              toText(row.status, 'N/A'),
            ]
          }),
        )}
        cards={[
          { label: 'Rows Loaded', value: filteredRows.length.toLocaleString('en-IN') },
          { label: 'Refund Filter', value: appliedFilters.refundStatus || 'All' },
          { label: 'Successful Refunds', value: filteredRows.filter(row => toText(row.status).toUpperCase() === 'REFUND_SUCCESS').length.toLocaleString('en-IN') },
          { label: 'Pending Or Active', value: filteredRows.filter(row => toText(row.status).toUpperCase() !== 'REFUND_SUCCESS').length.toLocaleString('en-IN'), solid: true },
        ]}
        statusMessage={feedback}
        statusTone={feedback ? 'success' : 'normal'}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1500 }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Booking ID', 'Registration Date', 'Applicant', 'Mobile', 'Email', 'Bank Name', 'Account No.', 'IFSC', 'Holder Name', 'Account Type', 'Application', 'Refund Detail', 'Refund Status', 'Update'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={15} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading JKK bank details report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={15} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && filteredRows.length === 0 ? <tr><td colSpan={15} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && filteredRows.map((row, index) => {
                const booking = row.jkkReportList?.[0] ?? {}
                const badge = refundBadge(toText(row.status))

                return (
                  <tr key={`${toText(booking.bookingId)}-${index}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{(page - 1) * pageSize + index + 1}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(booking.bookingId, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{formatDateTime(booking.createdDate)}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(booking.applicantName, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(booking.mobileNo, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(booking.email, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.bankName, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{maskBankData ? maskSensitiveValue(row.accountNumber) : toText(row.accountNumber, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{maskBankData ? maskSensitiveValue(row.bankIfsc) : toText(row.bankIfsc, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{maskBankData ? maskSensitiveValue(row.accountHolderName) : toText(row.accountHolderName, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.accountType, 'N/A')}</td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>
                      <button onClick={() => { setSelectedRow(row); setDetailOpen(true) }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--sand)', fontSize: 12 }}>
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>
                      <button onClick={() => { setSelectedRow(row); setRefundInfoOpen(true) }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--sand)', fontSize: 12 }}>
                        <Landmark size={13} />
                        Refund
                      </button>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>
                      <span className="rounded-full px-3 py-1" style={{ fontSize: 11, background: badge.background, color: badge.color }}>
                        {toText(row.status, 'N/A')}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11 }}>
                      {canUpdateRefund && toText(row.status).toUpperCase() !== 'REFUND_SUCCESS' ? (
                        <button onClick={() => { setSelectedRow(row); setRefundUpdateOpen(true) }} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-white" style={{ background: 'var(--maroon)', fontSize: 12 }}>
                          <RefreshCw size={13} />
                          Update
                        </button>
                      ) : canUpdateRefund ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Completed</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Read only</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={search ? filteredRows.length : total || filteredRows.length} />
      </ReportShell>

      <JkkFilterModal
        open={filterOpen}
        title="Filter JKK Bank Details Report"
        values={draftFilters}
        setValues={setDraftFilters}
        categories={[]}
        subCategories={[]}
        shifts={[]}
        showRefundStatus
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
          setFilterOpen(false)
        }}
        onReset={() => {
          const initial = defaultJkkFilters()
          setDraftFilters(initial)
          setAppliedFilters(initial)
          setSearch('')
          setPage(1)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
      />

      <JkkBookingDetailModal row={selectedRow?.jkkReportList?.[0] ?? null} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <RefundInfoModal row={selectedRow} open={refundInfoOpen} onClose={() => setRefundInfoOpen(false)} />
      <RefundUpdateModal
        row={selectedRow}
        open={refundUpdateOpen}
        onClose={() => setRefundUpdateOpen(false)}
        onSuccess={message => {
          setFeedback(message)
          setRefundUpdateOpen(false)
          setAppliedFilters(current => ({ ...current }))
        }}
      />
    </>
  )
}
