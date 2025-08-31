/**
 * Environment variable validation and access utilities
 * Handles differences between Vite (import.meta.env) and Jest (process.env) environments
 */

// Type guard to check if we're in a browser environment with Vite

/**
 * Get environment variable value with fallback for different environments
 */
export function getEnvVar(key: string): string | undefined {
  // In test environment or Node.js, use process.env
  if (typeof process !== 'undefined' && process.env && (process.env.NODE_ENV === 'test' || typeof window === 'undefined')) {
    return process.env[key];
  }
  
  // In browser with Vite, use import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  
  // Fallback - should not reach here in normal circumstances
  return undefined;
}

/**
 * Validate that required environment variables are set
 */
export function validateRequiredEnvVars(): void {
  const requiredVars = ['VITE_GOOGLE_MAPS_API_KEY'];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    const value = getEnvVar(varName);
    if (!value) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * Get Google Maps API key
 */
export function getGoogleMapsApiKey(): string {
  const apiKey = getEnvVar('VITE_GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    throw new Error('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.');
  }
  return apiKey;
}

/**
 * Get Google Maps Map ID
 */
export function getGoogleMapsMapId(): string | undefined {
  return getEnvVar('VITE_GOOGLE_MAPS_MAP_ID');
}

/**
 * Get Congress API key (optional)
 */
export function getCongressApiKey(): string | undefined {
  return getEnvVar('VITE_CONGRESS_API_KEY');
}
