# Texas Head Start Interactive Map - Claude Code Guide

## Project Overview

An interactive map application that visualizes Head Start and Early Head Start Federal Grantee Programs across Texas, overlaid with TXHSA regions. This tool helps policymakers and state officials analyze program distribution through an intuitive Google Maps interface.

**Key Features:**
- Interactive Texas map with 80+ Head Start program locations
- TXHSA Regions overlay - four polygons (West / North / East / South) built by dissolving Texas counties grouped by their TDEM disaster region
- Per-region program count surfaced via a region info window
- Search functionality for programs
- Layer controls for toggling data visibility
- Responsive design optimized for desktop and tablet
- Comprehensive accessibility features

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7
- **Maps**: Google Maps JavaScript API via @vis.gl/react-google-maps
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React
- **Testing**: Jest (unit tests) + Playwright (E2E tests)
- **Linting**: ESLint with TypeScript plugin
- **APIs**: Google Maps API
- **Build-time tools**: `@turf/union` (dissolve), `tsx` (run TS scripts)

## Quick Start Commands

```bash
npm run dev            # Start development server at http://localhost:5173
npm run build          # Build for production (outputs to dist/)
npm run build:regions  # Regenerate the four TXHSA region geojson files
npm run preview        # Preview production build locally
npm run lint           # Run ESLint checks
npm test               # Run all Jest unit tests
npm run test:e2e       # Run Playwright E2E tests
npm run test:e2e:ui    # Run Playwright tests with UI
```

## Environment Configuration

**Required:**
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key (get from Google Cloud Console)

**Optional:**
- `VITE_GOOGLE_MAPS_MAP_ID` - Custom Map ID for styled maps

Create a `.env.local` file (never commit this):
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here
```

## Project Structure

```
src/
├── components/           # React UI components
│   ├── TexasMap.tsx     # Main map component with Google Maps integration
│   ├── MapControls.tsx  # Layer toggle controls UI
│   ├── SearchBar.tsx    # Search input with autocomplete
│   ├── SearchResults.tsx # Search results display
│   ├── LoadingSpinner.tsx # Loading state indicator
│   ├── ErrorDisplay.tsx  # Error boundary and display
│   ├── ResponsiveWrapper.tsx # Responsive layout wrapper
│   └── AccessibilityChecker.tsx # Accessibility validation
│
├── hooks/
│   ├── useMapData.ts    # Map data management, layer visibility, region counts
│   └── useSearch.ts     # Search logic for programs
│
├── data/
│   ├── headStartPrograms.ts # Head Start program data and processing
│   ├── txhsaRegions.ts      # TXHSA region validation + processing
│   ├── tdemCountyRegions.ts # County → TDEM region lookup (build-time input)
│   └── texasLocations.ts    # Texas geographic data
│
├── utils/
│   ├── geometry.ts      # Generic point-in-polygon helpers
│   ├── mapHelpers.ts    # Map utility functions
│   └── envValidator.ts  # Environment variable validation
│
├── types/
│   └── maps.ts          # TypeScript type definitions
│
├── App.tsx              # Main application component
└── main.tsx             # Application entry point

scripts/
└── build-txhsa-regions.ts # One-time dissolve script (`npm run build:regions`)
```

## Code Patterns and Conventions

### File Naming
- **Components**: PascalCase (e.g., `TexasMap.tsx`, `SearchBar.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useMapData.ts`, `useSearch.ts`)
- **Utilities**: camelCase (e.g., `mapHelpers.ts`, `envValidator.ts`)
- **Types**: camelCase (e.g., `maps.ts`)
- **Tests**: Match source file with `.test.tsx` or `.test.ts` suffix

### Component Structure
```typescript
// Standard component pattern
interface ComponentNameProps {
  requiredProp: string;
  optionalProp?: number;
}

const ComponentName: React.FC<ComponentNameProps> = ({
  requiredProp,
  optionalProp = 42 // defaults for optional props
}) => {
  // State management
  const [state, setState] = useState<Type>(initialValue);

  // Event handlers with useCallback
  const handleEvent = useCallback(() => {
    // handler logic
  }, [dependencies]);

  return (
    <div className="tailwind-classes">
      {/* content */}
    </div>
  );
};

