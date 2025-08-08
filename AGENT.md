# AGENT.md - Texas Head Start Interactive Map

## Build/Test Commands
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint linting
- `npm run preview` - Preview production build
- `npm test` - Run Jest unit tests
- `npm test -- src/components/ComponentName.test.tsx` - Run single test file
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:ui` - Run Playwright tests with UI

## Architecture & Structure
React 18 + TypeScript + Vite application with Google Maps integration using @vis.gl/react-google-maps. Main directories: `src/components/` (React components), `src/hooks/` (custom hooks), `src/data/` (data processing), `src/types/` (TypeScript definitions), `src/utils/` (helpers), `src/api/` (API layer). Core features: Texas map with Head Start programs and congressional districts, search functionality, layer controls.

## Code Style & Conventions
- **Files**: PascalCase for components (`TexasMap.tsx`), camelCase for hooks (`useMapData.ts`) and utils (`mapHelpers.ts`)
- **Imports**: React first, third-party libs, local components, hooks, types, utils last
- **Components**: PascalCase names, arrow functions with `React.FC<Props>`, destructured props with defaults
- **Props**: Interfaces follow `ComponentNameProps` pattern, camelCase properties, optional props with `?`
- **State**: camelCase variables, `null` for nullable types, objects with defaults
- **Functions**: `useCallback` for event handlers, arrow functions preferred
- **Errors**: Type classification, retry logic with exponential backoff, user-friendly error components
- **CSS**: Tailwind utility classes with conditional logic, custom prefixes (`btn-`, `card-`, `marker-`)
- **Accessibility**: ARIA attributes, roles, screen reader support
- **Environment**: Uses `.env.local` for API keys (Google Maps, Congress.gov optional)
