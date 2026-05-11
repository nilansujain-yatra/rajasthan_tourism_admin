'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, GitBranchPlus, ScrollText } from 'lucide-react'
import { JkkActionModal, JkkBookingDetailModal, JkkTrailModal } from './JkkBookingShared'
import {
  canUseJkkWorkflowAction,
  JkkFilterModal,
  PaginationControls,
  ReportShell,
  csv,
  defaultJkkFilters,
  endMs,
  formatMoney,
  getAny,
  startMs,
  toText,
  useJkkLookups,
  useJkkUsers,
  useSessionUser,
  type RecordRow,
} from './shared'

export default function JkkBookingStatusView() {
  const [draftFilters, setDraftFilters] = useState(defaultJkkFilters)
  const [appliedFilters, setAppliedFilters] = useState(defaultJkkFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState<RecordRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [trailOpen, setTrailOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  const user = useSessionUser()
  const users = useJkkUsers()
  const { categories, subCategories, shifts } = useJkkLookups(
    filterOpen ? draftFilters.categoryId : appliedFilters.categoryId,
    filterOpen ? draftFilters.subCategoryId : appliedFilters.subCategoryId,
  )

  useEffect(() => {
    let active = true

    ;(async () => {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          startDay: String(startMs(appliedFilters.startDate)),
          endDay: String(endMs(appliedFilters.endDate)),
          category: appliedFilters.categoryId,
          subCategory: appliedFilters.subCategoryId,
          shifts: appliedFilters.shiftId,
          status: appliedFilters.status,
        })

        const response = await fetch(`/api/jkk/reports/booking-status?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const data = ((payload?.result?.jkkReportList ?? []) as RecordRow[]).filter(item => item && typeof item === 'object')

        if (active) setRows(data)
      } catch (requestError) {
        if (active) {
          setRows([])
          setError(requestError instanceof Error ? requestError.message : 'Unable to load report.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [appliedFilters])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const base = !query
      ? rows
      : rows.filter(row => [
        row.bookingId,
        row.applicantName,
        row.mobileNo,
        row.subCategoryName,
        row.typeName,
        row.paymentStatus,
        row.adminStatus,
        row.approved,
      ].some(value => toText(value).toLowerCase().includes(query)))

    const startIndex = (page - 1) * pageSize
    return {
      total: base.length,
      rows: base.slice(startIndex, startIndex + pageSize),
      totalAmount: base.reduce((sum, row) => sum + Number(getAny(row, ['totalAmount', 'amount']) ?? 0), 0),
    }
  }, [rows, search, page, pageSize])

  const filterCount = [
    appliedFilters.categoryId,
    appliedFilters.subCategoryId,
    appliedFilters.shiftId,
    appliedFilters.status,
  ].filter(Boolean).length

  return (
    <>
      <ReportShell
        title="JKK Booking Status"
        subtitle="JKK reports · Approval queue and payment status view"
        search={search}
        setSearch={setSearch}
        filterCount={filterCount}
        onOpenFilters={() => setFilterOpen(true)}
        onExport={() => csv(
          `jkk-booking-status-${Date.now()}.csv`,
          ['Booking ID', 'Applicant', 'Mobile', 'Event Type', 'Payment Status', 'Approval Status', 'Total Amount'],
          rows.map(row => [
            toText(row.bookingId, 'N/A'),
            toText(row.applicantName, 'N/A'),
            toText(row.mobileNo, 'N/A'),
            `${toText(row.subCategoryName, 'N/A')} / ${toText(row.typeName, 'N/A')}`,
            toText(row.paymentStatus, 'N/A'),
            toText(getAny(row, ['approved', 'adminStatus']), 'N/A'),
            Number(getAny(row, ['totalAmount', 'amount']) ?? 0),
          ]),
        )}
        cards={[
          { label: 'Rows Loaded', value: filteredRows.total.toLocaleString('en-IN') },
          { label: 'Approval Filter', value: appliedFilters.status || 'All' },
          { label: 'Shift Filter', value: appliedFilters.shiftId ? 'Selected' : 'All' },
          { label: 'Visible Amount', value: formatMoney(filteredRows.totalAmount), solid: true },
        ]}
        statusMessage={feedback}
        statusTone={feedback ? 'success' : 'normal'}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Booking ID', 'Applicant', 'Mobile', 'Event Type', 'Payment Status', 'Approval Status', 'Amount', 'Form', 'Trail', 'Action'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={11} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading JKK booking status report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={11} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && filteredRows.rows.length === 0 ? <tr><td colSpan={11} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && filteredRows.rows.map((row, index) => (
                <tr key={`${toText(row.bookingId)}-${index}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(page - 1) * pageSize + index + 1}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.bookingId, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.applicantName, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.mobileNo, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{`${toText(row.subCategoryName, 'N/A')} / ${toText(row.typeName, 'N/A')}`}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.paymentStatus, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(getAny(row, ['approved', 'adminStatus']), 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{formatMoney(getAny(row, ['totalAmount', 'amount']))}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>
                    <button onClick={() => { setSelectedRow(row); setDetailOpen(true) }} className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--sand)', fontSize: 12 }}>View</button>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>
                    <button onClick={() => { setSelectedRow(row); setTrailOpen(true) }} className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--sand)', fontSize: 12 }}>Trail</button>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>
                    {canUseJkkWorkflowAction(user, row) ? (
                      <button onClick={() => { setSelectedRow(row); setActionOpen(true) }} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-white" style={{ background: 'var(--maroon)', fontSize: 12 }}>
                        <GitBranchPlus size={13} />
                        Action
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filteredRows.total} />
      </ReportShell>

      <JkkFilterModal
        open={filterOpen}
        title="Filter JKK Booking Status"
        values={draftFilters}
        setValues={setDraftFilters}
        categories={categories}
        subCategories={subCategories}
        shifts={shifts}
        showStatus
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

      <JkkBookingDetailModal row={selectedRow} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <JkkTrailModal row={selectedRow} open={trailOpen} onClose={() => setTrailOpen(false)} />
      <JkkActionModal
        row={selectedRow}
        open={actionOpen}
        user={user}
        users={users}
        onClose={() => setActionOpen(false)}
        onSuccess={message => {
          setFeedback(message)
          setActionOpen(false)
          setAppliedFilters(current => ({ ...current }))
        }}
      />
    </>
  )
}
