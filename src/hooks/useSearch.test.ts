import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';
import { HeadStartProgram, CongressionalDistrictFeature } from '../types/maps';

// Mock Google Maps API
const mockLatLngBounds = {
  extend: jest.fn().mockReturnThis(),
  isEmpty: jest.fn().mockReturnValue(false),
};

// Reset the mock implementation before each test
global.google = {
  ...global.google,
  maps: {
    ...global.google.maps,
    LatLngBounds: jest.fn().mockImplementation(() => mockLatLngBounds),
  },
};

describe('useSearch Hook', () => {
  // Sample test data
  const mockHeadStartPrograms: HeadStartProgram[] = [
    {
      id: 'program-1',
      name: 'Austin Head Start',
      address: '123 Main St, Austin, TX 78701',
      lat: 30.2672,
      lng: -97.7431,
      type: 'head-start',
      grantee: 'Austin ISD',
      funding: 1000000,
    },
    {
      id: 'program-2',
      name: 'Houston Early Head Start',
      address: '456 Oak Ave, Houston, TX 77002',
      lat: 29.7604,
      lng: -95.3698,
      type: 'early-head-start',
      grantee: 'Houston Community Services',
      funding: 2000000,
    },
    {
      id: 'program-3',
      name: 'Dallas Head Start Center',
      address: '789 Elm St, Dallas, TX 75201',
      lat: 32.7767,
      lng: -96.7970,
      type: 'head-start',
      grantee: 'Dallas County',
      funding: 1500000,
    },
  ];

  const mockCongressionalDistricts: CongressionalDistrictFeature[] = [
    {
      type: 'Feature',
      properties: {
        district: 'TX-1',
        name: 'Texas 1st Congressional District',
        representative: 'John Smith',
        districtNumber: 1,
        state: 'TX',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-97.0, 30.0],
          [-97.0, 31.0],
          [-96.0, 31.0],
          [-96.0, 30.0],
          [-97.0, 30.0],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        district: 'TX-2',
        name: 'Texas 2nd Congressional District',
        representative: 'Jane Doe',
        districtNumber: 2,
        state: 'TX',
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-95.0, 29.0],
              [-95.0, 30.0],
              [-94.0, 30.0],
              [-94.0, 29.0],
              [-95.0, 29.0],
            ],
          ],
        ],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with empty search term', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchResults.isSearchActive).toBe(false);
    expect(result.current.searchResults.totalResults).toBe(0);
  });

  test('updates search term when handleSearchChange is called', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('austin');
    });
    
    expect(result.current.searchTerm).toBe('austin');
    expect(result.current.isSearching).toBe(true);
  });

  test('clears search when clearSearch is called', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    // Set search term
    act(() => {
      result.current.handleSearchChange('austin');
    });
    
    // Clear search
    act(() => {
      result.current.clearSearch();
    });
    
    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchResults.isSearchActive).toBe(false);
  });

  test('filters programs by name', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('austin');
    });
    
    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].name).toBe('Austin Head Start');
  });

  test('filters programs by address', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('houston');
    });
    
    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].address).toContain('Houston');
  });

  test('filters programs by grantee', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('dallas county');
    });
    
    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].grantee).toBe('Dallas County');
  });

  test('filters districts by name', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('1st congressional');
    });
    
    expect(result.current.searchResults.districts.length).toBe(1);
    expect(result.current.searchResults.districts[0].properties.name).toBe('Texas 1st Congressional District');
  });

  test('filters districts by representative', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('jane');
    });
    
    expect(result.current.searchResults.districts.length).toBe(1);
    expect(result.current.searchResults.districts[0].properties.representative).toBe('Jane Doe');
  });

  test('filters districts by district number', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('2');
    });
    
    expect(result.current.searchResults.districts.length).toBe(1);
    expect(result.current.searchResults.districts[0].properties.districtNumber).toBe(2);
  });

  test('returns all programs and districts when search term is empty', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    expect(result.current.filteredPrograms.length).toBe(mockHeadStartPrograms.length);
    expect(result.current.filteredDistricts.length).toBe(mockCongressionalDistricts.length);
  });

  test('returns empty results when no matches found', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('nonexistent');
    });
    
    expect(result.current.searchResults.programs.length).toBe(0);
    expect(result.current.searchResults.districts.length).toBe(0);
    expect(result.current.searchResults.totalResults).toBe(0);
  });

  test('finds program by ID', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    const program = result.current.findProgramById('program-2');
    expect(program).toBeDefined();
    expect(program?.name).toBe('Houston Early Head Start');
  });

  test('finds district by number', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    const district = result.current.findDistrictByNumber(1);
    expect(district).toBeDefined();
    expect(district?.properties.name).toBe('Texas 1st Congressional District');
  });

  test('returns null for getSearchResultsBounds when search is not active', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    const bounds = result.current.getSearchResultsBounds();
    expect(bounds).toBeNull();
  });

  test('creates bounds for search results when search is active', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('head start');
    });
    
    const bounds = result.current.getSearchResultsBounds();
    expect(bounds).not.toBeNull();
    expect(mockLatLngBounds.extend).toHaveBeenCalled();
  });

  test('respects minSearchLength option', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts, { minSearchLength: 3 })
    );
    
    // Search term shorter than minSearchLength
    act(() => {
      result.current.handleSearchChange('ab');
    });
    
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchResults.isSearchActive).toBe(false);
    
    // Search term equal to minSearchLength
    act(() => {
      result.current.handleSearchChange('abc');
    });
    
    expect(result.current.isSearching).toBe(true);
    expect(result.current.searchResults.isSearchActive).toBe(true);
  });

  test('respects includePrograms option', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts, { includePrograms: false })
    );
    
    act(() => {
      result.current.handleSearchChange('austin');
    });
    
    // Should not include programs in search results
    expect(result.current.searchResults.programs.length).toBe(0);
  });

  test('respects includeDistricts option', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts, { includeDistricts: false })
    );
    
    act(() => {
      result.current.handleSearchChange('texas');
    });
    
    // Should not include districts in search results
    expect(result.current.searchResults.districts.length).toBe(0);
  });

  test('performs case-insensitive search', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('AUSTIN');
    });
    
    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].name).toBe('Austin Head Start');
  });

  test('handles search with leading/trailing whitespace', () => {
    const { result } = renderHook(() => 
      useSearch(mockHeadStartPrograms, mockCongressionalDistricts)
    );
    
    act(() => {
      result.current.handleSearchChange('  austin  ');
    });
    
    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].name).toBe('Austin Head Start');
  });
});