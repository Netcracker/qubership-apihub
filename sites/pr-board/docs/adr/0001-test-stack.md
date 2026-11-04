# Test stack: Node's test runner, Playwright, and Windows and Linux screenshot baselines

## Status

Proposed

<!-- markdownlint-disable MD001 -->

#### Date

#### Owner

The repository owner

#### Participants and approvers

The repository owner; the coding agent that drafted the plan

#### Related ADRs

None

<!-- markdownlint-enable MD001 -->

## Context

The board is a static page: TypeScript and React 19, bundled by Vite, with no server of its own. Its logic splits into
two kinds of code:

- Rules without UI in `src/model/`, `src/board/`, `src/github/`, and a few top-level modules. They run under Node 24
  as plain TypeScript, because Node strips types without a build step.
- React components and hooks, which need a browser. Node's test runner cannot load `.tsx` files.

The spec in `docs/requirements/` gives every behavior an id, and the project wants every id covered by a test. The
data is fictional mock data served by a Vite plugin with a pinned clock, so a test run gives the same result every
time. The board now lives in the product monorepo. Developers use Windows or Linux, and CI runs on GitHub-hosted
Linux runners. Screenshot comparisons need a consistent browser and operating system.

## Decision

We will test in three layers:

1. **Unit tests** with Node's built-in test runner (`node --test`), loading the TypeScript sources directly. A
   coverage gate (`pnpm run test:coverage`) fails below 95% of lines or 90% of branches or functions of the `src/`
   modules the tests load.
2. **Browser tests** with Playwright and Chromium against the Vite dev server with the mocks, on port 5174 and a
   pinned clock, one test at a time. They cover components, hooks, and every user flow. CI runs them on Linux.
3. **Screenshot tests** with Playwright's `toHaveScreenshot`, as a separate project, compared with baselines
   captured on Windows and in a pinned Playwright Ubuntu container. CI compares the Linux baselines when the board
   is affected. Windows developers can run the Linux checks through Podman; Linux CI uses Docker.

Every test title starts with the requirement ids it covers, and `pnpm run test:requirements` fails when a requirement
has no test. A new test must be seen failing once, by breaking the code it checks, before it is kept.

### Justification

- **Node's test runner instead of Vitest or Jest.** It needs no dependency and no transform: Node 24 runs the
  TypeScript sources as they are. Vitest would add a dependency tree and a second module pipeline next to Vite's.
  The cost is that `.tsx` cannot run under Node, so components move to the browser layer.
- **Playwright instead of Testing Library with jsdom, or Cypress.** Layout matters on this page (sticky headers,
  column widths, popovers that close on scroll), and jsdom has no layout. Playwright drives a real browser, runs
  headless in CI, and has screenshot comparison built in, so one tool covers flows and pixels. Cypress would need a
  separate screenshot plugin and runs tests inside the page.
- **Separate Windows and Linux screenshot baselines.** Fonts and anti-aliasing differ between platforms. Windows
  baselines support local development; the pinned Playwright Ubuntu image makes Linux captures reproducible locally
  and in CI. The image version follows the exact Playwright dependency. A temporary workspace installs from the
  monorepo lockfile, so Linux does not alter Windows dependencies. The fonts ship with the page (`@fontsource`) and
  the clock is pinned, so the comparison uses a strict threshold (0.05) that catches a changed text color.
- **Requirement ids in test titles instead of a separate traceability table.** The link lives where the test lives,
  and a script checks it on every run, so it cannot go stale.

## Consequences

- Positive: few dependencies (Playwright and jsdom for Markdown sanitizing tests), fast unit tests, and one tool for
  browser flows and screenshots. Every requirement has a test or an explicit manual-check note.
- Positive: CI checks unit tests, browser flows, and Linux screenshots. Missing baselines fail in CI.
- Negative: visual changes require reviewing both sets of baselines. Linux checks need Docker or Podman and download
  the pinned image and dependencies.
- Negative: hooks and components count toward coverage only through browser tests, which the coverage gate does not
  measure.
- Neutral: browser tests run one at a time because the mock server keeps the chosen scenario globally. The suite
  takes about four minutes.
