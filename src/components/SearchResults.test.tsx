/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchResults from './SearchResults';
import { HeadStartProgram, CongressionalDistrictFeature } from '../types/maps';

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

  const mockDistricts: CongressionalDistrictFeature[] = [
    {
      type: 'Feature',
      properties: {
        district: 'TX-1',
        name: 'Texas 1st Congressional District',
        representative: 'John Smith',
        districtNumber: 1,
        state: 'TX',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-97, 30],
          [-96, 30],
          [-96, 31],
          [-97, 31],
          [-97, 30],
        ]],
      },
    },
  ];

  const mockProps = {
    programs: [] as HeadStartProgram[],
    districts: [] as CongressionalDistrictFeature[],
    isSearchActive: false,
    onSelectProgram: jest.fn(),
    onSelectDistrict: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when search is not active', () => {
    const { container } = render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={false}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('returns null when no results are found', () => {
    const { container } = render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={[]}
        districts={[]}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('renders programs section when programs are present', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={mockPrograms}
      />
    );
    
    expect(screen.getByText(/Head Start Programs/)).toBeInTheDocument();
    expect(screen.getByText('Test Program 1')).toBeInTheDocument();
    expect(screen.getByText('Test Program 2')).toBeInTheDocument();
  });

  test('renders districts section when districts are present', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        districts={mockDistricts}
      />
    );
    
    expect(screen.getByText(/Congressional Districts/)).toBeInTheDocument();
    expect(screen.getByText('District 1st')).toBeInTheDocument();
    expect(screen.getByText(/John Smith/)).toBeInTheDocument();
  });

  test('displays program count in heading', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={mockPrograms}
      />
    );
    
    expect(screen.getByText('Head Start Programs (2)')).toBeInTheDocument();
  });

  test('displays district count in heading', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        districts={mockDistricts}
      />
    );
    
    expect(screen.getByText('Congressional Districts (1)')).toBeInTheDocument();
  });

  test('calls onSelectProgram when a program is clicked', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={mockPrograms}
      />
    );
    
    const programButton = screen.getByLabelText(/View details for Test Program 1/);
    fireEvent.click(programButton);
    
    expect(mockProps.onSelectProgram).toHaveBeenCalledWith(mockPrograms[0]);
  });

  test('calls onSelectDistrict when a district is clicked', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        districts={mockDistricts}
      />
    );
    
    const districtButton = screen.getByLabelText(/View details for Congressional District/);
    fireEvent.click(districtButton);
    
    expect(mockProps.onSelectDistrict).toHaveBeenCalledWith(mockDistricts[0]);
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
    
    // Should only show 3 programs
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

  test('shows more results message when districts exceed limit', () => {
    const manyDistricts = Array.from({ length: 8 }, (_, i) => ({
      ...mockDistricts[0],
      properties: {
        ...mockDistricts[0].properties,
        district: `TX-${i}`,
        districtNumber: i,
      },
    }));
    
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        districts={manyDistricts}
        maxResultsPerCategory={2}
      />
    );
    
    expect(screen.getByText('6 more districts not shown')).toBeInTheDocument();
  });

  test('displays program address', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={mockPrograms}
      />
    );
    
    expect(screen.getByText('123 Main St, Austin, TX 78701')).toBeInTheDocument();
  });

  test('displays representative name for districts', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        districts={mockDistricts}
      />
    );
    
    expect(screen.getByText('Rep. John Smith')).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    const { container } = render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={mockPrograms}
        districts={mockDistricts}
      />
    );
    
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

  test('renders both programs and districts together', () => {
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={mockPrograms}
        districts={mockDistricts}
      />
    );
    
    expect(screen.getByText(/Head Start Programs/)).toBeInTheDocument();
    expect(screen.getByText(/Congressional Districts/)).toBeInTheDocument();
    expect(screen.getByText('Test Program 1')).toBeInTheDocument();
    expect(screen.getByText('District 1st')).toBeInTheDocument();
  });

  test('handles default maxResultsPerCategory', () => {
    const manyPrograms = Array.from({ length: 8 }, (_, i) => ({
      ...mockPrograms[0],
      id: `prog-${i}`,
      name: `Program ${i}`,
    }));
    
    render(
      <SearchResults 
        {...mockProps} 
        isSearchActive={true}
        programs={manyPrograms}
      />
    );
    
    // Default is 5
    expect(screen.getByText('Program 0')).toBeInTheDocument();
    expect(screen.getByText('Program 4')).toBeInTheDocument();
    expect(screen.queryByText('Program 5')).not.toBeInTheDocument();
    expect(screen.getByText('3 more programs not shown')).toBeInTheDocument();
  });
});
