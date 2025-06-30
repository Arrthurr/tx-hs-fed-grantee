import {
  processCongressionalDistricts,
  validateCongressionalDistrict,
  filterCongressionalDistricts,
  sortCongressionalDistrictsByNumber,
  sortCongressionalDistrictsByRepresentative,
  getCongressionalDistrictByNumber,
  getCongressionalDistrictByRepresentative,
  getCongressionalDistrictAtPoint,
  isPointInPolygon,
  isPointInSinglePolygon,
  isPointInMultiPolygon,
  getCongressionalDistrictStats,
  formatDistrictNumber,
  getOrdinalSuffix,
  createDistrictFeatureCollection
} from './congressionalDistricts';
import { CongressionalDistrictFeature } from '../types/maps';

describe('Congressional Districts Data Processing', () => {
  // Sample test data
  const mockRawDistricts = [
    {
      type: 'Feature',
      properties: {
        district: 'TX-1',
        name: 'Texas 1st Congressional District',
        representative: 'John Smith',
        districtNumber: 1,
        state: 'TX'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-97.0, 30.0],
          [-97.0, 31.0],
          [-96.0, 31.0],
          [-96.0, 30.0],
          [-97.0, 30.0]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        district: 'TX-2',
        name: 'Texas 2nd Congressional District',
        representative: 'Jane Doe',
        districtNumber: 2,
        state: 'TX'
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-95.0, 29.0],
              [-95.0, 30.0],
              [-94.0, 30.0],
              [-94.0, 29.0],
              [-95.0, 29.0]
            ]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        district: 'TX-3',
        name: 'Texas 3rd Congressional District',
        representative: 'Bob Johnson',
        districtNumber: 3,
        state: 'TX'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-98.0, 32.0],
          [-98.0, 33.0],
          [-97.0, 33.0],
          [-97.0, 32.0],
          [-98.0, 32.0]
        ]]
      }
    }
  ];

  const mockProcessedDistricts: CongressionalDistrictFeature[] = mockRawDistricts as CongressionalDistrictFeature[];

  describe('processCongressionalDistricts', () => {
    test('processes raw district data correctly', () => {
      const processed = processCongressionalDistricts(mockRawDistricts);
      
      expect(processed.length).toBe(mockRawDistricts.length);
      expect(processed[0].properties.district).toBe(mockRawDistricts[0].properties.district);
      expect(processed[0].properties.name).toBe(mockRawDistricts[0].properties.name);
      expect(processed[0].properties.representative).toBe(mockRawDistricts[0].properties.representative);
      expect(processed[0].properties.districtNumber).toBe(mockRawDistricts[0].properties.districtNumber);
      expect(processed[0].geometry).toEqual(mockRawDistricts[0].geometry);
    });

    test('filters out invalid districts', () => {
      const invalidDistricts = [
        ...mockRawDistricts,
        {
          type: 'Feature',
          properties: {
            district: '',  // Invalid: empty district
            name: 'Invalid District',
            representative: 'Invalid Rep',
            districtNumber: 4,
            state: 'TX'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        },
        {
          type: 'Feature',
          properties: {
            district: 'CA-1',  // Invalid: not in Texas
            name: 'California 1st District',
            representative: 'California Rep',
            districtNumber: 1,
            state: 'CA'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        }
      ];
      
      const processed = processCongressionalDistricts(invalidDistricts);
      
      // Should only include the valid districts
      expect(processed.length).toBe(mockRawDistricts.length);
    });
  });

  describe('validateCongressionalDistrict', () => {
    test('returns true for valid districts', () => {
      expect(validateCongressionalDistrict(mockProcessedDistricts[0])).toBe(true);
    });

    test('returns false for districts with missing required fields', () => {
      const invalidDistrict1 = {
        ...mockProcessedDistricts[0],
        properties: { ...mockProcessedDistricts[0].properties, district: '' }
      };
      const invalidDistrict2 = {
        ...mockProcessedDistricts[0],
        properties: { ...mockProcessedDistricts[0].properties, name: '' }
      };
      const invalidDistrict3 = {
        ...mockProcessedDistricts[0],
        properties: { ...mockProcessedDistricts[0].properties, representative: '' }
      };
      
      expect(validateCongressionalDistrict(invalidDistrict1)).toBe(false);
      expect(validateCongressionalDistrict(invalidDistrict2)).toBe(false);
      expect(validateCongressionalDistrict(invalidDistrict3)).toBe(false);
    });

    test('returns false for districts with invalid district number', () => {
      const invalidDistrict1 = {
        ...mockProcessedDistricts[0],
        properties: { ...mockProcessedDistricts[0].properties, districtNumber: 0 }  // Invalid: less than 1
      };
      const invalidDistrict2 = {
        ...mockProcessedDistricts[0],
        properties: { ...mockProcessedDistricts[0].properties, districtNumber: 'invalid' as any }  // Invalid: not a number
      };
      
      expect(validateCongressionalDistrict(invalidDistrict1)).toBe(false);
      expect(validateCongressionalDistrict(invalidDistrict2)).toBe(false);
    });

    test('returns false for districts not in Texas', () => {
      const invalidDistrict = {
        ...mockProcessedDistricts[0],
        properties: { ...mockProcessedDistricts[0].properties, state: 'CA' }  // Invalid: not TX
      };
      
      expect(validateCongressionalDistrict(invalidDistrict)).toBe(false);
    });

    test('returns false for districts with missing geometry', () => {
      const invalidDistrict = {
        ...mockProcessedDistricts[0],
        geometry: undefined as any  // Invalid: missing geometry
      };
      
      expect(validateCongressionalDistrict(invalidDistrict)).toBe(false);
    });
  });

  describe('filterCongressionalDistricts', () => {
    test('returns all districts when search term is empty', () => {
      const filtered = filterCongressionalDistricts(mockProcessedDistricts, '');
      expect(filtered.length).toBe(mockProcessedDistricts.length);
    });

    test('filters districts by name', () => {
      const filtered = filterCongressionalDistricts(mockProcessedDistricts, '1st');
      expect(filtered.length).toBe(1);
      expect(filtered[0].properties.name).toBe('Texas 1st Congressional District');
    });

    test('filters districts by representative', () => {
      const filtered = filterCongressionalDistricts(mockProcessedDistricts, 'jane');
      expect(filtered.length).toBe(1);
      expect(filtered[0].properties.representative).toBe('Jane Doe');
    });

    test('filters districts by district code', () => {
      const filtered = filterCongressionalDistricts(mockProcessedDistricts, 'TX-3');
      expect(filtered.length).toBe(1);
      expect(filtered[0].properties.district).toBe('TX-3');
    });

    test('filters districts by district number', () => {
      const filtered = filterCongressionalDistricts(mockProcessedDistricts, '2');
      expect(filtered.length).toBe(1);
      expect(filtered[0].properties.districtNumber).toBe(2);
    });

    test('returns empty array when no matches found', () => {
      const filtered = filterCongressionalDistricts(mockProcessedDistricts, 'nonexistent');
      expect(filtered.length).toBe(0);
    });

    test('performs case-insensitive search', () => {
      const filtered = filterCongressionalDistricts(mockProcessedDistricts, 'JANE');
      expect(filtered.length).toBe(1);
      expect(filtered[0].properties.representative).toBe('Jane Doe');
    });
  });

  describe('sortCongressionalDistrictsByNumber', () => {
    test('sorts districts by district number', () => {
      // Create a shuffled array
      const shuffled = [
        mockProcessedDistricts[2],  // District 3
        mockProcessedDistricts[0],  // District 1
        mockProcessedDistricts[1]   // District 2
      ];
      
      const sorted = sortCongressionalDistrictsByNumber(shuffled);
      
      expect(sorted[0].properties.districtNumber).toBe(1);
      expect(sorted[1].properties.districtNumber).toBe(2);
      expect(sorted[2].properties.districtNumber).toBe(3);
    });

    test('does not modify original array', () => {
      const original = [
        mockProcessedDistricts[2],
        mockProcessedDistricts[0],
        mockProcessedDistricts[1]
      ];
      
      sortCongressionalDistrictsByNumber([...original]);
      
      expect(original[0]).toBe(mockProcessedDistricts[2]);
      expect(original[1]).toBe(mockProcessedDistricts[0]);
      expect(original[2]).toBe(mockProcessedDistricts[1]);
    });
  });

  describe('sortCongressionalDistrictsByRepresentative', () => {
    test('sorts districts alphabetically by representative name', () => {
      const sorted = sortCongressionalDistrictsByRepresentative(mockProcessedDistricts);
      
      expect(sorted[0].properties.representative).toBe('Bob Johnson');
      expect(sorted[1].properties.representative).toBe('Jane Doe');
      expect(sorted[2].properties.representative).toBe('John Smith');
    });

    test('does not modify original array', () => {
      const original = [...mockProcessedDistricts];
      
      sortCongressionalDistrictsByRepresentative(original);
      
      expect(original).toEqual(mockProcessedDistricts);
    });
  });

  describe('getCongressionalDistrictByNumber', () => {
    test('returns district with matching number', () => {
      const district = getCongressionalDistrictByNumber(mockProcessedDistricts, 2);
      
      expect(district).toBeDefined();
      expect(district?.properties.districtNumber).toBe(2);
      expect(district?.properties.name).toBe('Texas 2nd Congressional District');
    });

    test('returns undefined when no district matches', () => {
      const district = getCongressionalDistrictByNumber(mockProcessedDistricts, 99);
      
      expect(district).toBeUndefined();
    });
  });

  describe('getCongressionalDistrictByRepresentative', () => {
    test('returns district with matching representative', () => {
      const district = getCongressionalDistrictByRepresentative(mockProcessedDistricts, 'Jane Doe');
      
      expect(district).toBeDefined();
      expect(district?.properties.representative).toBe('Jane Doe');
      expect(district?.properties.name).toBe('Texas 2nd Congressional District');
    });

    test('performs case-insensitive search', () => {
      const district = getCongressionalDistrictByRepresentative(mockProcessedDistricts, 'jane doe');
      
      expect(district).toBeDefined();
      expect(district?.properties.representative).toBe('Jane Doe');
    });

    test('returns undefined when no district matches', () => {
      const district = getCongressionalDistrictByRepresentative(mockProcessedDistricts, 'Nonexistent Rep');
      
      expect(district).toBeUndefined();
    });
  });

  describe('isPointInPolygon and related functions', () => {
    // Test polygon (simple square)
    const squarePolygon = {
      type: 'Polygon' as const,
      coordinates: [[
        [-97.0, 30.0],  // Bottom-left
        [-97.0, 31.0],  // Top-left
        [-96.0, 31.0],  // Top-right
        [-96.0, 30.0],  // Bottom-right
        [-97.0, 30.0]   // Back to start
      ]]
    };
    
    // Test multi-polygon (two squares)
    const multiPolygon = {
      type: 'MultiPolygon' as const,
      coordinates: [
        [
          [
            [-97.0, 30.0],
            [-97.0, 31.0],
            [-96.0, 31.0],
            [-96.0, 30.0],
            [-97.0, 30.0]
          ]
        ],
        [
          [
            [-95.0, 29.0],
            [-95.0, 30.0],
            [-94.0, 30.0],
            [-94.0, 29.0],
            [-95.0, 29.0]
          ]
        ]
      ]
    };

    describe('isPointInSinglePolygon', () => {
      test('returns true for point inside polygon', () => {
        // Point inside the square
        expect(isPointInSinglePolygon(30.5, -96.5, squarePolygon.coordinates)).toBe(true);
      });

      test('returns false for point outside polygon', () => {
        // Point outside the square
        expect(isPointInSinglePolygon(32.0, -98.0, squarePolygon.coordinates)).toBe(false);
      });

      test('handles edge cases correctly', () => {
        // Point on the edge (may vary by implementation)
        expect(isPointInSinglePolygon(30.0, -96.5, squarePolygon.coordinates)).toBe(true);
        
        // Empty polygon
        expect(isPointInSinglePolygon(30.0, -96.0, [])).toBe(false);
      });
    });

    describe('isPointInMultiPolygon', () => {
      test('returns true for point inside any polygon', () => {
        // Point inside first polygon
        expect(isPointInMultiPolygon(30.5, -96.5, multiPolygon.coordinates)).toBe(true);
        
        // Point inside second polygon
        expect(isPointInMultiPolygon(29.5, -94.5, multiPolygon.coordinates)).toBe(true);
      });

      test('returns false for point outside all polygons', () => {
        // Point outside both polygons
        expect(isPointInMultiPolygon(32.0, -98.0, multiPolygon.coordinates)).toBe(false);
      });
    });

    describe('isPointInPolygon', () => {
      test('handles Polygon geometry correctly', () => {
        expect(isPointInPolygon(30.5, -96.5, squarePolygon)).toBe(true);
        expect(isPointInPolygon(32.0, -98.0, squarePolygon)).toBe(false);
      });

      test('handles MultiPolygon geometry correctly', () => {
        expect(isPointInPolygon(30.5, -96.5, multiPolygon)).toBe(true);
        expect(isPointInPolygon(29.5, -94.5, multiPolygon)).toBe(true);
        expect(isPointInPolygon(32.0, -98.0, multiPolygon)).toBe(false);
      });
    });

    describe('getCongressionalDistrictAtPoint', () => {
      test('returns district containing the point', () => {
        // Point inside first district
        const district = getCongressionalDistrictAtPoint(mockProcessedDistricts, 30.5, -96.5);
        
        expect(district).toBeDefined();
        expect(district?.properties.districtNumber).toBe(1);
      });

      test('returns undefined when point is not in any district', () => {
        // Point outside all districts
        const district = getCongressionalDistrictAtPoint(mockProcessedDistricts, 35.0, -100.0);
        
        expect(district).toBeUndefined();
      });
    });
  });

  describe('getCongressionalDistrictStats', () => {
    test('calculates correct statistics for districts', () => {
      const stats = getCongressionalDistrictStats(mockProcessedDistricts);
      
      expect(stats.total).toBe(3);
      expect(stats.minDistrictNumber).toBe(1);
      expect(stats.maxDistrictNumber).toBe(3);
      expect(stats.districtNumbers).toEqual([1, 2, 3]);
      expect(stats.representatives).toContain('John Smith');
      expect(stats.representatives).toContain('Jane Doe');
      expect(stats.representatives).toContain('Bob Johnson');
    });

    test('handles empty array', () => {
      const stats = getCongressionalDistrictStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.districtNumbers).toEqual([]);
      expect(stats.representatives).toEqual([]);
    });
  });

  describe('formatDistrictNumber', () => {
    test('formats district numbers with correct ordinal suffix', () => {
      expect(formatDistrictNumber(1)).toBe('1st');
      expect(formatDistrictNumber(2)).toBe('2nd');
      expect(formatDistrictNumber(3)).toBe('3rd');
      expect(formatDistrictNumber(4)).toBe('4th');
      expect(formatDistrictNumber(11)).toBe('11th');
      expect(formatDistrictNumber(21)).toBe('21st');
      expect(formatDistrictNumber(22)).toBe('22nd');
      expect(formatDistrictNumber(23)).toBe('23rd');
    });
  });

  describe('getOrdinalSuffix', () => {
    test('returns correct suffix for numbers', () => {
      expect(getOrdinalSuffix(1)).toBe('st');
      expect(getOrdinalSuffix(2)).toBe('nd');
      expect(getOrdinalSuffix(3)).toBe('rd');
      expect(getOrdinalSuffix(4)).toBe('th');
      expect(getOrdinalSuffix(11)).toBe('th');
      expect(getOrdinalSuffix(12)).toBe('th');
      expect(getOrdinalSuffix(13)).toBe('th');
      expect(getOrdinalSuffix(21)).toBe('st');
      expect(getOrdinalSuffix(22)).toBe('nd');
      expect(getOrdinalSuffix(23)).toBe('rd');
      expect(getOrdinalSuffix(101)).toBe('st');
      expect(getOrdinalSuffix(102)).toBe('nd');
      expect(getOrdinalSuffix(103)).toBe('rd');
      expect(getOrdinalSuffix(111)).toBe('th');
    });
  });

  describe('createDistrictFeatureCollection', () => {
    test('creates a valid GeoJSON feature collection', () => {
      const featureCollection = createDistrictFeatureCollection(mockProcessedDistricts);
      
      expect(featureCollection.type).toBe('FeatureCollection');
      expect(featureCollection.features).toEqual(mockProcessedDistricts);
      expect(featureCollection.features.length).toBe(mockProcessedDistricts.length);
    });

    test('handles empty array', () => {
      const featureCollection = createDistrictFeatureCollection([]);
      
      expect(featureCollection.type).toBe('FeatureCollection');
      expect(featureCollection.features).toEqual([]);
      expect(featureCollection.features.length).toBe(0);
    });
  });
});