import {
  calculateMapBounds,
  calculateMapCenter,
  isPointInBounds,
  calculateBoundingBox,
  calculateDistance,
  degreesToRadians,
  getZoomLevelForBounds,
  getMapTypeForZoomLevel,
  formatCoordinate,
  parseCoordinateString
} from './mapHelpers';

describe('Map Helper Functions', () => {
  // Sample test data
  const mockLocations = [
    { lat: 30.2672, lng: -97.7431 },  // Austin
    { lat: 29.7604, lng: -95.3698 },  // Houston
    { lat: 32.7767, lng: -96.7970 }   // Dallas
  ];

  describe('calculateMapBounds', () => {
    test('calculates correct bounds for multiple locations', () => {
      const bounds = calculateMapBounds(mockLocations);
      
      expect(bounds.north).toBeCloseTo(32.7767, 4);  // Dallas (northmost)
      expect(bounds.south).toBeCloseTo(29.7604, 4);  // Houston (southmost)
      expect(bounds.east).toBeCloseTo(-95.3698, 4);  // Houston (eastmost)
      expect(bounds.west).toBeCloseTo(-97.7431, 4);  // Austin (westmost)
    });

    test('handles single location', () => {
      const bounds = calculateMapBounds([mockLocations[0]]);
      
      expect(bounds.north).toBeCloseTo(mockLocations[0].lat, 4);
      expect(bounds.south).toBeCloseTo(mockLocations[0].lat, 4);
      expect(bounds.east).toBeCloseTo(mockLocations[0].lng, 4);
      expect(bounds.west).toBeCloseTo(mockLocations[0].lng, 4);
    });

    test('returns default bounds for empty locations array', () => {
      const defaultBounds = {
        north: 36.5007,  // Northern Texas border
        south: 25.8371,  // Southern Texas border
        east: -93.5080,  // Eastern Texas border
        west: -106.6456  // Western Texas border
      };
      
      const bounds = calculateMapBounds([]);
      
      expect(bounds).toEqual(defaultBounds);
    });

    test('applies padding correctly', () => {
      const padding = 1.0;  // 1 degree padding
      const bounds = calculateMapBounds(mockLocations, padding);
      
      expect(bounds.north).toBeCloseTo(32.7767 + padding, 4);
      expect(bounds.south).toBeCloseTo(29.7604 - padding, 4);
      expect(bounds.east).toBeCloseTo(-95.3698 + padding, 4);
      expect(bounds.west).toBeCloseTo(-97.7431 - padding, 4);
    });
  });

  describe('calculateMapCenter', () => {
    test('calculates correct center for multiple locations', () => {
      const center = calculateMapCenter(mockLocations);
      
      // Average of all coordinates
      const expectedLat = (30.2672 + 29.7604 + 32.7767) / 3;
      const expectedLng = (-97.7431 + -95.3698 + -96.7970) / 3;
      
      expect(center.lat).toBeCloseTo(expectedLat, 4);
      expect(center.lng).toBeCloseTo(expectedLng, 4);
    });

    test('returns location for single location', () => {
      const center = calculateMapCenter([mockLocations[0]]);
      
      expect(center.lat).toBeCloseTo(mockLocations[0].lat, 4);
      expect(center.lng).toBeCloseTo(mockLocations[0].lng, 4);
    });

    test('returns default center for empty locations array', () => {
      const defaultCenter = { lat: 31.9686, lng: -99.9018 };  // Center of Texas
      
      const center = calculateMapCenter([]);
      
      expect(center).toEqual(defaultCenter);
    });
  });

  describe('isPointInBounds', () => {
    test('returns true for point inside bounds', () => {
      const bounds = {
        north: 33.0,
        south: 29.0,
        east: -95.0,
        west: -98.0
      };
      
      // Austin (inside bounds)
      expect(isPointInBounds(30.2672, -97.7431, bounds)).toBe(true);
    });

    test('returns false for point outside bounds', () => {
      const bounds = {
        north: 33.0,
        south: 29.0,
        east: -95.0,
        west: -98.0
      };
      
      // Point north of bounds
      expect(isPointInBounds(34.0, -97.0, bounds)).toBe(false);
      
      // Point south of bounds
      expect(isPointInBounds(28.0, -97.0, bounds)).toBe(false);
      
      // Point east of bounds
      expect(isPointInBounds(30.0, -94.0, bounds)).toBe(false);
      
      // Point west of bounds
      expect(isPointInBounds(30.0, -99.0, bounds)).toBe(false);
    });

    test('returns true for point on boundary', () => {
      const bounds = {
        north: 33.0,
        south: 29.0,
        east: -95.0,
        west: -98.0
      };
      
      // Points on boundaries
      expect(isPointInBounds(33.0, -97.0, bounds)).toBe(true);  // North boundary
      expect(isPointInBounds(29.0, -97.0, bounds)).toBe(true);  // South boundary
      expect(isPointInBounds(30.0, -95.0, bounds)).toBe(true);  // East boundary
      expect(isPointInBounds(30.0, -98.0, bounds)).toBe(true);  // West boundary
    });
  });

  describe('calculateBoundingBox', () => {
    test('calculates correct bounding box for a point and radius', () => {
      // Austin coordinates
      const lat = 30.2672;
      const lng = -97.7431;
      const radiusKm = 10;  // 10km radius
      
      const bounds = calculateBoundingBox(lat, lng, radiusKm);
      
      // Bounds should extend roughly 10km in each direction
      // At this latitude, 1 degree is approximately 111km north-south
      // and about 96km east-west
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (Math.cos(degreesToRadians(lat)) * 111);
      
      expect(bounds.north).toBeCloseTo(lat + latDelta, 4);
      expect(bounds.south).toBeCloseTo(lat - latDelta, 4);
      expect(bounds.east).toBeCloseTo(lng + lngDelta, 4);
      expect(bounds.west).toBeCloseTo(lng - lngDelta, 4);
    });
  });

  describe('calculateDistance', () => {
    test('calculates correct distance between two points', () => {
      // Austin coordinates
      const lat1 = 30.2672;
      const lng1 = -97.7431;
      
      // Houston coordinates
      const lat2 = 29.7604;
      const lng2 = -95.3698;
      
      // Approximate distance between Austin and Houston is ~235km
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      
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

  describe('degreesToRadians', () => {
    test('converts degrees to radians correctly', () => {
      expect(degreesToRadians(0)).toBe(0);
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10);
      expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 10);
    });
  });

  describe('getZoomLevelForBounds', () => {
    test('returns higher zoom level for smaller areas', () => {
      // Small area (city)
      const smallBounds = {
        north: 30.5,
        south: 30.0,
        east: -97.5,
        west: -98.0
      };
      
      // Large area (state)
      const largeBounds = {
        north: 36.5,
        south: 26.0,
        east: -93.5,
        west: -106.5
      };
      
      const smallZoom = getZoomLevelForBounds(smallBounds);
      const largeZoom = getZoomLevelForBounds(largeBounds);
      
      expect(smallZoom).toBeGreaterThan(largeZoom);
    });

    test('respects min and max zoom levels', () => {
      // Tiny area (should hit max zoom)
      const tinyBounds = {
        north: 30.01,
        south: 30.0,
        east: -97.0,
        west: -97.01
      };
      
      // Huge area (should hit min zoom)
      const hugeBounds = {
        north: 90.0,
        south: -90.0,
        east: 180.0,
        west: -180.0
      };
      
      const tinyZoom = getZoomLevelForBounds(tinyBounds, 3, 18);
      const hugeZoom = getZoomLevelForBounds(hugeBounds, 3, 18);
      
      expect(tinyZoom).toBe(18);  // Max zoom
      expect(hugeZoom).toBe(3);   // Min zoom
    });
  });

  describe('getMapTypeForZoomLevel', () => {
    test('returns correct map type based on zoom level', () => {
      // Low zoom (state level)
      expect(getMapTypeForZoomLevel(5)).toBe('terrain');
      
      // Medium zoom (city level)
      expect(getMapTypeForZoomLevel(10)).toBe('roadmap');
      
      // High zoom (street level)
      expect(getMapTypeForZoomLevel(15)).toBe('hybrid');
    });

    test('handles edge cases', () => {
      // Very low zoom
      expect(getMapTypeForZoomLevel(1)).toBe('terrain');
      
      // Very high zoom
      expect(getMapTypeForZoomLevel(20)).toBe('hybrid');
      
      // Boundary cases
      expect(getMapTypeForZoomLevel(8)).toBe('terrain');
      expect(getMapTypeForZoomLevel(9)).toBe('roadmap');
      expect(getMapTypeForZoomLevel(13)).toBe('roadmap');
      expect(getMapTypeForZoomLevel(14)).toBe('hybrid');
    });
  });

  describe('formatCoordinate', () => {
    test('formats latitude correctly', () => {
      expect(formatCoordinate(30.2672, 'lat')).toBe('30.2672° N');
      expect(formatCoordinate(-30.2672, 'lat')).toBe('30.2672° S');
      expect(formatCoordinate(0, 'lat')).toBe('0.0000°');
    });

    test('formats longitude correctly', () => {
      expect(formatCoordinate(-97.7431, 'lng')).toBe('97.7431° W');
      expect(formatCoordinate(97.7431, 'lng')).toBe('97.7431° E');
      expect(formatCoordinate(0, 'lng')).toBe('0.0000°');
    });

    test('respects decimal places parameter', () => {
      expect(formatCoordinate(30.2672, 'lat', 2)).toBe('30.27° N');
      expect(formatCoordinate(-97.7431, 'lng', 0)).toBe('98° W');
      expect(formatCoordinate(0, 'lat', 1)).toBe('0.0°');
    });
  });

  describe('parseCoordinateString', () => {
    test('parses valid coordinate strings', () => {
      expect(parseCoordinateString('30.2672, -97.7431')).toEqual({ lat: 30.2672, lng: -97.7431 });
      expect(parseCoordinateString('30.2672,-97.7431')).toEqual({ lat: 30.2672, lng: -97.7431 });
      expect(parseCoordinateString('  30.2672 ,  -97.7431  ')).toEqual({ lat: 30.2672, lng: -97.7431 });
    });

    test('returns null for invalid coordinate strings', () => {
      expect(parseCoordinateString('invalid')).toBeNull();
      expect(parseCoordinateString('30.2672')).toBeNull();
      expect(parseCoordinateString('30.2672, invalid')).toBeNull();
      expect(parseCoordinateString('')).toBeNull();
    });

    test('handles edge cases', () => {
      expect(parseCoordinateString('0, 0')).toEqual({ lat: 0, lng: 0 });
      expect(parseCoordinateString('90, 180')).toEqual({ lat: 90, lng: 180 });
      expect(parseCoordinateString('-90, -180')).toEqual({ lat: -90, lng: -180 });
    });
  });
});