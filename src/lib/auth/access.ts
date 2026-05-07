import type { AuthUser } from './jwt'

export type AppAccessRole = 'super-admin' | 'operator'

function normalizeRoleValue(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

export function getUserRoleValues(user: AuthUser | null | undefined) {
  if (!user) {
    return []
  }

  const values = [
    user.userType,
    user.userRole,
    typeof user.role === 'string' ? user.role : undefined,
    typeof user.designation === 'string' ? user.designation : undefined,
  ]

  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(normalizeRoleValue)
}

export function isSuperAdminUser(user: AuthUser | null | undefined) {
  return user?.systemAdmin === true || getUserRoleValues(user).includes('SUPER_ADMIN')
}

export function isOperatorUser(user: AuthUser | null | undefined) {
  return getUserRoleValues(user).includes('OPERATOR')
}

export function getAccessRole(user: AuthUser | null | undefined): AppAccessRole {
  return isOperatorUser(user) && !isSuperAdminUser(user) ? 'operator' : 'super-admin'
}

export function getDefaultPathForUser(user: AuthUser | null | undefined) {
  return getAccessRole(user) === 'operator'
    ? '/bookings/operator'
    : '/dashboard'
}
