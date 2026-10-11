// Files tab: every folder and file in the two project roots (plus the Drive map), with what each one is.
import { $, h, clear, mountChrome, errorCard, statusPill, fmtDate, ago, plural, toast, LANES } from './app.js';
import { loadModel, fetchData } from './model.js';

const BS = String.fromCharCode(92); // backslash, for Windows-style paths
const main = $('#main');
const view = { q: '', kind: 'all', where: 'all' };
let model; let index; let drive;

const KINDS = [['all', 'Everything'], ['doc', 'Documents'], ['data', 'Data & sheets'], ['code', 'Code & web'], ['image', 'Images'], ['archive', 'Archives']];
const ICON = { dir: '📁', doc: '📄', data: '🗂', code: '🧩', image: '🖼', archive: '🗜', other: '📎' };

const getJSON = (name, fallback) => fetchData(name, fallback);

function fmtSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

/* ── helpers ── */
const winPath = (...parts) => ['Desktop', ...parts].join(BS);
function copyPath(rel) {
  const text = winPath(...rel.split('/'));
  const done = () => toast('Path copied');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => toast(text));
  else toast(text);
}

function walk(node, rel, fn) {
  fn(node, rel);
  for (const c of node.children || []) walk(c, `${rel}/${c.name}`, fn);
}

function matches(node, rel) {
  const q = view.q;
  const hay = `${node.name} ${node.note || ''}`.toLowerCase();
  const kindOk = (n) => view.kind === 'all' || n.kind === view.kind;
  if (node.type === 'file') return (!q || hay.includes(q)) && kindOk(node);
  if (view.kind === 'all' && q && hay.includes(q)) return true;
  if (!q && view.kind === 'all') return true;
  return (node.children || []).some((c) => matches(c, `${rel}/${c.name}`));
}

const filtering = () => !!view.q || view.kind !== 'all';

/* ── page ── */
function build() {
  const items = index.items;
  const dirs = items.filter((i) => i.type === 'dir');
  const totalFiles = items.reduce((n, i) => n + (i.files ?? 1), 0);
  const totalSize = items.reduce((n, i) => n + (i.size ?? 0), 0);
  const empties = dirs.filter((d) => d.empty);
  const newest = items.map((i) => i.modified).filter(Boolean).sort().pop();

  const search = h('input', { type: 'search', placeholder: 'Search file and folder names, and what they are…', 'aria-label': 'Search files', oninput: (e) => { view.q = e.target.value.toLowerCase().trim(); paintList(); } });
  const kindChips = KINDS.map(([k, label]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(view.kind === k), dataset: { k }, onclick: () => { view.kind = k; kindChips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.k === k))); paintList(); } }, label));
  const whereChips = [['all', 'All locations'], ...index.locations.map((l) => [l.label, l.label])].map(([v, label]) =>
    h('button', { class: 'chip', type: 'button', 'aria-pressed': String(view.where === v), dataset: { w: v }, onclick: () => { view.where = v; whereChips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.w === v))); paintList(); } }, label));

  clear(main).append(
    h('div', { class: 'page-head' }, h('div', {},
      h('h1', {}, 'Files'),
      h('p', { class: 'lede' }, `Everything in ${index.locations.map((l) => l.where).join(' and ')}, plus your Google Drive workspace — and what each thing is. Index built ${fmtDate(index.generated)}; it refreshes every 10 minutes while the dashboard runs.`))),
    h('div', { class: 'grid cols-4', style: 'margin-bottom:18px' },
      kpi('Project folders', dirs.length, empties.length ? `${empties.length} empty` : 'all in use'),
      kpi('Files', totalFiles.toLocaleString(), 'excl. dependencies'),
      kpi('Total size', fmtSize(totalSize), 'on this PC'),
      kpi('Last change', newest ? ago(newest) : '—', newest ? fmtDate(newest) : '')),
    startHere(),
    h('div', { class: 'row', style: 'margin:26px 0 14px' },
      h('div', { style: 'flex:1;min-width:240px;max-width:420px' }, search), h('div', { class: 'row' }, kindChips)),
    h('div', { class: 'row', style: 'margin-bottom:16px' }, whereChips, h('span', { class: 'spacer' }),
      h('button', { class: 'btn sm', type: 'button', onclick: () => document.querySelectorAll('details.folder-card').forEach((d) => { d.open = true; }) }, 'Expand all'),
      h('button', { class: 'btn sm', type: 'button', onclick: () => document.querySelectorAll('details').forEach((d) => { d.open = false; }) }, 'Collapse all')),
    h('div', { id: 'list', class: 'stack', style: 'gap:14px' }),
    driveSection());
  paintList();
}

function kpi(label, value, hint) {
  return h('div', { class: 'card kpi' }, h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), h('div', { class: 'hint' }, hint));
}

