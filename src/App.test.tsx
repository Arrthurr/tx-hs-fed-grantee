/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { APIProvider as ApiProviderMock } from '@vis.gl/react-google-maps';
import App from './App';

// Mock fetch so useMapData's mount effects (which fire when App renders the
// MapDataProvider) don't throw "fetch is not defined" and set programsError,
// which would short-circuit renderContent before reaching the APIProvider
// branch. useMapData.test.ts sets global.fetch at its module level; we need
// the same here because App renders the real hook via the provider.
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const installFetchMock = () => {
  mockFetch.mockImplementation((url: string) => {
    // Programs: return an empty array so processHeadStartPrograms yields []
    // and the hook's "no valid programs" guard throws — but that sets
    // programsError which we don't want. Instead return one fake program so
    // the hook considers the load successful and programsError stays null.
    if (url.includes('headStartPrograms.json')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              name: 'Test Program',
              address: '123 Test St, Austin, TX',
              coordinates: { lat: 30.2672, lng: -97.7431 },
            },
          ]),
      });
    }
    // Regions: return a minimal valid fixture per region.
    const regionMatch = url.match(/txhsa-geojson\/(west|north|east|south)\.geojson/);
    if (regionMatch) {
      const name = regionMatch[1].charAt(0).toUpperCase() + regionMatch[1].slice(1);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { name },
                geometry: {
                  type: 'Polygon',
                  coordinates: [[[-101, 30], [-99, 30], [-99, 32], [-101, 32], [-101, 30]]],
                },
              },
            ],
          }),
      });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
};

// Mock the Google Maps API constructors so App's checkMapsReady() can resolve
// when APIProvider fires onLoad. The setupTests.ts global.google mock provides
// Map, Data, LatLng, etc. but does not set up Marker / InfoWindow as functions
// with prototypes — App.checkMapsReady specifically gates on those three. We
// install a complete constructor shape here so the mapsReady polling loop can
// succeed.
const installMapsConstructors = () => {
  function FakeMarker() {}
  function FakeInfoWindow() {}
  (window.google as any).maps.Marker = FakeMarker;
  (window.google as any).maps.InfoWindow = FakeInfoWindow;
  // Map is already jest.fn().mockImplementation() from setupTests.ts; ensure
  // it has a prototype so checkMapsReady's `&&` chain passes.
  if (!(window.google.maps.Map as any).prototype) {
    (window.google.maps.Map as any).prototype = {};
  }
  if (!(window.google.maps.Marker as any).prototype) {
    (window.google.maps.Marker as any).prototype = {};
  }
  if (!(window.google.maps.InfoWindow as any).prototype) {
    (window.google.maps.InfoWindow as any).prototype = {};
  }
};

// setupTests.ts already mocks '@vis.gl/react-google-maps' with an APIProvider
// that fires onLoad synchronously during render. That makes it impossible to
// assert the pre-load loading state or drive error paths. We override the
// implementation here in beforeEach (after jest.clearAllMocks resets state but
// not the setupTests factory) so our wrapper renders the api-provider testid
// and does NOT auto-fire onLoad — tests drive it via getLastApiProps().
const overrideApiProviderMock = () => {
  const React = require('react');
  (ApiProviderMock as unknown as jest.Mock).mockImplementation(({ children }: any) =>
    React.createElement('div', { 'data-testid': 'api-provider' }, children),
  );
};

// Read the props passed to the most recent APIProvider render so tests can
// invoke onLoad/onError at the right moment.
const getLastApiProps = (): { onLoad?: () => void; onError?: (e: unknown) => void } => {
  const calls = (ApiProviderMock as unknown as jest.Mock).mock.calls;
  const last = calls.length > 0 ? calls[calls.length - 1] : undefined;
  return (last?.[0] as any) ?? {};
};

// Helper to set import.meta.env for a given render. The jest AST transformer
// (src/jest-transforms/vite-env.ts) rewrites `import.meta.env` in source files
// to `__VITE_ENV__`, so tests mutate that global directly. setupTests.ts
// installs the initial object; we override per-test here.
const importMetaEnv = (global as any).__VITE_ENV__ ?? {};

