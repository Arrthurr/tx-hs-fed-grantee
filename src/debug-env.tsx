import React, { useEffect, useState } from 'react';

const DebugEnv: React.FC = () => {
  const [checkResults, setCheckResults] = useState<string[]>([]);
  const [googleMapsStatus, setGoogleMapsStatus] = useState<string>('Checking...');

  useEffect(() => {
    const results: string[] = [];
    
    // Check environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
    const congressKey = import.meta.env.VITE_CONGRESS_API_KEY;
    
    results.push(`✅ NODE_ENV: ${import.meta.env.MODE}`);
    results.push(`${apiKey ? '✅' : '❌'} VITE_GOOGLE_MAPS_API_KEY: ${apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT FOUND'}`);
    results.push(`${mapId ? '✅' : '❌'} VITE_GOOGLE_MAPS_MAP_ID: ${mapId || 'NOT FOUND'}`);
    results.push(`${congressKey ? '✅' : '❌'} VITE_CONGRESS_API_KEY: ${congressKey ? `${congressKey.substring(0, 10)}...` : 'NOT FOUND'}`);
    
    setCheckResults(results);
    
    // Check if Google Maps is available
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setGoogleMapsStatus('✅ Google Maps object detected');
        
        // Check specific constructors
        const constructors = [];
        if (typeof window.google.maps.Map === 'function') {
          constructors.push('✅ Map constructor');
        } else {
          constructors.push('❌ Map constructor');
        }
        
        if (typeof window.google.maps.Marker === 'function') {
          constructors.push('✅ Marker constructor');
        } else {
          constructors.push('❌ Marker constructor');
        }
        
        if (typeof window.google.maps.InfoWindow === 'function') {
          constructors.push('✅ InfoWindow constructor');
        } else {
          constructors.push('❌ InfoWindow constructor');
        }
        
        setCheckResults(prev => [...prev, ...constructors]);
      } else {
        setGoogleMapsStatus('❌ Google Maps not loaded');
        setTimeout(checkGoogleMaps, 1000); // Retry after 1 second
      }
    };
    
    setTimeout(checkGoogleMaps, 100);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">🔍 Environment & API Debug</h1>
        
        <div className="space-y-2 font-mono text-sm">
          {checkResults.map((result, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded">
              {result}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <h2 className="font-semibold mb-2">Google Maps Status:</h2>
          <p className="font-mono text-sm">{googleMapsStatus}</p>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <h2 className="font-semibold mb-2">Quick Actions:</h2>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            🔄 Reload Page
          </button>
          <button 
            onClick={() => {
              console.log('Environment:', import.meta.env);
              console.log('Window:', window);
              alert('Check browser console for details');
            }} 
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            📋 Log to Console
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">If API Key is showing but Maps not loading:</h2>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Check browser console for specific error messages</li>
            <li>Verify API key has Maps JavaScript API enabled in Google Cloud Console</li>
            <li>Check if localhost:5173 is in allowed referrers (or no restrictions)</li>
            <li>Ensure billing is enabled on the Google Cloud project</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DebugEnv;
