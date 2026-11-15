import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Block as BlockIcon, Edit as EditIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { PageHeader } from '../components/layout/PageHeader';
import { getAllUsers, createUserByAdmin, updateUserByAdmin, deleteUserByAdmin } from '../api/authAPI';
import { UserProfile } from '../types/UserProfile';
import { useSearchParams } from 'react-router-dom';
import { departmentLabel, ROLE_LABELS, toAppRole } from '../app/access';
import {
  emptyUserForm,
  formFromProfile,
  roleNeedsDepartment,
  toCreatePayload,
  toUpdatePayload,
  UserFormData,
  UserFormErrors,
  validateUserForm,
} from '../features/users/userForm';
import { errorMessage } from '../features/common/errorMessage';

const errorText = (err: unknown, fallback: string): string => {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 'auth/email-already-in-use' || code === 'functions/already-exists'
    ? 'כתובת הדוא״ל כבר רשומה במערכת.'
    : errorMessage(err, fallback);
};

/** Legacy profiles without isActive are active; only an explicit false is deactivated (C1 contract). */
const isDeactivated = (user: UserProfile) => user.isActive === false;

const formatCreatedAt = (createdAt: UserProfile['createdAt']): string => {
  const millis = (createdAt as { toMillis?: () => number } | undefined)?.toMillis?.();
  return typeof millis === 'number' ? new Date(millis).toLocaleDateString('he-IL') : '-';
};

