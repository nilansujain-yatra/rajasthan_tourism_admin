'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { AlertTriangle, ArrowLeftRight, Camera, CheckCircle2, QrCode, RefreshCw, Search, ShieldCheck, Ticket, X } from 'lucide-react'
import { clearCachedAuthUser, readCachedAuthUser, writeCachedAuthUser } from '@/lib/auth/client-session'
import type { AuthUser } from '@/lib/auth/jwt'

type ScanResult = {
  id: string
  bookingId: string
  totalUsers: number
  totalAmountWithAddOn: number
  ticketUserSummary: Array<{
    ticketTypeId: string
    ticketTypeName: string
    qty: number
    addOnList: Array<{ ticketTypeName: string, qty: number }>
  }>
  selectedTicketUsers: Array<{
    id: string
    ticketId: string
    ticketName: string
    verified: boolean
  }>
}

type GateOption = {
  label: string
  value: 'true' | 'false'
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>
    }
  }
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function normalizeScanResult(payload: unknown): ScanResult | null {
  const result = payload && typeof payload === 'object'
    ? (payload as { result?: Record<string, unknown> }).result
    : null

  if (!result || typeof result !== 'object') return null

  const ticketBookingResponse = result.ticketBookingResponse && typeof result.ticketBookingResponse === 'object'
    ? result.ticketBookingResponse as Record<string, unknown>
    : {}

  const ticketUserSummary = Array.isArray(ticketBookingResponse.ticketUser)
    ? ticketBookingResponse.ticketUser as Array<Record<string, unknown>>
    : []

  const selectedTicketUsers = Array.isArray(result.selectedTicketUsersDto)
    ? result.selectedTicketUsersDto as Array<Record<string, unknown>>
    : []

  return {
    id: toText(result.id),
    bookingId: toText(result.bookingId),
    totalUsers: toNumber(ticketBookingResponse.totalUsers),
    totalAmountWithAddOn: toNumber(ticketBookingResponse.totalAmountWithAddOn),
    ticketUserSummary: ticketUserSummary.map(item => ({
      ticketTypeId: toText(item.ticketTypeId),
      ticketTypeName: toText(item.ticketTypeName, 'Ticket'),
      qty: toNumber(item.qty),
      addOnList: Array.isArray(item.addOnList)
        ? (item.addOnList as Array<Record<string, unknown>>).map(addon => ({
          ticketTypeName: toText(addon.ticketTypeName || addon.name, 'Add-on'),
          qty: toNumber(addon.qty),
        }))
        : [],
    })),
    selectedTicketUsers: selectedTicketUsers.map(item => {
      const ticketUser = item.ticketUserDto && typeof item.ticketUserDto === 'object'
        ? item.ticketUserDto as Record<string, unknown>
        : {}

      return {
        id: toText(ticketUser.id),
        ticketId: toText(ticketUser.ticketId),
        ticketName: toText(ticketUser.ticketName, 'User'),
        verified: Boolean(item.verified),
      }
    }).filter(item => item.id),
  }
}

function getGateOptions(user: AuthUser | null): GateOption[] {
  const entry = user?.entryVerification === true
  const exit = user?.exitVerification === true

  if (entry && exit) {
    return [
      { label: 'Entry Gate', value: 'true' },
      { label: 'Exit Gate', value: 'false' },
    ]
  }

  if (entry) {
    return [{ label: 'Entry Gate', value: 'true' }]
  }

  return [{ label: 'Exit Gate', value: 'false' }]
}

function ScanDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (value: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detectorRef = useRef<InstanceType<NonNullable<typeof window.BarcodeDetector>> | null>(null)
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [manualValue, setManualValue] = useState('')
  const [scannerError, setScannerError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  useEffect(() => {
    if (!open) return

    let active = true

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.BarcodeDetector) {
          setScannerError('Camera QR scanning is not supported in this browser. Paste the QR detail manually.')
          return
        }

        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!active) return

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
        }

        const loop = async () => {
          if (!active || !videoRef.current || !detectorRef.current) return

          try {
            const results = await detectorRef.current.detect(videoRef.current)
            const value = results[0]?.rawValue?.trim()
            if (value) {
              onSubmit(value)
              onClose()
              return
            }
          } catch {
            // Keep polling until a readable frame is available.
          }

          rafRef.current = window.requestAnimationFrame(loop)
        }

        rafRef.current = window.requestAnimationFrame(loop)
      } catch (error) {
        setScannerError(error instanceof Error ? error.message : 'Unable to access camera for scanning.')
      }
    }

    startCamera()

    return () => {
      active = false
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setCameraReady(false)
    }
  }, [onClose, onSubmit, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(28,16,8,0.48)', backdropFilter: 'blur(6px)' }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-[30px] bg-white" style={{ boxShadow: '0 40px 96px rgba(107,18,18,0.24)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #C8922A 100%)' }}>
          <div>
            <div className="font-serif font-bold text-white" style={{ fontSize: 26 }}>Scan QR</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)' }}>Scan with camera or paste the QR detail manually.</div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border p-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
            <div className="mb-3 inline-flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-dark)', fontWeight: 700 }}>
              <Camera size={14} style={{ color: 'var(--maroon)' }} />
              Camera Scanner
            </div>
            <div className="overflow-hidden rounded-[20px]" style={{ background: '#24150f', minHeight: 320 }}>
              <video ref={videoRef} className="h-[320px] w-full object-cover" muted playsInline />
            </div>
            <div className="mt-3" style={{ fontSize: 12, color: cameraReady ? '#1A7A6E' : 'var(--text-muted)' }}>
              {cameraReady ? 'Point the camera at a ticket QR to auto-detect it.' : 'Waiting for camera access...'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border p-5" style={{ borderColor: 'var(--sand)', background: '#fff' }}>
              <div className="mb-3 inline-flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-dark)', fontWeight: 700 }}>
                <QrCode size={14} style={{ color: '#C8922A' }} />
                Manual Entry
              </div>
              <textarea
                value={manualValue}
                onChange={event => setManualValue(event.target.value)}
                placeholder="Paste scanned QR detail or token here"
                rows={8}
                className="w-full rounded-[20px] px-4 py-3 outline-none resize-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 13, lineHeight: 1.6 }}
              />
              <button
                onClick={() => {
                  if (manualValue.trim()) {
                    onSubmit(manualValue.trim())
                    onClose()
                  }
                }}
                className="mt-4 w-full rounded-2xl px-4 py-3 font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}
              >
                Use This QR Detail
              </button>
            </div>

            {scannerError ? (
              <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>
                {scannerError}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OperatorVerificationPage() {
  const [user, setUser] = useState<AuthUser | null>(() => readCachedAuthUser())
  const [selectedGate, setSelectedGate] = useState<'true' | 'false'>('true')
  const [lookupBookingId, setLookupBookingId] = useState('')
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })

        if (!response.ok) throw new Error('Unable to load session.')

        const payload = await response.json() as { user?: AuthUser | null }
        if (!active) return

        const nextUser = payload.user ?? null
        setUser(nextUser)
        writeCachedAuthUser(nextUser)
      } catch {
        if (!active) return
        setUser(null)
        clearCachedAuthUser()
      }
    }

    loadSession()
    return () => { active = false }
  }, [])

  const gateOptions = useMemo(() => getGateOptions(user), [user])

  useEffect(() => {
    setSelectedGate(gateOptions[0]?.value ?? 'true')
  }, [gateOptions])

  function normalizeQrDetail(value: string) {
    const trimmed = value.trim()
    return trimmed.includes('Ticket')
      ? trimmed.split(' ').pop()?.replace('Ticket', '').trim() || trimmed
      : trimmed
  }

  async function scanQrDetail(qrDetail: string) {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const normalizedQr = normalizeQrDetail(qrDetail)
      const response = await fetch(`/api/operator-verification/scan?isEntry=${selectedGate}&qrDetail=${encodeURIComponent(normalizedQr)}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(toText((payload as Record<string, unknown> | null)?.message, 'Unable to scan QR ticket.'))
      }

      const result = normalizeScanResult(payload)
      if (!result) throw new Error('No ticket data returned for this QR.')

      setScanResult(result)
      setSelectedTicketIds(result.selectedTicketUsers.filter(item => !item.verified).map(item => item.id))
      setSuccessMessage(toText((payload as Record<string, unknown> | null)?.message, 'QR details loaded successfully.'))
    } catch (scanError) {
      setScanResult(null)
      setSelectedTicketIds([])
      setError(scanError instanceof Error ? scanError.message : 'Unable to scan QR ticket.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateQrLookup() {
    if (!lookupBookingId.trim()) {
      setError('Enter a booking ID to generate QR detail.')
      return
    }

    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`/api/operator-verification/generate-qr?bookingId=${encodeURIComponent(lookupBookingId.trim())}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(toText((payload as Record<string, unknown> | null)?.message, 'Unable to generate QR detail.'))
      }

      const qrDetail = toText((payload as Record<string, any>)?.result)
      if (!qrDetail) throw new Error('No QR detail returned for this booking.')

      await scanQrDetail(qrDetail)
      setLookupBookingId('')
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Unable to load booking QR detail.')
      setLoading(false)
    }
  }

  async function verifySelectedTickets() {
    if (!scanResult) return
    if (!selectedTicketIds.length) {
      setError('Select at least one unverified user to continue.')
      return
    }

    setVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/operator-verification/verify', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry: selectedGate === 'true',
          ticketBookingId: scanResult.id,
          ticketUserIds: selectedTicketIds,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(toText((payload as Record<string, unknown> | null)?.message, 'Unable to verify selected users.'))
      }

      setSuccessMessage(toText((payload as Record<string, unknown> | null)?.message, 'Ticket verified successfully.'))
      setScanResult({
        ...scanResult,
        selectedTicketUsers: scanResult.selectedTicketUsers.map(item => selectedTicketIds.includes(item.id) ? { ...item, verified: true } : item),
      })
      setSelectedTicketIds([])
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify selected users.')
    } finally {
      setVerifying(false)
    }
  }

  const allSelectableIds = useMemo(
    () => scanResult?.selectedTicketUsers.filter(item => !item.verified).map(item => item.id) ?? [],
    [scanResult],
  )

  const allSelected = allSelectableIds.length > 0 && selectedTicketIds.length === allSelectableIds.length

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cream)' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto page-enter">
          <div className="space-y-6 px-6 py-6">
            <div className="overflow-hidden rounded-[30px] text-white" style={{ background: 'linear-gradient(135deg, #6B1212 0%, #A83030 58%, #D3A64A 100%)' }}>
        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.14)', fontSize: 11 }}>
              <ShieldCheck size={13} />
              Gate selection, QR scan and ticket verification
            </div>
            <h1 className="mt-3 font-serif text-3xl font-bold">Verification</h1>
            <p className="mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>
              This reproduces the operator verification flow from the recent project, starting from gate selection and continuing through QR scan, booking lookup and ticket verification.
            </p>
          </div>
        </div>

        <div className="grid gap-px md:grid-cols-4" style={{ background: 'rgba(255,255,255,0.14)' }}>
          {[
            { label: 'Gate Options', value: String(gateOptions.length) },
            { label: 'Selected Gate', value: gateOptions.find(item => item.value === selectedGate)?.label ?? 'N/A' },
            { label: 'Entry Access', value: user?.entryVerification === true ? 'Enabled' : 'Disabled' },
            { label: 'Exit Access', value: user?.exitVerification === true ? 'Enabled' : 'Disabled' },
          ].map(card => (
            <div key={card.label} className="px-6 py-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{card.label}</div>
              <div className="mt-1 font-semibold" style={{ fontSize: 18, color: '#fff' }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {successMessage ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(26,122,110,0.10)', color: '#1A7A6E', fontSize: 13 }}>{successMessage}</div> : null}
      {error ? <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)', fontSize: 13 }}>{error}</div> : null}

      {!scanResult ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(200,146,42,0.10)', color: '#C8922A' }}>
                <ArrowLeftRight size={18} />
              </div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Select Gate</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>The available options depend on the current operator’s permissions.</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {gateOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedGate(option.value)}
                  className="rounded-2xl px-4 py-4 text-left transition"
                  style={{
                    background: selectedGate === option.value ? 'rgba(139,26,26,0.08)' : '#F8F4EE',
                    border: `1px solid ${selectedGate === option.value ? 'rgba(139,26,26,0.24)' : 'var(--sand)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold" style={{ fontSize: 14, color: 'var(--text-dark)' }}>{option.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Run verification for this gate</div>
                    </div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: selectedGate === option.value ? 'var(--maroon)' : '#fff', border: '1px solid var(--sand)' }}>
                      {selectedGate === option.value ? <CheckCircle2 size={14} color="#fff" /> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border p-6 text-center" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px]" style={{ background: 'rgba(139,26,26,0.08)', color: 'var(--maroon)' }}>
                <QrCode size={34} />
              </div>
              <div className="mt-4 font-serif font-bold" style={{ fontSize: 24, color: 'var(--text-dark)' }}>QR Scanner</div>
              <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Scan any ticket QR to get started with operator verification.</div>
              <button onClick={() => setScanModalOpen(true)} className="mt-5 rounded-2xl px-6 py-3 font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}>
                Scan Now
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(26,122,110,0.08)', color: '#1A7A6E' }}>
                <Search size={18} />
              </div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Lookup By Booking ID</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generate the QR detail first, then continue with the same verification flow.</div>
              </div>
            </div>

            <div className="space-y-4">
              <input
                value={lookupBookingId}
                onChange={event => setLookupBookingId(event.target.value)}
                placeholder="Enter booking ID"
                className="w-full rounded-2xl px-4 py-3 outline-none"
                style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 14 }}
              />

              <button
                onClick={handleGenerateQrLookup}
                disabled={loading}
                className="w-full rounded-2xl px-4 py-3 font-semibold text-white disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #1A7A6E 0%, #2E8F83 100%)' }}
              >
                {loading ? 'Loading Booking...' : 'Load Booking'}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: 'var(--sand)', background: '#fffaf5' }}>
              <div className="inline-flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-dark)', fontWeight: 700 }}>
                <Ticket size={14} style={{ color: '#C8922A' }} />
                Verification Flow
              </div>
              <div className="mt-3 space-y-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                <div>1. Select the gate based on operator permissions.</div>
                <div>2. Scan the QR or load it using booking ID.</div>
                <div>3. Review booking users and verify the selected tickets.</div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>QR Verification</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gateOptions.find(item => item.value === selectedGate)?.label ?? 'Selected Gate'}</div>
                </div>
                <button
                  onClick={() => {
                    setScanResult(null)
                    setSelectedTicketIds([])
                    setSuccessMessage('')
                    setError('')
                  }}
                  className="rounded-2xl px-4 py-3 font-medium"
                  style={{ background: '#fff', border: '1px solid var(--sand)', color: 'var(--text-mid)' }}
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw size={14} />
                    Scan Another
                  </span>
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  { label: 'Booking ID', value: `#${scanResult.bookingId}` },
                  { label: 'Paid Amount', value: formatCurrency(scanResult.totalAmountWithAddOn) },
                  { label: 'Total Users', value: String(scanResult.totalUsers) },
                  { label: 'Selected Users', value: String(selectedTicketIds.length) },
                ].map(card => (
                  <div key={card.label} className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: '#FCF7F0' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                    <div className="mt-3" style={{ fontSize: 18, color: 'var(--text-dark)', fontWeight: 700 }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(200,146,42,0.10)', color: '#C8922A' }}>
                  <Ticket size={18} />
                </div>
                <div>
                  <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Ticket Summary</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ticket type and add-on composition from the scanned booking.</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[22px] border" style={{ borderColor: 'var(--sand)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: '#F8F4EE' }}>
                      {['Ticket Type', 'Quantity', 'Add-ons'].map(header => (
                        <th key={header} className="px-4 py-3 text-left" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.ticketUserSummary.map((item, index) => (
                      <tr key={`${item.ticketTypeId}-${index}`} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--cream-dark)' }}>
                        <td className="px-4 py-3" style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 600 }}>{item.ticketTypeName}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.qty}</td>
                        <td className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-mid)' }}>{item.addOnList.length ? item.addOnList.map(addon => `${addon.ticketTypeName} x ${addon.qty}`).join(', ') : 'No add-ons'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="rounded-[28px] border bg-white p-6" style={{ borderColor: 'var(--sand)' }}>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Users</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select unverified users and complete the gate verification.</div>
              </div>

              <label className="inline-flex items-center gap-2 rounded-full px-3 py-2" style={{ background: '#F8F4EE', border: '1px solid var(--sand)', fontSize: 12, color: 'var(--text-dark)' }}>
                <input type="checkbox" checked={allSelected} onChange={() => setSelectedTicketIds(allSelected ? [] : allSelectableIds)} />
                Select all unverified
              </label>
            </div>

            <div className="space-y-3">
              {scanResult.selectedTicketUsers.map((userRow, index) => (
                <div key={userRow.id} className="rounded-[22px] border px-5 py-4" style={{ borderColor: 'var(--sand)', background: userRow.verified ? '#F4FBF8' : '#fff' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={userRow.verified || selectedTicketIds.includes(userRow.id)}
                        disabled={userRow.verified}
                        onChange={() => {
                          if (userRow.verified) return
                          setSelectedTicketIds(current => current.includes(userRow.id) ? current.filter(id => id !== userRow.id) : [...current, userRow.id])
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-dark)' }}>User {index + 1}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{userRow.ticketName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Ticket ID: {userRow.ticketId || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="rounded-full px-3 py-1.5" style={{ background: userRow.verified ? 'rgba(26,122,110,0.12)' : 'rgba(200,146,42,0.14)', color: userRow.verified ? '#1A7A6E' : '#9A6A00', fontSize: 11, fontWeight: 700 }}>
                      {userRow.verified ? 'Verified' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={verifySelectedTickets}
              disabled={verifying || !selectedTicketIds.length}
              className="mt-6 w-full rounded-2xl px-4 py-3 font-semibold text-white disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, var(--maroon) 0%, #C8922A 100%)' }}
            >
              {verifying ? 'Verifying Selected Users...' : 'Verify Selected Users'}
            </button>
          </section>
        </div>
      )}

      <ScanDialog open={scanModalOpen} onClose={() => setScanModalOpen(false)} onSubmit={value => { void scanQrDetail(value) }} />

      {!scanResult && !loading && error ? (
        <div className="rounded-[28px] border bg-white px-6 py-10 text-center" style={{ borderColor: 'rgba(229,62,62,0.22)' }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(229,62,62,0.10)', color: '#B83232' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="mt-4 font-serif font-bold" style={{ fontSize: 22, color: 'var(--text-dark)' }}>Invalid QR Code</div>
          <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Scan again or verify the QR detail string manually.</div>
        </div> 
      ) : null}
      </div>
      </main>
    </div>
  </div>
)
}
