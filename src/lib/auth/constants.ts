export const AUTHENTICATION_TOKEN = 'auth_token'
export const SSO_TOKEN = 'sso_token'

export const SSO_MODES = {
  PROD: 'PROD',
  STAGE: 'STAGE',
} as const

export const AUTH_COOKIE_NAMES = {
  authToken: AUTHENTICATION_TOKEN,
  ssoToken: SSO_TOKEN,
} as const

export const ALL_OBMS_USER_TYPES = [
  'SUPER_ADMIN',
  'DEPARTMENT',
  'DIVISION',
  'DISTRICT',
  'CONTENT_MANAGER',
  'SITE_ADMIN',
  'OPERATOR',
  'CONTENT_CREATOR',
  'VENDOR',
  'HELP_DESK_OPERATOR',
  'JKK_ASSIGNER',
  'JKK_REVIEWER',
  'JKK_MODERATOR',
  'JKK_APPROVER',
  'IGPRS_REVIEWER',
  'IGPRS_MODERATOR',
  'IGPRS_APPROVER',
] as const
