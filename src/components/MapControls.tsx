import React from 'react';
import { Layers, Eye, EyeOff, Building2, Users } from 'lucide-react';
import { LayerVisibility } from '../types/maps';

/**
 * Custom map controls component
 * Provides additional functionality beyond default Google Maps controls
 */
interface MapControlsProps {
  /** Layer visibility state */
  layerVisibility: {
    programs: boolean;
    districts: boolean;
    districtBoundaries: boolean;
  };
  /** Function to toggle layer visibility */
  onToggleLayer: (layer: keyof typeof layerVisibility) => void;
  /** Number of programs */
  programCount: number;
  /** Number of districts */
  districtCount: number;
}

const MapControls: React.FC<MapControlsProps> = ({
  layerVisibility,
  onToggleLayer,
  programCount,
  districtCount
}) => {
  return (
    <div className="absolute top-[82px] left-4 z-map-controls flex flex-col space-y-3" role="region" aria-label="Map controls">
      {/* Layer controls */}
      <div className="map-control">
        <div className="px-4 py-3 border-b border-tx-gray-100 bg-gradient-to-r from-tx-gray-50 to-tx-gray-100">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-tx-gray-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-tx-gray-800" id="layer-controls-heading">Data Layers</h3>
          </div>
        </div>
        
        <div className="flex flex-col" role="group" aria-labelledby="layer-controls-heading">
          <button
            onClick={() => onToggleLayer('programs')}
            className={`p-4 hover:bg-tx-gray-50 transition-all duration-200 border-b border-tx-gray-100 w-full flex items-center justify-between group ${
              layerVisibility.programs ? 'bg-headstart-accent' : ''
            }`}
            title="Toggle Head Start Programs"
            aria-label="Toggle Head Start programs layer"
            aria-pressed={layerVisibility.programs}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg transition-colors duration-200 ${
                layerVisibility.programs 
                  ? 'bg-headstart-primary text-white' 
                  : 'bg-tx-gray-100 text-tx-gray-600 group-hover:bg-tx-gray-200'
              }`} aria-hidden="true">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  layerVisibility.programs ? 'text-headstart-primary' : 'text-tx-gray-700'
                }`}>
                  Head Start Programs
                </span>
                <p className="text-xs text-tx-gray-500">
                  {programCount} programs across Texas
                </p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              layerVisibility.programs 
                ? 'bg-headstart-primary border-headstart-primary' 
                : 'bg-white border-tx-gray-300 group-hover:border-tx-gray-400'
            }`} aria-hidden="true"></div>
          </button>
          
          <button
            onClick={() => onToggleLayer('districts')}
            className={`p-4 hover:bg-tx-gray-50 transition-all duration-200 border-b border-tx-gray-100 w-full flex items-center justify-between group ${
              layerVisibility.districts ? 'bg-district-accent' : ''
            }`}
            title="Toggle Congressional Districts"
            aria-label="Toggle congressional districts layer"
            aria-pressed={layerVisibility.districts}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg transition-colors duration-200 ${
                layerVisibility.districts 
                  ? 'bg-district-primary text-white' 
                  : 'bg-tx-gray-100 text-tx-gray-600 group-hover:bg-tx-gray-200'
              }`} aria-hidden="true">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  layerVisibility.districts ? 'text-district-primary' : 'text-tx-gray-700'
                }`}>
                  Congressional Districts
                </span>
                <p className="text-xs text-tx-gray-500">
                  {districtCount} districts in Texas
                </p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              layerVisibility.districts 
                ? 'bg-district-primary border-district-primary' 
                : 'bg-white border-tx-gray-300 group-hover:border-tx-gray-400'
            }`} aria-hidden="true"></div>
          </button>
          
          <button
            onClick={() => onToggleLayer('districtBoundaries')}
            className={`p-4 hover:bg-tx-gray-50 transition-all duration-200 w-full flex items-center justify-between group ${
              layerVisibility.districtBoundaries ? 'bg-tx-blue-50' : ''
            }`}
            title="Toggle District Boundaries"
            aria-label="Toggle district boundaries layer"
            aria-pressed={layerVisibility.districtBoundaries}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg transition-colors duration-200 ${
                layerVisibility.districtBoundaries 
                  ? 'bg-tx-blue-600 text-white' 
                  : 'bg-tx-gray-100 text-tx-gray-600 group-hover:bg-tx-gray-200'
              }`} aria-hidden="true">
                {layerVisibility.districtBoundaries ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </div>
              <div className="text-left">
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  layerVisibility.districtBoundaries ? 'text-tx-blue-600' : 'text-tx-gray-700'
                }`}>
                  District Boundaries
                </span>
                <p className="text-xs text-tx-gray-500">
                  Show geographic boundaries
                </p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              layerVisibility.districtBoundaries 
                ? 'bg-tx-blue-600 border-tx-blue-600' 
                : 'bg-white border-tx-gray-300 group-hover:border-tx-gray-400'
            }`} aria-hidden="true"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapControls;