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
    districtBoundaries: boolean;
  };
  /** Function to toggle layer visibility */
  onToggleLayer: (layer: keyof MapControlsProps['layerVisibility']) => void;
  /** Number of programs */
  programCount: number;
}

const MapControls: React.FC<MapControlsProps> = ({
  layerVisibility,
  onToggleLayer,
  programCount
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
                ? 'text-white' 
                : 'bg-tx-gray-100 text-tx-gray-600 group-hover:bg-tx-gray-200'
            }`} aria-hidden="true" style={layerVisibility.districtBoundaries ? { backgroundColor: '#7C3AED' } : {}}>
              {layerVisibility.districtBoundaries ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </div>
            <div className="text-left">
              <span className={`text-sm font-medium transition-colors duration-200 ${
                layerVisibility.districtBoundaries ? '' : 'text-tx-gray-700'
              }`} style={layerVisibility.districtBoundaries ? { color: '#7C3AED' } : {}}>
                District Boundaries
              </span>
                <p className="text-xs text-tx-gray-500">
                  Show geographic boundaries
                </p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              layerVisibility.districtBoundaries 
                ? '' 
                : 'bg-white border-tx-gray-300 group-hover:border-tx-gray-400'
            }`} aria-hidden="true" style={layerVisibility.districtBoundaries ? { backgroundColor: '#7C3AED', borderColor: '#7C3AED' } : {}}></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapControls;