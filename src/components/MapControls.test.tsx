import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MapControls from './MapControls';

describe('MapControls Component', () => {
  const mockProps = {
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onResetView: jest.fn(),
    onFitMarkers: jest.fn(),
    onToggleFullscreen: jest.fn(),
    isFullscreen: false,
    markerCount: 5,
    layerVisibility: {
      majorCities: false,
      congressionalDistricts: true,
      counties: false,
      headStartPrograms: true,
    },
    onToggleLayer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all control buttons', () => {
    render(<MapControls {...mockProps} />);

    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Reset to Texas View')).toBeInTheDocument();
    expect(screen.getByTitle('Fit All Markers')).toBeInTheDocument();
    expect(screen.getByTitle('Enter Fullscreen')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Head Start Programs')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Congressional Districts')).toBeInTheDocument();
  });

  test('calls onZoomIn when "Zoom In" button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(mockProps.onZoomIn).toHaveBeenCalledTimes(1);
  });

  test('calls onZoomOut when "Zoom Out" button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(mockProps.onZoomOut).toHaveBeenCalledTimes(1);
  });

  test('calls onResetView when "Reset to Texas View" button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Reset to Texas View'));
    expect(mockProps.onResetView).toHaveBeenCalledTimes(1);
  });

  test('calls onFitMarkers when "Fit All Markers" button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Fit All Markers'));
    expect(mockProps.onFitMarkers).toHaveBeenCalledTimes(1);
  });

  test('displays marker count on "Fit All Markers" button', () => {
    render(<MapControls {...mockProps} markerCount={10} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  test('calls onToggleFullscreen when "Enter Fullscreen" button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Enter Fullscreen'));
    expect(mockProps.onToggleFullscreen).toHaveBeenCalledTimes(1);
  });

  test('changes fullscreen button title when isFullscreen is true', () => {
    render(<MapControls {...mockProps} isFullscreen={true} />);
    expect(screen.getByTitle('Exit Fullscreen')).toBeInTheDocument();
  });

  test('calls onToggleLayer with correct layer when Head Start Programs button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Toggle Head Start Programs'));
    expect(mockProps.onToggleLayer).toHaveBeenCalledWith('headStartPrograms');
  });

  test('calls onToggleLayer with correct layer when Congressional Districts button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Toggle Congressional Districts'));
    expect(mockProps.onToggleLayer).toHaveBeenCalledWith('congressionalDistricts');
  });

  test('Head Start Programs layer button shows active state when visible', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, headStartPrograms: true }} />);
    const headStartButton = screen.getByTitle('Toggle Head Start Programs');
    expect(headStartButton).toHaveClass('bg-headstart-accent');
    expect(headStartButton.querySelector('.bg-headstart-primary')).toBeInTheDocument();
  });

  test('Congressional Districts layer button shows active state when visible', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, congressionalDistricts: true }} />);
    const districtsButton = screen.getByTitle('Toggle Congressional Districts');
    expect(districtsButton).toHaveClass('bg-district-accent');
    expect(districtsButton.querySelector('.bg-district-primary')).toBeInTheDocument();
  });
});
