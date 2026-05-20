/**
 * Generic point-in-polygon helpers shared across overlay types.
 *
 * Coordinates follow the GeoJSON convention: `[longitude, latitude]`.
 * Functions take `(lat, lng)` for callers convenience and ray-cast against
 * the coordinate arrays.
 */

export type PolygonGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export const isPointInPolygon = (
  lat: number,
  lng: number,
  geometry: { type: string; coordinates: number[][][] | number[][][][] },
): boolean => {
  if (geometry.type === 'Polygon') {
    return isPointInSinglePolygon(lat, lng, geometry.coordinates as number[][][]);
  }
  if (geometry.type === 'MultiPolygon') {
    return isPointInMultiPolygon(lat, lng, geometry.coordinates as number[][][][]);
  }
  return false;
};

export const isPointInSinglePolygon = (
  lat: number,
  lng: number,
  coordinates: number[][][],
): boolean => {
  if (!coordinates || coordinates.length === 0) return false;

  const polygon = coordinates[0];
  if (!polygon || polygon.length === 0) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

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
