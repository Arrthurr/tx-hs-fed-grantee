import React from 'react';
import { MapPin, ChevronRight } from 'lucide-react';
import { HeadStartProgram } from '../types/maps';

interface SearchResultsProps {
  /** Filtered Head Start programs */
  programs: HeadStartProgram[];
  /** Whether search is currently active */
  isSearchActive: boolean;
  /** Callback for selecting a program */
  onSelectProgram: (program: HeadStartProgram) => void;
  /** Optional CSS class name */
  className?: string;
  /** Maximum number of results to display */
  maxResultsPerCategory?: number;
}

/**
 * Search results component. After U7 only Head Start programs are surfaced -
 * the district / representative section was removed alongside the district
 * overlay.
 */
const SearchResults: React.FC<SearchResultsProps> = ({
  programs,
  isSearchActive,
  onSelectProgram,
  className = "",
  maxResultsPerCategory = 5,
}) => {
  if (!isSearchActive || programs.length === 0) {
    return null;
  }

  const displayedPrograms = programs.slice(0, maxResultsPerCategory);
  const hasMorePrograms = programs.length > maxResultsPerCategory;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border border-tx-gray-200 overflow-hidden ${className}`}
      role="region"
      aria-label="Search results"
    >
      <div className="border-b border-tx-gray-100 last:border-b-0">
        <div className="px-4 py-3 bg-gradient-to-r from-headstart-accent to-white">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-headstart-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-tx-gray-800" id="programs-heading">
              Head Start Programs ({programs.length})
            </h3>
          </div>
        </div>

        <ul className="divide-y divide-tx-gray-100" aria-labelledby="programs-heading">
          {displayedPrograms.map(program => (
            <li key={program.id}>
              <button
                onClick={() => onSelectProgram(program)}
                className="w-full text-left px-4 py-3 hover:bg-tx-gray-50 transition-colors duration-200 flex items-center justify-between group"
                aria-label={`View details for ${program.name}`}
              >
                <div>
                  <p className="text-sm font-medium text-tx-gray-800">{program.name}</p>
                  <p className="text-xs text-tx-gray-500 mt-1 line-clamp-1">{program.address}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-tx-gray-400 group-hover:text-headstart-primary transition-colors duration-200" aria-hidden="true" />
              </button>
            </li>
          ))}

          {hasMorePrograms && (
            <li className="px-4 py-2 text-xs text-tx-gray-500 bg-tx-gray-50">
              {programs.length - maxResultsPerCategory} more program{programs.length - maxResultsPerCategory !== 1 ? 's' : ''} not shown
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SearchResults;
