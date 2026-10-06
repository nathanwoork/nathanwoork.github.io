/* NeatRelay operations workspace. No network requests, dependencies or remote writes. */
(() => {
  'use strict';
  const STORAGE_KEY = 'neatrelay-workspace-v1';
  const STATUS = { planned: 'Planned', ready: 'Ready', 'in-progress': 'In progress', blocked: 'Blocked', done: 'Done' };
  const PRIORITIES = ['high', 'medium', 'low'];
  const VIEWS = { overview: 'Overview', board: 'Board', plan: '30-day plan', services: 'Services', people: 'People & learning', strategy: 'Brand & strategy' };
  const ICONS = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16M5.5 8h1M11.5 8h1M17.5 8h1M5.5 12h1M11.5 12h1"/>',
    plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M13 14h2M7 17h2"/>',
    services: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>',
    strategy: '<path d="M12 3v18M3 12h18M5.5 5.5l13 13m-13 0 13-13"/><circle cx="12" cy="12" r="5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flag: '<path d="M5 21V3m0 1h13l-3 4 3 4H5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    external: '<path d="M14 3h7v7m0-7-11 11M10 3H3v18h18v-7"/>'
  };
  const $ = (selector, context = document) => context.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const text = (value, fallback = '') => typeof value === 'string' ? value : (typeof value === 'number' ? String(value) : fallback);
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.overview}</svg>`;
  const array = (value) => Array.isArray(value) ? value : [];
  const list = (value) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : []).filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim().replace(/^[-•]\s*/, ''));
  const safeUrl = (value) => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
  };
  const validId = (id) => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/.test(id) && !['constructor', 'prototype', '__proto__'].includes(id);
  const weekValue = (value) => [1, 2, 3, 4].includes(Number(value)) ? Number(value) : 'future';
  const weekLabel = (value) => weekValue(value) === 'future' ? 'Later' : `Week ${Number(value)}`;
  const external = (url, label, classes = 'small-link') => safeUrl(url) ? `<a class="${classes}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ${icon('external')}</a>` : '';
  const source = window.PROJECT_DATA && typeof window.PROJECT_DATA === 'object' && !Array.isArray(window.PROJECT_DATA) ? window.PROJECT_DATA : null;
  const data = source || {};
  const brand = data.brand && typeof data.brand === 'object' ? data.brand : {};
  const brandName = text(brand.name, 'NeatRelay');
  const streams = array(data.workstreams).filter((s) => s && validId(s.id)).map((s) => ({ ...s, name: text(s.name, s.id), summary: text(s.summary) }));
  const seenIds = new Set();
  const seedTasks = array(data.tasks).filter((t) => {
    if (!t || !validId(t.id) || seenIds.has(t.id) || typeof t.title !== 'string') return false;
    seenIds.add(t.id); return true;
  }).map((t) => normalizeTask(t));
  let state = freshState();
  let storageAvailable = true;
  let storageNotice = '';
  let toastTimer;
  let confirmCallback = null;
  let returnFocus = null;
  let activeView = Object.hasOwn(VIEWS, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  let filters = { search: '', status: 'all', workstream: 'all' };

  function freshState() { return { version: 1, updatedAt: null, overrides: {}, customTasks: [] }; }
  function normalizeTask(t) {
    return { id: t.id, title: text(t.title), workstream: text(t.workstream, 'general'), status: Object.hasOwn(STATUS, t.status) ? t.status : 'planned', week: weekValue(t.week), priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium', owner: text(t.owner, 'Nathan'), description: text(t.description), acceptance: list(t.acceptance), dependencies: array(t.dependencies).filter(validId), trelloUrl: safeUrl(t.trelloUrl), estimatedHours: typeof t.estimatedHours === 'number' && t.estimatedHours >= 0 && Number.isFinite(t.estimatedHours) ? t.estimatedHours : null, local: !!t.local };
  }
  function validateState(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1) throw new Error('Choose a NeatRelay workspace export with version 1.');
    if (!Array.isArray(input.customTasks) || input.customTasks.length > 300) throw new Error('The file must contain a customTasks list with no more than 300 tasks.');
    if (!input.overrides || typeof input.overrides !== 'object' || Array.isArray(input.overrides) || Object.keys(input.overrides).length > 1000) throw new Error('The task updates in this file are invalid or too large.');
    const result = freshState();
    const ids = new Set();
    for (const task of input.customTasks) {
      if (!task || typeof task !== 'object' || !validId(task.id) || seenIds.has(task.id) || ids.has(task.id)) throw new Error('Every custom task needs a unique valid ID, separate from the project tasks.');
      if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 180) throw new Error('Task titles must be 1–180 characters.');
      if (!Object.hasOwn(STATUS, task.status) || !PRIORITIES.includes(task.priority) || ![1, 2, 3, 4, 'future'].includes(task.week)) throw new Error('A task has an unsupported status, priority or week.');
      for (const [field, limit] of [['owner', 100], ['workstream', 100], ['description', 10000]]) if (typeof task[field] !== 'string' || task[field].length > limit) throw new Error(`A task has an invalid ${field}.`);
      if (!Array.isArray(task.acceptance) || task.acceptance.length > 100 || task.acceptance.some((s) => typeof s !== 'string' || s.length > 2000)) throw new Error('A task acceptance checklist is invalid.');
      if (!Array.isArray(task.dependencies) || task.dependencies.length > 100 || task.dependencies.some((id) => !validId(id))) throw new Error('A task dependency list is invalid.');
      result.customTasks.push(normalizeTask({ ...task, local: true })); ids.add(task.id);
    }
    for (const [id, update] of Object.entries(input.overrides)) {
      if (!validId(id) || !update || typeof update !== 'object' || Array.isArray(update) || !Object.hasOwn(STATUS, update.status) || typeof update.notes !== 'string' || update.notes.length > 20000) throw new Error('A saved task update has an invalid ID, status or note.');
      result.overrides[id] = { status: update.status, notes: update.notes };
    }
    result.updatedAt = typeof input.updatedAt === 'string' && Number.isFinite(Date.parse(input.updatedAt)) ? input.updatedAt : null;
    return result;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = validateState(JSON.parse(saved));
  } catch (error) {
    storageNotice = 'Saved local data could not be loaded. The project plan is shown below. Export anything you need before resetting this workspace.';
    try { localStorage.setItem(`${STORAGE_KEY}-test`, '1'); localStorage.removeItem(`${STORAGE_KEY}-test`); } catch { storageAvailable = false; storageNotice = 'Browser storage is unavailable. Changes last only for this visit; export JSON before leaving.'; }
  }
  function persist() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; return true; }
    catch { storageAvailable = false; storageNotice = 'Browser storage is unavailable. Changes last only for this visit; export JSON before leaving.'; notify('Changes are in memory only. Export JSON to keep them.'); return false; }
  }
  function tasks() { return [...seedTasks, ...state.customTasks].map((t) => ({ ...t, status: state.overrides[t.id]?.status || t.status, notes: state.overrides[t.id]?.notes || '' })); }
  function streamName(id) { return streams.find((s) => s.id === id)?.name || (id === 'general' ? 'General' : id || 'General'); }
  function statusBadge(status) { return `<span class="status-badge status-${esc(status)}">${esc(STATUS[status] || status)}</span>`; }
  function priorityBadge(priority) { return `<span class="priority-badge priority-${esc(priority)}">${esc(priority[0].toUpperCase() + priority.slice(1))}</span>`; }
  function avatar(owner) { return `<span class="avatar" title="${esc(owner)}" aria-label="${esc(owner)}">${esc(owner.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || 'N')}</span>`; }
  function noticeHtml() {
    return (!source ? '<div class="missing-data" role="status"><strong>The project plan is not connected yet.</strong>Add the provided project-data.js beside this page, then refresh. You can still create browser-local tasks. No sample customers or activity have been added.</div>' : '') + (storageNotice ? `<div class="missing-data" role="status">${esc(storageNotice)}</div>` : '');
  }
  function pageHeading(kicker, title, description, link = '') { return `<div class="page-heading"><div><span class="eyebrow">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${link}</div>`; }
  function empty(title = 'A little room to begin.', detail = 'There are no tasks in this view yet.', button = false) { return `<div class="empty-state"><h3>${esc(title)}</h3><p>${esc(detail)}</p>${button ? '<button class="button button-primary" data-action="add-task" type="button">Create a task</button>' : ''}</div>`; }
  function listTask(t) { return `<button class="list-task" type="button" data-action="task" data-id="${esc(t.id)}"><span class="task-check ${esc(t.status)}" aria-hidden="true">${t.status === 'done' ? '✓' : t.status === 'in-progress' ? '·' : t.status === 'blocked' ? '!' : ''}</span><span class="list-task-main"><span class="list-task-title">${esc(t.title)}</span><span class="list-task-meta">${esc(streamName(t.workstream))} <span aria-hidden="true">·</span> ${weekLabel(t.week)} <span aria-hidden="true">·</span> ${esc(STATUS[t.status])}</span></span><span class="list-task-arrow" aria-hidden="true">↗</span></button>`; }
  function taskCard(t) { return `<button class="task-card" type="button" data-action="task" data-id="${esc(t.id)}" aria-label="${esc(t.title)}, ${esc(STATUS[t.status])}"><span class="task-card-top"><span class="task-card-stream">${esc(streamName(t.workstream))}</span>${priorityBadge(t.priority)}</span><h3>${esc(t.title)}</h3>${t.description ? `<p>${esc(t.description)}</p>` : ''}<span class="task-card-footer"><span>${weekLabel(t.week)}${t.local ? ' · Local task' : ''}${t.notes ? ' · Note' : ''}</span>${avatar(t.owner)}</span></button>`; }

  function renderNavigation() {
    $('#navigation').innerHTML = Object.entries(VIEWS).map(([id, title]) => `<a class="nav-link ${activeView === id ? 'active' : ''}" href="#${id}"${activeView === id ? ' aria-current="page"' : ''}>${icon(id)}<span>${esc(title)}</span>${id === 'board' ? `<span class="nav-count">${tasks().length}</span>` : ''}</a>`).join('');
    $('#current-page').textContent = VIEWS[activeView];
    document.title = `${brandName} · ${VIEWS[activeView]}`;
    $('.brand-name').textContent = brandName;
    const date = text(data.asOf);
    $('#data-date').textContent = date ? `Plan · ${date}` : 'Local planning workspace';
  }
  function renderOverview() {
    const all = tasks();
    const counts = Object.fromEntries(Object.keys(STATUS).map((s) => [s, all.filter((t) => t.status === s).length]));
    const queue = all.filter((t) => t.status !== 'done' && t.status !== 'blocked').sort((a, b) => {
      const rank = { 'in-progress': 0, ready: 1, planned: 2 };
      return rank[a.status] - rank[b.status] || (Number(a.week) || 99) - (Number(b.week) || 99) || PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    }).slice(0, 5);
    const streamRows = streams.map((s) => {
      const own = all.filter((t) => t.workstream === s.id), done = own.filter((t) => t.status === 'done').length;
      return `<div class="workstream-item"><div class="workstream-top"><strong>${esc(s.name)}</strong><span>${done} / ${own.length} done</span></div><div class="progress-bar" role="progressbar" aria-label="${esc(s.name)} complete" aria-valuemin="0" aria-valuemax="${Math.max(1, own.length)}" aria-valuenow="${done}"><span style="width:${own.length ? done / own.length * 100 : 0}%"></span></div><p>${esc(s.summary)}</p></div>`;
    }).join('');
    return pageHeading('A CLEARER WAY TO WORK', 'Make room for the work that matters.', 'Your first month, in one place. Shape the offer, build the system, and decide what deserves your attention.', external(data.trelloUrl, 'Open Trello')) +
      `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><span class="eyebrow">${esc(brandName.toUpperCase())} / THE FIRST CHAPTER</span><h2 id="hero-title">${esc(text(brand.tagline, 'Less chasing. Clearer work.'))}</h2><p>A practical home for the decisions, small experiments and steady follow-through that build your workflow consultancy.</p><div class="hero-actions"><a class="button" href="#plan">Explore your 30-day plan ${icon('arrow')}</a><a class="small-link" href="#strategy">The bigger picture ↗</a></div></div><div class="relay-art" aria-hidden="true"><div class="relay-flow"><div class="relay-node"><i></i><b>01</b><span>MAKE CLEAR</span></div><span class="relay-line"></span><div class="relay-node"><i></i><b>02</b><span>MAKE IT WORK</span></div><span class="relay-line"></span><div class="relay-node"><i></i><b>03</b><span>KEEP IT NEAT</span></div></div><span class="hero-art-label">A THOUGHTFUL HANDOFF, EVERY TIME.</span></div></section>` +
      `<section class="stats-grid" aria-label="Task summary">${[
        ['Tasks in the plan', all.length, 'Across every workstream', 'board', ''], ['In progress', counts['in-progress'], 'Currently being worked on', 'clock', ''], ['Completed', counts.done, all.length ? `${Math.round(counts.done / all.length * 100)}% of the plan complete` : 'No tasks completed yet', 'check', 'stat-done'], ['Needs attention', counts.blocked, 'Tasks marked as blocked', 'flag', '']
      ].map(([label, value, sub, name, cls]) => `<div class="stat-card ${cls}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(name)}</span></div><strong>${value}</strong><small>${sub}</small></div>`).join('')}</section>` +
      `<div class="overview-grid"><section class="panel"><div class="panel-header"><div><h2>Your next moves</h2><p>A small, clear queue to move you forward.</p></div><a class="small-link" href="#board">View board ↗</a></div>${queue.length ? queue.map(listTask).join('') : empty(all.length ? 'The queue is clear.' : 'Start with one useful task.', all.length ? 'Check blocked tasks or plan your next step.' : 'Connect your project plan or create your first task.', !all.length)}</section><section class="panel"><div class="panel-header"><div><h2>The workstreams</h2><p>Progress from your task statuses.</p></div><span class="mini-tag">${streams.length} areas</span></div>${streamRows || '<p class="form-help">Workstreams appear when the project plan is connected.</p>'}</section></div>` +
      `<div class="setup-strip"><span class="setup-strip-icon" aria-hidden="true">↳</span><p><strong>Start solo. Keep the first month focused.</strong>Use research, prototypes and written checklists before adding meetings or outside commitments.</p><a class="small-link" href="#people">People & learning ↗</a></div>`;
  }
  function renderBoard() {
    return pageHeading('THE WORK IN MOTION', 'A place for every next step.', 'Filter the plan, open a task, and keep a note of what changed. Status changes are saved in this browser.', external(data.trelloUrl, 'Open Trello')) +
      `<div class="filter-bar"><div class="search-wrap">${icon('search')}<label class="sr-only" for="task-search">Search tasks</label><input id="task-search" type="search" placeholder="Search tasks, notes or owners…" value="${esc(filters.search)}" autocomplete="off"></div><label class="sr-only" for="status-filter">Filter by status</label><select id="status-filter"><option value="all">All statuses</option>${Object.entries(STATUS).map(([s, label]) => `<option value="${s}" ${filters.status === s ? 'selected' : ''}>${label}</option>`).join('')}</select><label class="sr-only" for="stream-filter">Filter by workstream</label><select id="stream-filter"><option value="all">All workstreams</option>${allWorkstreams().map((s) => `<option value="${esc(s.id)}" ${filters.workstream === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><span class="filter-count" id="filter-count" aria-live="polite"></span></div><div id="board-results"></div><p class="board-note">Local edits; no automatic Trello sync. Open a card to update its status or add a private browser-local note.</p>`;
  }
  function renderBoardResults() {
    if (activeView !== 'board' || !$('#board-results')) return;
    const all = tasks(), q = filters.search.trim().toLowerCase();
    const filtered = all.filter((t) => (filters.status === 'all' || t.status === filters.status) && (filters.workstream === 'all' || t.workstream === filters.workstream) && (!q || [t.id, t.title, t.description, t.owner, t.notes, streamName(t.workstream)].join(' ').toLowerCase().includes(q)));
    $('#filter-count').textContent = `${filtered.length} of ${all.length} tasks`;
    const cols = filters.status === 'all' ? Object.keys(STATUS) : [filters.status];
    $('#board-results').innerHTML = filtered.length || !q && filters.status === 'all' && filters.workstream === 'all' ? `<div class="board"${cols.length === 1 ? ' style="grid-template-columns:minmax(0,480px)"' : ''}>${cols.map((status) => { const own = filtered.filter((t) => t.status === status); return `<section class="board-column" aria-label="${esc(STATUS[status])}"><div class="column-head"><span class="column-dot ${status}" aria-hidden="true"></span><span>${STATUS[status]}</span><span class="column-count">${own.length}</span></div>${own.length ? own.map(taskCard).join('') : '<div class="column-empty">Nothing here yet.<br>A little breathing room.</div>'}</section>`; }).join('')}</div>` : empty('No matching tasks.', 'Try a different status, workstream or search term.') + '<button class="button button-ghost" type="button" data-action="clear-filters">Clear filters</button>';
  }
  function allWorkstreams() {
    const result = streams.map((s) => ({ id: s.id, name: s.name }));
    for (const t of tasks()) if (!result.some((s) => s.id === t.workstream)) result.push({ id: t.workstream, name: streamName(t.workstream) });
    if (!result.length) result.push({ id: 'general', name: 'General' });
    return result;
  }
  function renderPlan() {
    const all = tasks();
    const titles = ['Find the shape', 'Build the essentials', 'Make it usable', 'Review and decide'];
    const weeks = [1, 2, 3, 4].map((week) => {
      const own = all.filter((t) => Number(t.week) === week), done = own.filter((t) => t.status === 'done').length;
      const hasEstimates = own.some((t) => t.estimatedHours !== null), hours = own.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      return `<section class="panel week-panel"><div class="week-header"><span class="week-number">0${week}</span><div><h2>Week ${week}</h2><p>${titles[week - 1]}${hasEstimates ? ` · ${hours} planned hours${own.some((t) => t.estimatedHours === null) ? ' + unestimated tasks' : ''}` : ''}</p></div><span class="mini-tag">${done}/${own.length} done</span></div>${own.length ? own.map(listTask).join('') : '<p class="form-help">No tasks assigned to this week.</p>'}</section>`;
    }).join('');
    const future = all.filter((t) => t.week === 'future');
    return pageHeading('SMALL STEPS, A CLEAR DIRECTION', 'Your first 30 days.', 'A practical sequence for a solo founder. Weeks organise the work; they are planning windows, not automatic deadlines.') +
      '<div class="plan-intro"><div><h2>Build enough to learn. Leave space to think.</h2><p>The first month is for preparing the offer and the operating system. Keep outside contact deliberate, and turn open questions into small tasks you can complete.</p></div><span class="plan-intro-number" aria-hidden="true">01—30</span></div>' +
      `<div class="week-grid">${weeks}</div>${future.length ? `<section class="panel future-section"><div class="panel-header"><div><h2>For a later chapter</h2><p>Useful ideas without a first-month commitment.</p></div><span class="mini-tag">${future.length} tasks</span></div>${future.map(listTask).join('')}</section>` : ''}`;
  }
  function renderList(value, fallback) { const items = list(value); return items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : `<p class="form-help">${esc(fallback)}</p>`; }
  function renderServices() {
    const services = array(data.services).filter((s) => s && typeof s === 'object');
    return pageHeading('A FOCUSED SERVICE PRACTICE', 'Clear offers. Clear boundaries.', 'The working service menu for your consultancy. Keep scope, handover and ongoing responsibilities explicit.') +
      '<div class="notice">These are planning offers. Validate delivery effort, price, customer fit and applicable taxes before issuing a quote. No sales or customers are implied.</div>' +
      (services.length ? `<div class="service-grid">${services.map((s, i) => `<article class="panel service-card"><span class="service-index">OFFER / ${String(i + 1).padStart(2, '0')}</span><h2>${esc(s.name)}</h2><p class="service-price">${esc(typeof s.price === 'number' ? `RM${s.price.toLocaleString('en-MY')}` : text(s.price, 'To be defined'))}</p><p class="service-price-note">Planning price · Confirm before quoting</p><h3>Included in the scope</h3>${renderList(s.scope, 'Scope is being defined.')}<div class="service-exclusions"><h3>Outside the scope</h3>${renderList(s.exclusions, 'Confirm exclusions before quoting.')}</div></article>`).join('')}</div>` : empty('The service menu is taking shape.', 'Service offers will appear when added to the project plan.'));
  }
  function renderPeople() {
    const people = array(data.people).filter((p) => p && typeof p === 'object'), learning = array(data.learning).filter((l) => l && typeof l === 'object');
    return pageHeading('KEEP THE TEAM INTENTIONAL', 'Learn first. Bring people in when needed.', 'Start with a manageable solo routine. These are possible support roles and useful learning resources, not hired staff.') +
      '<div class="plan-intro"><div><h2>Solo for now does not mean doing everything forever.</h2><p>Prepare the brief and define the trigger before you contact a specialist. Use asynchronous research and written materials while you build confidence.</p></div><span class="plan-intro-number" aria-hidden="true">N +</span></div>' +
      `<div class="resource-grid"><section class="panel"><div class="panel-header"><div><h2>People to bring in deliberately</h2><p>Each role should solve a defined problem.</p></div></div>${people.length ? people.map((p) => `<article class="person-item"><h3>${esc(p.role)}</h3><div class="person-meta">${p.when ? `<span class="mini-tag">${esc(text(p.when))}</span>` : ''}${p.budget ? `<span class="mini-tag">${esc(text(p.budget))}</span>` : ''}</div><p>${esc(text(p.scope))}</p></article>`).join('') : '<p class="form-help">No outside roles have been added to the plan.</p>'}</section><section class="panel"><div class="panel-header"><div><h2>A useful learning shelf</h2><p>Choose resources that support the next task.</p></div></div>${learning.length ? learning.map((l) => safeUrl(l.url) ? `<a class="resource-link" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer"><strong>${esc(l.title)}<span aria-hidden="true">↗</span></strong><p>${esc(l.why)}</p></a>` : `<div class="resource-link"><strong>${esc(l.title)}</strong><p>${esc(l.why)}</p></div>`).join('') : '<p class="form-help">Learning resources will appear here when added.</p>'}</section></div>`;
  }
  function renderStrategy() {
    const defaultPalette = { Ink: '#17233D', Paper: '#F5F7FA', Teal: '#007F78', Mint: '#D9F7EA' };
    let colors = brand.palette && typeof brand.palette === 'object' && !Array.isArray(brand.palette) ? Object.entries(brand.palette) : [];
    colors = colors.filter(([, c]) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 8);
    if (!colors.length) colors = Object.entries(defaultPalette);
    const swatches = colors.map(([label, hex]) => {
      const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
      const luminance = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
      return `<div class="swatch" style="background:${hex};color:${luminance > .179 ? '#17233D' : '#FFFFFF'}"><strong>${esc(label)}</strong><span>${esc(hex.toUpperCase())}</span></div>`;
    }).join('');
    const decisions = array(data.decisions).filter((d) => d && typeof d === 'object');
    const sources = array(data.sources).filter((s) => s && safeUrl(s.url));
    return pageHeading('THE THINKING BEHIND THE WORK', 'A brand with a useful purpose.', 'Keep the promise, the direction and the important decisions visible as the practice develops.') +
      `<div class="strategy-grid"><section class="brand-board"><span class="eyebrow">WORKING IDENTITY / NOT TRADEMARK-CLEARED</span><div class="brand-display"><h2>${esc(brandName)}</h2><p>${esc(text(brand.tagline, 'Less chasing. Clearer work.'))}</p></div></section><div class="strategy-copy"><section class="panel"><h2>The vision</h2><p>${esc(text(brand.vision, 'Define the future this practice should help create.'))}</p></section><section class="panel"><h2>The mission</h2><p>${esc(text(brand.mission, 'Define what the practice does, for whom, and to what standard.'))}</p></section></div><div class="palette" aria-label="Brand palette">${swatches}</div></div>` +
      `<section class="panel decisions-section"><div class="panel-header"><div><h2>The decisions that shape the studio</h2><p>Current thinking, including what still needs validation.</p></div></div>${decisions.length ? decisions.map((d) => `<article class="decision-item"><h3>${esc(d.title)}</h3><span class="mini-tag">${esc(text(d.status, 'Under review'))}</span><p>${esc(d.detail)}</p></article>`).join('') : '<p class="form-help">No strategy decisions have been recorded yet.</p>'}</section>` +
      (sources.length ? `<section class="decisions-section"><h2 style="font-size:13px;font-weight:600">The source shelf</h2><p class="form-help">External references, opened only when you choose a link. Recheck changing information before acting.</p><div class="source-list">${sources.map((s) => `<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join('')}</div></section>` : '');
  }
  function render() {
    renderNavigation();
    const views = { overview: renderOverview, board: renderBoard, plan: renderPlan, services: renderServices, people: renderPeople, strategy: renderStrategy };
    $('#main').innerHTML = noticeHtml() + views[activeView]();
    if (activeView === 'board') renderBoardResults();
  }

  function openDialog(dialog, html) { returnFocus = document.activeElement; dialog.innerHTML = html; if (!dialog.open) dialog.showModal(); }
  function closeDialog(dialog) { dialog.close(); }
  function dialogHead(title, kicker, id) { return `<div class="dialog-header"><div><span class="eyebrow">${esc(kicker)}</span><h2 id="${id}">${esc(title)}</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>`; }
  function taskDialog(id) {
    const task = tasks().find((t) => t.id === id);
    if (!task) { notify('This task is no longer in the plan.'); return; }
    const deps = task.dependencies.map((dep) => { const found = tasks().find((t) => t.id === dep); return found ? `<button class="dependency-button" type="button" data-action="dependency" data-id="${esc(dep)}"><span>${esc(found.title)}</span>${statusBadge(found.status)}</button>` : `<div class="form-help">${esc(dep)} · Dependency not found in this project plan</div>`; }).join('');
    openDialog($('#task-dialog'), dialogHead(task.title, `${task.id} / ${streamName(task.workstream)}`, 'task-dialog-title') +
      `<form id="task-form" data-id="${esc(task.id)}"><div class="dialog-body"><div class="dialog-meta">${statusBadge(task.status)}${priorityBadge(task.priority)}<span class="mini-tag">${weekLabel(task.week)}</span><span class="mini-tag">${esc(task.owner)}</span>${task.estimatedHours !== null ? `<span class="mini-tag">Estimate: ${task.estimatedHours}h</span>` : ''}${task.local ? '<span class="mini-tag">Local task</span>' : ''}</div>${task.description ? `<section class="dialog-section"><h3>The task</h3><p>${esc(task.description)}</p></section>` : ''}<section class="dialog-section"><h3>What done looks like</h3>${renderList(task.acceptance, 'Define acceptance criteria before starting this task.')}</section>${deps ? `<section class="dialog-section"><h3>Dependencies</h3><div class="dependency-list">${deps}</div><p class="form-help">Statuses are updated manually; dependencies do not automatically change a task.</p></section>` : ''}<div class="field"><label class="form-label" for="task-status">Status</label><select id="task-status" name="status">${Object.entries(STATUS).map(([s, label]) => `<option value="${s}" ${s === task.status ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="field"><label class="form-label" for="task-notes">Your local notes</label><textarea id="task-notes" name="notes" rows="4" maxlength="20000" placeholder="What changed? What is the next small action?">${esc(task.notes)}</textarea><p class="form-help">Saved on this device only. Avoid passwords, customer data and sensitive financial information. Exports include these notes.</p></div><div class="local-note"><strong>Local edits; no automatic Trello sync</strong>To keep Trello aligned, open the original card and update it separately.</div></div><div class="dialog-footer">${external(task.trelloUrl, 'Open Trello card', 'button button-light compact') || '<span class="dialog-footer-note">No Trello card linked to this task.</span>'}<div class="dialog-footer-right"><button class="button button-light" type="button" data-action="close-dialog">Cancel</button><button class="button button-primary" type="submit">Save changes</button></div></div></form>`);
  }
  function addDialog() {
    openDialog($('#add-dialog'), dialogHead('One useful next step.', 'ADD A LOCAL TASK', 'add-dialog-title') +
      `<form id="add-form"><div class="dialog-body"><div class="form-grid"><div class="field field-full"><label class="form-label" for="new-title">Task title</label><input id="new-title" name="title" required maxlength="180" placeholder="Start with a clear action…" autocomplete="off"></div><div class="field"><label class="form-label" for="new-stream">Workstream</label><select id="new-stream" name="workstream">${allWorkstreams().map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label class="form-label" for="new-week">Planning week</label><select id="new-week" name="week"><option value="1">Week 1</option><option value="2">Week 2</option><option value="3">Week 3</option><option value="4">Week 4</option><option value="future">Later</option></select></div><div class="field"><label class="form-label" for="new-status">Status</label><select id="new-status" name="status">${Object.entries(STATUS).map(([s, label]) => `<option value="${s}">${label}</option>`).join('')}</select></div><div class="field"><label class="form-label" for="new-priority">Priority</label><select id="new-priority" name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div><div class="field field-full"><label class="form-label" for="new-owner">Owner</label><input id="new-owner" name="owner" value="Nathan" required maxlength="100"></div><div class="field field-full"><label class="form-label" for="new-description">Description <span class="form-help">(optional)</span></label><textarea id="new-description" name="description" rows="3" maxlength="10000" placeholder="Give this task enough context to act on."></textarea></div><div class="field field-full"><label class="form-label" for="new-acceptance">What does done look like? <span class="form-help">(optional)</span></label><textarea id="new-acceptance" name="acceptance" rows="3" maxlength="10000" placeholder="One acceptance criterion per line."></textarea></div></div><div class="local-note">This task stays in this browser. It will not create a Trello card. Export JSON to back it up.</div></div><div class="dialog-footer"><span class="dialog-footer-note">Keep the task small enough to finish.</span><div class="dialog-footer-right"><button class="button button-light" type="button" data-action="close-dialog">Cancel</button><button class="button button-primary" type="submit">Create task</button></div></div></form>`);
    $('#new-title').focus();
  }
  function settingsDialog() {
    const edits = Object.keys(state.overrides).length;
    const updated = state.updatedAt ? new Date(state.updatedAt).toLocaleString() : 'No saved local changes';
    openDialog($('#settings-dialog'), dialogHead('Keep your workspace in good order.', 'LOCAL WORKSPACE SETTINGS', 'settings-dialog-title') +
      `<div class="dialog-body"><div class="local-note"><strong>Local edits; no automatic Trello sync</strong>This page is a public planning dashboard. Task statuses, notes and added tasks are stored only in this browser. It is not a secure vault or a shared team database.</div><div class="settings-group" style="margin-top:22px"><h3>Your local copy</h3><p>${state.customTasks.length} added tasks · ${edits} task updates<br>Last change: ${esc(updated)}<br>Browser storage: ${storageAvailable ? 'available' : 'unavailable — export before leaving'}</p><button class="button button-primary" type="button" data-action="export">Export local workspace JSON</button> <button class="button button-light" type="button" data-action="view-backup">View backup JSON</button></div><div class="settings-divider"></div><div class="settings-group"><h3>Restore a local workspace</h3><p>Import a JSON file exported by this dashboard. Its task updates and notes replace your current local copy after confirmation. The published project plan is not changed.</p><label class="form-label" for="import-file">Choose a NeatRelay JSON export</label><input class="file-input" id="import-file" type="file" accept="application/json,.json"><p id="import-feedback" class="form-help" role="status"></p></div><div class="settings-divider"></div><div class="settings-group"><h3>Return to the published plan</h3><p>Remove this browser's status changes, notes and added tasks. Export a backup first if you want to keep them.</p><button class="button button-danger" type="button" data-action="reset">Reset local changes</button></div><div class="settings-divider"></div><div class="settings-group"><h3>Connected project links</h3>${external(data.trelloUrl, 'Open Trello', 'button button-light compact') || '<p>Trello link has not been added.</p>'} ${external(data.githubUrl, 'Open GitHub', 'button button-light compact') || '<p>GitHub link has not been added.</p>'}</div></div>`);
  }
  function confirmAction(title, message, label, action, dangerous = false) {
    confirmCallback = action;
    openDialog($('#confirm-dialog'), dialogHead(title, 'PLEASE CONFIRM', 'confirm-dialog-title') + `<div class="dialog-body"><p>${esc(message)}</p></div><div class="dialog-footer"><div class="dialog-footer-right"><button class="button button-light" type="button" data-action="cancel-confirm">Cancel</button><button class="button ${dangerous ? 'button-danger' : 'button-primary'}" type="button" data-action="accept-confirm">${esc(label)}</button></div></div>`);
    $('[data-action="cancel-confirm"]', $('#confirm-dialog')).focus();
  }
  function notify(message) {
    clearTimeout(toastTimer); const toast = $('#toast'); toast.textContent = message; toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4800);
  }
  function backupJson() {
    const payload = { ...state, application: 'NeatRelay local workspace', exportedAt: new Date().toISOString(), projectAsOf: text(data.asOf), notice: 'Browser-local task edits and notes. No automatic Trello sync. Keep private; do not publish exports containing personal notes.' };
    return JSON.stringify(payload, null, 2);
  }
  function backupDialog() {
    openDialog($('#backup-dialog'), dialogHead('Your local backup JSON.', 'A DOWNLOAD-FREE BACKUP', 'backup-dialog-title') + '<div class="dialog-body"><p id="backup-help" class="form-help" style="margin:0 0 16px">Select and copy all the JSON below, paste it into a plain-text editor, and save it privately as neatrelay-workspace.json. This is the same payload format used by Export and can be restored with Import. It includes local notes; do not publish it.</p><label class="form-label" for="backup-json">Selectable backup content</label><textarea id="backup-json" readonly rows="14" spellcheck="false" aria-describedby="backup-help" style="width:100%;font-family:Consolas,monospace;font-size:11px"></textarea></div><div class="dialog-footer"><span class="dialog-footer-note">No clipboard permission is needed.</span><div class="dialog-footer-right"><button class="button button-light" type="button" data-action="close-dialog">Close</button><button class="button button-primary" type="button" data-action="select-backup">Select all JSON</button></div></div>');
    $('#backup-json').value = backupJson();
    $('#backup-json').focus();
  }
  function exportState() {
    const blob = new Blob([backupJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `neatrelay-workspace-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Download requested. If it is blocked, use View backup JSON in Workspace settings. The backup includes local notes.');
  }
  async function importFile(file) {
    const feedback = $('#import-feedback');
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose a file smaller than 2 MB.');
      const imported = validateState(JSON.parse(await file.text()));
      feedback.textContent = 'File validated. Confirm replacement to finish importing.';
      confirmAction('Replace your local copy?', `This will replace ${state.customTasks.length} added tasks and ${Object.keys(state.overrides).length} saved task updates with ${imported.customTasks.length} added tasks and ${Object.keys(imported.overrides).length} updates from this file.\n\nThe published plan and Trello will not change. Export your current copy first if you need a backup.`, 'Import this copy', () => {
        state = imported; persist(); closeDialog($('#settings-dialog')); render(); notify('Local workspace imported. Trello was not changed.');
      });
    } catch (error) { feedback.textContent = error instanceof SyntaxError ? 'This file is not valid JSON. No changes were made.' : `${error.message} No changes were made.`; feedback.classList.add('form-error'); }
    finally { const input = $('#import-file'); if (input) input.value = ''; }
  }
  function toggleMobile(open) {
    const sidebar = $('#sidebar'), button = $('#menu-toggle');
    sidebar.classList.toggle('open', open); $('#mobile-scrim').hidden = !open; button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    sidebar.inert = window.innerWidth <= 680 && !open;
    if (open) $('.nav-link.active')?.focus();
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;
    if (action === 'task') taskDialog(trigger.dataset.id);
    if (action === 'dependency') {
      const form = $('#task-form'), current = tasks().find((t) => t.id === form?.dataset.id);
      if (current && ($('#task-status').value !== current.status || $('#task-notes').value !== current.notes)) {
        confirmAction('Leave without saving?', 'Your changes to this task have not been saved. Open the dependency and discard these changes?', 'Open dependency', () => taskDialog(trigger.dataset.id));
      } else taskDialog(trigger.dataset.id);
    }
    if (action === 'add-task') addDialog();
    if (action === 'settings') { toggleMobile(false); settingsDialog(); }
    if (action === 'export') exportState();
    if (action === 'view-backup') backupDialog();
    if (action === 'select-backup') { $('#backup-json').focus(); $('#backup-json').select(); }
    if (action === 'close-dialog') closeDialog(trigger.closest('dialog'));
    if (action === 'clear-filters') { filters = { search: '', status: 'all', workstream: 'all' }; render(); $('#task-search')?.focus(); }
    if (action === 'reset') confirmAction('Reset this browser’s workspace?', 'This permanently removes local task statuses, notes and added tasks from this browser. The published project plan is restored. Trello and GitHub are not changed.\n\nExport your local JSON first if you need a backup.', 'Reset local changes', () => {
      state = freshState(); storageNotice = '';
      try { localStorage.removeItem(STORAGE_KEY); } catch { storageAvailable = false; }
      closeDialog($('#settings-dialog')); render(); notify('Local changes cleared. The published plan is restored.');
    }, true);
    if (action === 'cancel-confirm') { confirmCallback = null; closeDialog($('#confirm-dialog')); }
    if (action === 'accept-confirm') { const callback = confirmCallback; confirmCallback = null; closeDialog($('#confirm-dialog')); callback?.(); }
  });
  document.addEventListener('submit', (event) => {
    if (event.target.id === 'task-form') {
      event.preventDefault(); const id = event.target.dataset.id;
      state.overrides[id] = { status: $('#task-status').value, notes: $('#task-notes').value };
      const saved = persist(); closeDialog($('#task-dialog')); render(); if (saved) notify('Task updated locally. Trello has not changed.');
    }
    if (event.target.id === 'add-form') {
      event.preventDefault(); const form = new FormData(event.target), title = text(form.get('title')).trim(), owner = text(form.get('owner')).trim();
      if (!title || !owner) { const input = !title ? $('#new-title') : $('#new-owner'); input.setCustomValidity('Enter a value, not just spaces.'); input.reportValidity(); return; }
      if (state.customTasks.length >= 300) { notify('The local workspace supports up to 300 added tasks.'); return; }
      const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const acceptance = list(form.get('acceptance'));
      if (acceptance.length > 100 || acceptance.some((item) => item.length > 2000)) { const input = $('#new-acceptance'); input.setCustomValidity('Use up to 100 criteria, each no more than 2,000 characters.'); input.reportValidity(); return; }
      state.customTasks.push(normalizeTask({ id, title, owner, workstream: form.get('workstream'), week: weekValue(form.get('week')), status: form.get('status'), priority: form.get('priority'), description: form.get('description'), acceptance, dependencies: [], trelloUrl: '', local: true }));
      const saved = persist(); closeDialog($('#add-dialog')); render(); if (saved) notify('Task added to this browser. Export JSON to back it up.');
    }
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'task-search') { filters.search = event.target.value; renderBoardResults(); }
    if (['new-title', 'new-owner', 'new-acceptance'].includes(event.target.id)) event.target.setCustomValidity('');
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'status-filter') { filters.status = event.target.value; renderBoardResults(); }
    if (event.target.id === 'stream-filter') { filters.workstream = event.target.value; renderBoardResults(); }
    if (event.target.id === 'import-file') importFile(event.target.files[0]);
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) { if (returnFocus?.isConnected) returnFocus.focus(); else $('#main').focus({ preventScroll: true }); } });
    dialog.addEventListener('cancel', () => { if (dialog.id === 'confirm-dialog') confirmCallback = null; });
  });
  $('#menu-toggle').addEventListener('click', () => toggleMobile(!$('#sidebar').classList.contains('open')));
  $('#mobile-scrim').addEventListener('click', () => { toggleMobile(false); $('#menu-toggle').focus(); });
  document.addEventListener('keydown', (event) => {
    if (!$('#sidebar').classList.contains('open')) return;
    if (event.key === 'Escape') { toggleMobile(false); $('#menu-toggle').focus(); }
    if (event.key === 'Tab') {
      const focusable = [...$('#sidebar').querySelectorAll('a[href],button:not([disabled])')], first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 680 && $('#sidebar').classList.contains('open')) toggleMobile(false);
    $('#sidebar').inert = window.innerWidth <= 680 && !$('#sidebar').classList.contains('open');
  });
  window.addEventListener('hashchange', () => { const view = location.hash.slice(1); activeView = Object.hasOwn(VIEWS, view) ? view : 'overview'; toggleMobile(false); render(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); });
  window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) notify('This workspace changed in another tab. Refresh to load its latest local copy.'); });
  render();
  $('#sidebar').inert = window.innerWidth <= 680;
})();
