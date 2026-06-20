/**
 * Type definitions for Google Maps integration with @vis.gl/react-google-maps
 * These interfaces define the structure of location data and map configuration
 */

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

