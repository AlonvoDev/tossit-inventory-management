import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { UserProfile } from '../types/UserProfile';
import { validateUserForm, emptyUserForm, toUpdatePayload, formFromProfile } from '../features/users/userForm';

const api = vi.hoisted(() => ({
  getAllUsers: vi.fn(),
  createUserByAdmin: vi.fn(),
  updateUserByAdmin: vi.fn(),
  deleteUserByAdmin: vi.fn(),
}));
vi.mock('../api/authAPI', () => api);
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, businessId: 'b1', uid: 'admin-1', loading: false }),
}));

import AdminUsersPage from './AdminUsersPage';

const users: UserProfile[] = [
  { uid: 'admin-1', fullName: 'אדמין', email: 'a@x.co', role: 'admin', department: 'bar', businessId: 'b1' },
  { uid: 'mgr-1', fullName: 'מנהלת מטבח', email: 'm@x.co', role: 'manager', department: 'kitchen', businessId: 'b1' },
  { uid: 'staff-1', fullName: 'עובד בר', email: 's@x.co', role: 'staff', department: 'bar', businessId: 'b1' },
  { uid: 'old-1', fullName: 'עובד לשעבר', email: 'o@x.co', role: 'staff', department: 'kitchen', businessId: 'b1', isActive: false },
];

const renderPage = (path = '/admin/users') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Routes>
    </MemoryRouter>,
  );

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

describe('userForm rules', () => {
  it('requires a department for staff and managers but not admins', () => {
    const base = { ...emptyUserForm(), fullName: 'x', email: 'x@y.co', password: '123456' };
    expect(validateUserForm({ ...base, role: 'manager', department: '' as never }, 'create').department).toBeDefined();
    expect(validateUserForm({ ...base, role: 'staff', department: '' as never }, 'create').department).toBeDefined();
    expect(validateUserForm({ ...base, role: 'admin', department: '' as never }, 'create').department).toBeUndefined();
  });

  it('keeps a manager department on edit instead of resetting to bar', () => {
    const form = formFromProfile(users[1]);
    expect(toUpdatePayload(form)).toMatchObject({ role: 'manager', department: 'kitchen' });
  });

  it('validates create-only fields in Hebrew', () => {
    const errors = validateUserForm(emptyUserForm(), 'create');
    expect(errors.fullName).toBe('יש להזין שם מלא');
    expect(errors.email).toBe('יש להזין כתובת דוא״ל');
    expect(errors.password).toBe('יש להזין סיסמה ראשונית');
    expect(validateUserForm({ ...emptyUserForm(), fullName: 'x' }, 'edit')).toEqual({});
  });
});

describe('AdminUsersPage', () => {
  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    api.getAllUsers.mockResolvedValue(users);
  });

  it('lists users with Hebrew roles and department scope for managers', async () => {
    renderPage();
    const row = await waitFor(() => rowOf('מנהלת מטבח'));
    expect(within(row).getByText('מנהל מחלקה')).toBeInTheDocument();
    expect(within(row).getByText('מטבח')).toBeInTheDocument();
    expect(within(rowOf('אדמין')).getByText('כל המחלקות')).toBeInTheDocument();
  });

  it('edits a manager without losing their department', async () => {
    api.updateUserByAdmin.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => rowOf('מנהלת מטבח'));
    await userEvent.click(within(rowOf('מנהלת מטבח')).getByRole('button', { name: 'עריכה' }));
    await userEvent.click(screen.getByRole('button', { name: 'שמור שינויים' }));
    await waitFor(() =>
      expect(api.updateUserByAdmin).toHaveBeenCalledWith(
        'mgr-1',
        expect.objectContaining({ role: 'manager', department: 'kitchen' }),
      ),
    );
  });

  it('deactivation is labeled as such, keeps the record and reloads from the server', async () => {
    api.deleteUserByAdmin.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => rowOf('עובד בר'));
    await userEvent.click(within(rowOf('עובד בר')).getByRole('button', { name: 'השבתה' }));
    expect(confirm.mock.calls[0][0]).toContain('הפרטים שלו נשמרים לתיעוד ואינם נמחקים');
    expect(api.deleteUserByAdmin).toHaveBeenCalledWith('staff-1');
    expect(await screen.findByText(/הושבת. הפרטים נשמרו לתיעוד/)).toBeInTheDocument();
    expect(api.getAllUsers).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
  });

  it('shows deactivated users without edit, deactivate or reactivate controls', async () => {
    renderPage();
    const row = await waitFor(() => rowOf('עובד לשעבר'));
    expect(within(row).getByText('מושבת')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('cannot deactivate yourself', async () => {
    renderPage();
    await waitFor(() => rowOf('אדמין'));
    expect(within(rowOf('אדמין')).getByRole('button', { name: 'השבתה' })).toBeDisabled();
  });

  it('shows a permission error instead of a success', async () => {
    api.deleteUserByAdmin.mockRejectedValue(Object.assign(new Error('x'), { code: 'functions/permission-denied' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => rowOf('עובד בר'));
    await userEvent.click(within(rowOf('עובד בר')).getByRole('button', { name: 'השבתה' }));
    expect(await screen.findByText('אין לך הרשאה לבצע פעולה זו.')).toBeInTheDocument();
    expect(screen.queryByText(/הושבת/)).not.toBeInTheDocument();
  });

  it('treats a lease conflict as retryable', async () => {
    api.deleteUserByAdmin.mockRejectedValue(Object.assign(new Error('x'), { code: 'functions/aborted' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => rowOf('עובד בר'));
    await userEvent.click(within(rowOf('עובד בר')).getByRole('button', { name: 'השבתה' }));
    expect(await screen.findByText(/נסה שוב בעוד רגע/)).toBeInTheDocument();
  });

  it('opens the single create form from ?add=1 and requires a manager department', async () => {
    api.createUserByAdmin.mockResolvedValue('new-uid');
    renderPage('/admin/users?add=1');
    expect(await screen.findByText('הוספת משתמש חדש')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('שם פרטי ומשפחה'), { target: { value: 'רון' } });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'r@x.co' } });
    fireEvent.change(screen.getByPlaceholderText('לפחות 6 תווים'), { target: { value: '123456' } });
    fireEvent.change(screen.getByTitle('בחר תפקיד'), { target: { value: 'manager' } });
    fireEvent.change(screen.getByTitle('בחר מחלקה'), { target: { value: 'kitchen' } });
    await userEvent.click(screen.getByRole('button', { name: 'צור משתמש' }));
    await waitFor(() =>
      expect(api.createUserByAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'manager', department: 'kitchen', fullName: 'רון', requestId: expect.any(String) }),
        'b1',
      ),
    );
  });

  it('reuses one requestId when retrying the same create form', async () => {
    api.createUserByAdmin
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'functions/unavailable' }))
      .mockResolvedValueOnce('new-uid');
    renderPage('/admin/users?add=1');
    await screen.findByText('הוספת משתמש חדש');
    fireEvent.change(screen.getByPlaceholderText('שם פרטי ומשפחה'), { target: { value: 'רון' } });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'r@x.co' } });
    fireEvent.change(screen.getByPlaceholderText('לפחות 6 תווים'), { target: { value: '123456' } });
    await userEvent.click(screen.getByRole('button', { name: 'צור משתמש' }));
    expect(await screen.findByText('אין חיבור לשרת. בדוק את החיבור ונסה שוב.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'צור משתמש' }));
    await waitFor(() => expect(api.createUserByAdmin).toHaveBeenCalledTimes(2));
    const [first, second] = api.createUserByAdmin.mock.calls.map(c => c[0].requestId);
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });
});
