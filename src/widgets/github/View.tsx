import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '../../ui';

export type GithubConfig = {
  owner: string;
  repo: string;
  projectNumber: number;
};

type Stats = {
  owner: string;
  repo: string;
  commits: { total: number; items: Array<{ sha: string; message: string; url: string; date: string }> };
  openPRs: { total: number; items: Array<{ number: number; title: string; url: string }> };
  openIssues: { total: number; items: Array<{ number: number; title: string; url: string }> };
  project: {
    title: string;
    url: string;
    columns: Array<{ name: string; total: number; items: Array<{ title: string; url: string | null }> }>;
  } | null;
};

async function fetchStats(cfg: GithubConfig): Promise<Stats> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-stats`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
    body: JSON.stringify(cfg),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error ?? `github-stats ${r.status}`);
  }
  return r.json();
}

function ago(iso: string) {
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const linkStyle: React.CSSProperties = {
  color: 'var(--text)',
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export function View({ config }: { instanceId: string; config: GithubConfig }) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['github-stats', config.owner, config.repo, config.projectNumber],
    queryFn: () => fetchStats(config),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: Boolean(config.owner && config.repo),
  });

  if (!config.owner || !config.repo) {
    return (
      <div>
        <Label>GitHub</Label>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Enter edit mode → gear icon to configure.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', fontSize: 11 }}>
      <Label>
        <a
          href={`https://github.com/${config.owner}/${config.repo}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          {config.owner}/{config.repo}
        </a>
      </Label>

      {isLoading && <div style={{ color: 'var(--text-dim)' }}>Loading…</div>}
      {error && (
        <div style={{ color: 'var(--down)', fontSize: 11 }}>
          {error instanceof Error ? error.message : 'error loading'}
        </div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 6,
              marginBottom: 10,
            }}
          >
            <Stat label="commits/wk" value={data.commits.total} />
            <Stat label="open PRs" value={data.openPRs.total} />
            <Stat label="open issues" value={data.openIssues.total} />
          </div>

          {/* Commits this week */}
          {data.commits.items.length > 0 && (
            <Section title={`commits · ${data.commits.total}`}>
              {data.commits.items.map((c) => (
                <a key={c.sha} href={c.url} target="_blank" rel="noreferrer" style={linkStyle}>
                  <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>{c.sha}</span>
                  {c.message}
                  <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>· {ago(c.date)}</span>
                </a>
              ))}
              {data.commits.total > data.commits.items.length && (
                <MoreLink owner={config.owner} repo={config.repo} path="commits" />
              )}
            </Section>
          )}

          {/* Open PRs */}
          {data.openPRs.items.length > 0 && (
            <Section title={`PRs · ${data.openPRs.total}`}>
              {data.openPRs.items.map((p) => (
                <a key={p.number} href={p.url} target="_blank" rel="noreferrer" style={linkStyle}>
                  <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>#{p.number}</span>
                  {p.title}
                </a>
              ))}
              {data.openPRs.total > data.openPRs.items.length && (
                <MoreLink owner={config.owner} repo={config.repo} path="pulls" />
              )}
            </Section>
          )}

          {/* Open issues */}
          {data.openIssues.items.length > 0 && (
            <Section title={`issues · ${data.openIssues.total}`}>
              {data.openIssues.items.map((i) => (
                <a key={i.number} href={i.url} target="_blank" rel="noreferrer" style={linkStyle}>
                  <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>#{i.number}</span>
                  {i.title}
                </a>
              ))}
              {data.openIssues.total > data.openIssues.items.length && (
                <MoreLink owner={config.owner} repo={config.repo} path="issues" />
              )}
            </Section>
          )}

          {/* Project board */}
          {data.project && (
            <Section
              title={
                <a
                  href={data.project.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'inherit' }}
                >
                  {data.project.title}
                </a>
              }
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {data.project.columns.map((col) => {
                  const expanded = expandedColumn === col.name;
                  return (
                    <button
                      key={col.name}
                      onClick={() => setExpandedColumn(expanded ? null : col.name)}
                      style={{
                        boxShadow: expanded ? 'var(--inset)' : 'var(--raised-sm)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        color: expanded ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      {col.name} {col.total}
                    </button>
                  );
                })}
              </div>
              {expandedColumn &&
                data.project.columns
                  .find((c) => c.name === expandedColumn)
                  ?.items.map((item, idx) => (
                    <div key={idx}>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" style={linkStyle}>
                          {item.title}
                        </a>
                      ) : (
                        <span style={{ ...linkStyle, color: 'var(--text-dim)' }}>{item.title}</span>
                      )}
                    </div>
                  ))}
              {expandedColumn &&
                (() => {
                  const col = data.project!.columns.find((c) => c.name === expandedColumn);
                  if (!col || col.total <= col.items.length) return null;
                  return (
                    <a
                      href={data.project!.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', fontSize: 10 }}
                    >
                      +{col.total - col.items.length} more →
                    </a>
                  );
                })()}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        boxShadow: 'var(--inset)',
        borderRadius: 6,
        padding: '4px 8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{label}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 9,
          color: 'var(--accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: 3,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function MoreLink({ owner, repo, path }: { owner: string; repo: string; path: string }) {
  return (
    <a
      href={`https://github.com/${owner}/${repo}/${path}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: 'var(--accent)', fontSize: 10 }}
    >
      + more →
    </a>
  );
}
