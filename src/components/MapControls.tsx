import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Building2 } from 'lucide-react';

interface MapControlsProps {
  layerVisibility: { programs: boolean; txhsaRegions: boolean };
  onToggleLayer: (layer: keyof MapControlsProps['layerVisibility']) => void;
  programCount: number;
  regionsLoading?: boolean;
  regionsError?: string | null;
  regionsAvailable?: boolean;
  onRetryRegions?: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  layerVisibility,
  onToggleLayer,
  programCount,
  regionsLoading = false,
  regionsError = null,
  regionsAvailable = true,
  onRetryRegions,
}) => {
  // Only the initial viewport sets the default. Preserve the user's disclosure
  // choice and focused controls through resizing; no floating coordinates exist.
  const [expanded, setExpanded] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);

  return (
    <div>
      <details
        open={expanded}
        onToggle={event => setExpanded(event.currentTarget.open)}
        className="border border-tx-gray-200 rounded-lg bg-white"
      >
        <summary className="min-h-[44px] cursor-pointer px-4 py-3 text-sm font-semibold text-tx-gray-800 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-tx-blue-600">
          <Layers className="inline-block w-4 h-4 mr-2" aria-hidden="true" />
          Data Layers
        </summary>
        <div role="group" aria-label="Data Layers" className="border-t border-tx-gray-200">
          <button
            type="button"
            onClick={() => onToggleLayer('programs')}
            className={`p-3 min-h-[44px] hover:bg-tx-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-tx-blue-600 border-b border-tx-gray-100 w-full flex items-center gap-3 text-left ${layerVisibility.programs ? 'bg-headstart-accent' : ''}`}
            title="Toggle Head Start Programs"
            aria-label="Toggle Head Start programs layer"
            aria-pressed={layerVisibility.programs}
          >
            <Building2 className="w-5 h-5 shrink-0 text-headstart-primary" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-tx-gray-800">Head Start Programs</span>
              <span className="block text-xs text-tx-gray-600">{programCount} listed locations</span>
            </span>
            <span className="text-xs font-semibold text-tx-gray-700">{layerVisibility.programs ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleLayer('txhsaRegions')}
            className={`p-3 min-h-[44px] hover:bg-tx-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-tx-blue-600 disabled:opacity-60 w-full flex items-center gap-3 text-left ${layerVisibility.txhsaRegions ? 'bg-tx-gray-100' : ''}`}
            title="Toggle TXHSA Regions"
            aria-label="Toggle TXHSA Regions layer"
            aria-pressed={layerVisibility.txhsaRegions}
            disabled={regionsLoading || !!regionsError || !regionsAvailable}
            aria-describedby="regions-status"
          >
            {layerVisibility.txhsaRegions
              ? <Eye className="w-5 h-5 shrink-0 text-txhsa-accent" aria-hidden="true" />
              : <EyeOff className="w-5 h-5 shrink-0 text-txhsa-accent" aria-hidden="true" />}
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-tx-gray-800">TXHSA Regions</span>
              <span className="block text-xs text-tx-gray-600">
                {regionsLoading ? 'Loading boundaries…' : regionsError || !regionsAvailable ? 'Boundaries unavailable' : 'Show regional boundaries'}
              </span>
            </span>
            <span className="text-xs font-semibold text-tx-gray-700">{layerVisibility.txhsaRegions ? 'On' : 'Off'}</span>
          </button>
        </div>
      </details>
      {/* Keep optional-data status and retry reachable even when collapsed. */}
      <div id="regions-status" className="text-sm text-tx-gray-700">
        {regionsLoading && <p role="status" className="mt-2">Loading TXHSA regions. Program locations remain available.</p>}
        {regionsError && (
          <div role="alert" className="mt-2">
            <p>{regionsError}</p>
            <button type="button" className="btn-primary mt-2" onClick={onRetryRegions}>Retry TXHSA regions</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapControls;
