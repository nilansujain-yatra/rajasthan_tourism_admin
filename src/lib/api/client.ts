import { env } from '@/lib/config/env'
import { ApiError, ApiTimeoutError } from './errors'
import type { ApiErrorPayload, ApiRequestOptions, QueryParams, QueryValue } from './types'

function appendQueryParam(searchParams: URLSearchParams, key: string, value: QueryValue) {
  if (value === null || value === undefined || value === '') {
    return
  }

  searchParams.append(key, String(value))
}

function buildUrl(path: string, query?: QueryParams) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${env.apiBaseUrl}${normalizedPath}`)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item => appendQueryParam(url.searchParams, key, item))
        return
      }

      appendQueryParam(url.searchParams, key, value)
    })
  }

  return url.toString()
}

function isJsonResponse(response: Response) {
  return response.headers.get('content-type')?.includes('application/json')
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return null
  }

  if (isJsonResponse(response)) {
    return response.json()
  }

  return response.text()
}

async function parseErrorPayload(response: Response): Promise<ApiErrorPayload | undefined> {
  try {
    const body = await parseResponseBody(response)

    if (body && typeof body === 'object') {
      return body as ApiErrorPayload
    }

    if (typeof body === 'string' && body) {
      return { message: body }
    }
  } catch {
    return undefined
  }

  return undefined
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const {
    body,
    headers,
    query,
    timeoutMs = env.apiTimeoutMs,
    authToken,
    ...requestInit
  } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const requestHeaders = new Headers(headers)

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json')
  }

  if (authToken) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`)
  }

  try {
    const response = await fetch(buildUrl(path, query), {
      ...requestInit,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: requestHeaders,
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await parseErrorPayload(response)
      throw new ApiError(
        payload?.message ?? `API request failed with status ${response.status}.`,
        response.status,
        payload
      )
    }

    return (await parseResponseBody(response)) as TResponse
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiTimeoutError(`Request timed out after ${timeoutMs}ms.`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export const apiClient = {
  get: <TResponse>(path: string, options?: ApiRequestOptions) =>
    apiRequest<TResponse>(path, { ...options, method: 'GET' }),

  post: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<TResponse>(path, { ...options, method: 'POST', body }),

  put: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<TResponse>(path, { ...options, method: 'PUT', body }),

  patch: <TResponse>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<TResponse>(path, { ...options, method: 'PATCH', body }),

  delete: <TResponse>(path: string, options?: ApiRequestOptions) =>
    apiRequest<TResponse>(path, { ...options, method: 'DELETE' }),
}
