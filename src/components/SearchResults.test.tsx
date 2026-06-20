/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from '@testing-library/react';
import SearchResults from './SearchResults';
import type { HeadStartProgram } from '../types/maps';

describe('SearchResults Component', () => {
  const mockPrograms: HeadStartProgram[] = [
    {
      id: 'program-1',
      name: 'Austin Head Start',
      address: '123 Main St, Austin, TX 78701',
      lat: 30.2672,
      lng: -97.7431,
      type: 'head-start',
      grantee: 'Austin ISD',
      funding: 1000000,
    },
    {
      id: 'program-2',
      name: 'Houston Early Head Start',
      address: '456 Oak Ave, Houston, TX 77002',
      lat: 29.7604,
      lng: -95.3698,
      type: 'early-head-start',
      grantee: 'Houston Community Services',
      funding: 2000000,
    },
    {
      id: 'program-3',
      name: 'Dallas Head Start Center',
      address: '789 Elm St, Dallas, TX 75201',
      lat: 32.7767,
      lng: -96.797,
      type: 'head-start',
      grantee: undefined,
    },
  ];

  const onSelectProgram = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when search is not active', () => {
    const { container } = render(
      <SearchResults programs={mockPrograms} isSearchActive={false} onSelectProgram={onSelectProgram} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders a "no results" message when search is active but programs is empty', () => {
    render(
      <SearchResults programs={[]} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByText(/No programs found matching your search/)).toBeInTheDocument();
  });

  test('renders one button per program when results exist', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  test('displays program name in each result button', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByText('Austin Head Start')).toBeInTheDocument();
    expect(screen.getByText('Houston Early Head Start')).toBeInTheDocument();
    expect(screen.getByText('Dallas Head Start Center')).toBeInTheDocument();
  });

  test('displays program address in each result', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByText('123 Main St, Austin, TX 78701')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave, Houston, TX 77002')).toBeInTheDocument();
  });

  test('displays grantee when present', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByText('Austin ISD')).toBeInTheDocument();
    expect(screen.getByText('Houston Community Services')).toBeInTheDocument();
  });

  test('does not render grantee section when grantee is undefined', () => {
    render(
      <SearchResults programs={[mockPrograms[2]]} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.queryByText('Austin ISD')).not.toBeInTheDocument();
  });

  test('shows HS badge for head-start programs', () => {
    render(
      <SearchResults programs={[mockPrograms[0]]} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByText('HS')).toBeInTheDocument();
  });

  test('shows EHS badge for early-head-start programs', () => {
    render(
      <SearchResults programs={[mockPrograms[1]]} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByText('EHS')).toBeInTheDocument();
  });

  test('calls onSelectProgram with the correct program when a result is clicked', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    fireEvent.click(screen.getByLabelText('View Houston Early Head Start'));
    expect(onSelectProgram).toHaveBeenCalledWith(mockPrograms[1]);
    expect(onSelectProgram).toHaveBeenCalledTimes(1);
  });

  test('each result button has an accessible aria-label', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByLabelText('View Austin Head Start')).toBeInTheDocument();
    expect(screen.getByLabelText('View Houston Early Head Start')).toBeInTheDocument();
    expect(screen.getByLabelText('View Dallas Head Start Center')).toBeInTheDocument();
  });

  test('results container has role="listbox"', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  test('results list has role="list"', () => {
    render(
      <SearchResults programs={mockPrograms} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  test('applies custom className to the container', () => {
    render(
      <SearchResults
        programs={mockPrograms}
        isSearchActive
        onSelectProgram={onSelectProgram}
        className="custom-class"
      />
    );
    expect(screen.getByRole('listbox')).toHaveClass('custom-class');
  });

  test('"no results" message has aria-live="polite"', () => {
    render(
      <SearchResults programs={[]} isSearchActive onSelectProgram={onSelectProgram} />
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
