// Today: what to do now. One due strip (the screen's yellow moment), big numbers, Focus (max 3), your calls,
// who you're waiting on, current projects, and the rest of the 9am brief folded away.
import { $, h, clear, mountChrome, createDrawer, errorCard, fmtDate, daysSince, plural, LANES, toast, today } from './app.js';
import { loadModel, fetchData, todoState, sortTasks, persistTodos, isThisWeek } from './model.js';
import { projectDrawerContent } from './project-detail.js';

const main = $('#main');
const drawer = createDrawer();
let model;
let reports = { latest: null, list: [] };
let openId = null;

const PRIO = { high: 0, med: 1, low: 2 };

/* ── data helpers ── */
async function loadReports() {
  try {
    const idx = await fetchData('reports/index.json', { reports: [] });
    const list = idx.reports || [];
    const latest = list.length ? await fetchData(`reports/${list[0].date}.json`, null) : null;
    return { latest, list };
  } catch { return { latest: null, list: [] }; }
}

const daysUntil = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000);

/** The three things to do first: due/overdue, then in progress, then your high-priority calls, then high priority. */
function pickFocus(live) {
  const score = (t) => {
    if (t.due && daysUntil(t.due) <= 0) return 0;
    if (t.status === 'doing') return 1;
    if (t.needsMe && t.priority === 'high') return 2;
    if (t.priority === 'high') return 3;
    if (t.due && daysUntil(t.due) <= 7) return 4;
    return 9;
  };
  return live.filter((t) => t.status !== 'blocked' && !t.readonly)
    .sort((a, b) => score(a) - score(b) || (PRIO[a.priority] ?? 1) - (PRIO[b.priority] ?? 1) || sortTasks(a, b))
    .slice(0, 3);
}

function whyLine(t) {
  if (t.due) {
    const d = daysUntil(t.due);
    if (d < 0) return `Overdue since ${fmtDate(t.due, { day: 'numeric', month: 'short' })}`;
    if (d === 0) return 'Due today';
    if (d <= 7) return `Due ${fmtDate(t.due, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  }
  if (t.status === 'doing') return 'In progress';
  if (t.notes) return t.notes.length > 90 ? t.notes.slice(0, 88) + '…' : t.notes;
  return t.needsMe ? 'Only you can decide this' : 'High priority';
}

/* ── panel ── */
function openProject(id, keepScroll) {
  const p = model.byId.get(id);
  if (!p) return;
  openId = id;
  const el = $('.drawer');
  const top = keepScroll && el ? el.scrollTop : 0;
  drawer.open(...projectDrawerContent(p, model, { close: () => { openId = null; drawer.close(); }, onChange: refresh }));
  if (el) el.scrollTop = top;
}

async function refresh() {
  model = await loadModel();
  render();
  if (openId) openProject(openId, true);
}

/* ── page ── */
function render() {
  const { projects } = model;
  const current = projects.filter((p) => p.lane === 'current');
  const live = model.liveTasks;
  const week = live.filter(isThisWeek);
  const yourCall = live.filter((t) => t.needsMe);
  const focus = pickFocus(live);
  const focusIds = new Set(focus.map((t) => t.id));
  const dueNow = model.reminders.filter((t) => t.daysUntil <= 0);
  const r = reports.latest;
  const briefIsFresh = r && daysSince(r.date) <= 1;

  const title = dueNow.length === 1 ? (/follow up/i.test(dueNow[0].title) ? 'One follow-up today.' : 'One thing due today.')
    : dueNow.length > 1 ? `${dueNow.length} things due today.`
    : focus.length ? 'Nothing due. Pick up the thread.' : 'A clear day.';
  const briefTime = r?.updatedAt ? new Date(r.updatedAt) : null;
  const eyebrow = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    + (briefIsFresh && briefTime ? ` · Brief ${briefTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : '');
  const head = h('header', { class: 'today-head' },
    h('div', {},
      h('span', { class: 'eyebrow' }, eyebrow),
      h('h1', {}, title),
      h('p', { class: 'lede' }, briefIsFresh ? r.headline : `${plural(current.length, 'current project')} and ${plural(week.length, 'task')} this week. ${r ? 'The latest brief is from ' + fmtDate(r.date) + '.' : 'The first brief arrives at 9am.'}`)),
    h('a', { class: 'btn', href: 'projects.html' }, 'All projects →'));

  clear(main).append(head, h('div', { class: 'stack', style: 'gap:16px' },
    dueStrip(),
    h('section', { class: 'grid cols-4', 'aria-label': 'Today in numbers' },
      kpi('Current', current.length, `projects · ${projects.filter((p) => ['might', 'hold'].includes(p.lane)).length} parked`, true),
      kpi('This week', week.length, `tasks · ${live.length - week.length} in backlog`),
      kpi('Your call', yourCall.length, 'decisions only you can make'),
      kpi('Waiting on', model.waitingOn.length, model.waitingOn.map((w) => w.who).join(' · ') || 'nobody')),
    h('div', { class: 'grid split' }, focusCard(focus, week.length), sideCard(yourCall.filter((t) => !focusIds.has(t.id)))),
    projectsCard(current),
    restOfBrief()));
}

function kpi(label, value, hint, cut = false) {
  return h('div', { class: 'card kpi' + (cut ? ' cut' : '') }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: 'hint' }, hint));
}

