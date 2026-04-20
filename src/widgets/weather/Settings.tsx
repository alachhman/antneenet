import { useState } from 'react';
import type { WeatherConfig } from './View';

type GeoResult = { name: string; state?: string; country: string; lat: number; lon: number };

async function geocode(q: string): Promise<GeoResult[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?mode=geocode&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
  });
  if (!r.ok) return [];
  return r.json();
}

export function Settings({
  config,
  onChange,
}: {
  config: WeatherConfig;
  onChange: (c: WeatherConfig) => void;
}) {
  const [q, setQ] = useState(config.city);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function onSearch() {
    setSearching(true);
    setResults(await geocode(q));
    setSearching(false);
  }

  function pick(r: GeoResult) {
    onChange({
      city: [r.name, r.state, r.country].filter(Boolean).join(', '),
      lat: r.lat,
      lon: r.lon,
      units: config.units,
    });
    setResults([]);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          aria-label="city"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button onClick={onSearch} style={{ color: 'var(--accent)' }} disabled={searching}>
          Search
        </button>
      </div>
      {results.map((r, i) => (
        <button
          key={i}
          onClick={() => pick(r)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: 6, fontSize: 12 }}
        >
          {r.name}{r.state ? `, ${r.state}` : ''}, {r.country}
        </button>
      ))}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 12 }}>
          Units:
          <select
            value={config.units}
            onChange={(e) => onChange({ ...config, units: e.target.value as 'F' | 'C' })}
            style={{ marginLeft: 6, padding: 4, borderRadius: 6, boxShadow: 'var(--inset)' }}
          >
            <option value="F">°F</option>
            <option value="C">°C</option>
          </select>
        </label>
      </div>
    </div>
  );
}
