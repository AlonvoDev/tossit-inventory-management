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
  Box,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { PageHeader } from '../components/layout/PageHeader';
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
    <Container maxWidth="lg" disableGutters sx={{ py: { xs: 1, sm: 2 } }} dir="rtl">
      <PageHeader
        title="ניהול מקררים"
        description={
          allowedDepartments.length === 1
            ? `מקררים ומיקומים של מחלקת ${departmentLabel(allowedDepartments[0])}.`
            : 'מקררים ומיקומים לפי מחלקה. מוצרים ופריטים יכולים להיות משויכים למקרר.'
        }
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddModal} disabled={!!isOffline} sx={{ minHeight: 44 }}>
            הוסף מקרר
          </Button>
        }
      />

      {isOffline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          אין חיבור. שינויים במקררים זמינים רק כשיש חיבור לשרת.
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

      {loading ? (
        <Box role="status" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography sx={{ mt: 1 }}>טוען נתונים...</Typography>
        </Box>
      ) : fridges.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>אין מקררים במערכת</Typography>
          <Typography variant="body2">הוסף מקרר כדי לשייך אליו מוצרים ופריטים.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
          {fridges.map(fridge => (
            <Paper
              key={fridge.id}
              component="article"
              variant="outlined"
              aria-label={fridge.name}
              sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1rem', overflowWrap: 'anywhere' }}>
                  {fridge.name}
                </Typography>
                <Chip size="small" variant="outlined" label={departmentLabel(fridge.department) ?? 'לא הוגדרה'} sx={{ flexShrink: 0 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openEditModal(fridge)} disabled={!!isOffline}
                  aria-label={`עריכה — ${fridge.name}`} sx={{ minHeight: 44, flex: 1 }}>
                  עריכה
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(fridge)} disabled={!!isOffline}
                  aria-label={`מחיקה — ${fridge.name}`} sx={{ minHeight: 44, flex: 1 }}>
                  מחיקה
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

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
    </Container>
  );
};

export default AdminFridgesPage;