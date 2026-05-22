'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, FileBarChart2 } from 'lucide-react'
import SectionHeader from '@/components/ui/SectionHeader'
import MISReportView from '@/app/reports/inventory/MISReportView'
import CountryWiseReportView from '@/app/reports/inventory/CountryWiseReportView'
import DayWiseReportView from '@/app/reports/inventory/DayWiseReportView'
import HeadWiseReportView from '@/app/reports/inventory/HeadWiseReportView'
import HeadDetailedReportView from '@/app/reports/inventory/HeadDetailedReportView'
import HeadSummaryReportView from '@/app/reports/inventory/HeadSummaryReportView'
import AddonReportView from '@/app/reports/inventory/AddonReportView'
import HeadWiseGSTReportView from '@/app/reports/inventory/HeadWiseGSTReportView'
import ChoiceDifferenceReportView from '@/app/reports/inventory/ChoiceDifferenceReportView'
import TransactionReportView from '@/app/reports/inventory/TransactionReportView'
import VehicleAvailabilityReportView from '@/app/reports/inventory/VehicleAvailabilityReportView'
import VehicleTripAmountReportView from '@/app/reports/inventory/VehicleTripAmountReportView'
import DifferenceReportView from '@/app/reports/inventory/DifferenceReportView'
import BoardingPassReport from '@/app/reports/inventory/BoardingPassReport'

type ReportType =
  | 'mis'
  | 'country'
  | 'daywise'
  | 'headwise'
  | 'headdetail'
  | 'headsummary'
  | 'addon'
  | 'vehicleavail'
  | 'vehicletrip'
  | 'vehicleguide'
  | 'boarding'
  | 'failed'
  | 'choiceaddon'
  | 'diff'
  | 'entryexit'
  | 'guidetrip'
  | 'msgwise'
  | 'blockunblock'
  | 'blockuser'
  | 'checkstatus'
  | 'ticketgst'
  | 'choicegst'
  | 'headwisegst'
  | 'choicendiffreport'
  | 'vehicletrip2'
  | 'guidetrip2'
  | 'transaction'
  | 'cancelled'

const REPORTS: Array<{ id: ReportType; label: string; description: string }> = [
  { id: 'mis', label: 'MIS Report', description: 'Management Information Summary' },
  { id: 'country', label: 'Country Wise User Report', description: 'Visitor breakdown by nationality' },
  { id: 'daywise', label: 'Day Wise Reports', description: 'Daily visitor and booking counts' },
  { id: 'headwise', label: 'Head Wise Reports', description: 'Payment heads breakdown' },
  { id: 'headdetail', label: 'Head Detailed Report', description: 'Booking-level head breakdown' },
  { id: 'headsummary', label: 'Head Summary Report', description: 'Aggregated fee heads overview' },
  { id: 'addon', label: 'Add On Summary Reports', description: 'Supplementary service charges' },
  { id: 'vehicleavail', label: 'Vehicle Availability Report', description: 'Current fleet status' },
  { id: 'vehicletrip', label: 'Vehicle Trip With Amount', description: 'Per-trip revenue breakdown' },
  { id: 'vehicleguide', label: 'Vehicle Guide Trip Reports', description: 'Trips with guide details' },
  { id: 'boarding', label: 'Boarding Pass Report', description: 'Issued boarding passes log' },
  { id: 'failed', label: 'Failed Reports', description: 'Payment failures and errors' },
  { id: 'choiceaddon', label: 'Choice AddOn Report', description: 'User-selected add-on details' },
  { id: 'diff', label: 'Difference Report', description: 'Booking vs collected variance' },
  { id: 'entryexit', label: 'Entry Exit Report', description: 'Site check-in/check-out log' },
  { id: 'guidetrip', label: 'Guide Trip With Amount', description: 'Guide earnings per trip' },
  { id: 'msgwise', label: 'Message Wise User Reports', description: 'SMS and notification delivery log' },
  { id: 'blockunblock', label: 'Block/Unblock Ticket Report', description: 'Ticket activity log' },
  { id: 'blockuser', label: 'Block User Tickets', description: 'Blocked user access list' },
  { id: 'checkstatus', label: 'Check Status', description: 'Verify booking or payment status' },
  { id: 'ticketgst', label: 'Ticket GST Report', description: 'GST on ticket sales' },
  { id: 'choicegst', label: 'Choice GST Report', description: 'GST on add-on services' },
  { id: 'headwisegst', label: 'HeadWise Report(GST and Choice)', description: 'HeadWise GST and choice breakdown' },
  { id: 'choicendiffreport', label: 'Choice & Difference Report', description: 'Choice and difference comparison' },
  { id: 'vehicletrip2', label: 'Vehicle Trip Reports', description: 'Vehicle trip history' },
  { id: 'guidetrip2', label: 'Guide Trip Reports', description: 'Guide trip completion history' },
  { id: 'transaction', label: 'Transaction Reports', description: 'All payment transactions log' },
  { id: 'cancelled', label: 'Cancelled Transaction Report', description: 'Refunded and cancelled bookings' },
]

