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
          backgroundColor: 'var(--tossit-success-tint, #EAF4EE)',
          borderColor: 'var(--tossit-success, #1D6A4E)',
          icon: '✅'
        };
      case 'error':
        return {
          backgroundColor: 'var(--tossit-danger-tint, #FDF0EF)',
          borderColor: 'var(--tossit-danger, #B42318)',
          icon: '❌'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--tossit-warning-tint, #FDF4EA)',
          borderColor: 'var(--tossit-warning, #9A4508)',
          icon: '⚠️'
        };
      case 'info':
        return {
          backgroundColor: 'var(--tossit-info-tint, #EDF4FA)',
          borderColor: 'var(--tossit-info, #1F5F8B)',
          icon: 'ℹ️'
        };
      default:
        return {
          backgroundColor: 'var(--tossit-surface-soft, #F5F6F8)',
          borderColor: 'var(--tossit-line-strong, #C9CFD6)',
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
          background: var(--tossit-surface-raised, #FFFFFF);
          border-radius: 8px;
          margin-bottom: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border: 1px solid;
          border-inline-start-width: 4px;
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
          color: var(--tossit-text, #151A21);
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
          font-weight: 700;
          color: var(--tossit-text, #151A21);
        }

        .toast-message {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
          color: var(--tossit-text, #151A21);
        }

        .toast-close {
          background: transparent;
          border: none;
          color: var(--tossit-text-muted, #58616F);
          width: 44px;
          height: 44px;
          min-height: 44px;
          padding: 0;
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
          background: var(--tossit-surface-soft, #F5F6F8);
        }

        .toast-actions {
          padding-top: 8px;
          border-top: 1px solid var(--tossit-line, #E3E6EA);
          text-align: center;
        }

        .toast-action-btn {
          background: var(--tossit-surface, #FFFFFF);
          border: 1px solid var(--tossit-line-strong, #C9CFD6);
          color: var(--tossit-text, #151A21);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toast-action-btn:hover {
          background: var(--tossit-surface-soft, #F5F6F8);
          transform: translateY(-1px);
        }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--tossit-line, #E3E6EA);
        }

        .toast-progress-bar {
          height: 100%;
          background: var(--tossit-line-strong, #C9CFD6);
          width: 100%;
          transform-origin: left;
          animation: toast-progress linear forwards;
        }

        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
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