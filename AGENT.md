# AGENT.md - Development Guidelines

## Commands
- **Dev**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (TypeScript check + Vite build)
- **Lint**: `npm run lint` (ESLint for TypeScript/React)
- **Test**: `npm test` (Jest unit tests)
- **Test Single File**: `npm test -- src/components/ComponentName.test.tsx`
- **E2E Tests**: `npm run test:e2e` (Playwright)
- **E2E UI**: `npm run test:e2e:ui` (Playwright with UI)

## Architecture
- **Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS
- **Maps**: Google Maps API via @vis.gl/react-google-maps
- **Components**: Radix UI + custom components in `/src/components/`
- **Data**: Head Start programs + congressional districts (GeoJSON)
- **Testing**: Jest + Testing Library (unit), Playwright (e2e)
- **Structure**: `/src/{components,hooks,data,types,utils,styles}/`

## Code Style
- **TypeScript**: Strict mode, explicit interfaces for props/data
- **React**: Functional components with hooks, no default exports for components
- **Imports**: Absolute paths from src/, lucide-react for icons
- **Naming**: PascalCase components, camelCase variables, kebab-case files
- **Error Handling**: Try/catch with proper error boundaries and loading states
- **Comments**: JSDoc for component interfaces, inline for complex logic only
