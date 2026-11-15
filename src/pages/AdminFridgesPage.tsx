import React, { useState, useEffect, useMemo } from 'react';
// Use Material UI components for a more modern look and feel
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getBusinessFridges,
  addFridge,
  updateFridge,
  deleteFridge,
} from '../api/fridgesAPI';
import { Fridge } from '../types/Fridge';
import { Department, departmentLabel, manageableDepartments, normalizeDepartment } from '../app/access';
import { errorMessage } from '../features/common/errorMessage';

/**
 * Fridge/location management. Admins manage all departments; managers manage only
 * their own department (mirrors the C1b rules). Each fridge belongs to "bar" or "kitchen".
 */
const AdminFridgesPage: React.FC = () => {
  const { businessId, role, profile, isOffline, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const allowedDepartments = useMemo(
    () => manageableDepartments(role, profile?.department),
    [role, profile?.department],
  );
  const canManage = allowedDepartments.length > 0;
  const [saving, setSaving] = useState(false);

  // State for list of fridges
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal and form state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editingFridge, setEditingFridge] = useState<Fridge | null>(null);

  // Form data for creating/updating a fridge
  const [formData, setFormData] = useState<{
    name: string;
    department: 'bar' | 'kitchen';
  }>({
    name: '',
    department: 'bar',
  });

  // Validation errors
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    department?: string;
  }>({});

  // Load fridges for current business, limited to the departments this role manages.
  useEffect(() => {
    let cancelled = false;
    const loadFridges = async () => {
      if (!businessId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getBusinessFridges(businessId);
        if (cancelled) return;
        setFridges(
          data.filter((f) => {
            const d = normalizeDepartment(f.department);
            return d !== null && allowedDepartments.includes(d);
          })
        );
      } catch (err: unknown) {
        console.error('Failed to load fridges:', err);
        if (!cancelled) setError(errorMessage(err, 'טעינת המקררים נכשלה. נסה שוב.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (!authLoading && businessId && canManage) {
      loadFridges();
    }
    return () => {
      cancelled = true;
    };
  }, [authLoading, businessId, canManage, allowedDepartments]);

  // Handle input changes in the modal form
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear individual error when user edits field
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate form data before submission
  const validateForm = (): boolean => {
    const errors: { name?: string; department?: string } = {};
    const name = formData.name.trim();
    if (!name) {
      errors.name = 'נדרש שם למקרר';
    } else if (
      fridges.some(
        (f) => f.id !== editingFridge?.id && f.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
      )
    ) {
      errors.name = 'כבר קיים מקרר בשם הזה';
    }
    if (!allowedDepartments.includes(formData.department)) {
      errors.department = 'בחר מחלקה תקינה';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open modal for adding a new fridge
  const openAddModal = () => {
    setFormData({ name: '', department: allowedDepartments[0] ?? 'bar' });
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setEditMode(false);
    setEditingFridge(null);
    setShowModal(true);
  };

  // Open modal for editing an existing fridge
  const openEditModal = (fridge: Fridge) => {
    setFormData({ name: fridge.name, department: normalizeDepartment(fridge.department) ?? 'bar' });
    setFormErrors({});
    setError(null);
    setSuccess(null);
    setEditMode(true);
    setEditingFridge(fridge);
    setShowModal(true);
  };

  // Close modal and reset states
  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setEditingFridge(null);
    setFormErrors({});
    setSuccess(null);
    setError(null);
  };

  // Handle add/edit form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // ignore repeated submits
    setError(null);
    setSuccess(null);
    if (isOffline) {
      setError('אין חיבור. שינויים במקררים נשמרים רק כשיש חיבור לשרת.');
      return;
    }
    if (!validateForm()) {
      setError('אנא תקן את השגיאות בטופס');
      return;
    }
    if (!businessId) {
      setError('לא נמצא עסק עבור החשבון שלך');
      return;
    }
    setSaving(true);
    try {
      if (editMode && editingFridge && editingFridge.id) {
        // Update existing fridge
        await updateFridge(editingFridge.id, {
          name: formData.name.trim(),
          department: formData.department,
        });
        // Update local state without reload
        setFridges((prev) =>
          prev.map((f) =>
            f.id === editingFridge.id
              ? { ...f, name: formData.name.trim(), department: formData.department }
              : f
          )
        );
        setSuccess(`המקרר "${formData.name}" עודכן בהצלחה!`);
      } else {
        // Add new fridge
        const newId = await addFridge({
          name: formData.name.trim(),
          department: formData.department,
          businessId,
        });
        setFridges((prev) => [
          ...prev,
          {
            id: newId,
            name: formData.name.trim(),
            department: formData.department,
            businessId,
          },
        ]);
        setSuccess(`המקרר "${formData.name}" נוסף בהצלחה!`);
      }
      // Close modal after success
      setShowModal(false);
    } catch (err: unknown) {
      console.error('Error saving fridge:', err);
      setError(errorMessage(err, 'שמירת המקרר נכשלה. נסה שוב.'));
    } finally {
      setSaving(false);
    }
  };

  // Handle deletion of a fridge
  const handleDelete = async (fridge: Fridge) => {
    if (isOffline) return;
    const confirmDelete = window.confirm(`האם אתה בטוח שברצונך למחוק את "${fridge.name}"?`);
    if (!confirmDelete) return;
    setError(null);
    setSuccess(null);
    try {
      if (fridge.id) {
        await deleteFridge(fridge.id);
        setFridges((prev) => prev.filter((f) => f.id !== fridge.id));
        setSuccess(`"${fridge.name}" נמחק בהצלחה`);
      }
    } catch (err: unknown) {
      console.error('Error deleting fridge:', err);
      setError(errorMessage(err, 'מחיקת המקרר נכשלה. נסה שוב.'));
    }
  };

  // Render loading state
  if (authLoading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}
      >
        <div>טוען...</div>
      </div>
    );
  }

  // Route guard restricts this page to admin/manager; a manager without a valid department manages nothing.
  if (!canManage) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>
        לא הוגדרה עבורך מחלקה לניהול. פנה למנהל המערכת.
      </div>
    );
  }

  return (
    <div
      style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}
    >
      {/* Navigation buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            backgroundColor: '#666',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
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
            fontSize: '14px',
          }}
        >
          לוח בקרה
        </button>
      </div>

      {/* Page title */}
      <h1
        style={{ color: '#333', marginBottom: '30px', textAlign: 'center' }}
      >
        ניהול מקררים
      </h1>

      {/* Instructions */}
      <div
        style={{
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #2196f3',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>הוראות שימוש:</h3>
        <ul style={{ margin: '0', paddingRight: '20px', color: '#333' }}>
          <li>לחץ על כפתור <strong>הוסף מקרר</strong> כדי להוסיף מיקום חדש.</li>
          <li>
            לכל מקרר יש לבחור שם ייחודי ולשייך אותו למחלקה המתאימה (בר או מטבח).
          </li>
          <li>ניתן לערוך או למחוק מקררים באמצעות כפתורי העריכה/מחיקה בטבלה למטה.</li>
          {allowedDepartments.length === 1 && (
            <li>
              מוצגים ומנוהלים מקררי מחלקת <strong>{departmentLabel(allowedDepartments[0])}</strong> בלבד.
            </li>
          )}
          {isOffline && <li><strong>אין חיבור:</strong> שינויים זמינים רק כשיש חיבור.</li>}
        </ul>
      </div>

      {/* Add fridge button */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={openAddModal}
          disabled={!!isOffline}
          style={{
            opacity: isOffline ? 0.5 : 1,
            backgroundColor: '#2196f3',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          הוסף מקרר
        </button>
      </div>

      {/* Global messages outside modal */}
      {!showModal && error && (
        <div
          style={{
            color: '#f44336',
            backgroundColor: '#ffebee',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            border: '1px solid #f44336',
          }}
        >
          {error}
        </div>
      )}
      {!showModal && success && (
        <div
          style={{
            color: '#4caf50',
            backgroundColor: '#e8f5e8',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            border: '1px solid #4caf50',
          }}
        >
          {success}
        </div>
      )}

      {/* Fridges table */}
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid #ddd',
          borderRadius: '6px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>
                שם
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>
                מחלקה
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>
                  טוען נתונים...
                </td>
              </tr>
            ) : fridges.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>
                  אין מקררים במערכת
                </td>
              </tr>
            ) : (
              fridges.map((fridge) => (
                <tr key={fridge.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{fridge.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {departmentLabel(fridge.department) ?? 'לא הוגדרה'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => openEditModal(fridge)}
                      disabled={!!isOffline}
                      style={{
                        marginLeft: '10px',
                        backgroundColor: '#ffc107',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => handleDelete(fridge)}
                      disabled={!!isOffline}
                      style={{
                        backgroundColor: '#f44336',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for adding/editing fridges using Material UI components */}
      {showModal && (
        <Dialog open={showModal} onClose={closeModal} fullWidth maxWidth="sm" dir="rtl">
          {/* Wrap form around dialog content to allow submission via Enter key */}
          <form onSubmit={handleSubmit}>
            <DialogTitle>{editMode ? 'עריכת מקרר' : 'הוספת מקרר'}</DialogTitle>
            <DialogContent>
              {/* Show inline error or success messages */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              {/* Name field */}
              <FormControl fullWidth margin="normal">
                <TextField
                  label="שם"
                  name="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                  error={Boolean(formErrors.name)}
                  helperText={formErrors.name || ''}
                />
              </FormControl>
              {/* Department field */}
              <FormControl
                fullWidth
                margin="normal"
                error={Boolean(formErrors.department)}
              >
                <InputLabel id="department-label">מחלקה</InputLabel>
                <Select
                  labelId="department-label"
                  name="department"
                  value={formData.department}
                  label="מחלקה"
                  disabled={allowedDepartments.length === 1}
                  onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>)}
                >
                  {allowedDepartments.map((d: Department) => (
                    <MenuItem key={d} value={d}>{departmentLabel(d)}</MenuItem>
                  ))}
                </Select>
                {formErrors.department && (
                  <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.department}
                  </p>
                )}
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeModal} color="inherit">
                ביטול
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={saving}>
                {saving ? 'שומר...' : editMode ? 'שמור' : 'הוסף'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </div>
  );
};

export default AdminFridgesPage;