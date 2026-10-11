// Data layer: loads JSON, merges live GitHub data + local scan + browser-side task edits.
import { store, daysSince, today, laneOf, normalizeStatus } from './app.js';

export const PROFILE_KEY = 'dash.profile.saved';
const PRIORITY_ORDER = { high: 0, med: 1, low: 2 };
const STATUS_ORDER = { doing: 0, blocked: 1, todo: 2, done: 3, dropped: 4 };
export const isOpenTask = (t) => t.status !== 'done' && t.status !== 'dropped';

/**
 * Fetch a data file. Real data lives in data/ (kept on this PC, never in git).
 * A fresh clone has no data/, so fall back to the sample files in data.template/.
 */
export async function fetchData(name, fallback) {
  for (const base of ['data', 'data.template']) {
    try {
      const res = await fetch(`${base}/${name}`, { cache: 'no-cache' });
      if (res.ok) return await res.json();
    } catch { /* try the next location */ }
  }
  if (fallback !== undefined) return fallback;
  throw new Error(`Could not load ${name} from data/ or data.template/. If you opened the file directly, serve the folder instead — see README.`);
}

/* ── GitHub (public, unauthenticated; cached 10 min so we stay well inside rate limits) ── */
const GH_TTL = 10 * 60 * 1000;
export async function fetchGitHub(user) {
  if (!user) return { connected: false, repos: [], issues: [] };
  const key = `dash.gh.${user.toLowerCase()}`;
  const cached = store.get(key);
  if (cached && Date.now() - cached.at < GH_TTL) return { connected: true, ...cached.data, fetchedAt: cached.at };

  try {
    const [reposRes, issuesRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`),
      fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(`user:${user} state:open`)}&per_page=100&sort=updated`),
    ]);
    if (reposRes.status === 404) throw new Error(`GitHub user “${user}” was not found.`);
    if (reposRes.status === 403 || reposRes.status === 429) throw new Error('GitHub rate limit reached — showing cached data if available.');
    if (!reposRes.ok) throw new Error(`GitHub returned ${reposRes.status}.`);
    const repos = await reposRes.json();
    const issues = issuesRes.ok ? (await issuesRes.json()).items || [] : [];
    const data = {
      repos: repos.map((r) => ({
        name: r.name, fullName: r.full_name, description: r.description, url: r.html_url, homepage: r.homepage,
        language: r.language, topics: r.topics || [], stars: r.stargazers_count, forks: r.forks_count,
        openIssues: r.open_issues_count, pushedAt: r.pushed_at, createdAt: r.created_at,
        archived: r.archived, fork: r.fork, private: r.private, defaultBranch: r.default_branch, hasPages: r.has_pages,
      })),
      issues: issues.map((i) => ({
        id: `gh-${i.id}`, number: i.number, title: i.title, url: i.html_url, isPR: !!i.pull_request,
        repo: i.repository_url.split('/').slice(-1)[0], labels: (i.labels || []).map((l) => l.name),
        updatedAt: i.updated_at, createdAt: i.created_at,
      })),
    };
    store.set(key, { at: Date.now(), data });
    return { connected: true, ...data, fetchedAt: Date.now() };
  } catch (err) {
    if (cached) return { connected: true, ...cached.data, fetchedAt: cached.at, stale: true, error: err.message };
    return { connected: true, repos: [], issues: [], error: err.message };
  }
}

/* ── tasks: seed file + browser overrides + browser-created tasks ── */
const TODO_KEYS = { overrides: 'dash.todo.overrides', custom: 'dash.todo.custom', removed: 'dash.todo.removed' };

export const todoState = {
  overrides: () => store.get(TODO_KEYS.overrides, {}),
  custom: () => store.get(TODO_KEYS.custom, []),
  removed: () => store.get(TODO_KEYS.removed, []),
  setStatus(id, status) { const o = this.overrides(); o[id] = { ...(o[id] || {}), status, doneAt: status === 'done' ? today() : null }; store.set(TODO_KEYS.overrides, o); },
  add(task) { const c = this.custom(); c.push(task); store.set(TODO_KEYS.custom, c); },
  remove(id) {
    const c = this.custom();
    if (c.some((t) => t.id === id)) store.set(TODO_KEYS.custom, c.filter((t) => t.id !== id));
    else store.set(TODO_KEYS.removed, [...new Set([...this.removed(), id])]);
  },
  reset() { Object.values(TODO_KEYS).forEach((k) => store.remove(k)); },
  hasChanges() { return Object.keys(this.overrides()).length + this.custom().length + this.removed().length > 0; },
};

