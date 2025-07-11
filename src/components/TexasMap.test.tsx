/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TexasMap from './TexasMap';
import { useMapData } from '../hooks/useMapData';
import { APIProvider } from '@vis.gl/react-google-maps';

// Mock the custom hooks
jest.mock('../hooks/useMapData');

// Mock the API Provider
jest.mock('@vis.gl/react-google-maps', () => ({
  ...jest.requireActual('@vis.gl/react-google-maps'),
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
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

const mockCongressionalDistricts = [
  {
    number: 1,
    representative: 'Representative 1',
    population: 750000,
    center: { lat: 30.5, lng: -96.5 },
    headStartPrograms: [],
    party: 'Republican',
  },
  {
    number: 2,
    representative: 'Representative 2',
    population: 750000,
    center: { lat: 29.5, lng: -95.5 },
    headStartPrograms: [],
    party: 'Democrat',
  },
];

const mockRawDistrictFeatures = [
  {
    type: 'Feature' as const,
    properties: {
      district: 'TX-1',
      name: 'Texas 1st Congressional District',
      representative: 'Representative 1',
      districtNumber: 1,
      state: 'TX',
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [-97.0, 30.0],
        [-97.0, 31.0],
        [-96.0, 31.0],
        [-96.0, 30.0],
        [-97.0, 30.0],
      ]],
    },
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
      programs: mockHeadStartPrograms,
      districts: mockCongressionalDistricts,
      headStartPrograms: mockHeadStartPrograms,
      congressionalDistricts: mockCongressionalDistricts,
      rawDistrictFeatures: mockRawDistrictFeatures,
      layerVisibility: {
        majorCities: false,
        congressionalDistricts: false,
        districtBoundaries: false,
        counties: false,
        headStartPrograms: true,
      },
      toggleLayer: jest.fn(),
      setLayerVisibilityState: jest.fn(),
      isLoading: false,
      isLoadingPrograms: false,
      isLoadingDistricts: false,
      isLoadingCongressData: false,
      hasErrors: false,
      programsError: null,
      districtsError: null,
      congressDataError: null,
      retryLoading: jest.fn(),
      loadHeadStartPrograms: jest.fn(),
      loadCongressionalDistricts: jest.fn(),
      loadCongressionalData: jest.fn(),
    });
  });

  // Mock the TexasMap component with API Provider wrapper
  const TexasMapWithProvider = () => (
    <APIProvider apiKey="test-api-key">
      <TexasMap />
    </APIProvider>
  );

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
        congressionalDistricts: false,
        districtBoundaries: false,
        counties: false,
        headStartPrograms: false,
      },
    });
    
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
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
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
    expect(screen.getByTestId('error-display')).toBeInTheDocument();
  });

  test('calls toggleLayer when layer controls are used', () => {
    const toggleLayerMock = jest.fn();
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      toggleLayer: toggleLayerMock,
    });
    
    render(<TexasMapWithProvider />);
    
    // Find and click a layer toggle button
    const headStartToggle = screen.getByTitle('Toggle Head Start Programs');
    fireEvent.click(headStartToggle);
    
    expect(toggleLayerMock).toHaveBeenCalledWith('programs');
  });
});