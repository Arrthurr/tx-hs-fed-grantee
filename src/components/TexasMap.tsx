import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Users, DollarSign, Building2, MapIcon, X } from 'lucide-react';
import { useMapData } from '../hooks/useMapData';
import { useSearch } from '../hooks/useSearch';
import type { HeadStartProgram, TxhsaRegion, TxhsaRegionName } from '../types/maps';
import { formatCurrency } from '../utils/mapHelpers';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import MapControls from './MapControls';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';

/**
 * Props interface for the TexasMap component
 */
interface TexasMapProps {
  className?: string;
  height?: string;
  mapId?: string;
}

type Selection =
  | { program: HeadStartProgram; region?: never }
  | { region: TxhsaRegion; program?: never };

/**
 * Resolved hex colors for region fill / stroke. Mirrors the CSS variables in
 * src/styles/design-system.css (--txhsa-{west,north,east,south}). google.maps.Data
 * does not resolve CSS custom properties at runtime, so we pass literals here
 * and keep the tokens for Tailwind/CSS consumers.
 */
const REGION_FILL_COLORS: Record<TxhsaRegionName, string> = {
  West: '#d97706',   // amber-600
  North: '#1d4ed8',  // blue-700
  East: '#7c3aed',   // violet-600
  South: '#dc2626',  // red-600
};

const regionFillColor = (name: TxhsaRegionName): string => REGION_FILL_COLORS[name];

/**
 * Main TexasMap component that renders an interactive Google Map
 * displaying Head Start programs and TXHSA region overlays across Texas
 */
