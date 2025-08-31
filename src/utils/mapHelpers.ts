/**
 * Utility functions for map operations and calculations
 * These helpers provide common geographic calculations and formatting
 */

/**
 * Calculate map bounds from an array of locations
 * @param locations Array of locations with lat/lng coordinates
 * @param padding Optional padding in degrees to add around the bounds
 * @returns Bounds object with north, south, east, west coordinates
 */
export const calculateMapBounds = (
  locations: { lat: number; lng: number }[],
  padding: number = 0
): { north: number; south: number; east: number; west: number } => {
  // Default bounds for Texas if no locations provided
  if (locations.length === 0) {
    return {
      north: 36.5007,  // Northern Texas border
      south: 25.8371,  // Southern Texas border
      east: -93.5080,  // Eastern Texas border
      west: -106.6456  // Western Texas border
    };
  }

  // Initialize bounds with first location
  let north = locations[0].lat;
  let south = locations[0].lat;
  let east = locations[0].lng;
  let west = locations[0].lng;

  // Find min/max coordinates
  locations.forEach(location => {
    north = Math.max(north, location.lat);
    south = Math.min(south, location.lat);
    east = Math.max(east, location.lng);
    west = Math.min(west, location.lng);
  });

  // Apply padding
  return {
    north: north + padding,
    south: south - padding,
    east: east + padding,
    west: west - padding
  };
};

/**
 * Calculate the center point of an array of locations
 * @param locations Array of locations with lat/lng coordinates
 * @returns Center point as lat/lng object
 */
export const calculateMapCenter = (
  locations: { lat: number; lng: number }[]
): { lat: number; lng: number } => {
  // Default center of Texas if no locations provided
  if (locations.length === 0) {
    return { lat: 31.9686, lng: -99.9018 };
  }

  // For a single location, return that location
  if (locations.length === 1) {
    return { lat: locations[0].lat, lng: locations[0].lng };
  }

  // Calculate average of all coordinates
  const sumLat = locations.reduce((sum, location) => sum + location.lat, 0);
  const sumLng = locations.reduce((sum, location) => sum + location.lng, 0);

  return {
    lat: sumLat / locations.length,
    lng: sumLng / locations.length
  };
};

/**
 * Check if a point is within geographic bounds
 * @param lat Latitude of the point
 * @param lng Longitude of the point
 * @param bounds Bounds object with north, south, east, west coordinates
 * @returns True if the point is within the bounds
 */
export const isPointInBounds = (
  lat: number,
  lng: number,
  bounds: { north: number; south: number; east: number; west: number }
): boolean => {
  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  );
};

/**
 * Calculate a bounding box around a point with a given radius
 * @param lat Latitude of the center point
 * @param lng Longitude of the center point
 * @param radiusKm Radius in kilometers
 * @returns Bounds object with north, south, east, west coordinates
 */
export const calculateBoundingBox = (
  lat: number,
  lng: number,
  radiusKm: number
): { north: number; south: number; east: number; west: number } => {
  // Earth's radius in kilometers
  // const earthRadius = 6371;

  // Convert radius from kilometers to degrees latitude
  // (1 degree latitude is approximately 111 kilometers)
  const latDelta = radiusKm / 111;
  
  // Convert radius from kilometers to degrees longitude
  // (1 degree longitude varies with latitude)
  const lngDelta = radiusKm / (111 * Math.cos(degreesToRadians(lat)));
  
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta
  };
};

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  // If points are identical, return 0
  if (lat1 === lat2 && lng1 === lng2) {
    return 0;
  }
  
  // Earth's radius in kilometers
  const earthRadius = 6371;
  
  // Convert degrees to radians
  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c;
};

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate appropriate zoom level for given bounds
 * @param bounds Bounds object with north, south, east, west coordinates
 * @param minZoom Minimum zoom level (default: 3)
 * @param maxZoom Maximum zoom level (default: 18)
 * @returns Zoom level between minZoom and maxZoom
 */
export const getZoomLevelForBounds = (
  bounds: { north: number; south: number; east: number; west: number },
  minZoom: number = 3,
  maxZoom: number = 18
): number => {
  // Calculate the angular distance
  const latDelta = bounds.north - bounds.south;
  const lngDelta = bounds.east - bounds.west;
  
  // Use the larger of the two deltas to determine zoom
  const maxDelta = Math.max(latDelta, lngDelta);
  
  // Simple logarithmic scale for zoom level
  // Smaller delta = higher zoom level
  const zoom = 14 - Math.log2(maxDelta * 100);
  
  // Clamp to min/max zoom levels
  return Math.min(Math.max(Math.round(zoom), minZoom), maxZoom);
};

/**
 * Get appropriate map type based on zoom level
 * @param zoomLevel Current zoom level
 * @returns Map type (terrain, roadmap, or hybrid)
 */
export const getMapTypeForZoomLevel = (zoomLevel: number): 'terrain' | 'roadmap' | 'hybrid' => {
  if (zoomLevel <= 8) {
    return 'terrain';  // Low zoom: show terrain for state-level view
  } else if (zoomLevel <= 13) {
    return 'roadmap';  // Medium zoom: show roads for city-level view
  } else {
    return 'hybrid';   // High zoom: show hybrid for street-level view
  }
};

/**
 * Format coordinate for display
 * @param value Coordinate value (latitude or longitude)
 * @param type Type of coordinate ('lat' or 'lng')
 * @param decimalPlaces Number of decimal places to display
 * @returns Formatted coordinate string
 */
export const formatCoordinate = (
  value: number,
  type: 'lat' | 'lng',
  decimalPlaces: number = 4
): string => {
  const absValue = Math.abs(value);
  const formattedValue = absValue.toFixed(decimalPlaces);
  
  if (value === 0) {
    return `${formattedValue}°`;
  }
  
  if (type === 'lat') {
    return `${formattedValue}° ${value > 0 ? 'N' : 'S'}`;
  } else {
    return `${formattedValue}° ${value > 0 ? 'E' : 'W'}`;
  }
};

/**
 * Parse coordinate string into lat/lng object
 * @param coordString Coordinate string in format "lat, lng"
 * @returns Lat/lng object or null if invalid
 */
export const parseCoordinateString = (
  coordString: string
): { lat: number; lng: number } | null => {
  // Remove whitespace and split by comma
  const parts = coordString.trim().split(/\s*,\s*/);
  
  if (parts.length !== 2) {
    return null;
  }
  
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  
  return { lat, lng };
};

/**
 * Format currency values for display
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 * @param num The number to format
 * @returns Formatted number string with suffix
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};
