import { $, h, clear, mountChrome, errorCard, toast, downloadJSON, today, fmtDate, ago, store, plural } from './app.js';
import { loadModel, PROFILE_KEY, saveData } from './model.js';

const main = $('#main');
let model;
let profile;      // what is currently displayed (published file, or the locally saved version)
let draft = null; // deep copy while editing
const HORIZONS = [['now', 'Now'], ['next', 'Next few months'], ['later', 'Longer term']];
const LISTS = [
  ['style', 'How I work', 'Habits and tendencies that show up in how you build.'],
  ['values', 'What I value', 'The things you won’t trade away.'],
  ['energizers', 'What energizes me', 'Add a few — this is the part only you can fill in.'],
  ['drains', 'What drains me', 'Friction worth designing around.'],
  ['constraints', 'Constraints I work within', 'Money, time, devices, circumstances.'],
];

const clone = (o) => JSON.parse(JSON.stringify(o));
const cur = () => draft || profile;

function paint() {
  const editing = !!draft;
  const p = cur();
  clear(main);

  const editUrl = model.config.owner?.github
    ? `https://github.com/${model.config.owner.github}/${model.config.repo}/edit/${model.config.branch || 'main'}/data/profile.json` : null;

  // header
  main.append(h('section', { class: 'card', style: 'margin-bottom:18px' },
    h('div', { class: 'profile-hero' },
      h('div', { class: 'avatar', 'aria-hidden': 'true' }, (p.name || '?').slice(0, 1).toUpperCase()),
      h('div', { class: 'stack', style: 'gap:8px' },
        editing ? field('Name', input(p, 'name')) : h('h1', {}, p.name),
        editing ? field('Headline', input(p, 'headline')) : h('p', { style: 'font-size:1.1rem' }, p.headline),
        h('div', { class: 'row small muted' }, h('span', {}, `Last updated ${fmtDate(p.updated)}`), h('span', {}, '·'), h('span', {}, plural((p.history || []).length, 'revision')))),
      ),
    h('div', { class: 'row', style: 'margin-top:18px' },
      editing ? [h('button', { class: 'btn primary', type: 'button', onclick: save }, 'Save changes'), h('button', { class: 'btn', type: 'button', onclick: () => { draft = null; paint(); } }, 'Cancel')]
        : [h('button', { class: 'btn primary', type: 'button', onclick: () => { draft = clone(profile); paint(); } }, 'Edit profile'),
          h('button', { class: 'btn', type: 'button', onclick: () => $('#checkin').toggleAttribute('hidden') }, 'Monthly check-in')],
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', type: 'button', onclick: () => { downloadJSON('profile.json', cur()); toast('Exported profile.json'); } }, 'Export profile.json'),
      editUrl ? h('a', { class: 'btn', href: editUrl, target: '_blank', rel: 'noopener' }, 'Edit on GitHub ↗') : null)));

  if (model.profileIsLocal && !editing) {
    main.append(h('div', { class: 'callout warn', style: 'margin-bottom:18px' }, h('span', { class: 'icon' }, '💾'),
      h('div', { style: 'flex:1' }, h('b', {}, 'You’re viewing a version saved only in this browser.'),
        h('div', { class: 'small' }, 'Export it and replace data/profile.json, then commit, to make it permanent (or ask Claude to apply it).'),
        h('div', { class: 'row', style: 'margin-top:8px' },
          h('button', { class: 'btn sm danger', type: 'button', onclick: () => { if (confirm('Throw away the browser-only version and go back to the published profile?')) { store.remove(PROFILE_KEY); profile = model.publishedProfile; paint(); toast('Reverted to published profile'); } } }, 'Revert to published')))));
  }

  if (editing) {
    main.append(h('div', { class: 'callout editing-banner', style: 'margin-bottom:18px', role: 'status' }, h('span', { class: 'icon' }, '✎'),
      h('div', { style: 'flex:1' }, h('b', {}, 'Editing'), h('div', { class: 'small' }, 'Changes aren’t saved until you press “Save changes”. You’ll be asked to note what changed, so the history stays honest.'))));
  }

  main.append(checkinForm());

  main.append(h('div', { class: 'stack', style: 'gap:18px' },
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'In a paragraph')),
      editing ? h('div', { class: 'stack' }, h('textarea', { rows: 5, 'aria-label': 'Summary', oninput: (e) => { p.summary = e.target.value; } }, p.summary),
        field('How confident is this profile?', input(p, 'confidence')))
        : h('div', { class: 'stack' }, h('p', {}, p.summary), p.confidence ? h('p', { class: 'small muted' }, h('b', {}, 'Confidence: '), p.confidence) : null)),
    interestsCard(p, editing),
    directionsCard(p, editing),
    h('div', { class: 'grid cols-2' }, LISTS.map(([key, title, hint]) => listCard(p, key, title, hint, editing))),
    editing ? null : signalsCard(p),
    editing ? null : attentionCard(),
    historyCard(p)));
}

/* ── small form helpers ── */
function field(label, control) { return h('label', { class: 'field' }, label, control); }
function input(obj, key, type = 'text') { return h('input', { type, value: obj[key] ?? '', oninput: (e) => { obj[key] = e.target.value; } }); }

/* ── interests ── */
function interestsCard(p, editing) {
  const items = editing ? p.interests : p.interests.slice().sort((a, b) => b.level - a.level);
  const card = h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Interests'), h('span', { class: 'sub' }, 'strength 1–5 · direction of travel')));
  if (!items.length) card.append(h('div', { class: 'empty' }, 'No interests yet.'));
  items.forEach((it, idx) => {
    if (!editing) {
      card.append(h('div', { class: 'interest' },
        h('div', {}, h('div', { class: 'name' }, it.name), it.note ? h('div', { class: 'note' }, it.note) : null,
          it.evidence?.length ? h('div', { class: 'tags', style: 'margin-top:6px' }, it.evidence.map((id) => { const proj = model.byId.get(id); return proj ? h('a', { class: 'tag link', href: `projects.html#${encodeURIComponent(id)}` }, proj.name) : null; })) : null),
        h('div', { class: 'meter', role: 'img', 'aria-label': `Strength ${it.level} of 5` }, [1, 2, 3, 4, 5].map((n) => h('i', { class: n <= it.level ? 'on' : '' }))),
        h('span', { class: `trend ${it.trend}` }, { rising: '↗ Rising', steady: '→ Steady', fading: '↘ Fading' }[it.trend] || it.trend)));
    } else {
      card.append(h('div', { class: 'edit-grid', style: 'margin-bottom:10px' },
        h('div', { class: 'edit-row' }, field('Interest', input(it, 'name')), h('button', { class: 'btn sm danger', type: 'button', style: 'margin-top:20px', 'aria-label': 'Remove interest', onclick: () => { p.interests.splice(idx, 1); paint(); } }, 'Remove')),
        h('div', { class: 'grid cols-2' },
          field(`Strength: ${it.level}`, h('input', { type: 'range', min: 1, max: 5, value: it.level, oninput: (e) => { it.level = Number(e.target.value); e.target.parentElement.firstChild.textContent = `Strength: ${it.level}`; } })),
          field('Trend', h('select', { onchange: (e) => { it.trend = e.target.value; } }, ['rising', 'steady', 'fading'].map((t) => h('option', { value: t, selected: t === it.trend || null }, t))))),
        field('Note', input(it, 'note'))));
    }
  });
  if (editing) card.append(h('button', { class: 'btn', type: 'button', onclick: () => { p.interests.push({ name: '', level: 3, trend: 'rising', evidence: [], note: '' }); paint(); } }, '+ Add interest'));
  return card;
}

/* ── directions ── */
function directionsCard(p, editing) {
  const card = h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Directions'), h('span', { class: 'sub' }, 'where you’re heading')));
  if (!editing) {
    card.append(h('div', { class: 'grid cols-3' }, HORIZONS.map(([key, label]) => {
      const list = (p.directions || []).filter((d) => d.horizon === key);
      return h('div', { class: 'horizon' }, h('h3', {}, label),
        list.length ? list.map((d) => h('div', { class: 'direction' }, h('div', { class: 'row between' }, h('b', {}, d.title), h('span', { class: 'pill plain' + (d.status === 'active' ? ' ok' : '') }, d.status)), d.why ? h('div', { class: 'why' }, d.why) : null))
          : h('div', { class: 'small muted' }, 'Nothing here yet.'));
    })));
    return card;
  }
  (p.directions ||= []).forEach((d, idx) => {
    card.append(h('div', { class: 'edit-grid', style: 'margin-bottom:10px' },
      h('div', { class: 'edit-row' }, field('Direction', input(d, 'title')), h('button', { class: 'btn sm danger', type: 'button', style: 'margin-top:20px', onclick: () => { p.directions.splice(idx, 1); paint(); } }, 'Remove')),
      h('div', { class: 'grid cols-2' },
        field('Horizon', h('select', { onchange: (e) => { d.horizon = e.target.value; } }, HORIZONS.map(([v, l]) => h('option', { value: v, selected: v === d.horizon || null }, l)))),
        field('Status', h('select', { onchange: (e) => { d.status = e.target.value; } }, ['active', 'exploring', 'parked', 'done'].map((v) => h('option', { value: v, selected: v === d.status || null }, v))))),
      field('Why it matters', input(d, 'why'))));
  });
  card.append(h('button', { class: 'btn', type: 'button', onclick: () => { p.directions.push({ title: '', horizon: 'now', status: 'exploring', why: '' }); paint(); } }, '+ Add direction'));
  return card;
}

/* ── plain lists ── */
function listCard(p, key, title, hint, editing) {
  const list = (p[key] ||= []);
  const card = h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, title)));
  if (!editing) {
    card.append(list.length ? h('ul', { class: 'bullets' }, list.map((t) => h('li', {}, t))) : h('p', { class: 'small muted' }, hint));
    return card;
  }
  list.forEach((t, i) => card.append(h('div', { class: 'edit-row', style: 'margin-bottom:8px' },
    h('input', { type: 'text', value: t, 'aria-label': title, oninput: (e) => { list[i] = e.target.value; } }),
    h('button', { class: 'btn sm danger', type: 'button', 'aria-label': 'Remove', onclick: () => { list.splice(i, 1); paint(); } }, '✕'))));
  card.append(h('button', { class: 'btn sm', type: 'button', onclick: () => { list.push(''); paint(); } }, '+ Add'));
  return card;
}

/* ── derived: where the projects say your interests are ── */
const stem = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
const tokens = (text) => text.split(/[\s/+,()\-–—]+/).map(stem).filter((w) => w.length >= 4);

function signalsCard(p) {
  const counts = new Map();
  for (const proj of model.curated.filter((x) => x.lane !== 'dead')) for (const t of new Set(proj.tags)) counts.set(t, (counts.get(t) || 0) + 1);
  const known = new Set(p.interests.flatMap((i) => tokens(`${i.name} ${i.note || ''}`)));
  const rows = [...counts].map(([tag, n]) => ({ tag, n, covered: tokens(tag).some((w) => known.has(w)) })).sort((a, b) => b.n - a.n);
  const gaps = rows.filter((r) => !r.covered);
  const max = Math.max(...rows.map((r) => r.n), 1);
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'What your projects say'), h('span', { class: 'sub' }, 'themes across your tracked projects vs. this profile')),
    rows.length ? rows.map((r) => h('div', { class: 'bar-row' }, h('span', {}, r.tag), h('div', { class: 'bar' }, h('i', { style: `width:${(r.n / max) * 100}%` })),
      h('span', { class: 'small ' + (r.covered ? 'muted' : ''), style: r.covered ? '' : 'color:var(--warn);font-weight:600' }, r.covered ? `${r.n} ✓` : `${r.n} · missing`)))
      : h('div', { class: 'empty' }, 'Add tags to projects to see themes.'),
    gaps.length ? h('div', { class: 'callout', style: 'margin-top:14px' }, h('span', { class: 'icon' }, '💡'),
      h('div', {}, h('b', {}, 'Possible blind spots'),
        h('div', { class: 'small' }, 'These themes show up in your work but aren’t reflected in your interests. Real interest, or just incidental?'),
        h('div', { class: 'tags', style: 'margin-top:8px' }, gaps.map((g) => h('button', { class: 'chip', type: 'button', title: 'Add as an interest', onclick: () => addInterest(g.tag) }, `+ ${g.tag}`))))) : null);
}

function addInterest(name) {
  const next = clone(profile);
  next.interests.push({ name, level: 2, trend: 'rising', evidence: model.curated.filter((x) => x.lane !== 'dead' && x.tags.includes(name)).map((x) => x.id), note: 'Added from project signals — adjust the strength once you know if it’s real.' });
  commit(next, `Added interest “${name}”`, 'Surfaced by the project-signals check.');
}

function attentionCard() {
  const rows = model.projects.filter((p) => p.lane === 'current').map((p) => ({ p, load: p.openTasks })).sort((a, b) => b.load - a.load);
  const max = Math.max(...rows.map((r) => r.load), 1);
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Where your attention is piling up'), h('span', { class: 'sub' }, 'open tasks per current project')),
    rows.map(({ p, load }) => h('div', { class: 'bar-row' }, h('a', { href: `projects.html#${encodeURIComponent(p.id)}` }, p.name), h('div', { class: 'bar' }, h('i', { style: `width:${(load / max) * 100}%` })), h('span', { class: 'small muted' }, `${load} · ${ago(p.lastActivity)}`))),
    h('p', { class: 'small muted', style: 'margin-top:10px' }, 'A project with lots of open tasks and a long quiet spell is either waiting on a decision, or a sign your interest has moved. Both are worth noticing.'));
}

