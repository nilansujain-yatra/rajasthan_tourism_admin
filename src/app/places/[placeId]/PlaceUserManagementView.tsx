'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { Calendar, CheckCircle2, Plus, Search, ShieldCheck, UserRound, Users } from 'lucide-react'
import { baseUrl } from '@/app/api/common.route'
import { authFetch } from '@/lib/api/authFetch'
type UserTab = 'site-admin' | 'operator' | 'superintendent'

type PlaceMeta = {
  id: string
  deptId?: string
  districtId?: string
  divisionId?: string
}

type UserRow = {
  id: string
  userId: string
  name: string
  ssoId: string
  email: string
  mobile: string
  active: boolean
  entryVerification: boolean
  exitVerification: boolean
  onSiteBooking: boolean
  departmentAdmin: boolean
  departmentKiosk: boolean
  kioskId: string
}

type VerifyResult = {
  userId: string
  displayName: string
  email: string
  mobile: string
  roleResponseDto?: {
    placeDtos?: Array<{ id?: string }>
  }
}

type SiteAdminDraft = {
  ssoId: string
  verified?: VerifyResult | null
}

type OperatorDraft = {
  ssoId: string
  verified?: VerifyResult | null
  entryVerification: boolean
  exitVerification: boolean
  onSiteBooking: boolean
  departmentAdmin: boolean
  departmentKiosk: boolean
  kioskId: string
  kioskVerified: boolean
}

type SuperintendentDraft = {
  ssoId: string
  verified?: VerifyResult | null
}

type RemoveState = { userId: string; name: string } | null

const DEFAULT_SITE_ADMIN_DRAFT: SiteAdminDraft = {
  ssoId: '',
  verified: null,
}

const DEFAULT_OPERATOR_DRAFT: OperatorDraft = {
  ssoId: '',
  verified: null,
  entryVerification: false,
  exitVerification: false,
  onSiteBooking: false,
  departmentAdmin: false,
  departmentKiosk: false,
  kioskId: '',
  kioskVerified: false,
}

