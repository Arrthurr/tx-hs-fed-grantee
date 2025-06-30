import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TexasMap from './TexasMap';
import { useMapData } from '../hooks/useMapData';
import { useSearch } from '../hooks/useSearch';

// Mock the custom hooks
jest.mock('../hooks/useMapData');
jest.mock('../hooks/useSearch');

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
  {
    type: 'Feature' as const,
    properties: {
      district: 'TX-2',
      name: 'Texas 2nd Congressional District',
      representative: 'Representative 2',
      districtNumber: 2,
      state: 'TX',
    },
    geometry: {
      type: 'MultiPolygon' as const,
      coordinates: [
        [
          [
            [-95.0, 29.0],
            [-95.0, 30.0],
            [-94.0, 30.0],
            [-94.0, 29.0],
            [-95.0, 29.0],
          ],
        ],
      ],
    },
  },
];

// Default mock implementations
const mockUseMapData = useMapData as jest.MockedFunction<typeof useMapData>;
const mockUseSearch = useSearch as jest.MockedFunction<typeof useSearch>;

describe('TexasMap Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockUseMapData.mockReturnValue({
      visibleHeadStartPrograms: mockHeadStartPrograms,
      visibleCongressionalDistricts: mockCongressionalDistricts,
      headStartPrograms: mockHeadStartPrograms,
      congressionalDistricts: mockCongressionalDistricts,
      layerVisibility: {
        majorCities: false,
        congressionalDistricts: true,
        counties: false,
        headStartPrograms: true,
      },
      toggleLayer: jest.fn(),
      isLoading: false,
      hasErrors: false,
    });
    
    mockUseSearch.mockReturnValue({
      searchTerm: '',
      isSearching: false,
      searchResults: {
        programs: [],
        districts: [],
        isSearchActive: false,
        totalResults: 0,
      },
      handleSearchChange: jest.fn(),
      clearSearch: jest.fn(),
      getSearchResultsBounds: jest.fn().mockReturnValue(null),
    });
  });

  test('renders the map component', () => {
    render(<TexasMap />);
    
    // Check if the map container is rendered
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });

  test('renders search bar', () => {
    render(<TexasMap />);
    
    // Check if the search bar is rendered
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  test('renders program markers when headStartPrograms layer is visible', () => {
    render(<TexasMap />);
    
    // Check if program markers are rendered
    const markers = screen.getAllByTestId('advanced-marker');
    expect(markers.length).toBe(mockHeadStartPrograms.length);
  });

  test('does not render program markers when headStartPrograms layer is hidden', () => {
    // Override the mock to hide the headStartPrograms layer
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      layerVisibility: {
        ...mockUseMapData().layerVisibility,
        headStartPrograms: false,
      },
    });
    
    render(<TexasMap />);
    
    // Check that no markers are rendered
    const markers = screen.queryAllByTestId('advanced-marker');
    expect(markers.length).toBe(0);
  });

  test('renders info window when a program is selected', async () => {
    render(<TexasMap />);
    
    // Find a marker and click it
    const markers = screen.getAllByTestId('advanced-marker');
    fireEvent.click(markers[0]);
    
    // Check if info window is rendered
    await waitFor(() => {
      expect(screen.getByTestId('info-window')).toBeInTheDocument();
      expect(screen.getByText(mockHeadStartPrograms[0].name)).toBeInTheDocument();
    });
  });

  test('closes info window when close button is clicked', async () => {
    render(<TexasMap />);
    
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

  test('displays search results when search is active', () => {
    // Override the mock to simulate active search
    mockUseSearch.mockReturnValue({
      ...mockUseSearch(),
      searchTerm: 'test',
      isSearching: true,
      searchResults: {
        programs: mockHeadStartPrograms,
        districts: mockCongressionalDistricts,
        isSearchActive: true,
        totalResults: mockHeadStartPrograms.length + mockCongressionalDistricts.length,
      },
    });
    
    render(<TexasMap />);
    
    // Check if search results are displayed
    expect(screen.getByText(/found/i)).toBeInTheDocument();
  });

  test('handles program selection from search results', async () => {
    // Override the mock to simulate active search
    const handleSelectProgramMock = jest.fn();
    mockUseSearch.mockReturnValue({
      ...mockUseSearch(),
      searchTerm: 'test',
      isSearching: true,
      searchResults: {
        programs: mockHeadStartPrograms,
        districts: [],
        isSearchActive: true,
        totalResults: mockHeadStartPrograms.length,
      },
      handleSearchChange: jest.fn(),
      clearSearch: jest.fn(),
    });
    
    render(<TexasMap />);
    
    // Find a program in search results and click it
    const programButtons = screen.getAllByText(mockHeadStartPrograms[0].name);
    fireEvent.click(programButtons[0]);
    
    // Check if map.panTo and map.setZoom were called
    await waitFor(() => {
      expect(global.google.maps.Map.prototype.panTo).toHaveBeenCalled();
      expect(global.google.maps.Map.prototype.setZoom).toHaveBeenCalled();
    });
  });

  test('handles district selection from search results', async () => {
    // Override the mock to simulate active search
    mockUseSearch.mockReturnValue({
      ...mockUseSearch(),
      searchTerm: 'district',
      isSearching: true,
      searchResults: {
        programs: [],
        districts: mockCongressionalDistricts,
        isSearchActive: true,
        totalResults: mockCongressionalDistricts.length,
      },
    });
    
    render(<TexasMap />);
    
    // Find a district in search results and click it
    const districtButtons = screen.getAllByText(/District/);
    fireEvent.click(districtButtons[0]);
    
    // Check if map.panTo and map.setZoom were called
    await waitFor(() => {
      expect(global.google.maps.Map.prototype.panTo).toHaveBeenCalled();
      expect(global.google.maps.Map.prototype.setZoom).toHaveBeenCalled();
    });
  });

  test('handles map controls interactions', () => {
    render(<TexasMap />);
    
    // Find map controls
    const zoomInButton = screen.getByTitle('Zoom In');
    const zoomOutButton = screen.getByTitle('Zoom Out');
    const resetViewButton = screen.getByTitle('Reset to Texas View');
    const fitMarkersButton = screen.getByTitle('Fit All Markers');
    
    // Click zoom in button
    fireEvent.click(zoomInButton);
    expect(global.google.maps.Map.prototype.setZoom).toHaveBeenCalled();
    
    // Click zoom out button
    fireEvent.click(zoomOutButton);
    expect(global.google.maps.Map.prototype.setZoom).toHaveBeenCalled();
    
    // Click reset view button
    fireEvent.click(resetViewButton);
    expect(global.google.maps.Map.prototype.panTo).toHaveBeenCalled();
    expect(global.google.maps.Map.prototype.setZoom).toHaveBeenCalled();
    
    // Click fit markers button
    fireEvent.click(fitMarkersButton);
    expect(global.google.maps.Map.prototype.fitBounds).toHaveBeenCalled();
  });

  test('toggles layer visibility when layer controls are clicked', () => {
    const toggleLayerMock = jest.fn();
    mockUseMapData.mockReturnValue({
      ...mockUseMapData(),
      toggleLayer: toggleLayerMock,
    });
    
    render(<TexasMap />);
    
    // Find layer toggle buttons
    const headStartToggle = screen.getByText('Head Start Programs').closest('button');
    const districtsToggle = screen.getByText('Congressional Districts').closest('button');
    
    // Click head start toggle
    if (headStartToggle) {
      fireEvent.click(headStartToggle);
      expect(toggleLayerMock).toHaveBeenCalledWith('headStartPrograms');
    }
    
    // Click districts toggle
    if (districtsToggle) {
      fireEvent.click(districtsToggle);
      expect(toggleLayerMock).toHaveBeenCalledWith('congressionalDistricts');
    }
  });
});