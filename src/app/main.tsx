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

// Register service worker for PWA functionality using vite-plugin-pwa
registerSW({
  onNeedRefresh() {
    // Trigger update prompt in PWAPrompt component
    const event = new CustomEvent('pwa-update-available');
    window.dispatchEvent(event);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
    // Optional: show notification that app is ready for offline use
  },
  immediate: true
});
