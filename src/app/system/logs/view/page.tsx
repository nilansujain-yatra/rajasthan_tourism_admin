'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Copy, FileText, RefreshCw } from 'lucide-react'
import { authFetch } from '@/lib/api/authFetch'

function getMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const message = (payload as Record<string, unknown>).message
  return typeof message === 'string' && message.trim() ? message.trim() : fallback
}

export default function UserLogFileViewerPage() {
  const searchParams = useSearchParams()
  const filePath = searchParams.get('filePath')?.trim() ?? ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadFile() {
      try {
        setLoading(true)
        setError('')

        if (!filePath) {
          throw new Error('Missing file path.')
        }

        function resolveFileUrl(filePath: string) {
          const trimmed = filePath.trim()
          if (/^https?:\/\//i.test(trimmed)) return trimmed
          if (trimmed.startsWith('/')) return `${trimmed}`
          return `${trimmed.replace(/^\/+/, '')}`
        }
        const response = await authFetch(`${resolveFileUrl(encodeURIComponent(filePath))}?filePath=${encodeURIComponent(filePath)}`, {
          headers: { Accept: 'text/plain, text/*, application/json, */*' },
          cache: 'no-store',
        })

        const body = await response.text()

        if (!response.ok) {
          let payload: unknown = {}
          if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
            try {
              payload = JSON.parse(body)
            } catch {
              payload = {}
            }
          }
          throw new Error(getMessage(payload, body.trim() || 'Unable to load file data.'))
        }

        if (mounted) {
          setContent(body)
        }
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to load file data.')
        setContent('')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadFile()

    return () => {
      mounted = false
    }
  }, [filePath])

  async function copyContent() {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="min-h-screen px-4 py-4" style={{ background: 'var(--cream)' }}>
      <div className="mx-auto max-w-6xl rounded-[28px] border bg-white p-5 shadow-[0_18px_42px_rgba(107,18,18,0.08)]" style={{ borderColor: 'var(--sand)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--sand)' }}>
          <div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--maroon)' }}>
              <FileText size={16} />
              User Log File Viewer
            </div>
            <p className="mt-1 break-all text-xs" style={{ color: 'var(--text-muted)' }}>{filePath || 'No file path provided.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/system/logs', '_self')}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}
            >
              <ArrowLeft size={15} />
              Back
            </button>
            <button
              onClick={copyContent}
              disabled={!content}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--maroon)' }}
            >
              <Copy size={15} />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{ background: 'var(--cream-dark)', color: 'var(--text-mid)' }}
            >
              <RefreshCw size={15} />
              Reload
            </button>
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-[24px] border p-6" style={{ borderColor: 'var(--sand)', background: 'var(--cream)' }}>
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-1/3 rounded-full bg-[var(--cream-dark)]" />
                <div className="h-4 w-2/3 rounded-full bg-[var(--cream-dark)]" />
                <div className="h-4 w-full rounded-full bg-[var(--cream-dark)]" />
                <div className="h-4 w-5/6 rounded-full bg-[var(--cream-dark)]" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[24px] border p-6 text-sm" style={{ borderColor: 'rgba(229,62,62,0.22)', background: 'rgba(229,62,62,0.05)', color: '#B42318' }}>
              {error}
            </div>
          ) : (
            <pre className="max-h-[calc(100vh-180px)] overflow-auto rounded-[24px] border p-5 text-sm leading-6" style={{ borderColor: 'var(--sand)', background: '#FAF8F4', color: 'var(--text-dark)' }}>
              {content || 'No file content available.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
