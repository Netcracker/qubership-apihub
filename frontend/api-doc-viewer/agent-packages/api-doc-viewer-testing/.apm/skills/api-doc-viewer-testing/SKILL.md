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
(`failureThreshold: 20`, custom diff threshold). Per-test timeout:
`TEST_TIMEOUT = 300_000` in `.config/it/constants.cjs`.

## Screenshot test troubleshooting (read first)

When screenshot tests hang, time out, fail mysteriously, or drift — **start here**
before changing timeouts, workers, or snapshot thresholds.

### Two Storybook hosts

| Host | Port | Used by |
| --- | --- | --- |
| Static showcase | **9009** | `npm run screenshot-test` / ITs (`storybook-functions.ts` `host()`) |
| Dev Storybook | **9099** | `npm run development:storybook` (manual inspection) |

ITs open **`iframe.html?id={storyId}&viewMode=story`** on port 9009 (Docker Chrome uses
`host.docker.internal:9009`). Dev manager URLs use `?path=/story/...` on 9099 — a story
that renders in dev **does not** prove the IT iframe URL is correct.

### Symptom matrix

| What you see | Likely cause | First action |
| --- | --- | --- |
| Long silence, then suite `PASS` | Large suite, no per-test Jest output | Not a hang — see **Long suites** below |
| `TimeoutError: waiting for selector …` | Wrong story ID (iframe 200, viewer never mounts) | Run **audit script**; fix IT story id |
| Story works in dev (9099) but IT fails | IT slug ≠ sample `caseId` / export slug mismatch | Compare IT id to `index.json` on **9009** |
| `ConnectionClosedError` / suite failed to run | Chrome crash under parallel load | `--maxWorkers 1`; fix ID mismatches first |
| Snapshot diff, height ~20px off | Layout/CSS drift, not a hang | Fix CSS or `regenerate-screenshots` — do not bump `failureThreshold` |

### Story IDs — export slug, not sample `caseId`

Canonical story id is `{metaId}--{kebab-case export name}` from Storybook **index.json**.
It is **not** always `` `{metaId}--case-${caseId}` `` from fixture directory names.

Hand-written DDL diff ITs often build ids from sample `caseId` strings. Storybook
inserts hyphens at letter↔digit boundaries when slugging export names — common traps:

| Sample / caseId token | Storybook slug segment |
| --- | --- |
| `int4` | `int-4` |
| `custom1` | `custom-1` |
| `1st` | `1-st` |

Example: export `Case_001_type_change_int4_to_bigint` →
`ddlapi-diffs-suite-column-type-changes-samples--case-001-type-change-int-4-to-bigint`,
not `…-int4-to-bigint`.

When adding hand-written diff cases, copy the slug from a freshly built **index.json** or
from the dev sidebar URL path segment — do not guess from the fixture folder name alone.

Generated compatibility-suite tests use an explicit `kebabCase()` helper — hand-written
DDL diff suites do **not**; that is the main source of ID drift.

### Audit script

`packages/api-doc-viewer/bin/audit-story-id-mismatches.mjs` compares story ids extracted
from `src/it/**/*.it-test.ts` against a Storybook **index.json**. Run while the static
server is up (during or right after `screenshot-test` showcase build):

```bash
cd packages/api-doc-viewer
curl -s http://localhost:9009/index.json -o /tmp/storybook-index.json
node bin/audit-story-id-mismatches.mjs /tmp/storybook-index.json
```

Dev Storybook (9099) index works for slug discovery while iterating, but always re-check
against the **9009** build before merging IT changes.

The script reports missing ids and, when possible, a suggested canonical id from index
entries with the same meta prefix and numeric case prefix.

### Long suites and “hang” watchdogs

Jest IT output is **suite-level** by default — individual `it(...)` names do not stream
while the suite runs. `column-type-changes-samples.it-test.ts` (127 cases) can take
**~3 minutes** with no log lines until `PASS`/`FAIL`.

- Idle watchdogs shorter than **~300s** may kill a healthy full `screenshot-test` run.
- Exclude showcase **build + server start** from idle timers — only count time after Jest
  starts.
