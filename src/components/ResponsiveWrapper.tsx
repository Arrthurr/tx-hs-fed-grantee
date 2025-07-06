import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, Monitor, Maximize2 } from 'lucide-react';

/**
 * Props for the ResponsiveWrapper component
 */
interface ResponsiveWrapperProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Whether to show the device selector */
  showDeviceSelector?: boolean;
}

/**
 * Device sizes for responsive testing
 */
type DeviceSize = 'mobile' | 'tablet' | 'desktop' | 'full';

/**
 * Device configurations
 */
const deviceConfigs = {
  mobile: {
    width: 375,
    height: 667,
    label: 'Mobile',
    icon: Smartphone
  },
  tablet: {
    width: 768,
    height: 1024,
    label: 'Tablet',
    icon: Tablet
  },
  desktop: {
    width: 1280,
    height: 800,
    label: 'Desktop',
    icon: Monitor
  },
  full: {
    width: '100%',
    height: '100%',
    label: 'Full Width',
    icon: Maximize2
  }
};

/**
 * Responsive wrapper component for testing different screen sizes
 * This component is only used in development mode
 */
const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  showDeviceSelector = import.meta.env.DEV // Only show in development mode
}) => {
  // State for selected device size
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('full');
  
  // State for actual window size
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });
  
  // Update window size on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Don't show device selector in production or if disabled
  if (!showDeviceSelector) {
    return <>{children}</>;
  }
  
  // Get current device config
  const currentDevice = deviceConfigs[deviceSize];
  
  // Calculate container style
  const containerStyle: React.CSSProperties = {
    width: deviceSize === 'full' ? '100%' : currentDevice.width,
    height: deviceSize === 'full' ? 'auto' : currentDevice.height,
    margin: deviceSize === 'full' ? 0 : '20px auto',
    border: deviceSize === 'full' ? 'none' : '1px solid #e5e7eb',
    borderRadius: deviceSize === 'full' ? 0 : '8px',
    overflow: 'hidden',
    boxShadow: deviceSize === 'full' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };
  
  return (
    <div className="responsive-wrapper">
      {/* Device selector */}
      <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-tx-gray-200 p-2" role="region" aria-label="Device size selector">
        <div className="flex items-center space-x-2" role="group" aria-label="Select device size">
          {(Object.keys(deviceConfigs) as DeviceSize[]).map((size) => {
            const device = deviceConfigs[size];
            const Icon = device.icon;
            
            return (
              <button
                key={size}
                onClick={() => setDeviceSize(size)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  deviceSize === size 
                    ? 'bg-tx-blue-100 text-tx-blue-600' 
                    : 'hover:bg-tx-gray-100 text-tx-gray-600'
                }`}
                title={`${device.label} (${size === 'full' ? 'Full Width' : `${device.width}x${device.height}`})`}
                aria-label={`Switch to ${device.label} view`}
                aria-pressed={deviceSize === size}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        
        {/* Current size indicator */}
        <div className="text-xs text-tx-gray-500 text-center mt-1" aria-live="polite">
          {deviceSize === 'full' 
            ? `${windowSize.width}x${windowSize.height}` 
            : `${currentDevice.width}x${currentDevice.height}`}
        </div>
      </div>
      
      {/* Content container */}
      <div style={containerStyle}>
        {children}
      </div>
    </div>
  );
};

export default ResponsiveWrapper;