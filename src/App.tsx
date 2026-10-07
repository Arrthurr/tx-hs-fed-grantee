import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Building2, MapIcon } from 'lucide-react';
import TexasMap from './components/TexasMap';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import { MapDataProvider, useMapData } from './hooks/useMapData';

// No optional Maps libraries are requested: search and point-in-polygon run
// locally. AdvancedMarker loads `marker` on demand. Keep a stable reference
// because APIProvider re-runs its loader effect when `libraries` changes.
const MAPS_LIBRARIES: string[] = [];

/**
 * Inner application body. Must be rendered inside <MapDataProvider> so
 * useMapData() resolves the shared instance instead of creating a second
 * (duplicate) one. The thin <App /> wrapper at the bottom of this file owns
 * the provider.
 */
const AppContent: React.FC = () => {
  // Get Google Maps API key and Map ID from environment variables
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState<{
    message: string;
    details: string;
    canReload: boolean;
  } | null>(null);

  // Get map data and check for data loading errors. Only programsError is
  // treated as a blocking failure here -- a regions-only failure is reported
  // by TexasMap via an inline path and does not gate the API provider.
  const { programsError, regionsError, retryLoading, headStartPrograms } = useMapData();

  const apiKeyError = !apiKey
    ? 'Google Maps is not configured for this site.'
    : apiKey === 'your_google_maps_api_key_here'
      ? 'Google Maps is using a placeholder API key.'
      : apiKey.length < 30
        ? 'The Google Maps API key appears to be invalid.'
        : null;

  /**
   * APIProvider's onLoad runs after its requested libraries have loaded.
   */
  const handleApiLoad = useCallback(() => {
    setApiReady(true);
    setApiError(error => error?.canReload === false ? error : null);
  }, []);

  /**
   * Handle API loading errors
   */
  const handleApiError = useCallback((error: unknown) => {
    console.error('Google Maps API loading error:', error);
    const details = error instanceof Error ? error.message : String(error);
    const knownAuthError = /InvalidKeyMapError|RefererNotAllowedMapError|ApiNotActivatedMapError|ApiTargetBlockedMapError|BillingNotEnabledMapError|ExpiredKeyMapError|OverQuotaMapError|QuotaExceededError/i.test(details);

    setApiReady(false);
    setApiError({
      message: knownAuthError
        ? 'Google Maps is not authorized for this site. Please contact the site administrator.'
        : details.includes('timed out')
          ? 'Google Maps loading timed out. Check your connection, then reload the page.'
          : 'Google Maps could not be loaded. Check your connection, then reload the page.',
      details,
      canReload: !knownAuthError,
    });
  }, []);

  useEffect(() => {
    if (apiKeyError || apiReady || apiError) return;
    const timeout = setTimeout(() => handleApiError(new Error('Google Maps loading timed out.')), 15_000);
    return () => clearTimeout(timeout);
  }, [apiKeyError, apiReady, apiError, handleApiError]);

  useEffect(() => {
    if (apiKeyError) return;
    const mapsWindow = window as Window & { gm_authFailure?: () => void };
    const previous = mapsWindow.gm_authFailure;
    const onAuthFailure = () => handleApiError(new Error('Google Maps authorization failed (InvalidKeyMapError or site restrictions).'));
    mapsWindow.gm_authFailure = onAuthFailure;
    return () => {
      if (mapsWindow.gm_authFailure === onAuthFailure) mapsWindow.gm_authFailure = previous;
    };
  }, [apiKeyError, handleApiError]);

  /**
   * Determine what to display based on error states
   */
  const renderContent = () => {
    if (apiKeyError) {
      return (
        <ErrorDisplay
          error={apiKeyError}
          errorType="api"
          details="Set a valid VITE_GOOGLE_MAPS_API_KEY in the deployment environment."
        />
      );
    }

    return (
      <APIProvider
        apiKey={apiKey}
        libraries={MAPS_LIBRARIES}
        onLoad={handleApiLoad}
        onError={handleApiError}
        language="en"
        region="US"
      >
        {apiError ? (
          <ErrorDisplay
            error={apiError.message}
            details={apiError.details}
            errorType="api"
            onRetry={apiError.canReload ? () => window.location.reload() : undefined}
            retryLabel="Reload Page"
          />
        ) : programsError && headStartPrograms.length === 0 ? (
          <ErrorDisplay
            error={programsError}
            details={regionsError ? `TXHSA Regions: ${regionsError}` : undefined}
            onRetry={retryLoading}
            errorType="data"
          />
        ) : apiReady ? (
            <TexasMap className="w-full" height="calc(100vh - 200px)" mapId={mapId} />
        ) : (
          <LoadingSpinner message="Loading Google Maps API..." size="lg" />
        )}
      </APIProvider>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tx-blue-50 via-white to-tx-orange-50">
        {/* Header Section */}
        <header className="bg-white shadow-sm border-b border-tx-gray-200 lg:sticky top-0 z-50" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Title and Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src="/images/blue-texas.svg" alt="Texas logo" className="h-10" />
                <div>
                  <h1 className="text-2xl font-bold text-tx-gray-900 flex items-center gap-2">
                    Texas Head Start Location Directory
                    {/* <span className="text-sm font-medium bg-tx-orange-100 text-tx-orange-700 px-2 py-1 rounded-full">
                      Public Preview
                    </span> */}
                  </h1>
                  <p className="text-sm text-tx-gray-600 mt-1">
                    Explore listed locations and project-defined TXHSA regions across Texas
                  </p>
                </div>
              </div>
              
              {/* Header stats */}
              <div className="flex items-center space-x-8">
                <div className="hidden lg:flex items-center space-x-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Building2 className="w-5 h-5 text-headstart-primary" aria-hidden="true" />
                      <span className="text-xl font-bold text-tx-gray-900">{headStartPrograms.length}</span>
                    </div>
                    <p className="text-xs text-tx-gray-600">Listed locations</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <MapIcon className="w-5 h-5 text-txhsa-accent" aria-hidden="true" />
                      <span className="text-xl font-bold text-tx-gray-900">4</span>
                    </div>
                    <p className="text-xs text-tx-gray-600">TXHSA Regions</p>
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
                  Listed Head Start Locations
                </h2>
                <p className="text-tx-blue-100 text-sm leading-relaxed">
                  Select a marker or search result to view location details. Use the region buttons for regional information, and Data Layers to show or hide boundaries.
                </p>
                <p className="text-tx-blue-100 text-sm mt-2">
                  Unverified legacy directory: reporting date, program types, grantees and funding are unknown. Counts are listed locations, not statewide program totals.{' '}
                  <a className="underline font-medium" href="/data-provenance.md" target="_blank" rel="noreferrer">Sources and limitations</a>
                </p>
              </div>
            </div>

            {/* Google Maps API Provider and Map */}
            <div className="relative min-h-[calc(100vh-200px)]">
            {renderContent()}
            </div>
                     </div>

          {/* Footer */}
          <footer className="mt-8 text-center" role="contentinfo">
            <div className="text-sm text-tx-gray-500">
              <p>
                Texas Head Start Interactive Map — exploratory directory, not authoritative policy or funding analysis
              </p>
              <p className="mt-1">
                <a className="underline" href="/data-provenance.md" target="_blank" rel="noreferrer">Data provenance, region methodology and refresh requirements</a>
              </p>
            </div>
          </footer>
        </main>
        
      </div>
  );
};

/**
 * Top-level App: owns the MapDataProvider so AppContent and TexasMap share
 * a single useMapData instance (one fetch chain, one retry loop, one error
 * surface for the whole tree).
 */
const App: React.FC = () => (
  <MapDataProvider>
    <AppContent />
  </MapDataProvider>
);

export default App;
