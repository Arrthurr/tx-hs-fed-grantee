import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layers, Eye, EyeOff, Building2 } from 'lucide-react';

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
  /** Reference to the map container for boundary constraints */
  mapContainerRef?: React.RefObject<HTMLDivElement>;
}

const MapControls: React.FC<MapControlsProps> = ({
  layerVisibility,
  onToggleLayer,
  programCount,
  mapContainerRef
}) => {
  // Drag state management
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 16, y: 82 }); // Default position (left-4, top-[82px])
  const cardRef = useRef<HTMLDivElement>(null);
  const mapContainerElementRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    originX: number;
    originY: number;
    startLeft: number;
    startTop: number;
    pointerId: number;
  } | null>(null);

  /**
   * Handle pointer down event to start dragging
   * Uses Pointer Events API to avoid Google Maps interference
   */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!cardRef.current || !mapContainerRef?.current) return;

    // 1. Don't let the event bubble to the map - this is crucial!
    e.stopPropagation();
    e.preventDefault();

    // 2. Capture the pointer so we continue receiving move/up events
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setIsDragging(true);

    // Store drag state
    dragState.current = {
      originX: e.clientX,
      originY: e.clientY,
      startLeft: dragPosition.x,
      startTop: dragPosition.y,
      pointerId: e.pointerId
    };
  }, [mapContainerRef, dragPosition]);

  /**
   * Handle pointer move event during dragging
   */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current || !mapContainerRef?.current) return;

    const { originX, originY, startLeft, startTop } = dragState.current;

    const dx = e.clientX - originX;
    const dy = e.clientY - originY;

    // Get map container bounds for constraint calculations
    const mapRect = mapContainerRef.current.getBoundingClientRect();
    const cardRect = cardRef.current?.getBoundingClientRect();

    if (!cardRect) return;

    // Calculate new position with boundary constraints
    const maxX = mapRect.width - cardRect.width - 16; // 16px padding
    const maxY = mapRect.height - cardRect.height - 16;

    const newX = Math.max(0, Math.min(startLeft + dx, maxX));
    const newY = Math.max(0, Math.min(startTop + dy, maxY));

    setDragPosition({ x: newX, y: newY });
  }, [mapContainerRef]);

  /**
   * Handle pointer up event to end dragging
   */
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;

    setIsDragging(false);
    dragState.current = null;

    // Release the pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  /**
   * Handle keyboard navigation for accessibility
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!mapContainerRef?.current) return;

    const moveStep = 10; // pixels to move per key press
    const mapRect = mapContainerRef.current.getBoundingClientRect();
    const cardRect = cardRef.current?.getBoundingClientRect();

    if (!cardRect) return;

    let newX = dragPosition.x;
    let newY = dragPosition.y;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newY = Math.max(0, dragPosition.y - moveStep);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newY = Math.min(mapRect.height - cardRect.height - 16, dragPosition.y + moveStep);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newX = Math.max(0, dragPosition.x - moveStep);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newX = Math.min(mapRect.width - cardRect.width - 16, dragPosition.x + moveStep);
        break;
      default:
        return;
    }

    setDragPosition({ x: newX, y: newY });
  }, [dragPosition, mapContainerRef]);

  /**
   * Sync the map container element ref
   */
  useEffect(() => {
    mapContainerElementRef.current = mapContainerRef?.current || null;
  }, [mapContainerRef]);

  /**
   * Cleanup pointer events on unmount (automatic with pointer capture)
   */
  useEffect(() => {
    return () => {
      // Pointer events are automatically cleaned up when the element is unmounted
      // since we use setPointerCapture/releasePointerCapture
      dragState.current = null;
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`absolute z-map-controls flex flex-col transition-transform duration-200 ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-105' : 'cursor-grab'
      }`}
      style={{
        left: `${dragPosition.x}px`,
        top: `${dragPosition.y}px`,
        userSelect: isDragging ? 'none' : 'auto',
        pointerEvents: 'auto',
        touchAction: 'none' // Prevents touch gestures from interfering
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Draggable map controls - use mouse to drag or arrow keys to move"
    >
      {/* Drag handle indicator */}
      <div
        className="flex items-center justify-center py-2 px-4 bg-tx-blue-600 text-white rounded-t-lg border-b border-tx-blue-700 cursor-grab hover:bg-tx-blue-700 transition-colors font-medium text-sm"
        style={{
          zIndex: 1200,
          pointerEvents: 'auto',
          position: 'relative'
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePointerDown(e);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mr-2">⋮⋮</span>
        Drag to Move
      </div>

      {/* Layer controls */}
      <div className="map-control rounded-b-lg">
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
              layerVisibility.districtBoundaries ? 'bg-district-accent' : ''
            }`}
            title="Toggle District Boundaries"
            aria-label="Toggle district boundaries layer"
            aria-pressed={layerVisibility.districtBoundaries}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg transition-colors duration-200 ${
                layerVisibility.districtBoundaries
                  ? 'bg-district-primary text-white'
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
                  layerVisibility.districtBoundaries ? 'text-district-primary' : 'text-tx-gray-700'
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
                ? 'bg-district-primary border-district-primary'
                : 'bg-white border-tx-gray-300 group-hover:border-tx-gray-400'
            }`} aria-hidden="true"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapControls;
