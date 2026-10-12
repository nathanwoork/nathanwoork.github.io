// Command: every project by lifecycle lane, with progress at a glance. Click a project for its milestones and to-do list.
import { $, h, clear, mountChrome, createDrawer, errorCard, statusPill, fmtDate, ago, plural, LANES, CONN_LABEL, today } from './app.js';
import { loadModel } from './model.js';
import { buildGraph, renderGraph } from './graph.js';
import { projectDrawerContent } from './project-detail.js';

const main = $('#main');
const drawer = createDrawer();
const view = { mode: 'command', q: '' };
let model;
let openId = null;
let graphHandle;

const PRIORITY = { high: 0, med: 1, low: 2 };

/* ── panel ── */
function openProject(id, keepScroll) {
  const p = model.byId.get(id);
  if (!p) return;
  openId = id;
  const el = $('.drawer');
  const top = keepScroll && el ? el.scrollTop : 0;
  drawer.open(...projectDrawerContent(p, model, { close: closePanel, onChange: reload }));
  if (el) el.scrollTop = top;
  history.replaceState(null, '', '#' + encodeURIComponent(id));
}
function closePanel() { openId = null; drawer.close(); history.replaceState(null, '', location.pathname); }

async function reload() {
  model = await loadModel();
  paint();
  if (openId) openProject(openId, true);
}

/* ── page ── */
function build() {
  const search = h('input', { type: 'search', placeholder: 'Search projects, tech, themes…', 'aria-label': 'Search projects', oninput: (e) => { view.q = e.target.value.toLowerCase(); paintBody(); } });
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'View' }, [['command', 'By lane'], ['list', 'Table'], ['connections', 'Connections']].map(([k, label]) =>
    h('button', { type: 'button', 'aria-pressed': String(view.mode === k), dataset: { k }, onclick: () => { view.mode = k; $$seg().forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k))); paintBody(); } }, label)));

  clear(main).append(
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Projects'),
        h('p', { class: 'lede' }, 'Every project by where it stands, with its progress. Click one to see its milestones and its own to-do list.')),
      seg),
    h('div', { id: 'reminders' }),
    h('div', { class: 'row', style: 'margin-bottom:6px' }, h('div', { style: 'flex:1;min-width:220px;max-width:360px' }, search)),
    h('div', { id: 'body' }),
    h('div', { id: 'foot' }));
  paint();
}
const $$seg = () => [...document.querySelectorAll('.seg button')];

function paint() { paintReminders(); paintBody(); paintFoot(); }

function whenLabel(t) {
  if (t.daysUntil < 0) return ['Overdue', 'overdue'];
  if (t.daysUntil === 0) return ['Today', 'today'];
  if (t.daysUntil === 1) return ['Tomorrow', ''];
  return [fmtDate(t.due, { weekday: 'short', day: 'numeric', month: 'short' }), ''];
}

function paintReminders() {
  const host = $('#reminders');
  clear(host);
  const waitingNoDate = model.waitingOn.filter((w) => !w.followUp);
  if (!model.reminders.length && !waitingNoDate.length) return;
  host.append(h('div', { class: 'reminders' },
    model.reminders.map((t) => { const [label, cls] = whenLabel(t);
      return h('button', { class: `reminder ${cls}`, type: 'button', onclick: () => t.project && openProject(t.project.id) },
        h('span', { class: 'when' }, label), h('b', {}, t.title), h('span', { class: 'sub' }, t.project?.name || '')); }),
    waitingNoDate.length ? h('div', { class: 'chips-row' }, waitingNoDate.map((w) => h('button', { class: 'chip-wait', type: 'button', onclick: () => openProject(w.project.id), style: 'border:0;cursor:pointer' }, `Waiting on ${w.who}`, h('span', { style: 'font-weight:500' }, `· ${w.project.name}`)))) : null));
}

function matches(p) {
  if (!view.q) return true;
  return [p.name, p.summary, ...(p.tags || []), ...(p.tech || []), ...(p.waiting || []).map((w) => w.who)].join(' ').toLowerCase().includes(view.q);
}

