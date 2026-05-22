'use client'

import { useEffect, useMemo, useState } from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import RajasthanLoader from '@/components/ui/RajasthanLoader'
import { ExternalLink, Globe, Pencil, Plus, Power, ShieldCheck, Trash2 } from 'lucide-react'

type QuickLinkItem = {
  id: string
  name: string
  link: string
  category: string
  statusFlag: boolean
}

type QuickLinkDraft = {
  id: string | null
  name: string
  link: string
}

type ConfirmState =
  | { mode: 'status'; item: QuickLinkItem }
  | { mode: 'delete'; item: QuickLinkItem }
  | null

const DEFAULT_DRAFT: QuickLinkDraft = {
  id: null,
  name: '',
  link: '',
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

function findArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const queue: unknown[] = [payload]
  while (queue.length > 0) {
    const current = queue.shift()
    if (Array.isArray(current)) return current
    if (!current || typeof current !== 'object') continue
    Object.values(current as Record<string, unknown>).forEach(value => queue.push(value))
  }

  return []
}

function extractQuickLinks(payload: unknown): QuickLinkItem[] {
  return findArray(payload)
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const row = item as Record<string, unknown>
      return {
        id: toText(row.id),
        name: toText(row.name),
        link: toText(row.link),
        category: toText(row.category, 'Main Gate'),
        statusFlag: Boolean(row.statusFlag ?? row.active ?? row.status),
      }
    })
    .filter(item => item.id && item.name)
}

