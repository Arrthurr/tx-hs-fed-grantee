import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, InfoWindow, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Users, DollarSign, Calendar, Building2, Phone, Mail, Globe, MapIcon, Layers, Eye, EyeOff, User, Briefcase } from 'lucide-react';
import { useMapData } from '../hooks/useMapData';
import { HeadStartProgram, CongressionalDistrict } from '../types/maps';
import { formatCurrency, formatNumber } from '../utils/mapHelpers';
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
  district?: CongressionalDistrict;
  position: google.maps.LatLngLiteral;
  type: 'program' | 'district';
}

/**
 * Interface for map layer visibility state
 */
interface LayerVisibility {
  majorCities: boolean;
  congressionalDistricts: boolean;
  counties: boolean;
  headStartPrograms: boolean;
}

/**
 * Generate a consistent color for congressional districts based on district number
 * Uses a predefined color palette to ensure visual distinction between districts
 */
const getDistrictColor = (districtNumber: number): string => {
  // Generate a color based on district number for visual distinction
  const colors = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#f43f5e', '#a855f7', '#0ea5e9', '#22c55e',
    '#eab308', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16',
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#f43f5e', '#a855f7', '#0ea5e9', '#22c55e',
    '#eab308', '#f97316'
  ];
  return colors[(districtNumber - 1) % colors.length];
};

/**
 * Get party color for representative
 */
const getPartyColor = (party?: string): string => {
  if (!party) return '#6b7280'; // Default gray
  
  switch (party.toLowerCase()) {
    case 'republican':
    case 'r':
      return '#ef4444'; // Red
    case 'democrat':
    case 'd':
      return '#3b82f6'; // Blue
    case 'independent':
    case 'i':
      return '#10b981'; // Green
    default:
      return '#6b7280'; // Gray
  }
};

/**
 * Main TexasMap component that renders an interactive Google Map
 * displaying Head Start programs and congressional districts across Texas
 */
