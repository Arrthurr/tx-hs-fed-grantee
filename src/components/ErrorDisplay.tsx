import React from 'react';
import { AlertTriangle, RefreshCw, ExternalLink, Settings, Database, MapPin } from 'lucide-react';

/**
 * Error display component for map loading failures
 * Provides user-friendly error messages and retry functionality
 */
interface ErrorDisplayProps {
  /** Error message to display */
  error: string;
  /** Callback function to retry loading */
  onRetry?: () => void;
  /** Type of error (api, data, or general) */
  errorType?: 'api' | 'data' | 'general';
  /** Additional details about the error */
  details?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry,
  errorType = 'general',
  details
}) => {
  /**
   * Determine if this is an API key related error
   */
  const isApiKeyError = errorType === 'api' || 
                       error.toLowerCase().includes('api key') || 
                       error.toLowerCase().includes('invalid') ||
                       error.toLowerCase().includes('not configured');

  /**
   * Determine if this is a domain restriction error
   */
  const isDomainError = errorType === 'api' ||
                       error.toLowerCase().includes('referrer') ||
                       error.toLowerCase().includes('domain') ||
                       error.toLowerCase().includes('authorized');

  /**
   * Determine if this is a data loading error
   */
  const isDataError = errorType === 'data' ||
                     error.toLowerCase().includes('geojson') ||
                     error.toLowerCase().includes('data') ||
                     error.toLowerCase().includes('load');

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-tx-error-50 via-white to-tx-orange-50 flex items-center justify-center z-10" role="alert" aria-live="assertive">
      <div className="card-elevated p-8 max-w-lg mx-4">
        {/* Error icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-tx-error-500 to-tx-error-600 rounded-full mx-auto mb-6 shadow-lg" aria-hidden="true">
          {isDataError ? (
            <Database className="w-8 h-8 text-white" />
          ) : isApiKeyError ? (
            <Settings className="w-8 h-8 text-white" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-white" />
          )}
        </div>
        
        {/* Error title */}
        <h2 className="text-xl font-bold text-tx-gray-900 text-center mb-3">
          {isApiKeyError ? 'Configuration Required' : 
           isDataError ? 'Data Loading Error' : 
           'Map Loading Error'}
        </h2>
        
        {/* Error message */}
        <p className="text-tx-gray-600 text-center mb-3 leading-relaxed">
          {error}
        </p>
        
        {/* Error details (if provided) */}
        {details && (
          <div className="bg-tx-gray-50 p-3 rounded-md mb-6 text-sm text-tx-gray-600 max-h-32 overflow-y-auto">
            <code className="whitespace-pre-wrap">{details}</code>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full btn-primary flex items-center justify-center space-x-2"
              aria-label="Retry loading map"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Retry Loading</span>
            </button>
          )}
          
          {/* Google Cloud Console link for API key errors */}
          {isApiKeyError && (
            <a
              href="https://console.cloud.google.com/google/maps-apis/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn-secondary flex items-center justify-center space-x-2"
              aria-label="Open Google Cloud Console in a new tab"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span>Open Google Cloud Console</span>
            </a>
          )}
          
          {/* Documentation link for data errors */}
          {isDataError && (
            <a
              href="https://developers.google.com/maps/documentation/javascript/datalayer"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn-secondary flex items-center justify-center space-x-2"
              aria-label="View GeoJSON Documentation in a new tab"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span>View GeoJSON Documentation</span>
            </a>
          )}
        </div>
        
        {/* Help text */}
        <div className="mt-6 p-4 bg-tx-gray-50 rounded-lg border border-tx-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            {isDataError ? (
              <MapPin className="w-4 h-4 text-tx-gray-600" aria-hidden="true" />
            ) : (
              <Settings className="w-4 h-4 text-tx-gray-600" aria-hidden="true" />
            )}
            <h3 className="text-sm font-semibold text-tx-gray-800">
              {isApiKeyError ? 'Setup Instructions' : 
               isDataError ? 'Data Troubleshooting' : 
               'Troubleshooting Tips'}
            </h3>
          </div>
          
          {isApiKeyError ? (
            <ol className="text-xs text-tx-gray-600 space-y-2 list-decimal list-inside">
              <li>Create a Google Cloud Platform project</li>
              <li>Enable the Maps JavaScript API</li>
              <li>Create an API key in Credentials</li>
              <li>Copy <code className="bg-tx-gray-100 px-1 rounded text-xs">.env.local.example</code> to <code className="bg-tx-gray-100 px-1 rounded text-xs">.env.local</code></li>
              <li>Add your API key to <code className="bg-tx-gray-100 px-1 rounded text-xs">VITE_GOOGLE_MAPS_API_KEY</code></li>
              <li>Restart the development server</li>
            </ol>
          ) : isDataError ? (
            <ul className="text-xs text-tx-gray-600 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Check that GeoJSON files exist in the correct location</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Verify GeoJSON files have valid format and structure</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Check network connectivity and CORS settings</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Try refreshing the page or clearing browser cache</span>
              </li>
            </ul>
          ) : isDomainError ? (
            <ul className="text-xs text-tx-gray-600 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Add your domain to API key restrictions</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>For development: add <code className="bg-tx-gray-100 px-1 rounded">localhost:5173</code></span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>For production: add your domain</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Check HTTP referrer settings</span>
              </li>
            </ul>
          ) : (
            <ul className="text-xs text-tx-gray-600 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Check your internet connection</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Verify the Google Maps API key is valid</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Ensure the Maps JavaScript API is enabled</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Try refreshing the page</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-tx-error-500 rounded-full mt-1.5 flex-shrink-0" aria-hidden="true"></span>
                <span>Check browser console for detailed errors</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;