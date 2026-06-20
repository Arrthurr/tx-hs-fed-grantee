import { isPointInPolygon, isPointInSinglePolygon, isPointInMultiPolygon } from './geometry';
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

  it('produces deterministic behavior on edges (documented; not asserting correctness)', () => {
    // The ray-casting algorithm has a well-defined - if implementation-specific -
    // answer on edges. We assert determinism by calling twice and comparing.
    const a = isPointInSinglePolygon(1, 0, unitSquare);
    const b = isPointInSinglePolygon(1, 0, unitSquare);
    expect(a).toBe(b);
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
