'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'

type IssueSubType = {
  id: string
  name: string
  active: boolean
}

type IssueTypeRow = {
  id: string
  issueType: string
  active: boolean
  subTypes: IssueSubType[]
}

type ConfirmState =
  | { mode: 'issue'; row: IssueTypeRow }
  | { mode: 'sub'; parentId: string; row: IssueSubType }
  | null

type IssueDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  value: string
  row: IssueTypeRow | null
}

type SubIssueDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  value: string
  parentId: string
  parentLabel: string
  row: IssueSubType | null
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (typeof value === 'number') return value === 1
  return false
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}

function getRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function findFirstArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return null
  for (const candidate of Object.values(value as Record<string, unknown>)) {
    const found = findFirstArray(candidate)
    if (found) return found
  }
  return null
}

function mapSubType(item: unknown): IssueSubType | null {
  const row = getRecord(item)
  if (!row) return null

  const id = toText(row.id)
  const name = toText(row.name ?? row.issueType)

  if (!id || !name) return null

  return {
    id,
    name,
    active: toBoolean(row.active),
  }
}

function extractIssueTypes(payload: unknown): IssueTypeRow[] {
  const root = getRecord(payload)
  const result = getRecord(root?.result)
  const list = Array.isArray(result?.issueTypeDtos)
    ? result?.issueTypeDtos
    : findFirstArray(result) ?? findFirstArray(payload) ?? []

  return list
    .map(item => {
      const row = getRecord(item)
      if (!row) return null

      const id = toText(row.id)
      const issueType = toText(row.issueType ?? row.name)
      if (!id || !issueType) return null

      const subList = Array.isArray(row.issueSubTypeDtoList)
        ? row.issueSubTypeDtoList
        : Array.isArray(row.subIssueTypeDtos)
        ? row.subIssueTypeDtos
        : []

      return {
        id,
        issueType,
        active: toBoolean(row.active),
        subTypes: subList.map(mapSubType).filter((item): item is IssueSubType => Boolean(item)),
      }
    })
    .filter((item): item is IssueTypeRow => Boolean(item))
}

function extractSubTypes(payload: unknown): IssueSubType[] {
  const root = getRecord(payload)
  const result = getRecord(root?.result)
  const issueDtos = Array.isArray(result?.issueTypeDtos) ? result.issueTypeDtos : []

  if (issueDtos.length > 0) {
    const first = getRecord(issueDtos[0])
    const subList = Array.isArray(first?.issueSubTypeDtoList)
      ? first.issueSubTypeDtoList
      : Array.isArray(first?.subIssueTypeDtos)
      ? first.subIssueTypeDtos
      : []
    return subList.map(mapSubType).filter((item): item is IssueSubType => Boolean(item))
  }

  const directList = Array.isArray(result?.issueSubTypeDtoList)
    ? result.issueSubTypeDtoList
    : findFirstArray(payload) ?? []

  return directList.map(mapSubType).filter((item): item is IssueSubType => Boolean(item))
}

function statusStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
}

function inputStyle() {
  return {
    width: '100%',
    border: '1px solid var(--sand)',
    borderRadius: 16,
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--text-dark)',
    outline: 'none',
    background: '#fff',
  } as const
}

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-6" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</h3>
            {subtitle ? <p className="mt-1" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1.5" style={{ background: '#F8F4EE', color: 'var(--text-muted)', fontSize: 12 }}>Close</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({
  open,
  title,
  note,
  label,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  note: string
  label: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center px-4" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="font-serif" style={{ fontSize: 24, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</div>
        <p className="mt-2" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{note}</p>
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', fontSize: 13, color: 'var(--text-dark)' }}>{label}</div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>{loading ? 'Saving...' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  )
}

