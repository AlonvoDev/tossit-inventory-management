import React, { useState, useEffect, useMemo } from 'react';
import { departmentLabel } from '../app/access';
import { shiftBlocksOpening } from '../features/inventory/openItem';
import LoadingSkeleton from './LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { Item, subscribeBusinessItems } from '../api/firestoreAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { Fridge } from '../types/Fridge';
import { formatExpiryTime, getExpiryStatus } from '../utils/expiryUtils';
import { ItemActionModal, ItemActionConfirm } from './ui/ItemActionModal';
import { useCloseItem } from '../hooks/useItemActions';
import { useOffline } from '../offline/OfflineProvider';
import { selectItems, ListMode } from '../features/inventory/itemSelection';
import { errorMessage } from '../features/common/errorMessage';

interface ItemsListProps {
  areaFilter?: 'bar' | 'kitchen' | 'בר' | 'מטבח';
  showExpiredOnly?: boolean;
  showDiscardedOnly?: boolean; // New prop
  showExpiringsSoon?: boolean; // Items expiring within 3 days
  showActiveOnly?: boolean; // Active items only
  showFinishedOnly?: boolean; // Items that were used up completely
  /** Unused since the list is realtime; kept so existing callers compile. */
  refreshTrigger?: number;
  isOffline?: boolean;
  onItemUpdated?: () => void; // Callback for when items are updated
}

