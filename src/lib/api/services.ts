import { apiClient } from './client'
import { apiEndpoints } from './endpoints'
import type { ApiRequestOptions, PaginatedResponse, QueryParams } from './types'

export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled'

export type Booking = {
  id: string
  site: string
  date: string
  visitors: number
  category: string
  amount: number
  payment: string
  status: BookingStatus
}

export type PlaceStatus = 'live' | 'pending' | 'closed'

export type Place = {
  id: string
  name: string
  visitors: number
  category: string
  status: PlaceStatus
}

export type DashboardSummary = {
  totalBookings: number
  totalVisitors: number
  totalAmount: number
  rislCharge: number
  liveSites: number
}

export type TicketTypeSummary = {
  ticketTypeName: string
  ticketCount: number
  totalAmount: number
  addOnAmountSum: number
}

export type TicketHeadSummary = {
  id: string
  name: string
  emitraId: string
  amount: number
  percentage: number
}

export type PlaceWiseReport = {
  placeName: string
  placeCode: string
  placeId: string
  totalVisitors: number
  totalAmount: number
  totalBooking: number
  ticketTypeListDtos: TicketTypeSummary[]
  ticketHeads: TicketHeadSummary[]
  offlineTicketTypeListDtos: TicketTypeSummary[]
  onlineTicketTypeListDtos: TicketTypeSummary[]
  offlineTicketHeads: TicketHeadSummary[]
  onlineTicketHeads: TicketHeadSummary[]
  totalBookingsOnline: number
  totalBookingsOffline: number
}

export type HomeDetailsReport = {
  totalRecords: number
  totalVehicle: number
  totalNotification: number
  noTicketsSold: number
  collectedAmount: number
  totalUsers: number
  noOfRefunds: number
  totalBookingsOnline: number
  totalBookingsOffline: number
  offlineTotalTicketCount: Record<string, number>
  offlineTotalTicketAmount: Record<string, number>
  onlineTotalTicketCount: Record<string, number>
  onlineTotalTicketAmount: Record<string, number>
  totalTicketCount: Record<string, number>
  totalTicketAmount: Record<string, number>
  totalVisitors: number
  totalAmount: number
  placeWiseReports: PlaceWiseReport[]
}

export type HomeDetailsResponse = {
  code: number
  message: string
  result: HomeDetailsReport
  errors: unknown[]
  meta: Record<string, unknown>
}

export const dashboardApi = {
  getSummary: (options?: ApiRequestOptions) =>
    apiClient.get<DashboardSummary>(apiEndpoints.dashboard.summary, options),

  getRecentBookings: (options?: ApiRequestOptions) =>
    apiClient.get<Booking[]>(apiEndpoints.dashboard.recentBookings, options),

  getHomeDetails: (options?: ApiRequestOptions) =>
    apiClient.get<HomeDetailsResponse>(apiEndpoints.dashboard.homeDetails, {
      ...options,
      query: {
        ...options?.query,
        isFilter: true,
      },
    }),
}

export const bookingsApi = {
  list: (query?: QueryParams, options?: ApiRequestOptions) =>
    apiClient.get<PaginatedResponse<Booking>>(apiEndpoints.bookings.list, {
      ...options,
      query,
    }),

  detail: (bookingId: string, options?: ApiRequestOptions) =>
    apiClient.get<Booking>(apiEndpoints.bookings.detail(bookingId), options),
}

export const placesApi = {
  list: (query?: QueryParams, options?: ApiRequestOptions) =>
    apiClient.get<PaginatedResponse<Place>>(apiEndpoints.places.list, {
      ...options,
      query,
    }),

  detail: (placeId: string, options?: ApiRequestOptions) =>
    apiClient.get<Place>(apiEndpoints.places.detail(placeId), options),
}