function paintBody() {
  const host = $('#body');
  graphHandle?.destroy();
  clear(host);
  if (view.mode === 'connections') return paintConnections(host);
  if (view.mode === 'list') return paintTable(host);
  let any = false;
  for (const lane of LANES) {
    let list = model.projects.filter((p) => p.lane === lane.id && matches(p));
    if (!list.length) continue;
    any = true;
    if (lane.id === 'current') list = list.sort((a, b) => (PRIORITY[a.priority] ?? 1) - (PRIORITY[b.priority] ?? 1) || (a.idleDays ?? 0) - (b.idleDays ?? 0));
    host.append(h('section', { class: `lane lane-${lane.id}`, id: `lane-${lane.id}` },
      h('div', { class: 'lane-head' }, h('h2', {}, lane.label), h('span', { class: 'count' }, list.length), h('span', { class: 'hint' }, lane.hint)),
      lane.id === 'current' ? h('div', { class: 'grid cols-2' }, list.map(card)) : h('div', { class: 'rows' }, list.map((p) => row(p, lane)))));
  }
  if (!any) host.append(h('div', { class: 'empty card' }, 'No projects match that search.'));
}

function bar(p) {
  return h('div', { class: 'pbar' }, h('div', { class: 'progress' + (p.progress === 100 ? ' ok' : '') }, h('i', { style: `width:${p.progress}%` })), h('span', { class: 'pct' }, `${p.progress}%`));
}

function card(p) {
  const ms = p.milestones.length ? `${p.milestones.filter((m) => m.done).length}/${p.milestones.length} milestones` : 'no milestones yet';
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(p.id); } };
  return h('div', { class: `card pcard s-${p.status}`, role: 'button', tabindex: '0', 'aria-label': `Open ${p.name}`, onclick: () => openProject(p.id), onkeydown: key },
    h('div', { class: 'row between' }, h('div', { class: 'chips-row' }, statusPill(p.status), p.waiting.map((w) => h('span', { class: 'chip-wait' }, `Waiting on ${w.who}`))), h('span', { class: 'small muted' }, ago(p.lastActivity))),
    h('h3', {}, p.name),
    h('div', {}, bar(p), h('div', { class: 'small muted', style: 'margin-top:4px' }, ms)),
    p.nextAction ? h('div', { class: 'next' }, h('b', {}, 'Next: '), p.nextAction) : null,
    h('div', { class: 'chips-row' },
      h('span', { class: 'tag' }, `${p.openTasks} open`),
      p.needsMeCount ? h('span', { class: 'chip-me' }, `${p.needsMeCount} need you`) : null,
      p.local?.branch && p.local.uncommitted ? h('span', { class: 'tag' }, `${p.local.uncommitted} uncommitted`) : null),
    p.attention.length ? h('div', { class: 'attention' }, h('span', {}, '!'), h('span', {}, p.attention.slice(0, 2).join(' · '))) : null);
}

function rowNote(p) {
  if (p.lane === 'dead') return `Scrapped${p.buried?.date ? ' ' + fmtDate(p.buried.date, { day: 'numeric', month: 'short' }) : ''}${p.buried?.reason ? ' — ' + p.buried.reason : ''}`;
  if (p.lane === 'hold') return `On hold${p.heldSince ? ' since ' + fmtDate(p.heldSince, { day: 'numeric', month: 'short' }) : ''}${p.holdReason ? ' — ' + p.holdReason : ''}`;
  if (p.lane === 'done') return p.finishedOn ? `Finished ${fmtDate(p.finishedOn, { day: 'numeric', month: 'short' })}` : (p.nextAction || p.summary);
  return p.nextAction || p.summary;
}

function row(p) {
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(p.id); } };
  return h('div', { class: `prow ${p.lane}`, role: 'button', tabindex: '0', onclick: () => openProject(p.id), onkeydown: key, 'aria-label': `Open ${p.name}` },
    h('span', { class: 'name' }, p.name), h('span', { class: 'note', title: rowNote(p) }, rowNote(p)),
    p.lane === 'dead' ? h('span') : bar(p), statusPill(p.status));
}

