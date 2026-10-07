/** Shared geographic and committed-data invariants used by `npm run test:data`. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { BuildResult } from './build-txhsa-regions';
import { tdemToTxhsaRegion } from '../src/data/tdemCountyRegions';
import { TXHSA_REGION_NAMES, countLocationsByRegion as countRegionLocations, parseTxhsaRegionCollection } from '../src/data/txhsaRegions';
import { isValidPolygonGeometry } from '../src/utils/geometry';
import type { HeadStartProgram, TxhsaRegionFeature, TxhsaRegionName } from '../src/types/maps';

export const COMMITTED_COUNTY_COUNT = 254;
export const COMMITTED_REGION_DIR = 'public/assets/txhsa-geojson';

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));

export const countyNamesFromSource = (counties: {
  type?: unknown;
  features?: Array<{ properties?: { COUNTY?: string }; geometry?: unknown }>;
}): string[] => {
  if (counties.type !== 'FeatureCollection' || !Array.isArray(counties.features)) {
    throw new Error('County source is not a GeoJSON FeatureCollection');
  }
  const seen = new Set<string>();
  return counties.features.map(feature => {
    const rawName = feature.properties?.COUNTY;
    if (!rawName) throw new Error('County feature missing COUNTY property');
    if (!isValidPolygonGeometry(feature.geometry)) {
      throw new Error(`Invalid geometry: ${rawName}`);
    }
    const name = rawName.replace(/ County$/, '').trim();
    if (seen.has(name)) throw new Error(`Duplicate county: ${name}`);
    seen.add(name);
    return name;
  });
};

export const assertCountySourceInvariants = (
  countyNames: string[],
  countyLookup: Record<string, number>,
  countyOverrides: Record<string, TxhsaRegionName>,
  options: { expectedCount?: number } = {},
): void => {
  const expectedCount = options.expectedCount ?? COMMITTED_COUNTY_COUNT;
  if (countyNames.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} counties, found ${countyNames.length}`);
  }
  if (new Set(countyNames).size !== countyNames.length) {
    throw new Error('Duplicate county names');
  }
  const lookupNames = Object.keys(countyLookup).sort();
  const sourceNames = [...countyNames].sort();
  if (lookupNames.length !== sourceNames.length ||
      lookupNames.some((name, index) => name !== sourceNames[index])) {
    throw new Error('County/lookup coverage mismatch');
  }
  for (const name of countyNames) {
    const tdem = countyLookup[name];
    if (!Number.isInteger(tdem) || tdem < 1 || tdem > 8) {
      throw new Error(`Invalid TDEM assignment: ${name}`);
    }
    const region = countyOverrides[name] ?? tdemToTxhsaRegion[tdem as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8];
    if (!TXHSA_REGION_NAMES.includes(region)) {
      throw new Error(`County ${name} is not assigned to a TXHSA region`);
    }
  }
};

export const loadCommittedRegions = (dir = COMMITTED_REGION_DIR): TxhsaRegionFeature[] =>
  TXHSA_REGION_NAMES.map(name => {
    const collection = readJson(path.join(dir, `${name.toLowerCase()}.geojson`));
    return parseTxhsaRegionCollection(collection, name);
  });

export const countLocationsByRegion = (
  locations: HeadStartProgram[],
  regions: TxhsaRegionFeature[],
): Record<TxhsaRegionName, number> => {
  const result = countRegionLocations(locations, regions);
  if (!result.ok) {
    throw new Error(`${result.location.name} matches ${result.matchCount} regions`);
  }
  return result.counts;
};

export const assertGeneratedMatchesCommitted = (
  generated: BuildResult,
  dir = COMMITTED_REGION_DIR,
): void => {
  for (const name of TXHSA_REGION_NAMES) {
    const file = path.join(dir, `${name.toLowerCase()}.geojson`);
    // Byte comparison catches output drift as well as geometric differences.
    if (readFileSync(file, 'utf8') !== JSON.stringify(generated.regions[name])) {
      throw new Error(`Regenerate ${file}`);
    }
  }
};
