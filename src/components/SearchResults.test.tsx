/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchResults from './SearchResults';
import { HeadStartProgram } from '../types/maps';

describe('SearchResults Component', () => {
  const mockPrograms: HeadStartProgram[] = [
    {
      id: 'prog-1',
      name: 'Test Program 1',
      address: '123 Main St, Austin, TX 78701',
      lat: 30.2672,
      lng: -97.7431,
      type: 'head-start',
      grantee: 'Test Grantee 1',
      funding: 1000000,
    },
    {
      id: 'prog-2',
      name: 'Test Program 2',
      address: '456 Oak Ave, Houston, TX 77001',
      lat: 29.7604,
      lng: -95.3698,
      type: 'early-head-start',
      grantee: 'Test Grantee 2',
      funding: 2000000,
    },
  ];

  const mockProps = {
    programs: [] as HeadStartProgram[],
    isSearchActive: false,
    onSelectProgram: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when search is not active', () => {
    const { container } = render(
      <SearchResults {...mockProps} isSearchActive={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('returns null when no programs are found', () => {
    const { container } = render(
      <SearchResults {...mockProps} isSearchActive={true} programs={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders programs section when programs are present', () => {
    render(<SearchResults {...mockProps} isSearchActive={true} programs={mockPrograms} />);

    expect(screen.getByText(/Head Start Programs/)).toBeInTheDocument();
    expect(screen.getByText('Test Program 1')).toBeInTheDocument();
    expect(screen.getByText('Test Program 2')).toBeInTheDocument();
  });

  test('displays program count in heading', () => {
    render(<SearchResults {...mockProps} isSearchActive={true} programs={mockPrograms} />);
    expect(screen.getByText('Head Start Programs (2)')).toBeInTheDocument();
  });

  test('calls onSelectProgram when a program is clicked', () => {
    render(<SearchResults {...mockProps} isSearchActive={true} programs={mockPrograms} />);

    const programButton = screen.getByLabelText(/View details for Test Program 1/);
    fireEvent.click(programButton);

    expect(mockProps.onSelectProgram).toHaveBeenCalledWith(mockPrograms[0]);
  });

  test('respects maxResultsPerCategory limit for programs', () => {
    const manyPrograms = Array.from({ length: 10 }, (_, i) => ({
      ...mockPrograms[0],
      id: `prog-${i}`,
      name: `Program ${i}`,
    }));

    render(
      <SearchResults
        {...mockProps}
        isSearchActive={true}
        programs={manyPrograms}
        maxResultsPerCategory={3}
      />
    );

    expect(screen.getByText('Program 0')).toBeInTheDocument();
    expect(screen.getByText('Program 2')).toBeInTheDocument();
    expect(screen.queryByText('Program 3')).not.toBeInTheDocument();
  });

  test('shows more results message when programs exceed limit', () => {
    const manyPrograms = Array.from({ length: 10 }, (_, i) => ({
      ...mockPrograms[0],
      id: `prog-${i}`,
      name: `Program ${i}`,
    }));

    render(
      <SearchResults
        {...mockProps}
        isSearchActive={true}
        programs={manyPrograms}
        maxResultsPerCategory={3}
      />
    );

    expect(screen.getByText('7 more programs not shown')).toBeInTheDocument();
  });

  test('displays program address', () => {
    render(<SearchResults {...mockProps} isSearchActive={true} programs={mockPrograms} />);
    expect(screen.getByText('123 Main St, Austin, TX 78701')).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    render(<SearchResults {...mockProps} isSearchActive={true} programs={mockPrograms} />);
    const region = screen.getByRole('region', { name: /Search results/ });
    expect(region).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <SearchResults
        {...mockProps}
        isSearchActive={true}
        programs={mockPrograms}
        className="custom-results"
      />
    );

    const resultsDiv = container.querySelector('.custom-results');
    expect(resultsDiv).toBeInTheDocument();
  });

  test('handles default maxResultsPerCategory', () => {
    const manyPrograms = Array.from({ length: 8 }, (_, i) => ({
      ...mockPrograms[0],
      id: `prog-${i}`,
      name: `Program ${i}`,
    }));

    render(<SearchResults {...mockProps} isSearchActive={true} programs={manyPrograms} />);

    // Default is 5
    expect(screen.getByText('Program 0')).toBeInTheDocument();
    expect(screen.getByText('Program 4')).toBeInTheDocument();
    expect(screen.queryByText('Program 5')).not.toBeInTheDocument();
    expect(screen.getByText('3 more programs not shown')).toBeInTheDocument();
  });

  test('no district / representative content surfaces after the U7 refactor', () => {
    render(<SearchResults {...mockProps} isSearchActive={true} programs={mockPrograms} />);
    expect(screen.queryByText(/Congressional District/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Representative/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rep\./)).not.toBeInTheDocument();
  });
});
