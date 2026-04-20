import { useQuery } from '@tanstack/react-query';
import { Label, Inset } from '../../ui';

export type WeatherConfig = {
  city: string;
  lat: number;
  lon: number;
  units: 'F' | 'C';
};

async function fetchWeather(cfg: WeatherConfig) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?lat=${cfg.lat}&lon=${cfg.lon}&units=${cfg.units}`;
  const r = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
  });
  if (!r.ok) throw new Error('weather failed');
  return r.json();
}

export function View({ config }: { instanceId: string; config: WeatherConfig }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weather', config.lat, config.lon, config.units],
    queryFn: () => fetchWeather(config),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    enabled: Number.isFinite(config.lat) && Number.isFinite(config.lon),
  });
  return (
    <div>
      <Label>Weather · {config.city}</Label>
      {isLoading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading…</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--down)' }}>Error loading weather</div>}
      {data && (
        <>
          <div style={{ fontSize: 28, fontWeight: 300, margin: '4px 0' }}>
            {Math.round(data.main.temp)}°{config.units}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {data.weather?.[0]?.description} · {Math.round(data.wind?.speed ?? 0)}mph
          </div>
          <Inset style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span>H {Math.round(data.main.temp_max)}°</span>
            <span>L {Math.round(data.main.temp_min)}°</span>
            <span>{data.main.humidity}%☁</span>
          </Inset>
        </>
      )}
    </div>
  );
}
