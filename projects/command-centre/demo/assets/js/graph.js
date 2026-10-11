// Connection graph: projects ↔ shared themes/tech ↔ external services.
// A tiny force-directed layout (no libraries) rendered as SVG so it themes with CSS.
import { h, s, STATUS_LABEL, CONN_LABEL } from './app.js';

export function buildGraph(projects, { showAllTags = false } = {}) {
  const nodes = [];
  const links = [];
  const index = new Map();
  const add = (node) => { if (!index.has(node.id)) { index.set(node.id, node); nodes.push(node); } return index.get(node.id); };

  for (const p of projects) {
    add({ id: p.id, kind: 'project', label: shorten(p.name, 22), full: p.name, status: p.status, r: 15 + Math.min(p.openTasks || 0, 12) * 0.9 });
  }

  // tags → only those shared by 2+ projects unless asked (otherwise the graph turns to noise)
  const tagUse = new Map();
  for (const p of projects) for (const t of new Set(p.tags || [])) tagUse.set(t, [...(tagUse.get(t) || []), p.id]);
  for (const [tag, ids] of tagUse) {
    if (ids.length < 2 && !showAllTags) continue;
    add({ id: `tag:${tag}`, kind: 'tag', label: tag, full: `${tag} — shared by ${ids.length} project${ids.length === 1 ? '' : 's'}`, r: 7 });
    for (const id of ids) links.push({ source: id, target: `tag:${tag}`, kind: 'tag' });
  }

  // services / integrations
  for (const p of projects) {
    for (const c of p.connections || []) {
      const id = `svc:${c.name}`;
      const node = add({ id, kind: 'service', label: c.name, full: `${c.name}`, state: c.state || 'unknown', r: 8 });
      // if several projects use one service, keep the "weakest" state visible
      const rank = { blocked: 0, planned: 1, simulated: 2, unknown: 3, live: 4 };
      if ((rank[c.state] ?? 3) < (rank[node.state] ?? 3)) node.state = c.state;
      links.push({ source: p.id, target: id, kind: 'service', note: c.note });
    }
    for (const rel of p.relations || []) {
      if (projects.some((q) => q.id === rel.to)) links.push({ source: p.id, target: rel.to, kind: 'relation', note: rel.note || rel.type });
    }
  }
  return { nodes, links };
}

function shorten(text, n) { return text.length > n ? text.slice(0, n - 1) + '…' : text; }

/* ── force simulation ── */
function layout(nodes, links, W, H, iterations = 420) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const resolved = links.map((l) => ({ ...l, a: byId.get(l.source), b: byId.get(l.target) })).filter((l) => l.a && l.b);
  nodes.forEach((n, i) => {
    if (n.x == null) {
      const angle = (i / nodes.length) * Math.PI * 2;
      const ring = n.kind === 'project' ? 0.18 : 0.34;
      n.x = W / 2 + Math.cos(angle) * W * ring;
      n.y = H / 2 + Math.sin(angle) * H * ring;
    }
    n.vx = 0; n.vy = 0;
  });
  const step = (alpha) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy || 0.01;
        const d = Math.sqrt(d2);
        const min = a.r + b.r + 34;
        const force = (a.kind === 'project' && b.kind === 'project' ? 60000 : 16000) / d2 + (d < min ? (min - d) * 0.12 : 0);
        dx /= d; dy /= d;
        a.vx -= dx * force * alpha; a.vy -= dy * force * alpha;
        b.vx += dx * force * alpha; b.vy += dy * force * alpha;
      }
    }
    for (const l of resolved) {
      const rest = l.kind === 'relation' ? 210 : l.kind === 'service' ? 120 : 150;
      const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const pull = (d - rest) * 0.035 * alpha;
      l.a.vx += (dx / d) * pull; l.a.vy += (dy / d) * pull;
      l.b.vx -= (dx / d) * pull; l.b.vy -= (dy / d) * pull;
    }
    for (const n of nodes) {
      n.vx += (W / 2 - n.x) * 0.004 * alpha; n.vy += (H / 2 - n.y) * 0.007 * alpha;
      if (!n.fixed) { n.x += n.vx * 0.72; n.y += n.vy * 0.72; }
      n.vx *= 0.6; n.vy *= 0.6;
      const pad = n.r + 56;
      n.x = Math.max(pad, Math.min(W - pad, n.x));
      n.y = Math.max(n.r + 26, Math.min(H - n.r - 26, n.y));
    }
  };
  for (let i = 0; i < iterations; i++) step(1 - i / iterations + 0.02);
  return { resolved, step };
}

/**
 * Render into `host`. Returns { update(), destroy() }.
 * opts: { onSelect(projectId), height, compact }
 */
