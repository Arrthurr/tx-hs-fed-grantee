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
          placeholder="Search programs by name, address, or grantee..."
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-tx-gray-200 rounded-lg bg-white text-tx-gray-900 placeholder:text-tx-gray-400 focus:outline-none focus:ring-2 focus:ring-tx-blue-500 focus:border-tx-blue-500 transition-colors"
          aria-label="Search Head Start programs"
          aria-describedby={isSearchActive ? 'search-result-count' : undefined}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-tx-gray-400 hover:text-tx-gray-600 hover:bg-tx-gray-100 transition-colors"
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
