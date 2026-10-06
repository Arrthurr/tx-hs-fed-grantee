import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processHeadStartPrograms } from '../../src/data/headStartPrograms';
import { TXHSA_REGION_NAMES } from '../../src/data/txhsaRegions';
import {
  assertCountySourceInvariants,
  assertGeneratedMatchesCommitted,
  countyNamesFromSource,
  countLocationsByRegion,
  loadCommittedRegions,
} from '../dataIntegrity';
import type { BuildResult } from '../build-txhsa-regions';

const square = (cx: number, cy: number, half = 0.5) => ({
  type: 'Polygon' as const,
  coordinates: [[
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half],
  ]],
});

const regionFeature = (name: 'West' | 'North' | 'East' | 'South', minLng: number, minLat: number) => ({
  type: 'Feature' as const,
  properties: { name },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[
      [minLng, minLat],
      [minLng + 2, minLat],
      [minLng + 2, minLat + 2],
      [minLng, minLat + 2],
      [minLng, minLat],
    ]],
  },
});

describe('countyNamesFromSource', () => {
  it('rejects duplicate county names and invalid rings', () => {
    expect(() => countyNamesFromSource({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: square(0, 0) },
        { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: square(1, 0) },
      ],
    })).toThrow(/Duplicate county: A/);

    expect(() => countyNamesFromSource({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { COUNTY: 'A County' },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1]]] },
      }],
    })).toThrow(/Invalid geometry: A County/);
  });
});

describe('assertCountySourceInvariants', () => {
  it('rejects incomplete, duplicate, and lookup-mismatched names', () => {
    expect(() => assertCountySourceInvariants(['A', 'A'], { A: 1 }, {}, { expectedCount: 2 }))
      .toThrow(/Duplicate county names/);
    expect(() => assertCountySourceInvariants(['A'], { A: 1, B: 2 }, {}, { expectedCount: 1 }))
      .toThrow(/County\/lookup coverage mismatch/);
    expect(() => assertCountySourceInvariants(['A', 'B'], { A: 1, B: 2 }, {}, { expectedCount: 254 }))
      .toThrow();
  });

  it('accepts a unique complete lookup for a sparse fixture', () => {
    expect(() => assertCountySourceInvariants(
      ['A', 'B'],
      { A: 1, B: 5 },
      { B: 'East' },
      { expectedCount: 2 },
    )).not.toThrow();
  });
});

describe('countLocationsByRegion', () => {
  const regions = [
    regionFeature('West', -101, 30),
    regionFeature('North', -99, 30),
    regionFeature('East', -97, 30),
    regionFeature('South', -96, 29),
  ];

  it('rejects unmatched and overlapping locations instead of taking the first match', () => {
    const unmatched = processHeadStartPrograms([{
      name: 'Unmatched', address: 'El Paso, TX', coordinates: { lat: 31.7619, lng: -106.485 },
    }]);
    expect(() => countLocationsByRegion(unmatched, regions)).toThrow(/matches 0 regions/);

    const overlapRegions = [regionFeature('West', -99, 30), ...regions.slice(1)];
    const overlapping = processHeadStartPrograms([{
      name: 'Overlap', address: 'Austin, TX', coordinates: { lat: 30.5, lng: -98 },
    }]);
    expect(() => countLocationsByRegion(overlapping, overlapRegions)).toThrow(/matches 2 regions/);
  });

  it('counts a location that sits in exactly one region', () => {
    const locations = processHeadStartPrograms([{
      name: 'Austin', address: 'Austin, TX', coordinates: { lat: 30.5, lng: -98 },
    }]);
    expect(countLocationsByRegion(locations, regions)).toEqual({
      West: 0, North: 1, East: 0, South: 0,
    });
  });
});

describe('assertGeneratedMatchesCommitted', () => {
  it('accepts matching generated output and fails on drift', () => {
    const dir = mkdtempSync(join(tmpdir(), 'txhsa-match-'));
    try {
      const regions = {
        West: { type: 'FeatureCollection', features: [regionFeature('West', 0, 0)] },
        North: { type: 'FeatureCollection', features: [] },
        East: { type: 'FeatureCollection', features: [] },
        South: { type: 'FeatureCollection', features: [] },
      } as BuildResult['regions'];
      for (const name of TXHSA_REGION_NAMES) {
        writeFileSync(join(dir, `${name.toLowerCase()}.geojson`), JSON.stringify(regions[name]));
      }
      expect(() => assertGeneratedMatchesCommitted(
        { regions, countyCounts: { West: 1, North: 0, East: 0, South: 0 } },
        dir,
      )).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when a generated region file has drifted', () => {
    const dir = mkdtempSync(join(tmpdir(), 'txhsa-drift-'));
    try {
      const regions = {
        West: { type: 'FeatureCollection', features: [regionFeature('West', 0, 0)] },
        North: { type: 'FeatureCollection', features: [] },
        East: { type: 'FeatureCollection', features: [] },
        South: { type: 'FeatureCollection', features: [] },
      } as BuildResult['regions'];
      for (const name of TXHSA_REGION_NAMES) {
        writeFileSync(join(dir, `${name.toLowerCase()}.geojson`), JSON.stringify(regions[name]));
      }
      writeFileSync(join(dir, 'west.geojson'), '{"drift":true}');
      expect(() => assertGeneratedMatchesCommitted(
        { regions, countyCounts: { West: 1, North: 0, East: 0, South: 0 } },
        dir,
      )).toThrow(/Regenerate/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('committed geographic inputs', () => {
  it('assigns every accepted listed location to exactly one committed region', () => {
    const raw = JSON.parse(readFileSync('public/assets/geojson/headStartPrograms.json', 'utf8'));
    const locations = processHeadStartPrograms(raw);
    const regions = loadCommittedRegions();
    const counts = countLocationsByRegion(locations, regions);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(locations.length);
  });
});
