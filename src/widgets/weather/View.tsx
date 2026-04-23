import { useQuery } from '@tanstack/react-query';
import { Label, Inset } from '../../ui';

export type WeatherConfig = {
  city: string;
  lat: number;
  lon: number;
  units: 'F' | 'C';
};

type Current = {
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

type Hourly = { ts: number; temp: number; icon: string; pop: number };
type Daily = { date: string; high: number; low: number; icon: string; pop: number };

type Rich = { current: Current; hourly: Hourly[]; daily: Daily[] };

async function fetchWeather(cfg: WeatherConfig): Promise<Rich> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?lat=${cfg.lat}&lon=${cfg.lon}&units=${cfg.units}`;
  const r = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
  });
  if (!r.ok) throw new Error('weather failed');
  return r.json();
}

// ------------------------------------------------------------------
// Icon mapping — OWM's 2-char code → emoji. We keep a single map for
// day/night variants and a small override table for "n" icons where
// the night-time glyph actually differs (clear, few-clouds).
// Reference: https://openweathermap.org/weather-conditions
// ------------------------------------------------------------------

const BASE_ICONS: Record<string, string> = {
  '01': '☀️',
  '02': '🌤',
  '03': '⛅',
  '04': '☁️',
  '09': '🌧',
  '10': '🌦',
  '11': '⛈',
  '13': '🌨',
  '50': '🌫',
};

const NIGHT_OVERRIDES: Record<string, string> = {
  '01': '🌙',
  '02': '☁️',
};

function iconFor(code: string): string {
  const two = code?.slice(0, 2) ?? '';
  const isNight = code?.endsWith('n');
  if (isNight && NIGHT_OVERRIDES[two]) return NIGHT_OVERRIDES[two];
  return BASE_ICONS[two] ?? '❓';
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function formatTemp(t: number): string {
  return `${Math.round(t)}°`;
}

function hourLabel(ts: number): string {
  const d = new Date(ts * 1000);
  let h = d.getHours();
  const suffix = h >= 12 ? 'p' : 'a';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}${suffix}`;
}

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Today';
  // Parse as local to avoid timezone shifts.
  const [y, m, d] = date.split('-').map((s) => parseInt(s, 10));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'short' });
}

// ------------------------------------------------------------------
// View
// ------------------------------------------------------------------

export function View({ config }: { instanceId: string; config: WeatherConfig }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weather-rich', config.lat, config.lon, config.units],
    queryFn: () => fetchWeather(config),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    enabled: Number.isFinite(config.lat) && Number.isFinite(config.lon),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Label>Weather · {config.city}</Label>

      {isLoading && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--down)' }}>Error loading weather</div>
      )}

      {data && (
        <>
          <CurrentBlock current={data.current} units={config.units} />
          {data.hourly.length > 0 && <HourlyStrip hourly={data.hourly} />}
          {data.daily.length > 0 && <DailyList daily={data.daily} />}
        </>
      )}
    </div>
  );
}

function CurrentBlock({ current, units }: { current: Current; units: 'F' | 'C' }) {
  const u = units;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>
        {iconFor(current.icon)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.1 }}>
          {formatTemp(current.temp)}
          {u}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-dim)',
            textTransform: 'capitalize',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {current.description}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-dim)',
            marginTop: 2,
          }}
        >
          feels {formatTemp(current.feelsLike)}
          {u} · {Math.round(current.windSpeed)} mph · {current.humidity}%☁
        </div>
      </div>
    </div>
  );
}

function HourlyStrip({ hourly }: { hourly: Hourly[] }) {
  return (
    <Inset style={{ padding: '10px 4px' }}>
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {hourly.map((h, i) => (
          <div
            key={h.ts}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0,
              minWidth: 46,
              padding: '2px 4px',
              gap: 2,
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {i === 0 ? 'Now' : hourLabel(h.ts)}
            </div>
            <div style={{ fontSize: 18 }} aria-hidden>
              {iconFor(h.icon)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{formatTemp(h.temp)}</div>
            {h.pop >= 0.1 && (
              <div style={{ fontSize: 9, color: 'var(--accent)' }}>
                {Math.round(h.pop * 100)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </Inset>
  );
}

function DailyList({ daily }: { daily: Daily[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {daily.map((d, i) => (
        <div
          key={d.date}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
            alignItems: 'center',
            gap: 10,
            padding: '6px 2px',
            fontSize: 12,
            borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: i === 0 ? 'var(--text)' : 'var(--text-dim)',
              fontWeight: i === 0 ? 600 : 400,
            }}
          >
            {dayLabel(d.date, i)}
          </span>
          <span style={{ fontSize: 16 }} aria-hidden>
            {iconFor(d.icon)}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)' }}>
            <span style={{ color: 'var(--text)' }}>{formatTemp(d.high)}</span>
            {' · '}
            {formatTemp(d.low)}
          </span>
        </div>
      ))}
    </div>
  );
}
