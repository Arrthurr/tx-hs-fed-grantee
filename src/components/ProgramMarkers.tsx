import React, { useState, useEffect, useCallback, memo } from 'react';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer';
import type { HeadStartProgram } from '../types/maps';

interface ProgramMarkersProps {
  programs: HeadStartProgram[];
  onSelectProgram: (program: HeadStartProgram) => void;
}

interface ProgramMarkerProps {
  program: HeadStartProgram;
  onSelectProgram: (program: HeadStartProgram) => void;
  setMarkerRef: (marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => void;
}

type MarkerMap = Record<string, google.maps.marker.AdvancedMarkerElement>;

/**
 * Cluster markers match the location pin (green circle, white border) but
 * show the location count. Clicking/activating one uses the library default
 * handler, which fits the map to the cluster members. The title is the
 * accessible name; gmpClickable makes the marker a focusable button.
 */
const clusterRenderer: Renderer = {
  render: ({ count, position }) => {
    const size = count < 10 ? 36 : count < 50 ? 44 : 52;
    const content = document.createElement('div');
    content.className = 'marker-headstart-cluster';
    content.setAttribute('aria-hidden', 'true');
    content.textContent = String(count);
    Object.assign(content.style, {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: 'var(--headstart-primary)',
      border: '3px solid #ffffff',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
    });
    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content,
      title: `${count} Head Start locations. Select to zoom in.`,
      zIndex: 1000 + count,
      gmpClickable: true,
    });
  },
};

/** Single location pin; memoized so its ref callback stays stable. */
const ProgramMarker = memo<ProgramMarkerProps>(({ program, onSelectProgram, setMarkerRef }) => {
  const ref = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => setMarkerRef(marker, program.id),
    [setMarkerRef, program.id],
  );
  const handleClick = useCallback(() => onSelectProgram(program), [onSelectProgram, program]);

  return (
    <AdvancedMarker
      ref={ref}
      position={{ lat: program.lat, lng: program.lng }}
      onClick={handleClick}
      title={program.name}
    >
      <div
        className="marker-headstart"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'var(--headstart-primary)',
          border: '2px solid #ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>+</div>
      </div>
    </AdvancedMarker>
  );
});
ProgramMarker.displayName = 'ProgramMarker';

/**
 * Head Start location markers, grouped by one MarkerClusterer per map
 * instance. Unmounting (e.g. hiding the programs layer) detaches every
 * marker and cluster from the map.
 */
const ProgramMarkers: React.FC<ProgramMarkersProps> = ({ programs, onSelectProgram }) => {
  const map = useMap();
  const [clusterer, setClusterer] = useState<MarkerClusterer | null>(null);
  const [markers, setMarkers] = useState<MarkerMap>({});

  useEffect(() => {
    if (!map) return;
    const instance = new MarkerClusterer({ map, renderer: clusterRenderer });
    setClusterer(instance);
    return () => {
      instance.clearMarkers(true);
      instance.setMap(null);
      setClusterer(null);
    };
  }, [map]);

  useEffect(() => {
    if (!clusterer) return;
    clusterer.clearMarkers(true);
    clusterer.addMarkers(Object.values(markers));
  }, [clusterer, markers]);

  const setMarkerRef = useCallback((marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => {
    setMarkers(current => {
      if ((marker && current[id] === marker) || (!marker && !current[id])) return current;
      if (marker) return { ...current, [id]: marker };
      const { [id]: _removed, ...rest } = current;
      void _removed;
      return rest;
    });
  }, []);

  return (
    <>
      {programs.map(program => (
        <ProgramMarker
          key={`program-${program.id}`}
          program={program}
          onSelectProgram={onSelectProgram}
          setMarkerRef={setMarkerRef}
        />
      ))}
    </>
  );
};

export default ProgramMarkers;
