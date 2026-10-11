import { $, h, clear, mountChrome, createDrawer, errorCard, priorityPill, ago, fmtDate, daysSince, plural, LANES } from './app.js';
import { loadModel, fetchData, todoState, sortTasks } from './model.js';
import { buildGraph, renderGraph } from './graph.js';
import { projectDrawerContent } from './project-detail.js';

const main = $('#main');
const drawer = createDrawer();
let model;
let graphHandle;
let reports = { latest: null, list: [] };

try {
  model = await loadModel();
  reports = await loadReports();
  mountChrome(model.config);
  render();
} catch (err) {
  mountChrome({});
  clear(main).append(errorCard('The dashboard couldn’t load its data.', err.message));
}

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
}

let openId = null;
function openProject(id, keepScroll) {
  const p = model.byId.get(id);
  if (!p) return;
  openId = id;
  const el = $('.drawer');
  const top = keepScroll && el ? el.scrollTop : 0;
  drawer.open(...projectDrawerContent(p, model, { close: () => { openId = null; drawer.close(); }, onChange: refresh }));
  if (el) el.scrollTop = top;
}

function render() {
  graphHandle?.destroy();
  const { projects, tasks, gh, config } = model;
  const current = projects.filter((p) => p.lane === 'current');
  const parked = projects.filter((p) => ['might', 'hold'].includes(p.lane)).length;
  const open = model.liveTasks; // open work on current projects only
  const needsMe = open.filter((t) => t.needsMe);
  const attention = current.filter((p) => p.attention.length);
  const high = open.filter((t) => t.priority === 'high');
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  const name = config.owner?.name || '';
  const head = h('div', { class: 'page-head' },
    h('div', {},
      h('h1', {}, `${greeting()}${name ? ', ' + name : ''}`),
      h('p', { class: 'lede' },
        `${plural(current.length, 'current project')}, ${plural(open.length, 'open task')}` +
        (needsMe.length ? `, and ${needsMe.length} waiting on a decision from you.` : '.') + (parked ? ` ${parked} more are parked.` : ''))),
    githubStatus());

  const kpis = h('div', { class: 'grid cols-4' },
    kpi('Current projects', current.length, `${projects.length - current.length} parked, finished or scrapped`),
    kpi('Open tasks', open.length, `${doneCount} done`),
    kpi('High priority', high.length, high.length ? 'start here' : 'all clear'),
    kpi('Needs attention', attention.length, attention.length ? 'see below' : 'nothing flagged', attention.length > 0));

  // Up next
  const upNext = open.slice().sort(sortTasks).filter((t) => t.status !== 'blocked').slice(0, 6);
  const upCard = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Up next'), h('a', { class: 'small', href: 'projects.html' }, 'Open Command →')),
    upNext.length
      ? h('div', { class: 'stack', style: 'gap:0' }, upNext.map(taskRow))
      : h('div', { class: 'empty' }, 'Nothing open. Enjoy it.'));

  // Attention
  const attCard = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Needs attention'), h('span', { class: 'sub' }, `idle > ${model.staleAfterDays} days, blockers, unsaved work`)),
    attention.length
      ? h('ul', { class: 'list-plain' }, attention.map((p) => h('li', {},
        h('button', { class: 'btn ghost sm', type: 'button', style: 'padding-left:0', onclick: () => openProject(p.id) }, h('b', {}, p.name)),
        h('ul', { class: 'list-plain', style: 'margin-left:2px' }, p.attention.map((a) => h('li', { class: 'attention' }, '⚠ ', a))))))
      : h('div', { class: 'empty' }, 'Every active project looks healthy.'));

  // Board
  const board = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Project board'), h('a', { class: 'small', href: 'projects.html' }, 'Command →')),
    h('div', { class: 'board' }, LANES.filter((l) => l.id !== 'dead').map((lane) => {
      const items = projects.filter((p) => p.lane === lane.id);
      return h('div', { class: 'board-col' },
        h('h4', {}, h('span', {}, lane.label), h('span', {}, items.length)),
        items.map((p) => h('button', { class: 'board-item', type: 'button', onclick: () => openProject(p.id) },
          p.name, p.waiting.length ? h('span', { class: 'chip-wait', style: 'display:flex;margin-top:6px;width:fit-content' }, `Waiting on ${p.waiting[0].who}`) : null,
          lane.id === 'current' || lane.id === 'might' ? h('div', { class: 'progress' + (p.progress === 100 ? ' ok' : '') }, h('i', { style: `width:${p.progress}%` })) : null)));
    })),
    (() => { const dead = projects.filter((p) => p.lane === 'dead'); return dead.length ? h('p', { class: 'small muted', style: 'margin-top:10px' }, `Idea Graveyard (${dead.length}): ${dead.map((d) => d.name).join(', ')} · `, h('a', { href: 'projects.html#lane-dead' }, 'see why')) : null; })());

  // Graph + side
  const graphHost = h('div', { class: 'graph-host' });
  const graphCard = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'How it connects'), h('a', { class: 'small', href: 'projects.html#graph' }, 'Open full graph →')),
    graphHost);

  const side = h('div', { class: 'stack' }, profileCard(), githubCard());

  // Activity
  const activity = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Recent activity')),
    activityList());

  clear(main).append(head, h('div', { class: 'stack', style: 'gap:18px' },
    remindersCard(),
    reportCard(),
    kpis,
    h('div', { class: 'grid split' }, upCard, attCard),
    board,
    h('div', { class: 'grid split' }, graphCard, side),
    activity));

  graphHandle = renderGraph(graphHost, buildGraph(projects.filter((p) => p.lane !== 'dead')), { onSelect: openProject, height: 440, compact: true });
}

