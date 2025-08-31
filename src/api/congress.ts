const cache: Record<string, unknown> = {};
export async function getBill(id: string) {
  if (cache[id]) return cache[id];
  const res = await fetch(`https://api.congress.gov/v3/bill/117/hr/3076?api_key=${import.meta.env.VITE_CONGRESS_API_KEY}`);
  const data = await res.json();
  cache[id] = data;
  return data;
}
