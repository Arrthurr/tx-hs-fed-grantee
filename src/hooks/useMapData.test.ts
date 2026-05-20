import { renderHook, act, waitFor } from '@testing-library/react';
import { useMapDataInternal as useMapData } from './useMapData';

global.fetch = jest.fn();

const mockHeadStartProgramsData = [
  {
    name: 'Test Program 1',
    address: '123 Test St, Austin, TX',
    coordinates: { lat: 30.2672, lng: -97.7431 },
  },
  {
    name: 'Test Program 2',
    address: '456 Test Ave, Houston, TX',
    coordinates: { lat: 29.7604, lng: -95.3698 },
  },
];

// Helper to build a region geojson covering a 2x2 lng/lat box.
const regionFixture = (name: 'West' | 'North' | 'East' | 'South', minLng: number, minLat: number) => ({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat],
        [minLng + 2, minLat],
        [minLng + 2, minLat + 2],
        [minLng, minLat + 2],
        [minLng, minLat],
      ]],
    },
  }],
});

// Fixture geometry chosen so every mock program lands in exactly one region.
// Houston in the test data sits at lat 29.76, so the south fixture spans
// 29 -> 31 vertically; Austin (30.27) falls in north (-99 .. -97 lng).
const regionFixtures: Record<string, ReturnType<typeof regionFixture>> = {
  west:  regionFixture('West',  -101, 30),
  north: regionFixture('North',  -99, 30),
  east:  regionFixture('East',   -97, 30),
  south: regionFixture('South',  -96, 29),
};

describe('useMapData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('headStartPrograms.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHeadStartProgramsData),
        });
      }
      const regionMatch = url.match(/txhsa-geojson\/(west|north|east|south)\.geojson/);
      if (regionMatch) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(regionFixtures[regionMatch[1]]),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  test('initializes with default layer visibility', () => {
    const { result } = renderHook(() => useMapData());

    expect(result.current.layerVisibility).toEqual({
      majorCities: false,
      counties: false,
      headStartPrograms: true,
      txhsaRegions: false,
    });
  });

  test('toggles layer visibility', () => {
    const { result } = renderHook(() => useMapData());

    expect(result.current.layerVisibility.headStartPrograms).toBe(true);
    expect(result.current.layerVisibility.txhsaRegions).toBe(false);

    act(() => {
      result.current.toggleLayer('txhsaRegions');
    });
    expect(result.current.layerVisibility.txhsaRegions).toBe(true);

    act(() => {
      result.current.toggleLayer('headStartPrograms');
    });
    expect(result.current.layerVisibility.headStartPrograms).toBe(false);
  });

  test('loads Head Start programs data', async () => {
    const { result } = renderHook(() => useMapData());

    expect(result.current.isLoadingPrograms).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingPrograms).toBe(false);
    });

    expect(result.current.headStartPrograms.length).toBe(mockHeadStartProgramsData.length);
    expect(result.current.headStartPrograms[0].name).toBe(mockHeadStartProgramsData[0].name);
  });

  test('handles fetch errors for Head Start programs', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('headStartPrograms.json')) {
        return Promise.reject(new Error('Failed to fetch programs'));
      }
      const regionMatch = url.match(/txhsa-geojson\/(west|north|east|south)\.geojson/);
      if (regionMatch) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(regionFixtures[regionMatch[1]]) });
      }
      return Promise.reject(new Error('Not found'));
    });

    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.programsError).toBeTruthy();
    });
    expect(result.current.hasErrors).toBe(true);
  });

  test('returns programs based on layer visibility', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.isLoadingPrograms).toBe(false);
    });

    expect(result.current.headStartPrograms.length).toBe(mockHeadStartProgramsData.length);

    act(() => {
      result.current.toggleLayer('headStartPrograms');
    });
    expect(result.current.layerVisibility.headStartPrograms).toBe(false);
  });

  describe('TXHSA regions', () => {
    test('loads the four region files in parallel and exposes them', async () => {
      const { result } = renderHook(() => useMapData());

      await waitFor(() => {
        expect(result.current.isLoadingRegions).toBe(false);
      });

      expect(result.current.txhsaRegions).toHaveLength(4);
      expect(result.current.txhsaRegions.map(r => r.name).sort())
        .toEqual(['East', 'North', 'South', 'West']);
      expect(result.current.regionsError).toBeNull();
    });

    test('reports regionsError when any one region fetch fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('headStartPrograms.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHeadStartProgramsData) });
        }
        if (url.includes('txhsa-geojson/east.geojson')) {
          return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
        }
        const m = url.match(/txhsa-geojson\/(west|north|south)\.geojson/);
        if (m) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(regionFixtures[m[1]]) });
        }
        return Promise.reject(new Error('Not found'));
      });

      const { result } = renderHook(() => useMapData());
      await waitFor(() => {
        expect(result.current.regionsError).toBeTruthy();
      });
      expect(result.current.txhsaRegions).toHaveLength(0);
    });

    test('computes per-region program counts via point-in-polygon', async () => {
      const { result } = renderHook(() => useMapData());

      await waitFor(() => {
        expect(result.current.isLoadingPrograms).toBe(false);
        expect(result.current.isLoadingRegions).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.regionProgramCounts).not.toBeNull();
      });

      const counts = result.current.regionProgramCounts!;
      const total = counts.West + counts.North + counts.East + counts.South;
      // R10 invariant: every program is counted in exactly one region.
      expect(total).toBe(result.current.headStartPrograms.length);
      for (const name of ['West', 'North', 'East', 'South'] as const) {
        expect(Number.isInteger(counts[name])).toBe(true);
        expect(counts[name]).toBeGreaterThanOrEqual(0);
      }
    });

    test('reports regionsError when a region payload is malformed (HTTP 200, bad shape)', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('headStartPrograms.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockHeadStartProgramsData) });
        }
        if (url.includes('txhsa-geojson/west.geojson')) {
          // Recognized-shape FeatureCollection but with an unknown region name
          // -- validateTxhsaRegion should reject this and trigger regionsError.
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: { name: 'Central' },
                geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
              }],
            }),
          });
        }
        const m = url.match(/txhsa-geojson\/(north|east|south)\.geojson/);
        if (m) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(regionFixtures[m[1]]) });
        }
        return Promise.reject(new Error('Not found'));
      });

      const { result } = renderHook(() => useMapData());
      await waitFor(() => {
        expect(result.current.regionsError).toBeTruthy();
      });
      expect(result.current.txhsaRegions).toHaveLength(0);
    });
  });

  test('reloads programs when calling load function', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.isLoadingPrograms).toBe(false);
    });

    (global.fetch as jest.Mock).mockClear();
    act(() => {
      result.current.loadHeadStartPrograms();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/assets/geojson/headStartPrograms.json',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  test('hook return value does not include legacy district / congress fields', () => {
    const { result } = renderHook(() => useMapData());
    expect(result.current).not.toHaveProperty('districts');
    expect(result.current).not.toHaveProperty('congressionalDistricts');
    expect(result.current).not.toHaveProperty('rawDistrictFeatures');
    expect(result.current).not.toHaveProperty('districtsError');
    expect(result.current).not.toHaveProperty('congressDataError');
    expect(result.current).not.toHaveProperty('loadCongressionalDistricts');
    expect(result.current).not.toHaveProperty('loadCongressionalData');
    expect(result.current.layerVisibility).not.toHaveProperty('districtBoundaries');
  });
});