function kpi(label, value, hint, alert = false) {
  return h('div', { class: 'card kpi' + (alert ? ' alert' : '') },
    h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: 'hint' }, hint));
}

function taskRow(t) {
  const box = h('input', {
    type: 'checkbox', class: 'check', 'aria-label': `Mark “${t.title}” done`, disabled: t.readonly || null,
    onchange: () => { todoState.setStatus(t.id, 'done'); refresh(); },
  });
  return h('div', { class: 'todo', style: 'padding-left:0;padding-right:0' },
    box,
    h('div', {},
      h('div', { class: 'title' }, t.url ? h('a', { href: t.url, target: '_blank', rel: 'noopener' }, t.title) : t.title),
      h('div', { class: 'meta' }, priorityPill(t.priority), t.project ? h('span', { class: 'small muted' }, t.project.name) : null,
        t.needsMe ? h('span', { class: 'pill plain warn' }, 'Needs you') : null)),
    h('span'));
}

async function refresh() {
  // Re-merge tasks after a local change without re-fetching the network.
  model = await loadModel();
  render();
  if (openId) openProject(openId, true);
}

function remindersCard() {
  const due = model.reminders;
  const waitingNoDate = model.waitingOn.filter((w) => !w.followUp);
  if (!due.length && !waitingNoDate.length) return null;
  const label = (t) => (t.daysUntil < 0 ? ['Overdue', 'overdue'] : t.daysUntil === 0 ? ['Today', 'today'] : t.daysUntil === 1 ? ['Tomorrow', ''] : [fmtDate(t.due, { weekday: 'short', day: 'numeric', month: 'short' }), '']);
  return h('section', { class: 'reminders' },
    due.map((t) => { const [l, cls] = label(t);
      return h('button', { class: `reminder ${cls}`, type: 'button', onclick: () => t.project && openProject(t.project.id) }, h('span', { class: 'when' }, l), h('b', {}, t.title), h('span', { class: 'sub' }, t.project?.name || '')); }),
    waitingNoDate.length ? h('div', { class: 'chips-row' }, waitingNoDate.map((w) => h('button', { class: 'chip-wait', type: 'button', style: 'border:0;cursor:pointer', onclick: () => openProject(w.project.id) }, `Waiting on ${w.who}`, h('span', { style: 'font-weight:500' }, `· ${w.project.name}`)))) : null);
}

function githubStatus() {
  const { gh, config } = model;
  if (!config.owner?.github) return h('span', { class: 'pill plain warn' }, 'GitHub not connected');
  if (gh.error && !gh.repos.length) return h('span', { class: 'pill plain bad' }, 'GitHub unavailable');
  return h('span', { class: 'pill plain ok' }, `GitHub: ${config.owner.github}`);
}

