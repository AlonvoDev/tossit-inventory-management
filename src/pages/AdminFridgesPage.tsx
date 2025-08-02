import React, { useState, useEffect } from 'react';
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

/**
 * Admin‑only page for managing fridges/locations.
 *
 * Allows an administrator to create, edit and delete fridges associated
 * with the current business. Each fridge belongs to a department
 * ("bar" or "kitchen").
 */
const AdminFridgesPage: React.FC = () => {
  const { isAdmin, businessId, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

  // Redirect non‑admins (should already be protected, but extra safety)
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/not-authorized');
    }
  }, [authLoading, isAdmin, navigate]);

  // Load fridges for current business
  useEffect(() => {
    const loadFridges = async () => {
      if (!businessId || !isAdmin) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getBusinessFridges(businessId);
        setFridges(data);
      } catch (err: any) {
        console.error('Failed to load fridges:', err);
        setError('טעינת המקררים נכשלה. בדוק הרשאות או נסה שוב מאוחר יותר.');
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && businessId && isAdmin) {
      loadFridges();
    }
  }, [authLoading, businessId, isAdmin]);

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
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'נדרש שם למקרר';
    }
    if (!formData.department || (formData.department !== 'bar' && formData.department !== 'kitchen')) {
      errors.department = 'בחר מחלקה תקינה';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open modal for adding a new fridge
  const openAddModal = () => {
    setFormData({ name: '', department: 'bar' });
    setFormErrors({});
    setEditMode(false);
    setEditingFridge(null);
    setShowModal(true);
  };

  // Open modal for editing an existing fridge
  const openEditModal = (fridge: Fridge) => {
    setFormData({ name: fridge.name, department: fridge.department });
    setFormErrors({});
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
    setError(null);
    setSuccess(null);
    // Validate input
    if (!validateForm()) {
      setError('אנא תקן את השגיאות בטופס');
      return;
    }
    if (!businessId) {
      setError('Business ID not found');
      return;
    }
    // Determine whether to add or update
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
    } catch (err: any) {
      console.error('Error saving fridge:', err);
      setError(err.message || 'אירעה שגיאה בשמירת המקרר');
    }
  };

  // Handle deletion of a fridge
  const handleDelete = async (fridge: Fridge) => {
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
    } catch (err: any) {
      console.error('Error deleting fridge:', err);
      setError(err.message || 'מחיקת המקרר נכשלה');
    }
  };

  // Render loading state
  if (authLoading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Hide component if not admin (guarded by route anyway)
  if (!isAdmin) {
    return null;
  }

  return (
    <div
      style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}
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
        </ul>
      </div>

      {/* Add fridge button */}
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
                    {fridge.department === 'bar' ? 'בר' : 'מטבח'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => openEditModal(fridge)}
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
                  onChange={handleInputChange as any}
                >
                  <MenuItem value="bar">בר</MenuItem>
                  <MenuItem value="kitchen">מטבח</MenuItem>
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
              <Button type="submit" variant="contained" color="primary">
                {editMode ? 'שמור' : 'הוסף'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </div>
  );
};

export default AdminFridgesPage;