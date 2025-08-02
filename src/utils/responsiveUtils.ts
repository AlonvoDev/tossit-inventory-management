// ===== RESPONSIVE DESIGN UTILITIES =====

// Viewport height fix for mobile browsers
export const setViewportHeight = (): void => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Device detection utilities
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  
  if (width < 600) return 'mobile';
  if (width < 900) return 'tablet';
  return 'desktop';
};

export const isMobile = (): boolean => getDeviceType() === 'mobile';
export const isTablet = (): boolean => getDeviceType() === 'tablet';
export const isDesktop = (): boolean => getDeviceType() === 'desktop';

// Touch device detection
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Orientation detection
export const getOrientation = (): 'portrait' | 'landscape' => {
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
};

// Responsive breakpoint utilities
export const breakpoints = {
  mobile: 599,
  tablet: 899,
  desktop: 1199,
};

export const isBreakpoint = (breakpoint: keyof typeof breakpoints): boolean => {
  const width = window.innerWidth;
  
  switch (breakpoint) {
    case 'mobile':
      return width <= breakpoints.mobile;
    case 'tablet':
      return width > breakpoints.mobile && width <= breakpoints.tablet;
    case 'desktop':
      return width > breakpoints.tablet;
    default:
      return false;
  }
};

// Enhanced media query helpers
export const createMediaQuery = (query: string): MediaQueryList => {
  return window.matchMedia(query);
};

export const onBreakpointChange = (
  breakpoint: keyof typeof breakpoints,
  callback: (matches: boolean) => void
): (() => void) => {
  let query: string;
  
  switch (breakpoint) {
    case 'mobile':
      query = `(max-width: ${breakpoints.mobile}px)`;
      break;
    case 'tablet':
      query = `(min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.tablet}px)`;
      break;
    case 'desktop':
      query = `(min-width: ${breakpoints.tablet + 1}px)`;
      break;
    default:
      throw new Error(`Unknown breakpoint: ${breakpoint}`);
  }
  
  const mediaQuery = createMediaQuery(query);
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  
  mediaQuery.addEventListener('change', handler);
  callback(mediaQuery.matches); // Initial call
  
  // Return cleanup function
  return () => mediaQuery.removeEventListener('change', handler);
};

// Adaptive grid column calculator
export const calculateGridColumns = (
  containerWidth: number,
  itemMinWidth: number,
  gap: number = 16
): number => {
  const availableWidth = containerWidth - gap;
  const itemWithGap = itemMinWidth + gap;
  const columns = Math.floor(availableWidth / itemWithGap);
  return Math.max(1, columns);
};

// Responsive font size calculator
export const getResponsiveFontSize = (
  baseSize: number,
  scaleFactor: number = 0.8
): string => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'mobile':
      return `${baseSize * scaleFactor}rem`;
    case 'tablet':
      return `${baseSize * 0.9}rem`;
    case 'desktop':
    default:
      return `${baseSize}rem`;
  }
};

// Safe area handling for devices with notches
export const applySafeArea = (element: HTMLElement): void => {
  element.style.paddingTop = 'env(safe-area-inset-top)';
  element.style.paddingRight = 'env(safe-area-inset-right)';
  element.style.paddingBottom = 'env(safe-area-inset-bottom)';
  element.style.paddingLeft = 'env(safe-area-inset-left)';
};

// Responsive image loading
export const getResponsiveImageSrc = (
  baseSrc: string,
  sizes: { mobile?: string; tablet?: string; desktop?: string }
): string => {
  const deviceType = getDeviceType();
  return sizes[deviceType] || baseSrc;
};

// Initialize responsive utilities
export const initResponsiveUtils = (): (() => void) => {
  // Set initial viewport height
  setViewportHeight();
  
  // Update viewport height on resize and orientation change
  const handleResize = () => {
    setViewportHeight();
  };
  
  const handleOrientationChange = () => {
    // Delay to ensure proper viewport calculation
    setTimeout(setViewportHeight, 100);
  };
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleOrientationChange);
  
  // Add device class to body
  document.body.classList.add(`device-${getDeviceType()}`);
  
  if (isTouchDevice()) {
    document.body.classList.add('touch-device');
  }
  
  // Update device class on resize
  const updateDeviceClass = () => {
    document.body.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
    document.body.classList.add(`device-${getDeviceType()}`);
  };
  
  window.addEventListener('resize', updateDeviceClass);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('resize', updateDeviceClass);
  };
};

// Utility function to be used in React components
export const getResponsiveInfo = () => ({
  deviceType: getDeviceType(),
  isMobile: isMobile(),
  isTablet: isTablet(),
  isDesktop: isDesktop(),
  isTouch: isTouchDevice(),
  breakpoints,
}); 