export default ComponentName;
```

### State Management
- Use `null` for nullable types (not `undefined`)
- Initialize objects with proper defaults
- Use TypeScript strict mode types
- Prefer `useCallback` for event handlers passed to child components

### Error Handling
- API calls report errors via React state (e.g., `programsError`, `regionsError`)
- User-friendly error messages via `ErrorDisplay` component
- Graceful fallbacks for missing/optional data

### Styling
- Tailwind utility classes for all styling
- Custom prefixes for component-specific classes: `btn-`, `card-`, `marker-`
- Conditional classes using template literals or `clsx`
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- TXHSA region tokens: `--txhsa-west`, `--txhsa-north`, `--txhsa-east`, `--txhsa-south`, `--txhsa-accent`

### Accessibility
- All interactive elements have ARIA labels
- Proper semantic HTML (`<button>`, `<nav>`, etc.)
- Keyboard navigation support
- Screen reader announcements for dynamic content
- High contrast colors (WCAG AA compliant)

## Testing Strategy

### Unit Tests (Jest)
- Component tests in `*.test.tsx` files alongside components
- Test user interactions with @testing-library/react
- Mock external dependencies (Google Maps, network)

**Running Tests:**
```bash
npm test                                      # All tests
npm test -- src/components/TexasMap.test.tsx  # Specific file
npm test -- --coverage                        # With coverage report
```

### E2E Tests (Playwright)
- Located in `src/e2e/`
- Test critical user flows (search, layer toggles, map interactions)
- Run against built application

```bash
npm run test:e2e        # Headless mode
npm run test:e2e:ui     # Interactive UI mode
```

## Key Components Deep Dive

### TexasMap (src/components/TexasMap.tsx)
Main map component using @vis.gl/react-google-maps.
- Renders Google Maps with custom Texas-centered view
- Handles marker rendering for Head Start programs
- Manages TXHSA region polygon overlays (`google.maps.Data` per region)
- Renders a minimal region info window: region name + program count
- Controls map center and zoom level

**Important:** Requires `VITE_GOOGLE_MAPS_API_KEY` in environment.

### useMapData Hook (src/hooks/useMapData.ts)
Central data management for map layers.
- Fetches and processes Head Start program data
- Loads the four TXHSA region geojson files in parallel
- Manages layer visibility state (`headStartPrograms`, `txhsaRegions`)
- Computes lazy, memoized per-region program counts via point-in-polygon

**Key State:**
- `headStartPrograms`: Array of program locations
- `txhsaRegions`: Array of region polygons
- `regionProgramCounts`: `{ West, North, East, South }` count map (null until ready)

### useSearch Hook (src/hooks/useSearch.ts)
Search functionality for programs.
- Fuzzy matching on program names, addresses, grantees
- Returns programs only (district search was removed when the overlay was replaced)

## Data Files

### Head Start Programs (public/assets/geojson/headStartPrograms.json)
JSON file containing:
- Program name and type (Head Start, Early Head Start)
- Full address (street, city, ZIP)
- Grantee organization
- Funding information
- Geographic coordinates

### TXHSA Regions (public/assets/txhsa-geojson/)
Four committed geojson files - `west.geojson`, `north.geojson`, `east.geojson`, `south.geojson` - each a single-feature FeatureCollection with `properties.name` set to the region name.

Generated by `scripts/build-txhsa-regions.ts` from:
- `public/assets/source/tx-counties.geojson` (Texas counties source)
- `src/data/tdemCountyRegions.ts` (county → TDEM region lookup + 4-way merge mapping)

Run `npm run build:regions` after updating either input to regenerate the four output files.

## Common Development Tasks

### Adding a New Component
1. Create file in `src/components/` with PascalCase name
2. Define TypeScript interface for props
3. Implement component with proper typing
4. Export default
5. Create corresponding test file
6. Import and use in parent component

### Updating Styling
- Edit Tailwind classes directly in component JSX
- For global styles, update `src/styles/design-system.css`
- Custom colors defined in `tailwind.config.js`
- Theme follows Texas color palette (blues and oranges); regions use distinct categorical hues

## Known Issues and Gotchas

### Environment Variables
- **Gotcha**: Vite requires `VITE_` prefix for all env vars
- **Gotcha**: `.env.local` must be in project root (not `src/`)
- **Gotcha**: Server restart required after changing env vars

### Map Rendering
- **Gotcha**: Initial map render may be slow with the regions layer on
- **Optimization**: Regions layer defaults OFF; programs show by default

### Region Build
- **Gotcha**: A county present in `tx-counties.geojson` but missing from `tdemCountyRegions.ts` causes the build script to fail with the county name. This is intentional - silent omission would produce gaps.
- **Gotcha**: Some Texas county names have spelling drift across sources (e.g., "La Salle" vs "LaSalle"). The lookup uses the spelling in `tx-counties.geojson`.

## Deployment Considerations

### Production Build
```bash
npm run build
# Output: dist/ directory
# Serve via static file server (nginx, Vercel, Netlify, etc.)
```

### Environment Variables
- Set production API keys in hosting platform environment settings
- Never commit `.env.local` or expose keys in client-side code
- Use domain restrictions on Google Maps API key

### Performance Optimization
- Build output includes code splitting
- TXHSA region files are static and cache well
- Images and icons optimized
- Consider CDN for static assets

### Security
- API keys should have domain restrictions
- No sensitive data in GeoJSON files
- HTTPS only in production
- Regular dependency updates for security patches

## Useful Resources

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [@vis.gl/react-google-maps Docs](https://visgl.github.io/react-google-maps/)
- [TDEM Regions](https://tdem.texas.gov/regions)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Testing Library Docs](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev/)
- [@turf/union Docs](https://turfjs.org/docs/api/union)

## Getting Help

When asking for help, include:
1. Specific error messages or unexpected behavior
2. Steps to reproduce the issue
3. Relevant code snippets
4. Environment (development vs production)
5. Browser and version (for UI issues)

For bugs or feature requests, check the GitHub issues first.
