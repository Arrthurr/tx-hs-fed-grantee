/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MapControls from './MapControls';

describe('MapControls Component', () => {
  const mockProps = {
    layerVisibility: {
      programs: true,
      districtBoundaries: false,
    },
    onToggleLayer: jest.fn(),
    programCount: 85,
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
    expect(screen.getByTitle('Toggle District Boundaries')).toBeInTheDocument();
  });

  test('displays correct program count', () => {
    render(<MapControls {...mockProps} />);
    expect(screen.getByText('85 programs across Texas')).toBeInTheDocument();
  });

  test('calls onToggleLayer with correct layer when Head Start Programs button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Toggle Head Start Programs'));
    expect(mockProps.onToggleLayer).toHaveBeenCalledWith('programs');
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

  test('District Boundaries button shows active state when visible', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, districtBoundaries: true }} />);
    const boundariesButton = screen.getByTitle('Toggle District Boundaries');
    expect(boundariesButton).toHaveClass('bg-tx-blue-50');
  });

  test('buttons have correct aria-pressed attributes', () => {
    render(<MapControls {...mockProps} />);
    
    const headStartButton = screen.getByTitle('Toggle Head Start Programs');
    const boundariesButton = screen.getByTitle('Toggle District Boundaries');
    
    expect(headStartButton).toHaveAttribute('aria-pressed', 'true');
    expect(boundariesButton).toHaveAttribute('aria-pressed', 'false');
  });
});
