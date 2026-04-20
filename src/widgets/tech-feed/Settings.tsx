import { useState } from 'react';
import type { TechFeedConfig } from './View';

export function Settings({ config, onChange }: { config: TechFeedConfig; onChange: (c: TechFeedConfig) => void }) {
  const [type, setType] = useState<'hn' | 'reddit' | 'rss'>('reddit');
  const [value, setValue] = useState('');

  function add() {
    if (type !== 'hn' && !value.trim()) return;
    onChange({ sources: [...config.sources, { type, value: value.trim() }] });
    setValue('');
  }
  function remove(i: number) {
    onChange({ sources: config.sources.filter((_, idx) => idx !== i) });
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 6, marginBottom: 8 }}>
        <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}>
          <option value="hn">HN top</option>
          <option value="reddit">subreddit</option>
          <option value="rss">RSS url</option>
        </select>
        <input
          aria-label="source value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === 'hn' ? 'n/a' : type === 'reddit' ? 'programming' : 'https://...'}
          disabled={type === 'hn'}
          style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button onClick={add} style={{ color: 'var(--accent)' }}>Add</button>
      </div>
      {config.sources.map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 4, fontSize: 12 }}>
          <span>{s.type === 'hn' ? 'HN top' : s.type === 'reddit' ? `r/${s.value}` : s.value}</span>
          <button onClick={() => remove(i)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
    </div>
  );
}
