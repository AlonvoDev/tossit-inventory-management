import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../api/authAPI';
import { Container, Grid } from '@mui/material';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password || !confirmPassword || !displayName || !businessId) {
      setError('Please fill all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await signUp(email, password, displayName, businessId, isAdmin);
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: 4 }} className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1 className="app-title">TossIt</h1>
          <p className="app-description">Create a New Account</p>
        </div>
        
        <form className="register-form" onSubmit={handleRegister}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your email"
                  required
                  dir="ltr"
                />
              </div>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
              <div className="form-group">
                <label htmlFor="displayName">Full Name</label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </Grid>
            
            <Grid size={12}>
              <div className="form-group">
                <label htmlFor="businessId">Business ID</label>
                <input
                  type="text"
                  id="businessId"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your business ID"
                  required
                />
              </div>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Create a password"
                  required
                  dir="ltr"
                />
              </div>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Confirm your password"
                  required
                  dir="ltr"
                />
              </div>
            </Grid>
          </Grid>
          
          {/* Admin checkbox - only enable for development or in admin-creation flows */}
          <Grid container>
            <Grid size={12}>
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  disabled={isLoading}
                />
                <label htmlFor="isAdmin">Register as Admin (Development only)</label>
              </div>
            </Grid>
          </Grid>
          
          {error && <div className="error-message">{error}</div>}
          
          <Grid container>
            <Grid size={12}>
              <button type="submit" className="register-button" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Register'}
              </button>
            </Grid>
          </Grid>
        </form>
        
        <div className="register-footer">
          <p>Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </div>
      
      <style>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f5f5f5;
          padding: 20px;
        }
        
        .register-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 500px;
          padding: 30px;
        }
        
        .register-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .app-title {
          margin: 0;
          color: #009688;
          font-size: 32px;
        }
        
        .app-description {
          margin: 5px 0 0;
          color: #757575;
          font-size: 16px;
        }
        
        .register-form {
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .checkbox-group input {
          width: auto;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #555;
        }
        
        .checkbox-group label {
          margin-bottom: 0;
        }
        
        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        input:focus {
          border-color: #009688;
          outline: none;
        }
        
        .register-button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
          background-color: #009688;
          color: white;
        }
        
        .register-button:hover {
          background-color: #00796b;
        }
        
        button:disabled {
          background-color: #B0BEC5;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #D32F2F;
          background-color: #FFEBEE;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        .register-footer {
          text-align: center;
          color: #757575;
        }
        
        .register-footer a {
          color: #009688;
          text-decoration: none;
          font-weight: 500;
        }
        
        .register-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </Container>
  );
};

export default RegisterPage; 