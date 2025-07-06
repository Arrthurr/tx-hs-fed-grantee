/**
 * Environment variable validation utility
 * Helps verify that all required API keys are properly configured
 */

export interface EnvironmentConfig {
  googleMapsApiKey: string | undefined;
  googleMapsMapId: string | undefined;
  congressApiKey: string | undefined;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Get current environment configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    googleMapsMapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
    congressApiKey: import.meta.env.VITE_CONGRESS_API_KEY
  };
};

/**
 * Validate environment configuration
 */
export const validateEnvironment = (): ValidationResult => {
  const config = getEnvironmentConfig();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check Google Maps API key (required)
  if (!config.googleMapsApiKey) {
    errors.push('VITE_GOOGLE_MAPS_API_KEY is required');
  } else if (config.googleMapsApiKey === 'your_google_maps_api_key_here') {
    errors.push('Please replace the placeholder Google Maps API key with your actual key');
  } else if (config.googleMapsApiKey.length < 30) {
    warnings.push('Google Maps API key appears to be invalid (too short)');
  }

  // Check Google Maps Map ID (optional)
  if (config.googleMapsMapId === 'your_map_id_here') {
    warnings.push('Google Maps Map ID is set to placeholder value');
  }

  // Check Congress API key (optional)
  if (config.congressApiKey === 'your_congress_api_key_here') {
    warnings.push('Congress.gov API key is set to placeholder value');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Log environment validation results
 */
export const logEnvironmentValidation = (): void => {
  if (import.meta.env.DEV) {
    const validation = validateEnvironment();
    const config = getEnvironmentConfig();
    
    console.group('🌍 Environment Configuration');
    console.log('Google Maps API Key:', config.googleMapsApiKey ? '✅ Configured' : '❌ Missing');
    console.log('Google Maps Map ID:', config.googleMapsMapId ? '✅ Configured' : '⚠️ Optional');
    console.log('Congress.gov API Key:', config.congressApiKey ? '✅ Configured' : '⚠️ Optional');
    
    if (validation.errors.length > 0) {
      console.error('❌ Configuration Errors:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Configuration Warnings:', validation.warnings);
    }
    
    if (validation.isValid) {
      console.log('✅ Environment configuration is valid');
    }
    
    console.groupEnd();
  }
}; 