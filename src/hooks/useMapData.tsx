import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { HeadStartProgram, LayerVisibility, TxhsaRegion, TxhsaRegionName } from '../types/maps';
import { processHeadStartPrograms } from '../data/headStartPrograms';
import { processTxhsaRegion, validateTxhsaRegion, TXHSA_REGION_NAMES } from '../data/txhsaRegions';
import { isPointInPolygon } from '../utils/geometry';

/**
 * Internal hook that owns the actual state, fetches, and derived values.
 * Wrap the tree once in <MapDataProvider> -- consumers call useMapData()
 * (below) which reads from the shared context. Calling this internal hook
 * twice in the same tree would re-run the loaders, which is exactly the
 * regression the provider fixes.
 */
const useMapDataInternal = () => {
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    majorCities: false,
    counties: false,
    headStartPrograms: true,
    txhsaRegions: false, // R7: default OFF
  });

  const [headStartPrograms, setHeadStartPrograms] = useState<HeadStartProgram[]>([]);
  const [txhsaRegions, setTxhsaRegions] = useState<TxhsaRegion[]>([]);

  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);

  const [programsError, setProgramsError] = useState<string | null>(null);
  const [regionsError, setRegionsError] = useState<string | null>(null);

  // Retry counter lives in a ref so the loadHeadStartPrograms useCallback
  // can read the latest value without a stale closure (the previous useState
  // pattern was guarded with an eslint-disable, and reads inside the empty-dep
  // callback always saw 0 -- making the retry chain effectively unbounded).
  const programsRetryRef = useRef(0);
  const MAX_RETRY_ATTEMPTS = 3;
  const FETCH_TIMEOUT_MS = 10_000;

  // Track in-flight controllers and retry timers so the unmount effect can
  // abort outstanding requests and cancel pending retries -- prevents
  // setState-on-unmounted-component warnings and orphaned retry chains.
  const inFlightControllersRef = useRef<Set<AbortController>>(new Set());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const loadHeadStartPrograms = useCallback(async () => {
    setIsLoadingPrograms(true);
    setProgramsError(null);

    const controller = new AbortController();
    inFlightControllersRef.current.add(controller);
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch('/assets/geojson/headStartPrograms.json', { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to load Head Start programs: HTTP ${response.status} ${response.statusText}`);
      }

      let programsData;
      try {
        programsData = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse Head Start programs data: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
      }

      if (!Array.isArray(programsData)) {
        throw new Error('Invalid Head Start programs data: Expected an array');
      }

      const transformedPrograms = processHeadStartPrograms(programsData);
      if (transformedPrograms.length === 0) {
        throw new Error('No valid Head Start programs found in the data');
      }

      setHeadStartPrograms(transformedPrograms);
      console.log(`Loaded ${transformedPrograms.length} Head Start programs`);
      programsRetryRef.current = 0;
    } catch (error) {
      // Caller aborted (unmount or component-driven cancel); do not surface
      // an error or schedule a retry.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error loading Head Start programs:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setProgramsError('Network error: Unable to load Head Start programs data. Please check your internet connection.');
      } else if (error instanceof SyntaxError) {
        setProgramsError('Data format error: The Head Start programs data is not in a valid format.');
      } else {
        setProgramsError(`Failed to load Head Start programs data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      if (programsRetryRef.current < MAX_RETRY_ATTEMPTS) {
        const attempt = programsRetryRef.current;
        programsRetryRef.current += 1;
        retryTimerRef.current = setTimeout(() => loadHeadStartPrograms(), 1000 * Math.pow(2, attempt));
      }
    } finally {
      clearTimeout(timeoutId);
      inFlightControllersRef.current.delete(controller);
      setIsLoadingPrograms(false);
    }
  }, []);

  /**
   * Load the four TXHSA region geojson files in parallel. Reports a regionsError
   * if any single fetch fails so the UI doesn't render a partial overlay
   * (R4: regions must collectively cover Texas with no gaps).
   */
  const loadTxhsaRegions = useCallback(async () => {
    setIsLoadingRegions(true);
    setRegionsError(null);

    const controller = new AbortController();
    inFlightControllersRef.current.add(controller);
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const slugs = TXHSA_REGION_NAMES.map(n => n.toLowerCase());
      const results = await Promise.all(slugs.map(async slug => {
        const url = `/assets/txhsa-geojson/${slug}.geojson`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load region ${slug}: HTTP ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const feature = data?.features?.[0];
        if (!validateTxhsaRegion(feature)) {
          throw new Error(`Invalid TXHSA region payload at ${url}`);
        }
        return processTxhsaRegion(feature);
      }));
      setTxhsaRegions(results);
      console.log(`Loaded ${results.length} TXHSA regions`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error loading TXHSA regions:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setRegionsError('Network error: Unable to load TXHSA region data. Please check your internet connection.');
      } else {
        setRegionsError(`Failed to load TXHSA regions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setTxhsaRegions([]);
    } finally {
      clearTimeout(timeoutId);
      inFlightControllersRef.current.delete(controller);
      setIsLoadingRegions(false);
    }
  }, []);

  useEffect(() => {
    loadHeadStartPrograms();
    loadTxhsaRegions();
    // Capture the ref containers at effect-run time so the cleanup closes
    // over the same Set / timer reference even if a later render mutates
    // the refs (satisfies react-hooks/exhaustive-deps for refs).
    const controllers = inFlightControllersRef.current;
    const timerRef = retryTimerRef;
    return () => {
      for (const controller of controllers) {
        controller.abort();
      }
      controllers.clear();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loadHeadStartPrograms, loadTxhsaRegions]);

  /**
   * Lazy program counts per TXHSA region.
   *
   * Computed once both regions and programs are loaded. Each program is
   * assigned to the first matching region; per R4 regions don't overlap,
   * so first-match is unambiguous. Result is null until inputs are ready.
   */
  const regionProgramCounts = useMemo<Record<TxhsaRegionName, number> | null>(() => {
    if (txhsaRegions.length === 0 || headStartPrograms.length === 0) {
      return null;
    }
    const counts: Record<TxhsaRegionName, number> = { West: 0, North: 0, East: 0, South: 0 };
    let unmatched = 0;
    for (const program of headStartPrograms) {
      let matched = false;
      for (const region of txhsaRegions) {
        if (isPointInPolygon(program.lat, program.lng, region.feature.geometry)) {
          counts[region.name] += 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        unmatched += 1;
        // Surface the R10 invariant violation -- "each program counted in
        // exactly one region" -- so it's visible during development even
        // when no test exercises the data path that produced it.
        console.warn(
          `[useMapData] Program "${program.name}" (id=${program.id}, lat=${program.lat}, lng=${program.lng}) ` +
          `falls outside all TXHSA region polygons; not counted.`,
        );
      }
    }
    if (unmatched > 0) {
      console.warn(`[useMapData] ${unmatched} program(s) unmatched out of ${headStartPrograms.length}.`);
    }
    return counts;
  }, [txhsaRegions, headStartPrograms]);

  const isLoading = isLoadingPrograms || isLoadingRegions;
  const hasErrors = !!programsError || !!regionsError;

  const retryLoading = useCallback(() => {
    if (programsError) {
      programsRetryRef.current = 0;
      loadHeadStartPrograms();
    }
    if (regionsError) {
      loadTxhsaRegions();
    }
  }, [programsError, regionsError, loadHeadStartPrograms, loadTxhsaRegions]);

  return {
    layerVisibility,
    toggleLayer,

    headStartPrograms,
    txhsaRegions,
    regionProgramCounts,

    isLoading,
    isLoadingPrograms,
    isLoadingRegions,

    hasErrors,
    programsError,
    regionsError,

    retryLoading,

    loadHeadStartPrograms,
    loadTxhsaRegions,
  };
};

type MapDataValue = ReturnType<typeof useMapDataInternal>;

const MapDataContext = createContext<MapDataValue | null>(null);

/**
 * Provider that owns the single useMapData instance for the whole tree.
 * Wrap <App /> (or the tree root) in <MapDataProvider> so App, TexasMap,
 * and any future consumer share one fetch chain, one retry loop, and one
 * error state.
 */
export const MapDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMapDataInternal();
  return <MapDataContext.Provider value={value}>{children}</MapDataContext.Provider>;
};

/**
 * Consume the shared map data state. Must be called inside a MapDataProvider.
 */
export const useMapData = (): MapDataValue => {
  const ctx = useContext(MapDataContext);
  if (!ctx) {
    throw new Error('useMapData must be used within a MapDataProvider');
  }
  return ctx;
};

// Exposed for tests that want to render the hook in isolation. Production
// code should always go through the provider so there is exactly one
// instance per tree.
export { useMapDataInternal };
