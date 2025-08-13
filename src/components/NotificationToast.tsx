import React, { useState, useEffect, useCallback } from 'react';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

/**
 * Advanced notification toast system with multiple types and animations
 * Supports success, error, warning, and info notifications with custom actions
 */
const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  const handleDismiss = useCallback((id: string) => {
    setVisibleNotifications(prev => prev.filter(nId => nId !== id));
    setTimeout(() => onDismiss(id), 300); // Wait for animation
  }, [onDismiss]);

  useEffect(() => {
    // Auto-dismiss notifications after their duration
    notifications.forEach(notification => {
      const duration = notification.duration || 5000;
      
      // Add to visible list with slight delay for animation
      setTimeout(() => {
        setVisibleNotifications(prev => 
          prev.includes(notification.id) ? prev : [...prev, notification.id]
        );
      }, 100);

      // Auto-dismiss after duration
      setTimeout(() => {
        handleDismiss(notification.id);
      }, duration);
    });
  }, [notifications, handleDismiss]);

  const getToastStyles = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          borderColor: '#45A049',
          icon: '✅'
        };
      case 'error':
        return {
          backgroundColor: '#f44336',
          borderColor: '#d32f2f',
          icon: '❌'
        };
      case 'warning':
        return {
          backgroundColor: '#FF9800',
          borderColor: '#F57C00',
          icon: '⚠️'
        };
      case 'info':
        return {
          backgroundColor: '#2196F3',
          borderColor: '#1976D2',
          icon: 'ℹ️'
        };
      default:
        return {
          backgroundColor: '#757575',
          borderColor: '#616161',
          icon: '📋'
        };
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="toast-container">
      {notifications.map(notification => {
        const styles = getToastStyles(notification.type);
        const isVisible = visibleNotifications.includes(notification.id);
        
        return (
          <div
            key={notification.id}
            className={`toast-notification ${notification.type} ${isVisible ? 'visible' : ''}`}
            style={{
              backgroundColor: styles.backgroundColor,
              borderColor: styles.borderColor
            }}
          >
            <div className="toast-content">
              <div className="toast-header">
                <span className="toast-icon">{styles.icon}</span>
                <div className="toast-text">
                  <h4 className="toast-title">{notification.title}</h4>
                  <p className="toast-message">{notification.message}</p>
                </div>
                <button
                  className="toast-close"
                  onClick={() => handleDismiss(notification.id)}
                  aria-label="סגור הודעה"
                >
                  ✕
                </button>
              </div>
              
              {notification.action && (
                <div className="toast-actions">
                  <button
                    className="toast-action-btn"
                    onClick={() => {
                      notification.action!.onClick();
                      handleDismiss(notification.id);
                    }}
                  >
                    {notification.action.label}
                  </button>
                </div>
              )}
            </div>

            {/* Progress bar for auto-dismiss */}
            <div className="toast-progress">
              <div 
                className="toast-progress-bar"
                style={{
                  animationDuration: `${notification.duration || 5000}ms`
                }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        .toast-container {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 9999;
          max-width: 400px;
          pointer-events: none;
        }

        .toast-notification {
          background: white;
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border: 2px solid;
          position: relative;
          overflow: hidden;
          transform: translateX(-120%);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          pointer-events: auto;
          direction: rtl;
          min-width: 320px;
        }

        .toast-notification.visible {
          transform: translateX(0);
          opacity: 1;
        }

        .toast-content {
          padding: 16px;
          color: white;
        }

        .toast-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 8px;
        }

        .toast-icon {
          font-size: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .toast-text {
          flex: 1;
          text-align: right;
        }

        .toast-title {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .toast-message {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
          color: rgba(255,255,255,0.9);
        }

        .toast-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: background-color 0.2s ease;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: rgba(255,255,255,0.3);
        }

        .toast-actions {
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.2);
          text-align: center;
        }

        .toast-action-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toast-action-btn:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255,255,255,0.2);
        }

        .toast-progress-bar {
          height: 100%;
          background: rgba(255,255,255,0.6);
          width: 100%;
          transform-origin: left;
          animation: toast-progress linear forwards;
        }

        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }

        /* Type-specific hover effects */
        .toast-notification.success:hover {
          box-shadow: 0 6px 25px rgba(76, 175, 80, 0.4);
        }

        .toast-notification.error:hover {
          box-shadow: 0 6px 25px rgba(244, 67, 54, 0.4);
        }

        .toast-notification.warning:hover {
          box-shadow: 0 6px 25px rgba(255, 152, 0, 0.4);
        }

        .toast-notification.info:hover {
          box-shadow: 0 6px 25px rgba(33, 150, 243, 0.4);
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .toast-container {
            top: 10px;
            left: 10px;
            right: 10px;
            max-width: none;
          }

          .toast-notification {
            min-width: auto;
            margin-bottom: 8px;
          }

          .toast-content {
            padding: 12px;
          }

          .toast-title {
            font-size: 14px;
          }

          .toast-message {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .toast-container {
            top: 5px;
            left: 5px;
            right: 5px;
          }

          .toast-header {
            gap: 8px;
          }

          .toast-icon {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;