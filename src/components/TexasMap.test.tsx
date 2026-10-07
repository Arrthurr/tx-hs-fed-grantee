/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TexasMap from './TexasMap';
import { useMapData } from '../hooks/useMapData';
import { processHeadStartPrograms } from '../data/headStartPrograms';

// Mock the custom hooks
jest.mock('../hooks/useMapData');

// Mock the API Provider (already mocked in setupTests.ts, but override APIProvider here)
jest.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: jest.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  )),
  AdvancedMarker: require('react').forwardRef(({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }, ref: any) => {
    const { useImperativeHandle, useRef } = require('react');
    const marker = useRef({ title });
    useImperativeHandle(ref, () => marker.current, []);
    return <div data-testid="advanced-marker" onClick={onClick}>{children}</div>;
  }),
  Pin: () => <div data-testid="map-pin" />,
  useMap: jest.fn().mockReturnValue({
    panTo: jest.fn(),
    setZoom: jest.fn(),
    fitBounds: jest.fn(),
    setCenter: jest.fn(),
    getZoom: jest.fn().mockReturnValue(10),
    getCenter: jest.fn().mockReturnValue({ lat: () => 31.0, lng: () => -99.0 }),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
}));

// Sample test data
const mockHeadStartPrograms = [
  {
    id: 'program-1',
    name: 'Test Program 1',
    address: '123 Test St, Austin, TX',
    lat: 30.2672,
    lng: -97.7431,
    type: 'head-start' as const,
    grantee: 'Test Grantee 1',
    funding: 1000000,
  },
  {
    id: 'program-2',
    name: 'Test Program 2',
    address: '456 Test Ave, Houston, TX',
    lat: 29.7604,
    lng: -95.3698,
    type: 'early-head-start' as const,
    grantee: 'Test Grantee 2',
    funding: 2000000,
  },
];

// Default mock implementations
const mockUseMapData = useMapData as jest.MockedFunction<typeof useMapData>;

// Mock environment variables
const originalEnv = process.env;
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  process.env = {
    ...originalEnv,
    VITE_GOOGLE_MAPS_API_KEY: 'test-api-key',
  };
});

afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  process.env = originalEnv;
});

