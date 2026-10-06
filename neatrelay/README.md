# NeatRelay operations workspace

A static, dependency-free administration dashboard for Nathan's first month building a workflow consultancy. This is a public planning workspace, not a customer website, live customer system or secure team database.

## Open it locally

Keep these files in the same directory:

- `index.html` — accessible page shell.
- `styles.css` — responsive visual design, no external fonts or CDN.
- `app.js` — views, task filters, local edits, validated import and export.
- `project-data.js` — published project content, supplied separately.

Open `index.html` in a modern browser. A local web server is preferable because browser storage for `file://` pages varies by browser. For example, from this folder run `python -m http.server 8765` and open `http://localhost:8765/`. No build step or package installation is required.

The page remains usable if `project-data.js` is absent: it explains that the plan is missing and allows new local tasks. It never invents customers, revenue or completed work.

## Everyday use

1. **Overview** shows counts derived from current task statuses and progress by workstream.
2. **Board** filters tasks by status, workstream and text. Search includes titles, descriptions, owners and local notes. Open a task to inspect acceptance criteria and dependencies.
3. **Save changes** records the selected status and notes in this browser. Statuses are manual; completing a dependency does not automatically advance another task.
4. **New task** adds a browser-local task with owner, workstream, week, priority, scope and acceptance criteria.
5. **30-day plan** groups tasks into four planning weeks and a later list. These are sequence windows, not timed alerts.
6. **Services**, **People & learning**, and **Brand & strategy** expose the shared planning content.
7. **Workspace settings** provides import, export, reset and external project links.

## Local storage and synchronisation

**Local edits; no automatic Trello sync.** This dashboard never sends network requests to Trello, GitHub or another service. External links open only when selected. Updating a dashboard status does not create or update a Trello card. Open that card and update it separately when needed.

Statuses, notes and added tasks persist in `localStorage` under `neatrelay-workspace-v1`, on the current browser and origin. A different computer, browser, local port or deployed URL has a separate copy. Browser data removal erases it. If storage is unavailable, the UI warns that changes are temporary.

Export JSON periodically for backup. **Exports include local notes**; keep them private and do not commit them to a public repository. Imports accept this dashboard's version-1 schema, enforce file size and field limits, reject malformed data, then ask for confirmation before replacing local changes. Reset also requires confirmation. Neither operation changes the published project plan or Trello.

No passwords, invitation tokens, client records, personal financial information or other secrets belong in the published data, task notes or repository. There is no login or access-control gate. Anyone with the published link can read its planning content. Browser-local storage is convenience storage, not a secure vault.

## GitHub Pages deployment

This project is published under `neatrelay/` on the `main` branch of `nathanwoork/nathanwoork.github.io`. The existing portfolio at the repository root remains separate.

- Live dashboard: https://nathanwoork.github.io/neatrelay/
- Source: https://github.com/nathanwoork/nathanwoork.github.io/tree/main/neatrelay
- Shared execution board: https://trello.com/b/EkpD9cQ1

Publish only these five dashboard files when updating the site. Do not copy the parent workspace or local JSON backups into the public repository.

Export requests a normal browser download. If downloads are unavailable in an embedded browser, open **Workspace settings → View backup JSON**, select all, and save the content privately as a `.json` file. The same file can be restored with Import.

Two typical arrangements:

- Put these files at the root of a dedicated repository and configure **Settings → Pages → Deploy from a branch → main → /(root)**.
- Put the same files under `/docs` in an existing repository and select the `/docs` folder as the publishing source. Copy only the public dashboard files; do not publish investor documents, internal finance files, exports or the entire parent workspace.

All asset paths are relative, so a repository subpath works. The dashboard uses hash navigation and requires no server-side routing. Include `project-data.js` before publishing. After deployment, check all six navigation views, an external link, mobile layout and one local status edit. Public links in the data must be ordinary project URLs, not invitation URLs containing tokens.

## Content contract

`project-data.js` defines `window.PROJECT_DATA`. The dashboard reads:

```js
window.PROJECT_DATA = {
  brand: { name, tagline, vision, mission, palette },
  asOf, trelloUrl, githubUrl,
  workstreams: [{ id, name, summary, status }],
  tasks: [{ id, title, workstream, status, week, priority, owner,
            description, acceptance, dependencies: [], trelloUrl }],
  services: [{ name, price, scope, exclusions }],
  learning: [{ title, url, why }],
  people: [{ role, when, scope, budget }],
  sources: [{ title, url }],
  decisions: [{ title, status, detail }]
};
```

IDs must be unique; task dependencies reference task IDs. Task/workstream IDs can contain letters, numbers, `.`, `_`, `:`, and `-`, with a maximum of 80 characters and an alphanumeric first character. Reserved prototype keys are rejected. Task statuses: `planned`, `ready`, `in-progress`, `blocked`, `done`. Priorities: `high`, `medium`, `low`. Week: `1`–`4` (numbers or strings) or `future`. Scope, exclusions and acceptance can be a string with line breaks or an array of strings. The palette is an object mapping colour names to six-digit hex strings. Empty external links are gracefully omitted.

Keep task IDs stable when publishing a revised plan: local status overrides match IDs. Published content is never changed by local edits. Update the data file and redeploy to change the shared plan. Existing local statuses continue to override those tasks until reset.

## Accessibility and testing

The page includes labelled controls, keyboard-operable task buttons, native modal dialogs, a skip link, visible focus indicators, live feedback, reduced-motion support, meaningful empty states and a mobile navigation toggle. At narrow widths, the board becomes a vertical list of status columns. No drag-and-drop gesture is required.

Recommended release checks: 320px and desktop widths; keyboard navigation and Escape; accurate counts after saving; filters combining search/workstream/status; task creation and reload; JSON export/import round trip; invalid JSON rejected without changes; reset cancellation and confirmation; missing data file; storage disabled; no automatic writes to external systems.

## Limitations

This is a single-person planning dashboard. It does not provide authentication, shared real-time edits, notifications, scheduled monitoring, invoices, payments, live financial reporting or automatic task execution. Reference links and service prices are planning inputs that require validation. Simultaneous tabs are not merged automatically; a notification asks you to refresh when another tab changes local state.
