import React, { useState } from 'react';
import EnhancedLoading from './EnhancedLoading';
import LoadingSkeleton from './LoadingSkeleton';

/**
 * Comprehensive demo of all animations and microinteractions implemented
 * Showcases the enterprise-ready UI/UX enhancements
 */
const AnimationsDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('hover');
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="animations-demo">
      <div className="demo-header">
        <h2>✨ Animations & Microinteractions Showcase</h2>
        <p>Enterprise-ready UI with smooth transitions and engaging interactions</p>
      </div>

      <div className="demo-controls">
        <button 
          className={`demo-tab ${activeDemo === 'hover' ? 'active' : ''}`}
          onClick={() => setActiveDemo('hover')}
        >
          🎭 Hover Effects
        </button>
        <button 
          className={`demo-tab ${activeDemo === 'loading' ? 'active' : ''}`}
          onClick={() => setActiveDemo('loading')}
        >
          🔄 Loading States
        </button>
        <button 
          className={`demo-tab ${activeDemo === 'transitions' ? 'active' : ''}`}
          onClick={() => setActiveDemo('transitions')}
        >
          🌊 Transitions
        </button>
        <button 
          className={`demo-tab ${activeDemo === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveDemo('cards')}
        >
          📋 Card Effects
        </button>
      </div>

      <div className="demo-content">
        {activeDemo === 'hover' && (
          <div className="hover-demo">
            <h3>🎭 Hover Effects</h3>
            <div className="hover-examples">
              <div className="hover-card lift">
                <h4>Lift Effect</h4>
                <p>Cards lift on hover with shadow enhancement</p>
              </div>
              
              <div className="hover-card scale">
                <h4>Scale Effect</h4>
                <p>Subtle scaling with smooth transitions</p>
              </div>
              
              <div className="hover-card glow">
                <h4>Glow Effect</h4>
                <p>Soft glow for attention-grabbing elements</p>
              </div>
              
              <div className="hover-card slide">
                <h4>Slide Effect</h4>
                <p>Content slides with overlay animation</p>
                <div className="slide-overlay">מידע נוסף</div>
              </div>
            </div>

            <div className="button-examples">
              <button className="btn-primary">Primary Button</button>
              <button className="btn-success">Success Action</button>
              <button className="btn-warning">Warning Alert</button>
              <button className="btn-danger">Critical Action</button>
            </div>
          </div>
        )}

        {activeDemo === 'loading' && (
          <div className="loading-demo">
            <h3>🔄 Loading States</h3>
            <div className="loading-examples">
              <div className="loading-section">
                <h4>Enhanced Loading Components</h4>
                <div className="loading-variants">
                  <EnhancedLoading type="spinner" size="medium" message="טוען נתונים..." />
                  <EnhancedLoading type="dots" size="medium" message="מעבד פעולה..." />
                  <EnhancedLoading type="pulse" size="medium" message="מתחבר לשרת..." />
                </div>
              </div>
              
              <div className="loading-section">
                <h4>Skeleton Loading</h4>
                <LoadingSkeleton type="admin" message="טוען ממשק ניהול..." />
              </div>
              
              <div className="loading-section">
                <h4>Progress Indicators</h4>
                <div className="progress-examples">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '70%' }}></div>
                  </div>
                  <div className="circular-progress">
                    <svg className="progress-ring" width="60" height="60">
                      <circle
                        className="progress-ring-circle"
                        stroke="#673AB7"
                        strokeWidth="4"
                        fill="transparent"
                        r="26"
                        cx="30"
                        cy="30"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'transitions' && (
          <div className="transitions-demo">
            <h3>🌊 Smooth Transitions</h3>
            <div className="transition-examples">
              <div className="modal-demo">
                <button onClick={() => setShowModal(true)} className="open-modal-btn">
                  Open Modal
                </button>
                {showModal && (
                  <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                      <h4>Modal with Smooth Animation</h4>
                      <p>This modal slides in from the bottom with backdrop blur</p>
                      <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="fade-demo">
                <h4>Fade Transitions</h4>
                <div className="fade-items">
                  <div className="fade-item">Item 1</div>
                  <div className="fade-item">Item 2</div>
                  <div className="fade-item">Item 3</div>
                </div>
              </div>
              
              <div className="slide-demo">
                <h4>Slide Animations</h4>
                <div className="slide-container">
                  <div className="slide-item">Slide من اليسار</div>
                  <div className="slide-item">Slide من اليمين</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDemo === 'cards' && (
          <div className="cards-demo">
            <h3>📋 Card Animations</h3>
            <div className="card-examples">
              <div className="product-card">
                <div className="card-image">🥛</div>
                <div className="card-content">
                  <h4>חלב טרי</h4>
                  <p className="card-status valid">תקין</p>
                  <div className="card-actions">
                    <button className="card-btn">פרטים</button>
                    <button className="card-btn danger">השלך</button>
                  </div>
                </div>
                <div className="card-overlay">
                  <p>נפתח: היום</p>
                  <p>פג תוקף: מחר</p>
                </div>
              </div>
              
              <div className="product-card warning">
                <div className="card-image">🍞</div>
                <div className="card-content">
                  <h4>לחם טוסט</h4>
                  <p className="card-status warning">קרוב לפוג</p>
                  <div className="card-actions">
                    <button className="card-btn">פרטים</button>
                    <button className="card-btn warning">השלך בקרוב</button>
                  </div>
                </div>
                <div className="card-overlay">
                  <p>נפתח: אתמול</p>
                  <p>פג תוקף: היום</p>
                </div>
              </div>
              
              <div className="product-card expired">
                <div className="card-image">🧀</div>
                <div className="card-content">
                  <h4>גבינה צהובה</h4>
                  <p className="card-status expired">פג תוקף</p>
                  <div className="card-actions">
                    <button className="card-btn">פרטים</button>
                    <button className="card-btn danger pulse">השלך עכשיו</button>
                  </div>
                </div>
                <div className="card-overlay">
                  <p>נפתח: לפני שבוע</p>
                  <p>פג תוקף: אתמול</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .animations-demo {
          max-width: 1000px;
          margin: 20px auto;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 16px;
          direction: rtl;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }

        .demo-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .demo-header p {
          margin: 0;
          opacity: 0.9;
        }

        .demo-controls {
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
          gap: 4px;
          background: white;
          padding: 4px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .demo-tab {
          padding: 12px 20px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          font-size: 14px;
        }

        .demo-tab:hover {
          background: #f5f5f5;
        }

        .demo-tab.active {
          background: #673AB7;
          color: white;
          box-shadow: 0 2px 8px rgba(103, 58, 183, 0.3);
        }

        .demo-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        /* Hover Effects */
        .hover-examples {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .hover-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hover-card.lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .hover-card.scale:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }

        .hover-card.glow:hover {
          box-shadow: 0 0 20px rgba(103, 58, 183, 0.4);
        }

        .hover-card.slide {
          position: relative;
        }

        .slide-overlay {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #673AB7, #9C27B0);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: top 0.3s ease;
          font-weight: 600;
        }

        .hover-card.slide:hover .slide-overlay {
          top: 0;
        }

        .button-examples {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-success,
        .btn-warning,
        .btn-danger {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-primary {
          background: linear-gradient(135deg, #673AB7, #9C27B0);
        }

        .btn-success {
          background: linear-gradient(135deg, #4CAF50, #45A049);
        }

        .btn-warning {
          background: linear-gradient(135deg, #FF9800, #F57C00);
        }

        .btn-danger {
          background: linear-gradient(135deg, #f44336, #d32f2f);
        }

        .btn-primary:hover,
        .btn-success:hover,
        .btn-warning:hover,
        .btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .btn-primary::before,
        .btn-success::before,
        .btn-warning::before,
        .btn-danger::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .btn-primary:hover::before,
        .btn-success:hover::before,
        .btn-warning:hover::before,
        .btn-danger:hover::before {
          left: 100%;
        }

        /* Loading Examples */
        .loading-examples {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .loading-section h4 {
          margin-bottom: 15px;
          color: #333;
        }

        .loading-variants {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .progress-examples {
          display: flex;
          gap: 30px;
          align-items: center;
        }

        .progress-bar {
          width: 200px;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #673AB7, #9C27B0);
          border-radius: 4px;
          animation: progress-load 2s ease-in-out infinite;
        }

        @keyframes progress-load {
          0%, 100% { transform: translateX(-20px); }
          50% { transform: translateX(0); }
        }

        .circular-progress {
          position: relative;
        }

        .progress-ring-circle {
          stroke-dasharray: 164;
          stroke-dashoffset: 82;
          animation: progress-ring 2s ease-in-out infinite;
        }

        @keyframes progress-ring {
          0% { stroke-dashoffset: 164; }
          50% { stroke-dashoffset: 41; }
          100% { stroke-dashoffset: 164; }
        }

        /* Modal Demo */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: modal-fade-in 0.3s ease;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          width: 90%;
          animation: modal-slide-up 0.3s ease;
          text-align: center;
        }

        @keyframes modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modal-slide-up {
          from { 
            opacity: 0;
            transform: translateY(50px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .open-modal-btn {
          background: #673AB7;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .open-modal-btn:hover {
          background: #5E35B1;
          transform: translateY(-2px);
        }

        /* Card Examples */
        .card-examples {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .product-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border-right: 4px solid #4CAF50;
        }

        .product-card.warning {
          border-right-color: #FF9800;
        }

        .product-card.expired {
          border-right-color: #f44336;
          animation: expired-pulse 2s infinite;
        }

        @keyframes expired-pulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          50% { box-shadow: 0 4px 16px rgba(244, 67, 54, 0.3); }
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .product-card:hover .card-overlay {
          opacity: 1;
          transform: translateY(0);
        }

        .card-image {
          font-size: 48px;
          text-align: center;
          margin-bottom: 15px;
        }

        .card-content h4 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .card-status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 15px;
          display: inline-block;
        }

        .card-status.valid {
          background: #E8F5E8;
          color: #2E7D32;
        }

        .card-status.warning {
          background: #FFF3E0;
          color: #F57C00;
        }

        .card-status.expired {
          background: #FFEBEE;
          color: #C62828;
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .card-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .card-btn:not(.danger):not(.warning) {
          background: #f5f5f5;
          color: #333;
        }

        .card-btn.danger {
          background: #f44336;
          color: white;
        }

        .card-btn.warning {
          background: #FF9800;
          color: white;
        }

        .card-btn.pulse {
          animation: button-pulse 1.5s infinite;
        }

        @keyframes button-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .card-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .card-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, rgba(103, 58, 183, 0.9), rgba(156, 39, 176, 0.9));
          color: white;
          padding: 15px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
        }

        .card-overlay p {
          margin: 2px 0;
          font-size: 12px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .animations-demo {
            margin: 10px;
            padding: 15px;
          }

          .demo-controls {
            flex-wrap: wrap;
          }

          .hover-examples,
          .card-examples {
            grid-template-columns: 1fr;
          }

          .button-examples {
            flex-direction: column;
            align-items: center;
          }

          .progress-examples {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimationsDemo;