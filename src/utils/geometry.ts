/**
 * Generic point-in-polygon helpers shared across overlay types.
 *
 * Coordinates follow the GeoJSON convention: `[longitude, latitude]`.
 * Functions take `(lat, lng)` for callers convenience and ray-cast against
 * the coordinate arrays.
 */

import type { PolygonGeometry } from '../types/maps';

export type { PolygonGeometry };

export const isPointInPolygon = (
  lat: number,
  lng: number,
  geometry: PolygonGeometry,
): boolean => {
  if (geometry.type === 'Polygon') {
    return isPointInSinglePolygon(lat, lng, geometry.coordinates);
  }
  return isPointInMultiPolygon(lat, lng, geometry.coordinates);
};

export const isPointInSinglePolygon = (
  lat: number,
  lng: number,
  coordinates: number[][][],
): boolean => {
  if (!coordinates || coordinates.length === 0) return false;
  // Closed outer boundaries belong to the polygon; holes (including their
  // boundaries) do not. Shared region edges therefore match both regions.
  // Callers must withhold or explicitly decide overlaps; never use array order.
  return isPointInRing(lat, lng, coordinates[0]) &&
    !coordinates.slice(1).some(ring => isPointInRing(lat, lng, ring));
};

const isPointInRing = (lat: number, lng: number, polygon: number[][]): boolean => {
  if (!polygon || polygon.length === 0) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    if ((lng - xi) * (yj - yi) === (lat - yi) * (xj - xi) &&
        lng >= Math.min(xi, xj) && lng <= Math.max(xi, xj) &&
        lat >= Math.min(yi, yj) && lat <= Math.max(yi, yj)) return true;

    if (((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
};

export const isPointInMultiPolygon = (
  lat: number,
  lng: number,
  coordinates: number[][][][],
): boolean => {
  if (!coordinates) return false;
  return coordinates.some(polygon => isPointInSinglePolygon(lat, lng, polygon));
};

/** Structural GeoJSON validation: finite positions, legal bounds, closed rings. */
export const isValidPolygonGeometry = (geometry: unknown): geometry is PolygonGeometry => {
  if (!geometry || typeof geometry !== 'object') return false;
  const { type, coordinates } = geometry as Record<string, unknown>;
  if (type !== 'Polygon' && type !== 'MultiPolygon') return false;
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
  const polygons = type === 'Polygon' ? [coordinates] : coordinates;
  return polygons.every(polygon => Array.isArray(polygon) && polygon.length > 0 &&
    polygon.every((ring: unknown) => {
      if (!Array.isArray(ring) || ring.length < 4) return false;
      if (!ring.every(position => Array.isArray(position) && position.length === 2 &&
        Number.isFinite(position[0]) && Number.isFinite(position[1]) &&
        Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90)) return false;
      return ring[0][0] === ring[ring.length - 1][0] &&
        ring[0][1] === ring[ring.length - 1][1] &&
        new Set(ring.map(position => JSON.stringify(position))).size >= 3;
    }));
};
