import React from 'react';
import { useShift } from '../context/ShiftContext';
import { useAuth } from '../context/AuthContext';
import type { Timestamp } from 'firebase/firestore';

const formatShiftTime = (timestamp: Timestamp | null) =>
  timestamp
    ? new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(timestamp.toDate())
    : '';

/**
 * Start/end shift. State shown is the server profile's (via ShiftContext/AuthContext), never
 * optimistic. Ending asks for confirmation; changes need a connection.
 */
const ShiftButton: React.FC = () => {
  const { isOnShift, shiftStartedAt, startUserShift, endUserShift, isLoading, error } = useShift();
  const { isOffline } = useAuth();

  const handleClick = async () => {
    if (isLoading || isOffline) return;
    if (isOnShift) {
      if (!window.confirm('לסיים את המשמרת? לאחר הסיום לא ניתן לפתוח או לסגור פריטים עד שמשמרת חדשה תתחיל.')) return;
      await endUserShift();
    } else {
      await startUserShift();
    }
  };

  return (
    <div className="shift-button-container">
      <button
        className={`shift-button ${isOnShift ? 'active' : ''}`}
        onClick={handleClick}
        disabled={isLoading || !!isOffline}
        title={isOffline ? 'אין חיבור' : undefined}
      >
        {isLoading ? 'מעדכן...' : isOnShift ? 'סיום משמרת' : 'התחלת משמרת'}
      </button>

      {isOnShift && (
        <div className="shift-info" role="status">
          <p>במשמרת{shiftStartedAt ? ` מאז ${formatShiftTime(shiftStartedAt)}` : ''}</p>
        </div>
      )}

      {isOffline && <p className="shift-info">אין חיבור. אפשר לשנות משמרת רק כשיש חיבור.</p>}
      {error && <p className="error-message" role="alert">{error}</p>}

      <style>{`
        .shift-button-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          margin: 0;
        }
        .shift-button {
          min-height: 44px;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          border: 2px solid var(--tossit-primary, #1D6A4E);
          background-color: var(--tossit-primary, #1D6A4E);
          color: var(--tossit-primary-contrast, #FFFFFF);
        }
        .shift-button:hover { background-color: var(--tossit-primary-strong, #155239); }
        .shift-button:focus-visible { outline: 3px solid var(--tossit-focus, #1D6A4E); outline-offset: 2px; }
        .shift-button.active {
          background-color: var(--tossit-surface, #FFFFFF);
          color: var(--tossit-danger, #B42318);
          border-color: var(--tossit-danger, #B42318);
        }
        .shift-button.active:hover { background-color: var(--tossit-danger-tint, #FDF0EF); }
        .shift-button:disabled {
          background-color: var(--tossit-surface-soft, #F5F6F8);
          border-color: var(--tossit-line-strong, #C9CFD6);
          color: var(--tossit-text-muted, #58616F);
          cursor: not-allowed;
        }
        .shift-info p, p.shift-info {
          margin: 0;
          font-size: 12px;
          color: var(--tossit-text-muted, #58616F);
        }
        .error-message {
          color: var(--tossit-danger, #B42318);
          margin: 0;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default ShiftButton; 