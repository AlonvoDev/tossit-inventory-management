import type { CreateUserData, UpdateUserData } from '../../api/authAPI';
import type { UserProfile } from '../../types/UserProfile';

/**
 * Admin user form rules (U3b). Presentation-side validation only; the server/rules are
 * authoritative. Managers are scoped to their department, so department is required for
 * both staff and managers. Admins are business-wide.
 */
export type UserFormData = CreateUserData;
export type UserFormErrors = Partial<Record<keyof UserFormData, string>>;

export const emptyUserForm = (): UserFormData => ({
  fullName: '',
  email: '',
  phoneNumber: '',
  role: 'staff',
  department: 'bar',
  password: '',
});

export const roleNeedsDepartment = (role: UserFormData['role']): boolean => role !== 'admin';

export const formFromProfile = (user: UserProfile): UserFormData => ({
  fullName: user.fullName || '',
  email: user.email || '',
  phoneNumber: user.phoneNumber || '',
  role: user.role === 'admin' || user.role === 'manager' ? user.role : 'staff',
  department: user.department === 'kitchen' ? 'kitchen' : 'bar',
  password: '',
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUserForm = (form: UserFormData, mode: 'create' | 'edit'): UserFormErrors => {
  const errors: UserFormErrors = {};
  if (!form.fullName.trim()) errors.fullName = 'יש להזין שם מלא';
  if (mode === 'create') {
    if (!form.email.trim()) errors.email = 'יש להזין כתובת דוא״ל';
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'כתובת הדוא״ל אינה תקינה';
    if (!form.password) errors.password = 'יש להזין סיסמה ראשונית';
    else if (form.password.length < 6) errors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
  }
  if (!['admin', 'manager', 'staff'].includes(form.role)) errors.role = 'יש לבחור תפקיד';
  if (roleNeedsDepartment(form.role) && form.department !== 'bar' && form.department !== 'kitchen') {
    errors.department = 'יש לבחור מחלקה';
  }
  return errors;
};

/** Edit payload: email and password are not editable here; department is always explicit. */
export const toUpdatePayload = (form: UserFormData): UpdateUserData => ({
  fullName: form.fullName.trim(),
  phoneNumber: form.phoneNumber?.trim() || '',
  role: form.role,
  department: form.department,
});

export const toCreatePayload = (form: UserFormData): CreateUserData => ({
  ...form,
  fullName: form.fullName.trim(),
  email: form.email.trim(),
  phoneNumber: form.phoneNumber?.trim() || '',
});
