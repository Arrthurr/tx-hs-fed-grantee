import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'maps-vendor': ['@vis.gl/react-google-maps', '@googlemaps/markerclusterer'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
    // Do not publish source maps with the production bundle.
    sourcemap: false,
  },
  // Enable asset optimization
  assetsInclude: ['**/*.geojson'],
  // Dev server stays loopback-only. Do not pass `--host` / `server.host`
  // unless you also restrict `server.fs` and treat the process as exposed.
  // `cors: true` is Vite's default and only applies to this local server.
  server: {
    host: '127.0.0.1',
    cors: true,
    // Dev responses must never be cached: a long max-age pins stale modules
    // and GeoJSON in the browser across restarts.
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});