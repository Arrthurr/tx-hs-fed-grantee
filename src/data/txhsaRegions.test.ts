import {
  TXHSA_REGION_NAMES,
  countLocationsByRegion,
  parseTxhsaRegionCollection,
  processTxhsaRegion,
  validateTxhsaRegion,
} from './txhsaRegions';
import type { HeadStartProgram, TxhsaRegionFeature } from '../types/maps';

const validWestFeature = {
  type: 'Feature',
  properties: { name: 'West' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-104, 30], [-100, 30], [-100, 34], [-104, 34], [-104, 30],
    ]],
  },
} satisfies TxhsaRegionFeature;

const location = (id: string, lat: number, lng: number): HeadStartProgram => ({
  id, name: `Location ${id}`, address: 'Texas', lat, lng, type: 'unknown',
});

describe('countLocationsByRegion', () => {
  it('counts locations independently of region order and includes zero-count regions', () => {
    const north: TxhsaRegionFeature = {
      ...validWestFeature,
      properties: { name: 'North' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-99, 30], [-97, 30], [-97, 34], [-99, 34], [-99, 30]]],
      },
    };
    expect(countLocationsByRegion([
      location('w1', 31, -103), location('n1', 32, -98), location('w2', 33, -101),
    ], [north, validWestFeature])).toEqual({
      ok: true, counts: { West: 2, North: 1, East: 0, South: 0 },
    });
  });

  it.each([
    { scenario: 'unmatched', lng: -106, north: false, matchCount: 0 },
    { scenario: 'overlap', lng: -101, north: true, matchCount: 2 },
    { scenario: 'shared edge', lng: -100, north: true, matchCount: 2 },
  ])('returns the first $scenario location without partial counts', ({ scenario, lng, north, matchCount }) => {
    const minLng = scenario === 'shared edge' ? -100 : -102;
    const northFeature: TxhsaRegionFeature = {
      ...validWestFeature,
      properties: { name: 'North' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[minLng, 30], [-98, 30], [-98, 34], [minLng, 34], [minLng, 30]]],
      },
    };
    const failed = location('first-failure', 32, lng);
    const regions = north ? [northFeature, validWestFeature] : [validWestFeature];
    const locations = [location('accepted-first', 31, -103), failed, location('later-failure', 32, -107)];
    expect(countLocationsByRegion(locations, regions)).toEqual({ ok: false, location: failed, matchCount });
    expect(countLocationsByRegion(locations, [...regions].reverse())).toEqual({ ok: false, location: failed, matchCount });
  });

  it('counts disconnected MultiPolygon islands but not locations in holes', () => {
    const region: TxhsaRegionFeature = {
      type: 'Feature', properties: { name: 'East' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [[-98, 30], [-94, 30], [-94, 34], [-98, 34], [-98, 30]],
            [[-97, 31], [-95, 31], [-95, 33], [-97, 33], [-97, 31]],
          ],
          [[[-93, 30], [-92, 30], [-92, 31], [-93, 31], [-93, 30]]],
        ],
      },
    };
    const accepted = [location('mainland', 30.5, -97.5), location('island', 30.5, -92.5)];
    expect(countLocationsByRegion(accepted, [region])).toEqual({
      ok: true, counts: { West: 0, North: 0, East: 2, South: 0 },
    });
    const inHole = location('hole', 32, -96);
    expect(countLocationsByRegion([...accepted, inHole], [region])).toEqual({
      ok: false, location: inHole, matchCount: 0,
    });
  });

  it('returns zero counts for no locations, and failure when a location has no regions', () => {
    expect(countLocationsByRegion([], [])).toEqual({
      ok: true, counts: { West: 0, North: 0, East: 0, South: 0 },
    });
    const unmatched = location('no-regions', 31, -103);
    expect(countLocationsByRegion([unmatched], [])).toEqual({ ok: false, location: unmatched, matchCount: 0 });
  });
});

