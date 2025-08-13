import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, createUserByAdmin, CreateUserData, updateUserByAdmin, deleteUserByAdmin, UpdateUserData } from '../api/authAPI';
import { UserProfile } from '../types/UserProfile';
import { useNavigate } from 'react-router-dom';

const AdminUsersPage: React.FC = () => {
  const { isAdmin, businessId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state used by both add and edit modals
  const [formData, setFormData] = useState<CreateUserData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'staff',
    department: 'bar',
    password: ''
  });
  
  // Form validation state
  // Holds validation error messages for each form field
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateUserData, string>>>({});

  // Modal and editing state
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Note: department visibility is now handled directly in the modal based on formData.role

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/not-authorized');
    }
  }, [isAdmin, authLoading, navigate]);

  // Load users from API
  const loadUsers = useCallback(async () => {
    if (!businessId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const allUsers = await getAllUsers(businessId);
      console.log('Loaded users:', allUsers);
      
      // Filter out users with missing essential data and fix them
      const validUsers = allUsers.map(user => ({
        ...user,
        // Ensure fullName exists; fallback to email prefix if missing
        fullName: user.fullName || (user.email ? user.email.split('@')[0] : 'Unknown User'),
        email: user.email || 'no-email@unknown.com',
        role: user.role || 'staff',
        department: user.department || 'bar'
      }));
      
      setUsers(validUsers);
    } catch (err: unknown) {
      console.error('Error loading users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Load users on component mount
  useEffect(() => {
    if (isAdmin && businessId) {
      loadUsers();
    }
  }, [isAdmin, businessId, loadUsers]);



  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // When role changes to admin/manager, department becomes irrelevant
    if (name === 'role' && (value === 'admin' || value === 'manager')) {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value, 
        department: 'bar' // Set default, but won't be used in validation/creation
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear field error when user starts typing
    if (formErrors[name as keyof CreateUserData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<CreateUserData> = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email format is invalid';
    }
    
    // Only validate password when creating a new user. Editing existing users does not allow changing password here.
    if (!editMode) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }
    
    if (!formData.role || (formData.role !== 'admin' && formData.role !== 'manager' && formData.role !== 'staff')) {
      errors.role = 'admin';
    }
    
    // Only validate department for staff members
    if (formData.role === 'staff' && (!formData.department || (formData.department !== 'bar' && formData.department !== 'kitchen'))) {
      errors.department = 'bar';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validate form input
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    // When creating a new user, businessId is required
    if (!editMode && !businessId) {
      setError('Business ID not found');
      return;
    }

    setLoading(true);

    try {
      if (editMode && editingUser?.uid) {
        // Prepare update data (do not include password)
        const updateData: UpdateUserData = {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber || '',
          role: formData.role,
          department: formData.role === 'staff' ? formData.department : 'bar'
        };
        await updateUserByAdmin(editingUser.uid, updateData);
        setSuccess(`User "${formData.fullName}" updated successfully!`);
      } else {
        // Create new user
        await createUserByAdmin(formData, businessId as string);
        setSuccess(`User "${formData.fullName}" created successfully!`);
      }
      // Close modal after success
      setShowModal(false);
      // Reload users list
      await loadUsers();
      // Reset form state
      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        role: 'staff',
        department: 'bar',
        password: ''
      });
      setEditMode(false);
      setEditingUser(null);
    } catch (err: unknown) {
      console.error('Error saving user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save user. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Open the modal for creating a new user
  const openAddModal = () => {
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      role: 'staff',
      department: 'bar',
      password: ''
    });
    setFormErrors({});
    setEditMode(false);
    setEditingUser(null);
    setShowModal(true);
  };

  // Open the modal for editing an existing user
  const openEditModal = (user: UserProfile) => {
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role || 'staff',
      department: user.role === 'staff' ? (user.department || 'bar') : 'bar',
      password: ''
    });
    setFormErrors({});
    setEditMode(true);
    setEditingUser(user);
    setShowModal(true);
  };

  // Close modal and reset states
  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setEditingUser(null);
    setFormErrors({});
  };

  // Delete a user with confirmation
  const handleDelete = async (user: UserProfile) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${user.fullName || user.email}?`);
    if (!confirmDelete) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await deleteUserByAdmin(user.uid);
      setSuccess(`User "${user.fullName || user.email}" deleted successfully!`);
      // Remove deleted user from local state without reloading all users
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
    } catch (err: unknown) {
      console.error('Error deleting user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user. Please try again.';
      setError(errorMessage);
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
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render if not admin (will redirect anyway)
  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
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
          <li>עובד חדש יוצר חשבון Firebase באופן אוטומטי.</li>
          <li><strong>צוות (Staff):</strong> יש לבחור מחלקה (בר או מטבח).</li>
          <li><strong>מנהל (Manager) ומנהל מערכת (Admin):</strong> בעלי גישה לכל המחלקות.</li>
          <li>ניתן לערוך או למחוק עובדים באמצעות כפתורי העריכה/מחיקה בטבלה למטה.</li>
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
          All Users ({users.length})
        </h2>
        
        {loading && users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div>Loading users...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No users found. Create the first user above.
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
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Full Name
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Email
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Role
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Department
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Phone
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Created
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Actions
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
                      <div style={{ fontWeight: 'bold' }}>{user.fullName || 'Unknown User'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.uid || 'No UID'}</div>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {user.email || 'No email'}
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
                        {user.role ? 
                          (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 
                          'Staff'
                        }
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {user.role === 'staff' ? (
                        <span style={{ 
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: (user.department === 'bar') ? '#fff3e0' : '#e8f5e8',
                          color: (user.department === 'bar') ? '#f57c00' : '#388e3c'
                        }}>
                          {user.department ? 
                            (user.department.charAt(0).toUpperCase() + user.department.slice(1)) : 
                            'Bar'
                          }
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
                      {user.createdAt ? 
                        (user.createdAt.toMillis ? 
                          new Date(user.createdAt.toMillis()).toLocaleDateString() :
                          new Date((user.createdAt as any).toMillis()).toLocaleDateString()
                        ) : 
                        '-'
                      }
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <button
                        onClick={() => openEditModal(user)}
                        style={{
                          marginRight: '8px',
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
                        onClick={() => handleDelete(user)}
                        style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        מחיקה
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
                    Full Name <span style={{ color: 'red' }}>*</span>
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
                    placeholder="Enter full name"
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
                    Email <span style={{ color: 'red' }}>*</span>
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
                    placeholder="Enter email address"
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
                    Phone Number
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
                    placeholder="Enter phone number (optional)"
                  />
                </div>

                {/* Role */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Role <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    name="role"
                    title="Select user role"
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
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  {formErrors.role && (
                    <div style={{ color: '#f44336', fontSize: '14px', marginTop: '5px' }}>
                      {formErrors.role}
                    </div>
                  )}
                </div>

                {/* Department - Only for Staff */}
                {formData.role === 'staff' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Department <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      name="department"
                      title="Select department"
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
                      <option value="bar">Bar</option>
                      <option value="kitchen">Kitchen</option>
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
                      Password <span style={{ color: 'red' }}>*</span>
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
                      placeholder="Enter password (min 6 characters)"
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