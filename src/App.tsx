import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Building2, Users } from 'lucide-react';
import TexasMap from './components/TexasMap';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import { useMapData } from './hooks/useMapData';

/**
 * Main application component for the Texas Head Start Interactive Map
 * Handles Google Maps API loading and provides the main user interface
 */
const App: React.FC = () => {
  // Get Google Maps API key and Map ID from environment variables
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

  // State for tracking API loading status
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [mapsReady, setMapsReady] = useState(false);

  // Get map data and check for data loading errors
  const { hasErrors, programsError, districtsError, congressDataError, retryLoading } = useMapData();

  /**
   * Check if Google Maps API constructors are available and callable
   * This ensures that Map, Marker, and InfoWindow are actual constructor functions
   * before attempting to use them in the TexasMap component
   */
  const checkMapsReady = () => {
    return !!(
      window.google && 
      window.google.maps && 
      typeof window.google.maps.Map === 'function' &&
      typeof window.google.maps.Marker === 'function' &&
      typeof window.google.maps.InfoWindow === 'function' &&
      // Additional check to ensure the constructors are fully initialized
      window.google.maps.Map.prototype &&
      window.google.maps.Marker.prototype &&
      window.google.maps.InfoWindow.prototype
    );
  };

  /**
   * Validate API key configuration on component mount
   */
  useEffect(() => {
    // Debug logging for development (remove in production)
    if (import.meta.env.DEV) {
      console.log('Environment check:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 10) + '...' || 'undefined',
        hasMapId: !!mapId,
        mapId: mapId
      });
    }

    // Validate API key
    if (!apiKey) {
      setApiError('Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env.local file.');
      setIsInitializing(false);
      return;
    }

    if (apiKey === 'your_google_maps_api_key_here') {
      setApiError('Please replace the placeholder API key with your actual Google Maps API key in .env.local');
      setIsInitializing(false);
      return;
    }

    if (apiKey.length < 30) {
      setApiError('The provided API key appears to be invalid. Google Maps API keys are typically longer.');
      setIsInitializing(false);
      return;
    }

    // API key looks valid, proceed with initialization
    setIsInitializing(false);
  }, [apiKey, mapId]);

  /**
   * Handle successful API loading
   * Uses a more robust checking mechanism with retries and timeout
   * Includes an initial delay to allow Google Maps API to fully initialize
   */
  const handleApiLoad = () => {
    console.log('Google Maps API loaded successfully');
    setApiLoaded(true);
    setApiError(null);
    
    // Add initial delay to allow Google Maps API to fully initialize its constructors
    // This prevents race conditions where the script loads but constructors aren't ready
    setTimeout(() => {
      // Check if Maps constructors are ready with retry mechanism
      let retryCount = 0;
      const maxRetries = 50; // Maximum number of retries (5 seconds total)
      const retryDelay = 100; // Delay between retries in milliseconds
      
      const checkReady = () => {
        if (checkMapsReady()) {
          console.log('Google Maps constructors are ready and callable');
          setMapsReady(true);
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Waiting for Google Maps constructors... (attempt ${retryCount}/${maxRetries})`);
          // Retry checking after a short delay
          setTimeout(checkReady, retryDelay);
        } else {
          // If we've exhausted retries, show an error
          console.error('Google Maps constructors failed to initialize after maximum retries');
          setApiError('Google Maps API failed to initialize properly. Please refresh the page and try again.');
          setApiLoaded(false);
          setMapsReady(false);
        }
      };
      
      // Start checking after the initial delay
      checkReady();
    }, 500); // Initial 500ms delay as recommended by the expert analysis
  };

  /**
   * Handle API loading errors
   */
  const handleApiError = (error: unknown) => {
    console.error('Google Maps API loading error:', error);
    
    // Provide more specific error messages based on common issues
    let errorMessage = 'Failed to load Google Maps API. ';
    
    if (error instanceof Error) {
      if (error.message.includes('InvalidKeyMapError')) {
        errorMessage += 'The API key is invalid. Please check your Google Cloud Console.';
      } else if (error.message.includes('RefererNotAllowedMapError')) {
        errorMessage += 'This domain is not authorized. Please add it to your API key restrictions in Google Cloud Console.';
      } else if (error.message.includes('QuotaExceededError')) {
        errorMessage += 'API quota exceeded. Please check your usage limits in Google Cloud Console.';
      } else {
        errorMessage += 'Please check your API key and internet connection.';
      }
    } else {
      errorMessage += 'Please check your API key and internet connection.';
    }
    
    setApiError(errorMessage);
    setApiLoaded(false);
    setMapsReady(false);
  };

  /**
   * Retry loading the API
   */
  const handleRetry = () => {
    setApiError(null);
    setApiLoaded(false);
    setMapsReady(false);
    setIsInitializing(true);
    
    // Small delay to show loading state
    setTimeout(() => {
      setIsInitializing(false);
    }, 500);
  };

  /**
   * Check if we should show the API provider
   */
  const shouldShowApiProvider = !isInitializing && !apiError && apiKey;

  /**
   * Determine what to display based on error states
   */
  const renderContent = () => {
    // Handle initialization
    if (isInitializing) {
      return (
        <LoadingSpinner 
          message="Initializing application..."
          size="lg"
        />
      );
    }
    
    // Handle API key errors
    if (apiError) {
      return (
        <ErrorDisplay 
          error={apiError}
          onRetry={handleRetry}
          errorType="api"
        />
      );
    }
    
    // Handle data loading errors
    if (hasErrors) {
      const errorMessages = [];
      if (programsError) errorMessages.push(`Programs: ${programsError}`);
      if (districtsError) errorMessages.push(`Districts: ${districtsError}`);
      if (congressDataError) errorMessages.push(`Congress Data: ${congressDataError}`);
      
      const errorMessage = errorMessages.length > 0 ? errorMessages.join('\n\n') : 'Failed to load map data';
      
      return (
        <ErrorDisplay 
          error={errorMessage}
          onRetry={retryLoading}
          errorType="data"
        />
      );
    }
    
    // Show API provider when everything is ready
    if (shouldShowApiProvider) {
      return (
        <APIProvider 
          apiKey={apiKey}
          libraries={['places', 'geometry']}
          onLoad={handleApiLoad}
          onError={handleApiError}
          language="en"
          region="US"
        >
          {apiLoaded && mapsReady ? (
            <TexasMap className="w-full" height="calc(100vh - 200px)" mapId={mapId} />
          ) : (
            <LoadingSpinner 
              message={
                apiLoaded 
                  ? "Initializing Google Maps constructors..." 
                  : "Loading Google Maps API..."
              }
              size="lg"
            />
          )}
        </APIProvider>
      );
    }
    
    // Fallback error
    return (
      <ErrorDisplay 
        error="Application initialization failed"
        onRetry={handleRetry}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tx-blue-50 via-white to-tx-orange-50">
        {/* Header Section */}
        <header className="bg-white shadow-sm border-b border-tx-gray-200 sticky top-0 z-50" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Title and Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src="/images/blue-texas.svg" alt="Texas logo" className="h-10" />
                <div>
                  <h1 className="text-2xl font-bold text-tx-gray-900 flex items-center gap-2">
                    Texas Head Start Federal Grantee Programs
                    {/* <span className="text-sm font-medium bg-tx-orange-100 text-tx-orange-700 px-2 py-1 rounded-full">
                      Public Preview
                    </span> */}
                  </h1>
                  <p className="text-sm text-tx-gray-600 mt-1">
                    Explore Head Start and Early Head Start program funding and congressional districts across Texas
                  </p>
                </div>
              </div>
              
              {/* Header stats */}
              <div className="flex items-center space-x-8">
                <div className="hidden lg:flex items-center space-x-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Building2 className="w-5 h-5 text-headstart-primary" aria-hidden="true" />
                      <span className="text-xl font-bold text-tx-gray-900">86</span>
                    </div>
                    <p className="text-xs text-tx-gray-600">Head Start Programs</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-5 h-5 text-district-primary" aria-hidden="true" />
                      <span className="text-xl font-bold text-tx-gray-900">36</span>
                    </div>
                    <p className="text-xs text-tx-gray-600">Congressional Districts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main">
          {/* Map Section */}
          <div className="card-elevated overflow-hidden">
            {/* Map Header */}
            <div className="bg-gradient-to-r from-tx-blue-600 via-tx-blue-700 to-tx-blue-800 p-6 relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10" aria-hidden="true">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
              </div>
              
              <div className="relative z-10">
                <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  Federal Grantee Head Start Programs
                </h2>
                <p className="text-tx-blue-100 text-sm leading-relaxed">
                  Click on program markers to view details. Toggle layers to explore Head Start programs and congressional districts.
                </p>
              </div>
            </div>

            {/* Google Maps API Provider and Map */}
            <div className="relative">
            {renderContent()}
            </div>
                     </div>

          {/* Footer */}
          <footer className="mt-8 text-center" role="contentinfo">
            <div className="text-sm text-tx-gray-500">
              <p>
                Texas Head Start Interactive Map - An internal analysis tool for program directors and policymakers
              </p>
              <p className="mt-1">
                Data sources: Head Start Program Information Report (PIR) • U.S. Census Bureau
              </p>
            </div>
          </footer>
        </main>
        
        {/* Accessibility Checker (only in development mode) */}
        {/* <AccessibilityChecker autoRun={false} /> */}
      </div>
  );
};

export default App;