/* Due today / this week, then the next dates further out. */
function dueStrip() {
  const near = model.reminders;
  const horizon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const later = model.tasks.filter((t) => t.due && t.due > horizon && t.status !== 'done' && t.status !== 'dropped' && t.project && t.project.lane !== 'dead')
    .sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
  if (!near.length && !later.length) return null;
  const label = (t) => (t.daysUntil < 0 ? 'Overdue' : t.daysUntil === 0 ? 'Today' : t.daysUntil === 1 ? 'Tomorrow' : fmtDate(t.due, { weekday: 'short', day: 'numeric', month: 'short' }));
  return h('section', { class: 'duebar', 'aria-label': 'Due and follow-ups' },
    near.map((t) => h('button', { class: 'dueitem' + (t.daysUntil > 0 ? ' soon' : ''), type: 'button', onclick: () => t.project && openProject(t.project.id) },
      h('span', { class: 'when' }, label(t)), h('b', {}, t.title), h('span', { class: 'proj' }, t.project?.name || ''))),
    later.length ? h('div', { class: 'later' }, 'Later: ' + later.map((t) => `${fmtDate(t.due, { day: 'numeric', month: 'short' })} ${t.title.length > 40 ? t.title.slice(0, 38) + '…' : t.title}`).join(' · ')) : null);
}

function focusCard(focus, weekCount) {
  return h('section', { class: 'card cut' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Focus'), h('span', { class: 'sub' }, `${focus.length} of ${weekCount} this week`)),
    focus.length ? focus.map((t) => h('div', { class: 'focus-row' },
      h('input', { type: 'checkbox', class: 'check', 'aria-label': `Mark “${t.title}” done`, onchange: async () => {
        // Save to data/todos.json, not just this browser.
        todoState.setStatus(t.id, 'done');
        const saved = await persistTodos();
        await refresh();
        toast(saved ? `Done: ${t.title}` : 'Saved in this browser only (the local server isn’t running)');
      } }),
      h('div', {}, h('div', { class: 't' }, t.title), h('div', { class: 'why' }, whyLine(t))),
      t.project ? h('button', { class: 'tag link', type: 'button', style: 'background:none;cursor:pointer', onclick: () => openProject(t.project.id) }, t.project.name) : h('span')))
      : h('p', { class: 'muted' }, 'Nothing pressing. Open a project to pick something up.'));
}

function sideCard(calls) {
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Your call'), h('span', { class: 'sub' }, String(calls.length))),
    calls.length ? h('div', { class: 'wlist' }, calls.slice(0, 4).map((t) => h('button', { class: 'witem', type: 'button', onclick: () => t.project && openProject(t.project.id) },
      h('span', {}, t.title), h('span', { class: 'm' }, t.project?.name || '')))) : h('p', { class: 'muted small' }, 'No decisions waiting on you.'),
    calls.length > 4 ? h('p', { class: 'meta-mono muted', style: 'margin-top:8px' }, `+${calls.length - 4} more inside their projects`) : null,
    h('div', { class: 'card-head', style: 'margin:24px 0 8px' }, h('h2', {}, 'Waiting on others'), h('span', { class: 'sub' }, String(model.waitingOn.length))),
    model.waitingOn.length ? h('div', { class: 'wlist' }, model.waitingOn.map((w) => h('button', { class: 'witem', type: 'button', onclick: () => openProject(w.project.id) },
      h('b', {}, w.who),
      h('span', { class: 'm' }, `${w.project.name}${w.about ? ' · ' + w.about : ''}`),
      w.followUp ? h('span', { class: 'm' }, `Follow up ${fmtDate(w.followUp, { weekday: 'short', day: 'numeric', month: 'short' })}`) : h('span', { class: 'm warnline' }, 'No follow-up date set'))))
      : h('p', { class: 'muted small' }, 'Nobody.'));
}

