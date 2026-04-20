// Proxy to OpenWeatherMap. Needs OPENWEATHER_API_KEY secret.
const API = 'https://api.openweathermap.org/data/2.5/weather';
const GEO = 'https://api.openweathermap.org/geo/1.0/direct';
const KEY = Deno.env.get('OPENWEATHER_API_KEY')!;

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS',
    'content-type': 'application/json',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'current';

  if (mode === 'geocode') {
    const q = url.searchParams.get('q') ?? '';
    const r = await fetch(`${GEO}?q=${encodeURIComponent(q)}&limit=5&appid=${KEY}`);
    return new Response(await r.text(), { status: r.status, headers: cors() });
  }

  // current weather
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const units = url.searchParams.get('units') === 'C' ? 'metric' : 'imperial';
  if (!lat || !lon) return new Response(JSON.stringify({ error: 'lat/lon required' }), { status: 400, headers: cors() });
  const r = await fetch(`${API}?lat=${lat}&lon=${lon}&units=${units}&appid=${KEY}`);
  return new Response(await r.text(), { status: r.status, headers: cors() });
});
