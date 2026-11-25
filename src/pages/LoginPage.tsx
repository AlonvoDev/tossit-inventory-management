import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signIn, signInWithGoogle } from '../api/authAPI';
import { Container, Grid } from '@mui/material';
import tossitLogo from '../assets/tossit-logo.png';
import { AccessibilityMenu } from '../features/appearance/AccessibilityMenu';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEmulators, setUseEmulators] = useState(false);
  
  // Check if emulators are enabled
  useEffect(() => {
    const savedSetting = localStorage.getItem('useFirebaseEmulators') === 'true';
    setUseEmulators(savedSetting);
  }, []);
  
  // Toggle emulator setting
  const toggleEmulators = () => {
    const newSetting = !useEmulators;
    localStorage.setItem('useFirebaseEmulators', newSetting ? 'true' : 'false');
    setUseEmulators(newSetting);
    // Reload to apply new setting
    window.location.reload();
  };
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('אנא הזן גם דוא"ל וגם סיסמה');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // The auth observer redirects once the profile is resolved (see routes PublicOnly).
      await signIn(email, password);
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Type-safe error handling
      const firebaseError = error as { code?: string; message?: string };
      
      // Improved error handling
      if (firebaseError?.code === 'auth/network-request-failed') {
        if (window.location.hostname === 'localhost') {
          setError('שגיאת רשת. ייתכן שהאמולטור לא פועל או שלא הותקן Java. נסה להשתמש בחיבור רגיל.');
        } else {
          setError('שגיאת רשת. בדוק את חיבור האינטרנט ונסה שוב.');
        }
      } else if (firebaseError?.code === 'auth/invalid-credential' || firebaseError?.code === 'auth/wrong-password') {
        setError('שם משתמש או סיסמה שגויים');
      } else if (firebaseError?.code === 'auth/user-not-found') {
        setError('חשבון לא נמצא. בדוק את כתובת הדוא"ל או פנה למנהל העסק');
      } else if (firebaseError?.code === 'auth/too-many-requests') {
        setError('יותר מדי ניסיונות התחברות כושלים. נסה שוב מאוחר יותר');
      } else {
        setError(firebaseError?.message || 'ההתחברות נכשלה. אנא נסה שוב.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      console.error('Google login error:', error);
      
      // Type-safe error handling
      const firebaseError = error as { code?: string; message?: string };
      
      // Improved error handling
      if (firebaseError?.code === 'auth/network-request-failed') {
        if (window.location.hostname === 'localhost') {
          setError('שגיאת רשת. ייתכן שהאמולטור לא פועל או שלא הותקן Java.');
        } else {
          setError('שגיאת רשת. בדוק את חיבור האינטרנט ונסה שוב.');
        }
      } else if (firebaseError?.code === 'auth/popup-closed-by-user') {
        setError('החלון נסגר לפני סיום ההתחברות. אנא נסה שוב.');
      } else {
        setError(firebaseError?.message || 'ההתחברות עם גוגל נכשלה. אנא נסה שוב.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  return (
    <Container maxWidth="md" sx={{ mt: 4 }} className="login-page" dir="rtl">
      <div className="login-container">
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-12px -12px 0 0' }}>
          <AccessibilityMenu />
        </div>
        <div className="login-header">
          <div className="logo-container">
                                <img
                      src={tossitLogo}
                      alt="TossIt Logo"
                      className="app-logo"
                    />
          </div>
          <p className="app-description">מערכת לניהול מלאי ומעקב פריטים</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form className="login-form" onSubmit={handleEmailLogin}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <div className="form-group">
                <label htmlFor="email">דוא"ל</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="הזן את הדוא''ל שלך"
                  className="ltr-input"
                />
              </div>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
              <div className="form-group">
                <label htmlFor="password">סיסמה</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="הזן את הסיסמה שלך"
                  className="ltr-input"
                />
              </div>
            </Grid>
          </Grid>
          
          <Grid container>
            <Grid size={12}>
              <button 
                type="submit" 
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'מתחבר...' : 'התחבר'}
              </button>
            </Grid>
          </Grid>
          
          <div className="divider">
            <span>או</span>
          </div>
          
          <button
            type="button"
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            התחבר עם גוגל
          </button>
        </form>
        
        <div className="login-footer">
          <p>אין לך חשבון? <Link to="/register">איך מקבלים גישה?</Link></p>
        </div>
        
        {isLocalhost && (
          <div className="dev-controls">
            <div className="emulator-toggle">
              <input
                type="checkbox"
                id="emulator-toggle"
                checked={useEmulators}
                onChange={toggleEmulators}
              />
              <label htmlFor="emulator-toggle">
                {useEmulators ? 'השתמש באמולטור (פעיל)' : 'השתמש באמולטור (כבוי)'}
              </label>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: transparent;
          padding: 20px;
          direction: rtl;
          text-align: right;
        }
        
        .login-container {
          background-color: var(--tossit-surface, #FFFFFF);
          border-radius: 8px;
          border: 1px solid var(--tossit-line, #E3E6EA);
          width: 100%;
          max-width: 400px;
          padding: 30px;
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .logo-container {
          margin-bottom: 20px;
        }
        
        .app-logo {
          height: 60px;
          width: auto;
          max-width: 100%;
        }
        
        .app-description {
          margin: 5px 0 0;
          color: var(--tossit-text-muted, #58616F);
          font-size: 16px;
        }
        
        .login-form {
          margin-bottom: 20px;
          direction: rtl;
          text-align: right;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--tossit-text-muted, #58616F);
          text-align: right;
        }
        
        input {
          width: 100%;
          min-height: 48px;
          box-sizing: border-box;
          padding: 12px;
          border: 1px solid var(--tossit-control, #858E9A);
          border-radius: 10px;
          font-size: 16px;
          color: var(--tossit-text, #151A21);
          background-color: var(--tossit-surface, #FFFFFF);
        }
        
        .ltr-input {
          direction: ltr !important;
          text-align: left !important;
        }
        
        input:focus-visible {
          border-color: var(--tossit-primary, #1D6A4E);
          outline: 3px solid var(--tossit-focus, #1D6A4E);
          outline-offset: 1px;
        }
        
        .login-button, .google-button {
          width: 100%;
          min-height: 48px;
          padding: 12px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
          text-align: center;
        }
        
        .login-button {
          background-color: var(--tossit-primary, #1D6A4E);
          color: var(--tossit-primary-contrast, #FFFFFF);
          font-weight: 700;
        }
        
        .login-button:hover {
          background-color: var(--tossit-primary-strong, #155239);
        }
        
        .google-button {
          background-color: var(--tossit-surface, #FFFFFF);
          color: var(--tossit-text, #151A21);
          border: 1px solid var(--tossit-line-strong, #C9CFD6);
        }
        
        .google-button:hover {
          background-color: var(--tossit-surface-soft, #F5F6F8);
        }

        .login-button:focus-visible, .google-button:focus-visible {
          outline: 3px solid var(--tossit-focus, #1D6A4E);
          outline-offset: 2px;
        }
        
        button:disabled {
          background-color: var(--tossit-line-strong, #C9CFD6);
          cursor: not-allowed;
        }
        
        .divider {
          margin: 20px 0;
          text-align: center;
          position: relative;
          direction: rtl;
        }
        
        .divider::before, .divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 45%;
          height: 1px;
          background-color: var(--tossit-line, #E3E6EA);
        }
        
        .divider::before {
          left: 0;
        }
        
        .divider::after {
          right: 0;
        }
        
        .divider span {
          background-color: var(--tossit-surface, #FFFFFF);
          padding: 0 10px;
          position: relative;
          color: var(--tossit-text-muted, #58616F);
        }
        
        .error-message {
          color: var(--tossit-danger, #B42318);
          background-color: var(--tossit-danger-tint, #FDF0EF);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
          text-align: right;
        }
        
        .login-footer {
          text-align: center;
          color: var(--tossit-text-muted, #58616F);
          direction: rtl;
        }
        
        .login-footer a {
          color: var(--tossit-primary, #1D6A4E);
          text-decoration: none;
          font-weight: 500;
        }
        
        .login-footer a:hover {
          text-decoration: underline;
        }
        
        .ltr-input::placeholder {
          text-align: left;
          direction: ltr;
        }
        
        ::placeholder {
          text-align: right;
          direction: rtl;
        }
        
        .dev-controls {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px dashed var(--tossit-line-strong, #C9CFD6);
        }
        
        .emulator-toggle {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .emulator-toggle input {
          width: auto;
          margin-left: 10px;
        }
        
        .emulator-toggle label {
          margin: 0;
          font-size: 14px;
          color: var(--tossit-text-muted, #58616F);
        }
        
      `}</style>
    </Container>
  );
};

export default LoginPage; 