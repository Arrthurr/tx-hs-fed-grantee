/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TexasMap from './TexasMap';
import { useMapData } from '../hooks/useMapData';

// Mock the custom hooks
jest.mock('../hooks/useMapData');

// Mock the API Provider (already mocked in setupTests.ts, but override APIProvider here)
jest.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  AdvancedMarker: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="advanced-marker" onClick={onClick}>{children}</div>
  ),
  Pin: () => <div data-testid="map-pin" />,
  InfoWindow: ({ children, onCloseClick }: { children: React.ReactNode; onCloseClick?: () => void }) => (
    <div data-testid="info-window" onClick={onCloseClick}>{children}</div>
  ),
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

beforeAll(() => {
  process.env = {
    ...originalEnv,
    VITE_GOOGLE_MAPS_API_KEY: 'test-api-key',
  };
});

afterAll(() => {
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

  test('renders info window when a program is selected', async () => {
    render(<TexasMapWithProvider />);
    
    // Find a marker and click it
    const markers = screen.getAllByTestId('advanced-marker');
    fireEvent.click(markers[0]);
    
    // Check if info window is rendered
    await waitFor(() => {
      expect(screen.getByTestId('info-window')).toBeInTheDocument();
    });
  });

  test('closes info window when close button is clicked', async () => {
    render(<TexasMapWithProvider />);
    
    // Find a marker and click it to open info window
    const markers = screen.getAllByTestId('advanced-marker');
    fireEvent.click(markers[0]);
    
    // Find the info window and click its close button
    const infoWindow = await screen.findByTestId('info-window');
    fireEvent.click(infoWindow);
    
    // Check if info window is closed (removed from the document)
    await waitFor(() => {
      expect(screen.queryByTestId('info-window')).not.toBeInTheDocument();
    });
  });

  test('displays loading state when data is loading', () => {
    // Override the mock to show loading state
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      isLoading: true,
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
    });
    
    render(<TexasMapWithProvider />);
    
    // Check if error display is shown
    expect(screen.getByRole('alert')).toBeInTheDocument();
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
      instances[3]._fireClick({ lat: 27.5, lng: -98.0 });

      const infoWindow = await screen.findByTestId('info-window');
      expect(infoWindow).toHaveTextContent('South');
      expect(infoWindow).toHaveTextContent('7 Head Start / Early Head Start programs in this region.');

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
      (global as any).__getMapDataInstances()[0]._fireClick({ lat: 30.5, lng: -99.5 });

      const infoWindow = await screen.findByTestId('info-window');
      expect(infoWindow).toHaveTextContent('1 Head Start / Early Head Start program in this region.');
    });

    test('region info window shows a loading message when counts are not yet computed', async () => {
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
      (global as any).__getMapDataInstances()[1]._fireClick({ lat: 30.5, lng: -99.5 });

      const infoWindow = await screen.findByTestId('info-window');
      expect(infoWindow).toHaveTextContent('North');
      expect(infoWindow).toHaveTextContent(/Loading program count/);
    });
  });
});