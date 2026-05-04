export const apiEndpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  users: {
    getAllUserList: '/user/getAllUserList',
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
    nonInventory: '/reports/non-inventory',
    audit: '/reports/audit',
  },
  system: {
    status: '/system/status',
    logs: '/system/logs',
  },
} as const
