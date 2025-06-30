import { 
  CongressionalDistrictFeature, 
  CongressionalDistrictProperties, 
  CongressionalDistrictFeatureCollection 
} from '../types/maps';

/**
 * Raw congressional district data structure from GeoJSON
 */
export interface RawCongressionalDistrict {
  type: 'Feature';
  properties: {
    district: string;
    name: string;
    representative: string;
    districtNumber: number;
    state: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

/**
 * Process and validate congressional district data
 * @param rawData - Raw district data from GeoJSON
 * @returns Processed CongressionalDistrictFeature array
 */
export const processCongressionalDistricts = (rawData: RawCongressionalDistrict[]): CongressionalDistrictFeature[] => {
  return rawData
    .map(district => ({
      type: 'Feature' as const,
      properties: {
        district: district.properties.district,
        name: district.properties.name,
        representative: district.properties.representative,
        districtNumber: district.properties.districtNumber,
        state: district.properties.state
      },
      geometry: district.geometry
    }))
    .filter(validateCongressionalDistrict);
};

/**
 * Validate a congressional district feature
 * @param district - District to validate
 * @returns True if district is valid
 */
export const validateCongressionalDistrict = (district: CongressionalDistrictFeature): boolean => {
  // Check required fields
  if (!district.properties.district || !district.properties.name || !district.properties.representative) {
    console.warn('Invalid congressional district: missing required fields', district);
    return false;
  }

  // Validate district number
  if (typeof district.properties.districtNumber !== 'number' || district.properties.districtNumber < 1) {
    console.warn('Invalid congressional district: invalid district number', district);
    return false;
  }

  // Validate state
  if (district.properties.state !== 'TX') {
    console.warn('Congressional district not in Texas:', district.properties.name);
    return false;
  }

  // Validate geometry
  if (!district.geometry || !district.geometry.coordinates) {
    console.warn('Invalid congressional district: missing geometry', district);
    return false;
  }

  return true;
};

/**
 * Filter congressional districts by search term
 * @param districts - Array of districts to search
 * @param searchTerm - Search term to filter by
 * @returns Filtered districts array
 */
export const filterCongressionalDistricts = (districts: CongressionalDistrictFeature[], searchTerm: string): CongressionalDistrictFeature[] => {
  if (!searchTerm.trim()) {
    return districts;
  }

  const term = searchTerm.toLowerCase().trim();
  
  return districts.filter(district => 
    district.properties.name.toLowerCase().includes(term) ||
    district.properties.representative.toLowerCase().includes(term) ||
    district.properties.district.toLowerCase().includes(term) ||
    district.properties.districtNumber.toString().includes(term)
  );
};

/**
 * Sort congressional districts by district number
 * @param districts - Array of districts to sort
 * @returns Sorted districts array
 */
export const sortCongressionalDistrictsByNumber = (districts: CongressionalDistrictFeature[]): CongressionalDistrictFeature[] => {
  return [...districts].sort((a, b) => a.properties.districtNumber - b.properties.districtNumber);
};

/**
 * Sort congressional districts by representative name
 * @param districts - Array of districts to sort
 * @returns Sorted districts array
 */
export const sortCongressionalDistrictsByRepresentative = (districts: CongressionalDistrictFeature[]): CongressionalDistrictFeature[] => {
  return [...districts].sort((a, b) => 
    a.properties.representative.localeCompare(b.properties.representative)
  );
};

/**
 * Get congressional district by number
 * @param districts - Array of districts to search
 * @param districtNumber - District number to find
 * @returns District if found, undefined otherwise
 */
export const getCongressionalDistrictByNumber = (
  districts: CongressionalDistrictFeature[], 
  districtNumber: number
): CongressionalDistrictFeature | undefined => {
  return districts.find(district => district.properties.districtNumber === districtNumber);
};

/**
 * Get congressional district by representative name
 * @param districts - Array of districts to search
 * @param representativeName - Representative name to find
 * @returns District if found, undefined otherwise
 */
export const getCongressionalDistrictByRepresentative = (
  districts: CongressionalDistrictFeature[], 
  representativeName: string
): CongressionalDistrictFeature | undefined => {
  return districts.find(district => 
    district.properties.representative.toLowerCase() === representativeName.toLowerCase()
  );
};

/**
 * Get congressional district that contains a specific point
 * @param districts - Array of districts to search
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @returns District if found, undefined otherwise
 */
export const getCongressionalDistrictAtPoint = (
  districts: CongressionalDistrictFeature[], 
  lat: number, 
  lng: number
): CongressionalDistrictFeature | undefined => {
  // This is a simplified point-in-polygon check
  // In a real implementation, you might want to use a more robust library like turf.js
  return districts.find(district => {
    return isPointInPolygon(lat, lng, district.geometry);
  });
};

/**
 * Simple point-in-polygon check for single polygon
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param geometry - Geometry to check against
 * @returns True if point is inside polygon
 */
export const isPointInPolygon = (
  lat: number, 
  lng: number, 
  geometry: CongressionalDistrictFeature['geometry']
): boolean => {
  if (geometry.type === 'Polygon') {
    return isPointInSinglePolygon(lat, lng, geometry.coordinates as number[][][]);
  } else if (geometry.type === 'MultiPolygon') {
    return isPointInMultiPolygon(lat, lng, geometry.coordinates as number[][][][]);
  }
  return false;
};

/**
 * Check if point is inside a single polygon using ray casting algorithm
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param coordinates - Polygon coordinates
 * @returns True if point is inside polygon
 */
export const isPointInSinglePolygon = (lat: number, lng: number, coordinates: number[][][]): boolean => {
  if (coordinates.length === 0) return false;
  
  const polygon = coordinates[0]; // Use the outer ring
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1]; // longitude
    const yi = polygon[i][0]; // latitude
    const xj = polygon[j][1]; // longitude
    const yj = polygon[j][0]; // latitude
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

/**
 * Check if point is inside a multi-polygon
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param coordinates - Multi-polygon coordinates
 * @returns True if point is inside any polygon
 */
export const isPointInMultiPolygon = (lat: number, lng: number, coordinates: number[][][][]): boolean => {
  return coordinates.some(polygon => isPointInSinglePolygon(lat, lng, polygon));
};

/**
 * Get statistics about congressional districts
 * @param districts - Array of districts to analyze
 * @returns Statistics object
 */
export const getCongressionalDistrictStats = (districts: CongressionalDistrictFeature[]) => {
  const total = districts.length;
  const districtNumbers = districts.map(d => d.properties.districtNumber).sort((a, b) => a - b);
  
  return {
    total,
    minDistrictNumber: Math.min(...districtNumbers),
    maxDistrictNumber: Math.max(...districtNumbers),
    districtNumbers,
    representatives: districts.map(d => d.properties.representative).sort()
  };
};

/**
 * Format district number for display
 * @param districtNumber - District number
 * @returns Formatted district string
 */
export const formatDistrictNumber = (districtNumber: number): string => {
  const suffix = getOrdinalSuffix(districtNumber);
  return `${districtNumber}${suffix}`;
};

/**
 * Get ordinal suffix for a number
 * @param num - Number to get suffix for
 * @returns Ordinal suffix
 */
export const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
};

/**
 * Create a feature collection from district features
 * @param districts - Array of district features
 * @returns Feature collection
 */
export const createDistrictFeatureCollection = (districts: CongressionalDistrictFeature[]): CongressionalDistrictFeatureCollection => {
  return {
    type: 'FeatureCollection',
    features: districts
  };
}; 