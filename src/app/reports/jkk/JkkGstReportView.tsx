'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  JkkFilterModal,
  PaginationControls,
  ReportShell,
  csv,
  defaultJkkFilters,
  endMs,
  extractTotal,
  formatDate,
  formatMoney,
  startMs,
  toNumber,
  toText,
  type RecordRow,
} from './shared'

export default function JkkGstReportView() {
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

  useEffect(() => {
    let active = true

    ;(async () => {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          startDay: String(startMs(appliedFilters.startDate)),
          endDay: String(endMs(appliedFilters.endDate)),
          offSet: String(Math.max(page - 1, 0)),
          size: String(pageSize),
          pagination: 'true',
        })

        const response = await fetch(`/api/jkk/reports/gst?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const payload = await response.json()
        const data = ((payload?.result?.jkkGstReportList ?? []) as RecordRow[]).filter(item => item && typeof item === 'object')

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
      row.subCategoryName,
      row.shiftName,
      row.entryFee,
      row.totalAmount,
    ].some(value => toText(value).toLowerCase().includes(query)))
  }, [rows, search])

  const totals = useMemo(() => ({
    entryFee: filteredRows.reduce((sum, row) => sum + toNumber(row.entryFee), 0),
    entryFeeGst: filteredRows.reduce((sum, row) => sum + toNumber(row.entryFeeGst), 0),
    totalAmount: filteredRows.reduce((sum, row) => sum + toNumber(row.totalAmount), 0),
  }), [filteredRows])

  return (
    <>
      <ReportShell
        title="JKK GST Report"
        subtitle="JKK reports · GST breakup across entry, AC and other fee heads"
        search={search}
        setSearch={setSearch}
        filterCount={0}
        onOpenFilters={() => setFilterOpen(true)}
        onExport={() => csv(
          `jkk-gst-report-${Date.now()}.csv`,
          ['Booking ID', 'Sub Category', 'Booking Start', 'Booking End', 'Entry Fee', 'Entry Fee GST', 'With AC', 'With AC GST', 'Security Charge', 'RISL', 'Total Amount'],
          filteredRows.map(row => [
            toText(row.bookingId, 'N/A'),
            toText(row.subCategoryName, 'N/A'),
            formatDate(row.bookingStartDate),
            formatDate(row.bookingEndDate),
            toNumber(row.entryFee),
            toNumber(row.entryFeeGst),
            toNumber(row.withAc),
            toNumber(row.withAcGst),
            toNumber(row.securityCharge),
            toNumber(row.risl),
            toNumber(row.totalAmount),
          ]),
        )}
        cards={[
          { label: 'Rows Loaded', value: filteredRows.length.toLocaleString('en-IN') },
          { label: 'Entry Fee', value: formatMoney(totals.entryFee) },
          { label: 'GST On Entry', value: formatMoney(totals.entryFeeGst) },
          { label: 'Grand Total', value: formatMoney(totals.totalAmount), solid: true },
        ]}
        statusMessage="The GST report follows the JKK flow from the old project, adapted to this app's report shell."
      >
        <div className="overflow-x-auto px-6 pb-6">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
            <thead>
              <tr style={{ background: 'var(--cream-dark)', borderBottom: '2px solid var(--sand)' }}>
                {['Sr.', 'Booking ID', 'Sub Category', 'Booking Start', 'Booking End', 'Entry Fee', 'Entry Fee GST', 'With AC', 'With AC GST', 'Security Charge', 'RISL', 'Total Amount'].map(header => (
                  <th key={header} style={{ padding: '11px 14px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: header.includes('Fee') || header.includes('Amount') || header === 'RISL' ? 'right' : 'left', color: header === 'Sr.' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', background: header === 'Sr.' ? 'var(--maroon)' : undefined }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={12} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading JKK GST report...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={12} style={{ padding: 48, textAlign: 'center', color: '#B42318' }}>{error}</td></tr> : null}
              {!loading && !error && filteredRows.length === 0 ? <tr><td colSpan={12} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No records match the current filters.</td></tr> : null}
              {!loading && !error && filteredRows.map((row, index) => (
                <tr key={`${toText(row.bookingId)}-${index}`} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{(page - 1) * pageSize + index + 1}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.bookingId, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{toText(row.subCategoryName, 'N/A')}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{formatDate(row.bookingStartDate)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11 }}>{formatDate(row.bookingEndDate)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.entryFee)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.entryFeeGst)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.withAc)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.withAcGst)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.securityCharge)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.risl)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, textAlign: 'right' }}>{formatMoney(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={search ? filteredRows.length : total || filteredRows.length} />
      </ReportShell>

      <JkkFilterModal
        open={filterOpen}
        title="Filter JKK GST Report"
        values={draftFilters}
        setValues={setDraftFilters}
        categories={[]}
        subCategories={[]}
        shifts={[]}
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
    </>
  )
}
