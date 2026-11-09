// Department normalizer: single shared definition (Codex C2), canonical 'bar' | 'kitchen'
// plus legacy Hebrew values. Re-exported so UI code has one import site.
import { normalizeDepartment } from '../domain/normalizeItem';
import type { Department } from '../domain/contracts';
export { normalizeDepartment };
export type { Department };

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
  // Managers manage fridges of their own department (C1b rules); the page scopes the list and form.
  adminFridges: { path: '/admin/fridges', roles: ['admin', 'manager'] },
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
  const normalized = normalizeDepartment(department);
  return normalized ? DEPARTMENT_LABELS[normalized] : null;
};

/**
 * Departments whose inventory the role may see and operate: admin both, manager/staff their own.
 * Mirrors the C1b `scoped`/`operates` rules (shift requirement for staff is checked separately).
 */
export const operableDepartments = (role: unknown, ownDepartment: unknown): Department[] => {
  const appRole = toAppRole(role);
  if (appRole === 'admin') return ['bar', 'kitchen'];
  const own = normalizeDepartment(ownDepartment);
  return appRole && own ? [own] : [];
};

/**
 * Departments whose catalog (products, fridges) the role may manage in the UI.
 * Mirrors the C1b rules: admin business-wide; manager only their own department; staff none.
 */
export const manageableDepartments = (role: unknown, ownDepartment: unknown): Department[] => {
  const appRole = toAppRole(role);
  if (appRole === 'admin') return ['bar', 'kitchen'];
  const own = normalizeDepartment(ownDepartment);
  return appRole === 'manager' && own ? [own] : [];
};
