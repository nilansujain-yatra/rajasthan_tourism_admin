'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, GitBranchPlus, ScrollText } from 'lucide-react'
import { JkkActionModal, JkkBookingDetailModal, JkkTrailModal } from './JkkBookingShared'
import {
  JkkFilterModal,
  PaginationControls,
  ReportShell,
  csv,
  defaultJkkFilters,
  endMs,
  extractTotal,
  formatDateTime,
  formatMoney,
  getAny,
  toText,
  useJkkLookups,
  useJkkUsers,
  useSessionUser,
  type RecordRow,
} from './shared'

export default function JkkBookingReportView() {
  const [draftFilters, setDraftFilters] = useState(defaultJkkFilters)
  const [appliedFilters, setAppliedFilters] = useState(defaultJkkFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
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
          startDay: String(new Date(`${appliedFilters.startDate}T00:00:00.000`).getTime()),
          endDay: String(endMs(appliedFilters.endDate)),
          category: appliedFilters.categoryId,
          subCategory: appliedFilters.subCategoryId,
          shift: appliedFilters.shiftId,
          status: appliedFilters.status,
          offSet: String(Math.max(page - 1, 0)),
          size: String(pageSize),
          pagination: 'true',
        })

        const response = await fetch(`/api/jkk/reports/bookings?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const data = ((payload?.result?.jkkReportList ?? []) as RecordRow[]).filter(item => item && typeof item === 'object')

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

    return rows.filter(row => [
      row.bookingId,
      row.applicantName,
      row.mobileNo,
      row.email,
      row.gstNo,
      row.category,
      row.subCategoryName,
      row.typeName,
      row.transactionId,
      row.emitraTransactionId,
      row.createdBy,
    ].some(value => toText(value).toLowerCase().includes(query)))
  }, [rows, search])

  const totalAmount = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(getAny(row, ['totalAmount', 'amount']) ?? 0), 0),
    [filteredRows],
  )

  const filterCount = [
    appliedFilters.categoryId,
    appliedFilters.subCategoryId,
    appliedFilters.shiftId,
    appliedFilters.status,
  ].filter(Boolean).length

  return (
    <>
      <ReportShell
        title="JKK Booking Report"
        subtitle="JKK reports · Complete booking workflow and application details"
        search={search}
        setSearch={setSearch}
        filterCount={filterCount}
        onOpenFilters={() => setFilterOpen(true)}
        onExport={() => csv(
          `jkk-booking-report-${Date.now()}.csv`,
          ['Booking ID', 'Registration Date', 'Applicant', 'Mobile', 'Email', 'Category', 'Sub Category', 'Type', 'Shift', 'Transaction ID', 'Payment Status', 'Approval Status', 'Total Amount'],
          filteredRows.map(row => [
            toText(row.bookingId, 'N/A'),
            formatDateTime(getAny(row, ['createdDate', 'bookingDate'])),
            toText(row.applicantName, 'N/A'),
            toText(row.mobileNo, 'N/A'),
            toText(row.email, 'N/A'),
            toText(row.category, 'N/A'),
            toText(row.subCategoryName, 'N/A'),
            toText(row.typeName, 'N/A'),
            toText(row.shiftName, 'N/A'),
            toText(row.transactionId, 'N/A'),
            toText(row.paymentStatus, 'N/A'),
            toText(getAny(row, ['approved', 'adminStatus']), 'N/A'),
            Number(getAny(row, ['totalAmount', 'amount']) ?? 0),
          ]),
        )}
        cards={[
          { label: 'Rows Loaded', value: filteredRows.length.toLocaleString('en-IN') },
          { label: 'Workflow Status', value: appliedFilters.status || 'All' },
          { label: 'Category Filter', value: appliedFilters.categoryId ? 'Selected' : 'All' },
          { label: 'Total Amount', value: formatMoney(totalAmount), solid: true },
        ]}
        statusMessage={feedback || (search ? 'Search is applied on the current page results.' : undefined)}
        statusTone={feedback ? 'success' : 'normal'}
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1600 }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Booking ID', 'Registration Date', 'Created By', 'Applicant', 'Mobile', 'Email', 'Category', 'Event Type', 'Shift', 'Transaction ID', 'Payment', 'Approval', 'Amount', 'Form', 'Trail', 'Action'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={17} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading JKK booking report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={17} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && filteredRows.length === 0 ? <tr><td colSpan={17} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && filteredRows.map((row, index) => (
                <tr key={`${toText(row.bookingId)}-${index}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(page - 1) * pageSize + index + 1}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.bookingId, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{formatDateTime(getAny(row, ['createdDate', 'bookingDate']))}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.createdBy, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.applicantName, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.mobileNo, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.email, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.category, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{`${toText(row.subCategoryName, 'N/A')} / ${toText(row.typeName, 'N/A')}`}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.shiftName, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.transactionId ?? row.emitraTransactionId, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.paymentStatus, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(getAny(row, ['approved', 'adminStatus']), 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{formatMoney(getAny(row, ['totalAmount', 'amount']))}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>
                    <button
                      onClick={() => {
                        setSelectedRow(row)
                        setDetailOpen(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5"
                      style={{ borderColor: 'var(--sand)', color: 'var(--text-dark)' }}
                    >
                      <Eye size={13} />
                      View
                    </button>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>
                    <button
                      onClick={() => {
                        setSelectedRow(row)
                        setTrailOpen(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5"
                      style={{ borderColor: 'var(--sand)', color: 'var(--text-dark)' }}
                    >
                      <ScrollText size={13} />
                      Trail
                    </button>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>
                    <button
                      onClick={() => {
                        setSelectedRow(row)
                        setActionOpen(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-white"
                      style={{ background: 'var(--maroon)' }}
                    >
                      <GitBranchPlus size={13} />
                      Action
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={search ? filteredRows.length : total || filteredRows.length} />
      </ReportShell>

      <JkkFilterModal
        open={filterOpen}
        title="Filter JKK Booking Report"
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
          setPage(1)
          setAppliedFilters(current => ({ ...current }))
        }}
      />
    </>
  )
}
