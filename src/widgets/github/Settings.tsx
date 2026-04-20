import type { GithubConfig } from './View';

export function Settings({
  config,
  onChange,
}: {
  config: GithubConfig;
  onChange: (c: GithubConfig) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={{ fontSize: 12 }}>
        Owner
        <input
          aria-label="owner"
          value={config.owner}
          onChange={(e) => onChange({ ...config, owner: e.target.value })}
          style={{
            display: 'block',
            marginTop: 4,
            boxShadow: 'var(--inset)',
            padding: 6,
            borderRadius: 6,
            width: '100%',
          }}
        />
      </label>
      <label style={{ fontSize: 12 }}>
        Repo
        <input
          aria-label="repo"
          value={config.repo}
          onChange={(e) => onChange({ ...config, repo: e.target.value })}
          style={{
            display: 'block',
            marginTop: 4,
            boxShadow: 'var(--inset)',
            padding: 6,
            borderRadius: 6,
            width: '100%',
          }}
        />
      </label>
      <label style={{ fontSize: 12 }}>
        Project number
        <input
          aria-label="project number"
          type="number"
          min={0}
          value={config.projectNumber}
          onChange={(e) =>
            onChange({ ...config, projectNumber: Number(e.target.value) || 0 })
          }
          style={{
            display: 'block',
            marginTop: 4,
            boxShadow: 'var(--inset)',
            padding: 6,
            borderRadius: 6,
            width: '100%',
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          From the project URL: github.com/users/&lt;owner&gt;/projects/&lt;number&gt;
        </span>
      </label>
    </div>
  );
}
