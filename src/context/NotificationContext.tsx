import React, { createContext, useContext, useState, useCallback } from 'react';
import NotificationToast, { ToastNotification } from '../components/NotificationToast';

interface NotificationContextType {
  showNotification: (notification: Omit<ToastNotification, 'id'>) => void;
  showSuccess: (title: string, message: string, action?: ToastNotification['action']) => void;
  showError: (title: string, message: string, action?: ToastNotification['action']) => void;
  showWarning: (title: string, message: string, action?: ToastNotification['action']) => void;
  showInfo: (title: string, message: string, action?: ToastNotification['action']) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const showNotification = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    const newNotification: ToastNotification = {
      ...notification,
      id: generateId(),
      duration: notification.duration || 5000
    };
    
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const showSuccess = useCallback((title: string, message: string, action?: ToastNotification['action']) => {
    showNotification({ type: 'success', title, message, action });
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, action?: ToastNotification['action']) => {
    showNotification({ type: 'error', title, message, action, duration: 8000 });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, action?: ToastNotification['action']) => {
    showNotification({ type: 'warning', title, message, action, duration: 6000 });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, action?: ToastNotification['action']) => {
    showNotification({ type: 'info', title, message, action });
  }, [showNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToast 
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </NotificationContext.Provider>
  );
};