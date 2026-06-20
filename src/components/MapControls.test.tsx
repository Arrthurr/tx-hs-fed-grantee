/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from '@testing-library/react';
import MapControls from './MapControls';

describe('MapControls Component', () => {
  const mockProps = {
    layerVisibility: {
      programs: true,
      txhsaRegions: false,
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
    expect(screen.getByTitle('Toggle TXHSA Regions')).toBeInTheDocument();
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

  test('calls onToggleLayer with correct layer when TXHSA Regions button is clicked', () => {
    render(<MapControls {...mockProps} />);
    fireEvent.click(screen.getByTitle('Toggle TXHSA Regions'));
    expect(mockProps.onToggleLayer).toHaveBeenCalledWith('txhsaRegions');
  });

  test('Head Start Programs button shows active state when visible', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, programs: true }} />);
    const headStartButton = screen.getByTitle('Toggle Head Start Programs');
    expect(headStartButton).toHaveClass('bg-headstart-accent');
  });

  test('TXHSA Regions button reflects active state and label', () => {
    render(<MapControls {...mockProps} layerVisibility={{ ...mockProps.layerVisibility, txhsaRegions: true }} />);
    const regionsButton = screen.getByTitle('Toggle TXHSA Regions');
    expect(regionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('TXHSA Regions')).toBeInTheDocument();
  });

  test('buttons have correct aria-pressed attributes', () => {
    render(<MapControls {...mockProps} />);

    const headStartButton = screen.getByTitle('Toggle Head Start Programs');
    const regionsButton = screen.getByTitle('Toggle TXHSA Regions');

    expect(headStartButton).toHaveAttribute('aria-pressed', 'true');
    expect(regionsButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('TXHSA Regions toggle has the expected aria-label', () => {
    render(<MapControls {...mockProps} />);
    expect(screen.getByLabelText('Toggle TXHSA Regions layer')).toBeInTheDocument();
  });
});
