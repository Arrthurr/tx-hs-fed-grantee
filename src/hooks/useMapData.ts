import { useState, useEffect, useCallback, useRef } from 'react';
import { HeadStartProgram, CongressionalDistrictFeature, LayerVisibility, CongressApiMember, CongressionalDistrict, CongressApiResponse } from '../types/maps';
import { processHeadStartPrograms, isWithinTexasBounds, validateHeadStartProgram } from '../data/headStartPrograms';
import { processCongressionalDistricts, validateCongressionalDistrict } from '../data/congressionalDistricts';
import { getCongressApiKey } from '../utils/envValidator';

/**
 * Custom hook for managing map data and layer states
 * Handles Head Start programs and congressional districts data
 */
export const useMapData = () => {
  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    majorCities: false, // We'll disable this for Head Start focus
    congressionalDistricts: false, // Disable congressional districts by default (hides district center markers)
    districtBoundaries: false, // Disable district boundaries by default (hides geographic polygons)
    counties: false, // We'll disable this for Head Start focus
    headStartPrograms: true // Enable Head Start programs by default
  });

  // Data state
  const [headStartPrograms, setHeadStartPrograms] = useState<HeadStartProgram[]>([]);
  const [congressionalDistricts, setCongressionalDistricts] = useState<CongressionalDistrict[]>([]);
  const [rawDistrictFeatures, setRawDistrictFeatures] = useState<CongressionalDistrictFeature[]>([]);
  
  // Loading states
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingCongressData, setIsLoadingCongressData] = useState(false);
  
  // Error states
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [districtsError, setDistrictsError] = useState<string | null>(null);
  const [congressDataError, setCongressDataError] = useState<string | null>(null);

  // Retry counters
  const [programsRetryCount, setProgramsRetryCount] = useState(0);
  const [districtsRetryCount, setDistrictsRetryCount] = useState(0);
  const [congressDataRetryCount, setCongressDataRetryCount] = useState(0);

  // Flag to track if congressional data has been loaded
  const congressDataLoadedRef = useRef(false);

  // Maximum retry attempts
  const MAX_RETRY_ATTEMPTS = 3;

  /**
   * Toggle layer visibility
   */
  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility((prev: LayerVisibility) => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  }, []);

  /**
   * Set specific layer visibility
   */
  const setLayerVisibilityState = useCallback((layer: keyof LayerVisibility, visible: boolean) => {
    setLayerVisibility((prev: LayerVisibility) => ({
      ...prev,
      [layer]: visible
    }));
  }, []);

  /**
   * Calculate the center point of a polygon or multipolygon geometry
   */
  const calculateGeometryCenter = (geometry: CongressionalDistrictFeature['geometry']): google.maps.LatLngLiteral => {
    let allCoordinates: number[][] = [];
    
    if (geometry.type === 'Polygon') {
      // For polygon, use the outer ring (first array of coordinates)
      allCoordinates = geometry.coordinates[0] as number[][];
    } else if (geometry.type === 'MultiPolygon') {
      // For multipolygon, flatten all outer rings
      (geometry.coordinates as number[][][][]).forEach(polygon => {
        allCoordinates = allCoordinates.concat(polygon[0]);
      });
    }
    
    if (allCoordinates.length === 0) {
      // Fallback to Texas center if no coordinates
      return { lat: 31.9686, lng: -99.9018 };
    }
    
    // Calculate centroid
    const sumLat = allCoordinates.reduce((sum, coord) => sum + coord[1], 0);
    const sumLng = allCoordinates.reduce((sum, coord) => sum + coord[0], 0);
    
    return {
      lat: sumLat / allCoordinates.length,
      lng: sumLng / allCoordinates.length
    };
  };

  /**
   * Load Head Start programs data from GeoJSON with error handling and retries
   */
  const loadHeadStartPrograms = useCallback(async () => {
    setIsLoadingPrograms(true);
    setProgramsError(null);
    
    try {
      // Fetch the GeoJSON data
      const response = await fetch('/assets/geojson/headStartPrograms.json');
      
      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(`Failed to load Head Start programs: HTTP ${response.status} ${response.statusText}`);
      }
      
      // Parse JSON response
      let programsData;
      try {
        programsData = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse Head Start programs data: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
      }
      
      // Validate data structure
      if (!Array.isArray(programsData)) {
        throw new Error('Invalid Head Start programs data: Expected an array');
      }
      
      // Process and validate the data
      const transformedPrograms = processHeadStartPrograms(programsData);
      
      // Check if we have valid programs
      if (transformedPrograms.length === 0) {
        throw new Error('No valid Head Start programs found in the data');
      }
      
      // Set the processed programs
      setHeadStartPrograms(transformedPrograms);
      console.log(`Loaded ${transformedPrograms.length} Head Start programs`);
      
      // Reset retry counter on success
      setProgramsRetryCount(0);
    } catch (error) {
      console.error('Error loading Head Start programs:', error);
      
      // Set specific error message based on error type
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setProgramsError('Network error: Unable to load Head Start programs data. Please check your internet connection.');
      } else if (error instanceof SyntaxError) {
        setProgramsError('Data format error: The Head Start programs data is not in a valid format.');
      } else {
        setProgramsError(`Failed to load Head Start programs data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Increment retry counter
      setProgramsRetryCount(prev => prev + 1);
      
      // Retry loading if under max attempts
      if (programsRetryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying Head Start programs load (attempt ${programsRetryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
        setTimeout(() => {
          loadHeadStartPrograms();
        }, 1000 * Math.pow(2, programsRetryCount)); // Exponential backoff
      }
    } finally {
      setIsLoadingPrograms(false);
    }
  }, [programsRetryCount]);

  /**
   * Load congressional districts data from GeoJSON with error handling and retries
   */
  const loadCongressionalDistricts = useCallback(async () => {
    setIsLoadingDistricts(true);
    setDistrictsError(null);
    
    try {
      const districtNumbers = Array.from({ length: 36 }, (_, i) => i + 1);
      const districtPromises = districtNumbers.map(async (districtNum) => {
        const url = `/assets/geojson/TX-${districtNum}/shape.geojson`;
        try {
          const response = await fetch(url);
          
          // Handle HTTP errors
          if (!response.ok) {
            console.warn(`Failed to fetch district TX-${districtNum}: HTTP ${response.status} ${response.statusText}`);
            return null;
          }
          
          // Parse JSON response
          let districtData;
          try {
            districtData = await response.json();
          } catch (parseError) {
            console.warn(`Failed to parse district TX-${districtNum} data: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
            return null;
          }
          
          // Validate data structure
          if (!districtData || !districtData.geometry || !districtData.geometry.coordinates) {
            console.warn(`Invalid district data for TX-${districtNum}: Missing geometry or coordinates`);
            return null;
          }
          
          // Create district feature
          const districtFeature: CongressionalDistrictFeature = {
            type: 'Feature' as const,
            properties: {
              district: `TX-${districtNum}`,
              name: `Texas ${districtNum}${getOrdinalSuffix(districtNum)} Congressional District`,
              representative: `Representative ${districtNum}`,
              districtNumber: districtNum,
              state: 'TX'
            },
            geometry: districtData.geometry
          };

          // Transform to CongressionalDistrict format
          const processedDistrict: CongressionalDistrict = {
            number: districtNum,
            representative: `Representative ${districtNum}`,
            population: 750000, // Placeholder - approximately equal districts
            center: calculateGeometryCenter(districtFeature.geometry),
            headStartPrograms: [], // Placeholder - would be populated with actual data
            geoJsonFeature: districtFeature
          };

          return { feature: districtFeature, district: processedDistrict };
        } catch (error) {
          console.warn(`Failed to fetch district TX-${districtNum}:`, error);
          return null;
        }
      });
      
      const districtResults = await Promise.all(districtPromises);
      const validResults = districtResults.filter((result): result is { feature: CongressionalDistrictFeature, district: CongressionalDistrict } => 
        result !== null && validateCongressionalDistrict(result.feature)
      );
      
      // Check if we have valid districts
      if (validResults.length === 0) {
        throw new Error('No valid congressional districts found in the data');
      }
      
      const validFeatures = validResults.map(result => result.feature);
      const validDistricts = validResults.map(result => result.district);
      
      setRawDistrictFeatures(validFeatures);
      setCongressionalDistricts(validDistricts);
      console.log(`Loaded ${validDistricts.length} congressional districts`);
      
      // Reset retry counter on success
      setDistrictsRetryCount(0);
    } catch (error) {
      console.error('Error loading congressional districts:', error);
      
      // Set specific error message based on error type
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setDistrictsError('Network error: Unable to load congressional districts data. Please check your internet connection.');
      } else if (error instanceof SyntaxError) {
        setDistrictsError('Data format error: The congressional districts data is not in a valid format.');
      } else {
        setDistrictsError(`Failed to load congressional districts data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Increment retry counter
      setDistrictsRetryCount(prev => prev + 1);
      
      // Retry loading if under max attempts
      if (districtsRetryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying congressional districts load (attempt ${districtsRetryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
        setTimeout(() => {
          loadCongressionalDistricts();
        }, 1000 * Math.pow(2, districtsRetryCount)); // Exponential backoff
      }
    } finally {
      setIsLoadingDistricts(false);
    }
  }, [districtsRetryCount]);

  /**
   * Load congressional representative data from Congress.gov API
   */
  const loadCongressionalData = useCallback(async () => {
    // Skip if no districts loaded yet or if API key is not available
    if (congressionalDistricts.length === 0) {
      return;
    }
    
    // Skip if already loaded
    if (congressDataLoadedRef.current) {
      return;
    }
    
    // Get API key from environment - use process.env in test environment, import.meta.env in browser
    const apiKey = getCongressApiKey();

    if (!apiKey) {
      console.log('Congress.gov API key not found - skipping enhanced congressional data');
      // Don't set an error, just skip the enhanced data
      return;
    }
    
    setIsLoadingCongressData(true);
    setCongressDataError(null);
    
    try {
      console.log('Loading congressional representative data from Congress.gov API...');
      
      // Construct API URL for the 118th Congress, filtering for Texas representatives
      const apiUrl = 'https://api.congress.gov/v3/member?api_key=' + apiKey + 
                     '&congress=118&chamber=House&state=TX&format=json&limit=50';
      
      const response = await fetch(apiUrl);
      
      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(`Failed to load congressional data: HTTP ${response.status} ${response.statusText}`);
      }
      
      // Parse JSON response
      let congressData: CongressApiResponse;
      try {
        congressData = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse congressional data: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
      }
      
      // Validate data structure - check for different possible response formats
      let members: CongressApiMember[] = [];
      
      if (congressData && congressData.results && Array.isArray(congressData.results)) {
        // Standard format with results array
        members = congressData.results;
      } else if (congressData && Array.isArray(congressData)) {
        // Direct array format
        members = congressData as unknown as CongressApiMember[];
      } else if (congressData && (congressData as any).members && Array.isArray((congressData as any).members)) {
        // Alternative format with members array
        members = (congressData as any).members;
      } else {
        // Log the actual response structure for debugging
        console.warn('Unexpected congressional data structure:', congressData);
        throw new Error('Invalid congressional data: No valid member data found in response');
      }
      
      console.log(`Received data for ${members.length} representatives`);
      
      // Update district data with representative information
      setCongressionalDistricts(prevDistricts => {
        const updatedDistricts = prevDistricts.map(district => {
          // Find matching representative by district number
          const representative = members.find(member => {
            // Extract district number from API response
            const districtNumber = parseInt(member.district, 10);
            return districtNumber === district.number;
          });
          
          if (representative) {
            return {
              ...district,
              representative: representative.name,
              party: representative.party,
              photoUrl: representative.depiction?.imageUrl,
              contact: {
                phone: representative.contactInformation?.phoneNumber,
                email: representative.contactInformation?.email,
                website: representative.contactInformation?.websiteUrl,
                office: representative.contactInformation?.officeAddress
              },
              committees: representative.terms?.[0]?.current?.committees?.map(committee => committee.name) || []
            };
          }
          
          return district;
        });
        
        return updatedDistricts;
      });
      
      console.log('Successfully updated congressional districts with representative data');
      
      // Mark as loaded to prevent future calls
      congressDataLoadedRef.current = true;
      
      // Reset retry counter on success
      setCongressDataRetryCount(0);
    } catch (error) {
      console.error('Error loading congressional data:', error);
      
      // Set specific error message based on error type
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setCongressDataError('Network error: Unable to load congressional data. Please check your internet connection.');
      } else if (error instanceof SyntaxError) {
        setCongressDataError('Data format error: The congressional data is not in a valid format.');
      } else {
        setCongressDataError(`Failed to load congressional data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Increment retry counter
      setCongressDataRetryCount(prev => prev + 1);
      
      // Retry loading if under max attempts
      if (congressDataRetryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying congressional data load (attempt ${congressDataRetryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
        setTimeout(() => {
          loadCongressionalData();
        }, 1000 * Math.pow(2, congressDataRetryCount)); // Exponential backoff
      }
    } finally {
      setIsLoadingCongressData(false);
    }
  }, [congressDataRetryCount]);

  /**
   * Get ordinal suffix for a number (e.g., 1st, 2nd, 3rd)
   */
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) {
      return 'st';
    }
    if (j === 2 && k !== 12) {
      return 'nd';
    }
    if (j === 3 && k !== 13) {
      return 'rd';
    }
    return 'th';
  };

  /**
   * Load all data when component mounts
   */
  useEffect(() => {
    loadHeadStartPrograms();
    loadCongressionalDistricts();
  }, [loadHeadStartPrograms, loadCongressionalDistricts]);

  /**
   * Load congressional data after districts are loaded
   */
  useEffect(() => {
    if (congressionalDistricts.length > 0 && !isLoadingDistricts && !congressDataLoadedRef.current) {
      loadCongressionalData();
    }
  }, [congressionalDistricts.length, isLoadingDistricts, loadCongressionalData]);

  /**
   * Get visible Head Start programs
   */
  const visibleHeadStartPrograms = layerVisibility.headStartPrograms ? headStartPrograms : [];

  /**
   * Get visible congressional districts
   */
  const visibleCongressionalDistricts = layerVisibility.congressionalDistricts ? congressionalDistricts : [];

  /**
   * Check if any data is currently loading
   */
  const isLoading = isLoadingPrograms || isLoadingDistricts || isLoadingCongressData;

  /**
   * Check if there are any errors
   */
  const hasErrors = !!programsError || !!districtsError || !!congressDataError;

  /**
   * Retry loading data after error
   */
  const retryLoading = useCallback(() => {
    if (programsError) {
      setProgramsRetryCount(0);
      loadHeadStartPrograms();
    }
    
    if (districtsError) {
      setDistrictsRetryCount(0);
      loadCongressionalDistricts();
    }
    
    if (congressDataError) {
      setCongressDataRetryCount(0);
      congressDataLoadedRef.current = false;
      loadCongressionalData();
    }
  }, [programsError, districtsError, congressDataError, loadHeadStartPrograms, loadCongressionalDistricts, loadCongressionalData]);

  return {
    // Layer visibility
    layerVisibility,
    toggleLayer,
    setLayerVisibilityState,
    
    // Data - using consistent naming
    programs: headStartPrograms,
    districts: congressionalDistricts,
    headStartPrograms,
    congressionalDistricts,
    rawDistrictFeatures,
    
    // Loading states
    isLoading,
    isLoadingPrograms,
    isLoadingDistricts,
    isLoadingCongressData,
    
    // Error states
    hasErrors,
    programsError,
    districtsError,
    congressDataError,
    
    // Retry functionality
    retryLoading,
    
    // Actions
    loadHeadStartPrograms,
    loadCongressionalDistricts,
    loadCongressionalData
  };
};