/* Key files across all projects: the “where do I start” list. */
function startHere() {
  const rows = [];
  for (const item of index.items) {
    walk(item, `${item.root}/${item.name}`, (n, rel) => { if (n.key) rows.push({ n, rel, item }); });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => (b.n.name === 'HANDOVER.md') - (a.n.name === 'HANDOVER.md')); // the handover always comes first
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Start here'), h('span', { class: 'sub' }, 'the one or two files that explain each project')),
    h('div', { class: 'stack', style: 'gap:0' }, rows.map(({ n, rel, item }) =>
      h('div', { class: 'file-row key' },
        h('span', { class: 'ico' }, ICON[n.type === 'dir' ? 'dir' : n.kind] || ICON.other),
        h('div', { class: 'grow' },
          h('div', {}, h('b', {}, n.name), ' ', h('span', { class: 'small muted' }, `· ${item.title}`)),
          n.note ? h('div', { class: 'small muted' }, n.note) : null,
          h('div', { class: 'small mono muted path' }, winPath(...rel.split('/')))),
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => copyPath(rel), 'aria-label': `Copy path of ${n.name}` }, 'Copy path')))));
}

function paintList() {
  const host = $('#list');
  clear(host);
  const laneRank = (i) => { const p = i.project ? model.byId.get(i.project) : null; if (i.project === '_archive') return 99; const k = LANES.findIndex((l) => l.id === p?.lane); return k < 0 ? 1 : k; };
  const dirs = index.items.filter((i) => i.type === 'dir' && (view.where === 'all' || i.root === view.where)).sort((a, b) => laneRank(a) - laneRank(b));
  const loose = index.items.filter((i) => i.type === 'file' && (view.where === 'all' || i.root === view.where));
  let shown = 0;
  for (const item of dirs) {
    const rel = `${item.root}/${item.name}`;
    const own = !filtering() || matches(item, rel) || (view.q && `${item.title} ${item.about || ''}`.toLowerCase().includes(view.q) && view.kind === 'all');
    if (!own) continue;
    shown++;
    host.append(folderCard(item, rel));
  }
  const looseShown = loose.filter((f) => matches(f, `${f.root}/${f.name}`));
  if (looseShown.length) {
    shown++;
    host.append(h('section', { class: 'card', style: 'padding:0;overflow:hidden' },
      h('header', { class: 'folder-head', style: 'cursor:default' }, h('div', { class: 'grow' }, h('h3', {}, 'Loose files'), h('div', { class: 'small muted' }, 'Sitting directly in the project roots, outside any project folder.'))),
      h('div', { class: 'tree' }, looseShown.map((f) => fileRow(f, `${f.root}/${f.name}`)))));
  }
  if (!shown) host.append(h('div', { class: 'card empty' }, 'Nothing matches that search.'));
}

function folderCard(item, rel) {
  const proj = item.project ? model.byId.get(item.project) : null;
  const d = h('details', { class: 'card folder-card', dataset: { rel }, open: filtering() || null });
  d.append(h('summary', { class: 'folder-head' },
    h('span', { class: 'ico' }, '📁'),
    h('div', { class: 'grow' },
      h('div', { class: 'row' }, h('h3', {}, item.title),
        h('span', { class: 'pill plain' }, item.root),
        item.empty ? h('span', { class: 'pill plain warn' }, 'Empty') : null,
        proj ? statusPill(proj.status) : null,
        proj?.lane === 'dead' ? h('span', { class: 'pill plain bad' }, 'Scrapped — safe to ignore') : null,
        proj?.lane === 'hold' ? h('span', { class: 'pill plain warn' }, 'On hold — don’t read unless resuming') : null),
      item.about ? h('div', { class: 'small muted', style: 'margin-top:4px' }, item.about) : null,
      h('div', { class: 'meta-row', style: 'margin-top:6px' },
        h('span', {}, h('b', {}, (item.files ?? 0).toLocaleString()), ' files'), h('span', {}, h('b', {}, fmtSize(item.size))),
        item.modified ? h('span', {}, 'changed ', h('b', {}, ago(item.modified))) : null,
        proj ? h('a', { href: `projects.html#${encodeURIComponent(proj.id)}`, onclick: (e) => e.stopPropagation() }, 'Project status →') : null))));
  if (item.empty) {
    d.append(h('div', { class: 'tree' }, h('div', { class: 'small muted', style: 'padding:6px 4px' }, 'Nothing has been saved in this folder yet.')));
  } else {
    d.append(h('div', { class: 'tree' },
      h('div', { class: 'row', style: 'padding:2px 4px 8px' }, h('span', { class: 'mono small muted path' }, winPath(...rel.split('/'))), h('button', { class: 'btn sm ghost', type: 'button', onclick: () => copyPath(rel) }, 'Copy path')),
      treeChildren(item, rel, 1)));
  }
  return d;
}

function treeChildren(node, rel, depth) {
  const kids = (node.children || []).filter((c) => matches(c, `${rel}/${c.name}`));
  const out = kids.map((c) => (c.type === 'dir' ? dirRow(c, `${rel}/${c.name}`, depth) : fileRow(c, `${rel}/${c.name}`)));
  if (node.more && !filtering()) out.push(h('div', { class: 'small muted', style: 'padding:4px 8px' }, `… and ${plural(node.more, 'more item')} not listed`));
  return h('div', { class: 'tree-level' }, out);
}

