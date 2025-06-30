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
          'maps-vendor': ['@vis.gl/react-google-maps'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
    // Generate source maps for production
    sourcemap: true,
  },
  // Enable asset optimization
  assetsInclude: ['**/*.geojson'],
  // Configure server
  server: {
    // Enable HTTP/2
    https: false,
    // Enable compression
    cors: true,
    // Preload assets
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
  },
});