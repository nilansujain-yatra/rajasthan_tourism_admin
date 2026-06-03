'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import {
  formatAuditDate,
  getAuditStatusLabel,
  getAuditStatusTone,
  getFileNameFromUrl,
  normalizeAuditDetailResponse,
  toText,
  type AuditItem,
} from '@/lib/audit'
import { authFetch } from '@/lib/api/authFetch'

function SubmitAuditDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (description: string, file: File) => Promise<void>
}) {
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setDescription('')
      setFile(null)
      setError('')
      setSubmitting(false)
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    if (!file) {
      setError('PDF attachment is required.')
      return
    }
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Maximum file size is 25 MB.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onSubmit(description.trim(), file)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit audit.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(28,16,8,0.42)', backdropFilter: 'blur(6px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 26 }}>Submit Audit</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>Upload the audit report as a PDF with a submission note.</div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={5}
              className="w-full resize-none rounded-2xl px-4 py-3 outline-none"
              style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
              placeholder="Describe the completed audit findings"
            />
          </div>

          <div>
            <label className="mb-2 block" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Upload PDF
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-[24px] border px-4 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
              <div className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
                  <Upload size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{file?.name ?? 'Choose PDF attachment'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Maximum size 25 MB</div>
                </div>
              </div>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(184,50,50,0.08)', color: '#B83232', fontSize: 13 }}>{error}</div> : null}

          <div className="flex gap-3">
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
              {submitting ? 'Submitting...' : 'Submit Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OperatorAuditDetailsPage() {
  const params = useParams<{ auditId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const source = searchParams.get('source')
  const auditId = typeof params.auditId === 'string' ? params.auditId : ''

  const [audit, setAudit] = useState<AuditItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function loadDetail() {
      if (!auditId) return

      setLoading(true)
      setError('')

      try {
        const response = await authFetch(`/audit/getAudit/${encodeURIComponent(auditId)}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(toText(payload?.message, 'Unable to load audit details.'))

        const result = normalizeAuditDetailResponse(payload)
        if (!result) throw new Error('Audit details not found.')
        setAudit(result)
      } catch (loadError) {
        setAudit(null)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load audit details.')
      } finally {
        setLoading(false)
      }
    }

    void loadDetail()
  }, [auditId, refreshKey])

  const statusTone = useMemo(() => getAuditStatusTone(audit?.status ?? ''), [audit?.status])
  const canSubmit = source !== 'my-request' && audit?.status !== 'CANCELLED' && !audit?.image

  async function handleSubmit(description: string, file: File) {
    const formData = new FormData()
    formData.append('pdfFile', file)

    const uploadResponse = await authFetch('/file/content-audit-submit', {
      method: 'POST',
      body: formData,
    })
    const uploadPayload = await uploadResponse.json().catch(() => null)
    if (!uploadResponse.ok) {
      throw new Error(toText(uploadPayload?.message, 'Unable to upload audit attachment.'))
    }

    const image = toText(uploadPayload?.result)
    if (!image) throw new Error('No attachment URL was returned after upload.')

    const response = await authFetch('/audit/submit-audit', {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: auditId,
        submitDescription: description,
        image,
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(toText(payload?.message, 'Unable to submit audit.'))
    }

    setSuccessMessage(toText(payload?.message, 'Audit submitted successfully.'))
    setRefreshKey(current => current + 1)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter">
          <div className="space-y-6 px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-3"
                style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-dark)', fontSize: 13, fontWeight: 600 }}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              {canSubmit ? (
                <button
                  onClick={() => setSubmitOpen(true)}
                  className="rounded-2xl px-5 py-3 font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}
                >
                  Submit Audit
                </button>
              ) : null}
            </div>

            {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
            {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(184,50,50,0.08)', color: '#B83232', fontSize: 13 }}>{error}</div> : null}

            {loading ? (
              <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl" style={{ background: '#F8F4EE' }} />
                  ))}
                </div>
              </section>
            ) : audit ? (
              <>
                <div className="overflow-hidden rounded-[30px] text-white" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}>
                  <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11 }}>
                        <ShieldCheck size={13} />
                        Audit detail, assignment and submission trail
                      </div>
                      <h1 className="mt-3 font-serif text-3xl font-bold">{audit.auditTitle || 'Audit Details'}</h1>
                      <p className="mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>
                        {audit.description || 'No description available for this audit request.'}
                      </p>
                    </div>

                    <span className="rounded-full px-4 py-2" style={{ background: statusTone.background, color: statusTone.color, fontSize: 12, fontWeight: 700 }}>
                      {getAuditStatusLabel(audit.status)}
                    </span>
                  </div>
                </div>

                <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ['Assigned Date', formatAuditDate(audit.createdDate)],
                      ['Due Date', formatAuditDate(audit.dueDate)],
                      ['Submitted Date', formatAuditDate(audit.auditSubmitDate)],
                      ['Status', getAuditStatusLabel(audit.status)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                        <div className="mt-3" style={{ fontSize: 15, color: 'var(--text-dark)', fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
                        <UserRound size={18} />
                      </div>
                      <div>
                        <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Created By</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Original request creator</div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                      <div style={{ fontSize: 16, color: 'var(--text-dark)', fontWeight: 700 }}>{audit.createdBy || 'N/A'}</div>
                      <div className="mt-2" style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{audit.createdBySsoId || 'N/A'}</div>
                      <div className="mt-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{audit.createdByUserType || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E' }}>
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Assigned To</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current audit owner</div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                      <div style={{ fontSize: 16, color: 'var(--text-dark)', fontWeight: 700 }}>{audit.assignToUserName || 'N/A'}</div>
                      <div className="mt-2" style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{audit.assignToSsoId || 'N/A'}</div>
                      <div className="mt-2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{audit.userType || 'N/A'}</div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                  <div className="mb-4 font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Request Description</div>
                  <div className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8 }}>
                    {audit.description || 'No description available.'}
                  </div>
                </section>

                {audit.image ? (
                  <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(200,146,42,0.12)', color: '#C8922A' }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Submitted Report</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Attached audit response and PDF report</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.8 }}>
                        {audit.submitDescription || 'No submission note available.'}
                      </div>

                      <a
                        href={audit.image}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-[22px] border px-5 py-4"
                        style={{ borderColor: 'var(--sand)', background: '#fff' }}
                      >
                        <div className="inline-flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
                            <FileText size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 700 }}>{getFileNameFromUrl(audit.image)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Open uploaded PDF</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--maroon)', fontWeight: 700 }}>Open</div>
                      </a>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
                    <div className="text-center">
                      <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>No submitted report yet</div>
                      <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {canSubmit ? 'This audit is waiting for the operator to upload the completed report.' : 'No report is attached for this audit.'}
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : null}
          </div>
        </main>
      </div>

      <SubmitAuditDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
