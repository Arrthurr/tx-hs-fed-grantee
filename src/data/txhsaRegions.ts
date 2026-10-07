import type { HeadStartProgram, TxhsaRegion, TxhsaRegionFeature, TxhsaRegionName } from '../types/maps';
import { isPointInPolygon, isValidPolygonGeometry } from '../utils/geometry';

export const TXHSA_REGION_NAMES: readonly TxhsaRegionName[] = ['West', 'North', 'East', 'South'] as const;

type RegionCountsResult =
  | { ok: true; counts: Record<TxhsaRegionName, number> }
  | { ok: false; location: HeadStartProgram; matchCount: number };

/** Count accepted locations against validated features; never publish partial counts. */
export const countLocationsByRegion = (
  locations: readonly HeadStartProgram[],
  regions: readonly TxhsaRegionFeature[],
): RegionCountsResult => {
  const counts: Record<TxhsaRegionName, number> = { West: 0, North: 0, East: 0, South: 0 };
  for (const location of locations) {
    const matches = regions.filter(region => isPointInPolygon(location.lat, location.lng, region.geometry));
    if (matches.length !== 1) {
      return { ok: false, location, matchCount: matches.length };
    }
    counts[matches[0].properties.name] += 1;
  }
  return { ok: true, counts };
};

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

  return isValidPolygonGeometry(f.geometry);
};

/** Parse the single named feature in a region file, independently of how it was read. */
export const parseTxhsaRegionCollection = (
  data: unknown,
  expectedName: TxhsaRegionName,
): TxhsaRegionFeature => {
  const collection = data as { type?: unknown; features?: unknown } | null;
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length !== 1) {
    throw new Error(`Invalid region collection: ${expectedName}`);
  }
  const feature = collection.features[0];
  if (!validateTxhsaRegion(feature)) throw new Error(`Invalid region: ${expectedName}`);
  if (feature.properties.name !== expectedName) throw new Error(`Region name mismatch: ${expectedName}`);
  return feature;
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
