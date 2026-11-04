# Engineering

## Stack

- TypeScript, React 19, and Vite. `vite build` bundles the page into `dist/`. The workflow publishes it without
  data (**DATA-3**); PR data loads in the browser with a personal token.
- Node.js 24.15 or later runs the tests and dev mocks straight from `.ts` files with type
  stripping. That code uses only erasable syntax and imports with `.ts` extensions.
- `marked` and DOMPurify render comment Markdown (**SEC-4**). `jsdom` gives the Markdown tests a DOM.
- GitHub Pages uses the monorepo Pages assembly and official Pages actions.

## Commands

Run these commands from `sites/pr-board/`. The module README lists Nx commands for the repository root.

```sh
pnpm install
pnpm run dev               # Vite on :5173 with mock data and hot reload
pnpm run dev:live          # official defaults and live GitHub data; enter your personal token on the page
pnpm test                 # unit tests (node --test)
pnpm run typecheck         # tsc for the browser code and the Node code
pnpm run test:e2e          # browser tests (Playwright) on the mock server, port 5174, pinned clock
pnpm run test:requirements # every requirement in docs/requirements/ has a test
pnpm run test:coverage     # unit tests with coverage of src/**/*.ts: lines 95%, branches and functions 90%
pnpm run build             # static Vite build into dist/; no token needed
pnpm run test:screenshots  # compare Windows baselines in e2e/__screenshots__
pnpm run test:linux        # browser and screenshot tests in the pinned Linux container
pnpm run test:screenshots:update  # capture new baselines after an intended visual change
```

## Project structure

```text
src/            the page: App.tsx and main.tsx, settings.ts, markdown.ts, repository.ts, config.ts, context.ts
src/model/      rules without UI: attention, bots, areas, search, derived fields, prs.json shape
src/hooks/      popovers and dialogs, loading prs.json, the live load and auto refresh, all comments of a PR,
                column widths, settings, and notes
src/components/ React components, one exported component per file: common/, cells/, header/, toolbar/, table/,
                legend/, settings/; common/ids.ts holds values several components share
src/styles/     tokens.css (colors and fonts for both themes) and one stylesheet per area of the page
src/board/      board logic without React: states, columns, the view and the address, rows, authors, repository
                groups, the Reviewers list, notes, the load status in words, formatting, storage
src/github/     the GraphQL query, raw types, normalization, and the GraphQL and REST clients
dev/            the Vite plugin with the mocks, the DEV panel, scenarios/ (mock answers), and fixtures/ (mock PRs)
scripts/        requirement checks and performance measurements
test/           unit tests, one file per module
e2e/            browser tests (Playwright) and their helpers
docs/           requirements/ (this spec) and adr/ (decision records)
```

Keep source files focused; the largest, `App.tsx`, is just under that.

## Code style

- Code that Node runs uses only erasable TypeScript: no enums, namespaces, or parameter properties; `import type`
  for types; `.ts` extensions in relative imports.
- Named constants instead of magic numbers; colors only through the theme tokens (**QUAL-6**).
- UI text, comments, and docs are in American English, sentence case, without filler.
- Data from GitHub crosses into the page through one normalization step, so components never see raw GraphQL.

```ts
// Long bot reports are cut so prs.json stays small; the popover links to the full comment.
export const COMMENT_BODY_LIMIT = 4000;
```

## Testing strategy

- **Unit tests** (`node --test`, `test/`) cover every module without React, one test file per module: the board
  logic, rules, search, settings, Markdown sanitizing, the project files (workflow, versions, color tokens), and the
  GitHub clients against the mock scenarios, so the mocks and the clients stay in sync. `pnpm run test:coverage` fails
  below 95% of lines or 90% of branches or functions of the `src/` modules they load. Hooks, components, and
  `config.ts` need a browser, so the browser tests cover them.
- **Browser tests** (Playwright, Chromium, `e2e/`) drive the page on the mock dev server and cover every user flow.
  `e2e/helpers.ts` pins the clock, resets the scenarios, and collects page errors; tests run one at a time because
  the server keeps the chosen scenario. Test titles start with the requirement ids they cover. Each test was seen
  failing in a mutation pass before it was kept.
- **Screenshot tests** (Playwright, `e2e/screenshots.spec.ts`) run on Windows locally and in the Linux container in CI.
  They cover both themes and densities, short lists, two repositories, group colors with the Repositories menu,
  the Reviewers list, every popover, the Authors menu, the comments, notes, and settings panels, the first-visit card,
  the setup wizard's Reviewers order and Labels steps, the empty and error states, a narrow window, and hidden columns.
  Baselines are committed for Windows (`-win32`) and Linux (`-linux`). `test:linux` uses the Playwright Ubuntu image
  matching the pinned dependency, through Podman on Windows or Docker on Linux. Set `PR_BOARD_CONTAINER_ENGINE` to choose the
  engine. Dependencies install from the lockfile in a temporary workspace. CI runs Linux screenshots when the board
  is affected and rejects missing baselines. The fonts ship with the page and the clock is pinned, so the comparison
  threshold is strict (0.05): a changed text color fails. After an intended change, run `test:screenshots:update` on
  Windows and `test:linux --project=screenshots --update-snapshots`. Review both sets of images before committing.
- All test data is mock data: a seeded typical board and topic-sorted corner cases on fictional people, with a fixed
  clock. Fixtures use fictional repositories, people, and PRs; configuration tests cover official repository defaults.
- Every test names the requirement ids it covers, and `pnpm run test:requirements` fails when a requirement has no
  test.
- Every new display rule gets a corner case in the matching topic file of `dev/fixtures/cases/`, with a `note` that
  the board shows under the title.

## Dev environment

- `pnpm run dev` serves the page with a Vite plugin (`dev/mock-plugin.ts`) that answers `/prs.json`, the GraphQL
  endpoint for Refresh, and the REST endpoints for the comments panel from mock scenarios, and injects the DEV
  panel. Vite restarts when files under `dev/` or `src/github/` change.
- The DEV panel switches scenarios:
  - `prs.json` on page load: typical board and corner cases, typical board only, corner cases only, two
    repositories, no PRs, 300 PRs, project data unavailable, a three-day-old snapshot, a slow load, a missing file,
    invalid JSON, and JSON without a PR list;
  - live loads: success, several pages, forbidden projects, project fields refused on a later page, fewer PRs than
    `totalCount`, a slow response, pages one by one for the load status, 401, 502, repository not found, and a network
    failure.
- Corner cases are raw GraphQL nodes, so they go through the same normalization as real data. The GraphQL mock reads
  the client's own variables type, honors every `@include` switch and the number of comments and reviews asked for,
  and the REST mock answers only the two lists the comments panel reads, with GitHub's `[bot]` logins.
- `PR_BOARD_MOCK_NOW` (an ISO time) pins the mock clock, so every scenario returns the same dates on every run.
  Browser and screenshot tests set it; without it the mocks follow the real clock.

## Boundaries

- **Always:** keep the spec in step with behavior; run unit tests, the type check, and the build before a commit;
  add a corner case for a new display rule; keep files small.
- Follow the root repository instructions for dependencies, CI, publication, and remote writes.
- **Never:** commit a token or real PR data; use real people in fixtures; disable or delete a failing test to get
  green; load scripts or styles from other hosts.

## Success criteria

- Every requirement has at least one test, and all tests pass on every commit.
- The published board loads live data with a personal token and renders without page errors in both themes.
- Each module has one concern.
