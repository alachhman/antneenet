import { useState } from 'react';
import type { TechFeedConfig } from './View';

type FeedSource = { type: 'hn' | 'reddit' | 'rss'; value: string };
type FeedCategory = { name: string; sources: FeedSource[] };

function normalize(config: TechFeedConfig): FeedCategory[] {
  if ('categories' in config && Array.isArray(config.categories)) {
    return config.categories;
  }
  if ('sources' in config && Array.isArray(config.sources)) {
    return [{ name: 'News', sources: config.sources }];
  }
  return [];
}

function describeSource(s: FeedSource): string {
  if (s.type === 'hn') return 'HN top';
  if (s.type === 'reddit') return `r/${s.value}`;
  return s.value;
}

export function Settings({
  config,
  onChange,
}: {
  config: TechFeedConfig;
  onChange: (c: TechFeedConfig) => void;
}) {
  const categories = normalize(config);

  function updateCategory(idx: number, next: FeedCategory) {
    const nextCats = categories.map((c, i) => (i === idx ? next : c));
    onChange({ categories: nextCats });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {categories.map((cat, idx) => (
        <CategoryEditor
          key={idx}
          category={cat}
          onChange={(next) => updateCategory(idx, next)}
        />
      ))}
    </div>
  );
}

function CategoryEditor({
  category,
  onChange,
}: {
  category: FeedCategory;
  onChange: (c: FeedCategory) => void;
}) {
  const [type, setType] = useState<'hn' | 'reddit' | 'rss'>('rss');
  const [value, setValue] = useState('');

  function add() {
    if (type !== 'hn' && !value.trim()) return;
    onChange({ ...category, sources: [...category.sources, { type, value: value.trim() }] });
    setValue('');
  }
  function remove(i: number) {
    onChange({ ...category, sources: category.sources.filter((_, idx) => idx !== i) });
  }

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {category.name}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 6,
          marginBottom: 8,
        }}
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'hn' | 'reddit' | 'rss')}
          style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        >
          <option value="hn">HN top</option>
          <option value="reddit">subreddit</option>
          <option value="rss">RSS url</option>
        </select>
        <input
          aria-label={`${category.name} source value`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === 'hn' ? 'n/a' : type === 'reddit' ? 'programming' : 'https://...'}
          disabled={type === 'hn'}
          style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button onClick={add} style={{ color: 'var(--accent)' }}>
          Add
        </button>
      </div>
      {category.sources.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: 4,
            fontSize: 12,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {describeSource(s)}
          </span>
          <button
            onClick={() => remove(i)}
            style={{ color: 'var(--down)', flexShrink: 0, marginLeft: 8 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
