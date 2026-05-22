'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { Building2, Mail, Phone, Plus, Search, ShieldCheck, Store, Trash2, UserRound } from 'lucide-react'

type VendorRow = {
  id: string
  vendorPlaceId: string
  userId: string
  displayName: string
  ssoId: string
  companyName: string
  companyRegistrationNumber: string
  email: string
  mobile: string
  isActive: boolean
}

type VendorOption = {
  id: string
  userId: string
  name: string
  ssoId: string
}

type VendorDraft = {
  vendorId: string
}

type ConfirmState =
  | { mode: 'status'; row: VendorRow }
  | { mode: 'delete'; row: VendorRow }
  | null

const DEFAULT_DRAFT: VendorDraft = {
  vendorId: '',
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : fallback
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}

function findArray(payload: unknown, keys: string[]): unknown[] {
  if (!payload || typeof payload !== 'object') return []
  const queue: unknown[] = [payload]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== 'object' || Array.isArray(current)) continue
    const row = current as Record<string, unknown>
    for (const key of keys) {
      if (Array.isArray(row[key])) return row[key] as unknown[]
    }
    Object.values(row).forEach(value => {
      if (value && typeof value === 'object') queue.push(value)
    })
  }
  return []
}

function extractVendors(payload: unknown): VendorRow[] {
  return findArray(payload, ['vendorPlaceDetailsDtos', 'vendorRequestDtos', 'result'])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id ?? row.vendorPlaceId),
        vendorPlaceId: toText(row.id ?? row.vendorPlaceId),
        userId: toText(row.userId ?? row.vendorId),
        displayName: toText(row.displayName ?? row.name),
        ssoId: toText(row.ssoId),
        companyName: toText(row.companyName),
        companyRegistrationNumber: toText(row.companyRegistrationNumber),
        email: toText(row.email),
        mobile: toText(row.mobile),
        isActive: Boolean(row.isActive ?? row.active ?? row.status),
      }
    })
    .filter(item => item.vendorPlaceId)
}

function extractVendorOptions(payload: unknown): VendorOption[] {
  return findArray(payload, ['roleResponseDtos', 'users', 'result'])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.userId ?? row.id),
        userId: toText(row.userId ?? row.id),
        name: toText(row.name ?? row.displayName),
        ssoId: toText(row.ssoId),
      }
    })
    .filter(item => item.userId && item.name)
}

function statusStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4" style={{ background: 'rgba(20,14,10,0.55)' }}>
      <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
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
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  note: string
  label: string
  loading: boolean
  danger?: boolean
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
          <button onClick={onConfirm} disabled={loading} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: danger ? 'linear-gradient(135deg, #8B1A1A 0%, #C04E4E 100%)' : 'linear-gradient(135deg, #1A7A6E 0%, #58A99C 100%)', fontSize: 14 }}>{loading ? 'Please wait...' : danger ? 'Delete' : 'Update'}</button>
        </div>
      </div>
    </div>
  )
}

