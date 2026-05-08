export const AUDIT_STATUS_OPTIONS = [
  'IN_PROGRESS',
  'COMPLETED',
  'APPROVED',
  'CANCELLED',
  'DUE_DATE',
] as const

export const AUDIT_REQUEST_TYPES = {
  MY_REQUEST: 'MY_REQUEST',
  REQUEST_RECEIVED: 'REQUEST_RECEIVED',
} as const

export type AuditStatus = (typeof AUDIT_STATUS_OPTIONS)[number]
export type AuditRequestType = (typeof AUDIT_REQUEST_TYPES)[keyof typeof AUDIT_REQUEST_TYPES]

export type AuditUserSummary = {
  name: string
  ssoId: string
  userType: string
}

export type AuditItem = {
  id: string
  auditTitle: string
  description: string
  status: string
  dueDate: number | null
  createdDate: number | null
  updatedDate: number | null
  auditSubmitDate: number | null
  submitDescription: string
  image: string
  createdBy: string
  createdBySsoId: string
  createdByUserType: string
  assignToUserName: string
  assignToSsoId: string
  userType: string
}

export type AuditListResult = {
  auditDtos: AuditItem[]
  totalRecords: number
}

export type AuditListResponse = {
  message?: string
  result?: AuditListResult | null
}

export type AuditDetailResponse = {
  message?: string
  result?: AuditItem | null
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

export function toNumber(value: unknown, fallback: number | null = null) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function formatAuditDate(value: number | null | undefined, fallback = 'N/A') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getAuditStatusLabel(status: string) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'COMPLETED':
      return 'Completed'
    case 'APPROVED':
      return 'Approved'
    case 'CANCELLED':
      return 'Cancelled'
    case 'DUE_DATE':
      return 'Due Date'
    default:
      return status || 'Unknown'
  }
}

export function getAuditStatusTone(status: string) {
  switch (status) {
    case 'COMPLETED':
      return {
        background: 'rgba(26,122,110,0.12)',
        color: '#1A7A6E',
      }
    case 'APPROVED':
      return {
        background: 'rgba(67,56,202,0.12)',
        color: '#4338CA',
      }
    case 'IN_PROGRESS':
      return {
        background: 'rgba(59,130,246,0.12)',
        color: '#2563EB',
      }
    case 'CANCELLED':
    case 'DUE_DATE':
      return {
        background: 'rgba(184,50,50,0.12)',
        color: '#B83232',
      }
    default:
      return {
        background: 'rgba(107,114,128,0.12)',
        color: '#4B5563',
      }
  }
}

export function getFileNameFromUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return 'Attachment'

  const cleanName = trimmed.split('/').pop()?.split('?')[0] ?? trimmed
  const parts = cleanName.split('_')
  return parts.length > 1 ? parts.slice(1).join('_') : cleanName
}

export function normalizeAuditItem(value: unknown): AuditItem {
  const row = getRecord(value)

  return {
    id: toText(row.id),
    auditTitle: toText(row.auditTitle),
    description: toText(row.description),
    status: toText(row.status),
    dueDate: toNumber(row.dueDate),
    createdDate: toNumber(row.createdDate),
    updatedDate: toNumber(row.updatedDate),
    auditSubmitDate: toNumber(row.auditSubmitDate),
    submitDescription: toText(row.submitDescription),
    image: toText(row.image),
    createdBy: toText(row.createdBy),
    createdBySsoId: toText(row.createdBySsoId),
    createdByUserType: toText(row.createdByUserType),
    assignToUserName: toText(row.assignToUserName),
    assignToSsoId: toText(row.assignToSsoId),
    userType: toText(row.userType),
  }
}

export function normalizeAuditListResponse(payload: unknown): AuditListResult {
  const root = getRecord(payload)
  const result = getRecord(root.result)
  const rows = Array.isArray(result.auditDtos) ? result.auditDtos : []

  return {
    auditDtos: rows.map(normalizeAuditItem).filter(item => item.id),
    totalRecords: toNumber(result.totalRecords, 0) ?? 0,
  }
}

export function normalizeAuditDetailResponse(payload: unknown): AuditItem | null {
  const root = getRecord(payload)
  const result = getRecord(root.result)
  if (!Object.keys(result).length) return null
  const item = normalizeAuditItem(result)
  return item.id ? item : null
}