function githubCard() {
  const { gh, config } = model;
  const card = h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'GitHub')));
  if (!config.owner?.github) {
    card.append(h('div', { class: 'callout warn' }, h('span', { class: 'icon' }, '🔌'),
      h('div', {}, h('b', {}, 'Not connected yet'),
        h('div', { class: 'small' }, 'Set ', h('code', {}, 'owner.github'), ' in ', h('code', {}, 'data/config.json'), ' and your public repos, issues and activity appear here automatically.'))));
    return card;
  }
  if (gh.error) card.append(h('p', { class: 'small', style: 'color:var(--danger);margin-bottom:10px' }, gh.error));
  const stars = gh.repos.reduce((n, r) => n + r.stars, 0);
  const issues = gh.issues.filter((i) => !i.isPR).length;
  const prs = gh.issues.filter((i) => i.isPR).length;
  const langs = new Map();
  gh.repos.forEach((r) => r.language && langs.set(r.language, (langs.get(r.language) || 0) + 1));
  const top = [...langs].sort((a, b) => b[1] - a[1]).slice(0, 5);
  card.append(
    h('div', { class: 'meta-row' },
      h('span', {}, h('b', {}, gh.repos.length), ' repos'), h('span', {}, h('b', {}, stars), ' ★'),
      h('span', {}, h('b', {}, issues), ' open issues'), h('span', {}, h('b', {}, prs), ' open PRs')),
    top.length ? h('div', { class: 'tags', style: 'margin-top:12px' }, top.map(([l, n]) => h('span', { class: 'tag' }, `${l} · ${n}`))) : null,
    model.unlinkedRepos.length ? h('p', { class: 'small muted', style: 'margin-top:12px' }, `${plural(model.unlinkedRepos.length, 'public repo')} not linked to a project: ${model.unlinkedRepos.map((r) => r.name).join(', ')}.`) : null);
  return card;
}

function profileCard() {
  const p = model.profile;
  const top = p.interests.slice().sort((a, b) => b.level - a.level).slice(0, 4);
  const now = (p.directions || []).filter((d) => d.horizon === 'now');
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Profile snapshot'), h('span', { class: 'sub' }, `updated ${fmtDate(p.updated)}`)),
    now.length ? h('div', { style: 'margin-bottom:12px' }, h('div', { class: 'small muted' }, 'Current focus'),
      h('ul', { class: 'bullets', style: 'margin-top:4px' }, now.map((d) => h('li', {}, d.title)))) : null,
    h('div', { class: 'small muted' }, 'Strongest interests'),
    h('div', { class: 'tags', style: 'margin:6px 0 12px' }, top.map((i) => h('span', { class: 'tag' }, i.name))),
    h('a', { class: 'small', href: 'profile.html' }, 'Open full profile →'));
}

function activityList() {
  const events = [];
  for (const p of model.projects.filter((x) => x.lane !== 'dead')) {
    if (p.local?.lastCommit) events.push({ date: p.local.lastCommit, text: `Last commit on ${p.name}`, kind: 'commit' });
    else if (p.local?.lastFileChange) events.push({ date: p.local.lastFileChange, text: `Files last changed in ${p.name}`, kind: 'file' });
    for (const r of p.repoObjs || []) if (r.pushedAt) events.push({ date: r.pushedAt, text: `Pushed to ${r.fullName}`, kind: 'push' });
  }
  for (const t of model.tasks) if (t.status === 'done' && t.doneAt) events.push({ date: t.doneAt, text: `Completed: ${t.title}`, kind: 'task' });
  for (const i of model.gh.issues.filter((x) => model.projects.some((p) => p.lane !== 'dead' && p.repoObjs?.some((r) => r.name === x.repo)))) events.push({ date: i.updatedAt, text: `${i.isPR ? 'PR' : 'Issue'} updated: ${i.title}`, kind: 'issue' });
  events.sort((a, b) => b.date.localeCompare(a.date));
  if (!events.length) return h('div', { class: 'empty' }, 'No activity recorded yet. Run scripts/scan-local.ps1 or connect GitHub.');
  return h('ul', { class: 'timeline' }, events.slice(0, 8).map((e) =>
    h('li', {}, e.text, h('time', { datetime: e.date }, `${fmtDate(e.date)} · ${ago(e.date)}`))));
}

