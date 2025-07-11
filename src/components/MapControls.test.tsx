/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MapControls from './MapControls';

describe('MapControls Component', () => {
  const mockProps = {
    layerVisibility: {
      programs: true,
      districts: false,
      districtBoundaries: false,
    },
    onToggleLayer: jest.fn(),
    programCount: 85,
    districtCount: 36,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the data layers heading', () => {
    render(<MapControls {...mockProps} />);
    expect(screen.getByText('Data Layers')).toBeInTheDocument();
  });

  test('renders all layer toggle buttons', () => {
    render(<MapControls {...mockProps} />);

    expect(screen.getByTitle('Toggle Head Start Programs')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle Congressional Districts')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle District Boundaries')).toBeInTheDocument();
  });

  test('displays correct program count', () => {
    render(<MapControls {...mockProps} />);
    expect(screen.getByText('85 programs across Texas')).toBeInTheDocument();
  });

  test('displays correct district count', () => {
    render(<MapControls {...mockProps} />);
    expect(screen.getByText('36 districts in Texas')).toBeInTheDocument();
  });

  test('calls onToggleLayer with correct layer when Head Start Programs button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Toggle Head Start Programs'));
    expect(mockProps.onToggleLayer).toHaveBeenCalledWith('programs');
  });

  test('calls onToggleLayer with correct layer when Congressional Districts button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Toggle Congressional Districts'));
    expect(mockProps.onToggleLayer).toHaveBeenCalledWith('districts');
  });

  test('calls onToggleLayer with correct layer when District Boundaries button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Toggle District Boundaries'));
    expect(mockProps.onToggleLayer).toHaveBeenCalledWith('districtBoundaries');
  });

  test('Head Start Programs button shows active state when visible', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, programs: true }} />);
    const headStartButton = screen.getByTitle('Toggle Head Start Programs');
    expect(headStartButton).toHaveClass('bg-headstart-accent');
  });

  test('Congressional Districts button shows active state when visible', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, districts: true }} />);
    const districtsButton = screen.getByTitle('Toggle Congressional Districts');
    expect(districtsButton).toHaveClass('bg-district-accent');
  });

  test('District Boundaries button shows active state when visible', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, districtBoundaries: true }} />);
    const boundariesButton = screen.getByTitle('Toggle District Boundaries');
    expect(boundariesButton).toHaveClass('bg-tx-blue-50');
  });

  test('buttons have correct aria-pressed attributes', () => {
    render(<MapControls {...mockProps} />);
    
    const headStartButton = screen.getByTitle('Toggle Head Start Programs');
    const districtsButton = screen.getByTitle('Toggle Congressional Districts');
    const boundariesButton = screen.getByTitle('Toggle District Boundaries');
    
    expect(headStartButton).toHaveAttribute('aria-pressed', 'true');
    expect(districtsButton).toHaveAttribute('aria-pressed', 'false');
    expect(boundariesButton).toHaveAttribute('aria-pressed', 'false');
  });
});
