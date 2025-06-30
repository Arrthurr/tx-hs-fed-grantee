import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Props for the SearchBar component
 */
interface SearchBarProps {
  /** Current search term */
  searchTerm: string;
  /** Callback for search term changes */
  onSearchChange: (value: string) => void;
  /** Callback for clearing the search */
  onClearSearch: () => void;
  /** Whether search is currently active */
  isSearching: boolean;
  /** Total number of search results */
  totalResults: number;
  /** Number of program results */
  programResults: number;
  /** Number of district results */
  districtResults: number;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional CSS class name */
  className?: string;
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean;
}

/**
 * Search bar component for the Texas Head Start Map
 * Provides a search input with results count and clear button
 */
const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  isSearching,
  totalResults,
  programResults,
  districtResults,
  placeholder = "Search programs or districts...",
  className = "",
  autoFocus = false
}) => {
  // Ref for the search input
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Local state for input focus
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Focus the input when the component mounts if autoFocus is true
   */
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  /**
   * Handle clear button click
   */
  const handleClear = () => {
    onClearSearch();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Handle key press events
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Clear search on Escape key
    if (e.key === 'Escape') {
      onClearSearch();
    }
  };

  return (
    <div className={`relative ${className}`} role="search">
      {/* Search input with icon */}
      <div className={`
        flex items-center w-full bg-white rounded-lg shadow-md transition-all duration-200
        ${isFocused ? 'ring-2 ring-headstart-primary ring-opacity-50' : 'hover:shadow-lg'}
        ${isSearching ? 'border-headstart-primary' : 'border border-tx-gray-200'}
      `}>
        <div className="flex-shrink-0 pl-4" aria-hidden="true">
          <Search className={`w-5 h-5 ${isSearching ? 'text-headstart-primary' : 'text-tx-gray-400'}`} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          aria-label="Search for Head Start programs or congressional districts"
          className="w-full py-3 px-3 text-tx-gray-700 focus:outline-none bg-transparent"
        />
        
        {searchTerm && (
          <button
            onClick={handleClear}
            className="flex-shrink-0 pr-4 text-tx-gray-400 hover:text-tx-gray-600 transition-colors duration-200"
            aria-label="Clear search"
            type="button"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
      
      {/* Search results count */}
      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-tx-gray-200 p-3 z-10" role="status" aria-live="polite">
          <div className="text-sm text-tx-gray-700 mb-2">
            {totalResults === 0 ? (
              <p>No results found for "{searchTerm}"</p>
            ) : (
              <p>Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchTerm}"</p>
            )}
          </div>
          
          {totalResults > 0 && (
            <div className="flex flex-col space-y-2">
              {programResults > 0 && (
                <div className="flex items-center space-x-2 text-xs">
                  <div className="p-1 bg-headstart-accent rounded-md" aria-hidden="true">
                    <Search className="w-3 h-3 text-headstart-primary" />
                  </div>
                  <span className="text-tx-gray-600">
                    {programResults} Head Start Program{programResults !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {districtResults > 0 && (
                <div className="flex items-center space-x-2 text-xs">
                  <div className="p-1 bg-district-accent rounded-md" aria-hidden="true">
                    <Search className="w-3 h-3 text-district-primary" />
                  </div>
                  <span className="text-tx-gray-600">
                    {districtResults} Congressional District{districtResults !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;