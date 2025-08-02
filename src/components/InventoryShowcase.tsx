import React from 'react';

/**
 * Showcase component demonstrating the advanced inventory dashboard features
 * This is a visual guide showing all the UI/UX enhancements implemented
 */
const InventoryShowcase: React.FC = () => {
  return (
    <div className="inventory-showcase">
      <div className="showcase-header">
        <h1>🚀 Enhanced Inventory Dashboard Features</h1>
        <p>Enterprise-ready UI/UX with advanced grouping, status indicators, and microinteractions</p>
      </div>

      <div className="features-grid">
        {/* 1. Color-Coded Status Indicators */}
        <div className="feature-card">
          <h3>🎨 Color-Coded Status Indicators</h3>
          <div className="status-examples">
            <div className="status-demo status-good">
              <span className="status-badge good">תקין</span>
              <p>Green = Product Valid (Fresh & Safe)</p>
            </div>
            <div className="status-demo status-warning">
              <span className="status-badge warning">קרוב לפוג</span>
              <p>Orange = Near Expiry (Use Soon)</p>
            </div>
            <div className="status-demo status-expired">
              <span className="status-badge expired">פג תוקף</span>
              <p>Red = Expired (Must Discard)</p>
            </div>
          </div>
        </div>

        {/* 2. Department → Fridge Grouping */}
        <div className="feature-card">
          <h3>🗂️ Smart Grouping: Department → Fridge</h3>
          <div className="grouping-demo">
            <div className="department-demo">
              <div className="dept-header bar">🍺 בר (23 פריטים)</div>
              <div className="fridge-list">
                <div className="fridge-item">🗃️ בר ראשי (15)</div>
                <div className="fridge-item">🗃️ בר משני (8)</div>
              </div>
            </div>
            <div className="department-demo">
              <div className="dept-header kitchen">🍳 מטבח (34 פריטים)</div>
              <div className="fridge-list">
                <div className="fridge-item">🗃️ מטבח ראשי (22)</div>
                <div className="fridge-item">🗃️ מטבח קר (12)</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Floating Action Button */}
        <div className="feature-card">
          <h3>➕ Floating Action Button</h3>
          <div className="fab-demo">
            <div className="fab-button">
              <span className="fab-icon">+</span>
              <span className="fab-text">הוסף מוצר</span>
            </div>
            <div className="fab-features">
              <p>✨ Hover animation with text reveal</p>
              <p>📝 Modal form integration</p>
              <p>🗃️ Automatic fridge selection</p>
              <p>📱 Mobile-optimized positioning</p>
            </div>
          </div>
        </div>

        {/* 4. Quick Actions */}
        <div className="feature-card">
          <h3>⚡ Enhanced Quick Actions</h3>
          <div className="actions-demo">
            <button className="action-btn good-action">
              <span className="action-icon">🗑️</span>
              סמן להשלכה
            </button>
            <button className="action-btn warning-action">
              <span className="action-icon">⚠️</span>
              השלך בקרוב
            </button>
            <button className="action-btn expired-action">
              <span className="action-icon">🚨</span>
              השלך עכשיו
            </button>
          </div>
          <p className="actions-note">Status-aware styling with hover animations</p>
        </div>

        {/* 5. Smart Filters */}
        <div className="feature-card">
          <h3>🔍 Smart Filters & Search</h3>
          <div className="filters-demo">
            <input type="text" placeholder="חיפוש פריטים..." className="search-demo" />
            <select className="filter-demo">
              <option>כל המקררים</option>
              <option>🗃️ בר ראשי</option>
              <option>🗃️ מטבח ראשי</option>
            </select>
            <div className="filter-chips">
              <span className="filter-chip">🍺 בר</span>
              <span className="filter-chip">🍳 מטבח</span>
            </div>
          </div>
        </div>

        {/* 6. Microinteractions */}
        <div className="feature-card">
          <h3>✨ Microinteractions & Animations</h3>
          <div className="animations-demo">
            <div className="card-demo">
              <div className="demo-card">
                <p>Hover me!</p>
                <div className="hover-effect"></div>
              </div>
            </div>
            <div className="animation-list">
              <p>🎭 Card hover with lift effect</p>
              <p>🌊 Smooth transitions</p>
              <p>💫 Loading skeletons</p>
              <p>🎨 Gradient backgrounds</p>
            </div>
          </div>
        </div>
      </div>

      <div className="implementation-note">
        <h3>🛠️ Implementation Details</h3>
        <div className="tech-stack">
          <span className="tech-badge">React + TypeScript</span>
          <span className="tech-badge">Material-UI Components</span>
          <span className="tech-badge">CSS3 Animations</span>
          <span className="tech-badge">Responsive Design</span>
          <span className="tech-badge">Accessibility Ready</span>
          <span className="tech-badge">PWA Compatible</span>
        </div>
      </div>

      <style>{`
        .inventory-showcase {
          max-width: 1200px;
          margin: 20px auto;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 16px;
          direction: rtl;
        }

        .showcase-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }

        .showcase-header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        }

        .showcase-header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .feature-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .feature-card h3 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        /* Status Examples */
        .status-examples {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .status-demo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .status-demo.status-good {
          background: #f1f8e9;
          border-color: #4CAF50;
        }

        .status-demo.status-warning {
          background: #fff8e1;
          border-color: #FF9800;
        }

        .status-demo.status-expired {
          background: #ffebee;
          border-color: #f44336;
          animation: subtle-pulse 2s infinite;
        }

        @keyframes subtle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.95; }
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.good { background: #4CAF50; }
        .status-badge.warning { background: #FF9800; }
        .status-badge.expired { background: #f44336; }

        /* Grouping Demo */
        .grouping-demo {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .department-demo {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .dept-header {
          padding: 12px 16px;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .dept-header.bar {
          background: linear-gradient(135deg, #673AB7, #9C27B0);
        }

        .dept-header.kitchen {
          background: linear-gradient(135deg, #FF9800, #F57C00);
        }

        .fridge-list {
          background: #f8f9fa;
          padding: 8px;
        }

        .fridge-item {
          background: white;
          padding: 8px 12px;
          margin-bottom: 4px;
          border-radius: 4px;
          font-size: 13px;
          color: #555;
          border-right: 3px solid #673AB7;
        }

        /* FAB Demo */
        .fab-demo {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .fab-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #673AB7, #9C27B0);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }

        .fab-button:hover {
          transform: scale(1.1);
          width: 140px;
          border-radius: 30px;
        }

        .fab-icon {
          font-size: 24px;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .fab-text {
          font-size: 12px;
          font-weight: 600;
          opacity: 0;
          transform: translateX(10px);
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .fab-button:hover .fab-text {
          opacity: 1;
          transform: translateX(0);
        }

        .fab-button:hover .fab-icon {
          transform: translateX(-10px);
        }

        .fab-features {
          flex: 1;
        }

        .fab-features p {
          margin: 4px 0;
          font-size: 13px;
          color: #666;
        }

        /* Actions Demo */
        .actions-demo {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .action-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .good-action {
          background: #FF9800;
        }

        .warning-action {
          background: #ff5722;
        }

        .expired-action {
          background: #f44336;
          animation: urgent-glow 2s infinite;
        }

        @keyframes urgent-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(244, 67, 54, 0); }
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .actions-note {
          font-size: 12px;
          color: #666;
          margin: 0;
        }

        /* Filters Demo */
        .filters-demo {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .search-demo,
        .filter-demo {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          text-align: right;
          direction: rtl;
        }

        .filter-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-chip {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        /* Animations Demo */
        .animations-demo {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .card-demo {
          flex-shrink: 0;
        }

        .demo-card {
          width: 80px;
          height: 60px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .demo-card:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }

        .hover-effect {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .demo-card:hover .hover-effect {
          left: 100%;
        }

        .animation-list p {
          margin: 4px 0;
          font-size: 13px;
          color: #666;
        }

        /* Implementation Note */
        .implementation-note {
          background: white;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .implementation-note h3 {
          margin: 0 0 16px 0;
          color: #333;
        }

        .tech-stack {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }

        .tech-badge {
          background: #e8f5e8;
          color: #2e7d32;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #4caf50;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .inventory-showcase {
            margin: 10px;
            padding: 15px;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .fab-demo,
          .animations-demo {
            flex-direction: column;
            text-align: center;
          }

          .tech-stack {
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default InventoryShowcase;