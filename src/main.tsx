import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load the App component
const App = lazy(() => import('./App.tsx'));

// Create root and render app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingSpinner message="Loading application..." size="lg" />}>
      <App />
    </Suspense>
  </StrictMode>
);