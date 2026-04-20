'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import HeadDetailedReportView from './HeadDetailedReportView'
import HeadWiseReportView from './HeadWiseReportView'
import HeadSummaryReportView from './HeadSummaryReportView'
import MISReportView from './MISReportView'
import AddonReportView from './AddonReportView'
import HeadWiseGSTReportView from './HeadWiseGSTReportView'

type ReportType = 'mis' | 'country' | 'daywise' | 'headwise' | 'headdetail' | 'headsummary' | 'addon' | 'vehicleavail' | 'vehicletrip' | 'vehicleguide' | 'boarding' | 'failed' | 'choiceaddon' | 'diff' | 'entryexit' | 'guidetrip' | 'msgwise' | 'blockunblock' | 'blockuser' | 'checkstatus' | 'ticketgst' | 'choicegst' | 'headwisegst' | 'vehicletrip2' | 'guidetrip2' | 'transaction' | 'cancelled'

const REPORTS: Array<{ id: ReportType; label: string; description: string }> = [
  { id: 'mis', label: 'MIS Report', description: 'Management Information Summary' },
  { id: 'country', label: 'Country Wise User Report', description: 'Visitor breakdown by nationality' },
  { id: 'daywise', label: 'Day Wise Reports', description: 'Daily visitor & booking counts' },
  { id: 'headwise', label: 'Head Wise Reports', description: 'Payment heads breakdown' },
  { id: 'headdetail', label: 'Head Detailed Report', description: 'Full booking-level head breakdown' },
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
  { id: 'msgwise', label: 'Message Wise User Reports', description: 'SMS/notification delivery log' },
  { id: 'blockunblock', label: 'Block/Unblock Ticket Report', description: 'Ticket activity log' },
  { id: 'blockuser', label: 'Block User Tickets', description: 'Blocked user access list' },
  { id: 'checkstatus', label: 'Check Status', description: 'Verify booking or payment status' },
  { id: 'ticketgst', label: 'Ticket GST Report', description: 'GST on ticket sales' },
  { id: 'choicegst', label: 'Choice GST Report', description: 'GST on add-on services' },
  { id: 'headwisegst', label: 'HeadWise Report(GST and Choice)', description: 'HeadWise Report of GST and Choice' },
  { id: 'vehicletrip2', label: 'Vehicle Trip Reports', description: 'Vehicle trip history' },
  { id: 'guidetrip2', label: 'Guide Trip Reports', description: 'Guide trip completion history' },
  { id: 'transaction', label: 'Transaction Reports', description: 'All payment transactions log' },
  { id: 'cancelled', label: 'Cancelled Transaction Report', description: 'Refunded and cancelled bookings' },
]

