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

/* ── theme ── */
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
function initialTheme() {
  const saved = store.get('dash.theme');
  if (saved) return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
applyTheme(initialTheme());

/* ── chrome ── */
const NAV = [
  ['index.html', 'Overview'],
  ['projects.html', 'Command'],
  ['files.html', 'Files'],
  ['profile.html', 'Profile'],
];

const ICON_MARK = '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 6 7l3 3 5-6"/></svg>';
const ICON_SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICON_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICON_GH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>';

export function mountChrome(config) {
  const page = location.pathname.split('/').pop() || 'index.html';
  const header = $('#site-header');
  if (header) {
    const user = config?.owner?.github;
    const themeBtn = h('button', { class: 'btn icon ghost', type: 'button', 'aria-label': 'Toggle dark mode', title: 'Toggle dark mode' });
    const paintTheme = () => { themeBtn.innerHTML = document.documentElement.dataset.theme === 'dark' ? ICON_SUN : ICON_MOON; };
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next); store.set('dash.theme', next); paintTheme();
      document.dispatchEvent(new CustomEvent('themechange'));
    });
    paintTheme();

    const ghLink = user
      ? h('a', { class: 'btn icon ghost', href: `https://github.com/${user}`, target: '_blank', rel: 'noopener', 'aria-label': 'Open GitHub profile', title: 'GitHub profile' })
      : null;
    if (ghLink) ghLink.innerHTML = ICON_GH;

    const brand = h('a', { class: 'brand', href: 'index.html' });
    const mark = h('span', { class: 'brand-mark' }); mark.innerHTML = ICON_MARK;
    brand.append(mark, h('span', {}, config?.siteTitle || 'Project Dashboard'));

    header.className = 'site-header';
    header.replaceChildren(h('div', { class: 'wrap' },
      brand,
      h('nav', { class: 'nav', 'aria-label': 'Main' }, NAV.map(([href, label]) =>
        h('a', { href, 'aria-current': href === page ? 'page' : null }, label))),
      h('div', { class: 'header-tools' }, ghLink, themeBtn)));
  }

  const footer = $('#site-footer');
  if (footer) {
    footer.className = 'site-footer';
    const repoUrl = config?.owner?.github && config?.repo ? `https://github.com/${config.owner.github}/${config.repo}` : null;
    footer.replaceChildren(h('div', { class: 'wrap' },
      h('span', {}, 'Data lives in ', h('code', {}, 'data/*.json'), ' — edit, commit, and the site updates.'),
      repoUrl ? h('a', { href: repoUrl, target: '_blank', rel: 'noopener' }, 'View source on GitHub') : h('span', {}, 'Not yet connected to a GitHub repository')));
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
    h('span', { class: 'icon' }, '⚠'),
    h('div', {}, h('b', {}, message), detail ? h('div', { class: 'small muted' }, detail) : null));
}