export function renderGraph(host, data, opts = {}) {
  const W = 900;
  const H = opts.height || 520;
  const { nodes, links } = data;
  host.replaceChildren();
  if (!nodes.some((n) => n.kind === 'project')) {
    host.append(h('div', { class: 'empty' }, 'Add projects to see how they connect.'));
    return { destroy() {} };
  }

  const { resolved, step } = layout(nodes, links, W, H);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Connection graph of projects, shared themes and services' });
  const linkLayer = s('g'); const nodeLayer = s('g');
  svg.append(linkLayer, nodeLayer);

  const linkEls = resolved.map((l) => {
    const el = s('line', { class: `g-link ${l.kind}` });
    if (l.note) el.append(s('title', {}, l.note));
    linkLayer.append(el);
    return { l, el };
  });

  const nodeEls = nodes.map((n) => {
    const g = s('g', { class: `g-node ${n.kind} ${n.kind === 'project' ? 's-' + n.status : ''} ${n.kind === 'service' ? n.state : ''}`, tabindex: n.kind === 'project' ? 0 : null, role: n.kind === 'project' ? 'button' : null, 'aria-label': n.full });
    let shape; let label;
    if (n.kind === 'project') {
      shape = s('circle', { r: n.r });
      label = s('text', { y: n.r + 15, 'text-anchor': 'middle' }, n.label);
    } else if (n.kind === 'tag') {
      shape = s('rect', { x: -n.r, y: -n.r, width: n.r * 2, height: n.r * 2, rx: 3, transform: 'rotate(45)' });
      label = s('text', { y: n.r + 15, 'text-anchor': 'middle' }, n.label);
    } else {
      shape = s('rect', { x: -n.r, y: -n.r, width: n.r * 2, height: n.r * 2, rx: 4 });
      label = s('text', { y: n.r + 15, 'text-anchor': 'middle' }, n.label);
    }
    const tip = n.kind === 'project' ? `${n.full} — ${STATUS_LABEL[n.status] || n.status}` : n.kind === 'service' ? `${n.full} — ${CONN_LABEL[n.state]}` : n.full;
    g.append(s('title', {}, tip), shape, label);
    nodeLayer.append(g);
    return { n, g };
  });

  const neighbors = new Map(nodes.map((n) => [n.id, new Set([n.id])]));
  for (const l of resolved) { neighbors.get(l.a.id).add(l.b.id); neighbors.get(l.b.id).add(l.a.id); }

  const paint = () => {
    for (const { l, el } of linkEls) { el.setAttribute('x1', l.a.x); el.setAttribute('y1', l.a.y); el.setAttribute('x2', l.b.x); el.setAttribute('y2', l.b.y); }
    for (const { n, g } of nodeEls) g.setAttribute('transform', `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`);
  };
  paint();

  const focus = (id) => {
    const keep = id ? neighbors.get(id) : null;
    for (const { n, g } of nodeEls) g.classList.toggle('dim', !!keep && !keep.has(n.id));
    for (const { l, el } of linkEls) el.classList.toggle('dim', !!keep && !(keep.has(l.a.id) && keep.has(l.b.id) && (l.a.id === id || l.b.id === id)));
  };

  // drag + click
  let dragging = null; let moved = false; let raf = 0; let alpha = 0;
  const point = (e) => { const r = svg.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  const loop = () => { alpha *= 0.94; step(alpha); paint(); raf = alpha > 0.02 || dragging ? requestAnimationFrame(loop) : 0; };
  const wake = (a = 0.35) => { alpha = Math.max(alpha, a); if (!raf) raf = requestAnimationFrame(loop); };

  for (const { n, g } of nodeEls) {
    g.addEventListener('pointerdown', (e) => { dragging = n; moved = false; n.fixed = true; g.setPointerCapture(e.pointerId); wake(0.2); });
    g.addEventListener('pointermove', (e) => { if (dragging !== n) return; const p = point(e); if (Math.hypot(p.x - n.x, p.y - n.y) > 3) moved = true; n.x = p.x; n.y = p.y; wake(0.25); });
    g.addEventListener('pointerup', () => { if (dragging === n) { n.fixed = false; dragging = null; if (!moved && n.kind === 'project') opts.onSelect?.(n.id); } });
    g.addEventListener('mouseenter', () => focus(n.id));
    g.addEventListener('mouseleave', () => focus(null));
    g.addEventListener('focus', () => focus(n.id));
    g.addEventListener('blur', () => focus(null));
    g.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && n.kind === 'project') { e.preventDefault(); opts.onSelect?.(n.id); } });
  }

  const legend = h('div', { class: 'legend' },
    h('span', {}, h('i', { style: 'background:var(--s-building)' }), 'Project (size = open tasks)'),
    h('span', {}, h('i', { class: 'dia' }), 'Shared theme / tech'),
    h('span', {}, h('i', { class: 'sq' }), 'Service — border shows state'),
    h('span', {}, h('i', { class: 'dot live', style: 'width:9px;height:9px' }), 'Live'),
    h('span', {}, h('i', { class: 'dot simulated', style: 'width:9px;height:9px' }), 'Simulated'),
    h('span', {}, h('i', { class: 'dot planned', style: 'width:9px;height:9px' }), 'Planned'),
    h('span', {}, h('i', { class: 'dot blocked', style: 'width:9px;height:9px' }), 'Blocked'),
    opts.compact ? null : h('span', {}, 'Drag nodes · hover to focus · click a project'));

  host.append(svg, opts.compact ? '' : legend);
  return { destroy() { cancelAnimationFrame(raf); } };
}
