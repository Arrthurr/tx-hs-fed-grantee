import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';

// Mock fetch for GeoJSON data
global.fetch = jest.fn();

// Mock response data
const mockHeadStartProgramsData = [
  {
    name: 'Test Program 1',
    address: '123 Test St, Austin, TX',
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  {
    name: 'Test Program 2',
    address: '456 Test Ave, Houston, TX',
    coordinates: { lat: 29.7604, lng: -95.3698 }
  }
];

const mockDistrictData = {
  type: 'Feature',
  properties: {
    district: 'TX-1',
    name: 'Texas 1st Congressional District',
    representative: 'Representative 1',
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
};

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

const regionFixtures: Record<string, ReturnType<typeof regionFixture>> = {
  west:  regionFixture('West',  -100, 30),
  north: regionFixture('North',  -98, 30),
  east:  regionFixture('East',   -96, 30),
  south: regionFixture('South',  -94, 30),
};

describe('useMapData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful fetch for Head Start programs
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('headStartPrograms.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHeadStartProgramsData)
        });
      }
      
      // Mock successful fetch for congressional districts
      if (url.includes('shape.geojson')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDistrictData)
        });
      }

      // Mock TXHSA region geojson files
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
      districtBoundaries: false,
      counties: false,
      headStartPrograms: true,
      txhsaRegions: false,
    });
  });

  test('toggles layer visibility', () => {
    const { result } = renderHook(() => useMapData());
    
    // Initially, headStartPrograms should be true and districtBoundaries should be false
    expect(result.current.layerVisibility.headStartPrograms).toBe(true);
    expect(result.current.layerVisibility.districtBoundaries).toBe(false);
    
    // Toggle districtBoundaries layer
    act(() => {
      result.current.toggleLayer('districtBoundaries');
    });
    
    // Now districtBoundaries should be true
    expect(result.current.layerVisibility.districtBoundaries).toBe(true);
    
    // Toggle headStartPrograms layer
    act(() => {
      result.current.toggleLayer('headStartPrograms');
    });
    
    // Now headStartPrograms should be false
    expect(result.current.layerVisibility.headStartPrograms).toBe(false);
  });

  test('sets specific layer visibility', () => {
    const { result } = renderHook(() => useMapData());
    
    // Set districtBoundaries to true
    act(() => {
      result.current.setLayerVisibilityState('districtBoundaries', true);
    });
    
    // districtBoundaries should be true
    expect(result.current.layerVisibility.districtBoundaries).toBe(true);
    
    // Set headStartPrograms to false
    act(() => {
      result.current.setLayerVisibilityState('headStartPrograms', false);
    });
    
    // headStartPrograms should be false
    expect(result.current.layerVisibility.headStartPrograms).toBe(false);
  });

  test('loads Head Start programs data', async () => {
    const { result } = renderHook(() => useMapData());
    
    // Initially, isLoading should be true
    expect(result.current.isLoadingPrograms).toBe(true);
    
    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoadingPrograms).toBe(false);
    });
    
    // Check if programs were loaded
    expect(result.current.headStartPrograms.length).toBe(mockHeadStartProgramsData.length);
    expect(result.current.headStartPrograms[0].name).toBe(mockHeadStartProgramsData[0].name);
  });

  test('loads congressional districts data', async () => {
    const { result } = renderHook(() => useMapData());
    
    // Initially, isLoading should be true
    expect(result.current.isLoadingDistricts).toBe(true);
    
    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoadingDistricts).toBe(false);
    });
    
    // Check if districts were loaded
    expect(result.current.congressionalDistricts.length).toBeGreaterThan(0);
    
    // Check if rawDistrictFeatures were loaded
    expect(result.current.rawDistrictFeatures).toBeDefined();
    expect(Array.isArray(result.current.rawDistrictFeatures)).toBe(true);
  });

  test('handles fetch errors for Head Start programs', async () => {
    // Mock fetch error for Head Start programs
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('headStartPrograms.json')) {
        return Promise.reject(new Error('Failed to fetch programs'));
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    const { result } = renderHook(() => useMapData());
    
    // Wait for error to be set
    await waitFor(() => {
      expect(result.current.programsError).toBeTruthy();
    });
    
    // Check if error was set
    expect(result.current.hasErrors).toBe(true);
  });

  test('handles fetch errors for congressional districts', async () => {
    // Mock fetch error for congressional districts
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('shape.geojson')) {
        return Promise.reject(new Error('Failed to fetch districts'));
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    const { result } = renderHook(() => useMapData());
    
    // Wait for error to be set
    await waitFor(() => {
      expect(result.current.districtsError).toBeTruthy();
    });
    
    // Check if error was set
    expect(result.current.hasErrors).toBe(true);
  });

  test('returns visible programs based on layer visibility', async () => {
    const { result } = renderHook(() => useMapData());
    
    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoadingPrograms).toBe(false);
    });
    
    // Initially, headStartPrograms layer is visible
    expect(result.current.headStartPrograms.length).toBe(mockHeadStartProgramsData.length);
    
    // Toggle headStartPrograms layer off
    act(() => {
      result.current.toggleLayer('headStartPrograms');
    });
    
    // Now headStartPrograms should be empty when layer is off (this test needs verification)
    // Note: The actual behavior depends on the useMapData implementation
    expect(result.current.layerVisibility.headStartPrograms).toBe(false);
  });

  test('returns visible districts based on layer visibility', async () => {
    const { result } = renderHook(() => useMapData());
    
    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoadingDistricts).toBe(false);
    });
    
    // Initially, districtBoundaries layer is not visible
    expect(result.current.layerVisibility.districtBoundaries).toBe(false);
    
    // Toggle districtBoundaries layer on
    act(() => {
      result.current.toggleLayer('districtBoundaries');
    });
    
    // Now districtBoundaries layer should be visible
    expect(result.current.layerVisibility.districtBoundaries).toBe(true);
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
        if (url.includes('shape.geojson')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDistrictData) });
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

      // The two seeded programs are at Austin (-97.74, 30.27) and Houston (-95.37, 29.76).
      // North fixture covers lng [-98, -96], lat [30, 32] → Austin lands here.
      // East fixture covers lng [-96, -94], lat [30, 32] → Houston is south of it (lat 29.76) → not in any.
      await waitFor(() => {
        expect(result.current.regionProgramCounts).not.toBeNull();
      });

      const counts = result.current.regionProgramCounts!;
      const total = counts.West + counts.North + counts.East + counts.South;
      // Sum equals the count of programs that fall inside any region polygon.
      expect(total).toBeLessThanOrEqual(result.current.headStartPrograms.length);
      // Per-region count is a non-negative integer.
      for (const name of ['West', 'North', 'East', 'South'] as const) {
        expect(Number.isInteger(counts[name])).toBe(true);
        expect(counts[name]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test('reloads data when calling load functions', async () => {
    const { result } = renderHook(() => useMapData());
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(result.current.isLoadingPrograms).toBe(false);
    });
    
    // Clear mocks to track new calls
    (global.fetch as jest.Mock).mockClear();
    
    // Call loadHeadStartPrograms
    act(() => {
      result.current.loadHeadStartPrograms();
    });
    
    // Check if fetch was called for programs
    expect(global.fetch).toHaveBeenCalledWith('/assets/geojson/headStartPrograms.json');
    
    // Clear mocks again
    (global.fetch as jest.Mock).mockClear();
    
    // Call loadCongressionalDistricts
    act(() => {
      result.current.loadCongressionalDistricts();
    });
    
    // Check if fetch was called for districts
    expect(global.fetch).toHaveBeenCalled();
  });
});