import { useEffect, useState } from 'react';
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

// Desktop breakpoint matches react-grid-layout's md cutoff.
const DESKTOP_BP = 768;

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BP : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BP}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

const linkStyle: React.CSSProperties = {
  color: 'var(--text)',
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export function View({ config }: { instanceId: string; config: GithubConfig }) {
  const isDesktop = useIsDesktop();
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

  const header = (
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
  );

  if (isLoading) {
    return (
      <div style={{ overflowY: 'auto', height: '100%', fontSize: 11 }}>
        {header}
        <div style={{ color: 'var(--text-dim)' }}>Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ overflowY: 'auto', height: '100%', fontSize: 11 }}>
        {header}
        <div style={{ color: 'var(--down)' }}>
          {error instanceof Error ? error.message : 'error loading'}
        </div>
      </div>
    );
  }
  if (!data) return null;

  return isDesktop ? (
    <DesktopView config={config} data={data} header={header} />
  ) : (
    <MobileView config={config} data={data} header={header} />
  );
}

// ------------------------------------------------------------------
// Mobile view — vertical, compact. Same as the original layout.
// ------------------------------------------------------------------
function MobileView({
  config,
  data,
  header,
}: {
  config: GithubConfig;
  data: Stats;
  header: React.ReactNode;
}) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  return (
    <div style={{ overflowY: 'auto', height: '100%', fontSize: 11 }}>
      {header}

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

      {data.commits.items.length > 0 && (
        <Section title={`commits · ${data.commits.total}`}>
          <CommitsList items={data.commits.items} />
          {data.commits.total > data.commits.items.length && (
            <MoreLink owner={config.owner} repo={config.repo} path="commits" />
          )}
        </Section>
      )}

      {data.openPRs.items.length > 0 && (
        <Section title={`PRs · ${data.openPRs.total}`}>
          <NumberedList items={data.openPRs.items} />
          {data.openPRs.total > data.openPRs.items.length && (
            <MoreLink owner={config.owner} repo={config.repo} path="pulls" />
          )}
        </Section>
      )}

      {data.openIssues.items.length > 0 && (
        <Section title={`issues · ${data.openIssues.total}`}>
          <NumberedList items={data.openIssues.items} />
          {data.openIssues.total > data.openIssues.items.length && (
            <MoreLink owner={config.owner} repo={config.repo} path="issues" />
          )}
        </Section>
      )}

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
          <KanbanPills
            columns={data.project.columns}
            expanded={expandedColumn}
            onToggle={(name) => setExpandedColumn(expandedColumn === name ? null : name)}
          />
          <KanbanExpanded project={data.project} expanded={expandedColumn} />
        </Section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Desktop view — hero banner + two-column layout (layout C).
// ------------------------------------------------------------------
function DesktopView({
  config,
  data,
  header,
}: {
  config: GithubConfig;
  data: Stats;
  header: React.ReactNode;
}) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  const kanbanTotal =
    data.project?.columns.reduce((sum, c) => sum + c.total, 0) ?? 0;

  return (
    <div
      style={{
        height: '100%',
        fontSize: 11,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {header}

      {/* Hero banner: 4 stat tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Stat label="commits this week" value={data.commits.total} big />
        <Stat label="open PRs" value={data.openPRs.total} big />
        <Stat label="open issues" value={data.openIssues.total} big />
        <Stat label={data.project?.title ?? 'project'} value={kanbanTotal} big />
      </div>

      {/* Kanban column pills (always visible) */}
      {data.project && (
        <div style={{ marginBottom: 10 }}>
          <KanbanPills
            columns={data.project.columns}
            expanded={expandedColumn}
            onToggle={(name) => setExpandedColumn(expandedColumn === name ? null : name)}
          />
          <KanbanExpanded project={data.project} expanded={expandedColumn} />
        </div>
      )}

      {/* Two-column grid: commits left, PRs + Issues right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 14,
          minHeight: 0,
          flex: 1,
        }}
      >
        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {data.commits.items.length > 0 && (
            <Section title={`commits this week · ${data.commits.total}`}>
              <CommitsList items={data.commits.items} />
              {data.commits.total > data.commits.items.length && (
                <MoreLink owner={config.owner} repo={config.repo} path="commits" />
              )}
            </Section>
          )}
        </div>

        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          {data.openPRs.items.length > 0 && (
            <Section title={`open PRs · ${data.openPRs.total}`}>
              <NumberedList items={data.openPRs.items} />
              {data.openPRs.total > data.openPRs.items.length && (
                <MoreLink owner={config.owner} repo={config.repo} path="pulls" />
              )}
            </Section>
          )}

          {data.openIssues.items.length > 0 && (
            <Section title={`open issues · ${data.openIssues.total}`}>
              <NumberedList items={data.openIssues.items} />
              {data.openIssues.total > data.openIssues.items.length && (
                <MoreLink owner={config.owner} repo={config.repo} path="issues" />
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Shared building blocks
// ------------------------------------------------------------------

function Stat({ label, value, big = false }: { label: string; value: number; big?: boolean }) {
  return (
    <div
      style={{
        boxShadow: 'var(--inset)',
        borderRadius: 6,
        padding: big ? '10px 12px' : '4px 8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: big ? 22 : 16, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: big ? 10 : 9, color: 'var(--text-dim)' }}>{label}</div>
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

function CommitsList({ items }: { items: Stats['commits']['items'] }) {
  return (
    <>
      {items.map((c) => (
        <a key={c.sha} href={c.url} target="_blank" rel="noreferrer" style={linkStyle}>
          <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>{c.sha}</span>
          {c.message}
          <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>· {ago(c.date)}</span>
        </a>
      ))}
    </>
  );
}

function NumberedList({
  items,
}: {
  items: Array<{ number: number; title: string; url: string }>;
}) {
  return (
    <>
      {items.map((it) => (
        <a key={it.number} href={it.url} target="_blank" rel="noreferrer" style={linkStyle}>
          <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>#{it.number}</span>
          {it.title}
        </a>
      ))}
    </>
  );
}

function KanbanPills({
  columns,
  expanded,
  onToggle,
}: {
  columns: NonNullable<Stats['project']>['columns'];
  expanded: string | null;
  onToggle: (name: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
      {columns.map((col) => {
        const isExpanded = expanded === col.name;
        return (
          <button
            key={col.name}
            onClick={() => onToggle(col.name)}
            style={{
              boxShadow: isExpanded ? 'var(--inset)' : 'var(--raised-sm)',
              padding: '3px 10px',
              borderRadius: 6,
              fontSize: 10,
              color: isExpanded ? 'var(--accent)' : 'var(--text)',
            }}
          >
            {col.name} {col.total}
          </button>
        );
      })}
    </div>
  );
}

function KanbanExpanded({
  project,
  expanded,
}: {
  project: NonNullable<Stats['project']>;
  expanded: string | null;
}) {
  if (!expanded) return null;
  const col = project.columns.find((c) => c.name === expanded);
  if (!col) return null;
  return (
    <>
      {col.items.map((item, idx) => (
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
      {col.total > col.items.length && (
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--accent)', fontSize: 10 }}
        >
          +{col.total - col.items.length} more →
        </a>
      )}
    </>
  );
}
