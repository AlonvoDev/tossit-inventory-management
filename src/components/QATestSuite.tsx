import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getBusinessItems, addItem, markItemAsDiscarded } from '../api/firestoreAPI';
import { getBusinessFridges } from '../api/fridgesAPI';
import { getBusinessProducts } from '../api/productsAPI';
import { forceRunSchedulerChecks } from '../services/discardScheduler';

interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'running' | 'pending';
  message: string;
  duration?: number;
}

/**
 * Comprehensive QA Test Suite for TossIt PWA
 * Tests critical functionality including product flow, notifications, and permissions
 */
const QATestSuite: React.FC = () => {
  const { profile, businessId, isAdmin, isManager, isOffline } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const updateTestResult = (testName: string, status: TestResult['status'], message: string, duration?: number) => {
    setTests(prev => prev.map(test => 
      test.testName === testName 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const initializeTests = () => {
    const testList: TestResult[] = [
      { testName: 'Auth & Profile Loading', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Role Permissions Check', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Fridges API Test', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Products API Test', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Inventory Items Flow', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Product Addition Test', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Discard Flow Test', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Notification System', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Offline Mode Check', status: 'pending', message: 'Waiting to start...' },
      { testName: 'Scheduler System', status: 'pending', message: 'Waiting to start...' }
    ];
    setTests(testList);
  };

  const runTest = async (testName: string, testFunction: () => Promise<void>) => {
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Running test...');
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'pass', 'Test passed successfully', duration);
      showSuccess('Test Passed', `${testName} completed successfully`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateTestResult(testName, 'fail', `Test failed: ${message}`, duration);
      showError('Test Failed', `${testName}: ${message}`);
    }
  };

  // Test Functions
  const testAuthAndProfile = async () => {
    if (!profile) throw new Error('Profile not loaded');
    if (!businessId) throw new Error('Business ID not available');
    if (!profile.uid) throw new Error('User UID missing');
    if (!profile.email) throw new Error('User email missing');
    if (!profile.role) throw new Error('User role not defined');
  };

  const testRolePermissions = async () => {
    const expectedRoles = ['admin', 'manager', 'staff'];
    if (!expectedRoles.includes(profile?.role || '')) {
      throw new Error(`Invalid role: ${profile?.role}`);
    }
    
    // Test admin permissions
    if (profile?.role === 'admin' && !isAdmin) {
      throw new Error('Admin role not recognized by system');
    }
    
    // Test manager permissions
    if (profile?.role === 'manager' && !isManager) {
      throw new Error('Manager role not recognized by system');
    }
  };

  const testFridgesAPI = async () => {
    if (!businessId) throw new Error('Business ID required');
    
    const fridges = await getBusinessFridges(businessId);
    if (!Array.isArray(fridges)) throw new Error('Fridges API returned invalid data');
    
    if (fridges.length === 0) {
      showWarning('Warning', 'No fridges found - consider adding test fridges');
    }
    
    fridges.forEach(fridge => {
      if (!fridge.name) throw new Error('Fridge missing name');
      if (!fridge.department) throw new Error('Fridge missing department');
      if (!['bar', 'kitchen'].includes(fridge.department)) {
        throw new Error(`Invalid fridge department: ${fridge.department}`);
      }
    });
  };

  const testProductsAPI = async () => {
    if (!businessId) throw new Error('Business ID required');
    
    const products = await getBusinessProducts(businessId);
    if (!Array.isArray(products)) throw new Error('Products API returned invalid data');
    
    if (products.length === 0) {
      showWarning('Warning', 'No products found - consider adding test products');
    }
    
    products.forEach(product => {
      if (!product.name) throw new Error('Product missing name');
      if (!product.area) throw new Error('Product missing area');
      if (typeof product.shelfLifeDays !== 'number') throw new Error('Product missing valid shelf life');
    });
  };

  const testInventoryItemsFlow = async () => {
    if (!businessId) throw new Error('Business ID required');
    
    const items = await getBusinessItems(businessId);
    if (!Array.isArray(items)) throw new Error('Items API returned invalid data');
    
    // Test item structure
    items.forEach(item => {
      if (!item.productName) throw new Error('Item missing product name');
      if (!item.area) throw new Error('Item missing area');
      if (!item.expiryTime) throw new Error('Item missing expiry time');
      if (!item.openingTime) throw new Error('Item missing opening time');
      if (typeof item.amount !== 'number') throw new Error('Item missing valid amount');
    });
  };

  const testProductAddition = async () => {
    if (!businessId || !profile?.uid) throw new Error('Missing required data');
    
    // Get test data
    const fridges = await getBusinessFridges(businessId);
    const products = await getBusinessProducts(businessId);
    
    if (fridges.length === 0) throw new Error('No fridges available for testing');
    if (products.length === 0) throw new Error('No products available for testing');
    
    const testFridge = fridges[0];
    const testProduct = products[0];
    
    // Add a test item
    const itemId = await addItem(
      testProduct.id || 'test-product',
      `TEST-${testProduct.name}`,
      1,
      testProduct.area,
      businessId,
      profile.uid,
      testFridge.id
    );
    
    if (!itemId) throw new Error('Failed to create test item');
    
    showInfo('Test Item Added', `Created test item with ID: ${itemId}`);
  };

  const testDiscardFlow = async () => {
    if (!businessId || !profile?.uid) throw new Error('Missing required data');
    
    const items = await getBusinessItems(businessId);
    const testItems = items.filter(item => 
      item.productName.startsWith('TEST-') && 
      !item.discarded && 
      !item.isThrown
    );
    
    if (testItems.length === 0) {
      showWarning('No Test Items', 'No test items found to discard');
      return;
    }
    
    const testItem = testItems[0];
    if (!testItem.id) throw new Error('Test item missing ID');
    
    await markItemAsDiscarded(testItem.id, profile.uid, profile.fullName || 'Test User');
    showInfo('Discard Test', `Successfully discarded test item: ${testItem.productName}`);
  };

  const testNotificationSystem = async () => {
    // Test all notification types
    await new Promise(resolve => {
      showSuccess('Test Success', 'Success notification working');
      setTimeout(resolve, 100);
    });
    
    await new Promise(resolve => {
      showError('Test Error', 'Error notification working');
      setTimeout(resolve, 100);
    });
    
    await new Promise(resolve => {
      showWarning('Test Warning', 'Warning notification working');
      setTimeout(resolve, 100);
    });
    
    await new Promise(resolve => {
      showInfo('Test Info', 'Info notification working');
      setTimeout(resolve, 100);
    });
  };

  const testOfflineMode = async () => {
    if (isOffline) {
      showInfo('Offline Mode', 'Currently in offline mode - some features may be limited');
    } else {
      showInfo('Online Mode', 'Application is online and fully functional');
    }
    
    // Test local storage functionality
    const testKey = 'qa-test-storage';
    const testValue = { timestamp: Date.now(), test: 'QA Suite' };
    
    localStorage.setItem(testKey, JSON.stringify(testValue));
    const retrieved = localStorage.getItem(testKey);
    
    if (!retrieved) throw new Error('Local storage write failed');
    
    const parsed = JSON.parse(retrieved);
    if (parsed.test !== 'QA Suite') throw new Error('Local storage read failed');
    
    localStorage.removeItem(testKey);
  };

  const testSchedulerSystem = async () => {
    if (!businessId) throw new Error('Business ID required');
    
    // Test scheduler force run
    try {
      forceRunSchedulerChecks(businessId);
      showInfo('Scheduler Test', 'Scheduler system is functional');
    } catch (error) {
      throw new Error(`Scheduler test failed: ${error}`);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setCurrentTest('');
    
    const testFunctions = [
      { name: 'Auth & Profile Loading', fn: testAuthAndProfile },
      { name: 'Role Permissions Check', fn: testRolePermissions },
      { name: 'Fridges API Test', fn: testFridgesAPI },
      { name: 'Products API Test', fn: testProductsAPI },
      { name: 'Inventory Items Flow', fn: testInventoryItemsFlow },
      { name: 'Product Addition Test', fn: testProductAddition },
      { name: 'Discard Flow Test', fn: testDiscardFlow },
      { name: 'Notification System', fn: testNotificationSystem },
      { name: 'Offline Mode Check', fn: testOfflineMode },
      { name: 'Scheduler System', fn: testSchedulerSystem }
    ];
    
    for (const test of testFunctions) {
      await runTest(test.name, test.fn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
    setCurrentTest('');
    
    const passedTests = tests.filter(t => t.status === 'pass').length;
    const totalTests = tests.length;
    
    if (passedTests === totalTests) {
      showSuccess('QA Complete', `All ${totalTests} tests passed successfully!`);
    } else {
      showWarning('QA Results', `${passedTests}/${totalTests} tests passed`);
    }
  };

  useEffect(() => {
    initializeTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return '#4CAF50';
      case 'fail': return '#f44336';
      case 'running': return '#FF9800';
      default: return '#757575';
    }
  };

  return (
    <div className="qa-test-suite">
      <div className="qa-header">
        <h2>🧪 QA Test Suite - TossIt PWA</h2>
        <p>Comprehensive testing of critical functionality</p>
        
        <div className="qa-controls">
          <button
            className="qa-run-btn"
            onClick={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? '🔄 Running Tests...' : '▶️ Run All Tests'}
          </button>
          
          <button
            className="qa-reset-btn"
            onClick={initializeTests}
            disabled={isRunning}
          >
            🔄 Reset Tests
          </button>
        </div>
      </div>

      <div className="qa-status">
        {isRunning && currentTest && (
          <div className="qa-current-test">
            <span className="qa-spinner">🔄</span>
            Running: {currentTest}
          </div>
        )}
      </div>

      <div className="qa-results">
        {tests.map((test, index) => (
          <div 
            key={index} 
            className={`qa-test-item ${test.status}`}
            style={{ borderLeftColor: getStatusColor(test.status) }}
          >
            <div className="qa-test-header">
              <span className="qa-test-icon">{getStatusIcon(test.status)}</span>
              <span className="qa-test-name">{test.testName}</span>
              {test.duration && (
                <span className="qa-test-duration">{test.duration}ms</span>
              )}
            </div>
            <div className="qa-test-message">{test.message}</div>
          </div>
        ))}
      </div>

      <style>{`
        .qa-test-suite {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          direction: rtl;
        }

        .qa-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 20px;
        }

        .qa-header h2 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .qa-header p {
          margin: 0 0 20px 0;
          color: #666;
        }

        .qa-controls {
          display: flex;
          gap: 15px;
          justify-content: center;
        }

        .qa-run-btn,
        .qa-reset-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .qa-run-btn {
          background: linear-gradient(135deg, #4CAF50 0%, #45A049 100%);
          color: white;
        }

        .qa-run-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .qa-run-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }

        .qa-reset-btn {
          background: #f5f5f5;
          color: #333;
          border: 1px solid #ddd;
        }

        .qa-reset-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .qa-status {
          margin-bottom: 20px;
          min-height: 30px;
        }

        .qa-current-test {
          background: #FFF3E0;
          color: #F57C00;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .qa-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .qa-results {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .qa-test-item {
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-left: 4px solid;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s ease;
        }

        .qa-test-item:hover {
          background: #f5f5f5;
          transform: translateX(-2px);
        }

        .qa-test-item.running {
          background: #FFF3E0;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .qa-test-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .qa-test-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .qa-test-name {
          font-weight: 600;
          color: #333;
          flex: 1;
        }

        .qa-test-duration {
          font-size: 12px;
          color: #666;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .qa-test-message {
          color: #666;
          font-size: 14px;
          margin-right: 30px;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .qa-test-suite {
            margin: 10px;
            padding: 15px;
          }

          .qa-controls {
            flex-direction: column;
            align-items: center;
          }

          .qa-run-btn,
          .qa-reset-btn {
            width: 100%;
            max-width: 200px;
          }

          .qa-test-header {
            flex-wrap: wrap;
          }

          .qa-test-duration {
            order: 3;
            width: 100%;
            text-align: right;
          }
        }
      `}</style>
    </div>
  );
};

export default QATestSuite;