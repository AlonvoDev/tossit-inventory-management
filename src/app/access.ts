/**
 * UI permission matrix (U1).
 *
 * This decides which screens and menu entries are shown. It is NOT a security
 * boundary: Firestore rules and callable functions (Codex, C1) enforce access.
 * Keep this table aligned with the role scope in the delivery plan:
 * - admin manages the business;
 * - manager manages their assigned department;
 * - staff operate inventory in their department.
 */
export type AppRole = 'admin' | 'manager' | 'staff';

export type AppRouteId =
  | 'dashboard'
  | 'admin'
  | 'adminUsers'
  | 'adminFridges'
  | 'reports'
  | 'settings';

interface RouteAccess {
  path: string;
  roles: readonly AppRole[];
}

export const ROUTE_ACCESS: Record<AppRouteId, RouteAccess> = {
  dashboard: { path: '/dashboard', roles: ['admin', 'manager', 'staff'] },
  admin: { path: '/admin', roles: ['admin', 'manager'] },
  adminUsers: { path: '/admin/users', roles: ['admin'] },
  adminFridges: { path: '/admin/fridges', roles: ['admin'] },
  reports: { path: '/reports', roles: ['admin', 'manager'] },
  settings: { path: '/settings', roles: ['admin'] },
};

const KNOWN_ROLES: readonly AppRole[] = ['admin', 'manager', 'staff'];

/** Narrow an untrusted role value; anything unknown grants nothing. */
export const toAppRole = (role: unknown): AppRole | null =>
  typeof role === 'string' && (KNOWN_ROLES as readonly string[]).includes(role)
    ? (role as AppRole)
    : null;

export const canAccessRoute = (role: unknown, routeId: AppRouteId): boolean => {
  const appRole = toAppRole(role);
  return appRole !== null && ROUTE_ACCESS[routeId].roles.includes(appRole);
};

/** Admin-only actions that are not routes (dialogs opened from the menu). */
export const canManageBusiness = (role: unknown): boolean => toAppRole(role) === 'admin';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'מנהל מערכת',
  manager: 'מנהל מחלקה',
  staff: 'עובד',
};

export const DEPARTMENT_LABELS: Record<'bar' | 'kitchen', string> = {
  bar: 'בר',
  kitchen: 'מטבח',
};

export const departmentLabel = (department: unknown): string | null => {
  if (department === 'bar' || department === 'kitchen') return DEPARTMENT_LABELS[department];
  return null;
};
