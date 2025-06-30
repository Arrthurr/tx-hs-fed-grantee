import { HeadStartProgram } from '../types/maps';

/**
 * Raw Head Start program data structure from GeoJSON
 */
export interface RawHeadStartProgram {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Process and validate Head Start program data
 * @param rawData - Raw program data from GeoJSON
 * @returns Processed HeadStartProgram array
 */
export const processHeadStartPrograms = (rawData: RawHeadStartProgram[]): HeadStartProgram[] => {
  return rawData
    .map((program, index) => ({
      id: `program-${index}`,
      name: program.name.trim(),
      address: program.address.trim(),
      lat: program.coordinates.lat,
      lng: program.coordinates.lng,
      type: 'head-start' as const, // Default type, could be enhanced with actual data
      grantee: program.name.trim(), // Use program name as grantee for now
      funding: undefined // Will be added when funding data is available
    }))
    .filter(validateHeadStartProgram);
};

/**
 * Validate a Head Start program entry
 * @param program - Program to validate
 * @returns True if program is valid
 */
export const validateHeadStartProgram = (program: HeadStartProgram): boolean => {
  // Check required fields
  if (!program.name || !program.address || !program.id) {
    console.warn('Invalid Head Start program: missing required fields', program);
    return false;
  }

  // Validate coordinates
  if (typeof program.lat !== 'number' || typeof program.lng !== 'number') {
    console.warn('Invalid Head Start program: invalid coordinates', program);
    return false;
  }

  // Check if coordinates are within Texas bounds
  if (!isWithinTexasBounds(program.lat, program.lng)) {
    console.warn('Head Start program outside Texas bounds:', program.name, program.lat, program.lng);
    return false;
  }

  return true;
};

/**
 * Check if coordinates are within Texas bounds
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns True if coordinates are within Texas
 */
export const isWithinTexasBounds = (lat: number, lng: number): boolean => {
  // Texas approximate bounds
  const texasBounds = {
    north: 36.5007,
    south: 25.8371,
    east: -93.5080,
    west: -106.6456
  };

  return lat >= texasBounds.south && 
         lat <= texasBounds.north && 
         lng >= texasBounds.west && 
         lng <= texasBounds.east;
};

/**
 * Filter Head Start programs by search term
 * @param programs - Array of programs to search
 * @param searchTerm - Search term to filter by
 * @returns Filtered programs array
 */
export const filterHeadStartPrograms = (programs: HeadStartProgram[], searchTerm: string): HeadStartProgram[] => {
  if (!searchTerm.trim()) {
    return programs;
  }

  const term = searchTerm.toLowerCase().trim();
  
  return programs.filter(program => 
    program.name.toLowerCase().includes(term) ||
    program.address.toLowerCase().includes(term) ||
    (program.grantee && program.grantee.toLowerCase().includes(term))
  );
};

/**
 * Sort Head Start programs by name
 * @param programs - Array of programs to sort
 * @returns Sorted programs array
 */
export const sortHeadStartProgramsByName = (programs: HeadStartProgram[]): HeadStartProgram[] => {
  return [...programs].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get Head Start programs by type
 * @param programs - Array of programs to filter
 * @param type - Program type to filter by
 * @returns Filtered programs array
 */
export const getHeadStartProgramsByType = (programs: HeadStartProgram[], type: 'head-start' | 'early-head-start'): HeadStartProgram[] => {
  return programs.filter(program => program.type === type);
};

/**
 * Get Head Start programs within a specific area
 * @param programs - Array of programs to filter
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param radiusKm - Radius in kilometers
 * @returns Filtered programs array
 */
export const getHeadStartProgramsInRadius = (
  programs: HeadStartProgram[], 
  centerLat: number, 
  centerLng: number, 
  radiusKm: number
): HeadStartProgram[] => {
  return programs.filter(program => {
    const distance = calculateDistance(centerLat, centerLng, program.lat, program.lng);
    return distance <= radiusKm;
  });
};

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - First latitude
 * @param lng1 - First longitude
 * @param lat2 - Second latitude
 * @param lng2 - Second longitude
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get statistics about Head Start programs
 * @param programs - Array of programs to analyze
 * @returns Statistics object
 */
export const getHeadStartProgramStats = (programs: HeadStartProgram[]) => {
  const total = programs.length;
  const headStartCount = programs.filter(p => p.type === 'head-start').length;
  const earlyHeadStartCount = programs.filter(p => p.type === 'early-head-start').length;
  
  // Calculate geographic bounds
  const lats = programs.map(p => p.lat);
  const lngs = programs.map(p => p.lng);
  
  return {
    total,
    headStartCount,
    earlyHeadStartCount,
    bounds: {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
  };
};

/**
 * Format funding amount for display
 * @param funding - Funding amount in dollars
 * @returns Formatted funding string
 */
export const formatFunding = (funding?: number): string => {
  if (funding === undefined || funding === null) {
    return 'Funding data not available';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(funding);
}; 