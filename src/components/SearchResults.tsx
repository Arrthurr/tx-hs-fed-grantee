import React, { useCallback } from 'react';
import { MapPin, Building2 } from 'lucide-react';
import type { HeadStartProgram } from '../types/maps';

interface SearchResultsProps {
  programs: HeadStartProgram[];
  isSearchActive: boolean;
  onSelectProgram: (program: HeadStartProgram, trigger: HTMLButtonElement) => void;
  className?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  programs,
  isSearchActive,
  onSelectProgram,
  className = '',
}) => {
  const handleClick = useCallback(
    (program: HeadStartProgram, trigger: HTMLButtonElement) => {
      onSelectProgram(program, trigger);
    },
    [onSelectProgram]
  );

  if (!isSearchActive) {
    return null;
  }

  if (programs.length === 0) {
    return (
      <div
        className={`p-4 bg-white border border-tx-gray-200 rounded-lg shadow-sm ${className}`}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-tx-gray-500 text-center">
          No programs found matching your search.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-tx-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}
    >
      <ul className="max-h-64 overflow-y-auto divide-y divide-tx-gray-100" aria-label="Search results">
        {programs.map((program) => (
          <li key={program.id}>
            <button
              type="button"
              onClick={event => handleClick(program, event.currentTarget)}
              className="w-full min-h-[44px] px-4 py-3 text-left hover:bg-tx-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-tx-blue-600 transition-colors group"
              aria-label={`View ${program.name}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-tx-gray-900 break-words group-hover:text-tx-blue-700">
                    {program.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-tx-gray-500">
                    <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{program.address}</span>
                  </div>
                  {program.grantee && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-tx-gray-500">
                      <Building2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{program.grantee}</span>
                    </div>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    program.type === 'head-start'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {program.type === 'unknown' ? 'Unverified' : program.type === 'both' ? 'HS + EHS' : program.type === 'head-start' ? 'HS' : 'EHS'}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchResults;
