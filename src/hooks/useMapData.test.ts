import { renderHook, act } from '@testing-library/react';
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
      
      return Promise.reject(new Error('Not found'));
    });
  });

  test('initializes with default layer visibility', () => {
    const { result } = renderHook(() => useMapData());
    
    expect(result.current.layerVisibility).toEqual({
      majorCities: false,
      congressionalDistricts: false,
      counties: false,
      headStartPrograms: true
    });
  });

  test('toggles layer visibility', () => {
    const { result } = renderHook(() => useMapData());
    
    // Initially, headStartPrograms should be true and congressionalDistricts should be false
    expect(result.current.layerVisibility.headStartPrograms).toBe(true);
    expect(result.current.layerVisibility.congressionalDistricts).toBe(false);
    
    // Toggle congressionalDistricts layer
    act(() => {
      result.current.toggleLayer('congressionalDistricts');
    });
    
    // Now congressionalDistricts should be true
    expect(result.current.layerVisibility.congressionalDistricts).toBe(true);
    
    // Toggle headStartPrograms layer
    act(() => {
      result.current.toggleLayer('headStartPrograms');
    });
    
    // Now headStartPrograms should be false
    expect(result.current.layerVisibility.headStartPrograms).toBe(false);
  });

  test('sets specific layer visibility', () => {
    const { result } = renderHook(() => useMapData());
    
    // Set congressionalDistricts to true
    act(() => {
      result.current.setLayerVisibilityState('congressionalDistricts', true);
    });
    
    // congressionalDistricts should be true
    expect(result.current.layerVisibility.congressionalDistricts).toBe(true);
    
    // Set headStartPrograms to false
    act(() => {
      result.current.setLayerVisibilityState('headStartPrograms', false);
    });
    
    // headStartPrograms should be false
    expect(result.current.layerVisibility.headStartPrograms).toBe(false);
  });

  test('loads Head Start programs data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMapData());
    
    // Initially, isLoading should be true
    expect(result.current.isLoadingPrograms).toBe(true);
    
    // Wait for data to load
    await waitForNextUpdate();
    
    // After loading, isLoading should be false
    expect(result.current.isLoadingPrograms).toBe(false);
    
    // Check if programs were loaded
    expect(result.current.headStartPrograms.length).toBe(mockHeadStartProgramsData.length);
    expect(result.current.headStartPrograms[0].name).toBe(mockHeadStartProgramsData[0].name);
  });

  test('loads congressional districts data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMapData());
    
    // Initially, isLoading should be true
    expect(result.current.isLoadingDistricts).toBe(true);
    
    // Wait for data to load
    await waitForNextUpdate();
    
    // After loading, isLoading should be false
    expect(result.current.isLoadingDistricts).toBe(false);
    
    // Check if districts were loaded
    expect(result.current.congressionalDistricts.length).toBeGreaterThan(0);
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
    
    const { result, waitForNextUpdate } = renderHook(() => useMapData());
    
    // Wait for error to be set
    await waitForNextUpdate();
    
    // Check if error was set
    expect(result.current.programsError).toBeTruthy();
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
    
    const { result, waitForNextUpdate } = renderHook(() => useMapData());
    
    // Wait for error to be set
    await waitForNextUpdate();
    
    // Check if error was set
    expect(result.current.districtsError).toBeTruthy();
    expect(result.current.hasErrors).toBe(true);
  });

  test('returns visible programs based on layer visibility', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMapData());
    
    // Wait for data to load
    await waitForNextUpdate();
    
    // Initially, headStartPrograms layer is visible
    expect(result.current.visibleHeadStartPrograms.length).toBe(mockHeadStartProgramsData.length);
    
    // Toggle headStartPrograms layer off
    act(() => {
      result.current.toggleLayer('headStartPrograms');
    });
    
    // Now visibleHeadStartPrograms should be empty
    expect(result.current.visibleHeadStartPrograms.length).toBe(0);
  });

  test('returns visible districts based on layer visibility', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMapData());
    
    // Wait for data to load
    await waitForNextUpdate();
    
    // Initially, congressionalDistricts layer is not visible
    expect(result.current.visibleCongressionalDistricts.length).toBe(0);
    
    // Toggle congressionalDistricts layer on
    act(() => {
      result.current.toggleLayer('congressionalDistricts');
    });
    
    // Now visibleCongressionalDistricts should have items
    expect(result.current.visibleCongressionalDistricts.length).toBeGreaterThan(0);
  });

  test('reloads data when calling load functions', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMapData());
    
    // Wait for initial data to load
    await waitForNextUpdate();
    
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