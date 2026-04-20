export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  children?: SubMenuItem[];
}

export interface SubMenuItem {
  id: string;
  label: string;
  parentId: string;
}

export interface Role {
  id: string;
  label: string;
}

export interface User {
  id: string;
  label: string;
  roleId: string;
}

export const ROLES: Role[] = [
  { id: "all", label: "All Roles" },
  { id: "admin", label: "Admin" },
  { id: "manager", label: "Manager" },
  { id: "operator", label: "Operator" },
  { id: "finance", label: "Finance Officer" },
  { id: "viewer", label: "Viewer" },
];

export const USERS: User[] = [
  { id: "all", label: "All Users", roleId: "all" },
  { id: "u1", label: "Rajesh Kumar", roleId: "admin" },
  { id: "u2", label: "Priya Sharma", roleId: "manager" },
  { id: "u3", label: "Amit Singh", roleId: "operator" },
  { id: "u4", label: "Sunita Verma", roleId: "finance" },
  { id: "u5", label: "Deepak Meena", roleId: "operator" },
  { id: "u6", label: "Kavita Joshi", roleId: "viewer" },
  { id: "u7", label: "Vikram Yadav", roleId: "manager" },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "main",
    label: "MAIN",
    children: [
      { id: "dashboard", label: "Dashboard", parentId: "main" },
      { id: "dashboard-monthwise", label: "Dashboard Month Wise", parentId: "main" },
      { id: "place-management", label: "Place Management", parentId: "main" },
      { id: "bookings", label: "Bookings", parentId: "main" },
      { id: "kiosk-management", label: "Kiosk Management", parentId: "main" },
    ],
  },
  {
    id: "finance",
    label: "FINANCE",
    children: [
      { id: "total-amount", label: "Total Amount", parentId: "finance" },
      { id: "risl-charge", label: "RISL Charge", parentId: "finance" },
      { id: "cancellation-refund", label: "Cancellation Refund", parentId: "finance" },
    ],
  },
  {
    id: "reports",
    label: "REPORTS",
    children: [
      { id: "analytics-report", label: "Analytics Report", parentId: "reports" },
      { id: "inventory-reports", label: "Inventory Reports", parentId: "reports" },
      { id: "total-bookings", label: "Total Bookings", parentId: "reports" },
      { id: "audit", label: "Audit", parentId: "reports" },
    ],
  },
  {
    id: "user-logistics",
    label: "USER & LOGISTICS",
    children: [
      { id: "user-management", label: "User Management", parentId: "user-logistics" },
      { id: "driver-management", label: "Driver Management", parentId: "user-logistics" },
      { id: "guide-management", label: "Guide Management", parentId: "user-logistics" },
      { id: "vendor-management", label: "Vendor Management", parentId: "user-logistics" },
    ],
  },
  {
    id: "operations",
    label: "OPERATIONS",
    children: [
      { id: "feedback", label: "Feedback", parentId: "operations" },
      { id: "help-desk", label: "Help Desk", parentId: "operations" },
      { id: "content-management", label: "Content Management", parentId: "operations" },
      { id: "terms-conditions", label: "Terms & Conditions", parentId: "operations" },
      { id: "menu-management", label: "Menu Management", parentId: "operations" },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    children: [
      { id: "user-logs", label: "User Logs", parentId: "system" },
      { id: "server-logs", label: "Server Logs", parentId: "system" },
      { id: "payment-reverify", label: "Payment Reverify", parentId: "system" },
      { id: "place-active-status", label: "Place Active Status", parentId: "system" },
    ],
  },
];