const ItemsList: React.FC<ItemsListProps> = ({ 
  areaFilter, 
  showExpiredOnly = false,
  showDiscardedOnly = false, // New prop
  showExpiringsSoon = false,
  showActiveOnly = false,
  showFinishedOnly = false,
  isOffline = false,
  onItemUpdated
}) => {
  const { businessId, profile, role, isOnShift, loading } = useAuth();
  // Closing follows the same rule as opening: staff need an active shift (C1b `operates`).
  const offShift = shiftBlocksOpening(role, !!isOnShift);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Item action dialog (finished / discarded)
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionModalItem, setActionModalItem] = useState<Item | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const close = useCloseItem();
  // Durable queue state per item (C3): pending and failed are shown, never treated as synced.
  const { operations } = useOffline();
  const syncByItem = useMemo(() => {
    const map: Record<string, 'pending' | 'failed'> = {};
    for (const op of operations) {
      if (op.state === 'failed') map[op.itemId] = 'failed';
      else if (op.state === 'pending' && map[op.itemId] !== 'failed') map[op.itemId] = 'pending';
    }
    return map;
  }, [operations]);
  const isActionLoading = close.submitting;

  // Fridges for filtering and name lookup
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [fridgeMap, setFridgeMap] = useState<{ [id: string]: string }>({});
  const [fridgeFilter, setFridgeFilter] = useState<string>('all');

  const userDepartment = profile?.department;
  const canSeeAllDepartments = role === 'admin';

  const mode: ListMode = showDiscardedOnly
    ? 'discarded'
    : showFinishedOnly
      ? 'finished'
      : showExpiredOnly
        ? 'expired'
        : showExpiringsSoon
          ? 'expiring'
          : showActiveOnly
            ? 'active'
            : 'open';

  // Realtime, server-scoped inventory (C2 subscribeBusinessItems): other devices' opens and
  // closes appear without refreshing. `refreshTrigger` is kept for compatibility only.
  useEffect(() => {
    if (loading || !profile || !businessId) return;
    setIsLoading(true);
    setError(null);
    const unsubscribe = subscribeBusinessItems(
      businessId,
      next => {
        setItems(next);
        setIsLoading(false);
        setError(null);
      },
      err => {
        console.error('Error loading items:', err);
        setError(errorMessage(err, 'טעינת הפריטים נכשלה. נסה שוב.'));
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [businessId, loading, profile]);

  // Expiry state changes with time even without data changes.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    getBusinessFridges(businessId)
      .then(data => {
        if (cancelled) return;
        setFridges(data);
        const map: { [id: string]: string } = {};
        data.forEach(f => {
          if (f.id) map[f.id] = f.name;
        });
        setFridgeMap(map);
      })
      .catch(err => console.error('Error fetching fridges:', err));
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    let selected = selectItems(items, { mode, department: areaFilter }, nowMs);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      selected = selected.filter(item => item.productName.toLowerCase().includes(query));
    }
    if (fridgeFilter && fridgeFilter !== 'all') {
      selected = selected.filter(item => item.fridgeId === fridgeFilter);
    }
    setFilteredItems(selected);
  }, [items, mode, areaFilter, nowMs, searchQuery, fridgeFilter]);

  const openActionModal = (item: Item) => {
    close.reset();
    setActionNotice(null);
    setActionModalItem(item);
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setActionModalItem(null);
    close.reset();
  };

  // Success is reported only for a receipt; the realtime list then reflects the server state.
  const handleActionConfirm = async (input: ItemActionConfirm) => {
    if (!actionModalItem?.id) return;
    const receipt = await close.submit({ itemId: actionModalItem.id, ...input });
    if (!receipt) return; // error shown in the dialog; same intent is reused on retry
    const name = actionModalItem.productName;
    setActionNotice(
      receipt.state === 'synced'
        ? input.action === 'finished'
          ? `"${name}" סומן כנגמר`
          : `"${name}" סומן כנזרק`
        : `העדכון של "${name}" ממתין לשליחה לשרת ועדיין לא נשמר`,
    );
    setShowActionModal(false);
    setActionModalItem(null);
    onItemUpdated?.();
  };

  // Close the dialog if the item disappears or is closed elsewhere while it is open.
  useEffect(() => {
    if (!actionModalItem || isActionLoading) return;
    const current = items.find(i => i.id === actionModalItem.id);
    if (current && (current.finished || current.discarded || current.isThrown) && !close.alreadyClosed) {
      setActionNotice(`"${current.productName}" כבר עודכן ממכשיר אחר`);
      closeActionModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Group items by department and fridge for better organization
  const groupItemsByFridge = (items: Item[]) => {
    const groups: { [department: string]: { [fridgeId: string]: { fridge: Fridge | null; items: Item[] } } } = {};
    
    items.forEach(item => {
      const department = item.area === 'בר' || item.area === 'bar' ? 'בר' : 
                        item.area === 'מטבח' || item.area === 'kitchen' ? 'מטבח' : 
                        item.area || 'אחר';
      
      const fridgeId = item.fridgeId || 'no-fridge';
      
      if (!groups[department]) {
        groups[department] = {};
      }
      
      if (!groups[department][fridgeId]) {
        const fridge = fridgeId !== 'no-fridge' && fridgeMap[fridgeId] 
          ? fridges.find(f => f.id === fridgeId) || null 
          : null;
        groups[department][fridgeId] = {
          fridge,
          items: []
        };
      }
      
      groups[department][fridgeId].items.push(item);
    });
    
    return groups;
  };

  const groupedItems = groupItemsByFridge(filteredItems);

  return (
    <div className="items-list responsive-card" dir="rtl">
      <div className="list-header responsive-flex--column-mobile">
        <h2 className="responsive-text--large">{showExpiredOnly ? 'פריטים שפג תוקפם' : 'מלאי נוכחי'}</h2>
        <div className="filter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
          {/* Search input */}
          <input
            type="text"
            placeholder="חיפוש פריטים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input responsive-form__input"
            style={{ flex: '1 0 150px' }}
          />
          {/* Fridge filter */}
          {fridges.length > 0 && (
            <div className="fridge-filter" style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="fridgeFilter" style={{ marginLeft: '8px', color: '#000' }}>מקרר:</label>
              <select
                id="fridgeFilter"
                value={fridgeFilter}
                onChange={(e) => setFridgeFilter(e.target.value)}
                style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '120px' }}
              >
                <option value="all">כל המקררים</option>
                {fridges.map((fridge) => (
                  <option key={fridge.id} value={fridge.id || ''}>
                    {fridge.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="action-notice" role="status">{actionNotice}</div>
      )}
      {offShift && !showDiscardedOnly && !showFinishedOnly && (
        <div className="offline-note" role="note">יש להתחיל משמרת כדי לסמן פריטים כנגמרו או כנזרקו.</div>
      )}

      {isLoading ? (
        /* Show nicer loading state with skeletons instead of plain text */
        <LoadingSkeleton type="admin" message="טוען פריטים..." />
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <p className="no-items-message">
            {searchQuery 
              ? 'לא נמצאו פריטים התואמים את החיפוש'
              : showDiscardedOnly
                ? canSeeAllDepartments
                  ? 'לא נמצאו פריטים נזרקים'
                  : `לא נמצאו פריטים נזרקים במחלקת ${'ה' + (departmentLabel(userDepartment) ?? '')}`
                : showExpiredOnly 
                  ? canSeeAllDepartments 
                    ? 'לא נמצאו פריטים שפג תוקפם' 
                    : `לא נמצאו פריטים שפג תוקפם במחלקת ${'ה' + (departmentLabel(userDepartment) ?? '')}`
                  : canSeeAllDepartments
                    ? 'אין פריטים במלאי'
                    : userDepartment
                      ? `אין פריטים במלאי של מחלקת ${'ה' + (departmentLabel(userDepartment) ?? '')}`
                      : 'אין פריטים במלאי'
            }
          </p>
          {!canSeeAllDepartments && userDepartment && !showDiscardedOnly && (
            <p className="filter-info">
              מציג פריטים עבור מחלקת {'ה' + (departmentLabel(userDepartment) ?? '')} בלבד
            </p>
          )}
          {canSeeAllDepartments && !showDiscardedOnly && (
            <p className="filter-info">
              מציג פריטים מכל המחלקות
            </p>
          )}
          {showDiscardedOnly && (
            <p className="filter-info">
              מציג פריטים נזרקים {canSeeAllDepartments ? 'מכל המחלקות' : `ממחלקת ${'ה' + (departmentLabel(userDepartment) ?? '')}`}
            </p>
          )}
          {isOffline && <p className="offline-note">אין חיבור. מוצג המצב האחרון שנשמר במכשיר.</p>}
        </div>
      ) : (
        <div className="grouped-inventory">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="empty-group">
              <p>אין פריטים להצגה</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([department, fridgeGroups]) => (
              <div key={department} className="department-group">
                <h3 className="department-title">
                  {department === 'בר' ? '🍺 בר' : 
                   department === 'מטבח' ? '🍳 מטבח' : 
                   `📦 ${department}`}
                  <span className="item-count">
                    ({Object.values(fridgeGroups).reduce((total, group) => total + group.items.length, 0)} פריטים)
                  </span>
                </h3>
                
                <div className="fridge-groups">
                  {Object.entries(fridgeGroups).map(([fridgeId, group]) => (
                    <div key={fridgeId} className="fridge-group">
                      <h4 className="fridge-title">
                        🗃️ {group.fridge ? group.fridge.name : 'ללא מקרר'}
                        <span className="fridge-item-count">({group.items.length})</span>
                      </h4>
                      
                      <div className="items-grid responsive-grid--auto">
                        {group.items.map((item) => {
                          const { text: statusText, color: statusColor } = getExpiryStatus(item.expiryTime);
                          const hebrewStatus = statusText === 'Good' ? 'תקין' : 
                                              statusText === 'Warning' ? 'קרוב לפוג' : 
                                              statusText === 'Expired' ? 'פג תוקף' : statusText;
                          
                          const isDiscarded = item.discarded || item.isThrown;
                          const isFinished = item.finished;
                          
                          return (
                            <div key={item.id} className={`item-card ${isDiscarded ? 'discarded' : ''} ${isFinished ? 'finished' : ''} status-${statusText.toLowerCase()}`}>
                              <div className="item-header">
                                <h3>{item.productName}</h3>
                                {item.id && syncByItem[item.id] === 'pending' && (
                                  <span className="sync-badge pending" title="נשמר במכשיר, עדיין לא נשמר בשרת">ממתין לשליחה</span>
                                )}
                                {item.id && syncByItem[item.id] === 'failed' && (
                                  <span className="sync-badge failed" title="השרת דחה את הפעולה; פרטים בכותרת">הפעולה נכשלה</span>
                                )}
                                <span 
                                  className="status-badge-enhanced" 
                                  style={{ backgroundColor: statusColor }}
                                >
                                  {hebrewStatus}
                                </span>
                              </div>
                              
                              <div className="item-details">
                                <p><strong>כמות:</strong> {item.amount}{item.type === 'kg' ? ' kg' : ' יח׳'}</p>
                                <p><strong>נפתח:</strong> {formatExpiryTime(item.openingTime)}</p>
                                <p><strong>פג תוקף:</strong> {formatExpiryTime(item.expiryTime)}</p>
                                
                                {/* Show discard information for discarded items */}
                                {isDiscarded && (
                                  <div className="discard-info">
                                    {item.discardedAt && (
                                      <p><strong>הושלך ב:</strong> {formatExpiryTime(item.discardedAt)}</p>
                                    )}
                                    {!item.discardedAt && item.isThrown && (
                                      <p><em>סומן כנזרק (תאריך לא זמין)</em></p>
                                    )}
                                    {item.discardedByName && (
                                      <p><strong>על ידי:</strong> {item.discardedByName}</p>
                                    )}
                                    {item.discardedQuantity && item.discardedQuantity > 0 && (
                                      <p><strong>כמות שנזרקה:</strong> {item.discardedQuantity} {item.type === 'kg' ? 'ק"ג' : 'יחידות'}</p>
                                    )}
                                    {item.discardReason && (
                                      <p><strong>סיבת זריקה:</strong> {
                                        item.discardReason === 'expired' ? 'פג תוקף' :
                                        item.discardReason === 'damaged' ? 'נפגם' :
                                        'אחר'
                                      }</p>
                                    )}
                                  </div>
                                )}

                                {/* Show finished information for finished items */}
                                {isFinished && (
                                  <div className="finished-info">
                                    {item.finishedAt && (
                                      <p><strong>נגמר ב:</strong> {formatExpiryTime(item.finishedAt)}</p>
                                    )}
                                    {item.finishedByName && (
                                      <p><strong>על ידי:</strong> {item.finishedByName}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Enhanced quick action buttons */}
                              {!isDiscarded && !isFinished && !showDiscardedOnly && !showFinishedOnly && (
                                <div className="action-buttons">
                                  <button
                                    className={`quick-action-btn ${statusText.toLowerCase()}-action`}
                                    onClick={() => openActionModal(item)}
                                    disabled={offShift}
                                    title={offShift ? 'יש להתחיל משמרת' : undefined}
                                  >
                                    <span className="action-icon">🗑️</span>
                                    עדכן סטטוס
                                  </button>
                                </div>
                              )}


                              
                              {/* Enhanced discarded label */}
                              {isDiscarded && (
                                <div className="discarded-label-enhanced">
                                  <span className="discarded-icon">🗑️</span>
                                  נזרק לפח
                                </div>
                              )}

                              {/* Enhanced finished label */}
                              {isFinished && (
                                <div className="finished-label-enhanced">
                                  <span className="finished-icon">✅</span>
                                  נגמר
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        .items-list {
          width: 100%;
          color: #000;
          text-align: right;
        }
        
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        h2 {
          margin: 0;
          color: #000;
        }
        
        .search-container {
          margin-top: 10px;
          width: 100%;
        }
        
        .search-input {
          color: #000;
          text-align: right;
          direction: rtl;
        }
        
        .loading, .empty-state {
          padding: 20px;
          text-align: center;
          color: #000;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        
        .sync-badge {
          display: inline-block;
          border-radius: 10px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
          margin-inline-start: 8px;
        }
        .sync-badge.pending { background: #e3f2fd; color: #0d47a1; }
        .sync-badge.failed { background: #ffebee; color: #b71c1c; }

        .action-notice {
          background: #e8f5e9;
          color: #1b5e20;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .error {
          color: #C62828;
          background-color: #FFEBEE;
        }

        /* Enhanced Grouped Inventory Styles */
        .grouped-inventory {
          margin-top: 20px;
        }

        .department-group {
          margin-bottom: 30px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .department-title {
          background: linear-gradient(135deg, #673AB7 0%, #9C27B0 100%);
          color: white;
          padding: 15px 20px;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .item-count {
          background-color: rgba(255,255,255,0.2);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
        }

        .fridge-groups {
          background-color: #fafafa;
          padding: 15px;
        }

        .fridge-group {
          margin-bottom: 20px;
          last-child: margin-bottom: 0;
        }

        .fridge-title {
          color: #333;
          margin: 0 0 15px 0;
          font-size: 16px;
          font-weight: 500;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: #f0f0f0;
          border-radius: 8px;
        }

        .fridge-item-count {
          background-color: #673AB7;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }

        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        
        /* Enhanced Item Cards with Status Colors */
        .item-card {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          position: relative;
          transition: all 0.3s ease;
          border: 2px solid #e0e0e0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          color: #000;
        }

        .item-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        /* Enhanced Status-based indicators with accessibility */
        .item-card.status-good {
          border-left: 6px solid #4CAF50;
          background: linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%);
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
        }

        .item-card.status-good:hover {
          box-shadow: 0 4px 16px rgba(76, 175, 80, 0.25);
        }

        .item-card.status-warning {
          border-left: 6px solid #FF9800;
          background: linear-gradient(135deg, #ffffff 0%, #fff8e1 100%);
          box-shadow: 0 2px 8px rgba(255, 152, 0, 0.15);
        }

        .item-card.status-warning:hover {
          box-shadow: 0 4px 16px rgba(255, 152, 0, 0.25);
        }

        .item-card.status-expired {
          border-left: 6px solid #f44336;
          background: linear-gradient(135deg, #ffffff 0%, #ffebee 100%);
          box-shadow: 0 2px 8px rgba(244, 67, 54, 0.15);
          position: relative;
          overflow: hidden;
        }

        .item-card.status-expired:hover {
          box-shadow: 0 4px 16px rgba(244, 67, 54, 0.25);
        }

        .item-card.status-expired::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #f44336, #d32f2f, #f44336);
          animation: urgent-pulse 2s ease-in-out infinite;
        }

        @keyframes urgent-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        .item-card.discarded {
          opacity: 0.7;
          border-left: 6px solid #B0BEC5;
          background-color: #f5f5f5;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        
        .item-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
          flex: 1;
          margin-left: 10px;
        }

        .status-badge-enhanced {
          color: white;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          position: relative;
          overflow: hidden;
        }

        /* Accessibility: High contrast mode support */
        @media (prefers-contrast: high) {
          .item-card.status-good {
            border-left-width: 8px;
            background: #ffffff;
          }
          
          .item-card.status-warning {
            border-left-width: 8px;
            background: #ffffff;
          }
          
          .item-card.status-expired {
            border-left-width: 8px;
            background: #ffffff;
          }
          
          .status-badge-enhanced {
            border: 2px solid currentColor;
          }
        }

        /* Status indicator with icon */
        .status-badge-enhanced::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255,255,255,0.8);
        }
        
        .item-details {
          margin-bottom: 15px;
          color: #333;
          line-height: 1.5;
        }
        
        .item-details p {
          margin: 8px 0;
          color: #555;
          font-size: 14px;
        }

        .item-details strong {
          color: #333;
          font-weight: 600;
        }

        /* Enhanced Quick Action Buttons */
        .quick-action-btn {
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .quick-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .good-action {
          background-color: #FF9800;
          color: white;
        }

        .good-action:hover:not(:disabled) {
          background-color: #F57C00;
          transform: translateY(-1px);
        }

        .warning-action {
          background-color: #ff5722;
          color: white;
        }

        .warning-action:hover:not(:disabled) {
          background-color: #e64a19;
          transform: translateY(-1px);
        }

        .expired-action {
          background-color: #f44336;
          color: white;
          animation: pulse 2s infinite;
        }

        .expired-action:hover:not(:disabled) {
          background-color: #d32f2f;
          transform: translateY(-1px);
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
          100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
        }

        .action-icon {
          font-size: 16px;
        }

        /* Action buttons */
        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          margin-top: 12px;
        }

        /* Enhanced Finished Label */
        .finished-label-enhanced {
          position: absolute;
          top: 8px;
          right: 8px;
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }

        .finished-icon {
          font-size: 0.8rem;
        }

        .item-card.finished {
          border: 2px solid #4CAF50;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.05), rgba(69, 160, 73, 0.05));
          opacity: 0.9;
        }

        .finished-info {
          background: rgba(76, 175, 80, 0.1);
          padding: 8px;
          border-radius: 6px;
          margin-top: 8px;
          border-left: 3px solid #4CAF50;
        }

        .finished-info p {
          margin: 4px 0;
          font-size: 0.85rem;
          color: #2e7d32;
        }

        /* Enhanced Discarded Label */
        .discarded-label-enhanced {
          background: linear-gradient(135deg, #757575 0%, #616161 100%);
          color: white;
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .discarded-icon {
          font-size: 16px;
        }
        
        .discard-info {
          margin-top: 10px;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 6px;
          font-size: 12px;
          color: #666;
        }

        .discard-info p {
          margin: 4px 0;
        }
        
        .offline-note {
          margin-top: 8px;
          color: #f57c00;
          font-style: italic;
        }

        .empty-group {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        
        /* Enhanced mobile responsiveness with touch-friendly design */
        @media (max-width: 768px) {
          .list-header {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }

          .filter-row {
            flex-direction: column;
            gap: 12px !important;
          }

          .search-input {
            padding: 12px 16px !important;
            font-size: 16px;
            border-radius: 8px;
            border: 2px solid #e0e0e0;
            min-height: 44px; /* Touch-friendly minimum */
          }

          .fridge-filter select {
            padding: 12px 16px !important;
            font-size: 16px;
            border-radius: 8px;
            border: 2px solid #e0e0e0;
            min-height: 44px;
            width: 100%;
          }

          .department-title {
            font-size: 16px;
            padding: 16px 20px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .fridge-title {
            font-size: 14px;
            padding: 12px 16px;
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .items-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .item-card {
            padding: 20px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }

          .item-header {
            margin-bottom: 20px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .item-header h3 {
            font-size: 18px;
            line-height: 1.3;
            margin-left: 0;
          }

          .status-badge-enhanced {
            align-self: flex-start;
            font-size: 12px;
            padding: 8px 16px;
          }

          .item-details p {
            font-size: 15px;
            line-height: 1.6;
            margin: 12px 0;
          }

          .quick-action-btn {
            padding: 16px 20px;
            font-size: 16px;
            min-height: 48px; /* Touch-friendly */
            border-radius: 12px;
          }

          .action-icon {
            font-size: 18px;
          }

          .fridge-groups {
            padding: 16px;
          }

          .discard-info, .finished-info {
            padding: 16px;
            margin-top: 16px;
            border-radius: 12px;
          }

          .discard-info p, .finished-info p {
            font-size: 14px;
            line-height: 1.5;
          }
        }

        @media (max-width: 480px) {
          .item-card {
            padding: 16px;
            margin: 0 -4px; /* Slightly wider on very small screens */
          }

          .department-title {
            font-size: 14px;
            padding: 12px 16px;
          }

          .fridge-title {
            font-size: 13px;
            padding: 10px 12px;
          }

          .item-header h3 {
            font-size: 16px;
          }

          .status-badge-enhanced {
            font-size: 11px;
            padding: 6px 12px;
          }

          .item-details p {
            font-size: 14px;
          }

          .quick-action-btn {
            padding: 14px 16px;
            font-size: 15px;
          }

          .fridge-groups {
            padding: 12px;
          }

          .items-grid {
            gap: 12px;
          }
        }

        /* Ultra-wide screen optimization */
        @media (min-width: 1400px) {
          .items-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
          }

          .item-card {
            padding: 24px;
          }

          .department-title {
            font-size: 20px;
            padding: 20px 24px;
          }

          .fridge-title {
            font-size: 18px;
            padding: 16px 20px;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .item-card {
            background-color: #2d2d2d;
            border-color: #444;
            color: #fff;
          }

          .item-details p {
            color: #ccc;
          }

          .item-details strong {
            color: #fff;
          }

          .department-group {
            border-color: #444;
          }

          .fridge-groups {
            background-color: #1e1e1e;
          }

          .fridge-title {
            background-color: #333;
            color: #fff;
          }

          .discard-info, .finished-info {
            background-color: #333;
          }
        }
      `}</style>

      {/* Unified Item Action Modal */}
      {showActionModal && actionModalItem && (
        <ItemActionModal
          open={showActionModal}
          onClose={closeActionModal}
          onConfirm={handleActionConfirm}
          itemName={actionModalItem.productName}
          itemAmount={actionModalItem.amount}
          itemType={actionModalItem.type}
          loading={isActionLoading}
          error={close.error}
          closedElsewhere={close.alreadyClosed}
        />
      )}

    </div>
  );
};

export default ItemsList; 