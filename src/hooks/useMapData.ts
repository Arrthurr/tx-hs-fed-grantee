import { useState, useEffect, useCallback, useMemo } from 'react';
import { HeadStartProgram, LayerVisibility, TxhsaRegion, TxhsaRegionName } from '../types/maps';
import { processHeadStartPrograms } from '../data/headStartPrograms';
import { processTxhsaRegion, validateTxhsaRegion, TXHSA_REGION_NAMES } from '../data/txhsaRegions';
import { isPointInPolygon } from '../utils/geometry';

/**
 * Custom hook for managing map data and layer states.
 * Loads Head Start programs and TXHSA regions, plus computes per-region
 * program counts when both datasets are available.
 */
export const useMapData = () => {
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

  const [programsRetryCount, setProgramsRetryCount] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const setLayerVisibilityState = useCallback((layer: keyof LayerVisibility, visible: boolean) => {
    setLayerVisibility(prev => ({ ...prev, [layer]: visible }));
  }, []);

  const loadHeadStartPrograms = useCallback(async () => {
    setIsLoadingPrograms(true);
    setProgramsError(null);

    try {
      const response = await fetch('/assets/geojson/headStartPrograms.json');
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
      setProgramsRetryCount(0);
    } catch (error) {
      console.error('Error loading Head Start programs:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setProgramsError('Network error: Unable to load Head Start programs data. Please check your internet connection.');
      } else if (error instanceof SyntaxError) {
        setProgramsError('Data format error: The Head Start programs data is not in a valid format.');
      } else {
        setProgramsError(`Failed to load Head Start programs data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setProgramsRetryCount(prev => prev + 1);
      if (programsRetryCount < MAX_RETRY_ATTEMPTS) {
        setTimeout(() => loadHeadStartPrograms(), 1000 * Math.pow(2, programsRetryCount));
      }
    } finally {
      setIsLoadingPrograms(false);
    }
    // programsRetryCount intentionally read inside; setTimeout retry is best-effort
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load the four TXHSA region geojson files in parallel. Reports a regionsError
   * if any single fetch fails so the UI doesn't render a partial overlay
   * (R4: regions must collectively cover Texas with no gaps).
   */
  const loadTxhsaRegions = useCallback(async () => {
    setIsLoadingRegions(true);
    setRegionsError(null);
    try {
      const slugs = TXHSA_REGION_NAMES.map(n => n.toLowerCase());
      const results = await Promise.all(slugs.map(async slug => {
        const url = `/assets/txhsa-geojson/${slug}.geojson`;
        const response = await fetch(url);
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
      console.error('Error loading TXHSA regions:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setRegionsError('Network error: Unable to load TXHSA region data. Please check your internet connection.');
      } else {
        setRegionsError(`Failed to load TXHSA regions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setTxhsaRegions([]);
    } finally {
      setIsLoadingRegions(false);
    }
  }, []);

  useEffect(() => {
    loadHeadStartPrograms();
    loadTxhsaRegions();
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
    for (const program of headStartPrograms) {
      for (const region of txhsaRegions) {
        if (isPointInPolygon(program.lat, program.lng, region.feature.geometry)) {
          counts[region.name] += 1;
          break;
        }
      }
    }
    return counts;
  }, [txhsaRegions, headStartPrograms]);

  const isLoading = isLoadingPrograms || isLoadingRegions;
  const hasErrors = !!programsError || !!regionsError;

  const retryLoading = useCallback(() => {
    if (programsError) {
      setProgramsRetryCount(0);
      loadHeadStartPrograms();
    }
    if (regionsError) {
      loadTxhsaRegions();
    }
  }, [programsError, regionsError, loadHeadStartPrograms, loadTxhsaRegions]);

  return {
    layerVisibility,
    toggleLayer,
    setLayerVisibilityState,

    programs: headStartPrograms,
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
