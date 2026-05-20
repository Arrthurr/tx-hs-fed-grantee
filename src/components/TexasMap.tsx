import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, InfoWindow, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Users, DollarSign, Building2, MapIcon } from 'lucide-react';
import { useMapData } from '../hooks/useMapData';
import type { HeadStartProgram, TxhsaRegion, TxhsaRegionName } from '../types/maps';
import { formatCurrency } from '../utils/mapHelpers';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import MapControls from './MapControls';

/**
 * Props interface for the TexasMap component
 */
interface TexasMapProps {
  className?: string;
  height?: string;
  mapId?: string;
}

/**
 * Interface for marker click event data
 */
interface MarkerClickData {
  program?: HeadStartProgram;
  region?: TxhsaRegion;
  position: google.maps.LatLngLiteral;
  type: 'program' | 'region';
}

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
    isLoading,
    programsError,
    regionsError,
    retryLoading,
    txhsaRegions,
    regionProgramCounts,
    layerVisibility,
    toggleLayer,
  } = useMapData();

  // Get map instance using the useMap hook
  const map = useMap();

  // State for selected marker and info window
  const [selectedMarker, setSelectedMarker] = useState<MarkerClickData | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);

  // TXHSA region polygon overlays. Held in a ref because they are imperative
  // Google Maps resources (Data layers) -- not render state. Storing them in
  // useState caused a teardown/rebuild churn loop via the renderRegionOverlays
  // useCallback dep chain.
  const regionOverlaysRef = useRef<google.maps.Data[]>([]);

  // State for map loading
  const [mapLoaded, setMapLoaded] = useState(false);

  // Reference to the map container for drag boundary calculations
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  /**
   * Handle marker click events
   * Opens info window with program or region details
   */
  const handleMarkerClick = useCallback((data: MarkerClickData) => {
    console.log('Marker clicked:', data);
    setSelectedMarker(data);
    setInfoWindowOpen(true);
  }, []);

  /**
   * Handle info window close
   */
  const handleInfoWindowClose = useCallback(() => {
    setInfoWindowOpen(false);
    setSelectedMarker(null);
  }, []);



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
      dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
        if (event.latLng) {
          handleMarkerClick({
            region,
            position: { lat: event.latLng.lat(), lng: event.latLng.lng() },
            type: 'region',
          });
        }
      });
      newOverlays.push(dataLayer);
    }

    regionOverlaysRef.current = newOverlays;
  }, [map, layerVisibility.txhsaRegions, txhsaRegions, handleMarkerClick, teardownRegionOverlays]);

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
   * Render program info window content
   */
  const renderProgramInfoWindow = (program: HeadStartProgram) => (
    <div className="max-w-sm p-4 bg-white rounded-lg shadow-lg">
      {/* Program Header */}
      <div className="border-b border-gray-200 pb-3 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
              {program.name}
            </h3>
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">
                {program.address}
              </span>
            </div>
          </div>
          <div className="ml-2 flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Building2 className="w-3 h-3 mr-1" aria-hidden="true" />
              Program
            </span>
          </div>
        </div>
      </div>

      {/* Program Details */}
      <div className="space-y-3">
        {/* Program Type */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-800 flex items-center">
              <Users className="w-3 h-3 mr-1" aria-hidden="true" />
              Program Type
            </span>
            <span className="text-sm font-bold text-blue-900 capitalize">
              {program.type.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Grantee Information */}
        {program.grantee && (
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-800 flex items-center">
                <Building2 className="w-3 h-3 mr-1" aria-hidden="true" />
                Grantee Organization
              </span>
            </div>
            <div className="text-sm font-medium text-purple-900">
              {program.grantee}
            </div>
          </div>
        )}

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
   * Render TXHSA region info window content (region name + program count only).
   * Per R11, no representative / party / contact / committee fields appear here.
   */
  const renderRegionInfoWindow = (region: TxhsaRegion) => {
    const count = regionProgramCounts?.[region.name];
    const countCopy = count == null
      ? 'Loading program count…'
      : count === 1
        ? '1 Head Start / Early Head Start program in this region.'
        : `${count} Head Start / Early Head Start programs in this region.`;

    return (
      <div className="max-w-sm p-4 bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200 pb-3 mb-3 flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {region.name}
          </h3>
          <span className="ml-2 flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <MapIcon className="w-3 h-3 mr-1" aria-hidden="true" />
            Region
          </span>
        </div>
        <p className="text-sm text-gray-700">{countCopy}</p>
      </div>
    );
  };

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <LoadingSpinner message="Loading map data..." size="lg" />
      </div>
    );
  }

  // Show error state only when the programs fetch failed -- without programs
  // there is nothing meaningful to render. A regions-only failure is reported
  // upstream (App's header / ErrorDisplay) but does not block the map.
  if (programsError) {
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
    txhsaRegions: layerVisibility.txhsaRegions
  };


  return (
    <div ref={mapContainerRef} className={`relative ${className}`} style={{ height }}>
      {/* Map Controls */}
      <MapControls
        layerVisibility={mapControlsLayerVisibility}
        onToggleLayer={handleMapControlsToggle}
        programCount={headStartPrograms?.length || 0}
        mapContainerRef={mapContainerRef}
      />

      {/* Google Map */}
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
            onClick={() => handleMarkerClick({
              program,
              position: { lat: program.lat, lng: program.lng },
              type: 'program'
            })}
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

        {/* Info Window */}
        {infoWindowOpen && selectedMarker && (
          <InfoWindow
            position={selectedMarker.position}
            onCloseClick={handleInfoWindowClose}
            pixelOffset={[0, -10]}
            disableAutoPan={false}
            maxWidth={400}
          >
            {selectedMarker.type === 'program' && selectedMarker.program
              ? renderProgramInfoWindow(selectedMarker.program)
              : selectedMarker.type === 'region' && selectedMarker.region
              ? renderRegionInfoWindow(selectedMarker.region)
              : <div className="p-2">No data available</div>
            }
          </InfoWindow>
        )}
      </Map>
    </div>
  );
};

export default TexasMap;
