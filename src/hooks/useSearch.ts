import { useState, useCallback, useMemo } from 'react';
import { HeadStartProgram } from '../types/maps';

interface SearchOptions {
  includePrograms: boolean;
  minSearchLength: number;
}

interface SearchResults {
  programs: HeadStartProgram[];
  isSearchActive: boolean;
  totalResults: number;
}

/**
 * Search hook for Head Start programs. The previous district / representative
 * search branch was removed in U7 - programs are now the only searchable
 * dimension since the districts overlay no longer exists.
 */
export const useSearch = (
  allPrograms: HeadStartProgram[],
  options: Partial<SearchOptions> = {}
) => {
  const searchOptions: SearchOptions = {
    includePrograms: true,
    minSearchLength: 2,
    ...options,
  };

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

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

  const searchResults: SearchResults = useMemo(() => {
    const isActive = searchTerm.length >= searchOptions.minSearchLength;
    const resultPrograms = isActive && searchOptions.includePrograms ? filteredPrograms : [];
    return {
      programs: resultPrograms,
      isSearchActive: isActive,
      totalResults: isActive ? resultPrograms.length : 0,
    };
  }, [filteredPrograms, searchTerm, searchOptions.minSearchLength, searchOptions.includePrograms]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setIsSearching(value.length >= searchOptions.minSearchLength);
  }, [searchOptions.minSearchLength]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setIsSearching(false);
  }, []);

  const findProgramById = useCallback((id: string): HeadStartProgram | undefined => {
    return allPrograms.find(program => program.id === id);
  }, [allPrograms]);

  const getSearchResultsBounds = useCallback((): google.maps.LatLngBounds | null => {
    if (!searchResults.isSearchActive || filteredPrograms.length === 0) {
      return null;
    }
    const bounds = new google.maps.LatLngBounds();
    filteredPrograms.forEach(program => {
      bounds.extend({ lat: program.lat, lng: program.lng });
    });
    return bounds.isEmpty() ? null : bounds;
  }, [filteredPrograms, searchResults.isSearchActive]);

  return {
    searchTerm,
    isSearching,
    searchResults,
    filteredPrograms,
    handleSearchChange,
    clearSearch,
    findProgramById,
    getSearchResultsBounds,
  };
};