const TexasMap: React.FC<TexasMapProps> = ({ 
  className = "", 
  height = "600px",
  mapId
}) => {
  // Get map data from custom hook
  const { programs, districts, isLoading, hasErrors, programsError, districtsError, retryLoading, rawDistrictFeatures, layerVisibility, toggleLayer } = useMapData();
  
  // Get map instance using the useMap hook
  const map = useMap();
  
  // State for selected marker and info window
  const [selectedMarker, setSelectedMarker] = useState<MarkerClickData | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  
  // State for district boundary overlays
  const [districtOverlays, setDistrictOverlays] = useState<google.maps.Data[]>([]);
  
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

  /**
   * Handle marker click events
   * Opens info window with program or district details
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
   * Load district boundary GeoJSON data
   * This function fetches and displays the district boundaries when the layer is enabled
   */
  const loadDistrictBoundaries = useCallback(async () => {
    console.log('loadDistrictBoundaries called:', {
      mapExists: !!map,
      districtBoundariesVisible: layerVisibility.districtBoundaries,
      districtsLength: districts?.length
    });
    
    // Skip if map is not loaded or boundaries are not visible
    if (!map || !layerVisibility.districtBoundaries) {
      console.log('Skipping district boundaries load:', {
        mapExists: !!map,
        districtBoundariesVisible: layerVisibility.districtBoundaries
      });
      // Clear existing overlays if boundaries are being hidden
      districtOverlays.forEach(overlay => {
        overlay.setMap(null);
      });
      setDistrictOverlays([]);
      return;
    }

    try {
      console.log('Loading district boundaries (District Boundaries toggle)...', districts.length);
      const newOverlays: google.maps.Data[] = [];

      // Load GeoJSON for each district
      for (const district of districts) {
        try {
          // Construct the URL for the district's GeoJSON file
          const response = await fetch(`/assets/geojson/TX-${district.number}/shape.geojson`);
          
          if (!response.ok) {
            console.warn(`Failed to load boundary for district ${district.number}: ${response.status} ${response.statusText}`);
            continue;
          }

          const geoJsonData = await response.json();
          
          // Create a new Data layer for this district
          console.log(`Creating data layer for district ${district.number}`);
          const dataLayer = new google.maps.Data({
            map: map
          });

          // Add the GeoJSON data to the layer
          console.log(`Adding GeoJSON data for district ${district.number}:`, geoJsonData);
          dataLayer.addGeoJson(geoJsonData);

          // Style the district boundary with a unique color based on district number
          const districtColor = getDistrictColor(district.number);
          dataLayer.setStyle({
            fillColor: districtColor,
            fillOpacity: 0.25, // Increased from 0.1 for better visibility
            strokeColor: districtColor,
            strokeWeight: 2,
            strokeOpacity: 0.9 // Increased from 0.8 for better visibility
          });

          // Add click handler for district boundaries
          dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
            if (event.latLng) {
              handleMarkerClick({
                district,
                position: { lat: event.latLng.lat(), lng: event.latLng.lng() },
                type: 'district'
              });
            }
          });

          newOverlays.push(dataLayer);
        } catch (error) {
          console.error(`Error loading boundary for district ${district.number}:`, error);
        }
      }

      // Clear old overlays before setting new ones
      districtOverlays.forEach(overlay => {
        overlay.setMap(null);
      });

      setDistrictOverlays(newOverlays);
      console.log(`Loaded ${newOverlays.length} district boundaries`);
    } catch (error) {
      console.error('Error loading district boundaries:', error);
    }
  }, [map, layerVisibility.districtBoundaries, districts, handleMarkerClick]);

  /**
   * Effect to detect when map is ready (when districts are loaded)
   */
  useEffect(() => {
    if (districts && districts.length > 0 && !mapLoaded) {
      console.log('Map is ready - districts loaded');
      setMapLoaded(true);
    }
  }, [districts]);

  /**
   * Effect to load/unload district boundaries when visibility changes
   */
  useEffect(() => {
    console.log('District boundaries effect triggered:', { 
      mapLoaded, 
      districtsLength: districts?.length, 
      districtBoundariesVisible: layerVisibility.districtBoundaries,
      congressionalDistrictsVisible: layerVisibility.congressionalDistricts 
    });
    if (mapLoaded && districts && districts.length > 0) {
      console.log('District boundaries visibility changed:', layerVisibility.districtBoundaries);
      loadDistrictBoundaries();
    }
  }, [mapLoaded, layerVisibility.districtBoundaries, districts]);

  /**
   * Cleanup effect to remove overlays when component unmounts
   */
  useEffect(() => {
    return () => {
      districtOverlays.forEach(overlay => {
        overlay.setMap(null);
      });
    };
  }, [districtOverlays]);

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
   * Render district info window content
   */
  const renderDistrictInfoWindow = (district: CongressionalDistrict) => (
    <div className="max-w-sm p-4 bg-white rounded-lg shadow-lg">
      {/* District Header */}
      <div className="border-b border-gray-200 pb-3 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
              Texas Congressional District {district.number}
            </h3>
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <User className="w-3 h-3 mr-1 flex-shrink-0" aria-hidden="true" />
              <span>Representative: {district.representative}</span>
            </div>
            {district.party && (
              <div className="flex items-center">
                <span 
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    district.party.toLowerCase() === 'republican' 
                      ? 'bg-red-100 text-red-800' 
                      : district.party.toLowerCase() === 'democrat'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {district.party}
                </span>
              </div>
            )}
          </div>
          <div className="ml-2 flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <MapIcon className="w-3 h-3 mr-1" aria-hidden="true" />
              District
            </span>
          </div>
        </div>
      </div>

      {/* District Details */}
      <div className="space-y-3">
        {/* Representative Photo */}
        {district.photoUrl && (
          <div className="flex justify-center mb-3">
            <img 
              src={district.photoUrl} 
              alt={`Representative ${district.representative}`} 
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
          </div>
        )}

        {/* Population Information */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-800 flex items-center">
              <Users className="w-3 h-3 mr-1" aria-hidden="true" />
              Population
            </span>
            <span className="text-sm font-bold text-purple-900">
              {formatNumber(district.population)}
            </span>
          </div>
          <div className="text-xs text-purple-700">
            Approximate district population
          </div>
        </div>

        {/* Committee Assignments */}
        {district.committees && district.committees.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <span className="text-xs font-medium text-blue-800 flex items-center">
                <Briefcase className="w-3 h-3 mr-1" aria-hidden="true" />
                Committee Assignments
              </span>
            </div>
            <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
              {district.committees.slice(0, 3).map((committee, index) => (
                <li key={index}>{committee}</li>
              ))}
              {district.committees.length > 3 && (
                <li className="text-blue-600 font-medium">
                  +{district.committees.length - 3} more committees
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Contact Information */}
        {district.contact && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <span className="text-xs font-medium text-gray-800 flex items-center">
                <Phone className="w-3 h-3 mr-1" aria-hidden="true" />
                Contact Information
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {district.contact.phone && (
                <div className="flex items-center text-gray-700">
                  <Phone className="w-3 h-3 mr-2 text-gray-500" />
                  <span>{district.contact.phone}</span>
                </div>
              )}
              {district.contact.email && (
                <div className="flex items-center text-gray-700">
                  <Mail className="w-3 h-3 mr-2 text-gray-500" />
                  <a href={`mailto:${district.contact.email}`} className="text-blue-600 hover:underline">
                    {district.contact.email}
                  </a>
                </div>
              )}
              {district.contact.website && (
                <div className="flex items-center text-gray-700">
                  <Globe className="w-3 h-3 mr-2 text-gray-500" />
                  <a href={district.contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Official Website
                  </a>
                </div>
              )}
              {district.contact.office && (
                <div className="flex items-center text-gray-700">
                  <Building2 className="w-3 h-3 mr-2 text-gray-500" />
                  <span>{district.contact.office}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Head Start Programs in District */}
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-orange-800 flex items-center">
              <Building2 className="w-3 h-3 mr-1" aria-hidden="true" />
              Head Start Programs
            </span>
            <span className="text-sm font-bold text-orange-900">
              {district.headStartPrograms?.length || 0}
            </span>
          </div>
          {district.headStartPrograms && district.headStartPrograms.length > 0 && (
            <div className="text-xs text-orange-700">
              Programs serving this district
            </div>
          )}
        </div>

        {/* Geographic Information */}
        <div className="border-t border-gray-100 pt-3">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Geographic Center</h4>
          <div className="text-xs text-gray-600">
            <div>Latitude: {district.center.lat.toFixed(4)}</div>
            <div>Longitude: {district.center.lng.toFixed(4)}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <LoadingSpinner message="Loading map data..." size="lg" />
      </div>
    );
  }

  // Show error state if data loading failed
  if (hasErrors) {
    const errorMessage = programsError || districtsError || 'Failed to load map data';
    const errorDetails = programsError && districtsError 
      ? `Programs Error: ${programsError}\n\nDistricts Error: ${districtsError}`
      : undefined;
    
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <ErrorDisplay 
          error={errorMessage}
          details={errorDetails}
          onRetry={retryLoading}
          errorType="data"
        />
      </div>
    );
  }

  // Map the layer visibility from useMapData to the format expected by MapControls
  const mapControlsLayerVisibility = {
    programs: layerVisibility.headStartPrograms,
    districts: layerVisibility.congressionalDistricts,
    districtBoundaries: layerVisibility.districtBoundaries // Use separate district boundaries layer
  };

  // Map the toggle function to handle the conversion
  const handleMapControlsToggle = (layer: 'programs' | 'districts' | 'districtBoundaries') => {
    switch (layer) {
      case 'programs':
        toggleLayer('headStartPrograms');
        break;
      case 'districts':
        toggleLayer('congressionalDistricts');
        break;
      case 'districtBoundaries':
        toggleLayer('districtBoundaries'); // Use separate district boundaries layer
        break;
    }
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Map Controls */}
      <MapControls
        layerVisibility={mapControlsLayerVisibility}
        onToggleLayer={handleMapControlsToggle}
        programCount={programs?.length || 0}
        districtCount={districts?.length || 0}
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
        {layerVisibility.headStartPrograms && programs && programs.map((program) => (
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
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#059669',
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

        {/* Congressional District Center Markers - Controlled by Congressional Districts toggle */}
        {layerVisibility.congressionalDistricts && districts && districts.map((district) => (
          <AdvancedMarker
            key={`district-${district.number}`}
            position={district.center}
            onClick={() => handleMarkerClick({
              district,
              position: district.center,
              type: 'district'
            })}
            title={`Congressional District ${district.number} - ${district.representative}`}
          >
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: getPartyColor(district.party) || getDistrictColor(district.number),
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
                {district.number}
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {/* Info Window */}
        {infoWindowOpen && selectedMarker && (
          <InfoWindow
            position={selectedMarker.position}
            onCloseClick={handleInfoWindowClose}
            options={{
              pixelOffset: new google.maps.Size(0, -10),
              disableAutoPan: false,
              maxWidth: 400
            }}
          >
            {selectedMarker.type === 'program' && selectedMarker.program
              ? renderProgramInfoWindow(selectedMarker.program)
              : selectedMarker.type === 'district' && selectedMarker.district
              ? renderDistrictInfoWindow(selectedMarker.district)
              : <div className="p-2">No data available</div>
            }
          </InfoWindow>
        )}
      </Map>
    </div>
  );
};

export default TexasMap;