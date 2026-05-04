'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  NonInventoryCompositeMisReportView,
  NonInventoryDayWiseReportView,
  NonInventoryHeadWiseDetailReportView,
  NonInventoryHeadWiseReportView,
  NonInventoryLspReportView,
  NonInventoryMisReportView,
  NonInventoryMonthWiseReportView,
  NonInventoryRefundReportView,
  NonInventorySummaryReportView,
} from './views'

type ReportType =
  | 'daywise'
  | 'mis'
  | 'lsp'
  | 'composite-mis'
  | 'monthwise'
  | 'headwise'
  | 'summary'
  | 'refund'
  | 'headwise-detail'

const REPORTS: Array<{ id: ReportType; label: string; description: string }> = [
  { id: 'daywise', label: 'Day Wise Report', description: 'Place-wise daily booking and visitor summary' },
  { id: 'mis', label: 'MIS Report', description: 'Booking-level non-inventory management report' },
  { id: 'lsp', label: 'LSP Report', description: 'Kiosk login and session performance report' },
  { id: 'composite-mis', label: 'Composite MIS Report', description: 'Composite package booking MIS' },
  { id: 'monthwise', label: 'Month Wise Report', description: 'Place-wise monthly booking summary' },
  { id: 'headwise', label: 'Head Wise Report', description: 'Head-level non-inventory collections' },
  { id: 'summary', label: 'Summary Report', description: 'Add-on summary grouped place-wise' },
  { id: 'refund', label: 'Refund Report', description: 'Refunded and refund-tracked bookings' },
  { id: 'headwise-detail', label: 'Head Wise Detail Report', description: 'Booking-wise fee head breakup' },
]

export default function NonInventoryReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('daywise')
  const [open, setOpen] = useState(false)

  const currentReport = useMemo(
    () => REPORTS.find(report => report.id === activeReport) ?? REPORTS[0],
    [activeReport],
  )

  const renderReport = () => {
    switch (activeReport) {
      case 'daywise':
        return <NonInventoryDayWiseReportView />
      case 'mis':
        return <NonInventoryMisReportView />
      case 'lsp':
        return <NonInventoryLspReportView />
      case 'composite-mis':
        return <NonInventoryCompositeMisReportView />
      case 'monthwise':
        return <NonInventoryMonthWiseReportView />
      case 'headwise':
        return <NonInventoryHeadWiseReportView />
      case 'summary':
        return <NonInventorySummaryReportView />
      case 'refund':
        return <NonInventoryRefundReportView />
      case 'headwise-detail':
        return <NonInventoryHeadWiseDetailReportView />
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
          <SectionHeader title="Non-Inventory Reports" />

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
                style={{ borderColor: 'var(--sand)', background: '#fff', maxHeight: 460, overflowY: 'auto' }}
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
