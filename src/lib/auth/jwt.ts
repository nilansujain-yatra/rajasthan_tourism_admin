export type AuthUser = {
  iss?: string
  sub?: string
  email?: string
  ssoid?: string
  userRole?: string
  userType?: string
  systemAdmin?: boolean
  placeId?: string[]
  isDepartmentAdmin?: boolean
  onSiteBooking?: boolean
  placeName?: string
  expireType?: number
  exp?: number
  iat?: number
  [key: string]: unknown
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=')

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8')
  }

  return atob(padded)
}

export function decodeJwt<TPayload = AuthUser>(token: string): TPayload | null {
  try {
    const [, payload] = token.split('.')

    if (!payload) {
      return null
    }

    return JSON.parse(decodeBase64Url(payload)) as TPayload
  } catch {
    return null
  }
}

export function getJwtMaxAgeSeconds(user: AuthUser | null, fallbackSeconds = 60 * 60 * 8) {
  if (typeof user?.expireType === 'number' && user.expireType > 0) {
    return Math.floor(user.expireType / 1000)
  }

  if (typeof user?.exp === 'number') {
    const secondsUntilExpiry = user.exp - Math.floor(Date.now() / 1000)

    if (secondsUntilExpiry > 0) {
      return secondsUntilExpiry
    }
  }

  return fallbackSeconds
}