const setEnv = (env: Partial<{ VITE_GOOGLE_MAPS_API_KEY: string; VITE_GOOGLE_MAPS_MAP_ID: string }>) => {
  importMetaEnv.VITE_GOOGLE_MAPS_API_KEY =
    env.VITE_GOOGLE_MAPS_API_KEY ?? 'test-api-key-1234567890123456789012';
  importMetaEnv.VITE_GOOGLE_MAPS_MAP_ID = env.VITE_GOOGLE_MAPS_MAP_ID ?? 'test-map-id';
};

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installFetchMock();
    overrideApiProviderMock();
    installMapsConstructors();
    setEnv({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('header', () => {
    test('renders the application title and subtitle', () => {
      render(<App />);
      expect(screen.getByText('Texas Head Start Federal Grantee Programs')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Explore Head Start and Early Head Start program funding and TXHSA regions across Texas/,
        ),
      ).toBeInTheDocument();
    });

    test('renders the Head Start Programs stat in the header (lg+)', () => {
      render(<App />);
      expect(screen.getByText('Head Start Programs')).toBeInTheDocument();
      expect(screen.getByText('TXHSA Regions')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('API key validation', () => {
    test('shows a configuration error when the API key is missing', async () => {
      setEnv({ VITE_GOOGLE_MAPS_API_KEY: '' });
      render(<App />);
      await waitFor(() => {
        expect(
          screen.getByText(/Google Maps API key is not configured/i),
        ).toBeInTheDocument();
      });
      // API provider is never mounted when the key is missing.
      expect(screen.queryByTestId('api-provider')).not.toBeInTheDocument();
    });

    test('shows a placeholder error when the API key is the sample value', async () => {
      setEnv({ VITE_GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key_here' });
      render(<App />);
      await waitFor(() => {
        expect(
          screen.getByText(/replace the placeholder API key/i),
        ).toBeInTheDocument();
      });
    });

    test('shows an invalid error when the API key is too short', async () => {
      setEnv({ VITE_GOOGLE_MAPS_API_KEY: 'short-key' });
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/appears to be invalid/i)).toBeInTheDocument();
      });
    });

    test('proceeds to the API provider when the key looks valid', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      });
    });
  });

  describe('API load lifecycle', () => {
    test('shows a loading spinner before the Maps script fires onLoad', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      });
      // Pre-onLoad: we are inside APIProvider but TexasMap is not rendered yet.
      expect(screen.getByText(/Loading Google Maps API/i)).toBeInTheDocument();
      expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
    });

    test('renders TexasMap after onLoad fires and constructors are ready', async () => {
      jest.useFakeTimers();
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      });

      // Drive the Maps script success path.
      await act(async () => {
        getLastApiProps().onLoad?.();
      });

      // handleApiLoad waits 500ms then polls checkMapsReady. Constructors are
      // installed in beforeEach, so the first poll resolves mapsReady=true.
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId('google-map')).toBeInTheDocument();
      });
    });

    test('polls and eventually errors when constructors never become ready', async () => {
      // Remove the Marker / InfoWindow constructors so checkMapsReady stays false.
      (window.google as any).maps.Marker = undefined;
      (window.google as any).maps.InfoWindow = undefined;

      // Silence the expected console.error from the polling-exhausted branch.
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      jest.useFakeTimers();
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      });

      await act(async () => {
        getLastApiProps().onLoad?.();
      });

      // 500ms initial delay + up to 50 * 100ms of polling = 5.5s total.
      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Google Maps API failed to initialize/i),
        ).toBeInTheDocument();
      });

      spy.mockRestore();
    });
  });

  describe('API error classification', () => {
    const driveError = async (error: unknown) => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      });
      await act(async () => {
        getLastApiProps().onError?.(error);
      });
      // ErrorDisplay surfaces once apiError state is set.
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    };

    test('classifies InvalidKeyMapError as an invalid API key', async () => {
      await driveError(new Error('InvalidKeyMapError: bad key'));
      expect(screen.getByText(/The API key is invalid/i)).toBeInTheDocument();
    });

    test('classifies RefererNotAllowedMapError as a domain restriction', async () => {
      await driveError(new Error('RefererNotAllowedMapError: not allowed'));
      expect(screen.getByText(/This domain is not authorized/i)).toBeInTheDocument();
    });

    test('classifies QuotaExceededError as a quota issue', async () => {
      await driveError(new Error('QuotaExceededError: over quota'));
      expect(screen.getByText(/API quota exceeded/i)).toBeInTheDocument();
    });

    test('falls back to a generic message for unrecognized Error instances', async () => {
      await driveError(new Error('Something else went wrong'));
      expect(screen.getByText(/check your API key and internet connection/i)).toBeInTheDocument();
    });

    test('falls back to a generic message for non-Error throws', async () => {
      await driveError('a string error');
      expect(screen.getByText(/check your API key and internet connection/i)).toBeInTheDocument();
    });
  });

  describe('retry', () => {
    test('clicking Retry on an API-key error resets to the loading state, then proceeds (effect does not re-run)', async () => {
      setEnv({ VITE_GOOGLE_MAPS_API_KEY: 'short' });
      expect((global as any).__VITE_ENV__.VITE_GOOGLE_MAPS_API_KEY).toBe('short');
      render(<App />);

      // Initial invalid-key error (real timers so useEffect + waitFor work).
      await waitFor(() => {
        expect(screen.getByText(/appears to be invalid/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByLabelText('Retry loading map');

      // Switch to fake timers for the 500ms retry delay so we can advance it
      // deterministically without waiting in real time.
      jest.useFakeTimers();
      await act(async () => {
        fireEvent.click(retryButton);
      });

      // handleRetry sets isInitializing=true for 500ms.
      expect(screen.getByText(/Initializing application/i)).toBeInTheDocument();

      // After the 500ms delay, isInitializing flips false. The key-validation
      // useEffect does NOT re-run (deps [apiKey, mapId] unchanged) and
      // handleRetry cleared apiError, so the app proceeds to the API provider
      // loading state rather than re-showing the error. This documents the
      // current retry behavior; if the effect re-ran on retry, the error would
      // reappear here.
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await waitFor(() => {
        expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});