describe('TexasMap Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockUseMapData.mockReturnValue({
      headStartPrograms: mockHeadStartPrograms,
      txhsaRegions: [],
      regionProgramCounts: null,
      layerVisibility: {
        majorCities: false,
        counties: false,
        headStartPrograms: true,
        txhsaRegions: false,
      },
      toggleLayer: jest.fn(),
      isLoading: false,
      isLoadingPrograms: false,
      isLoadingRegions: false,
      hasErrors: false,
      programsError: null,
      regionsError: null,
      retryLoading: jest.fn(),
      loadHeadStartPrograms: jest.fn(),
      loadTxhsaRegions: jest.fn(),
    } as any);
    (global as any).__resetMapDataInstances?.();
    (global as any).__resetClustererInstances?.();
  });

  // Mock the TexasMap component with API Provider wrapper
  const TexasMapWithProvider = () => {
    // Use the mocked APIProvider which is already set up in the jest.mock above
    const { APIProvider: MockedAPIProvider } = require('@vis.gl/react-google-maps');
    return (
      <MockedAPIProvider apiKey="test-api-key">
        <TexasMap />
      </MockedAPIProvider>
    );
  };

  test('renders the map component', () => {
    render(<TexasMapWithProvider />);
    
    // Check if the API provider is rendered
    expect(screen.getByTestId('api-provider')).toBeInTheDocument();
    // Check if the map container is rendered
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });

  test('renders program markers when headStartPrograms layer is visible', () => {
    render(<TexasMapWithProvider />);
    
    // Check if program markers are rendered
    const markers = screen.getAllByTestId('advanced-marker');
    expect(markers.length).toBe(mockHeadStartPrograms.length);
  });

  test('does not render program markers when headStartPrograms layer is hidden', () => {
    // Override the mock to hide the headStartPrograms layer
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      layerVisibility: {
        majorCities: false,
        counties: false,
        headStartPrograms: false,
        txhsaRegions: false,
      },
    } as any);

    render(<TexasMapWithProvider />);

    // Check that no markers are rendered
    const markers = screen.queryAllByTestId('advanced-marker');
    expect(markers.length).toBe(0);
  });

  test('frames all of Texas once via defaultBounds instead of a fixed western center', () => {
    const { Map: MockMap } = require('@vis.gl/react-google-maps');
    render(<TexasMapWithProvider />);
    const calls = (MockMap as jest.Mock).mock.calls;
    const props = calls[calls.length - 1][0];
    expect(props.defaultBounds).toEqual({ west: -106.65, east: -93.5, south: 25.84, north: 36.5, padding: 24 });
    expect(props.defaultCenter).toBeUndefined();
    expect(props.defaultZoom).toBeUndefined();
  });

  test('Show all Texas refits the statewide bounds without changing the selection', async () => {
    const { useMap } = require('@vis.gl/react-google-maps');
    const map = useMap();
    render(<TexasMapWithProvider />);
    fireEvent.click(screen.getAllByTestId('advanced-marker')[0]);
    await screen.findByRole('region', { name: 'Test Program 1' });
    expect(map.fitBounds).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: 'Show all Texas' });
    expect(button).toHaveClass('min-h-[44px]');
    fireEvent.click(button);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    expect(map.fitBounds).toHaveBeenCalledWith({ west: -106.65, east: -93.5, south: 25.84, north: 36.5 }, 24);
    expect(screen.getByRole('region', { name: 'Test Program 1' })).toBeInTheDocument();
  });

  test('adds every program marker to a single clusterer and detaches it when the layer is hidden', async () => {
    const { rerender } = render(<TexasMapWithProvider />);
    const clusterers = (global as any).__getClustererInstances();
    await waitFor(() => expect(clusterers).toHaveLength(1));
    await waitFor(() => expect(clusterers[0].markers).toHaveLength(2));
    expect(clusterers[0].markers.map((m: any) => m.title)).toEqual(['Test Program 1', 'Test Program 2']);

    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      layerVisibility: { majorCities: false, counties: false, headStartPrograms: false, txhsaRegions: false },
    } as any);
    rerender(<TexasMapWithProvider />);
    expect(screen.queryAllByTestId('advanced-marker')).toHaveLength(0);
    expect(clusterers[0].setMap).toHaveBeenCalledWith(null);
    expect(clusterers[0].markers).toHaveLength(0);
  });

  test('search selection works for clustered and coincident locations', async () => {
    const { useMap } = require('@vis.gl/react-google-maps');
    const map = useMap();
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      headStartPrograms: [
        mockHeadStartPrograms[0],
        { ...mockHeadStartPrograms[0], id: 'program-3', name: 'Coincident Program' },
      ],
    } as any);
    render(<TexasMapWithProvider />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Head Start programs' }), { target: { value: 'Coincident' } });
    fireEvent.click(screen.getByRole('button', { name: 'View Coincident Program' }));
    expect(await screen.findByRole('region', { name: 'Coincident Program' })).toBeInTheDocument();
    expect(map.panTo).toHaveBeenCalledWith({ lat: 30.2672, lng: -97.7431 });
    expect(map.setZoom).toHaveBeenCalledWith(12);
  });

  test('renders details when a program is selected', async () => {
    render(<TexasMapWithProvider />);
    
    // Find a marker and click it
    const markers = screen.getAllByTestId('advanced-marker');
    fireEvent.click(markers[0]);
    
    // Details are outside the map surface.
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Test Program 1' })).toBeInTheDocument();
    });
  });

  test('selection replaces results with focused details and closing restores the selected result', async () => {
    render(<TexasMapWithProvider />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Head Start programs' }), { target: { value: 'Test Program' } });
    const result = screen.getByRole('button', { name: 'View Test Program 2' });
    screen.getByRole('textbox').focus();
    fireEvent.click(result);
    const details = await screen.findByRole('region', { name: 'Test Program 2' });
    expect(details).toHaveTextContent('456 Test Ave, Houston, TX');
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Test Program 2' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'View Test Program 2' })).toHaveFocus());
    expect(screen.queryByRole('region', { name: 'Test Program 2' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Test Program');
  });

  test('unknown location metadata is explicitly unverified and traceable', async () => {
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      headStartPrograms: [{ ...mockHeadStartPrograms[0], type: 'unknown', grantee: undefined, funding: undefined }],
    } as any);
    render(<TexasMapWithProvider />);
    fireEvent.click(screen.getByTestId('advanced-marker'));
    const infoWindow = await screen.findByRole('region', { name: 'Test Program 1' });
    expect(infoWindow).toHaveTextContent('Not verified');
    expect(infoWindow).toHaveTextContent('Legacy location record');
    expect(infoWindow).not.toHaveTextContent('Test Grantee 1');
    expect(infoWindow).not.toHaveTextContent('$1,000,000');
    expect(infoWindow.querySelector('a')).toHaveAttribute('href', '/data-provenance.md');
  });

  test.each([
    ['early-head-start', 'early head start'],
    ['both', 'Head Start + Early Head Start'],
  ])('renders cited %s metadata with its evidence', async (type, label) => {
    const programs = processHeadStartPrograms([{
      name: 'Test-only cited location', address: 'Test address',
      coordinates: { lat: 30.2672, lng: -97.7431 },
      type, grantee: 'Independent test recipient',
      source: { reference: 'Test-only document, row 1', asOf: '2026-01-31' },
    }]);
    mockUseMapData.mockReturnValue({ ...mockUseMapData(), headStartPrograms: programs } as any);
    render(<TexasMapWithProvider />);
    fireEvent.click(screen.getByTestId('advanced-marker'));
    const infoWindow = await screen.findByRole('region', { name: 'Test-only cited location' });
    expect(infoWindow).toHaveTextContent(label);
    expect(infoWindow).toHaveTextContent('Independent test recipient');
    expect(infoWindow).toHaveTextContent('Test-only document, row 1');
    expect(infoWindow).toHaveTextContent('2026-01-31');
  });

  test('closes details when close button is clicked', async () => {
    render(<TexasMapWithProvider />);
    
    // Find a marker and click it to open info window
    const markers = screen.getAllByTestId('advanced-marker');
    fireEvent.click(markers[0]);
    
    fireEvent.click(await screen.findByRole('button', { name: 'Close details' }));
    
    // Check if info window is closed (removed from the document)
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Test Program 1' })).not.toBeInTheDocument();
    });
  });

  test('displays loading state when data is loading', () => {
    // Override the mock to show loading state
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      isLoading: true,
      isLoadingPrograms: true,
      headStartPrograms: [],
    });
    
    render(<TexasMapWithProvider />);
    
    // Check if loading spinner is displayed
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('displays error state when there are errors', () => {
    // Override the mock to show error state
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      hasErrors: true,
      programsError: 'Failed to load programs',
      headStartPrograms: [],
    });
    
    render(<TexasMapWithProvider />);
    
    // Check if error display is shown
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('slow optional regions leave the program map and search available', () => {
    mockUseMapData.mockReturnValue({ ...mockUseMapData(), isLoading: true, isLoadingRegions: true });
    render(<TexasMapWithProvider />);
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.getAllByTestId('advanced-marker')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Loading TXHSA regions');
    expect(screen.getByLabelText('Toggle TXHSA Regions layer')).toBeDisabled();
  });

  test('region failure is announced with retry without hiding programs', () => {
    const retry = jest.fn();
    mockUseMapData.mockReturnValue({ ...mockUseMapData(), regionsError: 'Region boundaries unavailable', loadTxhsaRegions: retry });
    render(<TexasMapWithProvider />);
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.getAllByTestId('advanced-marker')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Region boundaries unavailable');
    expect(screen.getByLabelText('Toggle TXHSA Regions layer')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry TXHSA regions' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('calls toggleLayer when layer controls are used', () => {
    const toggleLayerMock = jest.fn();
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      toggleLayer: toggleLayerMock,
    } as any);

    render(<TexasMapWithProvider />);

    // Find and click a layer toggle button
    const headStartToggle = screen.getByTitle('Toggle Head Start Programs');
    fireEvent.click(headStartToggle);

    expect(toggleLayerMock).toHaveBeenCalledWith('headStartPrograms');
  });

  test('calls toggleLayer with txhsaRegions when the TXHSA Regions toggle is clicked', () => {
    const toggleLayerMock = jest.fn();
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      txhsaRegions: [{ name: 'West', feature: { type: 'Feature', properties: { name: 'West' }, geometry: { type: 'Polygon', coordinates: [] } } }],
      toggleLayer: toggleLayerMock,
    } as any);

    render(<TexasMapWithProvider />);

    const regionsToggle = screen.getByTitle('Toggle TXHSA Regions');
    fireEvent.click(regionsToggle);

    expect(toggleLayerMock).toHaveBeenCalledWith('txhsaRegions');
  });

  describe('TXHSA region overlay', () => {
    const region = (name: 'West' | 'North' | 'East' | 'South') => ({
      name,
      feature: {
        type: 'Feature' as const,
        properties: { name },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [-100, 30], [-99, 30], [-99, 31], [-100, 31], [-100, 30],
          ]],
        },
      },
      center: { lat: 30.5, lng: -99.5 },
    });

    const fourRegions = [region('West'), region('North'), region('East'), region('South')];

    test('region buttons open details without polygon clicks or enabling overlays', async () => {
      mockUseMapData.mockReturnValue({
        ...mockUseMapData(), txhsaRegions: fourRegions,
        regionProgramCounts: { West: 0, North: 2, East: 1, South: 7 },
      });
      render(<TexasMapWithProvider />);
      const button = screen.getByRole('button', { name: 'View South region' });
      screen.getByRole('textbox').focus();
      fireEvent.click(button);
      expect(await screen.findByRole('region', { name: 'South' })).toHaveTextContent('7 listed locations');
      expect(screen.getByRole('heading', { name: 'South' })).toHaveFocus();
      expect(mockUseMapData().toggleLayer).not.toHaveBeenCalled();
      fireEvent.keyDown(screen.getByRole('heading', { name: 'South' }), { key: 'Escape' });
      await waitFor(() => expect(button).toHaveFocus());
    });

    test('creates one google.maps.Data layer per region when the layer is on', async () => {
      mockUseMapData.mockReturnValue({
        ...mockUseMapData(),
        txhsaRegions: fourRegions,
        regionProgramCounts: { West: 1, North: 2, East: 3, South: 0 },
        layerVisibility: {
          majorCities: false,
          counties: false,
          headStartPrograms: true,
          txhsaRegions: true,
        },
      } as any);

      render(<TexasMapWithProvider />);

      await waitFor(() => {
        const instances = (global as any).__getMapDataInstances();
        expect(instances.length).toBeGreaterThanOrEqual(4);
      });
    });

    test('renders a region info window with name and program count when a region is clicked', async () => {
      mockUseMapData.mockReturnValue({
        ...mockUseMapData(),
        txhsaRegions: fourRegions,
        regionProgramCounts: { West: 0, North: 2, East: 1, South: 7 },
        layerVisibility: {
          majorCities: false,
          counties: false,
          headStartPrograms: true,
          txhsaRegions: true,
        },
      } as any);

      render(<TexasMapWithProvider />);

      await waitFor(() => {
        expect((global as any).__getMapDataInstances().length).toBeGreaterThanOrEqual(4);
      });

      // Fire a click on the 4th layer (South) via the mock helper.
      const instances = (global as any).__getMapDataInstances();
      act(() => instances[3]._fireClick({ lat: 27.5, lng: -98.0 }));

      const infoWindow = await screen.findByRole('region', { name: 'South' });
      expect(infoWindow).toHaveTextContent('South');
      expect(infoWindow).toHaveTextContent('7 listed locations in this region.');
      expect(infoWindow).toHaveTextContent('Funding not verified');
      expect(infoWindow).not.toHaveTextContent('19,049');
      expect(infoWindow.querySelector('a')).toHaveAttribute('href', '/data-provenance.md');

      // R11: no representative / party / committee / contact content.
      expect(infoWindow).not.toHaveTextContent(/Representative/i);
      expect(infoWindow).not.toHaveTextContent(/Party/i);
      expect(infoWindow).not.toHaveTextContent(/Committee/i);
      expect(infoWindow).not.toHaveTextContent(/Phone/i);
      expect(infoWindow).not.toHaveTextContent(/Email/i);
      expect(infoWindow).not.toHaveTextContent(/Office/i);
    });

    test('region info window shows singular copy for count of 1', async () => {
      mockUseMapData.mockReturnValue({
        ...mockUseMapData(),
        txhsaRegions: fourRegions,
        regionProgramCounts: { West: 1, North: 0, East: 0, South: 0 },
        layerVisibility: {
          majorCities: false,
          counties: false,
          headStartPrograms: true,
          txhsaRegions: true,
        },
      } as any);

      render(<TexasMapWithProvider />);
      await waitFor(() => {
        expect((global as any).__getMapDataInstances().length).toBeGreaterThanOrEqual(4);
      });
      act(() => (global as any).__getMapDataInstances()[0]._fireClick({ lat: 30.5, lng: -99.5 }));

      const infoWindow = await screen.findByRole('region', { name: 'West' });
      expect(infoWindow).toHaveTextContent('1 listed location in this region.');
      expect(infoWindow).not.toHaveTextContent('11,857');
    });

    test('region info window withholds unavailable counts and unverified funding', async () => {
      mockUseMapData.mockReturnValue({
        ...mockUseMapData(),
        txhsaRegions: fourRegions,
        regionProgramCounts: null,
        layerVisibility: {
          majorCities: false,
          counties: false,
          headStartPrograms: true,
          txhsaRegions: true,
        },
      } as any);

      render(<TexasMapWithProvider />);
      await waitFor(() => {
        expect((global as any).__getMapDataInstances().length).toBeGreaterThanOrEqual(4);
      });
      act(() => (global as any).__getMapDataInstances()[1]._fireClick({ lat: 30.5, lng: -99.5 }));

      const infoWindow = await screen.findByRole('region', { name: 'North' });
      expect(infoWindow).toHaveTextContent('North');
      expect(infoWindow).toHaveTextContent('Location count unavailable');
      expect(infoWindow).toHaveTextContent('Funding not verified');
      expect(infoWindow).not.toHaveTextContent('12,311');
    });
  });
});
