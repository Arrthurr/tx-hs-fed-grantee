import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';
import { HeadStartProgram } from '../types/maps';

const mockLatLngBounds = {
  extend: jest.fn().mockReturnThis(),
  isEmpty: jest.fn().mockReturnValue(false),
};
const mockLatLngBoundsConstructor = jest.fn().mockImplementation(() => mockLatLngBounds);
global.google = {
  ...global.google,
  maps: {
    ...global.google.maps,
    LatLngBounds: mockLatLngBoundsConstructor as any,
  },
};

describe('useSearch Hook', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with empty search term', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchResults.isSearchActive).toBe(false);
    expect(result.current.searchResults.totalResults).toBe(0);
  });

  test('updates search term when handleSearchChange is called', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('austin');
    });

    expect(result.current.searchTerm).toBe('austin');
    expect(result.current.isSearching).toBe(true);
  });

  test('clears search when clearSearch is called', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('austin');
    });
    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchResults.isSearchActive).toBe(false);
  });

  test('filters programs by name', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('austin');
    });

    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].name).toBe('Austin Head Start');
  });

  test('filters programs by address', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('houston');
    });

    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].address).toContain('Houston');
  });

  test('filters programs by grantee', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('dallas county');
    });

    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].grantee).toBe('Dallas County');
  });

  test('returns all programs when search term is empty', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));
    expect(result.current.filteredPrograms.length).toBe(mockHeadStartPrograms.length);
  });

  test('returns empty results when no matches found', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('nonexistent');
    });

    expect(result.current.searchResults.programs.length).toBe(0);
    expect(result.current.searchResults.totalResults).toBe(0);
  });

  test('searching for a former representative name returns zero matches', () => {
    // Programs do not carry representative metadata, so searching for a
    // former Texas rep name should match nothing.
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('Lloyd Doggett');
    });

    expect(result.current.searchResults.programs.length).toBe(0);
    expect(result.current.searchResults).not.toHaveProperty('districts');
  });

  test('hook return value does not include districts or findDistrictByNumber', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));
    expect(result.current).not.toHaveProperty('filteredDistricts');
    expect(result.current).not.toHaveProperty('findDistrictByNumber');
    expect(result.current.searchResults).not.toHaveProperty('districts');
  });

  test('finds program by ID', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));
    const program = result.current.findProgramById('program-2');
    expect(program).toBeDefined();
    expect(program?.name).toBe('Houston Early Head Start');
  });

  test('returns null for getSearchResultsBounds when search is not active', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));
    expect(result.current.getSearchResultsBounds()).toBeNull();
  });

  test('creates bounds for search results when search is active', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('head start');
    });

    const bounds = result.current.getSearchResultsBounds();
    expect(bounds).not.toBeNull();
    expect(mockLatLngBounds.extend).toHaveBeenCalled();
  });

  test('respects minSearchLength option', () => {
    const { result } = renderHook(() =>
      useSearch(mockHeadStartPrograms, { minSearchLength: 3 })
    );

    act(() => {
      result.current.handleSearchChange('ab');
    });
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchResults.isSearchActive).toBe(false);

    act(() => {
      result.current.handleSearchChange('abc');
    });
    expect(result.current.isSearching).toBe(true);
    expect(result.current.searchResults.isSearchActive).toBe(true);
  });

  test('respects includePrograms option', () => {
    const { result } = renderHook(() =>
      useSearch(mockHeadStartPrograms, { includePrograms: false })
    );

    act(() => {
      result.current.handleSearchChange('austin');
    });

    expect(result.current.searchResults.programs.length).toBe(0);
  });

  test('performs case-insensitive search', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('AUSTIN');
    });

    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].name).toBe('Austin Head Start');
  });

  test('handles search with leading/trailing whitespace', () => {
    const { result } = renderHook(() => useSearch(mockHeadStartPrograms));

    act(() => {
      result.current.handleSearchChange('  austin  ');
    });

    expect(result.current.searchResults.programs.length).toBe(1);
    expect(result.current.searchResults.programs[0].name).toBe('Austin Head Start');
  });
});