function historyCard(p) {
  const list = (p.history || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Revision history'), h('span', { class: 'sub' }, 'how your profile has changed')),
    list.length ? h('ul', { class: 'timeline' }, list.map((e) => h('li', {}, h('b', {}, e.change), e.reason ? h('div', { class: 'small muted' }, e.reason) : null, h('time', {}, fmtDate(e.date))))) : h('div', { class: 'empty' }, 'No revisions yet.'));
}

/* ── check-in ── */
function checkinForm() {
  const energy = h('textarea', { rows: 2, placeholder: 'e.g. Seeing the app run on my own phone' });
  const drain = h('textarea', { rows: 2, placeholder: 'e.g. Waiting on an account approval' });
  const newInterest = h('input', { type: 'text', placeholder: 'e.g. Voice interfaces' });
  const focus = h('input', { type: 'text', placeholder: 'e.g. Ship a first beta of my app' });
  const note = h('input', { type: 'text', placeholder: 'Anything else worth recording?' });
  return h('form', { id: 'checkin', class: 'card', hidden: true, style: 'margin-bottom:18px', onsubmit: (e) => {
    e.preventDefault();
    const next = clone(profile); const bits = [];
    const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
    const add = (key, values, label) => { if (values.length) { next[key] = [...(next[key] || []), ...values]; bits.push(`${label}: ${values.join('; ')}`); } };
    add('energizers', lines(energy.value), 'energizing');
    add('drains', lines(drain.value), 'draining');
    if (newInterest.value.trim()) { next.interests.push({ name: newInterest.value.trim(), level: 3, trend: 'rising', evidence: [], note: 'Added at a check-in.' }); bits.push(`new interest: ${newInterest.value.trim()}`); }
    if (focus.value.trim()) { (next.directions ||= []).push({ title: focus.value.trim(), horizon: 'now', status: 'active', why: 'Named at a check-in.' }); bits.push(`new focus: ${focus.value.trim()}`); }
    if (note.value.trim()) bits.push(note.value.trim());
    if (!bits.length) { toast('Nothing to record yet'); return; }
    commit(next, 'Check-in', bits.join(' · '));
  } },
    h('div', { class: 'card-head' }, h('h2', {}, 'Check-in'), h('span', { class: 'sub' }, '2 minutes. Fill in only what’s true right now.')),
    h('div', { class: 'grid cols-2' },
      field('What’s energizing you? (one per line)', energy), field('What’s draining you? (one per line)', drain),
      field('Something new you’re into', newInterest), field('A new focus for right now', focus)),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('div', { style: 'flex:1;min-width:220px' }, field('Note', note)), h('button', { class: 'btn primary', type: 'submit', style: 'margin-top:18px' }, 'Record check-in')));
}

/* ── saving ── */
function commit(next, change, reason) {
  next.updated = today();
  next.history = [...(next.history || []), { date: today(), change, reason }];
  store.set(PROFILE_KEY, next);
  profile = next; draft = null; model.profileIsLocal = true;
  paint();
  // Prefer writing straight to data/profile.json; fall back to browser-only if the local server isn't there.
  saveData('profile.json', next).then((ok) => {
    if (ok) { store.remove(PROFILE_KEY); model.profileIsLocal = false; model.publishedProfile = next; paint(); toast('Saved to data/profile.json'); }
    else toast('Saved in this browser only — export to make it permanent');
  });
}

function save() {
  const reason = prompt('What changed, and why? (this goes in the revision history)', '');
  if (reason === null) return;
  draft.interests = draft.interests.filter((i) => i.name.trim());
  draft.directions = (draft.directions || []).filter((d) => d.title.trim());
  for (const [key] of LISTS) draft[key] = (draft[key] || []).map((x) => x.trim()).filter(Boolean);
  commit(draft, 'Edited profile', reason.trim() || 'No reason given.');
}

/* ── start (kept last so every helper above is initialised first) ── */
try {
  model = await loadModel();
  mountChrome(model.config);
  profile = model.profile;
  paint();
} catch (err) {
  mountChrome({});
  clear(main).append(errorCard('The profile couldn’t load.', err.message));
}
