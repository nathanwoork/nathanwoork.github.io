// Project panel (side drawer): status, progress, waiting-on, milestones and the project's own to-do list.
// Shared by Overview and Command. `ctx.onChange()` must reload data and re-open the panel after an edit.
import { h, statusPill, priorityPill, ago, fmtDate, CONN_LABEL, plural, today, toast } from './app.js';
import { todoState, sortTasks, isOpenTask, persistTodos } from './model.js';

const BS = String.fromCharCode(92);

export function projectDrawerContent(p, model, ctx) {
  const close = ctx.close;
  const nodes = [];
  const lane = p.lane;

  nodes.push(h('div', { class: 'row between' },
    h('div', { class: 'row' }, statusPill(p.status), lane === 'current' && p.priority ? priorityPill(p.priority) : null, p.discovered ? h('span', { class: 'pill plain' }, 'Auto-discovered') : null),
    h('button', { class: 'btn sm ghost', type: 'button', onclick: close, 'aria-label': 'Close details' }, '✕ Close')));

  nodes.push(h('div', {}, h('h2', {}, p.name), h('p', { class: 'muted', style: 'margin-top:8px' }, p.summary)));

  // lifecycle notes
  if (lane === 'dead') {
    nodes.push(h('div', { class: 'tombstone' }, h('b', {}, 'Idea Graveyard'), p.buried?.date ? ` · scrapped ${fmtDate(p.buried.date)}` : '',
      h('div', { class: 'muted small' }, p.buried?.reason || 'Scrapped. Nothing here needs your attention.')));
  } else if (lane === 'hold') {
    nodes.push(h('div', { class: 'callout' }, h('span', { class: 'icon' }, '⏸'), h('div', {}, h('b', {}, 'On hold'), p.heldSince ? ` since ${fmtDate(p.heldSince)}` : '',
      h('div', { class: 'small muted' }, p.holdReason || 'Paused on purpose. Its tasks are parked and don’t count toward your open work.'))));
  } else if (lane === 'might') {
    nodes.push(h('div', { class: 'callout' }, h('span', { class: 'icon' }, '🔭'), h('div', {}, h('b', {}, 'Might pursue'),
      h('div', { class: 'small muted' }, p.mightNote || 'Of interest, but not urgent. Needs none of your attention right now.'))));
  } else if (lane === 'done') {
    nodes.push(h('div', { class: 'callout ok' }, h('span', { class: 'icon' }, '✓'), h('div', {}, h('b', {}, 'Finished'), p.finishedOn ? ` ${fmtDate(p.finishedOn)}` : '')));
  }

  if (p.waiting?.length) {
    nodes.push(h('section', {}, h('h4', {}, 'Waiting on someone else'),
      h('ul', { class: 'list-plain' }, p.waiting.map((w) => h('li', { class: 'conn-row' }, h('span', { class: 'dot simulated' }),
        h('div', {}, h('b', {}, w.who), w.about ? ` — ${w.about}` : '',
          w.followUp ? h('div', { class: 'small', style: 'color:var(--warn);font-weight:600' }, `Follow up ${fmtDate(w.followUp, { weekday: 'long', day: 'numeric', month: 'long' })}`) : h('div', { class: 'small muted' }, 'No follow-up date set'),
          w.note ? h('div', { class: 'small muted' }, w.note) : null))))));
  }

  if (lane !== 'dead') {
    nodes.push(h('section', {},
      h('h4', {}, `Progress · ${p.progress}%`),
      h('div', { class: 'progress' + (p.progress === 100 ? ' ok' : '') }, h('i', { style: `width:${p.progress}%` })),
      h('p', { class: 'small muted', style: 'margin-top:6px' }, `${plural(p.openTasks, 'open task')} · ${plural(p.doneTasks, 'done')} · last activity ${ago(p.lastActivity)}`)));
  }

  if (p.attention?.length) {
    nodes.push(h('section', {}, h('h4', {}, 'Needs attention'),
      h('ul', { class: 'list-plain' }, p.attention.map((a) => h('li', { class: 'attention' }, h('span', {}, '⚠'), a)))));
  }

  if (p.nextAction && lane !== 'dead') nodes.push(h('section', {}, h('h4', {}, 'Next action'), h('p', {}, p.nextAction)));

  if (lane !== 'dead') nodes.push(tasksSection(p, model, ctx));
  else if (p.tasks?.length) nodes.push(h('p', { class: 'small muted' }, `${plural(p.tasks.length, 'task')} were dropped with this project.`));

  if (p.milestones?.length && lane !== 'dead') {
    nodes.push(h('section', {}, h('h4', {}, `Milestones · ${p.milestones.filter((m) => m.done).length}/${p.milestones.length}`),
      h('ul', { class: 'milestones' }, p.milestones.map((m) =>
        h('li', {}, h('span', { class: 'm' + (m.done ? ' done' : '') }, m.done ? '✓' : ''), h('span', { class: m.done ? 'muted' : '' }, m.title))))));
  }

  // GitHub
  const gh = h('section', {}, h('h4', {}, 'GitHub'));
  if (p.repoObjs?.length) {
    p.repoObjs.forEach((r) => gh.append(h('div', { style: 'margin-bottom:8px' },
      h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.fullName),
      h('div', { class: 'meta-row', style: 'margin-top:2px' },
        r.language ? h('span', {}, h('b', {}, r.language)) : null, h('span', {}, 'Open issues ', h('b', {}, r.openIssues)), h('span', {}, 'Pushed ', h('b', {}, ago(r.pushedAt))),
        r.hasPages ? h('span', {}, h('b', {}, 'Pages site')) : null))));
  } else if (p.github || (p.repos || []).length) {
    gh.append(h('p', { class: 'muted small' }, `Linked to ${[p.github, ...(p.repos || [])].filter(Boolean).join(', ')}, but not found among the public repos for ${model.config.owner?.github || 'your account'} — it may be private, which the live feed can’t see.`));
  } else {
    gh.append(h('p', { class: 'muted small' }, 'Not on GitHub. To link a repo, add it to this project’s "repos" list in data/projects.json.'));
  }
  if (lane !== 'dead') nodes.push(gh);

  if (p.folder) {
    nodes.push(h('section', {}, h('h4', {}, 'Where it lives'),
      h('p', {}, h('code', {}, ['Desktop', ...p.folder.split('/')].join(BS)), ' ', h('a', { href: `files.html#${encodeURIComponent(p.folder)}` }, 'See every file →'))));
  } else if (p.id === 'job-search') {
    nodes.push(h('section', {}, h('h4', {}, 'Where it lives'), h('p', { class: 'muted small' }, 'In Google Drive (AI Workspace), not on this PC.'), h('p', {}, h('a', { href: 'files.html#drive' }, 'See the Drive map →'))));
  }

  if (p.local && lane !== 'dead') {
    nodes.push(h('section', {}, h('h4', {}, 'Local repository'),
      h('div', { class: 'meta-row' },
        h('span', {}, 'Branch ', h('b', {}, p.local.branch || 'none (not a git repo)')),
        h('span', {}, 'Commits ', h('b', {}, p.local.commits)),
        h('span', {}, 'Uncommitted ', h('b', {}, p.local.uncommitted)),
        h('span', {}, 'Last commit ', h('b', {}, p.local.lastCommit ? fmtDate(p.local.lastCommit) : 'never')),
        h('span', {}, 'Scanned ', h('b', {}, fmtDate(p.local.scannedAt))))));
  }

  if (p.connections?.length && lane !== 'dead') {
    nodes.push(h('section', {}, h('h4', {}, 'Connections & integrations'),
      h('ul', { class: 'list-plain' }, p.connections.map((c) =>
        h('li', { class: 'conn-row' }, h('span', { class: `dot ${c.state}` }),
          h('div', {}, h('b', {}, c.name), ' ', h('span', { class: 'muted small' }, `— ${CONN_LABEL[c.state] || c.state}`), c.note ? h('div', { class: 'small muted' }, c.note) : null))))));
  }

  if ((p.tags?.length || p.tech?.length) && lane !== 'dead') {
    nodes.push(h('section', {}, h('h4', {}, 'Themes & tech'), h('div', { class: 'tags' }, [...(p.tech || []), ...p.tags].map((t) => h('span', { class: 'tag' }, t)))));
  }

  if (p.links?.length) {
    nodes.push(h('section', {}, h('h4', {}, 'Links'),
      h('ul', { class: 'list-plain' }, p.links.map((l) => h('li', {}, h('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.label))))));
  }
  return nodes;
}

/* ── the project's own to-do list ── */
function tasksSection(p, model, ctx) {
  const parked = p.lane !== 'current';
  const tasks = (p.tasks || []).slice().sort(sortTasks);
  const open = tasks.filter(isOpenTask);
  const done = tasks.filter((t) => t.status === 'done');
  const needsMe = open.filter((t) => t.needsMe);
  const rest = open.filter((t) => !t.needsMe);
  const change = async (fn, msg) => {
    fn();
    const saved = await persistTodos();
    toast(saved ? (msg || 'Saved') : 'Saved in this browser only (the local server isn’t running)');
    await ctx.onChange();
  };

  const row = (t) => {
    const isDone = t.status === 'done';
    const overdue = t.due && !isDone && t.due < today();
    return h('div', { class: 'ptask' + (isDone ? ' done' : '') },
      h('input', { type: 'checkbox', class: 'check' + (t.status === 'doing' ? ' doing' : ''), checked: isDone || null, disabled: t.readonly || null,
        'aria-label': `${isDone ? 'Reopen' : 'Complete'} “${t.title}”`, onchange: (e) => change(() => todoState.setStatus(t.id, e.target.checked ? 'done' : 'todo')) }),
      h('div', {},
        h('div', { class: 't' }, t.url ? h('a', { href: t.url, target: '_blank', rel: 'noopener' }, t.title) : t.title),
        t.notes ? h('div', { class: 'sub' }, t.notes) : null,
        h('div', { class: 'meta' }, priorityPill(t.priority),
          t.status === 'blocked' ? h('span', { class: 'pill plain bad' }, 'Blocked') : null,
          t.due ? h('span', { class: 'small ' + (overdue ? '' : 'muted'), style: overdue ? 'color:var(--danger);font-weight:600' : '' }, (overdue ? 'Overdue · ' : 'Due ') + fmtDate(t.due)) : null,
          t.source === 'github' ? h('span', { class: 'pill plain' }, 'GitHub') : null)),
      t.readonly ? h('span') : h('div', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' },
        h('select', { 'aria-label': 'Status', onchange: (e) => change(() => todoState.setStatus(t.id, e.target.value)) },
          [['todo', 'To do'], ['doing', 'Doing'], ['blocked', 'Blocked'], ['done', 'Done']].map(([v, l]) => h('option', { value: v, selected: v === t.status || null }, l))),
        h('button', { class: 'btn sm ghost danger', type: 'button', title: 'Remove task', 'aria-label': `Remove “${t.title}”`, onclick: () => { if (confirm('Remove this task from the list?')) change(() => todoState.remove(t.id), 'Task removed'); } }, '✕')));
  };
  const group = (label, list) => (list.length ? h('div', { class: 'ptask-group' }, h('h5', {}, label), h('div', { class: 'ptasks' }, list.map(row))) : null);

  // add form
  const title = h('input', { type: 'text', placeholder: 'Add a task…', 'aria-label': 'New task' });
  const prio = h('select', { 'aria-label': 'Priority' }, [['med', 'Medium'], ['high', 'High'], ['low', 'Low']].map(([v, l]) => h('option', { value: v }, l)));
  const due = h('input', { type: 'date', 'aria-label': 'Due date' });
  const form = h('form', { class: 'add-task', onsubmit: (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t) return;
    change(() => todoState.add({ id: 'c-' + Date.now().toString(36), project: p.id, title: t, priority: prio.value, status: 'todo', due: due.value || null, source: 'manual' }), 'Task added');
  } }, title, prio, due, h('button', { class: 'btn primary sm', type: 'submit' }, 'Add'));

  return h('section', {},
    h('h4', {}, `To-do · ${open.length} open${parked ? ' (parked)' : ''}`),
    parked ? h('p', { class: 'small muted', style: 'margin:-2px 0 8px' }, 'These tasks are parked: they don’t appear in your open-work totals while this project isn’t current.') : null,
    open.length ? [group('Waiting on you', needsMe), group(needsMe.length ? 'Everything else' : 'Open', rest)] : h('p', { class: 'small muted' }, 'Nothing open.'),
    done.length ? h('details', { style: 'margin-top:10px' }, h('summary', { class: 'small muted', style: 'cursor:pointer' }, `${done.length} done`), h('div', { class: 'ptasks', style: 'margin-top:8px' }, done.map(row))) : null,
    form);
}
