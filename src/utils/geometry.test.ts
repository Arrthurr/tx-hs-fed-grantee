import { isPointInPolygon, isPointInSinglePolygon, isPointInMultiPolygon, isValidPolygonGeometry } from './geometry';
import type { PolygonGeometry } from './geometry';

// Coordinates are [lng, lat]. A unit square from (-1,-1) to (1,1).
const unitSquare: number[][][] = [[
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
]];

// Two disjoint squares.
const twoSquares: number[][][][] = [
  [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
  [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
];

describe('isPointInSinglePolygon', () => {
  it('returns true for a point clearly inside the polygon', () => {
    expect(isPointInSinglePolygon(0, 0, unitSquare)).toBe(true);
  });

  it('returns false for a point clearly outside', () => {
    expect(isPointInSinglePolygon(5, 5, unitSquare)).toBe(false);
  });

  it('returns false for an empty coordinate array without throwing', () => {
    expect(isPointInSinglePolygon(0, 0, [])).toBe(false);
    expect(isPointInSinglePolygon(0, 0, [[]])).toBe(false);
  });

  it('includes all outer edges and vertices', () => {
    for (const [lat, lng] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, 1]]) {
      expect(isPointInSinglePolygon(lat, lng, unitSquare)).toBe(true);
    }
  });

  it('excludes holes and their edges in Polygon and MultiPolygon', () => {
    const withHole = [unitSquare[0], [[0.2, 0.1], [0.8, 0.1], [0.8, 0.6], [0.2, 0.6], [0.2, 0.1]]];
    expect(isPointInSinglePolygon(-0.5, -0.3, withHole)).toBe(true);
    expect(isPointInSinglePolygon(0.3, 0.4, withHole)).toBe(false);
    expect(isPointInSinglePolygon(0.1, 0.4, withHole)).toBe(false);
    expect(isPointInMultiPolygon(0.3, 0.4, [withHole])).toBe(false);
  });

  it('counts a shared outer edge as inside both polygons so callers must resolve overlaps', () => {
    const west: number[][][] = [[[-2, 0], [0, 0], [0, 2], [-2, 2], [-2, 0]]];
    const east: number[][][] = [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]];
    expect(isPointInSinglePolygon(1, 0, west)).toBe(true);
    expect(isPointInSinglePolygon(1, 0, east)).toBe(true);
  });
});

describe('isValidPolygonGeometry', () => {
  it('rejects open, degenerate, non-finite and malformed rings', () => {
    expect(isValidPolygonGeometry({ type: 'Polygon', coordinates: unitSquare })).toBe(true);
    expect(isValidPolygonGeometry({ type: 'MultiPolygon', coordinates: twoSquares })).toBe(true);
    for (const coordinates of [
      [unitSquare[0].slice(0, -1)], [[]], [[[-1, -1], [-1, -1], [-1, -1], [-1, -1]]],
      [[[NaN, 0], [1, 0], [1, 1], [NaN, 0]]], [[null]],
      [[[181, 0], [1, 0], [1, 1], [181, 0]]],
      [[[0, 91], [1, 0], [1, 1], [0, 91]]],
      [[[Infinity, 0], [1, 0], [1, 1], [Infinity, 0]]],
    ]) {
      expect(isValidPolygonGeometry({ type: 'Polygon', coordinates })).toBe(false);
    }
    expect(isValidPolygonGeometry({
      type: 'MultiPolygon',
      coordinates: [[unitSquare[0].slice(0, -1)]],
    })).toBe(false);
  });
});

describe('isPointInMultiPolygon', () => {
  it('returns true when the point is inside the second sub-polygon', () => {
    expect(isPointInMultiPolygon(11, 11, twoSquares)).toBe(true);
  });

  it('returns false when the point lies between the sub-polygons', () => {
    expect(isPointInMultiPolygon(5, 5, twoSquares)).toBe(false);
  });

  it('returns false for an empty coordinate array', () => {
    expect(isPointInMultiPolygon(0, 0, [])).toBe(false);
  });
});

describe('isPointInPolygon', () => {
  it('dispatches to the single-polygon variant for Polygon geometries', () => {
    expect(isPointInPolygon(0, 0, { type: 'Polygon', coordinates: unitSquare })).toBe(true);
    expect(isPointInPolygon(5, 5, { type: 'Polygon', coordinates: unitSquare })).toBe(false);
  });

  it('dispatches to the multi-polygon variant for MultiPolygon geometries', () => {
    expect(isPointInPolygon(11, 11, { type: 'MultiPolygon', coordinates: twoSquares })).toBe(true);
    expect(isPointInPolygon(5, 5, { type: 'MultiPolygon', coordinates: twoSquares })).toBe(false);
  });

  it('returns false for unrecognized geometry types', () => {
    // The fixture is intentionally outside the PolygonGeometry contract
    // (Polygon | MultiPolygon) to exercise the function's defensive
    // fall-through branch; cast through unknown to satisfy the type checker.
    expect(
      isPointInPolygon(0, 0, { type: 'Point', coordinates: [[[0, 0]]] } as unknown as PolygonGeometry),
    ).toBe(false);
  });
});
