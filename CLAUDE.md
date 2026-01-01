# Texas Head Start Interactive Map - Claude Code Guide

## Project Overview

An interactive map application that visualizes Head Start and Early Head Start Federal Grantee Programs across Texas, overlaid with congressional district boundaries. This tool helps policymakers and state officials analyze program distribution and political representation through an intuitive Google Maps interface.

**Key Features:**
- Interactive Texas map with 80+ Head Start program locations
- Congressional district boundaries (36 districts) with representative data
- Real-time Congress.gov API integration for representative information
- Search functionality for programs and districts
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
- **APIs**: Google Maps API, Congress.gov API (optional)

## Quick Start Commands

```bash
npm run dev          # Start development server at http://localhost:5173
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint checks
npm test             # Run all Jest unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run Playwright tests with UI
```

## Environment Configuration

**Required:**
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key (get from Google Cloud Console)

**Optional:**
- `VITE_GOOGLE_MAPS_MAP_ID` - Custom Map ID for styled maps
- `VITE_CONGRESS_API_KEY` - Congress.gov API key for enhanced representative data

Create a `.env.local` file (never commit this):
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here
VITE_CONGRESS_API_KEY=your_congress_api_key_here
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
│   ├── AccessibilityChecker.tsx # Accessibility validation
│   └── CongressDataDebug.tsx # Debug component for API testing
│
├── hooks/
│   ├── useMapData.ts    # Map data management, layer visibility, geolocation
│   └── useSearch.ts     # Search logic for programs and districts
│
├── data/
│   ├── headStartPrograms.ts      # Head Start program data and processing
│   ├── congressionalDistricts.ts # Congressional district data and processing
│   └── texasLocations.ts         # Texas geographic data
│
├── api/
│   └── congress.ts      # Congress.gov API client with retry logic
│
├── utils/
│   ├── mapHelpers.ts    # Map utility functions (bounds, colors, formatting)
│   └── envValidator.ts  # Environment variable validation
│
├── types/
│   └── maps.ts          # TypeScript type definitions for map entities
│
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
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

  // Render
  return (
    <div className="tailwind-classes">
      {/* content */}
    </div>
  );
};

export default ComponentName;
```

### Import Order
1. React imports
2. Third-party libraries
3. Local components
4. Hooks
5. Types/interfaces
6. Utils/helpers
7. Styles

Example:
```typescript
import React, { useState, useCallback } from 'react';
import { Map, Marker } from '@vis.gl/react-google-maps';
import SearchBar from './components/SearchBar';
import { useMapData } from './hooks/useMapData';
import type { HeadStartProgram } from './types/maps';
import { calculateBounds } from './utils/mapHelpers';
```

### State Management
- Use `null` for nullable types (not `undefined`)
- Initialize objects with proper defaults
- Use TypeScript strict mode types
- Prefer `useCallback` for event handlers passed to child components

### Error Handling
- API calls use retry logic with exponential backoff (see `src/api/congress.ts`)
- Errors are classified by type (network, validation, API error)
- User-friendly error messages via `ErrorDisplay` component
- Graceful fallbacks for missing/optional data

### Styling
- Tailwind utility classes for all styling
- Custom prefixes for component-specific classes: `btn-`, `card-`, `marker-`
- Conditional classes using template literals or `clsx`
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`

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
- Mock external dependencies (Google Maps, APIs)
- Aim for 98%+ code coverage

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

**Running E2E Tests:**
```bash
npm run test:e2e        # Headless mode
npm run test:e2e:ui     # Interactive UI mode
```

## Key Components Deep Dive

### TexasMap (src/components/TexasMap.tsx)
Main map component using @vis.gl/react-google-maps.
- Renders Google Maps with custom Texas-centered view
- Handles marker rendering for Head Start programs
- Manages polygon overlays for congressional districts
- Implements click handlers for markers and districts
- Controls map center and zoom level

**Important:** Requires `VITE_GOOGLE_MAPS_API_KEY` in environment.

