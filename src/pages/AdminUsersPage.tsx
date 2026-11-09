import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, createUserByAdmin, updateUserByAdmin, deleteUserByAdmin } from '../api/authAPI';
import { UserProfile } from '../types/UserProfile';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const errorText = (err: unknown, fallback: string): string => {
  const code = (err as { code?: unknown } | null)?.code;
  if (code === 'permission-denied' || code === 'functions/permission-denied') {
    return 'אין לך הרשאה לבצע פעולה זו.';
  }
  if (code === 'auth/email-already-in-use') return 'כתובת הדוא״ל כבר רשומה במערכת.';
  if (code === 'unavailable' || code === 'auth/network-request-failed') return 'אין חיבור לשרת. בדוק את החיבור ונסה שוב.';
  return fallback;
};

const formatCreatedAt = (createdAt: UserProfile['createdAt']): string => {
  const millis = (createdAt as { toMillis?: () => number } | undefined)?.toMillis?.();
  return typeof millis === 'number' ? new Date(millis).toLocaleDateString('he-IL') : '-';
};

const AdminUsersPage: React.FC = () => {
  const { isAdmin, businessId, uid: currentUid, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        await createUserByAdmin(toCreatePayload(formData), businessId as string);
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

  // Removes the app profile only. The sign-in (Firebase Auth) account is NOT deleted.
  const handleRemoveProfile = async (user: UserProfile) => {
    if (user.uid === currentUid) return; // never lock yourself out
    const name = user.fullName || user.email || 'המשתמש';
    const confirmed = window.confirm(
      `להסיר את הגישה של "${name}" לאפליקציה?\n\n` +
        'הפעולה מוחקת את פרופיל המשתמש בעסק ולכן הוא לא יוכל להשתמש באפליקציה. ' +
        'חשבון ההתחברות עצמו אינו נמחק.'
    );
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await deleteUserByAdmin(user.uid);
      setSuccess(`הגישה של "${name}" הוסרה. חשבון ההתחברות לא נמחק.`);
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
    } catch (err: unknown) {
      console.error('Error removing user profile:', err);
      setError(errorText(err, 'הסרת הגישה נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <div>טוען...</div>
      </div>
    );
  }

  // Route guard already restricts this page to admins (src/app/access.ts).
  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      direction: 'rtl'
    }}>
      {/* Navigation */}
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            backgroundColor: '#666',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← חזרה לפאנל ניהול
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          לוח בקרה
        </button>
      </div>

      <h1 style={{ 
        color: '#333', 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        ניהול משתמשים
      </h1>

      {/* Instructions */}
      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #2196f3'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>הוראות שימוש:</h3>
        <ul style={{ margin: '0', paddingRight: '20px', color: '#333' }}>
          <li>לחץ על כפתור <strong>הוסף משתמש</strong> כדי ליצור עובד חדש.</li>
          <li>יצירת משתמש פותחת עבורו חשבון התחברות עם הסיסמה הראשונית שתזין.</li>
          <li><strong>עובד:</strong> עובד במחלקה שנבחרה (בר או מטבח).</li>
          <li><strong>מנהל מחלקה:</strong> מנהל את המחלקה שנבחרה בלבד.</li>
          <li><strong>מנהל מערכת:</strong> מנהל את כל העסק.</li>
          <li><strong>הסרת גישה</strong> מוחקת את פרופיל המשתמש בעסק. חשבון ההתחברות עצמו אינו נמחק.</li>
        </ul>
      </div>

      {/* Add User Button */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={openAddModal}
          style={{
            backgroundColor: '#2196f3',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          הוסף משתמש
        </button>
      </div>

      {/* Global messages (shown outside modal) */}
      {!showModal && error && (
        <div style={{ 
          color: '#f44336', 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px',
          border: '1px solid #f44336'
        }}>
          {error}
        </div>
      )}
      {!showModal && success && (
        <div style={{ 
          color: '#4caf50', 
          backgroundColor: '#e8f5e8', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px',
          border: '1px solid #4caf50'
        }}>
          {success}
        </div>
      )}

      {/* Add User Form (legacy) - removed as it's no longer used. User creation is handled via a modal. */}

      {/* Users List */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: '8px',
        border: '1px solid #ddd',
        overflow: 'hidden'
      }}>
        <h2 style={{ 
          color: '#333', 
          margin: '0', 
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #ddd'
        }}>
          כל המשתמשים ({users.length})
        </h2>
        
        {loading && users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div>טוען משתמשים...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            לא נמצאו משתמשים.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    שם מלא
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    דוא״ל
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    תפקיד
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    מחלקה
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    טלפון
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    נוצר
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr 
                    key={user.uid || index} 
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                    }}
                  >
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <div style={{ fontWeight: 'bold' }}>{user.fullName || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.uid === currentUid ? 'אתה' : ''}</div>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {user.email || '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <span style={{ 
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 
                          (user.role === 'admin') ? '#e3f2fd' : 
                          (user.role === 'manager') ? '#fff3e0' : 
                          '#f3e5f5',
                        color: 
                          (user.role === 'admin') ? '#1976d2' : 
                          (user.role === 'manager') ? '#f57c00' : 
                          '#7b1fa2'
                      }}>
                        {toAppRole(user.role) ? ROLE_LABELS[toAppRole(user.role)!] : 'תפקיד לא תקין'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {user.role !== 'admin' ? (
                        <span style={{ 
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: (user.department === 'bar') ? '#fff3e0' : '#e8f5e8',
                          color: (user.department === 'bar') ? '#f57c00' : '#388e3c'
                        }}>
                          {departmentLabel(user.department) ?? 'לא הוגדרה'}
                        </span>
                      ) : (
                        <span style={{ 
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2'
                        }}>
                          כל המחלקות
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {user.phoneNumber || '-'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {formatCreatedAt(user.createdAt)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <button
                        onClick={() => openEditModal(user)}
                        style={{
                          marginLeft: '8px',
                          backgroundColor: '#1976d2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        עריכה
                      </button>
                      <button
                        onClick={() => handleRemoveProfile(user)}
                        disabled={loading || user.uid === currentUid}
                        title={user.uid === currentUid ? 'לא ניתן להסיר את הגישה של עצמך' : undefined}
                        style={{
                          opacity: user.uid === currentUid ? 0.5 : 1,
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        הסרת גישה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal overlay for add/edit user */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center', color: '#333' }}>
              {editMode ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
            </h2>

            {/* Messages within modal */}
            {error && (
              <div style={{ 
                color: '#f44336', 
                backgroundColor: '#ffebee', 
                padding: '10px', 
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #f44336'
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ 
                color: '#4caf50', 
                backgroundColor: '#e8f5e8', 
                padding: '10px', 
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #4caf50'
              }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px'
                }}
              >
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    שם מלא <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: formErrors.fullName ? '2px solid #f44336' : '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                    placeholder="שם פרטי ומשפחה"
                  />
                  {formErrors.fullName && (
                    <div style={{ color: '#f44336', fontSize: '14px', marginTop: '5px' }}>
                      {formErrors.fullName}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    דוא״ל <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={editMode}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: formErrors.email ? '2px solid #f44336' : '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '16px',
                      backgroundColor: editMode ? '#f5f5f5' : '#fff'
                    }}
                    placeholder="name@example.com"
                    dir="ltr"
                  />
                  {formErrors.email && (
                    <div style={{ color: '#f44336', fontSize: '14px', marginTop: '5px' }}>
                      {formErrors.email}
                    </div>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    טלפון
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                    placeholder="אופציונלי"
                    dir="ltr"
                  />
                </div>

                {/* Role */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    תפקיד <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    name="role"
                    title="בחר תפקיד"
                    disabled={editMode && editingUser?.uid === currentUid}
                    value={formData.role}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: formErrors.role ? '2px solid #f44336' : '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="staff">{ROLE_LABELS.staff}</option>
                    <option value="manager">{ROLE_LABELS.manager}</option>
                    <option value="admin">{ROLE_LABELS.admin}</option>
                  </select>
                  {formErrors.role && (
                    <div style={{ color: '#f44336', fontSize: '14px', marginTop: '5px' }}>
                      {formErrors.role}
                    </div>
                  )}
                </div>

                {/* Department - staff and managers are scoped to one department */}
                {roleNeedsDepartment(formData.role) && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      מחלקה <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      name="department"
                      title="בחר מחלקה"
                      value={formData.department}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: formErrors.department ? '2px solid #f44336' : '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px'
                      }}
                    >
                      <option value="bar">בר</option>
                      <option value="kitchen">מטבח</option>
                    </select>
                    {formErrors.department && (
                      <div style={{ 
                        color: '#f44336', 
                        fontSize: '14px', 
                        marginTop: '5px'
                      }}>
                        {formErrors.department}
                      </div>
                    )}
                  </div>
                )}

                {/* Password - only show on create */}
                {!editMode && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      סיסמה ראשונית <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: formErrors.password ? '2px solid #f44336' : '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px'
                      }}
                      placeholder="לפחות 6 תווים"
                      dir="ltr"
                    />
                    {formErrors.password && (
                      <div style={{ color: '#f44336', fontSize: '14px', marginTop: '5px' }}>
                        {formErrors.password}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    backgroundColor: '#ccc',
                    color: '#333',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#ccc' : '#2196f3',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'שומר...' : editMode ? 'שמור שינויים' : 'צור משתמש'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage; 