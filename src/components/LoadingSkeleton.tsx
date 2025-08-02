import React from 'react';
import './LoadingSkeleton.css';

interface LoadingSkeletonProps {
  type?: 'dashboard' | 'admin' | 'full-page';
  message?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  type = 'full-page', 
  message = 'Loading user profile...' 
}) => {
  return (
    <div className="loading-skeleton">
      <div className="loading-container">
        {/* Loading spinner */}
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        
        {/* Loading message */}
        <div className="loading-message">
          <h3>{message}</h3>
          <p>Please wait while we verify your permissions...</p>
        </div>
        
        {/* Skeleton content based on type */}
        {type === 'dashboard' && (
          <div className="skeleton-content">
            <div className="skeleton-header">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-subtitle"></div>
            </div>
            <div className="skeleton-nav">
              <div className="skeleton-button"></div>
              <div className="skeleton-button"></div>
              <div className="skeleton-button"></div>
            </div>
            <div className="skeleton-cards">
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
            </div>
          </div>
        )}
        
        {type === 'admin' && (
          <div className="skeleton-content">
            <div className="skeleton-header">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-subtitle"></div>
            </div>
            <div className="skeleton-admin-panels">
              <div className="skeleton-panel"></div>
              <div className="skeleton-panel"></div>
            </div>
            <div className="skeleton-table">
              <div className="skeleton-table-row"></div>
              <div className="skeleton-table-row"></div>
              <div className="skeleton-table-row"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSkeleton; 