import '@testing-library/jest-dom';

// Mock Google Maps API
class MockLatLngBounds {
  extend = jest.fn().mockReturnThis();
  isEmpty = jest.fn().mockReturnValue(false);
}

class MockPolygon {
  setMap = jest.fn();
  addListener = jest.fn();
}

const mockMap = {
  panTo: jest.fn(),
  setZoom: jest.fn(),
  getZoom: jest.fn().mockReturnValue(6),
  fitBounds: jest.fn(),
};

// Mock the Google Maps API
global.google = {
  maps: {
    Map: jest.fn(),
    LatLng: jest.fn().mockImplementation((lat, lng) => ({ lat, lng })),
    LatLngBounds: jest.fn().mockImplementation(() => new MockLatLngBounds()),
    Polygon: jest.fn().mockImplementation(() => new MockPolygon()),
    MapTypeId: {
      ROADMAP: 'roadmap',
      SATELLITE: 'satellite',
      HYBRID: 'hybrid',
      TERRAIN: 'terrain',
    },
    Size: jest.fn().mockImplementation((width, height) => ({ width, height })),
    Data: jest.fn().mockImplementation(() => ({
      addGeoJson: jest.fn(),
      setStyle: jest.fn(),
      addListener: jest.fn(),
      setMap: jest.fn(),
    })),
  },
};

// Mock the @vis.gl/react-google-maps hooks
jest.mock('@vis.gl/react-google-maps', () => ({
  Map: ({ children, ...props }) => (
    <div data-testid="google-map" {...props}>
      {children}
    </div>
  ),
  AdvancedMarker: ({ children, ...props }) => (
    <div data-testid="advanced-marker" {...props}>
      {children}
    </div>
  ),
  Pin: (props) => <div data-testid="map-pin" {...props} />,
  InfoWindow: ({ children, ...props }) => (
    <div data-testid="info-window" {...props}>
      {children}
    </div>
  ),
  useMap: jest.fn().mockReturnValue(mockMap),
}));