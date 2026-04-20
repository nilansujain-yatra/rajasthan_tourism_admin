import type { ApiErrorPayload } from './types'

export class ApiError extends Error {
  status: number
  payload?: ApiErrorPayload

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export class ApiTimeoutError extends Error {
  constructor(message = 'Request timed out.') {
    super(message)
    this.name = 'ApiTimeoutError'
  }
}
