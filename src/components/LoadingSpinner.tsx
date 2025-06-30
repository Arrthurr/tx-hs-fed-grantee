import React from 'react';
import { Loader2, MapPin } from 'lucide-react';

/**
 * Loading spinner component with Texas-themed styling
 * Provides visual feedback while the map is loading
 */
interface LoadingSpinnerProps {
  /** Loading message to display */
  message?: string;
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading Texas Map...", 
  size = 'md' 
}) => {
  // Size configurations for the spinner
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-tx-blue-50 via-white to-tx-orange-50 flex items-center justify-center z-10" role="status" aria-live="polite">
      <div className="card-elevated p-8 flex flex-col items-center space-y-6 max-w-md mx-4">
        {/* Texas-themed icon */}
        <div className="p-4 bg-gradient-to-br from-tx-blue-600 to-tx-blue-700 rounded-full shadow-lg" aria-hidden="true">
          <MapPin className="w-8 h-8 text-white" />
        </div>
        
        {/* Animated spinner */}
        <Loader2 
          className={`${sizeClasses[size]} text-headstart-primary animate-spin`}
          aria-hidden="true"
        />
        
        {/* Loading message */}
        <div className="text-center space-y-2">
          <p className={`${textSizeClasses[size]} text-tx-gray-900 font-semibold`}>
            {message}
          </p>
          <p className="text-sm text-tx-gray-600">
            Preparing your interactive map experience
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="w-48 h-2 bg-tx-gray-200 rounded-full overflow-hidden" aria-hidden="true">
          <div className="h-full bg-gradient-to-r from-headstart-primary to-district-primary rounded-full animate-pulse" />
        </div>
        
        {/* Additional context */}
        <p className="text-xs text-tx-gray-500 text-center max-w-xs">
          Loading Head Start programs and congressional districts across Texas
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;