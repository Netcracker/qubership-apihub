---
description: Write api-doc-viewer screenshot integration tests against Storybook stories and sample fixtures.
---

# Testing api-doc-viewer

Screenshot integration tests live in `packages/api-doc-viewer/src/it/`. They
run Jest with `jest-puppeteer` and `jest-image-snapshot` against a static
Storybook build.

**Documentation scope:** describe tests and fixtures in library terms only. Do
**not** name or reference consuming applications, their repositories, file
paths, or UI components in this skill.

## Commands

From `packages/api-doc-viewer/`:

| Script | Purpose |
| --- | --- |
| `npm test` | Unit tests only |
| `npm run screenshot-test` | Build showcase, start static server, run IT config |
| `npm run regenerate-screenshots` | Same as above with `--updateSnapshot` |

Root monorepo: `npm run screenshot-test` runs via Lerna.

IT Jest config: `.config/it/it-test-docker.jest.config.cjs` (local Docker
Chrome). Setup and snapshot tuning are in `.jest/setup.tests.ts`
(`failureThreshold: 20`, custom diff threshold).

## Test anatomy

Each IT file targets one Storybook meta (suite). Pattern:

```typescript
import { storyPage } from './service/storybook-service'

beforeEach(async () => {
  await jestPuppeteer.resetPage()
})

it('story-kebab-name', async () => {
  const story = await storyPage(page, 'meta-id--story-kebab-name')
  const component = await story.viewComponent()
  expect(await component.captureScreenshot()).toMatchImageSnapshot()
})
```

Story IDs are `{metaId}--{kebab-case export name}`. Storybook converts
PascalCase exports to kebab-case; pre-compute kebab IDs when generating tests.

Helpers in `src/it/service/`:

- `storyPage(page, storyId)` — opens iframe URL, sets viewport, hides nav noise.
- `story.viewComponent()` — locates the rendered viewer root for screenshots.

## Generated vs hand-written suites

**Filename rule:** use `.generated.it-test.ts` / `.generated.stories.tsx` **only**
when stories are driven by samples from
[`Netcracker/qubership-apihub-compatibility-suites`](https://github.com/Netcracker/qubership-apihub-compatibility-suites).
Local fixture suites (JSO, AsyncAPI, DDL under `packages/samples/`) use plain
`*.it-test.ts` / `*.stories.tsx` even when a bin script regenerates them.

**Generated — compatibility suites only** (do not edit by hand; regenerate):

- GraphQL compatibility suite — `bin/generate-compatibility-suite-stories.mjs`
  and `bin/generate-compatibility-suite-tests.mjs` →
  `src/stories/compatibility-suite/*.generated.stories.tsx` and
  `src/it/compatibility-suite/*.generated.it-test.ts`.

**Regenerated from local samples** (do not edit by hand; run generators):

- DDL API suites — `bin/generate-ddl-suite-stories.mjs` and
  `bin/generate-ddl-suite-tests.mjs` → `src/stories/ddlapi-suite/` and
  `src/it/ddlapi-suite/*.it-test.ts` (no `generated` in the filename).

**Hand-written** (edit stories and matching IT files together):

- JSO general suite, AsyncAPI suites, JSO/AsyncAPI diff sample suites under
  `src/stories/*/` with paired `src/it/*.it-test.ts`.
- DDL e2e scenarios — `src/stories/ddlapi-suite/e2e-scenarios-samples.stories.tsx`
  and `src/it/ddlapi-suite/e2e-scenarios-samples.it-test.ts`.
- When adding a diff sample case, add the YAML pair under
  `packages/samples/`, export a story, and append a matching `it(...)` with
  the correct story ID.

Run `npm run generate-stories` / `npm run generate-tests` before screenshot
runs when compatibility-suite or DDL sample fixtures changed.

## DDL API sample fixtures

SQL fixtures for DDL viewer screenshot tests live under
`packages/samples/ddlapi/`. Each case is a directory containing `sample.sql`.

| Path | Purpose | Stories / tests |
| --- | --- | --- |
| `column-constraints/` | Column constraint permutations | Generated suite |
| `column-types/` | PostgreSQL column types | Generated suite |
| `indexes/` | Index definitions | Generated suite |
| `escaping-spec-chars/` | Escaping in defaults and expressions | Generated suite |
| `e2e-scenarios/` | Multi-table end-to-end viewer scenarios | Hand-written E2E Scenarios suite |

**Generated suites** — one subdirectory per case (e.g.
`column-types/varchar/sample.sql`). Regenerate stories and IT files after
adding or renaming cases.

**E2E scenarios** — realistic table layouts used by the E2E Scenarios suite.
Each case directory name is the sample id (e.g. `e2e-scenarios/users/`).
`e2e-scenarios-samples.stories.tsx` maps sample ids to `TableKey` values and
exports one story per case; append the Storybook kebab-case story id to
`e2e-scenarios-samples.it-test.ts` when adding a scenario.

### DDL foreign-key links in screenshot tests

FK navigation uses two public props on `DdlTableViewer` (see
`api-doc-viewer-authoring` / `api-doc-viewer-using`):

- **`navigationLinkBuilder`** — required in every DDL story; returns href string.
- **`navigationLinkComponent`** — omitted in Storybook/screenshot suites; default
  `DefaultNavigationLink` renders `<a href>`.

Story helpers (e.g. `ddl-samples-common.tsx`) typically return hash URLs such as
`` `#${schema}.${table}.${column}` `` — sufficient for visual regression because
screenshots capture layout, not navigation behaviour.

| Selector / class | Purpose |
| --- | --- |
| `.ddlapi-foreign-key` | FK badge + link row in column subheader |
| `.ddlapi-foreign-key-link` | Link element (anchor by default) |

**Generated column-constraints suite** includes FK sample cases (`foreign-key`,
`foreign-key-not-null`, …). Regenerate stories/tests after adding FK fixtures;
no custom `navigationLinkComponent` unless intentionally testing link styling.

Do **not** assert client-side routing in screenshot ITs — that belongs in host
application tests. Library ITs only verify rendered markup and visuals.

## Flaky rendering

Some AsyncAPI diff stories need a paint settle helper before capture:

```typescript
await page.waitForFunction(() => document.readyState === 'complete')
await page.evaluate(() => new Promise<void>(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
))
```

Reuse this pattern when new stories show timing-related snapshot drift.

## Snapshots

Images land in `src/it/__image_snapshots__/`. Snapshot identifiers follow
`{describe-slug}-{test-name}-{counter}` unless overridden via
`customSnapshotIdentifier`.

After intentional visual changes, run `regenerate-screenshots` and commit
updated PNGs with the code change — do not bump `failureThreshold` to mask
regressions.

## Data-layer tests

Builder and aggregator unit tests belong in
`packages/next-data-model/tests/`, not in screenshot IT files. Keep view
and data test boundaries separate.
