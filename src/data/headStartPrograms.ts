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
  type?: HeadStartProgram['type'];
  grantee?: string;
  source?: HeadStartProgram['source'];
}

const validateRawHeadStartProgram = (raw: unknown): raw is RawHeadStartProgram => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const row = raw as Record<string, unknown>;
  if (typeof row.name !== 'string' || !row.name.trim() ||
      typeof row.address !== 'string' || !row.address.trim()) return false;
  if (!row.coordinates || typeof row.coordinates !== 'object' || Array.isArray(row.coordinates)) return false;
  const coordinates = row.coordinates as Record<string, unknown>;
  if (typeof coordinates.lat !== 'number' || !Number.isFinite(coordinates.lat) ||
      typeof coordinates.lng !== 'number' || !Number.isFinite(coordinates.lng) ||
      !isWithinTexasBounds(coordinates.lat, coordinates.lng)) return false;
  if (row.type !== undefined && !['head-start', 'early-head-start', 'both', 'unknown'].includes(row.type as string)) return false;
  if (row.grantee !== undefined && (typeof row.grantee !== 'string' || !row.grantee.trim())) return false;
  if (row.source !== undefined) {
    if (!row.source || typeof row.source !== 'object' || Array.isArray(row.source)) return false;
    const source = row.source as Record<string, unknown>;
    if (typeof source.reference !== 'string' || !source.reference.trim()) return false;
    if (source.asOf !== null && (typeof source.asOf !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(source.asOf) || !Number.isFinite(Date.parse(source.asOf)) ||
        new Date(source.asOf).toISOString().slice(0, 10) !== source.asOf)) return false;
  }
  // Do not accept factual classification/grantee additions without a citation.
  return !((row.type !== undefined && row.type !== 'unknown') || row.grantee !== undefined) || row.source !== undefined;
};

/**
 * Process and validate Head Start program data
 * @param rawData - Raw program data from GeoJSON
 * @returns Processed HeadStartProgram array
 */
export const processHeadStartPrograms = (rawData: unknown): HeadStartProgram[] => {
  if (!Array.isArray(rawData)) throw new Error('Invalid program dataset: expected an array');
  const seen = new Map<string, HeadStartProgram>();
  return rawData
    .map((program: unknown, index): HeadStartProgram => {
      // Fail the dataset explicitly instead of silently changing displayed totals.
      if (!validateRawHeadStartProgram(program)) {
        throw new Error(`Invalid program record at index ${index}: expected non-empty name/address, finite Texas coordinates and cited optional metadata`);
      }
      return {
        // Source-backed tuple identity, not a federal grant/recipient ID.
        // Includes address AND coordinates; independent of array order.
        id: `legacy-location:${JSON.stringify([
          program.name.trim(), program.address.trim(),
          program.coordinates.lat, program.coordinates.lng,
        ])}`,
        name: program.name.trim(),
        address: program.address.trim(),
        lat: program.coordinates.lat,
        lng: program.coordinates.lng,
        type: program.type ?? 'unknown',
        grantee: program.grantee?.trim(),
        source: program.source && { reference: program.source.reference.trim(), asOf: program.source.asOf },
        funding: undefined,
      };
    })
    .filter(program => {
      const existing = seen.get(program.id);
      if (existing) {
        if (existing.type !== program.type || existing.grantee !== program.grantee ||
            existing.source?.reference !== program.source?.reference ||
            existing.source?.asOf !== program.source?.asOf) {
          throw new Error(`Conflicting metadata for location ${program.id}`);
        }
        return false;
      }
      seen.set(program.id, program);
      return true;
    });
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
export const getHeadStartProgramsByType = (programs: HeadStartProgram[], type: HeadStartProgram['type']): HeadStartProgram[] => {
  return programs.filter(program => program.type === type ||
    (program.type === 'both' && (type === 'head-start' || type === 'early-head-start')));
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
  // Combined locations participate in both categories, but total counts locations once.
  const headStartCount = programs.filter(p => p.type === 'head-start' || p.type === 'both').length;
  const earlyHeadStartCount = programs.filter(p => p.type === 'early-head-start' || p.type === 'both').length;
  
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