const TexasMap: React.FC<TexasMapProps> = ({ 
  className = "", 
  height = "600px",
  mapId
}) => {
  // Get map data from custom hook. We deliberately ignore `hasErrors` (the
  // OR of programs + regions errors) here -- regions default OFF and the
  // overlay is non-essential, so a regions-only failure should not blank
  // the entire map. Only programsError blocks the map gate below.
  const {
    headStartPrograms,
    isLoadingPrograms,
    isLoadingRegions,
    programsError,
    regionsError,
    retryLoading,
    loadTxhsaRegions,
    txhsaRegions,
    regionProgramCounts,
    layerVisibility,
    toggleLayer,
  } = useMapData();

  const {
    searchTerm,
    searchResults,
    handleSearchChange,
    clearSearch,
  } = useSearch(headStartPrograms);

  // Get map instance using the useMap hook
  const map = useMap();

  // Details live outside the map so they never cover map controls or overlays.
  const [selection, setSelection] = useState<Selection | null>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const directoryRef = useRef<HTMLDivElement>(null);
  const selectionTriggerRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(false);

  // TXHSA region polygon overlays. Held in a ref because they are imperative
  // Google Maps resources (Data layers) -- not render state. Storing them in
  // useState caused a teardown/rebuild churn loop via the renderRegionOverlays
  // useCallback dep chain.
  const regionOverlaysRef = useRef<google.maps.Data[]>([]);

  // State for map loading
  const [mapLoaded, setMapLoaded] = useState(false);

  /**
   * Default map center coordinates (Texas geographic center)
   * Latitude: 31.0545, Longitude: -97.5635
   */
  const defaultCenter = { lat: 31.0545, lng: -101.0635 };
  
  /**
   * Default zoom level for Texas state view
   */
  const defaultZoom = 6;

  /**
   * Handle map load event
   * Sets up the map reference for direct API access
   */
  // Remove the handleMapLoad function since we're using useMap hook

  const handleSelectDetails = useCallback((data: Selection, trigger?: HTMLElement) => {
    const active = trigger ?? document.activeElement;
    selectionTriggerRef.current = active instanceof HTMLElement && !detailsRef.current?.contains(active) ? active : null;
    setSelection(data);
  }, []);

  const handleCloseDetails = useCallback(() => {
    restoreFocusRef.current = true;
    setSelection(null);
  }, []);

  useEffect(() => {
    if (selection) {
      const focusDetails = () => {
        detailsHeadingRef.current?.focus({ preventScroll: true });
        detailsRef.current?.scrollIntoView({ block: 'start' });
      };
      // Google's fullscreen control encloses only the map, not the directory.
      if (document.fullscreenElement) {
        void document.exitFullscreen().then(focusDetails, focusDetails);
      } else {
        focusDetails();
      }
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      const trigger = selectionTriggerRef.current;
      if (trigger?.isConnected && trigger !== document.body) {
        trigger.focus();
      } else {
        directoryRef.current?.querySelector<HTMLInputElement>('input')?.focus();
      }
    }
  }, [selection]);

  const handleDirectorySearch = useCallback((value: string) => {
    setSelection(null);
    handleSearchChange(value);
  }, [handleSearchChange]);

  const handleDirectoryClear = useCallback(() => {
    setSelection(null);
    clearSearch();
  }, [clearSearch]);

  const handleSelectSearchResult = useCallback((program: HeadStartProgram, trigger: HTMLButtonElement) => {
    handleSelectDetails({ program }, trigger);
    if (map) {
      map.panTo({ lat: program.lat, lng: program.lng });
      map.setZoom(12);
    }
  }, [handleSelectDetails, map]);



  /**
   * Tear down any existing region overlays. Detaches them from the map and
   * clears their Maps event listeners to prevent listener accumulation across
   * toggles.
   */
  const teardownRegionOverlays = useCallback(() => {
    for (const overlay of regionOverlaysRef.current) {
      overlay.setMap(null);
      google.maps.event.clearInstanceListeners(overlay);
    }
    regionOverlaysRef.current = [];
  }, []);

  /**
   * Render the four TXHSA region polygons onto the map. Consumes the
   * already-loaded regions array (no per-overlay fetch needed) and uses
   * the design-system region colors.
   */
  const renderRegionOverlays = useCallback(() => {
    teardownRegionOverlays();

    if (!map || !layerVisibility.txhsaRegions || txhsaRegions.length === 0) {
      return;
    }

    const newOverlays: google.maps.Data[] = [];
    for (const region of txhsaRegions) {
      const dataLayer = new google.maps.Data({ map });
      dataLayer.addGeoJson({
        type: 'FeatureCollection',
        features: [region.feature],
      });
      const color = regionFillColor(region.name);
      dataLayer.setStyle({
        fillColor: color,
        fillOpacity: 0.25,
        strokeColor: color,
        strokeWeight: 2,
        strokeOpacity: 0.9,
      });
      dataLayer.addListener('click', () => handleSelectDetails({ region }));
      newOverlays.push(dataLayer);
    }

    regionOverlaysRef.current = newOverlays;
  }, [map, layerVisibility.txhsaRegions, txhsaRegions, handleSelectDetails, teardownRegionOverlays]);

  /**
   * Mark the map as ready once the map instance and either programs or
   * regions are available. Regions can be empty if the layer is off; we
   * don't want to gate the map on overlay data.
   */
  useEffect(() => {
    if (map && !mapLoaded) {
      setMapLoaded(true);
    }
  }, [map, mapLoaded]);

  /**
   * Effect to render/unmount TXHSA region overlays when visibility or data changes.
   */
  useEffect(() => {
    if (mapLoaded) {
      renderRegionOverlays();
    }
  }, [mapLoaded, layerVisibility.txhsaRegions, txhsaRegions, renderRegionOverlays]);

  useEffect(() => {
    if (selection?.region && !txhsaRegions.includes(selection.region)) {
      handleCloseDetails();
    }
  }, [selection, txhsaRegions, handleCloseDetails]);

  /**
   * Cleanup effect to remove overlays when component unmounts
   */
  useEffect(() => {
    return () => {
      teardownRegionOverlays();
    };
  }, [teardownRegionOverlays]);

  /**
   * Translate MapControls' UI-layer names ("programs" / "txhsaRegions") back
   * to the LayerVisibility keys useMapData owns. Memoized per CLAUDE.md
   * ("Prefer useCallback for event handlers passed to child components").
   * Declared above the loading / error early returns so the Rules of Hooks
   * see this useCallback on every render.
   */
  const handleMapControlsToggle = useCallback((layer: 'programs' | 'txhsaRegions') => {
    switch (layer) {
      case 'programs':
        toggleLayer('headStartPrograms');
        break;
      case 'txhsaRegions':
        toggleLayer('txhsaRegions');
        break;
    }
  }, [toggleLayer]);

  /**
   * Render selected location details.
   */
  const renderProgramDetails = (program: HeadStartProgram) => (
    <div className="p-4 bg-white rounded-lg break-words">
      {/* Program Header */}
      <div className="border-b border-gray-200 pb-3 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 ref={detailsHeadingRef} id="selected-details-title" tabIndex={-1} className="font-semibold text-gray-900 text-base leading-snug mb-2 scroll-mt-40 focus:outline focus:outline-2 focus:outline-tx-blue-600">
              {program.name}
            </h3>
            <div className="flex items-start text-sm text-gray-600 mb-2">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />
              <span>
                {program.address}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Program Details */}
      <div className="space-y-3">
        {/* Program Type */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-blue-800 flex items-center">
              <Users className="w-3 h-3 mr-1" aria-hidden="true" />
              Program Type
            </span>
            <span className="text-sm font-bold text-blue-900 capitalize">
              {program.type === 'unknown' ? 'Not verified' : program.type === 'both' ? 'Head Start + Early Head Start' : program.type.replace(/-/g, ' ')}
            </span>
          </div>
        </div>

        {/* Grantee Information */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-800 flex items-center">
              <Building2 className="w-3 h-3 mr-1" aria-hidden="true" />
              Grantee Organization
            </span>
          </div>
          <div className="text-sm font-medium text-purple-900">
            {program.grantee ?? 'Not verified'}
          </div>
        </div>

        {/* Funding Information */}
        {program.funding && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-800 flex items-center">
                <DollarSign className="w-3 h-3 mr-1" aria-hidden="true" />
                Funding
              </span>
              <span className="text-sm font-bold text-green-900">
                {formatCurrency(program.funding)}
              </span>
            </div>
          </div>
        )}

        {/* Location Information */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-600 mb-2">Legacy location record. Location reporting date and geocoding source are not verified.</p>
          {program.source && (
            <p className="text-xs text-gray-600 mb-2 break-words">
              Classification/grantee source: {program.source.reference}. As of: {program.source.asOf ?? 'Unknown'}.
            </p>
          )}
          <a className="text-xs text-blue-700 underline" href="/data-provenance.md" target="_blank" rel="noreferrer">Data provenance and limitations</a>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Location</h4>
          <div className="text-xs text-gray-600">
            <div>Latitude: {program.lat.toFixed(4)}</div>
            <div>Longitude: {program.lng.toFixed(4)}</div>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render selected region details and data limitations.
   * Per R11, no representative / party / contact / committee fields appear here.
   */
  const renderRegionDetails = (region: TxhsaRegion) => {
    const count = regionProgramCounts?.[region.name];
    const countCopy = count == null
      ? 'Location count unavailable until data integrity checks pass.'
      : count === 1
        ? '1 listed location in this region.'
        : `${count} listed locations in this region.`;

    return (
      <div className="p-4 bg-white rounded-lg break-words">
        <div className="border-b border-gray-200 pb-3 mb-3 flex items-start justify-between">
          <h3 ref={detailsHeadingRef} id="selected-details-title" tabIndex={-1} className="font-semibold text-gray-900 text-base leading-snug scroll-mt-40 focus:outline focus:outline-2 focus:outline-tx-blue-600">
            {region.name}
          </h3>
          <span className="ml-2 flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <MapIcon className="w-3 h-3 mr-1" aria-hidden="true" />
            Region
          </span>
        </div>
        <p className="text-sm text-gray-700">{countCopy}</p>
        <p className="text-sm text-gray-700 mt-1">Funding not verified: source, units and reporting period unavailable.</p>
        <a className="text-xs text-blue-700 underline" href="/data-provenance.md" target="_blank" rel="noreferrer">Region methodology and data limitations</a>
      </div>
    );
  };

  // Show loading state while data is being fetched
  if (isLoadingPrograms && headStartPrograms.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <LoadingSpinner message="Loading map data..." size="lg" />
      </div>
    );
  }

  // Show error state only when the programs fetch failed -- without programs
  // there is nothing meaningful to render. A regions-only failure is reported
  // upstream (App's header / ErrorDisplay) but does not block the map.
  if (programsError && headStartPrograms.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <ErrorDisplay
          error={programsError}
          details={regionsError ? `Regions Error: ${regionsError}` : undefined}
          onRetry={retryLoading}
          errorType="data"
        />
      </div>
    );
  }

  // Map the layer visibility from useMapData to the format expected by MapControls
  const mapControlsLayerVisibility = {
    programs: layerVisibility.headStartPrograms,
    txhsaRegions: layerVisibility.txhsaRegions && !isLoadingRegions && !regionsError && txhsaRegions.length > 0
  };


  return (
    <div className={`grid lg:grid-cols-[20rem_minmax(0,1fr)] ${className}`}>
      <div ref={directoryRef} className="min-w-0 p-4 space-y-3 bg-tx-gray-50 border-b lg:border-b-0 lg:border-r border-tx-gray-200">
        {programsError && (
          <div role="alert" className="card-elevated p-4">
            <p>{programsError} Showing previously loaded locations.</p>
            <button type="button" className="btn-primary mt-2" onClick={retryLoading}>Retry program locations</button>
          </div>
        )}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={handleDirectorySearch}
          onClear={handleDirectoryClear}
          resultCount={searchResults.totalResults}
          isSearchActive={searchResults.isSearchActive}
        />
        <MapControls
          layerVisibility={mapControlsLayerVisibility}
          onToggleLayer={handleMapControlsToggle}
          programCount={headStartPrograms.length}
          regionsLoading={isLoadingRegions}
          regionsError={regionsError}
          regionsAvailable={txhsaRegions.length > 0}
          onRetryRegions={loadTxhsaRegions}
        />
        {!isLoadingRegions && !regionsError && txhsaRegions.length > 0 && (
          <div role="group" aria-label="Region information">
            <p className="text-xs font-medium text-tx-gray-600 mb-1">View region details (boundaries optional)</p>
            <div className="grid grid-cols-4 gap-1">
              {txhsaRegions.map(region => (
                <button
                  key={region.name}
                  type="button"
                  aria-label={`View ${region.name} region`}
                  aria-current={selection?.region === region ? true : undefined}
                  onClick={event => handleSelectDetails({ region }, event.currentTarget)}
                  className="min-h-[44px] rounded-lg border border-tx-gray-200 bg-white text-sm font-medium text-tx-gray-800 hover:bg-tx-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tx-blue-600"
                  style={{ borderBottomColor: `var(--txhsa-${region.name.toLowerCase()})`, borderBottomWidth: 3 }}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div hidden={!!selection}>
          <SearchResults
            programs={searchResults.programs}
            isSearchActive={searchResults.isSearchActive}
            onSelectProgram={handleSelectSearchResult}
          />
        </div>
        {selection && (
          <section
            ref={detailsRef}
            role="region"
            aria-labelledby="selected-details-title"
            className="border border-tx-gray-200 bg-white rounded-lg scroll-mt-4 lg:scroll-mt-32"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                handleCloseDetails();
              }
            }}
          >
            <div className="flex items-center justify-between border-b border-tx-gray-200 px-2">
              {searchResults.isSearchActive ? (
                <button type="button" onClick={handleCloseDetails} className="min-h-[44px] px-2 text-sm font-medium text-tx-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tx-blue-600">Back to results</button>
              ) : <span className="px-2 text-sm font-medium text-tx-gray-600">Selected details</span>}
              <button type="button" onClick={handleCloseDetails} aria-label="Close details" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-tx-gray-700 hover:bg-tx-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tx-blue-600">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {selection.program ? renderProgramDetails(selection.program) : renderRegionDetails(selection.region)}
          </section>
        )}
      </div>

      {/* Google Map */}
      <div className="relative min-w-0 self-start" style={{ height }}>
      <Map
        mapId={mapId}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={true}
        zoomControl={true}
        className="w-full h-full"
      >
        {/* Head Start Program Markers */}
        {layerVisibility.headStartPrograms && headStartPrograms && headStartPrograms.map((program) => (
          <AdvancedMarker
            key={`program-${program.id}`}
            position={{ lat: program.lat, lng: program.lng }}
            onClick={() => handleSelectDetails({ program })}
            title={program.name}
          >
            <div 
              className="marker-headstart"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'var(--headstart-primary)',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              <div 
                style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                +
              </div>
            </div>
          </AdvancedMarker>
        ))}

      </Map>
      </div>
    </div>
  );
};

export default TexasMap;
