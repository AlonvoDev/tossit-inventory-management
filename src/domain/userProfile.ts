import { Timestamp } from 'firebase/firestore';
import type { UserProfile } from '../types/UserProfile';

/** Normalize legacy display fields without manufacturing authority or a business. */
export function parseUserProfile(uid: string, data: Record<string, unknown>): UserProfile | null {
  if ((data.isActive !== undefined && data.isActive !== true) || (data.uid !== undefined && data.uid !== uid)) return null;
  const role = data.role === 'user' ? 'staff' : data.role;
  const rawDepartment = data.department ?? data.area;
  const department = rawDepartment === 'בר' ? 'bar' : rawDepartment === 'מטבח' ? 'kitchen' : rawDepartment;
  if (role !== 'admin' && role !== 'manager' && role !== 'staff') return null;
  if (department !== 'bar' && department !== 'kitchen') return null;
  if (typeof data.businessId !== 'string' || !data.businessId.trim()) return null;
  if (typeof data.email !== 'string' || !data.email.trim()) return null;
  const fullName = typeof data.fullName === 'string' && data.fullName.trim()
    ? data.fullName : typeof data.displayName === 'string' ? data.displayName : data.email.split('@')[0];
  return {
    uid, fullName, email: data.email, role, department, businessId: data.businessId,
    isActive: true,
    isOnShift: data.isOnShift === true,
    ...(data.shiftStartedAt instanceof Timestamp ? { shiftStartedAt: data.shiftStartedAt } : {}),
    ...(data.createdAt instanceof Timestamp ? { createdAt: data.createdAt } : {}),
    ...(typeof data.phoneNumber === 'string' ? { phoneNumber: data.phoneNumber } : {}),
  };
}
