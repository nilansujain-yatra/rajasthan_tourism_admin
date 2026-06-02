function normalizeBaseUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, '')
}

export function resolveBaseUrl() {
  return (
    normalizeBaseUrl(process.env.API_BASE_URL) ??
    normalizeBaseUrl(process.env.RAJASTHAN_API_BASE_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ??
    (process.env.NEXT_PUBLIC_APP_ENV === 'production'
      ? normalizeBaseUrl(process.env.NEXT_PUBLIC_API_PROD_BASE_URL)
      : normalizeBaseUrl(process.env.NEXT_PUBLIC_API_STAGE_BASE_URL))
  ) ?? 'https://api-tourist.rajasthan.gov.in/rajasthan/api/v1'
}

export const baseUrl = resolveBaseUrl()