const AdminUsersPage: React.FC = () => {
  const { isAdmin, businessId, uid: currentUid, loading: authLoading, isOffline } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state used by both add and edit modals
  const [formData, setFormData] = useState<UserFormData>(emptyUserForm());
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  // One idempotency ID per create intent: reused on retry of the same form, renewed when the form reopens.
  const [createRequestId, setCreateRequestId] = useState<string>(() => crypto.randomUUID());

  const loadUsers = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      setUsers(await getAllUsers(businessId));
    } catch (err: unknown) {
      console.error('Error loading users:', err);
      setError(errorText(err, 'טעינת רשימת המשתמשים נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (isAdmin && businessId) {
      loadUsers();
    }
  }, [isAdmin, businessId, loadUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof UserFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // ignore repeated submits while saving
    setError(null);
    setSuccess(null);

    const errors = validateUserForm(formData, editMode ? 'edit' : 'create');
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('יש לתקן את השדות המסומנים');
      return;
    }
    if (!editMode && !businessId) {
      setError('לא נמצא עסק עבור החשבון שלך');
      return;
    }

    setLoading(true);
    try {
      if (editMode && editingUser?.uid) {
        await updateUserByAdmin(editingUser.uid, toUpdatePayload(formData));
        setSuccess(`פרטי המשתמש "${formData.fullName.trim()}" נשמרו`);
      } else {
        await createUserByAdmin({ ...toCreatePayload(formData), requestId: createRequestId }, businessId as string);
        setSuccess(`המשתמש "${formData.fullName.trim()}" נוצר`);
      }
      setShowModal(false);
      setFormData(emptyUserForm());
      setEditMode(false);
      setEditingUser(null);
      await loadUsers();
    } catch (err: unknown) {
      console.error('Error saving user:', err);
      setError(errorText(err, 'שמירת המשתמש נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = useCallback(() => {
    setCreateRequestId(crypto.randomUUID());
    setFormData(emptyUserForm());
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setEditMode(false);
    setEditingUser(null);
    setShowModal(true);
  }, []);

  // The navigation menu's "add user" entry links here with ?add=1 (single create form).
  useEffect(() => {
    if (searchParams.get('add') === '1' && isAdmin) {
      openAddModal();
      const next = new URLSearchParams(searchParams);
      next.delete('add');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, isAdmin, openAddModal]);

  const openEditModal = (user: UserProfile) => {
    setFormData(formFromProfile(user));
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setEditMode(true);
    setEditingUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setEditingUser(null);
    setFormErrors({});
  };

  // Server-side deactivation (C1): the account and profile are kept for audit, access is revoked.
  const handleDeactivate = async (user: UserProfile) => {
    if (user.uid === currentUid || isDeactivated(user)) return; // never lock yourself out
    const name = user.fullName || user.email || 'המשתמש';
    const confirmed = window.confirm(
      `להשבית את "${name}"?\n\n` +
        'המשתמש לא יוכל להתחבר לאפליקציה. הפרטים שלו נשמרים לתיעוד ואינם נמחקים. ' +
        'הפעלה מחדש אינה זמינה כרגע מהאפליקציה.'
    );
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await deleteUserByAdmin(user.uid);
      setSuccess(`המשתמש "${name}" הושבת. הפרטים נשמרו לתיעוד.`);
      await loadUsers();
    } catch (err: unknown) {
      console.error('Error deactivating user:', err);
      setError(errorText(err, 'השבתת המשתמש נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <Box role="status" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', gap: 1 }}>
        <CircularProgress size={24} />
        <Typography>טוען...</Typography>
      </Box>
    );
  }

  // Route guard already restricts this page to admins (src/app/access.ts).
  if (!isAdmin) {
    return null;
  }

  const offline = !!isOffline;
  const fieldHelp = (name: keyof UserFormData) => formErrors[name];

  return (
    <Container maxWidth="lg" disableGutters sx={{ py: { xs: 1, sm: 2 } }} dir="rtl">
      <PageHeader
        title="ניהול משתמשים"
        description="משתמשים נפתחים על ידי מנהל העסק. עובד ומנהל מחלקה משויכים למחלקה אחת; מנהל מערכת מנהל את כל העסק."
        actions={
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openAddModal} disabled={offline} sx={{ minHeight: 44 }}>
            הוסף משתמש
          </Button>
        }
      />

      {offline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          אין חיבור. ניהול משתמשים זמין רק כשיש חיבור לשרת.
        </Alert>
      )}
      {!showModal && error && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!showModal && success && (
        <Alert severity="success" role="status" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 1.5 }}>
        כל המשתמשים ({users.length})
      </Typography>

      {loading && users.length === 0 ? (
        <Box role="status" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography sx={{ mt: 1 }}>טוען משתמשים...</Typography>
        </Box>
      ) : users.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>לא נמצאו משתמשים.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
          {users.map((user, index) => {
            const name = user.fullName || user.email || '-';
            const self = user.uid === currentUid;
            const inactive = isDeactivated(user);
            const role = toAppRole(user.role);
            return (
              <Paper
                key={user.uid || index}
                component="article"
                variant="outlined"
                data-user-row
                aria-label={name}
                sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1, opacity: inactive ? 0.7 : 1, minWidth: 0 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1rem', overflowWrap: 'anywhere' }}>
                      {user.fullName || '-'}
                    </Typography>
                    <Typography variant="body2" dir="ltr" sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
                      {user.email || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                    {self && <Chip size="small" label="אתה" variant="outlined" />}
                    {inactive && <Chip size="small" color="error" label="מושבת" />}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip size="small" color="primary" variant="outlined" label={role ? ROLE_LABELS[role] : 'תפקיד לא תקין'} sx={{ fontWeight: 600 }} />
                  <Chip size="small" variant="outlined" label={user.role !== 'admin' ? departmentLabel(user.department) ?? 'לא הוגדרה' : 'כל המחלקות'} />
                  {user.phoneNumber && (
                    <Typography variant="body2" dir="ltr">
                      {user.phoneNumber}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    נוצר: {formatCreatedAt(user.createdAt)}
                  </Typography>
                </Box>
                {inactive ? (
                  <Typography variant="body2">אין פעולות זמינות</Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => openEditModal(user)}
                      disabled={loading || offline}
                      aria-label={`עריכה — ${name}`}
                      sx={{ minHeight: 44, flex: 1 }}
                    >
                      עריכה
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<BlockIcon />}
                      onClick={() => handleDeactivate(user)}
                      disabled={loading || offline || self}
                      title={self ? 'לא ניתן להשבית את עצמך' : undefined}
                      aria-label={`השבתה — ${name}`}
                      sx={{ minHeight: 44, flex: 1 }}
                    >
                      השבתה
                    </Button>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>
      )}

      {/* Add / edit user: MUI dialog (focus trap, Escape, focus returns to the opener). */}
      <Dialog open={showModal} onClose={loading ? undefined : closeModal} fullWidth maxWidth="sm" aria-labelledby="user-form-title" dir="rtl">
        <form onSubmit={handleSubmit} noValidate>
          <DialogTitle id="user-form-title" sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
            {editMode ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            {error && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}
            {success && <Alert severity="success">{success}</Alert>}
            <TextField
              label="שם מלא"
              required
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="שם פרטי ומשפחה"
              error={!!fieldHelp('fullName')}
              helperText={fieldHelp('fullName')}
              fullWidth
            />
            <TextField
              label="דוא״ל"
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={editMode}
              placeholder="name@example.com"
              inputProps={{ dir: 'ltr' }}
              error={!!fieldHelp('email')}
              helperText={fieldHelp('email')}
              fullWidth
            />
            <TextField
              label="טלפון"
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="אופציונלי"
              inputProps={{ dir: 'ltr' }}
              fullWidth
            />
            <TextField
              select
              label="תפקיד"
              required
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              disabled={editMode && editingUser?.uid === currentUid}
              SelectProps={{ native: true, inputProps: { title: 'בחר תפקיד' } }}
              error={!!fieldHelp('role')}
              helperText={editMode && editingUser?.uid === currentUid ? 'לא ניתן לשנות את התפקיד של עצמך' : fieldHelp('role')}
              fullWidth
            >
              <option value="staff">{ROLE_LABELS.staff}</option>
              <option value="manager">{ROLE_LABELS.manager}</option>
              <option value="admin">{ROLE_LABELS.admin}</option>
            </TextField>
            {roleNeedsDepartment(formData.role) && (
              <TextField
                select
                label="מחלקה"
                required
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                SelectProps={{ native: true, inputProps: { title: 'בחר מחלקה' } }}
                error={!!fieldHelp('department')}
                helperText={fieldHelp('department')}
                fullWidth
              >
                <option value="bar">בר</option>
                <option value="kitchen">מטבח</option>
              </TextField>
            )}
            {!editMode && (
              <TextField
                label="סיסמה ראשונית"
                required
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="לפחות 6 תווים"
                inputProps={{ dir: 'ltr' }}
                error={!!fieldHelp('password')}
                helperText={fieldHelp('password')}
                fullWidth
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button type="button" variant="outlined" onClick={closeModal} disabled={loading} sx={{ minHeight: 44 }}>
              ביטול
            </Button>
            <Button type="submit" variant="contained" disabled={loading} sx={{ minHeight: 44, flex: 1 }}>
              {loading ? 'שומר...' : editMode ? 'שמור שינויים' : 'צור משתמש'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage; 