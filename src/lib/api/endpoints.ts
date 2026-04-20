export const apiEndpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  dashboard: {
    summary: '/dashboard/summary',
    recentBookings: '/dashboard/recent-bookings',
    homeDetails: '/home/details',
  },
  bookings: {
    list: '/bookings',
    detail: (bookingId: string) => `/bookings/${encodeURIComponent(bookingId)}`,
  },
  places: {
    list: '/places',
    detail: (placeId: string) => `/places/${encodeURIComponent(placeId)}`,
  },
  reports: {
    inventory: '/reports/inventory',
    audit: '/reports/audit',
  },
  system: {
    status: '/system/status',
    logs: '/system/logs',
  },
} as const
