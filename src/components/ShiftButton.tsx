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
          border: 2px solid #0F766E;
          background-color: #0F766E;
          color: #fff;
        }
        .shift-button:hover { background-color: #0d6660; }
        .shift-button:focus-visible { outline: 3px solid #99F6E4; outline-offset: 2px; }
        .shift-button.active {
          background-color: #fff;
          color: #B91C1C;
          border-color: #FCA5A5;
        }
        .shift-button.active:hover { background-color: #FEF2F2; }
        .shift-button:disabled {
          background-color: #E5E7EB;
          border-color: #E5E7EB;
          color: #6B7280;
          cursor: not-allowed;
        }
        .shift-info p, p.shift-info {
          margin: 0;
          font-size: 12px;
          color: #55607A;
        }
        .error-message {
          color: #B91C1C;
          margin: 0;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default ShiftButton; 