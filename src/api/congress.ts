const cache: Record<string, unknown> = {};

// Get API key from environment - handle both Vite and Jest environments
const getApiKey = (): string => {
  // Try process.env first (works in Jest)
  if (typeof process !== 'undefined' && process.env?.VITE_CONGRESS_API_KEY) {
    return process.env.VITE_CONGRESS_API_KEY;
  }
  
  // For Vite/browser environments, this would be configured differently
  return '';
};

export async function getBill(id: string) {
  if (cache[id]) return cache[id];
  const apiKey = getApiKey();
  const res = await fetch(`https://api.congress.gov/v3/bill/117/hr/3076?api_key=${apiKey}`);
  const data = await res.json();
  cache[id] = data;
  return data;
}

// Export for testing purposes
export function clearCache() {
  Object.keys(cache).forEach(key => delete cache[key]);
}
