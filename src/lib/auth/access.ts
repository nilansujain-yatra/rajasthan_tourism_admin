import type { AuthUser } from './jwt'

export type AppAccessRole = 'super-admin' | 'operator' | 'jkk'

const JKK_USER_TYPES = ['JKK_ASSIGNER', 'JKK_REVIEWER', 'JKK_MODERATOR', 'JKK_APPROVER'] as const

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

export function isJkkUser(user: AuthUser | null | undefined) {
  const roleValues = getUserRoleValues(user)
  return JKK_USER_TYPES.some(role => roleValues.includes(role))
}

export function getAccessRole(user: AuthUser | null | undefined): AppAccessRole {
  if (isOperatorUser(user) && !isSuperAdminUser(user)) {
    return 'operator'
  }

  if (isJkkUser(user) && !isSuperAdminUser(user)) {
    return 'jkk'
  }

  return 'super-admin'
}

export function getDefaultPathForUser(user: AuthUser | null | undefined) {
  const accessRole = getAccessRole(user)

  if (accessRole === 'operator') {
    return '/bookings/operator'
  }

  if (accessRole === 'jkk') {
    return '/reports/jkk'
  }

  return '/dashboard'
}
