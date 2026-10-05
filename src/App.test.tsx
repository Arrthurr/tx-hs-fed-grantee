/// <reference types="@testing-library/jest-dom" />
import { render, screen, act, waitFor } from '@testing-library/react';
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
    setEnv({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('header', () => {
    test('renders the application title and subtitle', () => {
      render(<App />);
      expect(screen.getByText('Texas Head Start Location Directory')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Explore listed locations and project-defined TXHSA regions across Texas/,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(/Unverified legacy directory/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sources and limitations' })).toHaveAttribute('href', '/data-provenance.md');
      expect(screen.queryByText(/Head Start Program Information Report/)).not.toBeInTheDocument();
    });

    test('renders the listed locations stat in the header (lg+)', () => {
      render(<App />);
      expect(screen.getByText('Listed locations')).toBeInTheDocument();
      expect(screen.getByText('TXHSA Regions')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('API key validation', () => {
    test('shows a configuration error without a retry when the API key is missing', async () => {
      setEnv({ VITE_GOOGLE_MAPS_API_KEY: '' });
      render(<App />);
      await waitFor(() => {
        expect(
          screen.getByText(/Google Maps is not configured/i),
        ).toBeInTheDocument();
      });
      // API provider is never mounted when the key is missing.
      expect(screen.queryByTestId('api-provider')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Retry loading map')).not.toBeInTheDocument();
    });

    test('shows a placeholder error when the API key is the sample value', async () => {
      setEnv({ VITE_GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key_here' });
      render(<App />);
      await waitFor(() => {
        expect(
          screen.getByText(/placeholder API key/i),
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

    test('renders TexasMap as soon as APIProvider onLoad fires', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      });

      // Drive the Maps script success path.
      await act(async () => {
        getLastApiProps().onLoad?.();
      });

      await waitFor(() => {
        expect(screen.getByTestId('google-map')).toBeInTheDocument();
      });
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
      expect(screen.getByText(/not authorized for this site/i)).toBeInTheDocument();
      expect(screen.getByText(/InvalidKeyMapError: bad key/i)).toBeInTheDocument();
      expect(screen.queryByLabelText('Retry loading map')).not.toBeInTheDocument();
    });

    test('classifies RefererNotAllowedMapError as a domain restriction', async () => {
      await driveError(new Error('RefererNotAllowedMapError: not allowed'));
      expect(screen.getByText(/not authorized for this site/i)).toBeInTheDocument();
      expect(screen.queryByLabelText('Retry loading map')).not.toBeInTheDocument();
    });

    test('classifies QuotaExceededError as a quota issue', async () => {
      await driveError(new Error('QuotaExceededError: over quota'));
      expect(screen.getByText(/not authorized for this site/i)).toBeInTheDocument();
      expect(screen.queryByLabelText('Retry loading map')).not.toBeInTheDocument();
    });

    test('falls back to a generic message for unrecognized Error instances', async () => {
      await driveError(new Error('Something else went wrong'));
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reload Page' })).toHaveTextContent('Reload Page');
    });

    test('falls back to a generic message for non-Error throws', async () => {
      await driveError('a string error');
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    });
  });

  describe('retry', () => {
    test('an invalid configured key cannot bypass validation', async () => {
      setEnv({ VITE_GOOGLE_MAPS_API_KEY: 'short' });
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/appears to be invalid/i)).toBeInTheDocument();
      });
      expect(screen.queryByLabelText('Retry loading map')).not.toBeInTheDocument();
      expect(screen.queryByTestId('api-provider')).not.toBeInTheDocument();
    });
  });

  test('API timeout is recoverable, late success clears it, and unmount clears the timer', async () => {
    jest.useFakeTimers();
    const { unmount } = render(<App />);
    await act(async () => {});
    await act(async () => { jest.advanceTimersByTime(15_000); });
    expect(screen.getByRole('alert')).toHaveTextContent('Google Maps loading timed out');
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
    await act(async () => { getLastApiProps().onLoad?.(); });
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('unmount during API loading cleans up the deadline and authorization callback', async () => {
    jest.useFakeTimers();
    const mapsWindow = window as Window & { gm_authFailure?: () => void };
    const previous = mapsWindow.gm_authFailure;
    const { unmount } = render(<App />);
    await act(async () => {});
    expect(mapsWindow.gm_authFailure).not.toBe(previous);
    unmount();
    expect(mapsWindow.gm_authFailure).toBe(previous);
    expect(jest.getTimerCount()).toBe(0);
  });
});
