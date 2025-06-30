import { 
  processHeadStartPrograms, 
  validateHeadStartProgram, 
  isWithinTexasBounds, 
  filterHeadStartPrograms, 
  sortHeadStartProgramsByName, 
  getHeadStartProgramsByType, 
  getHeadStartProgramsInRadius, 
  calculateDistance, 
  getHeadStartProgramStats, 
  formatFunding 
} from './headStartPrograms';
import { HeadStartProgram } from '../types/maps';

describe('Head Start Programs Data Processing', () => {
  // Sample test data
  const mockRawPrograms = [
    {
      name: 'Austin Head Start',
      address: '123 Main St, Austin, TX 78701',
      coordinates: { lat: 30.2672, lng: -97.7431 }
    },
    {
      name: 'Houston Early Head Start',
      address: '456 Oak Ave, Houston, TX 77002',
      coordinates: { lat: 29.7604, lng: -95.3698 }
    },
    {
      name: 'Dallas Head Start Center',
      address: '789 Elm St, Dallas, TX 75201',
      coordinates: { lat: 32.7767, lng: -96.7970 }
    }
  ];

  const mockProcessedPrograms: HeadStartProgram[] = [
    {
      id: 'program-0',
      name: 'Austin Head Start',
      address: '123 Main St, Austin, TX 78701',
      lat: 30.2672,
      lng: -97.7431,
      type: 'head-start',
      grantee: 'Austin Head Start',
      funding: undefined
    },
    {
      id: 'program-1',
      name: 'Houston Early Head Start',
      address: '456 Oak Ave, Houston, TX 77002',
      lat: 29.7604,
      lng: -95.3698,
      type: 'head-start',
      grantee: 'Houston Early Head Start',
      funding: undefined
    },
    {
      id: 'program-2',
      name: 'Dallas Head Start Center',
      address: '789 Elm St, Dallas, TX 75201',
      lat: 32.7767,
      lng: -96.7970,
      type: 'head-start',
      grantee: 'Dallas Head Start Center',
      funding: undefined
    }
  ];

  describe('processHeadStartPrograms', () => {
    test('processes raw program data correctly', () => {
      const processed = processHeadStartPrograms(mockRawPrograms);
      
      expect(processed.length).toBe(mockRawPrograms.length);
      expect(processed[0].id).toBeDefined();
      expect(processed[0].name).toBe(mockRawPrograms[0].name);
      expect(processed[0].address).toBe(mockRawPrograms[0].address);
      expect(processed[0].lat).toBe(mockRawPrograms[0].coordinates.lat);
      expect(processed[0].lng).toBe(mockRawPrograms[0].coordinates.lng);
      expect(processed[0].type).toBe('head-start');
    });

    test('filters out invalid programs', () => {
      const invalidPrograms = [
        ...mockRawPrograms,
        {
          name: '',  // Invalid: empty name
          address: '123 Invalid St',
          coordinates: { lat: 30.0, lng: -97.0 }
        },
        {
          name: 'Invalid Coordinates',
          address: '456 Invalid Ave',
          coordinates: { lat: 'invalid' as any, lng: -97.0 }  // Invalid: non-numeric lat
        },
        {
          name: 'Outside Texas',
          address: '789 Outside St',
          coordinates: { lat: 40.0, lng: -80.0 }  // Invalid: outside Texas bounds
        }
      ];
      
      const processed = processHeadStartPrograms(invalidPrograms);
      
      // Should only include the valid programs
      expect(processed.length).toBe(mockRawPrograms.length);
    });
  });

  describe('validateHeadStartProgram', () => {
    test('returns true for valid programs', () => {
      expect(validateHeadStartProgram(mockProcessedPrograms[0])).toBe(true);
    });

    test('returns false for programs with missing required fields', () => {
      const invalidProgram1 = { ...mockProcessedPrograms[0], name: '' };
      const invalidProgram2 = { ...mockProcessedPrograms[0], address: '' };
      const invalidProgram3 = { ...mockProcessedPrograms[0], id: '' };
      
      expect(validateHeadStartProgram(invalidProgram1)).toBe(false);
      expect(validateHeadStartProgram(invalidProgram2)).toBe(false);
      expect(validateHeadStartProgram(invalidProgram3)).toBe(false);
    });

    test('returns false for programs with invalid coordinates', () => {
      const invalidProgram1 = { ...mockProcessedPrograms[0], lat: 'invalid' as any };
      const invalidProgram2 = { ...mockProcessedPrograms[0], lng: 'invalid' as any };
      
      expect(validateHeadStartProgram(invalidProgram1)).toBe(false);
      expect(validateHeadStartProgram(invalidProgram2)).toBe(false);
    });

    test('returns false for programs outside Texas bounds', () => {
      const invalidProgram = { 
        ...mockProcessedPrograms[0], 
        lat: 40.0,  // Outside Texas
        lng: -80.0  // Outside Texas
      };
      
      expect(validateHeadStartProgram(invalidProgram)).toBe(false);
    });
  });

  describe('isWithinTexasBounds', () => {
    test('returns true for coordinates within Texas', () => {
      expect(isWithinTexasBounds(30.2672, -97.7431)).toBe(true);  // Austin
      expect(isWithinTexasBounds(29.7604, -95.3698)).toBe(true);  // Houston
      expect(isWithinTexasBounds(32.7767, -96.7970)).toBe(true);  // Dallas
    });

    test('returns false for coordinates outside Texas', () => {
      expect(isWithinTexasBounds(40.7128, -74.0060)).toBe(false);  // New York
      expect(isWithinTexasBounds(34.0522, -118.2437)).toBe(false);  // Los Angeles
      expect(isWithinTexasBounds(41.8781, -87.6298)).toBe(false);  // Chicago
    });
  });

  describe('filterHeadStartPrograms', () => {
    test('returns all programs when search term is empty', () => {
      const filtered = filterHeadStartPrograms(mockProcessedPrograms, '');
      expect(filtered.length).toBe(mockProcessedPrograms.length);
    });

    test('filters programs by name', () => {
      const filtered = filterHeadStartPrograms(mockProcessedPrograms, 'austin');
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Austin Head Start');
    });

    test('filters programs by address', () => {
      const filtered = filterHeadStartPrograms(mockProcessedPrograms, 'houston');
      expect(filtered.length).toBe(1);
      expect(filtered[0].address).toContain('Houston');
    });

    test('filters programs by grantee', () => {
      const programsWithGrantee = mockProcessedPrograms.map(p => ({
        ...p,
        grantee: `${p.name} Grantee`
      }));
      
      const filtered = filterHeadStartPrograms(programsWithGrantee, 'grantee');
      expect(filtered.length).toBe(programsWithGrantee.length);
    });

    test('returns empty array when no matches found', () => {
      const filtered = filterHeadStartPrograms(mockProcessedPrograms, 'nonexistent');
      expect(filtered.length).toBe(0);
    });

    test('performs case-insensitive search', () => {
      const filtered = filterHeadStartPrograms(mockProcessedPrograms, 'AUSTIN');
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Austin Head Start');
    });
  });

  describe('sortHeadStartProgramsByName', () => {
    test('sorts programs alphabetically by name', () => {
      const sorted = sortHeadStartProgramsByName(mockProcessedPrograms);
      
      expect(sorted[0].name).toBe('Austin Head Start');
      expect(sorted[1].name).toBe('Dallas Head Start Center');
      expect(sorted[2].name).toBe('Houston Early Head Start');
    });

    test('handles empty array', () => {
      const sorted = sortHeadStartProgramsByName([]);
      expect(sorted).toEqual([]);
    });

    test('does not modify original array', () => {
      const original = [...mockProcessedPrograms];
      sortHeadStartProgramsByName(mockProcessedPrograms);
      
      expect(mockProcessedPrograms).toEqual(original);
    });
  });

  describe('getHeadStartProgramsByType', () => {
    test('filters programs by head-start type', () => {
      const mixedPrograms = [
        { ...mockProcessedPrograms[0], type: 'head-start' as const },
        { ...mockProcessedPrograms[1], type: 'early-head-start' as const },
        { ...mockProcessedPrograms[2], type: 'head-start' as const }
      ];
      
      const headStartOnly = getHeadStartProgramsByType(mixedPrograms, 'head-start');
      
      expect(headStartOnly.length).toBe(2);
      expect(headStartOnly[0].type).toBe('head-start');
      expect(headStartOnly[1].type).toBe('head-start');
    });

    test('filters programs by early-head-start type', () => {
      const mixedPrograms = [
        { ...mockProcessedPrograms[0], type: 'head-start' as const },
        { ...mockProcessedPrograms[1], type: 'early-head-start' as const },
        { ...mockProcessedPrograms[2], type: 'head-start' as const }
      ];
      
      const earlyHeadStartOnly = getHeadStartProgramsByType(mixedPrograms, 'early-head-start');
      
      expect(earlyHeadStartOnly.length).toBe(1);
      expect(earlyHeadStartOnly[0].type).toBe('early-head-start');
    });

    test('returns empty array when no programs match type', () => {
      const headStartOnly = [
        { ...mockProcessedPrograms[0], type: 'head-start' as const },
        { ...mockProcessedPrograms[1], type: 'head-start' as const }
      ];
      
      const earlyHeadStartOnly = getHeadStartProgramsByType(headStartOnly, 'early-head-start');
      
      expect(earlyHeadStartOnly.length).toBe(0);
    });
  });

  describe('getHeadStartProgramsInRadius', () => {
    test('returns programs within specified radius', () => {
      // Austin coordinates
      const centerLat = 30.2672;
      const centerLng = -97.7431;
      const radiusKm = 10;  // 10km radius
      
      // Add a program close to Austin
      const programsWithNearbyLocation = [
        ...mockProcessedPrograms,
        {
          id: 'program-3',
          name: 'Nearby Austin Program',
          address: 'Near Austin, TX',
          lat: 30.2700,  // Very close to Austin
          lng: -97.7400,
          type: 'head-start',
          grantee: 'Nearby Austin Program',
          funding: undefined
        }
      ];
      
      const nearby = getHeadStartProgramsInRadius(
        programsWithNearbyLocation,
        centerLat,
        centerLng,
        radiusKm
      );
      
      // Should include Austin and the nearby program
      expect(nearby.length).toBe(2);
      expect(nearby.some(p => p.name === 'Austin Head Start')).toBe(true);
      expect(nearby.some(p => p.name === 'Nearby Austin Program')).toBe(true);
    });

    test('returns empty array when no programs are within radius', () => {
      // New York coordinates (far from Texas)
      const centerLat = 40.7128;
      const centerLng = -74.0060;
      const radiusKm = 10;  // 10km radius
      
      const nearby = getHeadStartProgramsInRadius(
        mockProcessedPrograms,
        centerLat,
        centerLng,
        radiusKm
      );
      
      expect(nearby.length).toBe(0);
    });
  });

  describe('calculateDistance', () => {
    test('calculates distance between two points correctly', () => {
      // Austin coordinates
      const lat1 = 30.2672;
      const lng1 = -97.7431;
      
      // Houston coordinates
      const lat2 = 29.7604;
      const lng2 = -95.3698;
      
      // Approximate distance between Austin and Houston is ~235km
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
      // Allow for some margin of error in the calculation
      expect(distance).toBeGreaterThan(230);
      expect(distance).toBeLessThan(240);
    });

    test('returns zero for identical points', () => {
      const lat = 30.2672;
      const lng = -97.7431;
      
      const distance = calculateDistance(lat, lng, lat, lng);
      
      expect(distance).toBe(0);
    });
  });

  describe('getHeadStartProgramStats', () => {
    test('calculates correct statistics for programs', () => {
      const mixedPrograms = [
        { ...mockProcessedPrograms[0], type: 'head-start' as const },
        { ...mockProcessedPrograms[1], type: 'early-head-start' as const },
        { ...mockProcessedPrograms[2], type: 'head-start' as const }
      ];
      
      const stats = getHeadStartProgramStats(mixedPrograms);
      
      expect(stats.total).toBe(3);
      expect(stats.headStartCount).toBe(2);
      expect(stats.earlyHeadStartCount).toBe(1);
      
      // Check bounds
      expect(stats.bounds.north).toBe(Math.max(...mixedPrograms.map(p => p.lat)));
      expect(stats.bounds.south).toBe(Math.min(...mixedPrograms.map(p => p.lat)));
      expect(stats.bounds.east).toBe(Math.max(...mixedPrograms.map(p => p.lng)));
      expect(stats.bounds.west).toBe(Math.min(...mixedPrograms.map(p => p.lng)));
    });

    test('handles empty array', () => {
      const stats = getHeadStartProgramStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.headStartCount).toBe(0);
      expect(stats.earlyHeadStartCount).toBe(0);
      
      // Bounds should be NaN for empty array
      expect(isNaN(stats.bounds.north)).toBe(true);
      expect(isNaN(stats.bounds.south)).toBe(true);
      expect(isNaN(stats.bounds.east)).toBe(true);
      expect(isNaN(stats.bounds.west)).toBe(true);
    });
  });

  describe('formatFunding', () => {
    test('formats funding amount with dollar sign and commas', () => {
      expect(formatFunding(1000000)).toBe('$1,000,000');
      expect(formatFunding(1500)).toBe('$1,500');
      expect(formatFunding(0)).toBe('$0');
    });

    test('returns message when funding is undefined', () => {
      expect(formatFunding(undefined)).toBe('Funding data not available');
    });

    test('returns message when funding is null', () => {
      expect(formatFunding(null as any)).toBe('Funding data not available');
    });
  });
});