import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { theme } from './theme';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ShiftProvider } from '../context/ShiftContext';
import App from './App';
import { PWAPrompt } from '../pwa/PWAPrompt';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { registerSW } from 'virtual:pwa-register';
import { setUpdateAvailable } from '../pwa/updateStore';
import '../index.css';

// Initialize the app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <NotificationProvider>
            <ShiftProvider>
              <App />
              <PWAPrompt />
              <OfflineIndicator />
            </ShiftProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

// The single service-worker registration (src/pwa/service-worker.ts, root scope).
// A waiting update is kept until the user accepts it in PWAPrompt; it never activates on its own.
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      setUpdateAvailable(() => updateSW(true));
    },
    onRegisterError(error: unknown) {
      console.error('Service worker registration failed:', error);
    },
  });
}