export default function HelpdeskIssueTypePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [rows, setRows] = useState<IssueTypeRow[]>([])
  const [expandedId, setExpandedId] = useState('')
  const [subLoadingId, setSubLoadingId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [menuIssueId, setMenuIssueId] = useState('')
  const [menuSubId, setMenuSubId] = useState('')
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [issueDialog, setIssueDialog] = useState<IssueDialogState>({
    open: false,
    mode: 'create',
    value: '',
    row: null,
  })
  const [subDialog, setSubDialog] = useState<SubIssueDialogState>({
    open: false,
    mode: 'create',
    value: '',
    parentId: '',
    parentLabel: '',
    row: null,
  })

  async function fetchJson(url: string, fallback: string, init?: RequestInit) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
      ...init,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractMessage(payload, fallback))
    return payload
  }

  async function loadIssueTypes(showLoader = true) {
    try {
      if (showLoader) setLoading(true)
      setError('')
      const payload = await fetchJson('/api/system/helpdesk-issue-type', 'Unable to fetch issue types.')
      setRows(extractIssueTypes(payload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch issue types.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadIssueTypes(true)
  }, [])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    function closeMenus() {
      setMenuIssueId('')
      setMenuSubId('')
    }

    if (!menuIssueId && !menuSubId) return
    window.addEventListener('click', closeMenus)
    return () => window.removeEventListener('click', closeMenus)
  }, [menuIssueId, menuSubId])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter(row =>
      row.issueType.toLowerCase().includes(query) ||
      row.subTypes.some(sub => sub.name.toLowerCase().includes(query)),
    )
  }, [rows, search])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const totalRecords = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  async function refreshSubTypes(issueTypeId: string) {
    const payload = await fetchJson(`/api/system/helpdesk-issue-subtype?issueTypeId=${encodeURIComponent(issueTypeId)}`, 'Unable to fetch sub issue types.')
    const subTypes = extractSubTypes(payload)
    setRows(current => current.map(row => row.id === issueTypeId ? { ...row, subTypes } : row))
  }

  async function toggleExpand(issueTypeId: string) {
    const willOpen = expandedId !== issueTypeId
    setExpandedId(current => current === issueTypeId ? '' : issueTypeId)
    if (!willOpen) return

    try {
      setSubLoadingId(issueTypeId)
      await refreshSubTypes(issueTypeId)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch sub issue types.')
    } finally {
      setSubLoadingId('')
    }
  }

  async function submitIssueType() {
    try {
      setSaving(true)
      setError('')
      const issueType = issueDialog.value.trim()
      if (!issueType) throw new Error('Issue name is required.')

      const payload = issueDialog.mode === 'edit' && issueDialog.row
        ? { id: issueDialog.row.id, issueType, active: issueDialog.row.active }
        : { issueType, active: true }

      const response = await fetchJson('/api/system/helpdesk-issue-type', issueDialog.mode === 'edit' ? 'Unable to update issue type.' : 'Unable to create issue type.', {
        method: issueDialog.mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setIssueDialog({ open: false, mode: 'create', value: '', row: null })
      setSuccessMessage(extractMessage(response, issueDialog.mode === 'edit' ? 'Issue type updated successfully.' : 'Issue type created successfully.'))
      await loadIssueTypes(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save issue type.')
    } finally {
      setSaving(false)
    }
  }

  async function submitSubIssueType() {
    try {
      setSaving(true)
      setError('')
      const name = subDialog.value.trim()
      if (!name) throw new Error('Sub issue name is required.')
      if (!subDialog.parentId) throw new Error('Issue type is required.')

      const payload = subDialog.mode === 'edit' && subDialog.row
        ? { id: subDialog.row.id, name, active: subDialog.row.active, issueTypeId: subDialog.parentId }
        : { name, active: true, issueTypeId: subDialog.parentId }

      const response = await fetchJson('/api/system/helpdesk-issue-subtype', subDialog.mode === 'edit' ? 'Unable to update sub issue type.' : 'Unable to create sub issue type.', {
        method: subDialog.mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const parentId = subDialog.parentId
      setSubDialog({ open: false, mode: 'create', value: '', parentId: '', parentLabel: '', row: null })
      setExpandedId(parentId)
      setSuccessMessage(extractMessage(response, subDialog.mode === 'edit' ? 'Sub issue type updated successfully.' : 'Sub issue type created successfully.'))
      await refreshSubTypes(parentId)
      await loadIssueTypes(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save sub issue type.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmToggleStatus() {
    if (!confirmState) return

    try {
      setSaving(true)
      setError('')

      if (confirmState.mode === 'issue') {
        const payload = {
          id: confirmState.row.id,
          issueType: confirmState.row.issueType,
          active: !confirmState.row.active,
        }

        const response = await fetchJson('/api/system/helpdesk-issue-type', 'Unable to update issue type status.', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        setSuccessMessage(extractMessage(response, !confirmState.row.active ? 'Issue type activated successfully.' : 'Issue type deactivated successfully.'))
        await loadIssueTypes(false)
      } else {
        const payload = {
          id: confirmState.row.id,
          name: confirmState.row.name,
          active: !confirmState.row.active,
          issueTypeId: confirmState.parentId,
        }

        const response = await fetchJson('/api/system/helpdesk-issue-subtype', 'Unable to update sub issue type status.', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        setSuccessMessage(extractMessage(response, !confirmState.row.active ? 'Sub issue type activated successfully.' : 'Sub issue type deactivated successfully.'))
        await refreshSubTypes(confirmState.parentId)
        await loadIssueTypes(false)
      }

      setConfirmState(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update status.')
    } finally {
      setSaving(false)
    }
  }

  const issueCount = rows.length
  const subIssueCount = rows.reduce((count, row) => count + row.subTypes.length, 0)
  const activeCount = rows.filter(row => row.active).length

  const pageContent = loading ? (
    <div className="px-6 py-6">
      <RajasthanLoader label="Loading helpdesk issue types..." />
    </div>
  ) : (
    <div className="space-y-6 px-6 py-6">
      <div
  className="overflow-hidden rounded-[24px]"
  style={{
    background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 48%, #C8922A 100%)',
    boxShadow: '0 16px 40px rgba(107,18,18,0.18)',
  }}
>
  <div className="flex items-center justify-between px-6 py-4 lg:px-8">
    
    {/* Left Side */}
    <div className="flex items-center gap-3 min-w-0">
      <h1
        className="font-serif truncate"
        style={{
          fontSize: 26,
          lineHeight: 1,
          color: '#fff',
          fontWeight: 700,
          margin: 0,
        }}
      >
        Helpdesk Issue Type
      </h1>
    </div>

    {/* Right Side */}
    <div className="flex items-center gap-3">
      <button
        onClick={() =>
          setIssueDialog({
            open: true,
            mode: 'create',
            value: '',
            row: null,
          })
        }
        className="rounded-2xl px-4 py-2.5 font-semibold transition-all"
        style={{
          background: '#fff',
          color: '#7A3C13',
          fontSize: 13,
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={15} />
          Create
        </span>
      </button>
    </div>

  </div>
</div>

      {/* <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Issue Types', value: issueCount, tone: 'var(--maroon)' },
          { label: 'Sub Issue Types', value: subIssueCount, tone: 'var(--teal)' },
          { label: 'Active Types', value: activeCount, tone: 'var(--gold)' },
        ].map(item => (
          <div key={item.label} className="rounded-[28px] border bg-white px-5 py-4" style={{ borderColor: 'var(--cream-dark)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{item.label}</div>
            <div className="font-serif font-bold" style={{ fontSize: 28, color: item.tone, marginTop: 4 }}>{item.value}</div>
          </div>
        ))}
      </div> */}

      {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
        {/* <SectionHeader
          title="Issue Type Management"
          right={(
            <div className="relative w-full min-w-[260px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search issue or sub issue type"
                className="w-full rounded-2xl py-3 pl-10 pr-10 outline-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }}
              />
              {search ? (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  <X size={15} />
                </button>
              ) : null}
            </div>
          )}
        /> */}

        {pagedRows.length === 0 ? (
          <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
            <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>Helpdesk Issue Types</div>
            <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {search.trim() ? 'No issue types match the current search.' : 'No helpdesk issue types have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pagedRows.map(row => {
              const issueMenuOpen = menuIssueId === row.id
              const isExpanded = expandedId === row.id

              return (
                <div key={row.id} className="relative overflow-visible rounded-[28px] border bg-white" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      onClick={() => void toggleExpand(row.id)}
                      className="flex flex-1 items-center gap-4 text-left"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#F8F4EE', color: 'var(--maroon)' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronsUpDown size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif" style={{ fontSize: 20, color: 'var(--text-dark)', fontWeight: 700, lineHeight: 1.2 }}>{row.issueType}</div>
                       
                      </div>
                    </button>

                    <div className="relative z-30 flex items-center gap-3">
                      <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(row.active) }}>
                        {row.active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          setMenuSubId('')
                          setMenuIssueId(current => current === row.id ? '' : row.id)
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ background: '#F8F4EE', color: 'var(--text-mid)' }}
                      >
                        <Menu size={16} />
                      </button>

                      {issueMenuOpen ? (
                        <div
                          className="absolute right-0 top-12 z-[80] w-52 overflow-visible rounded-2xl"
                          style={{ background: '#fff', border: '1px solid var(--sand)', boxShadow: '0 16px 32px rgba(27,18,10,0.12)' }}
                          onClick={event => event.stopPropagation()}
                        >
                          <button
                            className="block w-full px-4 py-3 text-left"
                            style={{ fontSize: 13, color: 'var(--text-dark)' }}
                            onClick={() => {
                              setMenuIssueId('')
                              setIssueDialog({ open: true, mode: 'edit', value: row.issueType, row })
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="block w-full px-4 py-3 text-left"
                            style={{ fontSize: 13, color: row.active ? 'var(--maroon)' : '#1A7A6E', borderTop: '1px solid var(--sand)' }}
                            onClick={() => {
                              setMenuIssueId('')
                              setConfirmState({ mode: 'issue', row })
                            }}
                          >
                            {row.active ? 'Inactive' : 'Active'}
                          </button>
                          <button
                            className="block w-full px-4 py-3 text-left"
                            style={{ fontSize: 13, color: 'var(--text-dark)', borderTop: '1px solid var(--sand)' }}
                            onClick={() => {
                              setMenuIssueId('')
                              setSubDialog({
                                open: true,
                                mode: 'create',
                                value: '',
                                parentId: row.id,
                                parentLabel: row.issueType,
                                row: null,
                              })
                            }}
                          >
                            Add Sub Issue Type
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t px-5 py-5" style={{ borderColor: 'var(--cream-dark)', background: '#FCF7F0' }}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        {/* <div>
                          <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>Sub Issue Types</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Manage sub issue types under {row.issueType}.</div>
                        </div> */}
                        <button
                          onClick={() => setSubDialog({
                            open: true,
                            mode: 'create',
                            value: '',
                            parentId: row.id,
                            parentLabel: row.issueType,
                            row: null,
                          })}
                          className="rounded-2xl px-4 py-2.5 font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 12 }}
                        >
                          <span className="inline-flex items-center gap-2"><Plus size={14} />Create</span>
                        </button>
                      </div>

                      {subLoadingId === row.id ? (
                        <RajasthanLoader label="Loading sub issue types..." />
                      ) : row.subTypes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed px-5 py-10 text-center" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
                          <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>No Sub Issue Types</div>
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Create the first sub issue type for this issue.</p>
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {row.subTypes.map(sub => {
                            const subMenuOpen = menuSubId === sub.id
                            return (
                              <div key={sub.id} className="relative overflow-visible rounded-[24px] border bg-white p-4" style={{ borderColor: 'var(--cream-dark)' }}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div
                                      className="font-semibold break-words leading-snug"
                                      style={{ fontSize: 15, color: 'var(--text-dark)' }}
                                    >{sub.name}</div>
                                    <div className="mt-2">
                                      <span className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 11, ...statusStyle(sub.active) }}>
                                        {sub.active ? 'Active' : 'Inactive'}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={event => {
                                      event.stopPropagation()
                                      setMenuIssueId('')
                                      setMenuSubId(current => current === sub.id ? '' : sub.id)
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full"
                                    style={{ background: '#F8F4EE', color: 'var(--text-mid)' }}
                                  >
                                    <Menu size={15} />
                                  </button>
                                </div>

                                {subMenuOpen ? (
                                  <div
                                    className="absolute right-4 top-14 z-[90] w-44 overflow-hidden rounded-2xl"
                                    style={{ background: '#fff', border: '1px solid var(--sand)', boxShadow: '0 16px 32px rgba(27,18,10,0.12)' }}
                                    onClick={event => event.stopPropagation()}
                                  >
                                    <button
                                      className="block w-full px-4 py-3 text-left"
                                      style={{ fontSize: 13, color: 'var(--text-dark)' }}
                                      onClick={() => {
                                        setMenuSubId('')
                                        setSubDialog({
                                          open: true,
                                          mode: 'edit',
                                          value: sub.name,
                                          parentId: row.id,
                                          parentLabel: row.issueType,
                                          row: sub,
                                        })
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="block w-full px-4 py-3 text-left"
                                      style={{ fontSize: 13, color: sub.active ? 'var(--maroon)' : '#1A7A6E', borderTop: '1px solid var(--sand)' }}
                                      onClick={() => {
                                        setMenuSubId('')
                                        setConfirmState({ mode: 'sub', parentId: row.id, row: sub })
                                      }}
                                    >
                                      {sub.active ? 'Inactive' : 'Active'}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--cream-dark)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-dark)' }}>{totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRecords)}</strong> of <strong style={{ color: 'var(--text-dark)' }}>{totalRecords}</strong>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={String(pageSize)}
                  onChange={event => {
                    setPageSize(Number(event.target.value))
                    setPage(1)
                  }}
                  className="rounded-xl px-3 py-2 outline-none"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12 }}
                >
                  {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} / page</option>)}
                </select>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="rounded-xl px-3 py-2 font-medium" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-dark)' }}>
                    {page} / {totalPages}
                  </div>
                  <button
                    onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40"
                    style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={issueDialog.open}
        title={issueDialog.mode === 'edit' ? 'Edit Issue Type' : 'Create Issue Type'}
        subtitle="Enter the helpdesk issue type name."
        onClose={() => setIssueDialog({ open: false, mode: 'create', value: '', row: null })}
      >
        <div className="space-y-5">
          <label className="space-y-2">
            <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Issue Type</span>
            <input
              value={issueDialog.value}
              onChange={event => setIssueDialog(current => ({ ...current, value: event.target.value }))}
              style={inputStyle()}
              placeholder="Enter issue name"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIssueDialog({ open: false, mode: 'create', value: '', row: null })} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
              Cancel
            </button>
            <button onClick={() => void submitIssueType()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
              {saving ? 'Saving...' : issueDialog.mode === 'edit' ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={subDialog.open}
        title={subDialog.mode === 'edit' ? 'Edit Sub Issue Type' : 'Create Sub Issue Type'}
        subtitle={subDialog.parentLabel ? `Issue Type: ${subDialog.parentLabel}` : 'Enter the sub issue type name.'}
        onClose={() => setSubDialog({ open: false, mode: 'create', value: '', parentId: '', parentLabel: '', row: null })}
      >
        <div className="space-y-5">
          <label className="space-y-2">
            <span className="block font-medium" style={{ fontSize: 12, color: 'var(--text-mid)' }}>Sub Issue Type</span>
            <input
              value={subDialog.value}
              onChange={event => setSubDialog(current => ({ ...current, value: event.target.value }))}
              style={inputStyle()}
              placeholder="Enter sub issue name"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button onClick={() => setSubDialog({ open: false, mode: 'create', value: '', parentId: '', parentLabel: '', row: null })} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>
              Cancel
            </button>
            <button onClick={() => void submitSubIssueType()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>
              {saving ? 'Saving...' : subDialog.mode === 'edit' ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.mode === 'issue'
            ? confirmState.row.active ? 'Deactivate issue type?' : 'Activate issue type?'
            : confirmState?.row.active ? 'Deactivate sub issue type?' : 'Activate sub issue type?'
        }
        note={
          confirmState?.mode === 'issue'
            ? `This will ${confirmState.row.active ? 'deactivate' : 'activate'} the selected issue type.`
            : `This will ${confirmState?.row.active ? 'deactivate' : 'activate'} the selected sub issue type.`
        }
        label={confirmState?.mode === 'issue' ? confirmState.row.issueType : confirmState?.row.name ?? ''}
        loading={saving}
        onClose={() => setConfirmState(null)}
        onConfirm={() => void confirmToggleStatus()}
      />
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter">
          {pageContent}
        </main>
      </div>
    </div>
  )
}
