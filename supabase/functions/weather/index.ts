// Proxy to OpenWeatherMap. Needs OPENWEATHER_API_KEY secret.
//
// Default response combines:
//   • current conditions (from /weather — observed "now")
//   • next ~24h hourly forecast (first 8 entries of /forecast, 3h each)
//   • 5-day daily summary (grouped from /forecast)
//
// mode=geocode is untouched — still used by Settings to search cities.
const API_CURRENT = 'https://api.openweathermap.org/data/2.5/weather';
const API_FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';
const API_GEO = 'https://api.openweathermap.org/geo/1.0/direct';
const KEY = Deno.env.get('OPENWEATHER_API_KEY')!;

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS',
    'content-type': 'application/json',
  };
}

type CurrentOut = {
  city: string;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  description: string;
  icon: string;
};

type HourlyOut = {
  ts: number; // seconds since epoch (from OWM's dt)
  temp: number;
  icon: string;
  pop: number; // probability of precipitation 0-1
};

type DailyOut = {
  date: string; // YYYY-MM-DD (local to response timezone offset)
  high: number;
  low: number;
  icon: string;
  pop: number;
};

function normalizeCurrent(j: any): CurrentOut {
  return {
    city: j.name ?? '',
    temp: j.main?.temp ?? 0,
    feelsLike: j.main?.feels_like ?? 0,
    tempMin: j.main?.temp_min ?? 0,
    tempMax: j.main?.temp_max ?? 0,
    humidity: j.main?.humidity ?? 0,
    windSpeed: j.wind?.speed ?? 0,
    windDeg: j.wind?.deg ?? 0,
    description: j.weather?.[0]?.description ?? '',
    icon: j.weather?.[0]?.icon ?? '',
  };
}

function normalizeHourly(forecast: any): HourlyOut[] {
  const list: any[] = forecast?.list ?? [];
  const nowSec = Math.floor(Date.now() / 1000);
  return list
    .filter((e) => (e.dt ?? 0) >= nowSec - 60 * 60) // keep past hour + future
    .slice(0, 8)
    .map((e) => ({
      ts: e.dt ?? 0,
      temp: e.main?.temp ?? 0,
      icon: e.weather?.[0]?.icon ?? '',
      pop: e.pop ?? 0,
    }));
}

function normalizeDaily(forecast: any): DailyOut[] {
  const list: any[] = forecast?.list ?? [];
  const tzOffset: number = forecast?.city?.timezone ?? 0; // seconds
  const byDate: Record<string, any[]> = {};
  for (const e of list) {
    const localDate = new Date(((e.dt ?? 0) + tzOffset) * 1000)
      .toISOString()
      .slice(0, 10);
    (byDate[localDate] ??= []).push(e);
  }
  const days = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5);
  return days.map(([date, entries]) => {
    const temps = entries.map((e) => e.main?.temp ?? 0);
    const lows = entries.map((e) => e.main?.temp_min ?? e.main?.temp ?? 0);
    const highs = entries.map((e) => e.main?.temp_max ?? e.main?.temp ?? 0);
    const maxPop = entries.reduce(
      (acc, e) => Math.max(acc, e.pop ?? 0),
      0,
    );
    // Pick the icon closest to midday local time; fall back to first entry's icon.
    const midday = entries.reduce((best, e) => {
      const localHour = new Date(((e.dt ?? 0) + tzOffset) * 1000).getUTCHours();
      const bestHour = new Date(((best.dt ?? 0) + tzOffset) * 1000).getUTCHours();
      return Math.abs(localHour - 12) < Math.abs(bestHour - 12) ? e : best;
    }, entries[0]);
    return {
      date,
      high: Math.max(...highs, ...temps),
      low: Math.min(...lows, ...temps),
      icon: midday?.weather?.[0]?.icon ?? entries[0]?.weather?.[0]?.icon ?? '',
      pop: maxPop,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'rich';

  if (mode === 'geocode') {
    const q = url.searchParams.get('q') ?? '';
    const r = await fetch(`${API_GEO}?q=${encodeURIComponent(q)}&limit=5&appid=${KEY}`);
    return new Response(await r.text(), { status: r.status, headers: cors() });
  }

  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const units = url.searchParams.get('units') === 'C' ? 'metric' : 'imperial';
  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: 'lat/lon required' }), {
      status: 400,
      headers: cors(),
    });
  }

  const q = `lat=${lat}&lon=${lon}&units=${units}&appid=${KEY}`;
  const [currR, fcstR] = await Promise.all([
    fetch(`${API_CURRENT}?${q}`),
    fetch(`${API_FORECAST}?${q}`),
  ]);

  if (!currR.ok) {
    return new Response(await currR.text(), { status: currR.status, headers: cors() });
  }
  if (!fcstR.ok) {
    return new Response(await fcstR.text(), { status: fcstR.status, headers: cors() });
  }

  const currJ = await currR.json();
  const fcstJ = await fcstR.json();

  return new Response(
    JSON.stringify({
      current: normalizeCurrent(currJ),
      hourly: normalizeHourly(fcstJ),
      daily: normalizeDaily(fcstJ),
    }),
    { headers: cors() },
  );
});
