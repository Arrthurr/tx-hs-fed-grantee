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
 * Layer visibility state for toggleable map layers
 * Now simplified to two primary data layers: Head Start Programs and District Boundaries
 */
export interface LayerVisibility {
  /** Major Cities layer visibility */
  majorCities: boolean;
  /** District Boundaries layer visibility */
  districtBoundaries: boolean;
  /** Counties layer visibility */
  counties: boolean;
  /** Head Start Programs layer visibility */
  headStartPrograms: boolean;
}

/**
 * GeoJSON feature properties for congressional districts
 */
export interface CongressionalDistrictProperties {
  /** District number */
  district: string;
  /** Full district name */
  name: string;
  /** Representative's name */
  representative: string;
  /** District number as integer */
  districtNumber: number;
  /** State abbreviation */
  state: string;
}

/**
 * GeoJSON feature for congressional districts
 */
export interface CongressionalDistrictFeature {
  /** Feature type */
  type: 'Feature';
  /** Feature properties */
  properties: CongressionalDistrictProperties;
  /** Feature geometry */
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

/**
 * GeoJSON feature collection for congressional districts
 */
export interface CongressionalDistrictFeatureCollection {
  /** Collection type */
  type: 'FeatureCollection';
  /** Array of features */
  features: CongressionalDistrictFeature[];
}

/**
 * GeoJSON feature properties for Texas counties
 */
export interface CountyProperties {
  /** County name */
  name: string;
  /** County seat */
  countySeat?: string;
  /** Population (optional) */
  population?: number;
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
 * Processed congressional district data for map display
 */
export interface CongressionalDistrict {
  /** District number */
  number: number;
  /** Representative's name */
  representative: string;
  /** Representative's party affiliation */
  party?: string;
  /** Representative's photo URL */
  photoUrl?: string;
  /** District population (placeholder) */
  population: number;
  /** Geographic center of the district */
  center: google.maps.LatLngLiteral;
  /** Head Start programs in this district (placeholder) */
  headStartPrograms?: HeadStartProgram[];
  /** Representative's contact information */
  contact?: {
    /** Office phone number */
    phone?: string;
    /** Email address */
    email?: string;
    /** Website URL */
    website?: string;
    /** Office address */
    office?: string;
  };
  /** Committee assignments */
  committees?: string[];
  /** Original GeoJSON feature for this district */
  geoJsonFeature?: CongressionalDistrictFeature;
}

/**
 * Congress.gov API response for member data
 */
export interface CongressApiMember {
  /** Member ID */
  id: string;
  /** Member's full name */
  name: string;
  /** Member's party affiliation */
  party: string;
  /** Member's party name */
  partyName?: string;
  /** Member's state */
  state?: string;
  /** Member's district number */
  district: string;
  /** Member's URL on Congress.gov */
  url?: string;
  /** Member's photo URL */
  depiction?: {
    /** URL to member's photo */
    imageUrl?: string;
  };
  /** Member's terms in office */
  terms?: Array<{
    /** State code */
    state?: string;
    /** State code alternative */
    stateCode?: string;
    /** Current term information */
    current?: {
      /** Committees the member serves on */
      committees?: {
        /** Committee name */
        name: string;
        /** Committee code */
        systemCode: string;
        /** Whether the member is chair */
        isChair?: boolean;
      }[];
    };
  }>;
  /** Member's contact information */
  contactInformation?: {
    /** Office phone number */
    phoneNumber?: string;
    /** Email address */
    email?: string;
    /** Website URL */
    websiteUrl?: string;
    /** Office address */
    officeAddress?: string;
  };
}

/**
 * Congress.gov API response structure
 */
export interface CongressApiResponse {
  /** API response status */
  status?: string;
  /** API response copyright */
  copyright?: string;
  /** API response results */
  results?: CongressApiMember[];
  /** API response members array */
  members?: CongressApiMember[];
  /** API response pagination */
  pagination?: {
    /** Count of results */
    count: number;
    /** Next page URL */
    next?: string;
  };
}