// GitHub stats proxy. Needs GITHUB_TOKEN secret (fine-grained PAT with repo access).
// Runs a single GraphQL query per request and returns normalized stats.

const TOKEN = Deno.env.get('GITHUB_TOKEN')!;
const GQL = 'https://api.github.com/graphql';

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json',
  };
}

type Body = { owner: string; repo: string; projectNumber: number };

const QUERY = `
query($owner: String!, $repo: String!, $projectNumber: Int!, $since: GitTimestamp!) {
  repository(owner: $owner, name: $repo) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(since: $since, first: 20) {
            totalCount
            nodes {
              oid
              messageHeadline
              messageBody
              committedDate
              url
              additions
              deletions
              changedFilesIfAvailable
              author {
                name
                avatarUrl(size: 48)
                user { login }
              }
            }
          }
        }
      }
    }
    pullRequests(states: OPEN, first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number
        title
        url
        isDraft
        state
        baseRefName
        headRefName
        additions
        deletions
        updatedAt
        reviewDecision
        author { login avatarUrl(size: 48) }
        labels(first: 5) { nodes { name color } }
        comments { totalCount }
      }
    }
    issues(states: OPEN, first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number
        title
        url
        updatedAt
        author { login avatarUrl(size: 48) }
        labels(first: 5) { nodes { name color } }
        comments { totalCount }
        assignees(first: 3) { nodes { login avatarUrl(size: 48) } }
      }
    }
  }
  user(login: $owner) {
    projectV2(number: $projectNumber) { ...projectFields }
  }
}

fragment projectFields on ProjectV2 {
  title
  url
  field(name: "Status") {
    ... on ProjectV2SingleSelectField {
      options { id name }
    }
  }
  items(first: 100) {
    nodes {
      content {
        __typename
        ... on Issue {
          title
          url
          number
          state
          author { login avatarUrl(size: 48) }
          labels(first: 5) { nodes { name color } }
        }
        ... on PullRequest {
          title
          url
          number
          state
          isDraft
          author { login avatarUrl(size: 48) }
          labels(first: 5) { nodes { name color } }
        }
        ... on DraftIssue {
          title
        }
      }
      fieldValueByName(name: "Status") {
        ... on ProjectV2ItemFieldSingleSelectValue {
          name
          optionId
        }
      }
    }
  }
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: cors() });
  }
  if (!TOKEN) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), { status: 500, headers: cors() });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: cors() });
  }
  if (!body.owner || !body.repo) {
    return new Response(JSON.stringify({ error: 'owner and repo required' }), { status: 400, headers: cors() });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const r = await fetch(GQL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'antneenet-dashboard',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        owner: body.owner,
        repo: body.repo,
        projectNumber: Number(body.projectNumber) || 0,
        since,
      },
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    return new Response(JSON.stringify({ error: `GitHub API ${r.status}`, detail: text }), {
      status: 502,
      headers: cors(),
    });
  }

  const j = await r.json();
  if (j.errors) {
    return new Response(JSON.stringify({ error: 'GraphQL errors', errors: j.errors }), {
      status: 502,
      headers: cors(),
    });
  }

  const repoData = j.data?.repository;
  if (!repoData) {
    return new Response(JSON.stringify({ error: 'repository not found or no access' }), {
      status: 404,
      headers: cors(),
    });
  }

  const history = repoData.defaultBranchRef?.target?.history ?? { totalCount: 0, nodes: [] };
  const commits = {
    total: history.totalCount,
    items: (history.nodes ?? []).slice(0, 10).map((n: any) => ({
      sha: n.oid?.slice(0, 7) ?? '',
      message: n.messageHeadline ?? '',
      body: n.messageBody ?? '',
      url: n.url,
      date: n.committedDate,
      author: {
        name: n.author?.name ?? n.author?.user?.login ?? 'unknown',
        login: n.author?.user?.login ?? null,
        avatarUrl: n.author?.avatarUrl ?? null,
      },
      additions: n.additions ?? 0,
      deletions: n.deletions ?? 0,
      changedFiles: n.changedFilesIfAvailable ?? 0,
    })),
  };

  const openPRs = {
    total: repoData.pullRequests?.totalCount ?? 0,
    items: (repoData.pullRequests?.nodes ?? []).slice(0, 10).map((n: any) => ({
      number: n.number,
      title: n.title ?? '',
      url: n.url,
      isDraft: !!n.isDraft,
      state: n.state ?? 'OPEN',
      baseRefName: n.baseRefName ?? null,
      headRefName: n.headRefName ?? null,
      additions: n.additions ?? 0,
      deletions: n.deletions ?? 0,
      updatedAt: n.updatedAt,
      reviewDecision: n.reviewDecision ?? null,
      author: n.author
        ? { login: n.author.login, avatarUrl: n.author.avatarUrl }
        : null,
      labels: (n.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
      commentsCount: n.comments?.totalCount ?? 0,
    })),
  };

  const openIssues = {
    total: repoData.issues?.totalCount ?? 0,
    items: (repoData.issues?.nodes ?? []).slice(0, 10).map((n: any) => ({
      number: n.number,
      title: n.title ?? '',
      url: n.url,
      updatedAt: n.updatedAt,
      author: n.author
        ? { login: n.author.login, avatarUrl: n.author.avatarUrl }
        : null,
      labels: (n.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
      commentsCount: n.comments?.totalCount ?? 0,
      assignees: (n.assignees?.nodes ?? []).map((a: any) => ({
        login: a.login,
        avatarUrl: a.avatarUrl,
      })),
    })),
  };

  type ProjectItem = {
    kind: 'issue' | 'pr' | 'draft';
    title: string;
    url: string | null;
    number: number | null;
    state: string | null;
    isDraft: boolean;
    author: { login: string; avatarUrl: string } | null;
    labels: Array<{ name: string; color: string }>;
  };
  let project: {
    title: string;
    url: string;
    columns: Array<{ name: string; total: number; items: ProjectItem[] }>;
  } | null = null;

  // Project is queried at user scope (user-owned projects).
  const projectNode = j.data?.user?.projectV2 ?? null;
  if (projectNode) {
    const options: Array<{ id: string; name: string }> = projectNode.field?.options ?? [];
    const grouped: Record<string, ProjectItem[]> = {};
    for (const opt of options) grouped[opt.name] = [];
    for (const item of projectNode.items?.nodes ?? []) {
      const statusName: string | undefined = item.fieldValueByName?.name;
      if (!statusName || !(statusName in grouped)) continue;
      const c = item.content ?? {};
      const kind: ProjectItem['kind'] =
        c.__typename === 'Issue' ? 'issue' :
        c.__typename === 'PullRequest' ? 'pr' :
        'draft';
      grouped[statusName].push({
        kind,
        title: c.title ?? '(untitled)',
        url: c.url ?? null,
        number: c.number ?? null,
        state: c.state ?? null,
        isDraft: !!c.isDraft,
        author: c.author
          ? { login: c.author.login, avatarUrl: c.author.avatarUrl }
          : null,
        labels: (c.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
      });
    }
    project = {
      title: projectNode.title,
      url: projectNode.url,
      columns: options.map((opt) => ({
        name: opt.name,
        total: grouped[opt.name].length,
        items: grouped[opt.name].slice(0, 10),
      })),
    };
  }

  return new Response(
    JSON.stringify({
      owner: body.owner,
      repo: body.repo,
      commits,
      openPRs,
      openIssues,
      project,
    }),
    { headers: cors() },
  );
});
