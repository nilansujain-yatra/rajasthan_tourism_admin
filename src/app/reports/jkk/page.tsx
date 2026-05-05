'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import JkkBookingReportView from './JkkBookingReportView'
import JkkBookingStatusView from './JkkBookingStatusView'
import JkkBankDetailsReportView from './JkkBankDetailsReportView'
import JkkGstReportView from './JkkGstReportView'

type ReportType = 'booking-report' | 'booking-status' | 'bank-details' | 'gst-report'

const REPORTS: Array<{ id: ReportType; label: string; description: string }> = [
  { id: 'booking-report', label: 'JKK Booking Report', description: 'Application listing, details, workflow and approval actions' },
  { id: 'booking-status', label: 'JKK Booking Status', description: 'Approval queue with payment and workflow state' },
  { id: 'bank-details', label: 'JKK Bank Details Report', description: 'Refund handling, bank details and refund status updates' },
  { id: 'gst-report', label: 'JKK GST Report', description: 'GST breakup for JKK bookings and fee heads' },
]

export default function JkkReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('booking-report')
  const [open, setOpen] = useState(false)

  const currentReport = useMemo(
    () => REPORTS.find(report => report.id === activeReport) ?? REPORTS[0],
    [activeReport],
  )

  const renderReport = () => {
    switch (activeReport) {
      case 'booking-report':
        return <JkkBookingReportView />
      case 'booking-status':
        return <JkkBookingStatusView />
      case 'bank-details':
        return <JkkBankDetailsReportView />
      case 'gst-report':
        return <JkkGstReportView />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="page-enter flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <SectionHeader title="JKK Report" />

          <div className="relative">
            <button
              onClick={() => setOpen(current => !current)}
              className="w-full rounded-xl border px-4 py-3 text-left"
              style={{ borderColor: 'var(--sand)', background: '#fff' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {currentReport.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    {currentReport.description}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  style={{
                    color: 'var(--text-muted)',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>
            </button>

            {open && (
              <div
                className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border shadow-lg"
                style={{ borderColor: 'var(--sand)', background: '#fff', maxHeight: 420, overflowY: 'auto' }}
              >
                {REPORTS.map(report => (
                  <button
                    key={report.id}
                    onClick={() => {
                      setActiveReport(report.id)
                      setOpen(false)
                    }}
                    className="w-full border-b px-4 py-3 text-left transition hover:bg-stone-50"
                    style={{
                      borderColor: 'var(--sand)',
                      background: activeReport === report.id ? 'var(--cream)' : '#fff',
                    }}
                  >
                    <div
                      className="text-sm font-semibold"
                      style={{ color: activeReport === report.id ? 'var(--maroon)' : 'var(--ink)' }}
                    >
                      {report.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                      {report.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {renderReport()}
        </main>
      </div>
    </div>
  )
}
