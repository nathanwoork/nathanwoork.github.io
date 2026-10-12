// Shared UI helpers: DOM builder, storage, theme, header/footer, drawer, toast.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Build a DOM node. Children are appended as text, so GitHub/user content can never inject HTML. */
export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.setAttribute('class', value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) { node.replaceChildren(); return node; }

/* ── storage (wrapped: private windows / blocked storage must not break the page) ── */
export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

/* ── dates ── */
export const today = () => new Date().toISOString().slice(0, 10);
export function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86400000);
}
export function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, opts);
}
export function ago(iso) {
  const d = daysSince(iso);
  if (d == null) return 'no activity yet';
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.round(d / 30)} mo ago`;
  return `${Math.round(d / 365)} yr ago`;
}
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/* ── labels & lifecycle ── */
// Lifecycle lanes, in display order. A project's `status` decides its lane.
export const LANES = [
  { id: 'current', label: 'Current', hint: 'Actively being worked on', statuses: ['building', 'planning'] },
  { id: 'might', label: 'Might pursue', hint: 'Interesting, but not urgent and needs none of your attention now', statuses: ['might-pursue', 'idea'] },
  { id: 'hold', label: 'On hold', hint: 'Paused on purpose and archived until you decide to resume', statuses: ['on-hold'] },
  { id: 'done', label: 'Finished', hint: 'Done and out the door', statuses: ['finished'] },
  { id: 'dead', label: 'Idea Graveyard', hint: 'Scrapped. Safe to ignore', statuses: ['graveyard'] },
];
export const STATUS_ALIAS = { shipped: 'finished', archived: 'graveyard', paused: 'on-hold' };
export const normalizeStatus = (s) => STATUS_ALIAS[s] || s;
export const laneOf = (status) => LANES.find((l) => l.statuses.includes(normalizeStatus(status))) || LANES[0];

export const STATUSES = ['building', 'planning', 'might-pursue', 'idea', 'on-hold', 'finished', 'graveyard'];
export const STATUS_LABEL = {
  building: 'Building', planning: 'Planning', 'might-pursue': 'Might pursue', idea: 'Idea', 'on-hold': 'On hold',
  finished: 'Finished', graveyard: 'Idea Graveyard', shipped: 'Finished', archived: 'Idea Graveyard', paused: 'On hold',
};
export const CONN_LABEL = { live: 'Live', simulated: 'Simulated', planned: 'Planned', blocked: 'Blocked', unknown: 'Unknown' };

export const statusPill = (status) => { const k = normalizeStatus(status); return h('span', { class: `pill s-${k}` }, STATUS_LABEL[k] || k); };
export const priorityPill = (p) => h('span', { class: `pill plain ${p}` }, { high: 'High', med: 'Medium', low: 'Low' }[p] || p);

/* ── chrome: Woo Overcast sidebar (dark only, so no theme toggle) ── */
const NAV = [
  ['index.html', 'Today'],
  ['projects.html', 'Projects'],
  ['files.html', 'Files'],
  ['profile.html', 'Profile'],
];

/** Sidebar footer: is the local server answering, and when was the last brief written? */
async function paintStatus(host) {
  let up = false;
  try { up = (await fetch('api/ping', { cache: 'no-store', signal: AbortSignal.timeout(2500) })).ok; } catch { /* static host or down */ }
  let brief = null;
  try {
    const idx = await (await fetch('data/reports/index.json', { cache: 'no-cache' })).json();
    brief = idx.reports?.[0] || null;
  } catch { /* no reports yet */ }
  const when = brief?.updatedAt ? new Date(brief.updatedAt) : brief?.date ? new Date(brief.date + 'T09:00:00') : null;
  host.replaceChildren(
    h('span', { class: `status ${up ? 'up' : 'down'}` }, up ? `Server up · ${location.host}` : 'Server not answering'),
    h('span', { class: 'status' }, when && !Number.isNaN(when.getTime()) ? `Brief ${when.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : 'No brief yet'));
}

export function mountChrome(config) {
  const page = location.pathname.split('/').pop() || 'index.html';
  const header = $('#site-header');
  if (header) {
    const user = config?.owner?.github;
    const status = h('div', { class: 'header-tools-status', style: 'display:grid;gap:6px' });
    header.className = 'site-header';
    header.replaceChildren(h('div', { class: 'wrap' },
      h('a', { class: 'brand', href: 'index.html' }, config?.siteTitle || 'Project Dashboard'),
      h('nav', { class: 'nav', 'aria-label': 'Main' }, NAV.map(([href, label]) =>
        h('a', { href, 'aria-current': href === page ? 'page' : null }, label))),
      h('div', { class: 'header-tools' }, status,
        user ? h('a', { href: `https://github.com/${user}`, target: '_blank', rel: 'noopener' }, `github.com/${user} ↗`) : null)));
    paintStatus(status);
  }

  const footer = $('#site-footer');
  if (footer) {
    footer.className = 'site-footer';
    const repoUrl = config?.owner?.github && config?.repo ? `https://github.com/${config.owner.github}/${config.repo}` : null;
    footer.replaceChildren(h('div', { class: 'wrap' },
      h('span', {}, 'Your data stays on this PC in data/. GitHub holds the scaffolding only.'),
      repoUrl ? h('a', { href: repoUrl, target: '_blank', rel: 'noopener' }, 'Scaffolding on GitHub ↗') : null));
  }

  if (!$('.toast-host')) document.body.append(h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' }));

  // Live feed: reload every few minutes, but never while you're typing, a drawer is open, or the profile is being edited.
  if (page !== 'profile.html' && !window.__dashRefresh) {
    window.__dashRefresh = setInterval(() => {
      const el = document.activeElement;
      const typing = el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if (!document.hidden && !typing && !$('.drawer.open')) location.reload();
    }, 5 * 60 * 1000);
  }
}

export function toast(message, ms = 2400) {
  const host = $('.toast-host');
  if (!host) return;
  const node = h('div', { class: 'toast' }, message);
  host.append(node);
  setTimeout(() => node.remove(), ms);
}

/* ── side drawer ── */
export function createDrawer() {
  const scrim = h('div', { class: 'scrim' });
  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Details' });
  document.body.append(scrim, drawer);
  let lastFocus = null;
  const close = () => {
    scrim.classList.remove('open'); drawer.classList.remove('open');
    lastFocus?.focus?.();
  };
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });
  return {
    open(...content) {
      lastFocus = document.activeElement;
      drawer.replaceChildren(...content);
      drawer.scrollTop = 0;
      scrim.classList.add('open'); drawer.classList.add('open');
      drawer.querySelector('button, a, input')?.focus?.({ preventScroll: true });
    },
    close,
  };
}

/* ── downloads ── */
export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function errorCard(message, detail) {
  return h('div', { class: 'callout warn', role: 'alert' },
    h('span', { class: 'icon' }, '!'),
    h('div', {}, h('b', {}, message), detail ? h('div', { class: 'small muted' }, detail) : null));
}