export default function PlaceVendorManagementView({
  placeId,
}: {
  placeId: string
}) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([])
  const [draft, setDraft] = useState<VendorDraft>(DEFAULT_DRAFT)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)

  async function fetchJson(url: string, fallback: string) {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractMessage(payload, fallback))
    return payload
  }

  async function loadVendors(showLoader = true) {
    if (!placeId) return
    if (showLoader) setLoading(true)

    try {
      setError('')
      const [vendorPayload, optionsPayload] = await Promise.all([
        fetchJson(`/api/place/vendors?placeId=${encodeURIComponent(placeId)}&searchKey=&size=200&offSet=0`, 'Unable to fetch place vendors.'),
        fetchJson('/api/place/vendors/options?searchKey=', 'Unable to fetch vendor options.'),
      ])
      setVendors(extractVendors(vendorPayload))
      setVendorOptions(extractVendorOptions(optionsPayload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch place vendors.')
      setVendors([])
      setVendorOptions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVendors(true)
  }, [placeId])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return vendors
    return vendors.filter(item =>
      item.displayName.toLowerCase().includes(query) ||
      item.ssoId.toLowerCase().includes(query) ||
      item.companyName.toLowerCase().includes(query),
    )
  }, [search, vendors])

  async function addVendor() {
    if (!draft.vendorId) {
      setError('Please select a vendor to add.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/place/vendors', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          vendorId: draft.vendorId,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to add vendor.'))

      setSuccessMessage(extractMessage(payload, 'Vendor added successfully.'))
      setDialogOpen(false)
      setDraft(DEFAULT_DRAFT)
      await loadVendors(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add vendor.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmAction() {
    if (!confirmState) return

    setSaving(true)
    setError('')
    try {
      const response = await fetch(
        confirmState.mode === 'delete'
          ? `/api/place/vendors?vendorPlaceId=${encodeURIComponent(confirmState.row.vendorPlaceId)}`
          : `/api/place/vendors?vendorPlaceId=${encodeURIComponent(confirmState.row.vendorPlaceId)}&activate=${encodeURIComponent(String(!confirmState.row.isActive))}`,
        {
          method: confirmState.mode === 'delete' ? 'DELETE' : 'PUT',
          headers: { Accept: 'application/json' },
        },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, `Unable to ${confirmState.mode === 'delete' ? 'delete vendor' : 'update vendor status'}.`))

      setSuccessMessage(extractMessage(payload, confirmState.mode === 'delete' ? 'Vendor deleted successfully.' : 'Vendor status updated successfully.'))
      setConfirmState(null)
      await loadVendors(false)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${confirmState.mode === 'delete' ? 'delete vendor' : 'update vendor status'}.`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <RajasthanLoader label="Loading place vendors..." />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionHeader
        title="Place Management / Vendor Management"
        // right={<div className="hidden md:flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}><ShieldCheck size={13} style={{ color: 'var(--teal)' }} />Place vendor assignment, status, and removal flow</div>}
      />

      <div className="overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #7A3C13 0%, #A35B20 44%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(122,60,19,0.18)' }}>
        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
          <div>
            <h2 className="font-serif" style={{ fontSize: 32, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>Place Vendors</h2>
            {/* <p className="mt-2 max-w-2xl" style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)' }}>
              Assign vendors to this place and control their current activation status.
            </p> */}
          </div>
          <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
            <button onClick={() => { setDraft(DEFAULT_DRAFT); setDialogOpen(true); setError('') }} className="rounded-2xl px-4 py-3 font-semibold" style={{ background: '#fff', color: '#7A3C13', fontSize: 13 }}>
              <span className="inline-flex items-center gap-2"><Plus size={15} />Add Vendor</span>
            </button>
          </div>
        </div>

        {/* <div className="grid gap-px sm:grid-cols-2" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <div className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Vendors</div>
            <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{vendors.length}</div>
          </div>
          <div className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Vendors</div>
            <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{vendors.filter(item => item.isActive).length}</div>
          </div>
        </div> */}
      </div>

      {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredVendors.length} vendor{filteredVendors.length === 1 ? '' : 's'}</div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search with name, SSO ID, or company" className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-80" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
          </div>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
            <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>Vendor Management</div>
            <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{search.trim() ? 'No vendors match the current search.' : 'No vendors have been assigned to this place yet.'}</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredVendors.map(item => (
              <div key={item.vendorPlaceId} className="rounded-[28px] border bg-white p-5 shadow-sm" style={{ borderColor: 'var(--cream-dark)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{item.companyName || item.displayName}</div>
                    <div className="mt-2 inline-flex rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.14)', color: '#9A6700', fontSize: 11, fontWeight: 700 }}>{item.companyRegistrationNumber || 'Registration not available'}</div>
                  </div>
                  <span className="rounded-full px-3 py-1" style={{ ...statusStyle(item.isActive), fontSize: 11, fontWeight: 700 }}>{item.isActive ? 'Active' : 'Inactive'}</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3" style={{ fontSize: 13, color: 'var(--text-dark)' }}><UserRound size={14} style={{ color: 'var(--text-muted)' }} />{item.displayName || 'N/A'} {item.ssoId ? `(${item.ssoId})` : ''}</div>
                  <div className="flex items-center gap-3" style={{ fontSize: 13, color: 'var(--text-dark)' }}><Mail size={14} style={{ color: 'var(--text-muted)' }} />{item.email || '-'}</div>
                  <div className="flex items-center gap-3" style={{ fontSize: 13, color: 'var(--text-dark)' }}><Phone size={14} style={{ color: 'var(--text-muted)' }} />{item.mobile || '-'}</div>
                  <div className="flex items-center gap-3" style={{ fontSize: 13, color: 'var(--text-dark)' }}><Building2 size={14} style={{ color: 'var(--text-muted)' }} />{item.companyRegistrationNumber || '-'}</div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => setConfirmState({ mode: 'status', row: item })}
                    className="rounded-xl px-3 py-2 font-medium"
                    style={{ background: item.isActive ? 'rgba(139,26,26,0.08)' : 'rgba(26,122,110,0.10)', color: item.isActive ? 'var(--maroon)' : '#1A7A6E', fontSize: 12 }}
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setConfirmState({ mode: 'delete', row: item })}
                    className="rounded-xl px-3 py-2 font-medium"
                    style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 12 }}
                  >
                    <span className="inline-flex items-center gap-1.5"><Trash2 size={13} />Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={dialogOpen} title="Add Vendor" subtitle="Assign an available vendor to the current place." onClose={() => { setDialogOpen(false); setDraft(DEFAULT_DRAFT) }}>
        <div>
          <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>Select Vendor <span style={{ color: 'var(--maroon)' }}>*</span></div>
          <select value={draft.vendorId} onChange={event => setDraft({ vendorId: event.target.value })} className="w-full rounded-2xl px-4 py-3 outline-none" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}>
            <option value="">Select vendor</option>
            {vendorOptions.map(item => (
              <option key={item.userId} value={item.userId}>{item.name} {item.ssoId ? `(${item.ssoId})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setDialogOpen(false); setDraft(DEFAULT_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void addVendor()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #7A3C13 0%, #C8922A 100%)', fontSize: 14 }}>{saving ? 'Saving...' : 'Add Vendor'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.mode === 'delete' ? 'Delete vendor?' : confirmState?.row.isActive ? 'Deactivate vendor?' : 'Activate vendor?'}
        note={confirmState?.mode === 'delete' ? 'This will remove the selected vendor from the current place.' : `This will ${confirmState?.row.isActive ? 'deactivate' : 'activate'} the selected vendor for this place.`}
        label={confirmState ? `${confirmState.row.companyName || confirmState.row.displayName}` : ''}
        loading={saving}
        danger={confirmState?.mode === 'delete'}
        onClose={() => setConfirmState(null)}
        onConfirm={() => void confirmAction()}
      />
    </div>
  )
}