function statusStyle(active: boolean) {
  return active
    ? { background: 'rgba(26,122,110,0.12)', color: '#1A7A6E' }
    : { background: 'rgba(139,26,26,0.10)', color: 'var(--maroon)' }
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
  children: React.ReactNode
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
  confirmLabel,
  loading,
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  note: string
  label: string
  confirmLabel: string
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
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70"
            style={{ background: danger ? 'linear-gradient(135deg, #8B1A1A 0%, #C04E4E 100%)' : 'linear-gradient(135deg, #1A7A6E 0%, #58A99C 100%)', fontSize: 14 }}
          >
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlaceQuickLinksView({
  placeId,
  placeName,
}: {
  placeId: string
  placeName?: string
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [links, setLinks] = useState<QuickLinkItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<QuickLinkDraft>(DEFAULT_DRAFT)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)

  async function loadLinks(showLoader = true) {
    if (!placeId) return
    if (showLoader) setLoading(true)

    try {
      setError('')
      const response = await fetch(`/api/place/quick-links/${encodeURIComponent(placeId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to fetch quick links.'))
      setLinks(extractQuickLinks(payload))
    } catch (loadError) {
      setLinks([])
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch quick links.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLinks(true)
  }, [placeId])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const activeCount = useMemo(() => links.filter(item => item.statusFlag).length, [links])

  async function saveQuickLink() {
    if (!draft.name.trim()) {
      setError('Quick link name is required.')
      return
    }
    if (!draft.link.trim()) {
      setError('Quick link URL is required.')
      return
    }

    const body = {
      details: {
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name.trim(),
        link: draft.link.trim(),
        category: 'Main Gate',
        statusFlag: true,
      },
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/place/quick-links/${encodeURIComponent(placeId)}`, {
        method: draft.id ? 'PUT' : 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, 'Unable to save quick link.'))

      setSuccessMessage(extractMessage(payload, draft.id ? 'Quick link updated successfully.' : 'Quick link added successfully.'))
      setDialogOpen(false)
      setDraft(DEFAULT_DRAFT)
      await loadLinks(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save quick link.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmAction() {
    if (!confirmState) return

    const { item, mode } = confirmState
    const body = {
      details: {
        id: item.id,
        name: item.name,
        link: item.link,
        category: item.category || 'Main Gate',
        statusFlag: mode === 'status' ? !item.statusFlag : item.statusFlag,
      },
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/place/quick-links/${encodeURIComponent(placeId)}`, {
        method: mode === 'delete' ? 'DELETE' : 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(extractMessage(payload, `Unable to ${mode === 'delete' ? 'delete' : 'update'} quick link.`))

      setSuccessMessage(extractMessage(payload, mode === 'delete' ? 'Quick link deleted successfully.' : 'Quick link status updated successfully.'))
      setConfirmState(null)
      await loadLinks(false)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${mode === 'delete' ? 'delete' : 'update'} quick link.`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <RajasthanLoader label="Loading quick links..." />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SectionHeader
        title="Place Management / Quick Links"
      />

      <div className="overflow-hidden rounded-[32px]" style={{ background: 'linear-gradient(135deg, #1F5C56 0%, #1A7A6E 48%, #C8922A 100%)', boxShadow: '0 24px 60px rgba(26,122,110,0.18)' }}>
        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.5fr_auto] lg:px-8 lg:py-8">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11, color: '#fff' }}><Globe size={12} />Quick Links</div>
            <h2 className="font-serif" style={{ fontSize: 32, lineHeight: 1.05, color: '#fff', fontWeight: 700 }}>Place Quick Links</h2>
            
          </div>
          <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">
            <button
              onClick={() => {
                setDraft(DEFAULT_DRAFT)
                setDialogOpen(true)
                setError('')
              }}
              className="rounded-2xl px-4 py-3 font-semibold"
              style={{ background: '#fff', color: '#1A7A6E', fontSize: 13 }}
            >
              <span className="inline-flex items-center gap-2"><Plus size={15} />Add Quick Link</span>
            </button>
          </div>
        </div>


      </div>

      {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      {links.length === 0 ? (
        <div className="rounded-[28px] border border-dashed px-6 py-16 text-center" style={{ borderColor: 'var(--sand)', background: 'linear-gradient(180deg, #FFF 0%, #FBF6EF 100%)' }}>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--text-dark)', fontWeight: 700 }}>Quick Link Management</div>
          <p className="mx-auto mt-2 max-w-xl" style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>No quick links have been added for this place yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {links.map(item => (
            <div key={item.id} className="rounded-[28px] border bg-white p-5 shadow-sm" style={{ borderColor: 'var(--cream-dark)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-serif" style={{ fontSize: 22, color: 'var(--text-dark)', fontWeight: 700 }}>{item.name}</div>
                  <div className="mt-2 inline-flex rounded-full px-3 py-1" style={{ background: 'rgba(200,146,42,0.14)', color: '#9A6700', fontSize: 11, fontWeight: 700 }}>{item.category || 'Main Gate'}</div>
                </div>
                <span className="rounded-full px-3 py-1" style={{ ...statusStyle(item.statusFlag), fontSize: 11, fontWeight: 700 }}>{item.statusFlag ? 'Active' : 'Inactive'}</span>
              </div>

              <div className="mt-4">
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Destination URL</div>
                <a href={item.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 break-all" style={{ fontSize: 14, color: '#1A7A6E', fontWeight: 600 }}>
                  {item.link} <ExternalLink size={13} />
                </a>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDraft({ id: item.id, name: item.name, link: item.link })
                    setDialogOpen(true)
                    setError('')
                  }}
                  className="rounded-xl px-3 py-2 font-medium"
                  style={{ background: '#F8F4EE', border: '1px solid var(--sand)', color: 'var(--text-mid)', fontSize: 12 }}
                >
                  <span className="inline-flex items-center gap-1.5"><Pencil size={13} />Edit</span>
                </button>
                <button
                  onClick={() => setConfirmState({ mode: 'status', item })}
                  className="rounded-xl px-3 py-2 font-medium"
                  style={{ background: item.statusFlag ? 'rgba(139,26,26,0.08)' : 'rgba(26,122,110,0.10)', color: item.statusFlag ? 'var(--maroon)' : '#1A7A6E', fontSize: 12 }}
                >
                  <span className="inline-flex items-center gap-1.5"><Power size={13} />{item.statusFlag ? 'Deactivate' : 'Activate'}</span>
                </button>
                <button
                  onClick={() => setConfirmState({ mode: 'delete', item })}
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

      <Modal
        open={dialogOpen}
        title={draft.id ? 'Edit Quick Link' : 'Add Quick Link'}
        subtitle="Create or update a place quick link."
        onClose={() => {
          setDialogOpen(false)
          setDraft(DEFAULT_DRAFT)
        }}
      >
        <div className="grid gap-4">
          <div>
            <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>Quick Link Name <span style={{ color: 'var(--maroon)' }}>*</span></div>
            <Input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Enter quick link name" />
          </div>
          <div>
            <div className="mb-2" style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>Quick Link URL <span style={{ color: 'var(--maroon)' }}>*</span></div>
            <Input value={draft.link} onChange={event => setDraft(current => ({ ...current, link: event.target.value }))} placeholder="Enter quick link URL" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => { setDialogOpen(false); setDraft(DEFAULT_DRAFT) }} className="rounded-xl px-5 py-2.5 font-medium" style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-muted)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => void saveQuickLink()} disabled={saving} className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #1A7A6E 0%, #58A99C 100%)', fontSize: 14 }}>{saving ? 'Saving...' : draft.id ? 'Update Quick Link' : 'Add Quick Link'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.mode === 'delete' ? 'Delete quick link?' : confirmState?.item.statusFlag ? 'Deactivate quick link?' : 'Activate quick link?'}
        note={confirmState?.mode === 'delete' ? 'This will remove the selected quick link from the place.' : `This will ${confirmState?.item.statusFlag ? 'deactivate' : 'activate'} the selected quick link.`}
        label={confirmState?.item.name ?? ''}
        confirmLabel={confirmState?.mode === 'delete' ? 'Delete' : confirmState?.item.statusFlag ? 'Deactivate' : 'Activate'}
        loading={saving}
        danger={confirmState?.mode === 'delete' || Boolean(confirmState?.item.statusFlag)}
        onClose={() => setConfirmState(null)}
        onConfirm={() => void confirmAction()}
      />
    </div>
  )
}
