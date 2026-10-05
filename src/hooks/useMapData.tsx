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
  const programsRequestRef = useRef<AbortController | null>(null);
  const regionsRequestRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const loadHeadStartPrograms = useCallback(async (automaticRetry = false) => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (!automaticRetry) programsRetryRef.current = 0;
    programsRequestRef.current?.abort();
    setIsLoadingPrograms(true);
    setProgramsError(null);

    const controller = new AbortController();
    programsRequestRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true });

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

      if (controller.signal.aborted) return;
      setHeadStartPrograms(transformedPrograms);
      programsRetryRef.current = 0;
    } catch (error) {
      if (programsRequestRef.current !== controller || (controller.signal.aborted && !timedOut)) {
        return;
      }
      console.error('Error loading Head Start programs:', error);
      if (timedOut) {
        setProgramsError('Loading Head Start programs timed out. Please check your connection and retry.');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setProgramsError('Network error: Unable to load Head Start programs data. Please check your internet connection.');
      } else if (error instanceof SyntaxError) {
        setProgramsError('Data format error: The Head Start programs data is not in a valid format.');
      } else {
        setProgramsError(`Failed to load Head Start programs data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      if (programsRetryRef.current < MAX_RETRY_ATTEMPTS) {
        const attempt = programsRetryRef.current;
        programsRetryRef.current += 1;
        retryTimerRef.current = setTimeout(() => loadHeadStartPrograms(true), 1000 * Math.pow(2, attempt));
      }
    } finally {
      clearTimeout(timeoutId);
      if (programsRequestRef.current === controller && (!controller.signal.aborted || timedOut)) {
        setIsLoadingPrograms(false);
      }
    }
  }, []);

  /**
   * Load the four TXHSA region geojson files in parallel. Reports a regionsError
   * if any single fetch fails so the UI doesn't render a partial overlay
   * (R4: regions must collectively cover Texas with no gaps).
   */
  const loadTxhsaRegions = useCallback(async () => {
    regionsRequestRef.current?.abort();
    setIsLoadingRegions(true);
    setRegionsError(null);
    setTxhsaRegions([]);

    const controller = new AbortController();
    regionsRequestRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true });

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
      if (!controller.signal.aborted) setTxhsaRegions(results);
    } catch (error) {
      if (regionsRequestRef.current !== controller || (controller.signal.aborted && !timedOut)) {
        return;
      }
      console.error('Error loading TXHSA regions:', error);
      if (timedOut) {
        setRegionsError('Loading TXHSA regions timed out. Please check your connection and retry.');
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setRegionsError('Network error: Unable to load TXHSA region data. Please check your internet connection.');
      } else {
        setRegionsError(`Failed to load TXHSA regions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setTxhsaRegions([]);
      setLayerVisibility(prev => ({ ...prev, txhsaRegions: false }));
    } finally {
      clearTimeout(timeoutId);
      if (regionsRequestRef.current === controller && (!controller.signal.aborted || timedOut)) {
        setIsLoadingRegions(false);
        // Abort siblings when one region fails; never retain a partial load.
        controller.abort();
      }
    }
  }, []);

  useEffect(() => {
    loadHeadStartPrograms();
    loadTxhsaRegions();
    const programsRef = programsRequestRef;
    const regionsRef = regionsRequestRef;
    const timerRef = retryTimerRef;
    return () => {
      programsRef.current?.abort();
      regionsRef.current?.abort();
      programsRef.current = null;
      regionsRef.current = null;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loadHeadStartPrograms, loadTxhsaRegions]);

  /**
   * Lazy program counts per TXHSA region.
   *
   * Computed once both regions and programs are loaded. Publish no counts
   * if any location has zero or multiple matches (including shared edges).
   */
  const regionProgramCounts = useMemo<Record<TxhsaRegionName, number> | null>(() => {
    if (txhsaRegions.length === 0 || headStartPrograms.length === 0) {
      return null;
    }
    const counts: Record<TxhsaRegionName, number> = { West: 0, North: 0, East: 0, South: 0 };
    for (const program of headStartPrograms) {
      const matches = txhsaRegions.filter(region =>
        isPointInPolygon(program.lat, program.lng, region.feature.geometry));
      if (matches.length !== 1) {
        console.warn(
          `[useMapData] Location ${program.id} matches ${matches.length} regions; counts withheld.`,
        );
        return null;
      }
      counts[matches[0].name] += 1;
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
