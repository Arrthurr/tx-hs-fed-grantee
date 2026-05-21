import {
  REGION_FUNDED_AMOUNTS,
  TXHSA_REGION_NAMES,
  processTxhsaRegion,
  validateTxhsaRegion,
} from './txhsaRegions';
import type { TxhsaRegionFeature } from '../types/maps';

const validWestFeature: TxhsaRegionFeature = {
  type: 'Feature',
  properties: { name: 'West' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-104, 30], [-100, 30], [-100, 34], [-104, 34], [-104, 30],
    ]],
  },
};

describe('TXHSA_REGION_NAMES', () => {
  it('contains exactly the four expected region names', () => {
    expect([...TXHSA_REGION_NAMES]).toEqual(['West', 'North', 'East', 'South']);
  });
});

describe('REGION_FUNDED_AMOUNTS', () => {
  it('contains the authored funded amount for every region', () => {
    expect(REGION_FUNDED_AMOUNTS).toEqual({
      West: 11857,
      North: 12311,
      East: 15360,
      South: 19049,
    });
  });

  it('has one entry per name in TXHSA_REGION_NAMES', () => {
    for (const name of TXHSA_REGION_NAMES) {
      expect(typeof REGION_FUNDED_AMOUNTS[name]).toBe('number');
    }
    expect(Object.keys(REGION_FUNDED_AMOUNTS).sort()).toEqual(
      [...TXHSA_REGION_NAMES].sort(),
    );
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
