# PR board test stack

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-11-24

#### Owner

The repository owner

#### Participants and approvers

APIHUB maintainers

#### Related ADRs

[0003](./0003-pnpm-nx-go-workspace-and-maven.md): the shared build graph.

<!-- markdownlint-enable MD001 -->

## Context

The PR board is an internal developer tool: a static React page bundled by Vite. Its pure TypeScript logic runs
directly under Node.js 24. Components and hooks need a browser to test layout, sticky headers, and popovers.
Fictional GitHub fixtures and a fixed clock make browser tests repeatable.

## Decision

We will use Node's built-in test runner for unit tests, with jsdom for Markdown sanitizing tests. Playwright with
Chromium will cover browser flows and screenshots against the mock Vite server.

Screenshot tests will use Linux baselines produced in the pinned Playwright container, following the other
screenshot suites in the repository. The container image tag follows the exact `@playwright/test` version.

CI will run type checks, unit coverage, and the build. Browser and screenshot tests remain local tools, run before
a pull request that changes the UI.

### Justification

- Node's test runner loads the TypeScript sources without a transform or another module pipeline. Using the Jest
  catalog from the other modules, or adding Vitest, would add setup and dependencies for this small tool.
- jsdom supports sanitizing tests, but has no layout. Playwright tests real browser behavior and provides screenshot
  comparisons. Cypress would require a separate screenshot plugin.
- Linux baselines in one container avoid platform differences in fonts and anti-aliasing. Separate Windows
  baselines would add another set of images to review.

## Consequences

- Unit tests stay fast and use few dependencies. Node cannot load `.tsx`, so components and hooks use browser tests
  and do not count toward the unit coverage gate.
- Visual changes require reviewing updated Linux baselines. Screenshot tests need Docker or Podman and the
  matching Playwright container.
- Browser tests run one at a time because the mock server stores the selected scenario globally. Contributors
  changing the UI must run them locally; CI does not verify browser flows or screenshots.
