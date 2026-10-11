/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import ProgramMarkers from './ProgramMarkers';
import type { HeadStartProgram } from '../types/maps';

const programs: HeadStartProgram[] = [
  { id: 'a', name: 'Austin Location', address: 'Austin, TX', lat: 30.2672, lng: -97.7431, type: 'unknown' },
  { id: 'b', name: 'Austin Coincident Location', address: 'Austin, TX', lat: 30.2672, lng: -97.7431, type: 'unknown' },
  { id: 'c', name: 'El Paso Location', address: 'El Paso, TX', lat: 31.7619, lng: -106.485, type: 'unknown' },
];

const clusterers = () => (global as any).__getClustererInstances();

describe('ProgramMarkers', () => {
  const originalMarker = (global as any).google.maps.marker;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__resetClustererInstances();
    (global as any).google.maps.marker = {
      AdvancedMarkerElement: jest.fn().mockImplementation(options => ({ ...options })),
    };
  });

  afterAll(() => {
    (global as any).google.maps.marker = originalMarker;
  });

  test('renders the existing + pin for each location and selects on click', () => {
    const onSelect = jest.fn();
    render(<ProgramMarkers programs={programs} onSelectProgram={onSelect} />);
    const markers = screen.getAllByTestId('advanced-marker');
    expect(markers).toHaveLength(3);
    expect(markers[0].querySelector('.marker-headstart')).toHaveTextContent('+');
    fireEvent.click(markers[1]);
    expect(onSelect).toHaveBeenCalledWith(programs[1]);
  });

  test('syncs actual marker instances, including coincident ones, into one clusterer', async () => {
    render(<ProgramMarkers programs={programs} onSelectProgram={jest.fn()} />);
    expect(MarkerClusterer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(clusterers()[0].markers).toHaveLength(3));
    expect(clusterers()[0].markers.map((m: any) => m.title)).toEqual(programs.map(p => p.name));
  });

  test('re-rendering with the same programs keeps one clusterer and stable membership', async () => {
    const onSelect = jest.fn();
    const { rerender } = render(<ProgramMarkers programs={programs} onSelectProgram={onSelect} />);
    await waitFor(() => expect(clusterers()[0].markers).toHaveLength(3));
    const addCalls = clusterers()[0].addMarkers.mock.calls.length;
    rerender(<ProgramMarkers programs={programs} onSelectProgram={onSelect} />);
    expect(MarkerClusterer).toHaveBeenCalledTimes(1);
    expect(clusterers()[0].addMarkers.mock.calls.length).toBe(addCalls);
  });

  test('removing a program removes its marker from the clusterer', async () => {
    const { rerender } = render(<ProgramMarkers programs={programs} onSelectProgram={jest.fn()} />);
    await waitFor(() => expect(clusterers()[0].markers).toHaveLength(3));
    rerender(<ProgramMarkers programs={programs.slice(0, 1)} onSelectProgram={jest.fn()} />);
    await waitFor(() => expect(clusterers()[0].markers).toHaveLength(1));
  });

  test('unmounting detaches the clusterer and its markers', async () => {
    const { unmount } = render(<ProgramMarkers programs={programs} onSelectProgram={jest.fn()} />);
    await waitFor(() => expect(clusterers()[0].markers).toHaveLength(3));
    unmount();
    expect(clusterers()[0].clearMarkers).toHaveBeenCalled();
    expect(clusterers()[0].setMap).toHaveBeenCalledWith(null);
  });

  test('cluster markers are clickable with an accessible count label', () => {
    render(<ProgramMarkers programs={programs} onSelectProgram={jest.fn()} />);
    const { renderer } = clusterers()[0].options;
    const position = { lat: 30.2672, lng: -97.7431 };
    const marker = renderer.render({ count: 12, position }, {}, {});
    expect(google.maps.marker.AdvancedMarkerElement).toHaveBeenCalledTimes(1);
    expect(marker.title).toBe('12 Head Start locations. Select to zoom in.');
    expect(marker.gmpClickable).toBe(true);
    expect(marker.position).toBe(position);
    expect(marker.content).toHaveTextContent('12');
    expect(marker.content).toHaveAttribute('aria-hidden', 'true');
    // Defaults to the library click handler, which fits the map to members.
    expect(clusterers()[0].options.onClusterClick).toBeUndefined();
  });
});