const DEFAULT_SUPERINTENDENT_DRAFT: SuperintendentDraft = {
  ssoId: '',
  verified: null,
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

function extractUsers(payload: unknown): UserRow[] {
  return findArray(payload, ['roleResponseDtos', 'result', 'users'])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id ?? row.userId ?? row.ssoId),
        userId: toText(row.userId ?? row.id),
        name: toText(row.name ?? row.displayName),
        ssoId: toText(row.ssoId),
        email: toText(row.email),
        mobile: toText(row.mobile),
        active: Boolean(row.status ?? row.active ?? true),
        entryVerification: Boolean(row.entryVerification),
        exitVerification: Boolean(row.exitVerification),
        onSiteBooking: Boolean(row.onSiteBooking),
        departmentAdmin: Boolean(row.departmentAdmin),
        departmentKiosk: Boolean(row.departmentKiosk),
        kioskId: toText(row.kioskId),
      }
    })
    .filter(item => item.userId || item.ssoId)
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
      <div className="w-full max-w-2xl rounded-[30px] bg-white p-6 shadow-2xl lg:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>{title}</h3>
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
          <button onClick={onConfirm} disabled={loading} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #8B1A1A 0%, #C04E4E 100%)', fontSize: 14 }}>{loading ? 'Please wait...' : 'Unassign'}</button>
        </div>
      </div>
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl px-4 py-3 outline-none ${props.className ?? ''}`}
      style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14, ...(props.style ?? {}) }}
    />
  )
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{label}</span>
    </label>
  )
}

export default function PlaceUserManagementView({
  place,
}: {
  place: PlaceMeta
}) {
  const [activeTab, setActiveTab] = useState<UserTab>('site-admin')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [siteAdmins, setSiteAdmins] = useState<UserRow[]>([])
  const [operators, setOperators] = useState<UserRow[]>([])
  const [superintendents, setSuperintendents] = useState<UserRow[]>([])

  const [siteAdminDialogOpen, setSiteAdminDialogOpen] = useState(false)
  const [operatorDialogOpen, setOperatorDialogOpen] = useState(false)
  const [superintendentDialogOpen, setSuperintendentDialogOpen] = useState(false)

  const [siteAdminDraft, setSiteAdminDraft] = useState<SiteAdminDraft>(DEFAULT_SITE_ADMIN_DRAFT)
  const [operatorDraft, setOperatorDraft] = useState<OperatorDraft>(DEFAULT_OPERATOR_DRAFT)
  const [superintendentDraft, setSuperintendentDraft] = useState<SuperintendentDraft>(DEFAULT_SUPERINTENDENT_DRAFT)
  const [removeState, setRemoveState] = useState<RemoveState>(null)

  async function fetchJson(url: string, fallback: string) {
    const response = await authFetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractMessage(payload, fallback))
    return payload
  }

  async function loadUsers(showLoader = true) {
    if (!place.id) return
    if (showLoader) setLoading(true)

    try {
      setError('')
      const [siteAdminPayload, operatorPayload, superintendentPayload] = await Promise.all([
        fetchJson(`/place/siteAdmin?placeId=${encodeURIComponent(place.id)}&offSet=0&size=200&searchKey=`, 'Unable to fetch site admins.'),
        fetchJson(`/place/operator?placeId=${encodeURIComponent(place.id)}&offSet=0&size=200&searchKey=`, 'Unable to fetch operators.'),
        fetchJson(`/place/superintendent?placeId=${encodeURIComponent(place.id)}&offSet=0&size=200&searchKey=`, 'Unable to fetch superintendents.'),
      ])

      setSiteAdmins(extractUsers(siteAdminPayload))
      setOperators(extractUsers(operatorPayload))
      setSuperintendents(extractUsers(superintendentPayload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch place users.')
      setSiteAdmins([])
      setOperators([])
      setSuperintendents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers(true)
  }, [place.id])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  async function verifySso(ssoId: string) {
    const payload = await fetchJson(`/api/role?ssoId=${encodeURIComponent(ssoId)}`, 'Unable to verify SSO ID.')
    const result = payload && typeof payload === 'object' ? (payload as { result?: unknown }).result : null
    if (!result || typeof result !== 'object') throw new Error('SSO details were not found.')
    return result as VerifyResult
  }

  async function verifyKiosk(kioskId: string, ssoId: string) {
    await fetchJson(`/api/role/kiosk?kioskId=${encodeURIComponent(kioskId)}&ssoId=${encodeURIComponent(ssoId)}&placeId=${encodeURIComponent(place.id)}`, 'Unable to verify kiosk ID.')
  }

  function verifyResultAlreadyAssigned(result: VerifyResult) {
    return Array.isArray(result.roleResponseDto?.placeDtos) && result.roleResponseDto?.placeDtos.some(item => toText(item?.id) === place.id)
  }

  async function handleVerifySiteAdmin() {
    if (!siteAdminDraft.ssoId.trim()) {
      setError('SSO ID is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const verified = await verifySso(siteAdminDraft.ssoId.trim())
      if (verifyResultAlreadyAssigned(verified)) {
        throw new Error('This SSO user is already assigned to the selected place.')
      }
      setSiteAdminDraft(current => ({ ...current, verified }))
    } catch (verifyError) {
      setSiteAdminDraft(current => ({ ...current, verified: null }))
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify SSO ID.')
    } finally {
      setSaving(false)
    }
  }

  async function handleVerifyOperator() {
    if (!operatorDraft.ssoId.trim()) {
      setError('SSO ID is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const verified = await verifySso(operatorDraft.ssoId.trim())
      if (verifyResultAlreadyAssigned(verified)) {
        throw new Error('This SSO user is already assigned to the selected place.')
      }
      setOperatorDraft(current => ({ ...current, verified }))
    } catch (verifyError) {
      setOperatorDraft(current => ({ ...current, verified: null }))
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify SSO ID.')
    } finally {
      setSaving(false)
    }
  }

  async function handleVerifySuperintendent() {
    if (!superintendentDraft.ssoId.trim()) {
      setError('SSO ID is required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const verified = await verifySso(superintendentDraft.ssoId.trim())
      if (verifyResultAlreadyAssigned(verified)) {
        throw new Error('This SSO user is already assigned to the selected place.')
      }
      setSuperintendentDraft(current => ({ ...current, verified }))
    } catch (verifyError) {
      setSuperintendentDraft(current => ({ ...current, verified: null }))
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify SSO ID.')
    } finally {
      setSaving(false)
    }
  }

  async function assignSiteAdmin() {
    if (!siteAdminDraft.verified) {
      setError('Please verify the SSO ID first.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch(`${baseUrl}/role`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deptId: place.deptId ? [place.deptId] : [],
          districtId: place.districtId ? [place.districtId] : [],
          divisionId: place.divisionId ? [place.divisionId] : [],
          ssoId: siteAdminDraft.ssoId.trim(),
          userType: 'SITE_ADMIN',
          placeId: [place.id],
          userRole: 'SUPER',
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to assign site admin.'))

      setSuccessMessage(extractMessage(payload, 'Site admin assigned successfully.'))
      setSiteAdminDialogOpen(false)
      setSiteAdminDraft(DEFAULT_SITE_ADMIN_DRAFT)
      await loadUsers(false)
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Unable to assign site admin.')
    } finally {
      setSaving(false)
    }
  }

  async function assignOperator() {
    if (!operatorDraft.verified) {
      setError('Please verify the SSO ID first.')
      return
    }

    if (operatorDraft.onSiteBooking) {
      if (!operatorDraft.kioskId.trim()) {
        setError('Kiosk ID is required when onsite booking is enabled.')
        return
      }
      if (!operatorDraft.kioskVerified) {
        setError('Please verify the kiosk ID first.')
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch(`${baseUrl}/role`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deptId: place.deptId ? [place.deptId] : [],
          districtId: place.districtId ? [place.districtId] : [],
          divisionId: place.divisionId ? [place.divisionId] : [],
          ssoId: operatorDraft.ssoId.trim(),
          userType: 'OPERATOR',
          placeId: [place.id],
          entryVerification: operatorDraft.entryVerification,
          exitVerification: operatorDraft.exitVerification,
          onSiteBooking: operatorDraft.onSiteBooking,
          departmentAdmin: operatorDraft.departmentAdmin,
          departmentKiosk: operatorDraft.departmentKiosk,
          kioskId: operatorDraft.onSiteBooking ? operatorDraft.kioskId.trim() : undefined,
          userRole: 'SUPER',
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to assign operator.'))

      setSuccessMessage(extractMessage(payload, 'Operator assigned successfully.'))
      setOperatorDialogOpen(false)
      setOperatorDraft(DEFAULT_OPERATOR_DRAFT)
      await loadUsers(false)
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Unable to assign operator.')
    } finally {
      setSaving(false)
    }
  }

  async function verifyOperatorKiosk() {
    if (!operatorDraft.kioskId.trim()) {
      setError('Kiosk ID is required.')
      return
    }
    if (!operatorDraft.ssoId.trim()) {
      setError('SSO ID is required before kiosk verification.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await verifyKiosk(operatorDraft.kioskId.trim(), operatorDraft.ssoId.trim())
      setOperatorDraft(current => ({ ...current, kioskVerified: true }))
      setSuccessMessage('Kiosk ID verified successfully.')
    } catch (verifyError) {
      setOperatorDraft(current => ({ ...current, kioskVerified: false }))
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify kiosk ID.')
    } finally {
      setSaving(false)
    }
  }

  async function assignSuperintendent() {
    if (!superintendentDraft.verified) {
      setError('Please verify the SSO ID first.')
      return
    }

    const userId = toText(superintendentDraft.verified?.userId)
    if (!userId) {
      setError('Unable to resolve superintendent user ID from verification response.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await authFetch(`/place/superintendent?placeId=${encodeURIComponent(place.id)}&superintendentUserIds=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { Accept: 'application/json' },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to assign superintendent.'))

      setSuccessMessage(extractMessage(payload, 'Superintendent assigned successfully.'))
      setSuperintendentDialogOpen(false)
      setSuperintendentDraft(DEFAULT_SUPERINTENDENT_DRAFT)
      await loadUsers(false)
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Unable to assign superintendent.')
    } finally {
      setSaving(false)
    }
  }

  async function unassignSuperintendent() {
    if (!removeState) return

    setSaving(true)
    setError('')
    try {
      const response = await authFetch(`/place/superintendent?placeId=${encodeURIComponent(place.id)}&superintendentUserId=${encodeURIComponent(removeState.userId)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to remove superintendent.'))

      setSuccessMessage(extractMessage(payload, 'Superintendent unassigned successfully.'))
      setRemoveState(null)
      await loadUsers(false)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove superintendent.')
    } finally {
      setSaving(false)
    }
  }

  const filteredSiteAdmins = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return siteAdmins
    return siteAdmins.filter(item => item.name.toLowerCase().includes(query) || item.ssoId.toLowerCase().includes(query))
  }, [search, siteAdmins])

  const filteredOperators = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return operators
    return operators.filter(item => item.name.toLowerCase().includes(query) || item.ssoId.toLowerCase().includes(query))
  }, [operators, search])

  const filteredSuperintendents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return superintendents
    return superintendents.filter(item => item.name.toLowerCase().includes(query) || item.ssoId.toLowerCase().includes(query))
  }, [search, superintendents])

  const activeRows = activeTab === 'site-admin' ? filteredSiteAdmins : activeTab === 'operator' ? filteredOperators : filteredSuperintendents

  if (loading) return <RajasthanLoader label="Loading place users..." />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionHeader
        title="Place Management / User Management"
        // right={<div className="hidden md:flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}><ShieldCheck size={13} style={{ color: 'var(--teal)' }} />Site admin, operator, and superintendent assignment flow</div>}
      />

      <div className="overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #8B1A1A 45%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(107,18,18,0.18)' }}>
        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, color: '#fff' }}><Users size={12} />User Management</div>
            <h2 className="font-serif" style={{ fontSize: 32, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>Place Users</h2>
            {/* <p className="mt-2 max-w-2xl" style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)' }}>
              Assign and review site admins, operators, and superintendents for the selected place.
            </p> */}
          </div>
          <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
            <button
              onClick={() => {
                setError('')
                if (activeTab === 'site-admin') {
                  setSiteAdminDraft(DEFAULT_SITE_ADMIN_DRAFT)
                  setSiteAdminDialogOpen(true)
                } else if (activeTab === 'operator') {
                  setOperatorDraft(DEFAULT_OPERATOR_DRAFT)
                  setOperatorDialogOpen(true)
                } else {
                  setSuperintendentDraft(DEFAULT_SUPERINTENDENT_DRAFT)
                  setSuperintendentDialogOpen(true)
                }
              }}
              className="rounded-2xl px-4 py-3 font-semibold"
              style={{ background: '#fff', color: 'var(--maroon)', fontSize: 13 }}
            >
              <span className="inline-flex items-center gap-2"><Plus size={15} />Assign</span>
            </button>
          </div>
        </div>

        {/* <div className="grid gap-px sm:grid-cols-3" style={{ background: 'rgba(255,255,255,0.14)' }}>
          {[
            { label: 'Site Admins', value: String(siteAdmins.length), icon: <UserRound size={15} /> },
            { label: 'Operators', value: String(operators.length), icon: <Calendar size={15} /> },
            { label: 'Superintendents', value: String(superintendents.length), icon: <CheckCircle2 size={15} /> },
          ].map(card => (
            <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2" style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.icon}{card.label}</div>
              <div className="mt-1 font-semibold" style={{ fontSize: 20, color: '#fff' }}>{card.value}</div>
            </div>
          ))}
        </div> */}
      </div>

      {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      <div className="rounded-[30px] border bg-white p-5 shadow-sm lg:p-6" style={{ borderColor: 'var(--cream-dark)' }}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'site-admin', label: 'Site Admin' },
              { id: 'operator', label: 'Operator' },
              { id: 'superintendent', label: 'Superintendent' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as UserTab)}
                className="rounded-full px-4 py-2 font-medium"
                style={{ background: activeTab === tab.id ? 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' : '#F8F4EE', color: activeTab === tab.id ? '#fff' : 'var(--text-mid)', border: activeTab === tab.id ? 'none' : '1px solid var(--sand)', fontSize: 13 }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search with name or SSO ID" className="w-full rounded-2xl py-3 pl-10 pr-4 outline-none sm:w-80" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13 }} />
          </div>
        </div>

        {activeRows.length === 0 ? (
          <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
            <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>User Management</div>
            <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {search.trim() ? 'No users match the current search.' : activeTab === 'site-admin' ? 'No site admins assigned yet.' : activeTab === 'operator' ? 'No operators assigned yet.' : 'No superintendents assigned yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: 'var(--cream-dark)' }}>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead style={{ background: 'linear-gradient(180deg, #FBF6EF 0%, #F4EBDF 100%)' }}>
                  <tr>
                    {(activeTab === 'operator'
                      ? ['Name', 'SSO ID', 'Entry', 'Exit', 'Onsite', 'Cash Payment', 'Kiosk ID', 'Status']
                      : activeTab === 'superintendent'
                        ? ['Name', 'SSO ID', 'Email', 'Status', 'Actions']
                        : ['Name', 'SSO ID', 'Email', 'Status']
                    ).map(label => (
                      <th key={label} className="px-4 py-4 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((item, index) => (
                    <tr key={`${item.userId}-${index}`} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                      <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600 }}>{item.name || 'N/A'}</td>
                      <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.ssoId || 'N/A'}</td>
                      {activeTab === 'operator' ? (
                        <>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: item.entryVerification ? '#1A7A6E' : 'var(--text-muted)', fontWeight: 600 }}>{item.entryVerification ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: item.exitVerification ? '#1A7A6E' : 'var(--text-muted)', fontWeight: 600 }}>{item.exitVerification ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: item.onSiteBooking ? '#1A7A6E' : 'var(--text-muted)', fontWeight: 600 }}>{item.onSiteBooking ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: item.departmentAdmin ? '#1A7A6E' : 'var(--text-muted)', fontWeight: 600 }}>{item.departmentAdmin ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.kioskId || '-'}</td>
                          <td className="px-4 py-4"><span className="rounded-full px-3 py-1" style={{ ...statusStyle(item.active), fontSize: 11, fontWeight: 700 }}>{item.active ? 'Active' : 'Inactive'}</span></td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.email || '-'}</td>
                          <td className="px-4 py-4"><span className="rounded-full px-3 py-1" style={{ ...statusStyle(item.active), fontSize: 11, fontWeight: 700 }}>{item.active ? 'Active' : 'Inactive'}</span></td>
                          {activeTab === 'superintendent' ? (
                            <td className="px-4 py-4">
                              <button onClick={() => setRemoveState({ userId: item.userId, name: item.name })} className="rounded-xl px-3 py-2 font-medium" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 12 }}>Unassign</button>
                            </td>
                          ) : null}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal open={siteAdminDialogOpen} title="Assign Site Admin" subtitle="Verify an SSO user and assign as site admin for this place." onClose={() => { setSiteAdminDialogOpen(false); setSiteAdminDraft(DEFAULT_SITE_ADMIN_DRAFT) }}>
        <div className="grid gap-4">
          <div>
            <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>SSO ID <span style={{ color: 'var(--maroon)' }}>*</span></div>
            <div className="flex gap-3">
              <Input value={siteAdminDraft.ssoId} onChange={event => setSiteAdminDraft(current => ({ ...current, ssoId: event.target.value, verified: null }))} placeholder="Enter SSO ID" />
              <button onClick={() => void handleVerifySiteAdmin()} disabled={saving} className="rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>Verify</button>
            </div>
          </div>
          {siteAdminDraft.verified ? (
            <div className="rounded-2xl p-4" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verified User</div>
              <div className="mt-1" style={{ fontSize: 16, color: 'var(--text-dark)', fontWeight: 700 }}>{siteAdminDraft.verified.displayName}</div>
              <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{siteAdminDraft.verified.email || '-'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{siteAdminDraft.verified.mobile || '-'}</div>
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setSiteAdminDialogOpen(false); setSiteAdminDraft(DEFAULT_SITE_ADMIN_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void assignSiteAdmin()} disabled={saving || !siteAdminDraft.verified} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>Assign Site Admin</button>
        </div>
      </Modal>

      <Modal open={operatorDialogOpen} title="Assign Operator" subtitle="Verify an SSO user and assign operator permissions for this place." onClose={() => { setOperatorDialogOpen(false); setOperatorDraft(DEFAULT_OPERATOR_DRAFT) }}>
        <div className="grid gap-4">
          <div>
            <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>SSO ID <span style={{ color: 'var(--maroon)' }}>*</span></div>
            <div className="flex gap-3">
              <Input value={operatorDraft.ssoId} onChange={event => setOperatorDraft(current => ({ ...current, ssoId: event.target.value, verified: null, kioskVerified: false }))} placeholder="Enter SSO ID" />
              <button onClick={() => void handleVerifyOperator()} disabled={saving} className="rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>Verify</button>
            </div>
          </div>

          {operatorDraft.verified ? (
            <div className="rounded-2xl p-4" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verified User</div>
              <div className="mt-1" style={{ fontSize: 16, color: 'var(--text-dark)', fontWeight: 700 }}>{operatorDraft.verified.displayName}</div>
              <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{operatorDraft.verified.email || '-'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{operatorDraft.verified.mobile || '-'}</div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxRow checked={operatorDraft.entryVerification} label="Entry Verification" onChange={() => setOperatorDraft(current => ({ ...current, entryVerification: !current.entryVerification }))} />
            <CheckboxRow checked={operatorDraft.exitVerification} label="Exit Verification" onChange={() => setOperatorDraft(current => ({ ...current, exitVerification: !current.exitVerification }))} />
            <CheckboxRow checked={operatorDraft.onSiteBooking} label="Onsite Booking" onChange={() => setOperatorDraft(current => ({ ...current, onSiteBooking: !current.onSiteBooking, kioskVerified: false }))} />
            <CheckboxRow checked={operatorDraft.departmentAdmin} label="Cash Payment" onChange={() => setOperatorDraft(current => ({ ...current, departmentAdmin: !current.departmentAdmin }))} />
            <CheckboxRow checked={operatorDraft.departmentKiosk} label="Department Kiosk" onChange={() => setOperatorDraft(current => ({ ...current, departmentKiosk: !current.departmentKiosk }))} />
          </div>

          {operatorDraft.onSiteBooking ? (
            <div>
              <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>Kiosk ID <span style={{ color: 'var(--maroon)' }}>*</span></div>
              <div className="flex gap-3">
                <Input value={operatorDraft.kioskId} onChange={event => setOperatorDraft(current => ({ ...current, kioskId: event.target.value, kioskVerified: false }))} placeholder="Enter kiosk ID" />
                <button onClick={() => void verifyOperatorKiosk()} disabled={saving} className="rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #1A7A6E 0%, #58A99C 100%)', fontSize: 14 }}>Verify</button>
              </div>
              {operatorDraft.kioskVerified ? <div className="mt-2" style={{ fontSize: 12, color: '#1A7A6E', fontWeight: 700 }}>Kiosk ID verified.</div> : null}
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setOperatorDialogOpen(false); setOperatorDraft(DEFAULT_OPERATOR_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void assignOperator()} disabled={saving || !operatorDraft.verified} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>Assign Operator</button>
        </div>
      </Modal>

      <Modal open={superintendentDialogOpen} title="Assign Superintendent" subtitle="Verify and assign a superintendent for this place." onClose={() => { setSuperintendentDialogOpen(false); setSuperintendentDraft(DEFAULT_SUPERINTENDENT_DRAFT) }}>
        <div className="grid gap-4">
          <div>
            <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>SSO ID <span style={{ color: 'var(--maroon)' }}>*</span></div>
            <div className="flex gap-3">
              <Input value={superintendentDraft.ssoId} onChange={event => setSuperintendentDraft(current => ({ ...current, ssoId: event.target.value, verified: null }))} placeholder="Enter SSO ID" />
              <button onClick={() => void handleVerifySuperintendent()} disabled={saving} className="rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>Verify</button>
            </div>
          </div>
          {superintendentDraft.verified ? (
            <div className="rounded-2xl p-4" style={{ background: '#F8F4EE', border: '1px solid var(--sand)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verified User</div>
              <div className="mt-1" style={{ fontSize: 16, color: 'var(--text-dark)', fontWeight: 700 }}>{superintendentDraft.verified.displayName}</div>
              <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{superintendentDraft.verified.email || '-'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{superintendentDraft.verified.mobile || '-'}</div>
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setSuperintendentDialogOpen(false); setSuperintendentDraft(DEFAULT_SUPERINTENDENT_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void assignSuperintendent()} disabled={saving || !superintendentDraft.verified} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)', fontSize: 14 }}>Assign Superintendent</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(removeState)}
        title="Unassign superintendent?"
        note="This will remove the selected superintendent from the current place."
        label={removeState?.name ?? ''}
        loading={saving}
        onClose={() => setRemoveState(null)}
        onConfirm={() => void unassignSuperintendent()}
      />
    </div>
  )
}
