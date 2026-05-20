/**
 * Type definitions for Google Maps integration with @vis.gl/react-google-maps
 * These interfaces define the structure of location data and map configuration
 */

/**
 * Represents a geographic location with coordinates and metadata
 */
export interface Location {
  /** Unique identifier for the location */
  id: string;
  /** Display name of the location */
  name: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** Type of location (city, landmark, etc.) */
  type: 'city' | 'landmark' | 'county-seat';
  /** Population of the city (if applicable) */
  population?: number;
  /** Additional description or information */
  description?: string;
}

/**
 * Configuration options for the Texas map
 * Used with @vis.gl/react-google-maps Map component
 */
export interface MapConfig {
  /** Center coordinates of the map */
  center: google.maps.LatLngLiteral;
  /** Initial zoom level */
  zoom: number;
  /** Map type (roadmap, satellite, hybrid, terrain) */
  mapTypeId: google.maps.MapTypeId;
  /** Whether to show map type controls */
  mapTypeControl: boolean;
  /** Whether to show zoom controls */
  zoomControl: boolean;
  /** Whether to show scale control */
  scaleControl: boolean;
  /** Whether to show street view control */
  streetViewControl: boolean;
  /** Whether to show fullscreen control */
  fullscreenControl: boolean;
}

/**
 * Props for map marker components using @vis.gl/react-google-maps
 */
export interface MarkerProps {
  /** The location data for the marker */
  location: Location;
  /** Optional callback when marker is clicked */
  onClick?: (location: Location) => void;
}

/**
 * State interface for map loading and error handling
 */
export interface MapState {
  /** Whether the map is currently loading */
  isLoading: boolean;
  /** Any error that occurred during map loading */
  error: string | null;
  /** Whether the Google Maps API has been loaded */
  apiLoaded: boolean;
}

/**
 * Layer visibility state for toggleable map layers.
 */
export interface LayerVisibility {
  /** Major Cities layer visibility */
  majorCities: boolean;
  /** Counties layer visibility */
  counties: boolean;
  /** Head Start Programs layer visibility */
  headStartPrograms: boolean;
  /** TXHSA Regions layer visibility */
  txhsaRegions: boolean;
}

/**
 * Head Start program location data
 */
export interface HeadStartProgram {
  /** Unique identifier */
  id: string;
  /** Program name */
  name: string;
  /** Street address */
  address: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** Program type */
  type: 'head-start' | 'early-head-start';
  /** Grantee organization */
  grantee?: string;
  /** Funding amount (optional) */
  funding?: number;
}

/**
 * TXHSA region name (the four merged regions shown on the overlay).
 */
export type TxhsaRegionName = 'West' | 'North' | 'East' | 'South';

/**
 * Discriminated polygon geometry (GeoJSON Polygon or MultiPolygon).
 * Used by region features and the shared point-in-polygon helpers.
 */
export type PolygonGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

/**
 * GeoJSON feature shape for a single TXHSA region.
 */
export interface TxhsaRegionFeature {
  type: 'Feature';
  properties: { name: TxhsaRegionName };
  geometry: PolygonGeometry;
}

/**
 * Processed TXHSA region used by the map layer.
 */
export interface TxhsaRegion {
  /** Region name (matches the source `properties.name`) */
  name: TxhsaRegionName;
  /** Original GeoJSON feature */
  feature: TxhsaRegionFeature;
  /** Geographic centroid used for label / fitBounds positioning */
  center: google.maps.LatLngLiteral;
}

