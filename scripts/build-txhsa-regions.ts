/**
 * One-time build script that produces the four TXHSA region geojson files
 * by dissolving Texas counties into TDEM-region groups, then merging those
 * groups into the four TXHSA regions per the mapping in
 * `src/data/tdemCountyRegions.ts`.
 *
 * Run with: npm run build:regions
 *
 * Inputs:
 *   - scripts/source/tx-counties.geojson
 *       Texas counties, Polygon/MultiPolygon, with a `COUNTY` property like
 *       "Sherman County". Provenance: github.com/Cincome/tx.geojson
 *       (counties/tx_counties.geojson, downloaded 2026-05-19). Lives outside
 *       public/ so Vite does not ship this 8 MB file to clients — it is
 *       build-only input.
 *   - src/data/tdemCountyRegions.ts
 *       Authoritative lookup from county name (without " County" suffix) to
 *       TDEM region 1-8, plus the 4-way merge mapping.
 *
 * Outputs (committed):
 *   - public/assets/txhsa-geojson/{west,north,east,south}.geojson
 *       Each a single-feature FeatureCollection with `properties.name` set
 *       to "West" / "North" / "East" / "South".
 *
 * Failure modes:
 *   - A county present in the geojson but absent from the lookup → exit
 *     non-zero with the missing county name. This prevents silent gaps
 *     in the dissolved regions.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import union from '@turf/union';
import { tdemCountyRegions, tdemToTxhsaRegion } from '../src/data/tdemCountyRegions';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

type CountyFeature = Feature<Polygon | MultiPolygon, { COUNTY: string; [k: string]: unknown }>;
type TxhsaName = 'West' | 'North' | 'East' | 'South';

const repoRoot = process.cwd();

const SOURCE_PATH = path.join(repoRoot, 'scripts/source/tx-counties.geojson');
const OUTPUT_DIR = path.join(repoRoot, 'public/assets/txhsa-geojson');

const REGIONS: TxhsaName[] = ['West', 'North', 'East', 'South'];

export interface BuildOptions {
  sourcePath?: string;
  outputDir?: string;
  countyLookup?: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>;
  write?: boolean;
  /**
   * When true (the CLI default), throws if any TXHSA region ends up with zero
   * counties after grouping. Texas has ~254 counties spread across all four
   * regions, so an empty region indicates a malformed source or lookup. Tests
   * that intentionally exercise sparse fixtures should pass `false` to allow
   * legitimately-empty regions.
   */
  requireAllRegionsPopulated?: boolean;
}

export interface BuildResult {
  regions: Record<TxhsaName, FeatureCollection<Polygon | MultiPolygon, { name: TxhsaName }>>;
  countyCounts: Record<TxhsaName, number>;
}

export function buildTxhsaRegions(options: BuildOptions = {}): BuildResult {
  const sourcePath = options.sourcePath ?? SOURCE_PATH;
  const outputDir = options.outputDir ?? OUTPUT_DIR;
  const countyLookup = options.countyLookup ?? tdemCountyRegions;
  const write = options.write ?? true;
  const requireAllRegionsPopulated = options.requireAllRegionsPopulated ?? true;

  const raw = JSON.parse(readFileSync(sourcePath, 'utf-8')) as FeatureCollection<
    Polygon | MultiPolygon,
    { COUNTY: string }
  >;

  if (raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
    throw new Error(`Source ${sourcePath} is not a GeoJSON FeatureCollection`);
  }

  const groups: Record<TxhsaName, CountyFeature[]> = {
    West: [], North: [], East: [], South: [],
  };

  const missing: string[] = [];
  for (const feature of raw.features as CountyFeature[]) {
    const rawName = feature.properties?.COUNTY;
    if (!rawName) {
      throw new Error('County feature missing COUNTY property');
    }
    const countyName = rawName.replace(/ County$/, '').trim();
    const tdemRegion = countyLookup[countyName];
    if (!tdemRegion) {
      missing.push(countyName);
      continue;
    }
    const txhsaName = tdemToTxhsaRegion[tdemRegion];
    groups[txhsaName].push(feature);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing TDEM region assignment for counties:\n  ${missing.join('\n  ')}`,
    );
  }

  // Texas has ~254 counties spread across all four TXHSA regions. An empty
  // region in a real build implies a malformed source file or a corrupted
  // lookup -- failing here keeps the empty file from shipping silently and
  // confusing the runtime loader. Tests with sparse fixtures opt out.
  if (requireAllRegionsPopulated) {
    const emptyRegions = REGIONS.filter(name => groups[name].length === 0);
    if (emptyRegions.length > 0) {
      throw new Error(
        `Region(s) ended up with zero counties after grouping: ${emptyRegions.join(', ')}. ` +
        `This indicates a malformed county source or county→TDEM lookup.`,
      );
    }
  }

  const regions = {} as BuildResult['regions'];
  const countyCounts = { West: 0, North: 0, East: 0, South: 0 } as Record<TxhsaName, number>;

  if (write) {
    mkdirSync(outputDir, { recursive: true });
  }

  for (const name of REGIONS) {
    const members = groups[name];
    countyCounts[name] = members.length;

    if (members.length === 0) {
      regions[name] = { type: 'FeatureCollection', features: [] };
      if (write) {
        writeFileSync(
          path.join(outputDir, `${name.toLowerCase()}.geojson`),
          JSON.stringify(regions[name]),
        );
      }
      continue;
    }

    let geometry: Polygon | MultiPolygon;
    if (members.length === 1) {
      geometry = members[0].geometry;
    } else {
      const merged = union({ type: 'FeatureCollection', features: members } as FeatureCollection<
        Polygon | MultiPolygon
      >);
      if (!merged) {
        throw new Error(`Union produced no result for region ${name}`);
      }
      geometry = merged.geometry as Polygon | MultiPolygon;
    }

    const feature: Feature<Polygon | MultiPolygon, { name: TxhsaName }> = {
      type: 'Feature',
      properties: { name },
      geometry,
    };

    regions[name] = {
      type: 'FeatureCollection',
      features: [feature],
    };

    if (write) {
      writeFileSync(
        path.join(outputDir, `${name.toLowerCase()}.geojson`),
        JSON.stringify(regions[name]),
      );
    }
  }

  return { regions, countyCounts };
}

const isMain = process.argv[1]?.endsWith('build-txhsa-regions.ts');

if (isMain) {
  try {
    const result = buildTxhsaRegions();
    console.log('Built TXHSA region geojson:');
    for (const name of REGIONS) {
      const feature = result.regions[name].features[0];
      const geomType = feature?.geometry.type ?? '(empty)';
      console.log(
        `  ${name.padEnd(6)}  ${result.countyCounts[name].toString().padStart(3)} counties  →  ${geomType}`,
      );
    }
  } catch (err) {
    console.error('build:regions failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