function paintTable(host) {
  const rows = [];
  for (const lane of LANES) {
    const list = model.projects.filter((p) => p.lane === lane.id && matches(p));
    if (!list.length) continue;
    rows.push(h('tr', { class: 'lane-sep' }, h('td', { colspan: 6 }, `${lane.label} · ${list.length}`)));
    list.forEach((p) => rows.push(h('tr', { class: 'row-click', tabindex: '0', onclick: () => openProject(p.id), onkeydown: (e) => { if (e.key === 'Enter') openProject(p.id); } },
      h('td', {}, h('b', {}, p.name)), h('td', {}, statusPill(p.status)),
      h('td', { style: 'min-width:140px' }, p.lane === 'dead' ? '—' : bar(p)),
      h('td', {}, p.lane === 'dead' ? '—' : String(p.openTasks)),
      h('td', { class: 'muted' }, p.lastActivity ? ago(p.lastActivity) : '—'),
      h('td', { class: 'muted small' }, p.waiting.length ? p.waiting.map((w) => w.who).join(', ') : ''))));
  }
  host.append(h('div', { class: 'table-wrap' }, h('table', { class: 'plist' },
    h('thead', {}, h('tr', {}, ['Project', 'Status', 'Progress', 'Open tasks', 'Last activity', 'Waiting on'].map((c) => h('th', {}, c)))),
    h('tbody', {}, rows))));
}

function paintConnections(host) {
  const graphHost = h('div', { class: 'graph-host' });
  host.append(
    h('p', { class: 'lede muted', style: 'margin:6px 0 14px;max-width:70ch' }, 'Projects that share a theme or technology sit near each other. Squares are outside services; their border shows whether the link is real, simulated, planned or blocked. Scrapped projects are left out.'),
    graphHost, integrations());
  graphHandle = renderGraph(graphHost, buildGraph(model.projects.filter((p) => p.lane !== 'dead')), { onSelect: openProject, height: 560 });
}

function integrations() {
  const map = new Map();
  for (const p of model.projects.filter((x) => x.lane !== 'dead')) for (const c of p.connections || []) {
    const entry = map.get(c.name) || { name: c.name, uses: [] };
    entry.uses.push({ project: p, state: c.state, note: c.note });
    map.set(c.name, entry);
  }
  if (!map.size) return null;
  return h('section', { style: 'margin-top:36px' },
    h('div', { class: 'lane-head' }, h('h2', {}, 'Integrations'), h('span', { class: 'hint' }, '“Simulated” means tested against a local stand-in, not the real thing.')),
    h('div', { class: 'grid cols-3' }, [...map.values()].map((e) =>
      h('div', { class: 'card flat' }, h('h3', { style: 'margin-bottom:10px' }, e.name),
        h('ul', { class: 'list-plain' }, e.uses.map((u) => h('li', { class: 'conn-row' }, h('span', { class: `dot ${u.state}` }),
          h('div', {}, h('b', {}, u.project.name), ' ', h('span', { class: 'muted small' }, `— ${CONN_LABEL[u.state] || u.state}`), u.note ? h('div', { class: 'small muted' }, u.note) : null))))))));
}

function paintFoot() {
  const host = $('#foot');
  clear(host);
  if (!model.config.owner?.github) {
    host.append(h('div', { class: 'callout warn', style: 'margin-top:30px' }, h('span', { class: 'icon' }, 'GITHUB'), h('div', {}, h('b', {}, 'GitHub isn’t connected. '), 'Set ', h('code', {}, 'owner.github'), ' in ', h('code', {}, 'data/config.json'), ' to see repo activity.')));
  } else if (model.unlinkedRepos.length) {
    host.append(h('div', { class: 'callout', style: 'margin-top:30px' }, h('span', { class: 'icon' }, 'REPOS'),
      h('div', {}, h('b', {}, `${plural(model.unlinkedRepos.length, 'public repo')} not linked to a project: `), model.unlinkedRepos.map((r) => r.name).join(', '),
        h('div', { class: 'small muted' }, 'They aren’t shown as projects (that caused duplicates). To track one, add it to a project’s "repos" list in data/projects.json.'))));
  }
}

/* ── start (kept last so every helper above is initialised first) ── */
try {
  model = await loadModel();
  mountChrome(model.config);
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash === 'graph') view.mode = 'connections';
  build();
  if (hash && model.byId.has(hash)) openProject(hash);
} catch (err) {
  mountChrome({});
  clear(main).append(errorCard('The dashboard couldn’t load its data.', err.message));
}
