import React, { useState, useEffect, useCallback } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Item, getBusinessItems, markItemAsDiscarded, getDiscardedItems, markItemAsFinished, getFinishedItems } from '../api/firestoreAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { Fridge } from '../types/Fridge';
import { formatExpiryTime, getExpiryStatus } from '../utils/expiryUtils';
import { ItemActionModal } from './ui/ItemActionModal';

interface ItemsListProps {
  areaFilter?: 'bar' | 'kitchen' | 'בר' | 'מטבח';
  showExpiredOnly?: boolean;
  showDiscardedOnly?: boolean; // New prop
  showExpiringsSoon?: boolean; // Items expiring within 3 days
  showActiveOnly?: boolean; // Active items only
  showFinishedOnly?: boolean; // Items that were used up completely
  refreshTrigger: number;
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
  refreshTrigger,
  isOffline = false,
  onItemUpdated
}) => {
  const { businessId, profile, isManager, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for unified item action modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionModalItem, setActionModalItem] = useState<Item | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);


  // Fridges for filtering and name lookup
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [fridgeMap, setFridgeMap] = useState<{ [id: string]: string }>({});
  const [fridgeFilter, setFridgeFilter] = useState<string>('all');

  // Get user's department for filtering (managers can see all departments)
  const userDepartment = profile?.department;
  const canSeeAllDepartments = isManager || profile?.role === 'admin';

  // Load items
  const loadItems = useCallback(async () => {
    if (!businessId) return;
    
    console.log('loadItems called with:', {
      businessId,
      areaFilter,
      showDiscardedOnly,
      showExpiredOnly,
      userDepartment,
      canSeeAllDepartments
    });
    
    setIsLoading(true);
    setError(null);
    
    try {
      let fetchedItems: Item[];
      
      // Load different data based on view mode
      if (showFinishedOnly) {
        fetchedItems = await getFinishedItems(businessId);
        console.log('Loaded finished items:', fetchedItems.length);
      } else if (showDiscardedOnly) {
        fetchedItems = await getDiscardedItems(businessId);
        console.log('Loaded discarded items:', fetchedItems.length);
      } else {
        fetchedItems = await getBusinessItems(businessId);
        console.log('Loaded business items:', fetchedItems.length);
        
        // Filter by area first - handle both English and Hebrew values
        let filteredByArea = areaFilter 
          ? fetchedItems.filter(item => {
              const normalizedArea = areaFilter === 'bar' ? 'בר' : 
                                   areaFilter === 'kitchen' ? 'מטבח' : 
                                   areaFilter;
              return item.area === normalizedArea;
            })
          : fetchedItems;
        console.log('After area filter:', filteredByArea.length);

        // Then filter by user's department if no area filter is provided AND user is not manager/admin
        if (!areaFilter && userDepartment && !canSeeAllDepartments) {
          filteredByArea = filteredByArea.filter(item => item.area === userDepartment);
          console.log('After department filter:', filteredByArea.length);
        }
        
        // Apply different filters based on props
        const now = Timestamp.now();
        const threeDaysFromNow = new Timestamp(now.seconds + (3 * 24 * 60 * 60), now.nanoseconds);
        
        if (showActiveOnly) {
          // Show only active items (not discarded, not thrown, not expired, not finished)
          filteredByArea = filteredByArea.filter(item => 
            !item.discarded && 
            !item.isThrown && 
            !item.finished &&
            item.expiryTime.toMillis() > now.toMillis()
          );
          console.log('After active-only filter:', filteredByArea.length);
        } else if (showExpiringsSoon) {
          // Show items expiring within 3 days (but not expired yet)
          filteredByArea = filteredByArea.filter(item => 
            !item.discarded && 
            !item.isThrown && 
            !item.finished &&
            item.expiryTime.toMillis() > now.toMillis() &&
            item.expiryTime.toMillis() <= threeDaysFromNow.toMillis()
          );
          console.log('After expiring-soon filter:', filteredByArea.length);
        } else if (showExpiredOnly) {
          // Show expired items only (includes discarded expired items)
          filteredByArea = filteredByArea.filter(item => 
            item.expiryTime.toMillis() < now.toMillis()
          );
          console.log('After expired filter:', filteredByArea.length);
        } else if (!showDiscardedOnly && !showFinishedOnly) {
          // Normal view - filter out discarded and finished items
          const beforeDiscardFilter = filteredByArea.length;
          filteredByArea = filteredByArea.filter(item => !item.discarded && !item.isThrown && !item.finished);
          console.log('After discard/finished filter:', filteredByArea.length, 'removed:', beforeDiscardFilter - filteredByArea.length);
        }
        // If showDiscardedOnly or showFinishedOnly is true, don't filter anything - show all relevant items
        
        fetchedItems = filteredByArea;
      }
      
      console.log('Final items to display:', fetchedItems.length);
      console.log('Final items list:', fetchedItems.map(item => ({ id: item.id, name: item.productName, area: item.area })));
      setItems(fetchedItems);
      setFilteredItems(fetchedItems);
    } catch (error) {
      console.error('Error loading items:', error);
      setError('Failed to load items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [businessId, areaFilter, showFinishedOnly, showDiscardedOnly, userDepartment, canSeeAllDepartments, showActiveOnly, showExpiringsSoon, showExpiredOnly]);

  // Open unified action modal
  const openActionModal = (item: Item) => {
    setActionModalItem(item);
    setShowActionModal(true);
  };

  // Handle action confirmation from modal
  const handleActionConfirm = async (action: 'finished' | 'discarded', quantity?: number, reason?: string) => {
    if (!actionModalItem || !profile || !actionModalItem.id) return;

    setIsActionLoading(true);
    
    try {
      if (action === 'finished') {
        await handleMarkAsFinished(actionModalItem);
      } else {
        // Convert reason string to proper type
        const discardReason = reason === 'פג תוקף' ? 'expired' : 
                             reason === 'נפגם' ? 'damaged' : 'other';
        await handleMarkAsDiscarded(actionModalItem, quantity, discardReason);
      }
      
      // Close modal
      setShowActionModal(false);
      setActionModalItem(null);
    } catch (error) {
      console.error('Error processing action:', error);
      // Error is already handled in the individual functions
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle marking item as discarded
  const handleMarkAsDiscarded = async (item: Item, quantity?: number, reason?: 'expired' | 'damaged' | 'other') => {
    if (!profile || !item.id) return;
    
    try {
      console.log('Marking item as discarded:', item.id, 'with quantity:', quantity, 'reason:', reason);
      await markItemAsDiscarded(
        item.id, 
        profile.uid, 
        profile.fullName || profile.email?.split('@')[0] || 'Unknown User',
        quantity,
        reason
      );
      
      console.log('Item marked as discarded successfully');
      
      // Refresh the items list
      await loadItems();
      
      // Notify parent component to refresh all tabs
      if (onItemUpdated) {
        console.log('Calling onItemUpdated callback to refresh all tabs');
        onItemUpdated();
      }
    } catch (error) {
      console.error('Error marking item as discarded:', error);
      setError('Failed to mark item as discarded. Please try again.');
    }
  };

  // Handle marking item as finished
  const handleMarkAsFinished = async (item: Item) => {
    if (!profile || !item.id) return;
    
    try {
      console.log('Marking item as finished:', item.id);
      await markItemAsFinished(
        item.id, 
        profile.uid, 
        profile.fullName || profile.email?.split('@')[0] || 'Unknown User'
      );
      
      console.log('Item marked as finished successfully');
      
      // Refresh the items list
      await loadItems();
      
      // Notify parent component to refresh all tabs
      if (onItemUpdated) {
        console.log('Calling onItemUpdated callback to refresh all tabs');
        onItemUpdated();
      }
    } catch (error) {
      console.error('Error marking item as finished:', error);
      setError('Failed to mark item as finished. Please try again.');
    }
  };



  // Only load items if user profile is loaded
  useEffect(() => {
    console.log('ItemsList useEffect triggered with refreshTrigger:', refreshTrigger);
    console.log('useEffect dependencies:', { businessId, areaFilter, userDepartment, loading, profile: !!profile, canSeeAllDepartments, showDiscardedOnly, showExpiredOnly });
    if (!loading && profile) {
      console.log('Calling loadItems from useEffect');
      loadItems();
    } else {
      console.log('Skipping loadItems - loading:', loading, 'profile:', !!profile);
    }
  }, [businessId, areaFilter, userDepartment, refreshTrigger, loading, profile, canSeeAllDepartments, showDiscardedOnly, showExpiredOnly, showExpiringsSoon, showActiveOnly, showFinishedOnly, loadItems]);

  // Load fridges for the business. This is used for filtering and displaying fridge names
  useEffect(() => {
    const fetchFridges = async () => {
      if (!businessId) return;
      try {
        const data = await getBusinessFridges(businessId);
        setFridges(data);
        const map: { [id: string]: string } = {};
        data.forEach((f) => {
          if (f.id) map[f.id] = f.name;
        });
        setFridgeMap(map);
      } catch (err) {
        console.error('Error fetching fridges:', err);
      }
    };
    fetchFridges();
  }, [businessId]);

  // Load cached items when going offline
  useEffect(() => {
    if (isOffline) {
      const cachedKey = userDepartment ? `cachedItems_${userDepartment}` : 'cachedItems_all';
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        try {
          const parsedItems = JSON.parse(cached);
          // setCachedItems(parsedItems); // Commented out as cachedItems state was removed
          setItems(parsedItems);
          setError('מציג נתונים מהמטמון המקומי במצב לא מקוון');
        } catch (e) {
          console.error('Error parsing cached items:', e);
        }
      } else {
        setError('אין נתונים זמינים במצב לא מקוון');
      }
    }
  }, [isOffline, areaFilter, userDepartment]);

  // Apply filters
  useEffect(() => {
    if (items.length === 0) {
      setFilteredItems([]);
      return;
    }

    let filtered = [...items];

    // Apply expired only filter
    if (showExpiredOnly) {
      const now = Timestamp.now();
      filtered = filtered.filter(
        (item) => !item.isThrown && item.expiryTime.toMillis() < now.toMillis()
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.productName.toLowerCase().includes(query)
      );
    }

    // Apply fridge filter
    if (fridgeFilter && fridgeFilter !== 'all') {
      filtered = filtered.filter((item) => item.fridgeId === fridgeFilter);
    }

    // Sort by expiry date (soonest first)
    filtered.sort((a, b) => a.expiryTime.toMillis() - b.expiryTime.toMillis());

    setFilteredItems(filtered);
  }, [items, showExpiredOnly, searchQuery, fridgeFilter]);



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
                  : `לא נמצאו פריטים נזרקים במחלקת ${userDepartment === 'bar' ? 'הבר' : 'המטבח'}`
                : showExpiredOnly 
                  ? canSeeAllDepartments 
                    ? 'לא נמצאו פריטים שפג תוקפם' 
                    : `לא נמצאו פריטים שפג תוקפם במחלקת ${userDepartment === 'bar' ? 'הבר' : 'המטבח'}`
                  : canSeeAllDepartments
                    ? 'אין פריטים במלאי'
                    : userDepartment
                      ? `אין פריטים במלאי של מחלקת ${userDepartment === 'bar' ? 'הבר' : 'המטבח'}`
                      : 'אין פריטים במלאי'
            }
          </p>
          {!canSeeAllDepartments && userDepartment && !showDiscardedOnly && (
            <p className="filter-info">
              מציג פריטים עבור מחלקת {userDepartment === 'bar' ? 'הבר' : 'המטבח'} בלבד
            </p>
          )}
          {canSeeAllDepartments && !showDiscardedOnly && (
            <p className="filter-info">
              מציג פריטים מכל המחלקות
            </p>
          )}
          {showDiscardedOnly && (
            <p className="filter-info">
              מציג פריטים נזרקים {canSeeAllDepartments ? 'מכל המחלקות' : `ממחלקת ${userDepartment === 'bar' ? 'הבר' : 'המטבח'}`}
            </p>
          )}
          {isOffline && <p className="offline-note">במצב לא מקוון, ייתכן שהנתונים אינם מעודכנים</p>}
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
                                    disabled={isOffline}
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
        
        /* Enhanced mobile responsiveness */
        @media (max-width: 768px) {
          .department-title {
            font-size: 16px;
            padding: 12px 15px;
          }

          .fridge-title {
            font-size: 14px;
            padding: 8px 12px;
          }

          .items-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .item-card {
            padding: 15px;
          }

          .item-header h3 {
            font-size: 16px;
          }

          .fridge-groups {
            padding: 10px;
          }
        }

        @media (max-width: 599px) {
          .search-container {
            margin-top: 15px;
            width: 100%;
          }
          
          .item-header h3 {
            font-size: 1rem;
          }

          .department-group {
            margin-bottom: 20px;
          }

          .status-badge-enhanced {
            font-size: 10px;
            padding: 4px 8px;
          }
        }
      `}</style>

      {/* Unified Item Action Modal */}
      {showActionModal && actionModalItem && (
        <ItemActionModal
          open={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setActionModalItem(null);
          }}
          onConfirm={handleActionConfirm}
          itemName={actionModalItem.productName}
          itemAmount={actionModalItem.amount}
          itemType={actionModalItem.type}
          loading={isActionLoading}
        />
      )}


    </div>
  );
};

export default ItemsList; 