function DefaultReportView({
  reportLabel,
  reportDescription,
}: {
  reportLabel: string
  reportDescription: string
}) {
  return (
    <div className="rounded-[28px] border bg-white p-8 text-center" style={{ borderColor: 'var(--sand)' }}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--cream)', color: 'var(--maroon)' }}>
        <FileBarChart2 size={24} />
      </div>
      <h3 className="mt-4 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{reportLabel}</h3>
      <p className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{reportDescription}</p>
      <p className="mt-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        This report view is listed in the same selector flow and can be completed next if needed.
      </p>
    </div>
  )
}

export default function PlaceReportsView({
  placeId,
  placeName,
  departmentId,
}: {
  placeId: string
  placeName?: string
  departmentId?: string
}) {
  const [activeReport, setActiveReport] = useState<ReportType>('mis')
  const [isOpen, setIsOpen] = useState(false)

  const currentReport = useMemo(
    () => REPORTS.find(report => report.id === activeReport) ?? REPORTS[0],
    [activeReport],
  )

  const renderReport = () => {
    switch (activeReport) {
      case 'mis':
        return <MISReportView lockedPlaceId={placeId} lockedPlaceName={placeName} lockedDepartmentId={departmentId} />
      case 'country':
        return <CountryWiseReportView />
      case 'daywise':
        return <DayWiseReportView />
      case 'headwise':
        return <HeadWiseReportView lockedPlaceId={placeId} lockedPlaceName={placeName} lockedDepartmentId={departmentId} />
      case 'headdetail':
        return <HeadDetailedReportView />
      case 'headsummary':
        return <HeadSummaryReportView lockedPlaceId={placeId} lockedPlaceName={placeName} lockedDepartmentId={departmentId} />
      case 'addon':
        return <AddonReportView />
      case 'headwisegst':
        return <HeadWiseGSTReportView />
      case 'choicendiffreport':
        return <ChoiceDifferenceReportView />
      case 'transaction':
        return <TransactionReportView />
      case 'vehicleavail':
        return <VehicleAvailabilityReportView />
      case 'vehicletrip':
        return <VehicleTripAmountReportView />
      case 'diff':
        return <DifferenceReportView />
      case 'boarding':
        return <BoardingPassReport lockedPlaceId={placeId} lockedPlaceName={placeName} />
      default:
        return (
          <DefaultReportView
            reportLabel={currentReport.label}
            reportDescription={currentReport.description}
          />
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionHeader
        title="Place Management / Reports"
      />


      <div className="relative">
        <button
          onClick={() => setIsOpen(current => !current)}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-[24px] border bg-white text-left"
          style={{ borderColor: 'var(--sand)' }}
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Report Name</div>
            <div className="mt-1 text-sm font-bold" style={{ color: 'var(--text-dark)' }}>{currentReport.label}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentReport.description}</div>
          </div>
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {isOpen ? (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <div
              className="absolute top-full left-0 right-0 z-30 mt-3 max-h-[420px] overflow-y-auto rounded-[24px] border bg-white shadow-2xl"
              style={{ borderColor: 'var(--sand)' }}
            >
              {REPORTS.map(report => (
                <button
                  key={report.id}
                  onClick={() => {
                    setActiveReport(report.id)
                    setIsOpen(false)
                  }}
                  className="w-full border-b px-5 py-4 text-left transition hover:bg-[var(--cream)]"
                  style={{
                    borderColor: 'var(--sand)',
                    background: activeReport === report.id ? 'var(--cream)' : '#fff',
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: activeReport === report.id ? 'var(--maroon)' : 'var(--text-dark)' }}>
                    {report.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{report.description}</div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {renderReport()}
    </div>
  )
}
