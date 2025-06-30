import React from 'react';
import { MapPin, Users, ChevronRight } from 'lucide-react';
import { HeadStartProgram, CongressionalDistrictFeature } from '../types/maps';
import { formatDistrictNumber } from '../data/congressionalDistricts';

/**
 * Props for the SearchResults component
 */
interface SearchResultsProps {
  /** Filtered Head Start programs */
  programs: HeadStartProgram[];
  /** Filtered congressional districts */
  districts: CongressionalDistrictFeature[];
  /** Whether search is currently active */
  isSearchActive: boolean;
  /** Callback for selecting a program */
  onSelectProgram: (program: HeadStartProgram) => void;
  /** Callback for selecting a district */
  onSelectDistrict: (district: CongressionalDistrictFeature) => void;
  /** Optional CSS class name */
  className?: string;
  /** Maximum number of results to display per category */
  maxResultsPerCategory?: number;
}

/**
 * Search results component for the Texas Head Start Map
 * Displays filtered programs and districts with selection capability
 */
const SearchResults: React.FC<SearchResultsProps> = ({
  programs,
  districts,
  isSearchActive,
  onSelectProgram,
  onSelectDistrict,
  className = "",
  maxResultsPerCategory = 5
}) => {
  // Don't render anything if search is not active or no results
  if (!isSearchActive || (programs.length === 0 && districts.length === 0)) {
    return null;
  }

  // Limit the number of results displayed
  const displayedPrograms = programs.slice(0, maxResultsPerCategory);
  const displayedDistricts = districts.slice(0, maxResultsPerCategory);
  
  // Check if we have more results than we're displaying
  const hasMorePrograms = programs.length > maxResultsPerCategory;
  const hasMoreDistricts = districts.length > maxResultsPerCategory;

  return (
    <div 
      className={`bg-white rounded-lg shadow-lg border border-tx-gray-200 overflow-hidden ${className}`}
      role="region" 
      aria-label="Search results"
    >
      {/* Programs section */}
      {programs.length > 0 && (
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
      )}
      
      {/* Districts section */}
      {districts.length > 0 && (
        <div className="border-b border-tx-gray-100 last:border-b-0">
          <div className="px-4 py-3 bg-gradient-to-r from-district-accent to-white">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-district-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-tx-gray-800" id="districts-heading">
                Congressional Districts ({districts.length})
              </h3>
            </div>
          </div>
          
          <ul className="divide-y divide-tx-gray-100" aria-labelledby="districts-heading">
            {displayedDistricts.map(district => (
              <li key={district.properties.district}>
                <button
                  onClick={() => onSelectDistrict(district)}
                  className="w-full text-left px-4 py-3 hover:bg-tx-gray-50 transition-colors duration-200 flex items-center justify-between group"
                  aria-label={`View details for Congressional District ${district.properties.districtNumber}`}
                >
                  <div>
                    <p className="text-sm font-medium text-tx-gray-800">
                      District {formatDistrictNumber(district.properties.districtNumber)}
                    </p>
                    <p className="text-xs text-tx-gray-500 mt-1">
                      Rep. {district.properties.representative}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-tx-gray-400 group-hover:text-district-primary transition-colors duration-200" aria-hidden="true" />
                </button>
              </li>
            ))}
            
            {hasMoreDistricts && (
              <li className="px-4 py-2 text-xs text-tx-gray-500 bg-tx-gray-50">
                {districts.length - maxResultsPerCategory} more district{districts.length - maxResultsPerCategory !== 1 ? 's' : ''} not shown
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchResults;