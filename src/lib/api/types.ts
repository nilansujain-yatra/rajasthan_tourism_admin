export type QueryValue = string | number | boolean | null | undefined

export type QueryParams = Record<string, QueryValue | QueryValue[]>

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  query?: QueryParams
  timeoutMs?: number
  authToken?: string | null
}

export type PaginatedResponse<T> = {
  data: T[]
  page: number
  pageSize: number
  total: number
}

export type ApiErrorPayload = {
  message?: string
  code?: string
  errors?: unknown
}
