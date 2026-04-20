import type { AuthUser } from './jwt'

export const AUTH_USER_STORAGE_KEY = 'rajasthan_obms_auth_user'

type StoredAuthUser = {
  user: AuthUser
  savedAt: number
}

function isExpired(user: AuthUser) {
  return typeof user.exp === 'number' && user.exp <= Math.floor(Date.now() / 1000)
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readCachedAuthUser() {
  if (!canUseStorage()) {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_USER_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const stored = JSON.parse(rawValue) as StoredAuthUser

    if (!stored?.user || isExpired(stored.user)) {
      clearCachedAuthUser()
      return null
    }

    return stored.user
  } catch {
    clearCachedAuthUser()
    return null
  }
}

export function writeCachedAuthUser(user: AuthUser | null | undefined) {
  if (!canUseStorage()) {
    return
  }

  if (!user || isExpired(user)) {
    clearCachedAuthUser()
    return
  }

  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify({
    user,
    savedAt: Date.now(),
  }))
}

export function clearCachedAuthUser() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
}