### useMapData Hook (src/hooks/useMapData.ts)
Central data management for map layers.
- Fetches and processes Head Start program data
- Loads congressional district GeoJSON files
- Manages layer visibility state (programs, districts, boundaries)
- Handles user geolocation
- Provides data to TexasMap component

**Key State:**
- `headStartPrograms`: Array of program locations
- `congressionalDistricts`: Array of district polygons
- `showPrograms`, `showDistricts`, `showBoundaries`: Layer visibility flags
- `selectedDistrict`, `selectedProgram`: Currently selected items

### useSearch Hook (src/hooks/useSearch.ts)
Search functionality for programs and districts.
- Debounced search input
- Fuzzy matching on program names, addresses, grantees
- District search by number or representative name
- Returns categorized results with counts

### Congress.gov API (src/api/congress.ts)
Fetches congressional representative data.
- Retry logic with exponential backoff (max 3 retries)
- Caches responses to minimize API calls
- Graceful fallback to static data if API unavailable
- Error classification and reporting

## Data Files

### Head Start Programs (public/assets/geojson/programs/)
GeoJSON files containing:
- Program name and type (Head Start, Early Head Start)
- Full address (street, city, ZIP)
- Grantee organization
- Funding information
- Geographic coordinates

### Congressional Districts (public/assets/geojson/TX-{1-38}/)
GeoJSON polygon files for each district:
- District boundaries (multi-polygon)
- District number
- Representative name (static fallback)
- Population data

**Note:** Districts 37 and 38 don't exist; Texas has 36 districts.

## Common Development Tasks

### Adding a New Component
1. Create file in `src/components/` with PascalCase name
2. Define TypeScript interface for props
3. Implement component with proper typing
4. Export default
5. Create corresponding test file
6. Import and use in parent component

### Adding a New Data Layer
1. Add GeoJSON data to `public/assets/geojson/`
2. Create processing function in `src/data/`
3. Add state management to `useMapData` hook
4. Add toggle control in `MapControls` component
5. Render markers/polygons in `TexasMap` component
6. Add search support in `useSearch` hook if applicable

### Updating Styling
- Edit Tailwind classes directly in component JSX
- For global styles, update `src/styles/design-system.css`
- Custom colors defined in `tailwind.config.js`
- Theme follows Texas color palette (blues and oranges)

### Adding API Integration
1. Create client in `src/api/` directory
2. Implement retry logic and error handling
3. Add TypeScript types for responses
4. Use in appropriate component or hook
5. Add tests with mocked responses
6. Document required environment variables

## Known Issues and Gotchas

### Google Maps API
- **Issue**: "RefNotForwarded" warnings in console
  - **Cause**: @vis.gl/react-google-maps library implementation
  - **Impact**: None - purely cosmetic warning
  - **Status**: Upstream library issue

### Congressional Districts
- **Issue**: Districts TX-37 and TX-38 files exist but shouldn't
  - **Cause**: Historical numbering or placeholder data
  - **Impact**: Filtered out in code (see `congressionalDistricts.ts`)
  - **Solution**: Data processor ignores these district numbers

### Environment Variables
- **Gotcha**: Vite requires `VITE_` prefix for all env vars
- **Gotcha**: `.env.local` must be in project root (not `src/`)
- **Gotcha**: Server restart required after changing env vars

### Map Rendering
- **Gotcha**: Initial map render may be slow with all layers visible
- **Solution**: Lazy load districts, show programs by default
- **Optimization**: Consider implementing map clustering for programs

### Search Performance
- **Issue**: Search can be slow with large result sets
- **Solution**: Already debounced (300ms)
- **Optimization**: Consider implementing virtual scrolling for results

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
- Lazy load district GeoJSON files
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
- [Congress.gov API Docs](https://api.congress.gov/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Testing Library Docs](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev/)

## Getting Help

When asking for help, include:
1. Specific error messages or unexpected behavior
2. Steps to reproduce the issue
3. Relevant code snippets
4. Environment (development vs production)
5. Browser and version (for UI issues)

For bugs or feature requests, check the GitHub issues first.
