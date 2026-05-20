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
        buildTxhsaRegions({ sourcePath, outputDir, countyLookup: lookup, write: false }),
      ).toThrow(/Mystery/);
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
        sourcePath, outputDir, countyLookup: lookup, write: false,
      });

      const total = countyCounts.West + countyCounts.North + countyCounts.East + countyCounts.South;
      expect(total).toBe(source.features.length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
