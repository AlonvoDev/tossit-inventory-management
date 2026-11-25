import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="not-found">
      <div className="content">
        <h1>404</h1>
        <h2>דף לא נמצא</h2>
        <p>העמוד שאתה מחפש אינו קיים או הועבר למקום אחר.</p>
        <Link to="/dashboard" className="back-link">חזור ללוח הבקרה</Link>
      </div>
      
      <style>{`
        .not-found {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--tossit-surface-soft, #F5F6F8);
          padding: 20px;
          text-align: center;
        }
        
        .content {
          background-color: var(--tossit-surface, #FFFFFF);
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 400px;
          width: 100%;
        }
        
        h1 {
          font-size: 80px;
          margin: 0;
          color: var(--tossit-danger, #B42318);
          line-height: 1;
        }
        
        h2 {
          margin: 0 0 20px;
          color: var(--tossit-text, #151A21);
        }
        
        p {
          color: var(--tossit-text-muted, #58616F);
          margin-bottom: 30px;
        }
        
        .back-link {
          display: inline-block;
          padding: 12px 24px;
          background-color: var(--tossit-primary, #1D6A4E);
          color: var(--tossit-primary-contrast, #FFFFFF);
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
          transition: background-color 0.3s;
        }
        
        .back-link:hover {
          background-color: var(--tossit-primary-strong, #155239);
        }
      `}</style>
    </div>
  );
};

export default NotFound; 