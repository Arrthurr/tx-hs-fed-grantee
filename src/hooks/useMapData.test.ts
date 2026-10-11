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

  test('reports malformed raw records instead of publishing partial counts', async () => {
    const originalFetch = (global.fetch as jest.Mock).getMockImplementation()!;
    (global.fetch as jest.Mock).mockImplementation((url: string) => url.includes('headStartPrograms.json')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve([mockHeadStartProgramsData[0], { name: 42 }]) })
      : originalFetch(url));
    const { result } = renderHook(() => useMapData());
    await waitFor(() => expect(result.current.isLoadingPrograms).toBe(false));
    expect(result.current.programsError).toContain('Invalid program record at index 1');
    expect(result.current.headStartPrograms).toEqual([]);
    expect(result.current.regionProgramCounts).toBeNull();
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
      expect(counts).toEqual({ West: 0, North: 1, East: 0, South: 1 });
    });

    test('withholds all counts and warns when shared assignment fails', async () => {
      const originalFetch = (global.fetch as jest.Mock).getMockImplementation()!;
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('txhsa-geojson/north.geojson')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(regionFixture('North', -104, 32)) });
        }
        return originalFetch(url);
      });
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useMapData());
      await waitFor(() => {
        expect(result.current.isLoadingPrograms).toBe(false);
        expect(result.current.isLoadingRegions).toBe(false);
      });
      expect(result.current.txhsaRegions).toHaveLength(4);
      expect(result.current.headStartPrograms).toHaveLength(2);
      expect(result.current.regionProgramCounts).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        `[useMapData] Location ${result.current.headStartPrograms[0].id} matches 0 regions; counts withheld.`,
      );
      warn.mockRestore();
    });

    test('rejects a wrong-name region file without losing programs and recovers on retry', async () => {
      const originalFetch = (global.fetch as jest.Mock).getMockImplementation()!;
      const { result } = renderHook(() => useMapData());
      await waitFor(() => expect(result.current.regionProgramCounts).toEqual({ West: 0, North: 1, East: 0, South: 1 }));
      act(() => { result.current.toggleLayer('txhsaRegions'); });
      expect(result.current.layerVisibility.txhsaRegions).toBe(true);

      (global.fetch as jest.Mock).mockImplementation((url: string) => url.includes('txhsa-geojson/west.geojson')
        ? Promise.resolve({ ok: true, json: async () => regionFixtures.north })
        : originalFetch(url));
      await act(async () => { await result.current.loadTxhsaRegions(); });
      expect(result.current.regionsError).toContain('Invalid TXHSA region payload at /assets/txhsa-geojson/west.geojson');
      expect(result.current.txhsaRegions).toEqual([]);
      expect(result.current.regionProgramCounts).toBeNull();
      expect(result.current.layerVisibility.txhsaRegions).toBe(false);
      expect(result.current.headStartPrograms).toHaveLength(2);
      expect(result.current.programsError).toBeNull();
      expect(result.current.isLoadingRegions).toBe(false);

      (global.fetch as jest.Mock).mockImplementation(originalFetch);
      await act(async () => { result.current.retryLoading(); });
      expect(result.current.regionsError).toBeNull();
      expect(result.current.txhsaRegions.map(region => region.name)).toEqual(['West', 'North', 'East', 'South']);
      expect(result.current.regionProgramCounts).toEqual({ West: 0, North: 1, East: 0, South: 1 });
      expect(result.current.layerVisibility.txhsaRegions).toBe(false);
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

  describe('request lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.useRealTimers();
    });

    test('timeouts are errors, programs retry at 1/2/4 seconds then stop', async () => {
      (fetch as jest.Mock).mockImplementation((_url: string, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')), { once: true })));
      const { result, unmount } = renderHook(() => useMapData());
      await act(async () => { jest.advanceTimersByTime(10_000); });
      expect(result.current.programsError).toContain('timed out');
      expect(result.current.regionsError).toContain('timed out');
      expect(result.current.isLoading).toBe(false);
      for (const delay of [1000, 2000, 4000]) {
        await act(async () => { jest.advanceTimersByTime(delay - 1); });
        expect(result.current.isLoadingPrograms).toBe(false);
        await act(async () => { jest.advanceTimersByTime(1); });
        expect(result.current.isLoadingPrograms).toBe(true);
        await act(async () => { jest.advanceTimersByTime(10_000); });
        expect(result.current.programsError).toContain('timed out');
      }
      await act(async () => { jest.advanceTimersByTime(60_000); });
      expect((fetch as jest.Mock).mock.calls.filter(([url]) => url.includes('headStartPrograms')).length).toBe(4);
      expect(jest.getTimerCount()).toBe(0);
      unmount();
    });

    test('manual retry cancels backoff and recovers without an orphaned chain', async () => {
      const originalFetch = (fetch as jest.Mock).getMockImplementation()!;
      (fetch as jest.Mock).mockImplementation((url: string, options: RequestInit) =>
        url.includes('headStartPrograms') ? Promise.reject(new TypeError('Failed to fetch')) : originalFetch(url, options));
      const { result } = renderHook(() => useMapData());
      await act(async () => {});
      expect(result.current.programsError).toContain('Network error');
      (fetch as jest.Mock).mockImplementation(originalFetch);
      await act(async () => { result.current.retryLoading(); });
      expect(result.current.headStartPrograms).toHaveLength(2);
      expect(result.current.programsError).toBeNull();
      await act(async () => { jest.advanceTimersByTime(60_000); });
      expect((fetch as jest.Mock).mock.calls.filter(([url]) => url.includes('headStartPrograms')).length).toBe(2);
      expect(jest.getTimerCount()).toBe(0);
    });

    test('superseded responses cannot overwrite newer programs or loading state', async () => {
      const originalFetch = (fetch as jest.Mock).getMockImplementation()!;
      let resolveOld!: (response: unknown) => void;
      let oldSignal!: AbortSignal;
      (fetch as jest.Mock).mockImplementation((url: string, options: RequestInit) => {
        if (url.includes('headStartPrograms')) {
          oldSignal = options.signal!;
          return new Promise(resolve => { resolveOld = resolve; });
        }
        return originalFetch(url, options);
      });
      const { result } = renderHook(() => useMapData());
      await act(async () => {});
      (fetch as jest.Mock).mockImplementation(originalFetch);
      await act(async () => { result.current.loadHeadStartPrograms(); });
      expect(oldSignal.aborted).toBe(true);
      await act(async () => {
        resolveOld({ ok: true, json: async () => [{ ...mockHeadStartProgramsData[0], name: 'Stale location' }] });
      });
      expect(result.current.headStartPrograms.map(p => p.name)).toEqual(['Test Program 1', 'Test Program 2']);
      expect(result.current.programsError).toBeNull();
      expect(result.current.isLoadingPrograms).toBe(false);
      expect(jest.getTimerCount()).toBe(0);
    });

    test('unmount cancels requests and does not report errors or retry', async () => {
      const signals: AbortSignal[] = [];
      (fetch as jest.Mock).mockImplementation((_url: string, { signal }: RequestInit) => {
        signals.push(signal!);
        return new Promise((_resolve, reject) => signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')), { once: true }));
      });
      const { unmount } = renderHook(() => useMapData());
      await act(async () => { unmount(); });
      expect(signals.every(signal => signal.aborted)).toBe(true);
      await act(async () => { jest.advanceTimersByTime(60_000); });
      expect(fetch).toHaveBeenCalledTimes(5);
      expect(console.error).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    test('unmount during backoff cancels the scheduled automatic retry', async () => {
      (fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));
      const { unmount } = renderHook(() => useMapData());
      await act(async () => {});
      expect(jest.getTimerCount()).toBe(1);
      unmount();
      await act(async () => { jest.advanceTimersByTime(60_000); });
      expect(fetch).toHaveBeenCalledTimes(5);
      expect(jest.getTimerCount()).toBe(0);
    });

    test('failed region load aborts siblings and superseded regions cannot replace a recovery', async () => {
      const originalFetch = (fetch as jest.Mock).getMockImplementation()!;
      const pending: { resolve: (response: unknown) => void; signal: AbortSignal; slug: string }[] = [];
      (fetch as jest.Mock).mockImplementation((url: string, options: RequestInit) => {
        const match = url.match(/(west|north|east|south)\.geojson/);
        if (!match) return originalFetch(url, options);
        return new Promise(resolve => pending.push({ resolve, signal: options.signal!, slug: match[1] }));
      });
      const { result } = renderHook(() => useMapData());
      await act(async () => {});
      (fetch as jest.Mock).mockImplementation(originalFetch);
      await act(async () => { result.current.loadTxhsaRegions(); });
      expect(pending.every(request => request.signal.aborted)).toBe(true);
      await act(async () => {
        pending.forEach(request => request.resolve({ ok: true, json: async () => ({ features: [] }) }));
      });
      expect(result.current.txhsaRegions).toHaveLength(4);
      expect(result.current.regionsError).toBeNull();
      const signals: AbortSignal[] = [];
      (fetch as jest.Mock).mockImplementation((url: string, options: RequestInit) => {
        signals.push(options.signal!);
        return url.includes('east') ? Promise.resolve({ ok: false, status: 503 }) : new Promise(() => {});
      });
      await act(async () => { result.current.loadTxhsaRegions(); });
      expect(signals.every(signal => signal.aborted)).toBe(true);
      expect(result.current.regionsError).toContain('HTTP 503');
      expect(result.current.txhsaRegions).toEqual([]);
      expect(result.current.headStartPrograms).toHaveLength(2);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
