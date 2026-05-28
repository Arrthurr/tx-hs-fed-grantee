import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildTxhsaRegions } from '../build-txhsa-regions';

type RegionNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

function square(cx: number, cy: number, half = 0.5) {
  return {
    type: 'Polygon' as const,
    coordinates: [[
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx + half, cy + half],
      [cx - half, cy + half],
      [cx - half, cy - half],
    ]],
  };
}

function makeWorkspace() {
  const dir = mkdtempSync(join(tmpdir(), 'txhsa-test-'));
  const sourcePath = join(dir, 'source.geojson');
  const outputDir = join(dir, 'out');
  return { dir, sourcePath, outputDir };
}

describe('buildTxhsaRegions', () => {
  it('dissolves adjacent counties in the same region and assigns names', () => {
    const { dir, sourcePath, outputDir } = makeWorkspace();
    try {
      // Two adjacent counties in TDEM 1 (west), one in TDEM 7 (also west),
      // one in TDEM 2 (north). Coastal squares so adjacency dissolves cleanly.
      const source = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: square(0, 0) },
          { type: 'Feature', properties: { COUNTY: 'B County' }, geometry: square(1, 0) },
          { type: 'Feature', properties: { COUNTY: 'C County' }, geometry: square(10, 10) },
          { type: 'Feature', properties: { COUNTY: 'D County' }, geometry: square(20, 20) },
        ],
      };
      writeFileSync(sourcePath, JSON.stringify(source));

      const lookup: Record<string, RegionNum> = { A: 1, B: 1, C: 7, D: 2 };

      const { regions, countyCounts } = buildTxhsaRegions({
        sourcePath, outputDir, countyLookup: lookup, write: true,
        countyOverrides: {}, requireAllRegionsPopulated: false,
      });

      expect(countyCounts).toEqual({ West: 3, North: 1, East: 0, South: 0 });
      expect(regions.West.features).toHaveLength(1);
      expect(regions.West.features[0].properties.name).toBe('West');
      expect(regions.North.features).toHaveLength(1);
      expect(regions.North.features[0].properties.name).toBe('North');
      expect(regions.East.features).toHaveLength(0);
      expect(regions.South.features).toHaveLength(0);

      // Files written for all four names, even empty ones (consistent runtime fetch shape).
      for (const name of ['west', 'north', 'east', 'south']) {
        const fp = join(outputDir, `${name}.geojson`);
        expect(existsSync(fp)).toBe(true);
        const written = JSON.parse(readFileSync(fp, 'utf-8'));
        expect(written.type).toBe('FeatureCollection');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits with an error naming missing counties when lookup is incomplete', () => {
    const { dir, sourcePath, outputDir } = makeWorkspace();
    try {
      const source = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { COUNTY: 'Known County' }, geometry: square(0, 0) },
          { type: 'Feature', properties: { COUNTY: 'Mystery County' }, geometry: square(1, 0) },
        ],
      };
      writeFileSync(sourcePath, JSON.stringify(source));
      const lookup: Record<string, RegionNum> = { Known: 1 };

      expect(() =>
        buildTxhsaRegions({ sourcePath, outputDir, countyLookup: lookup, countyOverrides: {}, write: false }),
      ).toThrow(/Mystery/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when requireAllRegionsPopulated is true and any region is empty', () => {
    const { dir, sourcePath, outputDir } = makeWorkspace();
    try {
      // Only counties in TDEM 1 (west) -- north / east / south will all be empty.
      const source = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: square(0, 0) },
          { type: 'Feature', properties: { COUNTY: 'B County' }, geometry: square(1, 0) },
        ],
      };
      writeFileSync(sourcePath, JSON.stringify(source));
      const lookup: Record<string, RegionNum> = { A: 1, B: 1 };

      expect(() =>
        buildTxhsaRegions({
          sourcePath, outputDir, countyLookup: lookup, countyOverrides: {}, write: false,
          requireAllRegionsPopulated: true,
        }),
      ).toThrow(/North|East|South/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws a clear error when @turf/union returns null for a region', () => {
    const { dir, sourcePath, outputDir } = makeWorkspace();
    try {
      // Two counties at the SAME center with identical 1-degree squares so
      // @turf/union sees overlapping geometries that the lib reports as null
      // for the merged result. (Some union implementations return null on
      // certain degenerate inputs; the build script's null-guard turns that
      // into an explicit failure rather than silent bad output.)
      const degenerate = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]],
      };
      const source = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: degenerate },
          { type: 'Feature', properties: { COUNTY: 'B County' }, geometry: degenerate },
          { type: 'Feature', properties: { COUNTY: 'C County' }, geometry: square(5, 5) },
          { type: 'Feature', properties: { COUNTY: 'D County' }, geometry: square(10, 10) },
          { type: 'Feature', properties: { COUNTY: 'E County' }, geometry: square(15, 15) },
        ],
      };
      writeFileSync(sourcePath, JSON.stringify(source));
      // A,B → West (TDEM 1+7); C → North (TDEM 2); D → East (TDEM 4); E → South (TDEM 5).
      const lookup: Record<string, RegionNum> = { A: 1, B: 7, C: 2, D: 4, E: 5 };

      // Either union returns null (-> our explicit "Union produced no result" error)
      // or it throws internally because the inputs aren't valid polygons. Either way
      // the script must fail rather than write a corrupted region file.
      expect(() =>
        buildTxhsaRegions({
          sourcePath, outputDir, countyLookup: lookup, countyOverrides: {}, write: false,
          requireAllRegionsPopulated: false,
        }),
      ).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('applies countyOverrides over the default tdemToTxhsaRegion mapping', () => {
    const { dir, sourcePath, outputDir } = makeWorkspace();
    try {
      // Four counties whose TDEM regions would default-route them to:
      // A,B,C → North (TDEM 3), D → East (TDEM 4). With no override, that's
      // 3 North + 1 East. Overriding B → East flips one to East: 2 + 2.
      const source = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: square(0, 0) },
          { type: 'Feature', properties: { COUNTY: 'B County' }, geometry: square(5, 0) },
          { type: 'Feature', properties: { COUNTY: 'C County' }, geometry: square(10, 0) },
          { type: 'Feature', properties: { COUNTY: 'D County' }, geometry: square(15, 0) },
        ],
      };
      writeFileSync(sourcePath, JSON.stringify(source));
      const lookup: Record<string, RegionNum> = { A: 3, B: 3, C: 3, D: 4 };

      const withoutOverride = buildTxhsaRegions({
        sourcePath, outputDir, countyLookup: lookup, write: false,
        requireAllRegionsPopulated: false, countyOverrides: {},
      });
      expect(withoutOverride.countyCounts).toEqual({ West: 0, North: 3, East: 1, South: 0 });

      const withOverride = buildTxhsaRegions({
        sourcePath, outputDir, countyLookup: lookup, write: false,
        requireAllRegionsPopulated: false,
        countyOverrides: { B: 'East' },
      });
      expect(withOverride.countyCounts).toEqual({ West: 0, North: 2, East: 2, South: 0 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when a countyOverrides key matches no county in the source', () => {
    const { dir, sourcePath, outputDir } = makeWorkspace();
    try {
      const source = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: square(0, 0) },
          { type: 'Feature', properties: { COUNTY: 'B County' }, geometry: square(5, 0) },
        ],
      };
      writeFileSync(sourcePath, JSON.stringify(source));
      const lookup: Record<string, RegionNum> = { A: 3, B: 4 };

      // 'Typo' is not a county in the source -- the override is dead and would
      // silently no-op without the guard.
      expect(() =>
        buildTxhsaRegions({
          sourcePath, outputDir, countyLookup: lookup, write: false,
          requireAllRegionsPopulated: false,
          countyOverrides: { Typo: 'East' },
        }),
      ).toThrow(/Typo/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('places every input feature in exactly one output region', () => {
    const { dir, sourcePath, outputDir } = makeWorkspace();
    try {
      const source = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { COUNTY: 'A County' }, geometry: square(0, 0) },
          { type: 'Feature', properties: { COUNTY: 'B County' }, geometry: square(5, 0) },
          { type: 'Feature', properties: { COUNTY: 'C County' }, geometry: square(10, 0) },
          { type: 'Feature', properties: { COUNTY: 'D County' }, geometry: square(15, 0) },
        ],
      };
      writeFileSync(sourcePath, JSON.stringify(source));
      // One county per TXHSA region via the merge mapping:
      // 1→West, 2→North, 4→East, 5→South.
      const lookup: Record<string, RegionNum> = { A: 1, B: 2, C: 4, D: 5 };

      const { countyCounts } = buildTxhsaRegions({
        sourcePath, outputDir, countyLookup: lookup, countyOverrides: {}, write: false,
        requireAllRegionsPopulated: false,
      });

      const total = countyCounts.West + countyCounts.North + countyCounts.East + countyCounts.South;
      expect(total).toBe(source.features.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