/** Ask the local server to write a data file. Resolves false when there is no server to save to (e.g. a plain static host). */
export async function saveData(name, obj) {
  try {
    const res = await fetch(`api/save/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dashboard': '1' }, body: JSON.stringify(obj) });
    return res.ok;
  } catch { return false; }
}

/** Write the merged task list (file + browser edits) back to data/todos.json. True once it is on disk. */
export async function persistTodos() {
  if (!todoState.hasChanges()) return true;
  let file;
  try { const r = await fetch('data/todos.json', { cache: 'no-cache' }); if (!r.ok) return false; file = await r.json(); } catch { return false; }
  const tasks = mergeTasks(file.tasks).map(({ custom, ...t }) => { if (t.doneAt == null) delete t.doneAt; return t; });
  const ok = await saveData('todos.json', { ...file, updated: today(), tasks });
  if (ok) todoState.reset();
  return ok;
}

export function mergeTasks(seedTasks) {
  const overrides = todoState.overrides();
  const removed = new Set(todoState.removed());
  const merged = [...seedTasks.filter((t) => !removed.has(t.id)), ...todoState.custom().map((t) => ({ ...t, custom: true }))];
  return merged.map((t) => ({ priority: 'med', status: 'todo', ...t, ...(overrides[t.id] || {}) }));
}

/** Tasks as they should be written back to data/todos.json (browser edits baked in). */
export function exportableTasks(model) {
  return model.tasks.filter((t) => t.source !== 'github').map((t) => {
    const { project, custom, projectId, readonly, ...rest } = t;
    return { ...rest, project: projectId };
  });
}

export function sortTasks(a, b) {
  return ((STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2))
    || ((PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))
    || String(a.due || '9999').localeCompare(String(b.due || '9999'));
}

/* ── model assembly ── */
export async function loadModel() {
  const [config, projectsFile, todosFile, profile, local] = await Promise.all([
    fetchData('config.json'),
    fetchData('projects.json'),
    fetchData('todos.json'),
    fetchData('profile.json'),
    fetchData('local-status.json', { projects: {} }),
  ]);
  const gh = config.githubLive === false ? { connected: false, repos: [], issues: [] } : await fetchGitHub(config.owner?.github);
  // A profile saved in this browser wins until it is exported into data/.
  const savedProfile = store.get(PROFILE_KEY);
  const model = buildModel({ config, projectsFile, todosFile, profile: savedProfile || profile, local, gh });
  model.profileIsLocal = !!savedProfile;
  model.publishedProfile = profile;
  return model;
}

const repoRefs = (p) => [...new Set([p.github, ...(p.repos || [])].filter(Boolean))];

export function buildModel({ config, projectsFile, todosFile, profile, local, gh }) {
  const stale = config.staleAfterDays ?? 14;
  const repoByName = new Map(gh.repos.map((r) => [r.name.toLowerCase(), r]));
  const claimed = new Set();

  const projects = projectsFile.projects.map((p) => {
    const status = normalizeStatus(p.status);
    // A project can own several repositories (e.g. a site, a dashboard and a code repo).
    const repoObjs = repoRefs(p).map((ref) => repoByName.get(ref.split('/').pop().toLowerCase())).filter(Boolean);
    repoObjs.forEach((r) => claimed.add(r.name.toLowerCase()));
    const loc = local.projects?.[p.id] || null;
    const lastActivity = [loc?.lastCommit, loc?.lastFileChange, ...repoObjs.map((r) => r.pushedAt), p.lastTouched]
      .filter(Boolean).sort().pop() || null;
    return {
      ...p, status, lane: laneOf(status).id, repo: repoObjs[0] || null, repoObjs, local: loc, lastActivity, idleDays: daysSince(lastActivity),
      tags: p.tags || [], connections: p.connections || [], milestones: p.milestones || [], waiting: [].concat(p.waitingOn || []),
    };
  });

  // Public repos nobody has linked to a project. Not turned into projects by default: that is what caused duplicates.
  const unlinkedRepos = gh.repos.filter((r) => !claimed.has(r.name.toLowerCase()) && !r.fork);
  const discovered = config.autoDiscoverRepos === true ? unlinkedRepos.map((r) => {
    const idle = daysSince(r.pushedAt);
    const status = r.archived ? 'graveyard' : idle != null && idle <= stale ? 'building' : 'on-hold';
    return {
      id: `gh:${r.name}`, name: r.name, discovered: true, summary: r.description || 'No description yet.',
      status, lane: laneOf(status).id, priority: 'low', github: r.fullName, repo: r, repoObjs: [r], local: null, waiting: [],
      lastActivity: r.pushedAt, idleDays: idle, tags: [...(r.topics || []), r.language].filter(Boolean),
      tech: r.language ? [r.language] : [], connections: [], milestones: [], links: [],
    };
  }) : [];

  const all = [...projects, ...discovered];
  const byId = new Map(all.map((p) => [p.id, p]));

  const tasks = mergeTasks(todosFile.tasks).map((t) => ({ ...t, projectId: t.project, project: byId.get(t.project) || null }));
  // Open GitHub issues become read-only tasks on the project that owns the repo.
  for (const issue of gh.issues) {
    const proj = all.find((p) => p.repoObjs?.some((r) => r.name === issue.repo));
    if (!proj) continue;
    tasks.push({
      id: issue.id, source: 'github', title: issue.title, status: 'todo', priority: 'med', url: issue.url,
      notes: `${issue.isPR ? 'Pull request' : 'Issue'} #${issue.number} in ${issue.repo}`, labels: issue.labels,
      projectId: proj.id, project: proj, readonly: true,
    });
  }

  for (const p of all) {
    // Everything belonging to a scrapped project is dropped, so it never counts as open work.
    if (p.lane === 'dead') for (const t of tasks) if (t.projectId === p.id && t.status !== 'done') t.status = 'dropped';
    const own = tasks.filter((t) => t.projectId === p.id);
    p.tasks = own;
    p.openTasks = own.filter(isOpenTask).length;
    p.doneTasks = own.filter((t) => t.status === 'done').length;
    p.needsMeCount = own.filter((t) => isOpenTask(t) && t.needsMe).length;
    const ms = p.milestones;
    p.progress = ms.length ? Math.round(100 * ms.filter((m) => m.done).length / ms.length)
      : own.length ? Math.round(100 * p.doneTasks / own.length) : 0;
    p.attention = p.lane === 'current' ? attentionFor(p, stale) : [];
  }

  // “Live” work = open tasks on current projects. Parked, held or scrapped projects don't compete for attention.
  const liveTasks = tasks.filter((t) => isOpenTask(t) && t.project?.lane === 'current');

  const now = today();
  const horizon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const reminders = tasks
    .filter((t) => isOpenTask(t) && t.due && t.project && t.project.lane !== 'dead' && t.due <= horizon)
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((t) => ({ ...t, daysUntil: Math.round((new Date(t.due + 'T12:00:00') - new Date(now + 'T12:00:00')) / 86400000) }));

  return {
    config, profile, projects: all, curated: projects, discovered, unlinkedRepos, tasks, liveTasks, reminders, gh, byId,
    staleAfterDays: stale, todosReadme: todosFile._readme,
    waitingOn: projects.filter((p) => p.lane === 'current').flatMap((p) => p.waiting.map((w) => ({ ...w, project: p }))),
  };
}

function attentionFor(p, stale) {
  const out = [];
  if (p.idleDays != null && p.idleDays > stale) out.push(`No activity for ${p.idleDays} days`);
  // Backup policy (Nathan): current projects stay in their folders and are backed up to Drive on request,
  // so git hygiene (uncommitted files, "not on GitHub") is deliberately not flagged here.
  const blocked = (p.tasks || []).filter((t) => t.status === 'blocked').length;
  if (blocked) out.push(`${blocked} blocked task${blocked === 1 ? '' : 's'}`);
  const overdue = (p.tasks || []).filter((t) => isOpenTask(t) && t.due && t.due < today()).length;
  if (overdue) out.push(`${overdue} overdue`);
  return out;
}

export const isCurrent = (p) => p.lane === 'current';
export const isUnfinished = isCurrent; // older name, kept so nothing breaks