const CountryWiseView = () => (
  <div className="space-y-5">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold font-serif" style={{ color: 'var(--ink)' }}>Country Wise User Report</h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 3 }}>Visitor breakdown by nationality</p>
      </div>
      <div className="flex gap-2">
        <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs hover:bg-gray-50" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>Filter</button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--maroon)' }}>Export</button>
      </div>
    </div>

    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--cream)' }}>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Sr.</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Country</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Visitors</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Revenue (INR)</th>
          </tr>
        </thead>
        <tbody>
          {[
            { sr: 1, country: 'India', visitors: '3,234', revenue: '₹32,40,000' },
            { sr: 2, country: 'United States', visitors: '420', revenue: '₹8,40,000' },
            { sr: 3, country: 'United Kingdom', visitors: '310', revenue: '₹6,20,000' },
            { sr: 4, country: 'Germany', visitors: '180', revenue: '₹3,60,000' },
            { sr: 5, country: 'France', visitors: '145', revenue: '₹2,90,000' },
          ].map((row) => (
            <tr key={row.sr} style={{ borderBottom: '1px solid var(--sand)' }} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{row.sr}</td>
              <td className="px-4 py-3 text-sm">{row.country}</td>
              <td className="px-4 py-3 text-sm">{row.visitors}</td>
              <td className="px-4 py-3 text-sm font-semibold">{row.revenue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const FailedReportView = () => (
  <div className="space-y-5">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold font-serif" style={{ color: 'var(--ink)' }}>Failed Reports</h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 3 }}>Payment failures and booking errors</p>
      </div>
      <div className="flex gap-2">
        <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs hover:bg-gray-50" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>Filter</button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--maroon)' }}>Export</button>
      </div>
    </div>

    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--cream)' }}>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Sr.</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Booking ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Amount</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {[
            { sr: 1, date: '09-04-2026', id: 'JHA2604090823001122', amount: '₹2,400', reason: 'Payment Failed' },
            { sr: 2, date: '08-04-2026', id: 'JHA2604081544003344', amount: '₹1,800', reason: 'Timeout' },
            { sr: 3, date: '07-04-2026', id: 'JHA2604071107005566', amount: '₹3,200', reason: 'Bank Decline' },
            { sr: 4, date: '06-04-2026', id: 'JHA2604061855007788', amount: '₹5,600', reason: 'Payment Failed' },
          ].map((row) => (
            <tr key={row.sr} style={{ borderBottom: '1px solid var(--sand)' }} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{row.sr}</td>
              <td className="px-4 py-3 text-sm">{row.date}</td>
              <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.id}</td>
              <td className="px-4 py-3 text-sm">{row.amount}</td>
              <td className="px-4 py-3 text-xs"><span className="px-2 py-1 rounded-full" style={{ background: 'rgba(226,75,74,0.08)', color: '#A32D2D' }}>{row.reason}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const VehicleAvailView = () => (
  <div className="space-y-5">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold font-serif" style={{ color: 'var(--ink)' }}>Vehicle Availability Report</h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 3 }}>Current fleet status across all sites</p>
      </div>
      <div className="flex gap-2">
        <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs hover:bg-gray-50" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>Filter</button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--maroon)' }}>Export</button>
      </div>
    </div>

    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--cream)' }}>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Sr.</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Site</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Total</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Available</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>On Trip</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {[
            { sr: 1, site: 'Amber Fort', total: 12, available: 7, onTrip: 5, status: 'Active' },
            { sr: 2, site: 'Mehrangarh Fort', total: 10, available: 4, onTrip: 6, status: 'Active' },
            { sr: 3, site: 'Jaisalmer Fort', total: 8, available: 8, onTrip: 0, status: 'Active' },
            { sr: 4, site: 'Chittorgarh Fort', total: 6, available: 2, onTrip: 4, status: 'Active' },
            { sr: 5, site: 'Gagron Fort', total: 4, available: 1, onTrip: 3, status: 'Low' },
          ].map((row) => (
            <tr key={row.sr} style={{ borderBottom: '1px solid var(--sand)' }} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{row.sr}</td>
              <td className="px-4 py-3 text-sm">{row.site}</td>
              <td className="px-4 py-3 text-sm">{row.total}</td>
              <td className="px-4 py-3 text-sm">{row.available}</td>
              <td className="px-4 py-3 text-sm">{row.onTrip}</td>
              <td className="px-4 py-3 text-xs">
                <span className={clsx('px-2 py-1 rounded-full inline-flex items-center gap-1', row.status === 'Low' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-teal-700')}>
                  <span className={clsx('w-1.5 h-1.5 rounded-full', row.status === 'Low' ? 'bg-yellow-500' : 'bg-teal-500')}></span>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const DefaultReportView = ({ reportId, reportLabel, reportDescription }: { reportId: string; reportLabel: string; reportDescription: string }) => (
  <div className="space-y-5">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold font-serif" style={{ color: 'var(--ink)' }}>{reportLabel}</h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 3 }}>{reportDescription}</p>
      </div>
      <div className="flex gap-2">
        <button className="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs hover:bg-gray-50" style={{ borderColor: 'var(--sand)', color: 'var(--text-muted)' }}>Filter</button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--maroon)' }}>Export</button>
      </div>
    </div>

    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--sand)', background: '#fff', padding: '40px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Report data for {reportLabel} will be displayed here</p>
    </div>
  </div>
)

export default function InventoryReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('mis')
  const [isOpen, setIsOpen] = useState(false)
  const currentReport = REPORTS.find(r => r.id === activeReport)

  const renderReport = () => {
    switch (activeReport) {
      case 'mis':
        return <MISReportView />
      case 'country':
        return <CountryWiseView />
      case 'failed':
        return <FailedReportView />
      case 'vehicleavail':
        return <VehicleAvailView />
      case 'headdetail':
           return <HeadDetailedReportView />
      case 'headsummary':
          return <HeadSummaryReportView />
      case 'addon':
        return <AddonReportView />
      case 'headwisegst':
        return <HeadWiseGSTReportView/>

      case 'headwise':
        return <HeadWiseReportView />

      default:
        return <DefaultReportView reportId={activeReport} reportLabel={currentReport?.label || ''} reportDescription={currentReport?.description || ''} />
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter px-6 py-6 space-y-5">
          <SectionHeader title="Inventory Reports" right={<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Apr 2026</span>} />

          {/* Report Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left"
              style={{
                borderColor: 'var(--sand)',
                background: '#fff',
              }}
            >
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{currentReport?.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentReport?.description}</div>
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

            {isOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-lg z-10"
                style={{
                  borderColor: 'var(--sand)',
                  background: '#fff',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                {REPORTS.map(report => (
                  <button
                    key={report.id}
                    onClick={() => {
                      setActiveReport(report.id)
                      setIsOpen(false)
                    }}
                    className="w-full px-4 py-3 text-left border-b hover:bg-gray-50 transition"
                    style={{
                      borderColor: 'var(--sand)',
                      background: activeReport === report.id ? 'var(--cream)' : '#fff',
                    }}
                  >
                    <div className="font-semibold text-sm" style={{ color: activeReport === report.id ? 'var(--maroon)' : 'var(--ink)' }}>
                      {report.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{report.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Report Content */}
          {renderReport()}
        </main>
      </div>
    </div>
  )
}
