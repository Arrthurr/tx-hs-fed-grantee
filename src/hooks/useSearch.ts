import { useState, useCallback, useMemo } from 'react';
import { HeadStartProgram, CongressionalDistrictFeature } from '../types/maps';

/**
 * Search options for filtering data
 */
interface SearchOptions {
  /** Whether to search in Head Start programs */
  includePrograms: boolean;
  /** Whether to search in congressional districts */
  includeDistricts: boolean;
  /** Minimum search term length to trigger search */
  minSearchLength: number;
}

/**
 * Search results containing filtered data
 */
interface SearchResults {
  /** Filtered Head Start programs */
  programs: HeadStartProgram[];
  /** Filtered congressional districts */
  districts: CongressionalDistrictFeature[];
  /** Whether the search is active */
  isSearchActive: boolean;
  /** Total number of results */
  totalResults: number;
}

/**
 * Custom hook for search functionality
 * Provides search capabilities for Head Start programs and congressional districts
 */
export const useSearch = (
  allPrograms: HeadStartProgram[],
  allDistricts: CongressionalDistrictFeature[],
  options: Partial<SearchOptions> = {}
) => {
  // Default search options
  const searchOptions: SearchOptions = {
    includePrograms: true,
    includeDistricts: true,
    minSearchLength: 2,
    ...options
  };

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  /**
   * Filter Head Start programs based on search term
   */
  const filteredPrograms = useMemo(() => {
    if (!searchTerm || !searchOptions.includePrograms || searchTerm.length < searchOptions.minSearchLength) {
      return allPrograms;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return allPrograms.filter(program => 
      program.name.toLowerCase().includes(term) ||
      program.address.toLowerCase().includes(term) ||
      (program.grantee && program.grantee.toLowerCase().includes(term))
    );
  }, [searchTerm, allPrograms, searchOptions.includePrograms, searchOptions.minSearchLength]);

  /**
   * Filter congressional districts based on search term
   */
  const filteredDistricts = useMemo(() => {
    if (!searchTerm || !searchOptions.includeDistricts || searchTerm.length < searchOptions.minSearchLength) {
      return allDistricts;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return allDistricts.filter(district => 
      district.properties.name.toLowerCase().includes(term) ||
      district.properties.representative.toLowerCase().includes(term) ||
      district.properties.district.toLowerCase().includes(term) ||
      district.properties.districtNumber.toString().includes(term)
    );
  }, [searchTerm, allDistricts, searchOptions.includeDistricts, searchOptions.minSearchLength]);

  /**
   * Combined search results
   */
  const searchResults: SearchResults = useMemo(() => {
    const isActive = searchTerm.length >= searchOptions.minSearchLength;
    
    // Apply include options to determine what to include in results
    const resultPrograms = isActive && searchOptions.includePrograms ? filteredPrograms : [];
    const resultDistricts = isActive && searchOptions.includeDistricts ? filteredDistricts : [];
    const totalResults = isActive ? resultPrograms.length + resultDistricts.length : 0;
    
    return {
      programs: resultPrograms,
      districts: resultDistricts,
      isSearchActive: isActive,
      totalResults
    };
  }, [filteredPrograms, filteredDistricts, searchTerm, searchOptions.minSearchLength, searchOptions.includePrograms, searchOptions.includeDistricts]);

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setIsSearching(value.length >= searchOptions.minSearchLength);
  }, [searchOptions.minSearchLength]);

  /**
   * Clear search and reset results
   */
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setIsSearching(false);
  }, []);

  /**
   * Find a specific program by ID
   */
  const findProgramById = useCallback((id: string): HeadStartProgram | undefined => {
    return allPrograms.find(program => program.id === id);
  }, [allPrograms]);

  /**
   * Find a specific district by number
   */
  const findDistrictByNumber = useCallback((districtNumber: number): CongressionalDistrictFeature | undefined => {
    return allDistricts.find(district => district.properties.districtNumber === districtNumber);
  }, [allDistricts]);

  /**
   * Calculate map bounds to fit search results
   */
  const getSearchResultsBounds = useCallback((): google.maps.LatLngBounds | null => {
    if (!searchResults.isSearchActive || (filteredPrograms.length === 0 && filteredDistricts.length === 0)) {
      return null;
    }

    const bounds = new google.maps.LatLngBounds();

    // Add program locations to bounds
    filteredPrograms.forEach(program => {
      bounds.extend({ lat: program.lat, lng: program.lng });
    });

    // Add district center points to bounds (simplified approach)
    filteredDistricts.forEach(district => {
      // For simplicity, we're just using the first coordinate of the first polygon
      // A more sophisticated approach would calculate the centroid of each district
      if (district.geometry.type === 'Polygon' && district.geometry.coordinates[0]?.length > 0) {
        const firstCoord = district.geometry.coordinates[0][0];
        if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
          bounds.extend({ lat: firstCoord[1] as number, lng: firstCoord[0] as number });
        }
      } else if (district.geometry.type === 'MultiPolygon' && district.geometry.coordinates[0]?.[0]?.length > 0) {
        const firstCoord = district.geometry.coordinates[0][0][0];
        if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
          bounds.extend({ lat: firstCoord[1] as number, lng: firstCoord[0] as number });
        }
      }
    });

    return bounds.isEmpty() ? null : bounds;
  }, [filteredPrograms, filteredDistricts, searchResults.isSearchActive]);

  return {
    // State
    searchTerm,
    isSearching,
    
    // Results
    searchResults,
    filteredPrograms,
    filteredDistricts,
    
    // Actions
    handleSearchChange,
    clearSearch,
    findProgramById,
    findDistrictByNumber,
    getSearchResultsBounds
  };
};