function dirRow(node, rel, depth) {
  if (!node.children || !node.children.length) {
    return h('div', { class: 'file-row' + (node.key ? ' key' : '') },
      h('span', { class: 'ico' }, ICON.dir),
      h('div', { class: 'grow' }, h('div', {}, h('b', {}, node.name), node.skipped ? h('span', { class: 'pill plain', style: 'margin-left:8px' }, 'dependencies — not listed') : null),
        node.note ? h('div', { class: 'small muted' }, node.note) : null,
        h('div', { class: 'small muted' }, node.skipped ? '' : `${(node.files ?? 0).toLocaleString()} files · ${fmtSize(node.size)}${node.files > 0 ? ' · contents not expanded' : ''}`)),
      node.modified ? h('span', { class: 'small muted nowrap' }, fmtDate(node.modified, { day: 'numeric', month: 'short' })) : null);
  }
  return h('details', { class: 'sub-folder', open: filtering() || null },
    h('summary', { class: 'file-row' + (node.key ? ' key' : '') },
      h('span', { class: 'ico' }, ICON.dir),
      h('div', { class: 'grow' }, h('div', {}, h('b', {}, node.name), h('span', { class: 'small muted', style: 'margin-left:8px' }, `${(node.files ?? 0).toLocaleString()} files · ${fmtSize(node.size)}`)),
        node.note ? h('div', { class: 'small muted' }, node.note) : null),
      node.modified ? h('span', { class: 'small muted nowrap' }, fmtDate(node.modified, { day: 'numeric', month: 'short' })) : null,
      h('button', { class: 'btn sm ghost', type: 'button', onclick: (e) => { e.preventDefault(); e.stopPropagation(); copyPath(rel); }, 'aria-label': `Copy path of ${node.name}` }, 'Copy path')),
    treeChildren(node, rel, depth + 1));
}

function fileRow(node, rel) {
  return h('div', { class: 'file-row' + (node.key ? ' key' : '') },
    h('span', { class: 'ico' }, ICON[node.kind] || ICON.other),
    h('div', { class: 'grow' }, h('div', {}, node.key ? h('b', {}, node.name) : node.name, h('span', { class: 'small muted', style: 'margin-left:8px' }, fmtSize(node.size))),
      (node.note || node.about) ? h('div', { class: 'small muted' }, node.note || node.about) : null),
    node.modified ? h('span', { class: 'small muted nowrap' }, fmtDate(node.modified, { day: 'numeric', month: 'short' })) : null,
    h('button', { class: 'btn sm ghost', type: 'button', onclick: () => copyPath(rel), 'aria-label': `Copy path of ${node.name}` }, 'Copy path'));
}

/* ── Google Drive map ── */
function driveSection() {
  if (!drive) return null;
  const q = view.q;
  const typeIcon = { doc: '📄', data: '🗂', folder: '📁' };
  const item = (it) => h('div', { class: 'file-row' + (it.key ? ' key' : '') },
    h('span', { class: 'ico' }, typeIcon[it.type] || ICON.other),
    h('div', { class: 'grow' }, h('div', {}, h('a', { href: it.url, target: '_blank', rel: 'noopener' }, it.title)), it.about ? h('div', { class: 'small muted' }, it.about) : null),
    it.modified ? h('span', { class: 'small muted nowrap' }, fmtDate(it.modified, { day: 'numeric', month: 'short' })) : null);
  return h('section', { id: 'drive', style: 'margin-top:44px' },
    h('div', { class: 'page-head', style: 'margin-bottom:14px' }, h('div', {},
      h('h2', {}, 'Google Drive — AI Workspace'),
      h('p', { class: 'lede' }, drive.root.about)),
      h('a', { class: 'btn', href: drive.root.url, target: '_blank', rel: 'noopener' }, 'Open in Drive ↗')),
    h('div', { class: 'grid cols-2' }, [
      h('div', { class: 'card flat' }, h('h3', { style: 'margin-bottom:8px' }, 'Top level'), drive.files.map(item)),
      ...drive.folders.map((f) => h('div', { class: 'card flat' },
        h('div', { class: 'row between' }, h('h3', {}, h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.title)), h('span', { class: 'small muted' }, f.items.length ? plural(f.items.length, 'item') : '')),
        h('p', { class: 'small muted', style: 'margin:4px 0 8px' }, f.about), f.items.map(item))),
    ]));
}

/* ── start (kept last so every helper above is initialised first) ── */
try {
  model = await loadModel();
  mountChrome(model.config);
  index = await getJSON('files-index.json', null);
  drive = await getJSON('drive-index.json', null);
  if (!index) throw new Error('The file index is missing. Run: python scripts/scan-files.py');
  build();
  const target = decodeURIComponent(location.hash.slice(1));
  if (target) {
    const el = target === 'drive' ? $('#drive') : [...document.querySelectorAll('details.folder-card')].find((d) => d.dataset.rel === target);
    if (el) { if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -76); }
  }
} catch (err) {
  mountChrome({});
  clear(main).append(errorCard('The file index couldn’t load.', err.message));
}