- Isolate one suite with progress:

```bash
cd packages/api-doc-viewer
npx jest --maxWorkers 1 --verbose -c .config/it/it-test-docker.jest.config.cjs \
  src/it/ddlapi-diffs-suite/column-type-changes-samples.it-test.ts
```

(Requires static showcase on 9009 — e.g. run `npm run development:local-server:static`
in another terminal, or use full `npm run screenshot-test` which starts it automatically.)

### DDL diff viewer mount selector

Diff screenshot ITs wait for `[data-testid="ddl-table-diffs-viewer"]`. A wrong story id
 produces the same timeout as a broken viewer — always rule out ID mismatch before
 debugging React/data-layer issues.

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
PascalCase exports to kebab-case and hyphenates letter↔digit boundaries — see
**Screenshot test troubleshooting** when ids are derived from sample `caseId` strings.
Pre-compute kebab IDs when generating tests (compatibility suite generators do this).

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

## DDL API diff fixtures (`packages/samples/ddlapi-diffs/`)

Diff screenshot suites are **hand-written** (not generated). Each group has paired story and IT
files under `src/stories/ddlapi-diffs-suite/` and `src/it/ddlapi-diffs-suite/`. See
`packages/samples/ddlapi-diffs/README.md` for group layout. Story ids follow
`{meta-id}--case-{export-slug}` where `{export-slug}` is the kebab-case Storybook slug of
the `Case_*` export — **not** necessarily the raw sample `caseId` string (see troubleshooting).

### Case ids in `column-changes-except-types` — semantic hundred blocks

This group uses **three-digit case ids** where the hundreds digit encodes the change
category and the last two digits are the slot within that category:

| Block | Meaning | Current slots |
| --- | --- | --- |
| `100` | Plain add/remove column (no constraint badges) | `101`–`102` |
| `200` | Whole column added with a constraint badge | `201`–`206` |
| `300` | Whole column removed with a constraint badge | `301`–`306` |
| `400` | Existing column gained a constraint badge | `401`–`406` |
| `500` | Existing column lost a constraint badge | `501`–`506` |

Directory names follow `{id}-{kebab-description}` (e.g. `205-add-column-generated-identity`).
Other diff groups keep sequential `01`, `02`, … numbering.

### Adding a case — insert at semantic slot

When a new case mirrors an existing **identity vs expression** (or add vs remove vs became)
pair, place it in the **same hundred block** at the next free slot (or adjacent to its
sibling) — do **not** append at the end of the group or renumber other blocks.

Example pairs in `column-changes-except-types` (26 cases):

| Semantic slot | Identity case | Expression case |
| --- | --- | --- |
| Add whole column | `205-add-column-generated-identity` | `206-add-column-generated-expression` |
| Remove whole column | `305-remove-column-generated-identity` | `306-remove-column-generated-expression` |
| Existing column became generated | `404-existing-column-became-generated-identity` | `405-existing-column-became-generated-expression` |
| Existing column lost generated | `504-existing-column-lost-generated-identity` | `505-existing-column-lost-generated-expression` |

After adding a case, update:

1. Sample directory under `packages/samples/ddlapi-diffs/column-changes-except-types/`.
2. Story export in `column-changes-except-types-samples.stories.tsx`.
3. Matching `it(...)` in `column-changes-except-types-samples.it-test.ts`.
4. Group case count in `packages/samples/ddlapi-diffs/README.md` if the total changed.
5. Screenshot snapshots via `npm run regenerate-screenshots`.

For other diff groups that still use sequential ids, inserting mid-group requires
renumbering every downstream case (+1 or +2), then updating stories, IT files, and snapshots.

### SQL reuse

When adding an expression-generated column case, **copy the `GENERATED ALWAYS AS (…)` body**
from the sibling “became” or “lost” expression case in the same group — do not invent a
simplified placeholder expression unless the ticket specifies one.

### Renumbering directories safely

Rename from **highest case number downward** through a temporary prefix (e.g. `tmp-306-…`) to
avoid collisions. On bash, avoid arithmetic that treats zero-padded ids as octal — use
explicit paths or `10#` prefix.

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
