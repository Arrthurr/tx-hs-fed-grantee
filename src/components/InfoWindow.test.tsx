import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoWindow } from '@vis.gl/react-google-maps';
import { HeadStartProgram, CongressionalDistrict } from '../types/maps';

// Mock the InfoWindow component from @vis.gl/react-google-maps
jest.mock('@vis.gl/react-google-maps', () => ({
  ...jest.requireActual('@vis.gl/react-google-maps'),
  InfoWindow: ({ children, onCloseClick, ...props }: any) => (
    <div data-testid="info-window" onClick={onCloseClick} {...props}>
      {children}
    </div>
  ),
}));

// Mock formatCurrency utility function
jest.mock('../utils/mapHelpers', () => ({
  formatCurrency: (amount: number) => `$${amount.toLocaleString()}`,
  formatNumber: (num: number) => num.toLocaleString(),
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
    <div className="program-info" data-testid="program-info">
      <h3 className="program-name">{program.name}</h3>
      <div className="program-type">
        {program.type === 'head-start' ? 'Head Start' : 'Early Head Start'}
      </div>
      <div className="program-address">{program.address}</div>
      {program.grantee && (
        <div className="program-grantee">{program.grantee}</div>
      )}
      <div className="program-funding">
        {program.funding ? `$${program.funding.toLocaleString()}` : 'Funding data not available'}
      </div>
    </div>
  </InfoWindow>
);

// Test component to render InfoWindow with district data
const DistrictInfoWindow: React.FC<{
  district: CongressionalDistrict;
  onClose: () => void;
}> = ({ district, onClose }) => (
  <InfoWindow
    position={district.center}
    onCloseClick={onClose}
    maxWidth={400}
  >
    <div className="district-info" data-testid="district-info">
      <h3 className="district-title">
        Texas {district.number}
        {district.number === 1 ? 'st' : 
         district.number === 2 ? 'nd' : 
         district.number === 3 ? 'rd' : 'th'} Congressional District
      </h3>
      <div className="district-number">District {district.number}</div>
      {district.party && (
        <div className="district-party">{district.party}</div>
      )}
      <div className="district-representative">{district.representative}</div>
      {district.population && district.population > 0 && (
        <div className="district-population">
          {district.population.toLocaleString()}
        </div>
      )}
      {district.contact && (
        <div className="district-contact">
          {district.contact.phone && (
            <div className="contact-phone">{district.contact.phone}</div>
          )}
          {district.contact.email && (
            <div className="contact-email">{district.contact.email}</div>
          )}
          {district.contact.website && (
            <div className="contact-website">{district.contact.website}</div>
          )}
          {district.contact.office && (
            <div className="contact-office">{district.contact.office}</div>
          )}
        </div>
      )}
      {district.committees && district.committees.length > 0 && (
        <div className="district-committees">
          {district.committees.map((committee, index) => (
            <div key={index} className="committee-item">{committee}</div>
          ))}
        </div>
      )}
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

  const mockDistrict: CongressionalDistrict = {
    number: 1,
    representative: 'Representative Name',
    population: 750000,
    center: { lat: 30.5, lng: -97.5 },
    party: 'Republican',
    headStartPrograms: [],
    photoUrl: 'https://example.com/photo.jpg',
    contact: {
      phone: '(555) 123-4567',
      email: 'rep@example.com',
      website: 'https://example.com',
      office: '123 Capitol Building'
    },
    committees: ['Committee 1', 'Committee 2']
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
      expect(screen.getByTestId('program-info')).toBeInTheDocument();
      
      // Check if program name is displayed
      expect(screen.getByText(mockProgram.name)).toBeInTheDocument();
      
      // Check if program type is displayed
      expect(screen.getByText('Head Start')).toBeInTheDocument();
      
      // Check if address is displayed
      expect(screen.getByText(mockProgram.address)).toBeInTheDocument();
      
      // Check if grantee is displayed
      expect(screen.getByText(mockProgram.grantee!)).toBeInTheDocument();
      
      // Check if funding is displayed
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

    test('calls onClose when info window is clicked', () => {
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
      expect(screen.getByTestId('district-info')).toBeInTheDocument();
      
      // Check if district title is displayed
      expect(screen.getByText(/Texas 1st Congressional District/)).toBeInTheDocument();
      
      // Check if district number is displayed
      expect(screen.getByText(`District ${mockDistrict.number}`)).toBeInTheDocument();
      
      // Check if representative is displayed
      expect(screen.getByText(mockDistrict.representative)).toBeInTheDocument();
      
      // Check if population is displayed
      expect(screen.getByText('750,000')).toBeInTheDocument();
      
      // Check if party is displayed
      expect(screen.getByText('Republican')).toBeInTheDocument();
      
      // Check if contact info is displayed
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('rep@example.com')).toBeInTheDocument();
      
      // Check if website link is displayed
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      
      // Check if office address is displayed
      expect(screen.getByText('123 Capitol Building')).toBeInTheDocument();
      
      // Check if committee information is displayed
      expect(screen.getByText('Committee 1')).toBeInTheDocument();
      expect(screen.getByText('Committee 2')).toBeInTheDocument();
    });

    test('calls onClose when info window is clicked', () => {
      render(<DistrictInfoWindow district={mockDistrict} onClose={onClose} />);
      
      fireEvent.click(screen.getByTestId('info-window'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    
    test('handles district without party data', () => {
      const districtWithoutParty = { ...mockDistrict, party: undefined };
      render(<DistrictInfoWindow district={districtWithoutParty} onClose={onClose} />);
      
      expect(screen.queryByText('Republican')).not.toBeInTheDocument();
    });
    
    test('handles district without contact data', () => {
      const districtWithoutContact = { ...mockDistrict, contact: undefined };
      render(<DistrictInfoWindow district={districtWithoutContact} onClose={onClose} />);
      
      expect(screen.queryByText('(555) 123-4567')).not.toBeInTheDocument();
      expect(screen.queryByText('rep@example.com')).not.toBeInTheDocument();
    });

    test('handles district without population data', () => {
      const districtWithoutPopulation = { ...mockDistrict, population: 0 };
      render(<DistrictInfoWindow district={districtWithoutPopulation} onClose={onClose} />);
      
      expect(screen.queryByText('750,000')).not.toBeInTheDocument();
    });

    test('handles district with partial contact information', () => {
      const districtWithPartialContact = { 
        ...mockDistrict, 
        contact: {
          phone: '(555) 123-4567',
          // No email, website, or office
        }
      };
      render(<DistrictInfoWindow district={districtWithPartialContact} onClose={onClose} />);
      
      // Should show phone
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      
      // Should not show other contact info
      expect(screen.queryByText('rep@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('123 Capitol Building')).not.toBeInTheDocument();
    });

    test('handles district without committees data', () => {
      const districtWithoutCommittees = { ...mockDistrict, committees: undefined };
      render(<DistrictInfoWindow district={districtWithoutCommittees} onClose={onClose} />);
      
      expect(screen.queryByText('Committee 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Committee 2')).not.toBeInTheDocument();
    });

    test('handles district without photo data', () => {
      const districtWithoutPhoto = { ...mockDistrict, photoUrl: undefined };
      render(<DistrictInfoWindow district={districtWithoutPhoto} onClose={onClose} />);
      
      // Test should still pass - photo is optional and handled gracefully
      expect(screen.getByTestId('district-info')).toBeInTheDocument();
      expect(screen.getByText(mockDistrict.representative)).toBeInTheDocument();
    });
  });
});