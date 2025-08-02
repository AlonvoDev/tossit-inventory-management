import React from 'react';

interface EnhancedLoadingProps {
  message?: string;
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

/**
 * Enhanced loading component with multiple animation types and customization
 * Provides modern loading states for better UX
 */
const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({
  message = 'טוען...',
  type = 'spinner',
  size = 'medium',
  color = '#673AB7'
}) => {
  const sizeStyles = {
    small: { width: '24px', height: '24px', fontSize: '14px' },
    medium: { width: '40px', height: '40px', fontSize: '16px' },
    large: { width: '60px', height: '60px', fontSize: '18px' }
  };

  const renderSpinner = () => (
    <div className="loading-container">
      <div 
        className="spinner"
        style={{
          ...sizeStyles[size],
          borderColor: `${color}20`,
          borderTopColor: color
        }}
      />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  const renderDots = () => (
    <div className="loading-container">
      <div className="dots-container">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="dot"
            style={{
              backgroundColor: color,
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  const renderPulse = () => (
    <div className="loading-container">
      <div className="pulse-container">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="pulse-ring"
            style={{
              borderColor: color,
              animationDelay: `${i * 0.4}s`
            }}
          />
        ))}
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  const renderSkeleton = () => (
    <div className="loading-container">
      <div className="skeleton-container">
        <div className="skeleton-line long" />
        <div className="skeleton-line medium" />
        <div className="skeleton-line short" />
        <div className="skeleton-line medium" />
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  return (
    <>
      {renderContent()}
      <style>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .loading-message {
          margin-top: 16px;
          margin-bottom: 0;
          color: #666;
          font-size: ${sizeStyles[size].fontSize};
          font-weight: 500;
        }

        /* Spinner Animation */
        .spinner {
          border: 3px solid;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Dots Animation */
        .dots-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Pulse Animation */
        .pulse-container {
          position: relative;
          width: 60px;
          height: 60px;
        }

        .pulse-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 3px solid;
          border-radius: 50%;
          animation: pulse 1.2s ease-out infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        /* Skeleton Animation */
        .skeleton-container {
          width: 100%;
          max-width: 300px;
        }

        .skeleton-line {
          height: 16px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          border-radius: 8px;
          margin-bottom: 12px;
          animation: loading-shimmer 1.5s infinite;
        }

        .skeleton-line.long {
          width: 100%;
        }

        .skeleton-line.medium {
          width: 75%;
        }

        .skeleton-line.short {
          width: 50%;
        }

        @keyframes loading-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Size variations */
        .loading-container.small .dot {
          width: 8px;
          height: 8px;
        }

        .loading-container.small .dots-container {
          gap: 6px;
        }

        .loading-container.small .pulse-container {
          width: 40px;
          height: 40px;
        }

        .loading-container.large .dot {
          width: 16px;
          height: 16px;
        }

        .loading-container.large .dots-container {
          gap: 12px;
        }

        .loading-container.large .pulse-container {
          width: 80px;
          height: 80px;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .loading-message {
            color: #ccc;
          }

          .skeleton-line {
            background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
            background-size: 200% 100%;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .spinner,
          .dot,
          .pulse-ring,
          .skeleton-line {
            animation-duration: 2s;
          }
        }
      `}</style>
    </>
  );
};

export default EnhancedLoading;