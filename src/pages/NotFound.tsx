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
          background-color: #f5f5f5;
          padding: 20px;
          text-align: center;
        }
        
        .content {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 400px;
          width: 100%;
        }
        
        h1 {
          font-size: 80px;
          margin: 0;
          color: #F44336;
          line-height: 1;
        }
        
        h2 {
          margin: 0 0 20px;
          color: #333;
        }
        
        p {
          color: #757575;
          margin-bottom: 30px;
        }
        
        .back-link {
          display: inline-block;
          padding: 12px 24px;
          background-color: #009688;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
          transition: background-color 0.3s;
        }
        
        .back-link:hover {
          background-color: #00796b;
        }
      `}</style>
    </div>
  );
};

export default NotFound; 