describe('parseTxhsaRegionCollection', () => {
  it('returns the validated feature and rejects a recognized name that does not match the file', () => {
    const collection = { type: 'FeatureCollection', features: [validWestFeature] };
    expect(parseTxhsaRegionCollection(collection, 'West')).toBe(validWestFeature);
    expect(() => parseTxhsaRegionCollection(collection, 'North')).toThrow('Region name mismatch: North');
  });

  it('rejects array-shaped objects instead of accepting them as a feature array', () => {
    expect(() => parseTxhsaRegionCollection({
      type: 'FeatureCollection', features: { 0: validWestFeature, length: 1 },
    }, 'West')).toThrow('Invalid region collection: West');
  });

  it('accepts a valid MultiPolygon collection', () => {
    const feature: TxhsaRegionFeature = {
      ...validWestFeature,
      geometry: { type: 'MultiPolygon', coordinates: [validWestFeature.geometry.coordinates] },
    };
    expect(parseTxhsaRegionCollection({ type: 'FeatureCollection', features: [feature] }, 'West')).toBe(feature);
  });

  it.each([
    { scenario: 'null payload', payload: null },
    { scenario: 'wrong collection type', payload: { type: 'Feature', features: [validWestFeature] } },
    { scenario: 'no features', payload: { type: 'FeatureCollection', features: [] } },
    { scenario: 'extra feature', payload: { type: 'FeatureCollection', features: [validWestFeature, validWestFeature] } },
    { scenario: 'unknown name', payload: { type: 'FeatureCollection', features: [{ ...validWestFeature, properties: { name: 'Central' } }] } },
    { scenario: 'invalid geometry', payload: { type: 'FeatureCollection', features: [{ ...validWestFeature, geometry: { type: 'Polygon', coordinates: [] } }] } },
  ])('rejects $scenario', ({ payload }) => {
    expect(() => parseTxhsaRegionCollection(payload, 'West')).toThrow();
  });
});

describe('TXHSA_REGION_NAMES', () => {
  it('contains exactly the four expected region names', () => {
    expect([...TXHSA_REGION_NAMES]).toEqual(['West', 'North', 'East', 'South']);
  });
});

describe('validateTxhsaRegion', () => {
  it('accepts a well-formed region feature', () => {
    expect(validateTxhsaRegion(validWestFeature)).toBe(true);
  });

  it('rejects features with a lowercase / unknown name', () => {
    expect(validateTxhsaRegion({ ...validWestFeature, properties: { name: 'north' } })).toBe(false);
    expect(validateTxhsaRegion({ ...validWestFeature, properties: { name: 'Central' } })).toBe(false);
  });

  it('rejects features missing geometry', () => {
    const noGeom = { type: 'Feature', properties: { name: 'East' } };
    expect(validateTxhsaRegion(noGeom)).toBe(false);
  });

  it('rejects non-feature payloads', () => {
    expect(validateTxhsaRegion(null)).toBe(false);
    expect(validateTxhsaRegion({ type: 'FeatureCollection', features: [] })).toBe(false);
    expect(validateTxhsaRegion('West')).toBe(false);
  });

  it('rejects geometries with empty coordinates', () => {
    expect(validateTxhsaRegion({
      ...validWestFeature,
      geometry: { type: 'Polygon', coordinates: [] },
    })).toBe(false);
  });
});

describe('processTxhsaRegion', () => {
  it('preserves the region name and feature reference', () => {
    const region = processTxhsaRegion(validWestFeature);
    expect(region.name).toBe('West');
    expect(region.feature).toBe(validWestFeature);
  });

  it('computes a finite centroid inside the rectangle', () => {
    const region = processTxhsaRegion(validWestFeature);
    // Rectangle from (-104, 30) to (-100, 34) — centroid is around (-102, 32).
    expect(region.center.lng).toBeGreaterThan(-104);
    expect(region.center.lng).toBeLessThan(-100);
    expect(region.center.lat).toBeGreaterThan(30);
    expect(region.center.lat).toBeLessThan(34);
  });

  it('handles MultiPolygon by using the longest ring', () => {
    const multi: TxhsaRegionFeature = {
      type: 'Feature',
      properties: { name: 'South' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // Small island
          [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]],
          // Larger landmass (more vertices)
          [[[20, 20], [21, 20], [22, 21], [21, 22], [20, 22], [20, 20]]],
        ],
      },
    };
    const region = processTxhsaRegion(multi);
    // Should land near the larger landmass, not the island near (0,0).
    expect(region.center.lat).toBeGreaterThan(15);
    expect(region.center.lng).toBeGreaterThan(15);
  });
});