/* ── Daily brief (written at 9am by the scheduled task into data/reports/) ── */
async function loadReports() {
  try {
    const idx = await fetchData('reports/index.json', { reports: [] });
    const list = idx.reports || [];
    const latest = list.length ? await fetchData(`reports/${list[0].date}.json`, null) : null;
    return { latest, list };
  } catch { return { latest: null, list: [] }; }
}

function fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function reportCard() {
  const r = reports.latest;
  if (!r) {
    return h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Today’s brief')),
      h('div', { class: 'callout' }, h('span', { class: 'icon' }, '🗓'), h('div', {}, h('b', {}, 'No report yet.'), h('div', { class: 'small' }, 'The first one is written at 9am and appears here, and in Drive under AI Workspace / 05_Daily_Reports.'))));
  }
  const days = daysSince(r.date);
  const stale = days != null && days > 1;
  const proj = (id) => model.byId.get(id);
  return h('section', { class: 'card brief' },
    h('div', { class: 'card-head' },
      h('div', {}, h('h2', {}, 'Today’s brief'), h('span', { class: 'sub' }, `${fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}${r.updatedAt ? ` · updated ${fmtTime(r.updatedAt)}` : ''}${stale ? ` · ${days} days old — the 9am run may not have happened` : ''}`)),
      r.driveUrl ? h('a', { class: 'btn sm', href: r.driveUrl, target: '_blank', rel: 'noopener' }, 'Open in Drive ↗') : null),
    h('p', { class: 'brief-headline' }, r.headline),
    h('div', { class: 'grid cols-2', style: 'margin-top:14px' },
      h('div', {}, h('h4', { class: 'brief-h' }, 'Tackle next'),
        h('ol', { class: 'brief-list' }, (r.focus || []).map((f) => h('li', {},
          h('b', {}, f.title), f.project && proj(f.project) ? h('a', { class: 'tag link', style: 'margin-left:8px', href: `projects.html#${encodeURIComponent(f.project)}` }, proj(f.project).name) : null,
          f.why ? h('div', { class: 'small muted' }, f.why) : null)))),
      h('div', { class: 'stack', style: 'gap:14px' },
        (r.reminders || []).length ? h('div', {}, h('h4', { class: 'brief-h' }, 'Reminders'), h('ul', { class: 'bullets' }, r.reminders.map((t) => h('li', {}, t)))) : null,
        (r.waitingOnYou || []).length ? h('div', {}, h('h4', { class: 'brief-h' }, 'Waiting on you'), h('ul', { class: 'bullets' }, r.waitingOnYou.map((t) => h('li', {}, t)))) : null,
        (r.watch || []).length ? h('div', {}, h('h4', { class: 'brief-h' }, 'Keep an eye on'), h('ul', { class: 'bullets' }, r.watch.map((t) => h('li', {}, t)))) : null)),
    (r.changes || []).length || r.job ? h('details', { style: 'margin-top:14px' }, h('summary', { class: 'small muted', style: 'cursor:pointer' }, 'What changed and the rest of the picture'),
      h('div', { class: 'grid cols-2', style: 'margin-top:10px' },
        h('div', {}, h('h4', { class: 'brief-h' }, 'Changes'), h('ul', { class: 'bullets' }, (r.changes || []).map((t) => h('li', {}, t)))),
        h('div', {}, h('h4', { class: 'brief-h' }, 'Each project in a line'), h('ul', { class: 'bullets' }, (r.projects || []).map((p) => h('li', {}, h('b', {}, p.name), ' — ', p.line))),
          r.job ? h('p', { class: 'small', style: 'margin-top:10px' }, h('b', {}, 'Job search: '), r.job) : null))) : null,
    reports.list.length > 1 ? h('details', { style: 'margin-top:10px' }, h('summary', { class: 'small muted', style: 'cursor:pointer' }, `Past reports (${reports.list.length - 1})`),
      h('ul', { class: 'list-plain', style: 'margin-top:8px' }, reports.list.slice(1, 15).map((x) => h('li', { class: 'small' }, h('b', {}, fmtDate(x.date)), ' — ', x.headline, x.driveUrl ? [' ', h('a', { href: x.driveUrl, target: '_blank', rel: 'noopener' }, 'Drive ↗')] : null)))) : null);
}
