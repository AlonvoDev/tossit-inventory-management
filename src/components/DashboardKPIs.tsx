import React, { useState, useEffect, useCallback } from 'react';
import { normalizeDepartment } from '../app/access';
import { useAuth } from '../context/AuthContext';
import { getBusinessItems, getExpiredNotDiscardedItems, getDiscardedItems } from '../api/firestoreAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
// import { Item } from '../api/firestoreAPI';
// import { Fridge } from '../types/Fridge';
import { Timestamp } from 'firebase/firestore';

interface KPIData {
  totalActiveItems: number;
  expiredItems: number;
  discardedToday: number;
  totalFridges: number;
  nearExpiryItems: number;
  loading: boolean;
}

/**
 * Dashboard KPIs component showing key inventory metrics
 * Displays total items, expired items, discarded items, and fridges count
 */
const DashboardKPIs: React.FC = () => {
  const { businessId, profile, isOffline } = useAuth();
  const [kpiData, setKpiData] = useState<KPIData>({
    totalActiveItems: 0,
    expiredItems: 0,
    discardedToday: 0,
    totalFridges: 0,
    nearExpiryItems: 0,
    loading: true
  });

  const loadKPIData = useCallback(async () => {
    if (!businessId || isOffline) {
      setKpiData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setKpiData(prev => ({ ...prev, loading: true }));

      // Load all data in parallel for better performance
      const [allItems, expiredItems, discardedItems, fridges] = await Promise.all([
        getBusinessItems(businessId),
        getExpiredNotDiscardedItems(businessId),
        getDiscardedItems(businessId),
        getBusinessFridges(businessId)
      ]);

      // Filter active items (not discarded)
      const activeItems = allItems.filter(item => !item.discarded && !item.isThrown);

      // Filter items discarded today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);
      
      const discardedTodayItems = discardedItems.filter(item => 
        item.discardedAt && item.discardedAt.toMillis() >= todayTimestamp.toMillis()
      );

      // Calculate near expiry items (expire within 24 hours)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      const tomorrowTimestamp = Timestamp.fromDate(tomorrow);
      
      const nearExpiryItems = activeItems.filter(item => 
        item.expiryTime.toMillis() <= tomorrowTimestamp.toMillis() && 
        item.expiryTime.toMillis() > Timestamp.now().toMillis()
      );

      // Filter by user department if not admin/manager
      const userDepartment = profile?.department;
      const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
      
      let filteredActiveItems = activeItems;
      let filteredExpiredItems = expiredItems;
      let filteredNearExpiryItems = nearExpiryItems;
      let filteredFridges = fridges;

      if (!isAdmin && userDepartment) {
        // Canonical and legacy Hebrew values compare equal (server queries are already scoped).
        const own = normalizeDepartment(userDepartment);
        const inOwn = (value: unknown) => own !== null && normalizeDepartment(value) === own;
        filteredActiveItems = activeItems.filter(item => inOwn(item.area));
        filteredExpiredItems = expiredItems.filter(item => inOwn(item.area));
        filteredNearExpiryItems = nearExpiryItems.filter(item => inOwn(item.area));
        filteredFridges = fridges.filter(fridge => inOwn(fridge.department));
      }

      setKpiData({
        totalActiveItems: filteredActiveItems.length,
        expiredItems: filteredExpiredItems.length,
        discardedToday: discardedTodayItems.length,
        totalFridges: filteredFridges.length,
        nearExpiryItems: filteredNearExpiryItems.length,
        loading: false
      });

    } catch (error) {
      console.error('Error loading KPI data:', error);
      setKpiData(prev => ({ ...prev, loading: false }));
    }
  }, [businessId, isOffline, profile]);

  useEffect(() => {
    if (businessId && profile) {
      loadKPIData();
    }
  }, [businessId, profile, isOffline, loadKPIData]);

  if (kpiData.loading) {
    return (
      <div className="kpi-container">
        <div className="kpi-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="kpi-card loading">
              <div className="kpi-skeleton">
                <div className="skeleton-icon"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-number"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'פריטים פעילים',
      value: kpiData.totalActiveItems,
      icon: '📦',
      color: '#4CAF50',
      bgColor: '#E8F5E8'
    },
    {
      title: 'פריטים שפג תוקפם',
      value: kpiData.expiredItems,
      icon: '⚠️',
      color: '#f44336',
      bgColor: '#FFEBEE'
    },
    {
      title: 'קרוב לפוג תוקף',
      value: kpiData.nearExpiryItems,
      icon: '⏰',
      color: '#FF9800',
      bgColor: '#FFF3E0'
    },
    {
      title: 'נזרק היום',
      value: kpiData.discardedToday,
      icon: '🗑️',
      color: '#757575',
      bgColor: '#F5F5F5'
    }
  ];

  return (
    <div className="kpi-container">
      <div className="kpi-grid">
        {kpiCards.map((kpi, index) => (
          <div 
            key={index} 
            className="kpi-card"
            style={{ borderTop: `4px solid ${kpi.color}` }}
          >
            <div className="kpi-content">
              <div className="kpi-header">
                <span className="kpi-icon" style={{ backgroundColor: kpi.bgColor }}>
                  {kpi.icon}
                </span>
                <div className="kpi-info">
                  <h3 className="kpi-title">{kpi.title}</h3>
                  <div className="kpi-value" style={{ color: kpi.color }}>
                    {kpi.value.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Progress indicator for critical items */}
              {(kpi.title.includes('פג תוקף') || kpi.title.includes('קרוב לפוג')) && kpi.value > 0 && (
                <div className="kpi-progress">
                  <div 
                    className="kpi-progress-bar"
                    style={{ 
                      backgroundColor: kpi.color,
                      width: `${Math.min((kpi.value / Math.max(kpiData.totalActiveItems, 1)) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOffline && (
        <div className="kpi-offline-notice">
          <span className="offline-icon">📶</span>
          נתונים מהמטמון המקומי - ייתכן שאינם מעודכנים
        </div>
      )}

      <style>{`
        .kpi-container {
          margin-bottom: 30px;
          padding: 0 5px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .kpi-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .kpi-card.loading {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .kpi-content {
          position: relative;
          z-index: 1;
        }

        .kpi-header {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .kpi-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .kpi-info {
          flex: 1;
        }

        .kpi-title {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          text-align: right;
        }

        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          margin: 0;
          text-align: right;
          line-height: 1;
        }

        .kpi-progress {
          margin-top: 15px;
          width: 100%;
          height: 4px;
          background-color: #f0f0f0;
          border-radius: 2px;
          overflow: hidden;
        }

        .kpi-progress-bar {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        .kpi-skeleton {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .skeleton-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background-color: rgba(255,255,255,0.3);
        }

        .skeleton-text,
        .skeleton-number {
          background-color: rgba(255,255,255,0.3);
          border-radius: 4px;
        }

        .skeleton-text {
          width: 80px;
          height: 14px;
          margin-bottom: 8px;
        }

        .skeleton-number {
          width: 60px;
          height: 32px;
        }

        .kpi-offline-notice {
          background-color: #FFF3E0;
          color: #F57C00;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #FFB300;
        }

        .offline-icon {
          font-size: 16px;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }

          .kpi-card {
            padding: 15px;
          }

          .kpi-icon {
            width: 40px;
            height: 40px;
            font-size: 20px;
          }

          .kpi-value {
            font-size: 24px;
          }

          .kpi-title {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .kpi-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .kpi-card {
            padding: 12px;
          }

          .kpi-header {
            gap: 10px;
          }

          .kpi-value {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardKPIs;