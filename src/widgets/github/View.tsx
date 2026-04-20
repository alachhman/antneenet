import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label, ScrollableArea } from '../../ui';

export type GithubConfig = {
  owner: string;
  repo: string;
  projectNumber: number;
};

type Author = { name?: string; login: string | null; avatarUrl: string | null };
type PRAuthor = { login: string; avatarUrl: string } | null;
type GhLabel = { name: string; color: string };

type Commit = {
  sha: string;
  message: string;
  body: string;
  url: string;
  date: string;
  author: Author;
  additions: number;
  deletions: number;
  changedFiles: number;
};

type PR = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  state: string;
  baseRefName: string | null;
  headRefName: string | null;
  additions: number;
  deletions: number;
  updatedAt: string;
  reviewDecision: string | null;
  author: PRAuthor;
  labels: GhLabel[];
  commentsCount: number;
};

type Issue = {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  author: PRAuthor;
  labels: GhLabel[];
  commentsCount: number;
  assignees: Array<{ login: string; avatarUrl: string }>;
};

type ProjectItem = {
  kind: 'issue' | 'pr' | 'draft';
  title: string;
  url: string | null;
  number: number | null;
  state: string | null;
  isDraft: boolean;
  author: { login: string; avatarUrl: string } | null;
  labels: GhLabel[];
};

type Stats = {
  owner: string;
  repo: string;
  commits: { total: number; items: Commit[] };
  openPRs: { total: number; items: PR[] };
  openIssues: { total: number; items: Issue[] };
  project: {
    title: string;
    url: string;
    columns: Array<{ name: string; total: number; items: ProjectItem[] }>;
  } | null;
};

type Tab = 'commits' | 'prs' | 'issues';

// ------------------------------------------------------------------
// Data fetching
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Utilities
// ------------------------------------------------------------------

function ago(iso: string): string {
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Pick black or white text for a given hex background, based on luminance.
function contrastText(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#000';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#1e293b' : '#fff';
}

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

// ------------------------------------------------------------------
// Shared building blocks
// ------------------------------------------------------------------

function Avatar({ src, alt, size = 18 }: { src: string | null; alt: string; size?: number }) {
  if (!src) {
    return (
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--shadow-dark)',
          verticalAlign: 'middle',
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        verticalAlign: 'middle',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
      }}
    />
  );
}

function LabelPill({ label }: { label: GhLabel }) {
  const hex = `#${label.color || '94a3b8'}`;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        background: hex,
        color: contrastText(hex),
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.1px',
        marginRight: 5,
        marginBottom: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {label.name}
    </span>
  );
}

function DiffBadge({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
      <span style={{ color: 'var(--up)' }}>+{additions}</span>
      <span style={{ color: 'var(--text-dim)', margin: '0 2px' }}>/</span>
      <span style={{ color: 'var(--down)' }}>−{deletions}</span>
    </span>
  );
}

function StatTab({
  label,
  value,
  active,
  onClick,
  clickable,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick?: () => void;
  clickable: boolean;
}) {
  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      style={{
        boxShadow: active ? 'var(--inset)' : 'var(--raised-sm)',
        borderRadius: 10,
        padding: '12px 14px',
        textAlign: 'center',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: active ? 'var(--accent)' : 'var(--text)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </button>
  );
}

// ------------------------------------------------------------------
// Rich cards
// ------------------------------------------------------------------

const cardLinkStyle: React.CSSProperties = {
  display: 'block',
  boxShadow: 'var(--raised-sm)',
  borderRadius: 'var(--radius-inset)',
  padding: '14px 16px',
  color: 'var(--text)',
  transition: 'box-shadow 0.15s ease',
};

function CommitCard({ commit }: { commit: Commit }) {
  return (
    <a href={commit.url} target="_blank" rel="noreferrer" style={cardLinkStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--accent)',
            background: 'rgba(20, 184, 166, 0.14)',
            padding: '2px 7px',
            borderRadius: 5,
            flexShrink: 0,
          }}
        >
          {commit.sha}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}
        >
          {commit.message}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          rowGap: 6,
          fontSize: 11,
          color: 'var(--text-dim)',
          flexWrap: 'wrap',
        }}
      >
        <Avatar src={commit.author.avatarUrl} alt={commit.author.name ?? 'author'} size={18} />
        <span>{commit.author.login ?? commit.author.name}</span>
        <span>·</span>
        <span>{ago(commit.date)}</span>
        <span>·</span>
        <DiffBadge additions={commit.additions} deletions={commit.deletions} />
        {commit.changedFiles > 0 && (
          <>
            <span>·</span>
            <span>
              {commit.changedFiles} file{commit.changedFiles === 1 ? '' : 's'}
            </span>
          </>
        )}
      </div>
    </a>
  );
}

function PRCard({ pr }: { pr: PR }) {
  return (
    <a href={pr.url} target="_blank" rel="noreferrer" style={cardLinkStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        {pr.isDraft && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              background: 'var(--shadow-dark)',
              color: 'var(--text-dim)',
              padding: '2px 7px',
              borderRadius: 10,
              flexShrink: 0,
            }}
          >
            DRAFT
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>#{pr.number}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pr.title}
        </span>
      </div>
      {pr.labels.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {pr.labels.map((l) => (
            <LabelPill key={l.name} label={l} />
          ))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          rowGap: 6,
          fontSize: 11,
          color: 'var(--text-dim)',
          flexWrap: 'wrap',
        }}
      >
        <Avatar src={pr.author?.avatarUrl ?? null} alt={pr.author?.login ?? 'author'} size={18} />
        <span>{pr.author?.login ?? 'ghost'}</span>
        <span>·</span>
        <span>{ago(pr.updatedAt)}</span>
        <span>·</span>
        <DiffBadge additions={pr.additions} deletions={pr.deletions} />
        {pr.commentsCount > 0 && (
          <>
            <span>·</span>
            <span>💬 {pr.commentsCount}</span>
          </>
        )}
      </div>
      {(pr.baseRefName || pr.headRefName) && (
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{pr.headRefName}</span>
          <span style={{ margin: '0 6px' }}>→</span>
          <span>{pr.baseRefName}</span>
        </div>
      )}
    </a>
  );
}

function ProjectItemCard({ item }: { item: ProjectItem }) {
  const kindBadgeBg =
    item.kind === 'pr'
      ? 'rgba(139, 92, 246, 0.18)' // violet
      : item.kind === 'issue'
      ? 'rgba(20, 184, 166, 0.18)' // teal
      : 'rgba(100, 116, 139, 0.18)'; // slate
  const kindBadgeFg =
    item.kind === 'pr'
      ? '#7c3aed'
      : item.kind === 'issue'
      ? '#0d9488'
      : 'var(--text-dim)';
  const kindLabel = item.kind === 'pr' ? 'PR' : item.kind === 'issue' ? 'Issue' : 'Draft';

  const inner = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: item.labels.length > 0 ? 6 : 0,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            background: kindBadgeBg,
            color: kindBadgeFg,
            padding: '1px 6px',
            borderRadius: 4,
            flexShrink: 0,
            letterSpacing: '0.2px',
          }}
        >
          {kindLabel}
        </span>
        {item.isDraft && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              background: 'var(--shadow-dark)',
              color: 'var(--text-dim)',
              padding: '1px 6px',
              borderRadius: 4,
              flexShrink: 0,
            }}
          >
            DRAFT
          </span>
        )}
        {item.number !== null && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>
            #{item.number}
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </span>
      </div>
      {item.labels.length > 0 && (
        <div style={{ marginBottom: item.author ? 6 : 0 }}>
          {item.labels.map((l) => (
            <LabelPill key={l.name} label={l} />
          ))}
        </div>
      )}
      {item.author && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            color: 'var(--text-dim)',
          }}
        >
          <Avatar src={item.author.avatarUrl} alt={item.author.login} size={14} />
          <span>{item.author.login}</span>
        </div>
      )}
    </>
  );

  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noreferrer" style={cardLinkStyle}>
        {inner}
      </a>
    );
  }
  return <div style={cardLinkStyle}>{inner}</div>;
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <a href={issue.url} target="_blank" rel="noreferrer" style={cardLinkStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>#{issue.number}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {issue.title}
        </span>
      </div>
      {issue.labels.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {issue.labels.map((l) => (
            <LabelPill key={l.name} label={l} />
          ))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          rowGap: 6,
          fontSize: 11,
          color: 'var(--text-dim)',
          flexWrap: 'wrap',
        }}
      >
        <Avatar src={issue.author?.avatarUrl ?? null} alt={issue.author?.login ?? 'author'} size={18} />
        <span>{issue.author?.login ?? 'ghost'}</span>
        <span>·</span>
        <span>{ago(issue.updatedAt)}</span>
        {issue.commentsCount > 0 && (
          <>
            <span>·</span>
            <span>💬 {issue.commentsCount}</span>
          </>
        )}
        {issue.assignees.length > 0 && (
          <>
            <span>·</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {issue.assignees.map((a) => (
                <Avatar key={a.login} src={a.avatarUrl} alt={a.login} size={16} />
              ))}
            </div>
          </>
        )}
      </div>
    </a>
  );
}

// ------------------------------------------------------------------
// Kanban bits (reused from the previous view, unchanged logic)
// ------------------------------------------------------------------

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
    <div
      className="no-scrollbar"
      style={{
        display: 'flex',
        gap: 6,
        // Horizontal scroll instead of wrapping so the pill row never
        // becomes 3 stacked rows on mobile. Hide the scrollbar for a
        // cleaner look; users can flick or trackpad-scroll.
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: 2,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {columns.map((col) => {
        const isExpanded = expanded === col.name;
        return (
          <button
            key={col.name}
            onClick={() => onToggle(col.name)}
            style={{
              boxShadow: isExpanded ? 'var(--inset)' : 'var(--raised-sm)',
              padding: '5px 14px',
              borderRadius: 8,
              fontSize: 11,
              color: isExpanded ? 'var(--accent)' : 'var(--text)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
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
  isDesktop,
}: {
  project: NonNullable<Stats['project']>;
  expanded: string | null;
  isDesktop: boolean;
}) {
  if (!expanded) return null;
  const col = project.columns.find((c) => c.name === expanded);
  if (!col) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <CardGrid isDesktop={isDesktop}>
        {col.items.map((item, idx) => (
          <ProjectItemCard key={idx} item={item} />
        ))}
      </CardGrid>
      {col.total > col.items.length && (
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--accent)', fontSize: 10, display: 'block', textAlign: 'center', padding: '4px 0' }}
        >
          +{col.total - col.items.length} more on GitHub →
        </a>
      )}
    </div>
  );
}

// Responsive tile grid. Desktop lays cards out in auto-fill columns
// (≥260px each), mobile stacks them in a single column.
function CardGrid({
  children,
  isDesktop,
}: {
  children: React.ReactNode;
  isDesktop: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr',
        gap: 12,
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------------
// Main view
// ------------------------------------------------------------------

export function View({ config }: { instanceId: string; config: GithubConfig }) {
  const isDesktop = useIsDesktop();
  const [tab, setTab] = useState<Tab>('prs');
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
      <div style={{ fontSize: 11 }}>
        {header}
        <div style={{ color: 'var(--text-dim)' }}>Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ fontSize: 11 }}>
        {header}
        <div style={{ color: 'var(--down)' }}>
          {error instanceof Error ? error.message : 'error loading'}
        </div>
      </div>
    );
  }
  if (!data) return null;

  const projectTotal =
    data.project?.columns.reduce((sum, c) => sum + c.total, 0) ?? 0;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        fontSize: 11,
      }}
    >
      {header}

      {/* Stats + project tile — 3 of 4 double as the active-tab selector.
          Always 4 columns so all stats are visible at a glance, even on
          phones (tiles just get narrower). */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatTab
          label="commits this week"
          value={data.commits.total}
          active={tab === 'commits'}
          onClick={() => setTab('commits')}
          clickable
        />
        <StatTab
          label="open PRs"
          value={data.openPRs.total}
          active={tab === 'prs'}
          onClick={() => setTab('prs')}
          clickable
        />
        <StatTab
          label="open issues"
          value={data.openIssues.total}
          active={tab === 'issues'}
          onClick={() => setTab('issues')}
          clickable
        />
        <StatTab
          label={data.project?.title ?? 'project'}
          value={projectTotal}
          active={false}
          clickable={false}
        />
      </div>

      {/* Kanban pills stay fixed at top; the expanded cards live inside
          the scroll area below so they scroll with the rest of the content. */}
      {data.project && (
        <div style={{ marginBottom: 14 }}>
          <KanbanPills
            columns={data.project.columns}
            expanded={expandedColumn}
            onToggle={(name) => setExpandedColumn(expandedColumn === name ? null : name)}
          />
        </div>
      )}

      {/* Active tab content — rich cards, tiled on desktop.
          Expanded kanban column (if any) scrolls alongside. */}
      <ScrollableArea>
        {data.project && expandedColumn && (
          <div style={{ marginBottom: 16 }}>
            <KanbanExpanded
              project={data.project}
              expanded={expandedColumn}
              isDesktop={isDesktop}
            />
          </div>
        )}
        {tab === 'commits' && (
          <>
            <CardGrid isDesktop={isDesktop}>
              {data.commits.items.map((c) => (
                <CommitCard key={c.sha} commit={c} />
              ))}
            </CardGrid>
            {data.commits.total > data.commits.items.length && (
              <MoreLink
                owner={config.owner}
                repo={config.repo}
                path="commits"
                extra={data.commits.total - data.commits.items.length}
              />
            )}
          </>
        )}
        {tab === 'prs' && (
          <>
            {data.openPRs.items.length === 0 ? (
              <EmptyState>No open pull requests.</EmptyState>
            ) : (
              <CardGrid isDesktop={isDesktop}>
                {data.openPRs.items.map((p) => (
                  <PRCard key={p.number} pr={p} />
                ))}
              </CardGrid>
            )}
            {data.openPRs.total > data.openPRs.items.length && (
              <MoreLink
                owner={config.owner}
                repo={config.repo}
                path="pulls"
                extra={data.openPRs.total - data.openPRs.items.length}
              />
            )}
          </>
        )}
        {tab === 'issues' && (
          <>
            {data.openIssues.items.length === 0 ? (
              <EmptyState>No open issues.</EmptyState>
            ) : (
              <CardGrid isDesktop={isDesktop}>
                {data.openIssues.items.map((i) => (
                  <IssueCard key={i.number} issue={i} />
                ))}
              </CardGrid>
            )}
            {data.openIssues.total > data.openIssues.items.length && (
              <MoreLink
                owner={config.owner}
                repo={config.repo}
                path="issues"
                extra={data.openIssues.total - data.openIssues.items.length}
              />
            )}
          </>
        )}
      </ScrollableArea>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--text-dim)',
        padding: '20px 0',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

function MoreLink({
  owner,
  repo,
  path,
  extra,
}: {
  owner: string;
  repo: string;
  path: string;
  extra: number;
}) {
  return (
    <a
      href={`https://github.com/${owner}/${repo}/${path}`}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        color: 'var(--accent)',
        fontSize: 10,
        textAlign: 'center',
        padding: '6px 0',
      }}
    >
      + {extra} more on GitHub →
    </a>
  );
}
