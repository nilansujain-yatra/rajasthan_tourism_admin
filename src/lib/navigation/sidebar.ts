import type { AuthUser } from '@/lib/auth/jwt'
import { getAccessRole } from '@/lib/auth/access'

export type NavItem = {
  href: string
  icon: string
  label: string
  matchPath?: string
  matchQuery?: Record<string, string>
}

export type NavSection = {
  label: string
  items: NavItem[]
}

const SUPER_ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', icon: '📊', label: 'Dashboard' },
      { href: '/dashboardMonthWise', icon: '📊', label: 'Dashboard Month Wise' },
      { href: '/places', icon: '🏯', label: 'Place Management' },
      { href: '/bookings', icon: '🎫', label: 'Bookings' },
      { href: '/operations/service-head', icon: '🧾', label: 'Service / Head Management' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/analytics', icon: '📈', label: 'Analytics Report' },
      { href: '/reports/inventory', icon: '📦', label: 'Inventory Reports' },
      { href: '/reports/non-inventory', icon: '🧾', label: 'Non-Inventory Reports' },
      { href: '/reports/jkk', icon: '🏛️', label: 'JKK Report' },
      { href: '/finance/refunds', icon: '💳', label: 'Cancellation Refund' },
    ],
  },
  {
    label: 'User & Logistics',
    items: [
      { href: '/users', icon: '👤', label: 'User Management' },
      { href: '/operations/drivers', icon: '🚗', label: 'Driver Management' },
      { href: '/operations/guides', icon: '🧭', label: 'Guide Management' },
      { href: '/operations/vendors', icon: '🏪', label: 'Vendor Management' },
      { href: '/operations/packages', icon: '📦', label: 'Package Management' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/operations/feedback', icon: '💬', label: 'Feedback' },
      { href: '/operations/helpdesk', icon: '🛟', label: 'Help Desk' },
      { href: '/operations/content', icon: '📝', label: 'Content Management' },
      { href: '/operations/cancellation-policy', icon: '🧾', label: 'Cancellation Policy' },
      { href: '/operations/menu', icon: '📝', label: 'Menu Management' },
      { href: '/operations/terms', icon: '📜', label: 'Terms & Conditions' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/system/logs', icon: '📂', label: 'User Logs' },
      { href: '/system/server', icon: '🖥️', label: 'Server Logs' },
      { href: '/system/payment', icon: '💳', label: 'Payment Reverify' },
      { href: '/system/status', icon: '🟢', label: 'Place Active Status' },
    ],
  },
]

const OPERATOR_NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operator',
    items: [
      {
        href: '/bookings/operator',
        icon: '🎫',
        label: 'Ticket Booking',
        matchPath: '/bookings/operator',
      },
      {
        href: '/reports/inventory?report=mis',
        icon: '📊',
        label: 'Report',
        matchPath: '/reports/inventory',
        matchQuery: { report: 'mis' },
      },
      {
        href: '/system/logs',
        icon: '🧾',
        label: 'Audit',
      },
      {
        href: '/operator/information',
        icon: '📚',
        label: 'Informations',
      },
      {
        href: '/operator/verification',
        icon: '✅',
        label: 'Verification',
      },
      {
        href: '/bookings/composite',
        icon: '🧩',
        label: 'Composite Ticket',
        matchPath: '/bookings/composite',
      },
    ],
  },
]

export function getSidebarSectionsForUser(user: AuthUser | null | undefined) {
  return getAccessRole(user) === 'operator' ? OPERATOR_NAV_SECTIONS : SUPER_ADMIN_NAV_SECTIONS
}
