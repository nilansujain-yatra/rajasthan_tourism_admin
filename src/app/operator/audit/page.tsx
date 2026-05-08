'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import {
  AUDIT_REQUEST_TYPES,
  AUDIT_STATUS_OPTIONS,
  formatAuditDate,
  getAuditStatusLabel,
  getAuditStatusTone,
  normalizeAuditListResponse,
  toText,
  type AuditItem,
  type AuditRequestType,
  type AuditStatus,
} from '@/lib/audit'

type MyRequestView = 'active' | 'completed' | 'all'

type CreateFormState = {
  auditTitle: string
  description: string
  ssoId: string
  dueDate: string
}

function getTomorrowDateString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.toISOString().slice(0, 10)
}

function statusOptionsForView(view: MyRequestView, selectedStatuses: AuditStatus[]) {
  if (view === 'active') return ['IN_PROGRESS']
  if (view === 'completed') return ['COMPLETED']
  return selectedStatuses
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[28px] border bg-white px-6 py-12 text-center" style={{ borderColor: 'var(--sand)' }}>
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px]"
        style={{ background: 'rgba(200,146,42,0.12)', color: '#C8922A' }}
      >
        <AlertTriangle size={28} />
      </div>
      <div className="mt-4 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>{title}</div>
      <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{description}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function ActionMenu({
  row,
  source,
  onCancel,
}: {
  row: AuditItem
  source: 'my-request' | 'request-received'
  onCancel: (row: AuditItem) => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function close() {
      setOpen(false)
    }

    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const canCancel = source === 'my-request' && ['IN_PROGRESS', 'COMPLETED'].includes(row.status)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation()
          setOpen(current => !current)
        }}
        className="rounded-xl px-3 py-2"
        style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
      >
        <span className="block h-1 w-1 rounded-full" style={{ background: 'var(--text-muted)', boxShadow: '0 5px 0 var(--text-muted), 0 -5px 0 var(--text-muted)' }} />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-2xl border bg-white p-2"
          style={{ borderColor: 'var(--sand)', boxShadow: '0 18px 48px rgba(48, 24, 8, 0.14)' }}
          onClick={event => event.stopPropagation()}
        >
          <Link
            href={`/operator/audit/${row.id}?source=${source}`}
            className="block rounded-xl px-3 py-2"
            style={{ fontSize: 13, color: 'var(--text-dark)' }}
          >
            {source === 'request-received' && !row.image && row.status !== 'CANCELLED' ? 'Open / Submit Audit' : 'View Details'}
          </Link>
          {canCancel ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCancel(row)
              }}
              className="block w-full rounded-xl px-3 py-2 text-left"
              style={{ fontSize: 13, color: '#B83232' }}
            >
              Mark as Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CreateAuditDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<CreateFormState>({
    auditTitle: '',
    description: '',
    ssoId: '',
    dueDate: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreateFormState, string>>>({})
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    if (!open) {
      setForm({ auditTitle: '', description: '', ssoId: '', dueDate: '' })
      setErrors({})
      setVerified(false)
      setVerifyMessage('')
      setFormMessage('')
      setSubmitting(false)
      setVerifying(false)
    }
  }, [open])

  function validate(nextForm: CreateFormState) {
    const nextErrors: Partial<Record<keyof CreateFormState, string>> = {}
    if (!nextForm.auditTitle.trim()) nextErrors.auditTitle = 'Audit title is required.'
    if (!nextForm.description.trim()) nextErrors.description = 'Description is required.'
    if (!nextForm.ssoId.trim()) nextErrors.ssoId = 'SSO ID is required.'
    if (!nextForm.dueDate) nextErrors.dueDate = 'Due date is required.'
    return nextErrors
  }

  async function handleVerify() {
    const ssoId = form.ssoId.trim()
    if (!ssoId) {
      setErrors(current => ({ ...current, ssoId: 'SSO ID is required.' }))
      return
    }

    setVerifying(true)
    setVerifyMessage('')
    setVerified(false)

    try {
      const response = await fetch(`/api/audit/verify-sso?ssoId=${encodeURIComponent(ssoId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(toText(payload?.message, 'Unable to verify SSO ID.'))

      setVerified(true)
      setVerifyMessage(toText(payload?.message, `SSO ID ${ssoId} verified successfully.`))
      setErrors(current => ({ ...current, ssoId: undefined }))
    } catch (error) {
      setVerified(false)
      setVerifyMessage(error instanceof Error ? error.message : 'Unable to verify SSO ID.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    setFormMessage('')

    if (Object.keys(nextErrors).length > 0) return
    if (!verified) {
      setErrors(current => ({ ...current, ssoId: 'Verify the SSO ID before creating the audit.' }))
      return
    }

    setSubmitting(true)

    try {
      const dueDateEpoch = new Date(`${form.dueDate}T00:00:00+05:30`).getTime()
      const response = await fetch('/api/audit/create', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auditTitle: form.auditTitle.trim(),
          description: form.description.trim(),
          assignToSsoId: form.ssoId.trim(),
          dueDate: dueDateEpoch,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(toText(payload?.message, 'Unable to create audit.'))

      onCreated()
      onClose()
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Unable to create audit.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(28,16,8,0.38)', backdropFilter: 'blur(4px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white">
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--sand)' }}>
          <div>
            <div className="font-serif font-bold" style={{ fontSize: 28, color: 'var(--text-dark)' }}>Create Audit</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assign a fresh audit request to another operator user.</div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: '#F8F4EE', color: 'var(--maroon)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Audit Title
            </label>
            <input
              value={form.auditTitle}
              onChange={event => setForm(current => ({ ...current, auditTitle: event.target.value }))}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
              placeholder="Enter audit title"
            />
            {errors.auditTitle ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{errors.auditTitle}</div> : null}
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              rows={5}
              className="w-full resize-none rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
              placeholder="Describe the audit request"
            />
            {errors.description ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{errors.description}</div> : null}
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Assign To SSO ID
            </label>
            <div className="flex gap-3">
              <input
                value={form.ssoId}
                onChange={event => {
                  setVerified(false)
                  setVerifyMessage('')
                  setForm(current => ({ ...current, ssoId: event.target.value }))
                }}
                className="min-w-0 flex-1 rounded-2xl px-4 py-3 outline-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
                placeholder="Enter SSO ID"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || !form.ssoId.trim()}
                className="rounded-2xl px-4 py-3 font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1A7A6E 0%, #2E8F83 100%)' }}
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            {errors.ssoId ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{errors.ssoId}</div> : null}
            {verifyMessage ? (
              <div className="mt-3 rounded-2xl px-4 py-3" style={{ background: verified ? 'rgba(26,122,110,0.10)' : 'rgba(184,50,50,0.08)', color: verified ? '#1A7A6E' : '#B83232', fontSize: 13 }}>
                {verifyMessage}
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Due Date
            </label>
            <input
              type="date"
              min={getTomorrowDateString()}
              value={form.dueDate}
              onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))}
              className="w-full rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
            />
            {errors.dueDate ? <div className="mt-2" style={{ fontSize: 12, color: '#B83232' }}>{errors.dueDate}</div> : null}
          </div>

          {formMessage ? (
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(184,50,50,0.08)', color: '#B83232', fontSize: 13 }}>
              {formMessage}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl px-4 py-3 font-semibold"
              style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-2xl px-4 py-3 font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}
            >
              {submitting ? 'Creating...' : 'Create Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OperatorAuditPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTabParam = searchParams.get('tab')

  const initialTab = searchParams.get('tab')
  const [requestType, setRequestType] = useState<AuditRequestType>(
    initialTab === 'request-received' ? AUDIT_REQUEST_TYPES.REQUEST_RECEIVED : AUDIT_REQUEST_TYPES.MY_REQUEST
  )
  const [myRequestView, setMyRequestView] = useState<MyRequestView>(
    initialTab === 'completed' ? 'completed' : initialTab === 'all' ? 'all' : 'active'
  )
  const [searchInput, setSearchInput] = useState('')
  const [searchKey, setSearchKey] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<AuditStatus[]>([])
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<AuditItem[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const effectiveStatuses = useMemo(
    () => requestType === AUDIT_REQUEST_TYPES.MY_REQUEST
      ? statusOptionsForView(myRequestView, selectedStatuses)
      : selectedStatuses,
    [myRequestView, requestType, selectedStatuses],
  )

  const activeTabLabel = useMemo(() => {
    if (requestType === AUDIT_REQUEST_TYPES.REQUEST_RECEIVED) return 'Request Received'
    if (myRequestView === 'completed') return 'Recently Complete'
    if (myRequestView === 'all') return 'All'
    return 'Active'
  }, [myRequestView, requestType])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchKey(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const tab = requestType === AUDIT_REQUEST_TYPES.REQUEST_RECEIVED ? 'request-received' : myRequestView
    if (currentTabParam === tab) return
    const next = new URLSearchParams(searchParams.toString())
    next.set('tab', tab)
    router.replace(`${pathname}?${next.toString()}`)
  }, [currentTabParam, myRequestView, pathname, requestType, router, searchParams])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      try {
        const query = new URLSearchParams({
          offSet: String(page - 1),
          size: String(pageSize),
          searchKey,
          requestType,
        })

        effectiveStatuses.forEach(status => query.append('status', status))

        const response = await fetch(`/api/audit/list?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(toText(payload?.message, 'Unable to fetch audit list.'))

        const result = normalizeAuditListResponse(payload)
        setRows(result.auditDtos)
        setTotalRecords(result.totalRecords)
      } catch (loadError) {
        setRows([])
        setTotalRecords(0)
        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch audit list.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [effectiveStatuses, page, pageSize, refreshKey, requestType, searchKey])

  useEffect(() => {
    setPage(1)
  }, [requestType, myRequestView, selectedStatuses])

  useEffect(() => {
    function close() {
      setStatusFilterOpen(false)
    }

    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  async function handleCancel(row: AuditItem) {
    const confirmed = window.confirm(`Mark "${row.auditTitle || 'this audit'}" as cancelled?`)
    if (!confirmed) return

    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch('/api/audit/cancel', {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: row.id, status: true }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(toText(payload?.message, 'Unable to cancel audit.'))

      setSuccessMessage(toText(payload?.message, 'Audit cancelled successfully.'))
      setRefreshKey(current => current + 1)
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel audit.')
    }
  }

  function toggleStatus(status: AuditStatus) {
    setSelectedStatuses(current => current.includes(status)
      ? current.filter(item => item !== status)
      : [...current, status]
    )
  }

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const showRequestReceivedColumns = requestType === AUDIT_REQUEST_TYPES.REQUEST_RECEIVED

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter">
          <div className="space-y-6 px-6 py-6">
            <div className="overflow-hidden rounded-[30px] text-white" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}>
              <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                 
                  <h1 className="mt-3 font-serif text-3xl font-bold">Audit</h1>
          
                </div>

                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white"
                  style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  <Plus size={16} />
                  Create Audit
                </button>
              </div>

              <div className="grid gap-px md:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
                {[
                  { label: 'Request Type', value: requestType === AUDIT_REQUEST_TYPES.MY_REQUEST ? 'My Request' : 'Request Received' },
                  { label: 'Active View', value: activeTabLabel },
                  { label: 'Records', value: String(totalRecords) },
                  { label: 'Selected Filters', value: effectiveStatuses.length ? String(effectiveStatuses.length) : 'All' },
                ].map(card => (
                  <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{card.label}</div>
                    <div className="mt-1 font-semibold" style={{ fontSize: 18, color: '#fff' }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
            {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(184,50,50,0.08)', color: '#B83232', fontSize: 13 }}>{error}</div> : null}

            <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: AUDIT_REQUEST_TYPES.MY_REQUEST, label: 'My Request' },
                      { key: AUDIT_REQUEST_TYPES.REQUEST_RECEIVED, label: 'Request Received' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setRequestType(tab.key)}
                        className="rounded-full px-4 py-2 font-semibold"
                        style={{
                          background: requestType === tab.key ? 'rgba(139,26,26,0.08)' : '#F8F4EE',
                          border: `1px solid ${requestType === tab.key ? 'rgba(139,26,26,0.22)' : 'var(--sand)'}`,
                          color: requestType === tab.key ? 'var(--maroon)' : 'var(--text-mid)',
                          fontSize: 13,
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {requestType === AUDIT_REQUEST_TYPES.MY_REQUEST ? (
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'active' as const, label: 'Active' },
                        { key: 'completed' as const, label: 'Recently Complete' },
                        { key: 'all' as const, label: 'All' },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setMyRequestView(tab.key)}
                          className="rounded-full px-4 py-2 font-semibold"
                          style={{
                            background: myRequestView === tab.key ? 'rgba(26,122,110,0.10)' : '#fff',
                            border: `1px solid ${myRequestView === tab.key ? 'rgba(26,122,110,0.18)' : 'var(--sand)'}`,
                            color: myRequestView === tab.key ? '#1A7A6E' : 'var(--text-mid)',
                            fontSize: 13,
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="relative min-w-[280px]">
                    <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
                    <input
                      value={searchInput}
                      onChange={event => setSearchInput(event.target.value)}
                      placeholder={showRequestReceivedColumns ? 'Search by requester, title or description' : 'Search by assignee, title or description'}
                      className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none"
                      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
                    />
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation()
                        setStatusFilterOpen(current => !current)
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-3"
                      style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-dark)' }}
                    >
                      <Filter size={15} />
                      Filters
                      <ChevronDown size={15} />
                    </button>

                    {statusFilterOpen ? (
                      <div
                        className="absolute right-0 z-20 mt-2 w-64 rounded-[24px] border bg-white p-4"
                        style={{ borderColor: 'var(--sand)', boxShadow: '0 18px 48px rgba(48,24,8,0.14)' }}
                        onClick={event => event.stopPropagation()}
                      >
                        <div className="mb-3 font-semibold" style={{ fontSize: 13, color: 'var(--text-dark)' }}>Audit Statuses</div>
                        <div className="space-y-2">
                          {AUDIT_STATUS_OPTIONS.map(status => {
                            const locked = requestType === AUDIT_REQUEST_TYPES.MY_REQUEST && (
                              (myRequestView === 'active' && status === 'IN_PROGRESS') ||
                              (myRequestView === 'completed' && status === 'COMPLETED')
                            )

                            const checked = locked || selectedStatuses.includes(status)

                            return (
                              <label
                                key={status}
                                className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2"
                                style={{ background: '#F8F4EE', color: 'var(--text-dark)' }}
                              >
                                <span style={{ fontSize: 13 }}>{getAuditStatusLabel(status)}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={() => toggleStatus(status)}
                                />
                              </label>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedStatuses([])}
                          className="mt-3 w-full rounded-2xl px-4 py-2 font-medium"
                          style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 13 }}
                        >
                          Clear Optional Filters
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {effectiveStatuses.length ? effectiveStatuses.map(status => {
                  const tone = getAuditStatusTone(status)
                  return (
                    <span
                      key={status}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                      style={{ background: tone.background, color: tone.color, fontSize: 12, fontWeight: 700 }}
                    >
                      <Check size={12} />
                      {getAuditStatusLabel(status)}
                    </span>
                  )
                }) : (
                  <span className="rounded-full px-3 py-1.5" style={{ background: '#F8F4EE', color: 'var(--text-muted)', fontSize: 12 }}>
                    All statuses
                  </span>
                )}
              </div>
            </section>

            {loading ? (
              <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                <div className="space-y-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl" style={{ background: '#F8F4EE' }} />
                  ))}
                </div>
              </section>
            ) : rows.length === 0 ? (
              <EmptyState
                title={searchKey ? 'No records found' : 'No audit records yet'}
                description={searchKey ? 'Try a different keyword or relax the selected filters.' : 'Create a new audit or switch tabs to view other audit requests.'}
                action={requestType === AUDIT_REQUEST_TYPES.MY_REQUEST ? (
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="rounded-2xl px-5 py-3 font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}
                  >
                    Create Audit
                  </button>
                ) : undefined}
              />
            ) : (
              <section className="rounded-[28px] border bg-white p-3 md:p-4" style={{ borderColor: 'var(--sand)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px]">
                    <thead>
                      <tr style={{ background: '#F8F4EE' }}>
                        {(showRequestReceivedColumns
                          ? ['Request From', 'Audit Title', 'Description', 'Submitted Date', 'Requested Date', 'Due Date', 'Status', '']
                          : myRequestView === 'active'
                            ? ['Audit Title', 'Description', 'User', 'Due Date', 'Status', '']
                            : ['Audit Title', 'Description', 'User', 'Submitted Date', 'Due Date', 'Status', '']
                        ).map(header => (
                          <th key={header} className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => {
                        const tone = getAuditStatusTone(row.status)
                        const isDueDate = row.status === 'DUE_DATE'

                        return (
                          <tr
                            key={row.id}
                            style={{
                              borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)',
                              background: isDueDate ? 'rgba(184,50,50,0.03)' : '#fff',
                            }}
                          >
                            {showRequestReceivedColumns ? (
                              <>
                                <td className="px-4 py-4">
                                  <div className="inline-flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
                                      <UserRound size={16} />
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{row.createdBy || 'N/A'}</div>
                                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.createdBySsoId || 'N/A'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{row.auditTitle || 'N/A'}</td>
                                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 280 }}>{row.description || 'N/A'}</td>
                                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatAuditDate(row.auditSubmitDate)}</td>
                                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatAuditDate(row.createdDate)}</td>
                                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatAuditDate(row.dueDate)}</td>
                                <td className="px-4 py-4">
                                  <span className="rounded-full px-3 py-1.5" style={{ background: tone.background, color: tone.color, fontSize: 11, fontWeight: 700 }}>
                                    {getAuditStatusLabel(row.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <ActionMenu row={row} source="request-received" onCancel={handleCancel} />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{row.auditTitle || 'N/A'}</td>
                                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 280 }}>{row.description || 'N/A'}</td>
                                <td className="px-4 py-4">
                                  <div>
                                    <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{row.assignToUserName || 'N/A'}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.assignToSsoId || 'N/A'}</div>
                                  </div>
                                </td>
                                {myRequestView !== 'active' ? (
                                  <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatAuditDate(row.auditSubmitDate)}</td>
                                ) : null}
                                <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatAuditDate(row.dueDate)}</td>
                                <td className="px-4 py-4">
                                  <span className="rounded-full px-3 py-1.5" style={{ background: tone.background, color: tone.color, fontSize: 11, fontWeight: 700 }}>
                                    {getAuditStatusLabel(row.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <ActionMenu row={row} source="my-request" onCancel={handleCancel} />
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Showing {rows.length} of {totalRecords} records
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={pageSize}
                      onChange={event => {
                        setPageSize(Number(event.target.value))
                        setPage(1)
                      }}
                      className="rounded-2xl px-3 py-2 outline-none"
                      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
                    >
                      {[10, 20, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
                    </select>

                    <button
                      type="button"
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                      disabled={page <= 1}
                      className="rounded-2xl px-4 py-2 disabled:opacity-50"
                      style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-dark)' }}
                    >
                      Previous
                    </button>
                    <div style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 700 }}>
                      Page {page} of {totalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                      disabled={page >= totalPages}
                      className="rounded-2xl px-4 py-2 disabled:opacity-50"
                      style={{ background: '#fff', border: '1px solid var(--sand)', fontSize: 13, color: 'var(--text-dark)' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      <CreateAuditDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setSuccessMessage('Audit created successfully.')
          setRefreshKey(current => current + 1)
        }}
      />
    </div>
  )
}
