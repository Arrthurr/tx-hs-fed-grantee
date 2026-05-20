import type { TxhsaRegion, TxhsaRegionFeature, TxhsaRegionName } from '../types/maps';

export const TXHSA_REGION_NAMES: readonly TxhsaRegionName[] = ['West', 'North', 'East', 'South'] as const;

/**
 * Validate a raw region feature loaded from a region geojson file.
 * Returns true if the feature has the expected shape and a recognized name.
 */
export const validateTxhsaRegion = (feature: unknown): feature is TxhsaRegionFeature => {
  if (!feature || typeof feature !== 'object') return false;
  const f = feature as Record<string, unknown>;

  if (f.type !== 'Feature') return false;

  const props = f.properties as Record<string, unknown> | undefined;
  if (!props || typeof props.name !== 'string') return false;
  if (!TXHSA_REGION_NAMES.includes(props.name as TxhsaRegionName)) return false;

  const geom = f.geometry as Record<string, unknown> | undefined;
  if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return false;
  if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) return false;

  return true;
};

/**
 * Compute an approximate centroid for a TxhsaRegionFeature by averaging the
 * vertices of the largest ring. Good enough for label/info-window placement.
 */
const computeCenter = (feature: TxhsaRegionFeature): google.maps.LatLngLiteral => {
  const rings: number[][][] =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.map(poly => poly[0]).filter(Boolean);

  // Use the ring with the most vertices as a proxy for "largest landmass".
  let chosen: number[][] | null = null;
  for (const ring of rings) {
    if (!chosen || ring.length > chosen.length) {
      chosen = ring;
    }
  }
  if (!chosen || chosen.length === 0) {
    return { lat: 0, lng: 0 };
  }

  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of chosen) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / chosen.length, lng: sumLng / chosen.length };
};

/**
 * Turn a validated TxhsaRegionFeature into the runtime TxhsaRegion object the
 * map components use.
 */
export const processTxhsaRegion = (feature: TxhsaRegionFeature): TxhsaRegion => ({
  name: feature.properties.name,
  feature,
  center: computeCenter(feature),
});