function projectsCard(current) {
  const others = LANES.filter((l) => l.id !== 'current').map((l) => [l.label, model.projects.filter((p) => p.lane === l.id).length]).filter(([, n]) => n);
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Current projects'), h('a', { class: 'sub', href: 'projects.html' }, `${current.length} · all projects →`)),
    current.map((p) => {
      const blocked = p.tasks.filter((t) => t.status === 'blocked').length;
      const next = p.waiting.length ? `Waiting on ${p.waiting[0].who}${p.waiting[0].about ? ' · ' + p.waiting[0].about : ''}` : (p.nextAction || '');
      return h('div', { class: 'cproj', role: 'button', tabindex: '0', onclick: () => openProject(p.id), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(p.id); } } },
        h('b', {}, p.name), h('span', { class: 'nx', title: next }, next),
        h('div', { class: 'progress' }, h('i', { style: `width:${p.progress}%` })),
        p.waiting.length ? h('span', { class: 'flag' }, 'waiting') : blocked ? h('span', { class: 'flag' }, `${blocked} blocked`) : h('span', { class: 'meta-mono' }, `${p.progress}%`));
    }),
    others.length ? h('p', { class: 'meta-mono muted', style: 'margin-top:14px' }, 'Also: ' + others.map(([l, n]) => `${l} ${n}`).join(' · ')) : null);
}

/* Everything else from the brief, collapsed until wanted. */
function restOfBrief() {
  const r = reports.latest;
  if (!r) return h('p', { class: 'meta-mono muted' }, 'No brief yet. The first one is written at 9am and also logged to Drive under AI Workspace / 05_Daily_Reports.');
  const proj = (id) => model.byId.get(id);
  const parts = [
    ['Recommended', (r.focus || []).map((f) => h('li', {}, h('b', {}, f.title), f.project && proj(f.project) ? ` · ${proj(f.project).name}` : '', f.why ? h('div', { class: 'small muted' }, f.why) : null))],
    ['Keep an eye on', (r.watch || []).map((t) => h('li', {}, t))],
    ['What changed', (r.changes || []).map((t) => h('li', {}, t))],
    ['Each project in a line', (r.projects || []).map((p) => h('li', {}, h('b', {}, p.name), ' · ', p.line))],
  ].filter(([, items]) => items.length);
  return h('details', { class: 'restbrief' },
    h('summary', {}, `Rest of the brief · ${fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}${reports.list.length > 1 ? ` · ${reports.list.length - 1} past reports` : ''}`),
    h('div', { class: 'card', style: 'margin-top:10px' },
      h('div', { class: 'grid cols-2' }, parts.map(([label, items]) => h('div', {}, h('h4', { class: 'brief-h' }, label), h('ul', { class: 'bullets' }, items)))),
      r.job ? h('p', { class: 'small', style: 'margin-top:16px' }, h('b', {}, 'Job search: '), r.job) : null,
      h('div', { class: 'row', style: 'margin-top:18px' },
        r.driveUrl ? h('a', { class: 'btn sm', href: r.driveUrl, target: '_blank', rel: 'noopener' }, 'Open in Drive ↗') : null,
        reports.list.length > 1 ? h('span', { class: 'meta-mono muted' }, 'Past: ' + reports.list.slice(1, 8).map((x) => fmtDate(x.date, { day: 'numeric', month: 'short' })).join(' · ')) : null)));
}

/* ── start (kept last so every helper above is initialised first) ── */
try {
  model = await loadModel();
  reports = await loadReports();
  mountChrome(model.config);
  render();
} catch (err) {
  mountChrome({});
  clear(main).append(errorCard('The dashboard couldn’t load its data.', err.message));
}
