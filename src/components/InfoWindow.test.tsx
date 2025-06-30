import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoWindow } from '@vis.gl/react-google-maps';
import { HeadStartProgram, CongressionalDistrictFeature } from '../types/maps';

// Mock the InfoWindow component from @vis.gl/react-google-maps
jest.mock('@vis.gl/react-google-maps', () => ({
  ...jest.requireActual('@vis.gl/react-google-maps'),
  InfoWindow: ({ children, onCloseClick, ...props }: any) => (
    <div data-testid="info-window" onClick={onCloseClick} {...props}>
      {children}
    </div>
  ),
}));

// Test component to render InfoWindow with program data
const ProgramInfoWindow: React.FC<{
  program: HeadStartProgram;
  onClose: () => void;
}> = ({ program, onClose }) => (
  <InfoWindow
    position={{ lat: program.lat, lng: program.lng }}
    onCloseClick={onClose}
    maxWidth={400}
  >
    <div className="info-window">
      <div className="info-window-header">
        <h3 className="text-lg font-bold text-white mb-1">
          {program.name}
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            program.type === 'head-start' 
              ? 'bg-white/20 text-white' 
              : 'bg-tx-orange-200 text-tx-orange-800'
          }`}>
            {program.type === 'head-start' ? 'Head Start' : 'Early Head Start'}
          </span>
        </div>
      </div>
      <div className="info-window-content">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-tx-gray-900">Address</p>
              <p className="text-sm text-tx-gray-600">{program.address}</p>
            </div>
          </div>
          
          {program.grantee && (
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-tx-gray-900">Grantee</p>
                <p className="text-sm text-tx-gray-600">{program.grantee}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-tx-gray-900">Annual Funding</p>
              <p className="text-sm text-tx-gray-600 font-medium">
                {program.funding ? `$${program.funding.toLocaleString()}` : 'Funding data not available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </InfoWindow>
);

// Test component to render InfoWindow with district data
const DistrictInfoWindow: React.FC<{
  district: CongressionalDistrictFeature;
  onClose: () => void;
}> = ({ district, onClose }) => (
  <InfoWindow
    position={{ 
      lat: district.geometry.coordinates[0][0][1] as number, 
      lng: district.geometry.coordinates[0][0][0] as number
    }}
    onCloseClick={onClose}
    maxWidth={400}
  >
    <div className="info-window">
      <div className="bg-gradient-to-r from-district-primary to-district-secondary text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-bold text-white mb-1">
          {district.properties.name}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
            District {district.properties.districtNumber}
          </span>
        </div>
      </div>
      <div className="info-window-content">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-tx-gray-900">Representative</p>
              <p className="text-sm text-tx-gray-600">{district.properties.representative}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-tx-gray-900">District Area</p>
              <p className="text-sm text-tx-gray-600">
                Congressional District {district.properties.districtNumber}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </InfoWindow>
);

describe('InfoWindow Components', () => {
  // Sample test data
  const mockProgram: HeadStartProgram = {
    id: 'program-1',
    name: 'Test Head Start Program',
    address: '123 Test St, Austin, TX 78701',
    lat: 30.2672,
    lng: -97.7431,
    type: 'head-start',
    grantee: 'Test Grantee Organization',
    funding: 1500000,
  };

  const mockDistrict: CongressionalDistrictFeature = {
    type: 'Feature',
    properties: {
      district: 'TX-1',
      name: 'Texas 1st Congressional District',
      representative: 'Representative Name',
      districtNumber: 1,
      state: 'TX',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-97.0, 30.0],
        [-97.0, 31.0],
        [-96.0, 31.0],
        [-96.0, 30.0],
        [-97.0, 30.0],
      ]],
    },
  };

  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Program InfoWindow', () => {
    test('renders program info window with correct content', () => {
      render(<ProgramInfoWindow program={mockProgram} onClose={onClose} />);
      
      // Check if the info window is rendered
      expect(screen.getByTestId('info-window')).toBeInTheDocument();
      
      // Check if program name is displayed
      expect(screen.getByText(mockProgram.name)).toBeInTheDocument();
      
      // Check if program type is displayed
      expect(screen.getByText('Head Start')).toBeInTheDocument();
      
      // Check if address is displayed
      expect(screen.getByText(mockProgram.address)).toBeInTheDocument();
      
      // Check if grantee is displayed
      expect(screen.getByText(mockProgram.grantee!)).toBeInTheDocument();
      
      // Check if funding is displayed
      expect(screen.getByText('Annual Funding')).toBeInTheDocument();
      expect(screen.getByText('$1,500,000')).toBeInTheDocument();
    });

    test('handles program without funding data', () => {
      const programWithoutFunding = { ...mockProgram, funding: undefined };
      render(<ProgramInfoWindow program={programWithoutFunding} onClose={onClose} />);
      
      expect(screen.getByText('Funding data not available')).toBeInTheDocument();
    });

    test('handles program without grantee data', () => {
      const programWithoutGrantee = { ...mockProgram, grantee: undefined };
      render(<ProgramInfoWindow program={programWithoutGrantee} onClose={onClose} />);
      
      expect(screen.queryByText('Test Grantee Organization')).not.toBeInTheDocument();
    });

    test('displays correct styling for early head start program', () => {
      const earlyHeadStartProgram = { ...mockProgram, type: 'early-head-start' as const };
      render(<ProgramInfoWindow program={earlyHeadStartProgram} onClose={onClose} />);
      
      expect(screen.getByText('Early Head Start')).toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', () => {
      render(<ProgramInfoWindow program={mockProgram} onClose={onClose} />);
      
      fireEvent.click(screen.getByTestId('info-window'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('District InfoWindow', () => {
    test('renders district info window with correct content', () => {
      render(<DistrictInfoWindow district={mockDistrict} onClose={onClose} />);
      
      // Check if the info window is rendered
      expect(screen.getByTestId('info-window')).toBeInTheDocument();
      
      // Check if district name is displayed
      expect(screen.getByText(mockDistrict.properties.name)).toBeInTheDocument();
      
      // Check if district number is displayed
      expect(screen.getByText(`District ${mockDistrict.properties.districtNumber}`)).toBeInTheDocument();
      
      // Check if representative is displayed
      expect(screen.getByText(mockDistrict.properties.representative)).toBeInTheDocument();
      
      // Check if district area is displayed
      expect(screen.getByText('District Area')).toBeInTheDocument();
      expect(screen.getByText(`Congressional District ${mockDistrict.properties.districtNumber}`)).toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', () => {
      render(<DistrictInfoWindow district={mockDistrict} onClose={onClose} />);
      
      fireEvent.click(screen.getByTestId('info-window'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
