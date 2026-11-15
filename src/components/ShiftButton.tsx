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
          align-items: center;
          margin: 20px 0;
          color: #000;
        }
        
        .shift-button {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background-color: #2196F3;
          color: white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .shift-button:hover {
          background-color: #1976D2;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .shift-button:active {
          transform: translateY(0);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .shift-button.active {
          background-color: #F44336;
        }
        
        .shift-button.active:hover {
          background-color: #D32F2F;
        }
        
        .shift-button:disabled {
          background-color: #B0BEC5;
          cursor: not-allowed;
          transform: none;
        }
        
        .shift-info {
          margin-top: 10px;
          font-size: 14px;
          color: #000;
        }
        
        .error-message {
          color: #F44336;
          margin-top: 10px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default ShiftButton; 