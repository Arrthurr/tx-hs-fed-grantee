import React, { useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
  resultCount?: number;
  isSearchActive?: boolean;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onClear,
  resultCount = 0,
  isSearchActive = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  const handleClear = useCallback(() => {
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  return (
    <div className={`relative ${className}`} role="search" aria-label="Search Head Start programs">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleChange}
          placeholder="Search listed locations by name or address..."
          className="w-full min-h-[44px] pl-10 pr-12 py-2.5 text-base border border-tx-gray-200 rounded-lg bg-white text-tx-gray-900 placeholder:text-tx-gray-400 focus:outline-none focus:ring-2 focus:ring-tx-blue-500 focus:border-tx-blue-500 transition-colors"
          aria-label="Search Head Start programs"
          aria-describedby={isSearchActive ? 'search-result-count' : undefined}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-lg text-tx-gray-600 hover:bg-tx-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tx-blue-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {isSearchActive && (
        <p
          id="search-result-count"
          className="mt-1.5 text-xs text-tx-gray-500"
          aria-live="polite"
        >
          Found {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </p>
      )}
    </div>
  );
};

export default SearchBar;
