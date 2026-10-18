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

## Test-first workflow

Features are built test-first (`docs/design/README.md` → Workflow):

1. Read the design for the feature: `docs/design/<api-type>/display-coverage.md` and
   `features/`. Cases assert what the design says is displayed — never items listed as not
   displayed.
2. Add fixtures under `packages/samples/` and update the catalogue `README.md` next to them
   (layout and required sections: `packages/samples/README.md`).
3. Add stories and paired screenshot ITs; add data-layer unit tests in
   `packages/next-data-model/tests/`.
4. Hand over to `next-data-model-authoring` / `api-doc-viewer-authoring` and repeat until the
   developer confirms the feature is done.

## Commands

From `packages/api-doc-viewer/`:

| Script | Purpose |
| --- | --- |
| `npm test` | Unit tests only |
| `npm run generate-stories` | Regenerate **compatibility-suite only** (`*.generated.stories.tsx`) |
| `npm run generate-tests` | Regenerate **compatibility-suite only** (`*.generated.it-test.ts`) |
| `npm run screenshot-test` | Build showcase, start static server, run IT config |
| `npm run regenerate-screenshots` | Same as above with `--updateSnapshot` |

Root monorepo: `npm run screenshot-test` runs via Lerna.

**`generate-stories` / `generate-tests` (mandatory):** in `packages/api-doc-viewer/package.json`
these npm scripts must call **only** `generate-compatibility-suite-stories.mjs` and
`generate-compatibility-suite-tests.mjs`. Never add other `bin/generate-*.mjs` there. All
other suites are **persistent** committed sources; run their generators explicitly when
fixtures change, then commit the output.

IT Jest config: `.config/it/it-test-docker.jest.config.cjs` (local Docker
Chrome). Setup and snapshot tuning are in `.jest/setup.tests.ts`
(`failureThreshold: 20`, custom diff threshold). Per-test timeout:
`TEST_TIMEOUT = 300_000` in `.config/it/constants.cjs`.

**Both** `.config/it/it-test-docker.jest.config.cjs` and the "legacy"
`.config/it/it-test.jest.config.cjs` build their Puppeteer connection via
`prepareJestConfig` from `@netcracker/qubership-apihub-jest-chrome-in-docker-environment` —
**"legacy" does not mean "no Docker required"**; there is no non-Docker IT config in this repo.
When Docker isn't available in the current environment, you cannot run the real screenshot
suite or generate baseline PNGs. Fall back to: `npm run build:showcase` (or
`node bin/generate-json-schema-…` + `storybook build`), serve `dist-showcase/` on port 9009
(`npx ws -p 9009 -d ../../dist-showcase --spa index.html`), and visually check the new/changed
story ids in a browser — this verifies the story renders and the fixture content displays
correctly, but it is **not** a substitute for the real IT run; say so explicitly and leave
actual snapshot generation for an environment with Docker.

**Targeted single-suite runner:** `node bin/run-screenshot-test-suite.mjs test|regenerate
[test-run] [suite]` (e.g. `regenerate json-schema-diffs-suite description-changes`) wraps the
build-showcase → start-static-server → jest pipeline for one suite, so you don't have to
hand-build a `--testPathPatterns`/file-path Jest target. Prefer it over constructing the
`npx jest … src/it/…` invocation by hand for a single suite; drop to raw Jest only when you
need flags it doesn't expose (e.g. `--maxWorkers 1 --verbose` against a suite already running).
The `ddlapi-compatibility-suite` test run (`regenerate ddlapi-compatibility-suite [column|column-type|constraints|table]`)
targets the gitignored `src/it/compatibility-suite/ddlapi-compatibility-suite-*.generated.it-test.ts`;
the runner calls `npm run generate-tests` before Jest for it in both modes (and generates the
files up front when they are missing). Add further spec types to `COMPATIBILITY_TEST_RUN_IDS`.

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
| All suites pass, then `spawn wmic.exe ENOENT` + orphaned `node.exe` (Windows) | `start-server-and-test` 2.x uses `ps-tree` → `wmic.exe`, which newer Windows 11 no longer ships | Keep `start-server-and-test` at **3.x** (uses `tree-kill` / `taskkill`); do not downgrade |

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
`ddl-api-diffs-suite-column-type-changes-samples--case-001-type-change-int-4-to-bigint`,
not `…-int4-to-bigint`.

When adding hand-written diff cases, copy the slug from a freshly built **index.json** or
from the dev sidebar URL path segment — do not guess from the fixture folder name alone.

### Meta id prefix vs. folder name, and stale "Samples" in titles (session lesson)

Two more traps beyond the digit-boundary one above, both found by diffing this skill's own
examples against a freshly built `index.json` — **do not trust either from memory, always
verify against the build**:

- **`ddlapi-diffs-suite` (folder) vs. `ddl-api-diffs-suite` (meta id).** The on-disk directories
  are `src/stories/ddlapi-diffs-suite/` and `src/it/ddlapi-diffs-suite/` (one word, no hyphen).
  But their Storybook `title` starts with `"DDL API Diffs Suite/…"` — two words — so the
  **auto-derived meta id** kebab-cases to `ddl-api-diffs-suite-…` (with a hyphen). Folder name
  and meta id prefix are spelled differently; do not assume one from the other.
- **Filenames dropped `-samples`, some titles didn't.** `column-type-changes.stories.tsx` and
  `column-changes-except-types.stories.tsx` (both under `ddlapi-diffs-suite/`) were renamed to
  drop the `-samples` suffix, but their `title` fields still read `"… Samples"` (e.g. `"DDL API
  Diffs Suite/Column Type Changes Samples"`). The **meta id and every story id under it still
  carry `-samples`**, even though the filename does not. Other suites (`e2e-scenarios.*`,
  `simple-object.*`, `complex-object.*`, `combiners.*`, `number-validation-value-range.*`) have
  neither the filename nor the title suffix — don't generalize from one suite to the others.

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
while the suite runs. `column-type-changes.it-test.ts` (127 cases) can take
**~3 minutes** with no log lines until `PASS`/`FAIL`.

- Idle watchdogs shorter than **~300s** may kill a healthy full `screenshot-test` run.
- Exclude showcase **build + server start** from idle timers — only count time after Jest
  starts.
- Isolate one suite with progress:

```bash
cd packages/api-doc-viewer
npx jest --maxWorkers 1 --verbose -c .config/it/it-test-docker.jest.config.cjs \
  src/it/ddlapi-diffs-suite/column-type-changes.it-test.ts
```

(Requires static showcase on 9009 — e.g. run `npm run development:local-server:static`
in another terminal, or use full `npm run screenshot-test` which starts it automatically.)

### Viewer mount waits (`src/it/service/viewer-waits.ts`)

Every screenshot IT — hand-written or emitted by a `bin/` generator — imports its wait from
`src/it/service/viewer-waits.ts`. **Do not declare local `waitFor…` helpers in IT files**;
generators emit the import, not a function body.

| Helper | Waits for |
| --- | --- |
| `waitForJsonSchemaViewer(page, options?)` | `[data-testid="json-schema-viewer"]`, then a visible `[data-name="JsonNode"]` **or** `[data-testid="json-schema-combiner-node-viewer"]`, then paint settle |
| `waitForJsonSchemaDiffsViewer(page, options?)` | same, with `[data-testid="json-schema-diffs-viewer"]` |
| `waitForDdlTableViewer(page)` / `waitForDdlTableDiffsViewer(page)` | `[data-testid="ddl-table-viewer"]` / `[data-testid="ddl-table-diffs-viewer"]`, then paint settle |
| `waitForRenderingComplete(page)` | paint settle only (see **Flaky rendering**) |

The combiner alternative is required: a combiner root whose active option is a scalar or
another combiner renders no `JsonNode`, and waiting on `JsonNode` alone hangs until the
Puppeteer timeout. `{ switchCombinerVariant: true }` switches oneOf/anyOf nodes to the variant
holding the diff before capture — it changes rendered content, so keep it exactly as the
suite's baselines were captured (JSON Schema diffs suites except allOf use it).

A wrong story id produces the same timeout as a broken viewer — rule out ID mismatch first.


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
- `viewer-waits.ts` — per-viewer mount waits and `waitForRenderingComplete` (see
  **Viewer mount waits**).

## Generated vs hand-written suites

**Filename rule:** `.gitignore` excludes `*.generated.*`. Use that suffix **only**
when stories or tests are driven by samples from the **external**
[`Netcracker/qubership-apihub-compatibility-suites`](https://github.com/Netcracker/qubership-apihub-compatibility-suites)
repo (compatibility-suite `*.generated.stories.tsx` /
`*.generated.it-test.ts`).

**In-repo** bin scripts and utilities must **not** emit `.generated.ts`,
`.generated.stories.tsx`, or `.generated.it-test.ts` — those names are gitignored and
the output is internal, not external. Write normal committed filenames instead (e.g.
`value-range-diff-case-definitions.ts`, `number-validation-value-range.stories.tsx`).
See root `AGENTS.md` — **Generated filenames**.

Local fixture suites (JSO, AsyncAPI, DDL, JSON Schema diffs under `packages/samples/`)
use plain `*.it-test.ts` / `*.stories.tsx` / `*.ts` even when a bin script regenerates them.

**Generated — compatibility suites only** (do not edit by hand; regenerate):

- GraphQL compatibility suite — `bin/generate-compatibility-suite-stories.mjs`
  and `bin/generate-compatibility-suite-tests.mjs` →
  `src/stories/compatibility-suite/*.generated.stories.tsx` and
  `src/it/compatibility-suite/*.generated.it-test.ts`.

**Regenerated from local samples** (persistent committed output — run generators **explicitly**,
not via `npm run generate-stories` / `generate-tests`; do not edit output by hand except when
the generator is wrong):

- DDL API suites — `node bin/generate-ddl-suite-stories.mjs` and
  `node bin/generate-ddl-suite-tests.mjs` → `src/stories/ddlapi-suite/` and
  `src/it/ddlapi-suite/*.it-test.ts`.
- JSON Schema suites — `node bin/generate-json-schema-samples.mjs` (plain-type YAML fixtures),
  `node bin/generate-json-schema-suite-stories.mjs`,
  `node bin/generate-json-schema-validation-suite-stories.mjs`,
  `node bin/generate-json-schema-type-changes-samples.mjs`,
  `node bin/generate-value-range-diff-stories.mjs`, and matching `*-tests.mjs` scripts.
- JSON Schema property rename — `node bin/generate-json-schema-property-rename-suite.mjs` →
  `src/stories/json-schema-diffs-suite/property-rename.stories.tsx` and
  `src/it/json-schema-diffs-suite/property-rename.it-test.ts` from the OpenAPI fixture pairs under
  `packages/samples/json-schema-diffs/property-rename/` (stories synthesize a parameters schema —
  `apiDiff` never renames a JSON Schema property).
- Value-range diff (programmatic) — `node bin/generate-value-range-diff-stories.mjs` →
  `number-validation-value-range.stories.tsx` and paired ITs.

**Runner:** generators that import `src/stories/**/*.ts` (combiner, value-range, validation
suites) fail under plain `node` with `ERR_MODULE_NOT_FOUND` on extensionless TS imports such as
`../shared/value-range-schema-builder`. Run them with `npx jiti bin/<generator>.mjs` (jiti is a
root dev dependency).

**Shared story helpers — reuse, do not copy:**

- `src/stories/utils/sample-cases.ts` — case-folder conventions: `collectSampleSources`
  (one `sample.<ext>` per case), `collectBeforeAfterSampleSources` (`before`/`after` pairs),
  `createSampleById`. Per-API collectors (`collectSampleCases`, `collectDdlDiffSampleCases`,
  `collectDdlSampleCases`, `collectJsonSchemaSampleCases`) only map these onto typed fields.
- `src/stories/shared/test-diff-meta-keys.ts` — the one `TEST_DIFF_META_KEYS` pair for
  AsyncAPI / JSO / DDL diff stories (merge and viewer must share the Symbol instances).
- `src/stories/utils/parse-yaml-source.ts` — JSON-or-YAML parsing for stories and debug pages.
- `src/stories/ddlapi-suite/ddl-story-navigation.ts` — `ddlStoryNavigationLinkBuilder`.
- `src/stories/json-schema-diffs-suite/json-schema-diffs-utils.tsx` — all JSON Schema diff
  suites (OAS 3.0 / 3.1, substitution-title variant, `defaultHideUnchangedNodes`).

**`generate-json-schema-samples.mjs` only covers 6 hard-coded types** (`boolean`, `string`,
`number`, `integer`, `object`, `array` — its `SCHEMA_TYPES` list) under
`packages/samples/json-schema/`. A sibling directory outside that list (e.g. `combiner/`,
`description/`) is **not** touched by this generator or by `packages/samples/json-schema/
manifest.json` — it must be hand-authored (`sample.yaml` per case dir) with a **hand-written**
`*.stories.tsx`/`*.it-test.ts` pair that copies the generated-suite template (`import.meta.glob`
+ `collectJsonSchemaSampleCases` + `createCaseStoryFactory`), the same way `combiner.stories.tsx`
already does. Do not assume every `packages/samples/json-schema/*` subdirectory is generated.

**`packages/samples/json-schema-diffs/type-changes/` is a fully generated tree** — every
sub-suite under it (including `description-changes/`), its `manifest.json`, its `README.md`,
and the paired stories/IT files are written by
`node bin/generate-json-schema-type-changes-samples.mjs` from case definitions in
`bin/json-schema-type-changes-cases.mjs`. Hand-editing a `before.yaml`/`after.yaml` here is
**lost on the next regen** — add or change cases by editing the relevant `collectXxxCases`
function (`pushCase(cases, sampleDir, slug, before, after, summary)`) and rerunning the
generator. Case ids are assigned by **call order** via a shared `dirCounters` map per
`sampleDir` — inserting a new `pushCase` call in the middle of a suite renumbers every case
after it; append new cases at the **end** of the function to keep existing case ids stable.
The generator wipes and rewrites the **entire** `type-changes/` tree on every run (not just the
suite you touched) — after regenerating, `git diff --stat` should show changes limited to the
suite(s) you actually edited; anything else changing means a `collectXxxCases` function
produced different output than before, which is worth investigating before committing.

### Designing case matrices for diff suites (session lesson)

When a request lists several before→after transformations among **more than two** named
shapes/variants (e.g. "short single-line", "short multi-line", "long single-line", "long
multi-line" descriptions), don't assume the request wants only the transformations it spelled
out — it may implicitly want the **full directed N×N combination matrix**: every ordered pair
of shapes, both directions, not just the ones anchored to a single "starting" shape. A request
enumerating "A→B, A→C, A→D" is easy to read as "the 3 cases I listed" when what's actually
wanted is all 12 ordered pairs among {A, B, C, D} (A→B, B→A, A→C, C→A, …) plus the same-shape
"content changed" cases (A→A, B→B, …). Both directions matter for a diff viewer specifically
because growing and shrinking content can render differently (truncation, expand/collapse
affordances, layout reflow) — a pair tested in only one direction can hide a regression that
only shows up the other way. When a case list names 3+ shapes/variants and the transformations
between them, sketch the full matrix and confirm scope with the requester before implementing,
rather than assuming the literal list is the complete requirement.

**Hand-written** (edit stories and matching IT files together):

- JSO general suite, AsyncAPI suites, JSO/AsyncAPI diff sample suites under
  `src/stories/*/` with paired `src/it/*.it-test.ts`.
- JSON Schema diff suites — `src/stories/json-schema-diffs-hiding-unchanged-nodes-suite/` and
  `src/it/json-schema-diffs-hiding-unchanged-nodes-suite.*.it-test.ts` (fixtures under
  `packages/samples/json-schema-diffs/`).
- DDL e2e scenarios — `src/stories/ddlapi-suite/e2e-scenarios.stories.tsx`
  and `src/it/ddlapi-suite/e2e-scenarios.it-test.ts`.
- When adding a diff sample case, add the YAML pair under
  `packages/samples/`, export a story, and append a matching `it(...)` with
  the correct story ID.

Run `npm run generate-stories` / `npm run generate-tests` before screenshot runs **only when
compatibility-suite fixtures changed**. For DDL, JSON Schema, or other local sample changes,
run the relevant `node bin/generate-*.mjs` explicitly and commit the updated stories/ITs.

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
`e2e-scenarios.stories.tsx` maps sample ids to `TableKey` values and
exports one story per case; append the Storybook kebab-case story id to
`e2e-scenarios.it-test.ts` when adding a scenario.

### DDL foreign-key links in screenshot tests

FK navigation uses two public props on `DdlTableViewer` (see
`api-doc-viewer-authoring` / `api-doc-viewer-using`):

- **`navigationLinkBuilder`** — required in every DDL story; returns href string. Stories use
  the shared `ddlStoryNavigationLinkBuilder` (`src/stories/ddlapi-suite/ddl-story-navigation.ts`).
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
2. Story export in `column-changes-except-types.stories.tsx`.
3. Matching `it(...)` in `column-changes-except-types.it-test.ts`.
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

## JSON Schema diff fixtures (`packages/samples/json-schema-diffs/`)

Hand-written YAML pairs for JSON Schema diff screenshot suites. Each case directory
contains `before.yaml` and `after.yaml` — standalone JSON Schema documents (not full OpenAPI).

| Path | Purpose | Stories / tests |
| --- | --- | --- |
| `hiding-unchanged-rows/simple-object/` | Changed-only row hiding — flat object, primitive props | `simple-object.*` |
| `hiding-unchanged-rows/complex-object/` | Changed-only row hiding — nested object props | `complex-object.*` |
| `hiding-unchanged-rows/combiners/` | Changed-only row hiding — combiners (oneOf, etc.) | `combiners.*` |

Catalogue and case semantics: `packages/samples/json-schema-diffs/hiding-unchanged-rows/README.md`.

Stories glob fixtures, merge with `prepareJsonDiffSchema()`, and render through
**`JsonSchemaDiffsViewer`** via the shared `json-schema-diffs-suite/json-schema-diffs-utils.tsx`
(the hiding suite passes `defaultHideUnchangedNodes = true` to the case factory). When adding a case:

1. YAML pair under the appropriate suite subdirectory.
2. Story export in the matching `*.stories.tsx`.
3. Matching `it(...)` in the paired `src/it/json-schema-diffs-hiding-unchanged-nodes-suite.*.it-test.ts`.
4. Screenshot snapshots via `npm run regenerate-screenshots`.

## Flaky rendering

Captures must wait for the document to load and two animation frames to paint.
`waitForRenderingComplete(page)` in `src/it/service/viewer-waits.ts` does exactly that (the
viewer waits call it); use it directly after interactions such as AsyncAPI section switches
when new stories show timing-related snapshot drift.

## Pixel-diff blind spot for near-white diff colors (session lesson)

**A screenshot test can pass cleanly against a correct baseline while the code
it captured is visibly broken.** This is not a staleness or environment issue —
it is a property of `pixelmatch`'s perceptual color-distance threshold versus
this repo's diff row-background colors, which are deliberately very pale:

```
--diffs-background-yellow: rgb(254, 252, 232)
--diffs-background-red:    rgb(254, 242, 242)
--diffs-background-green:  rgb(240, 253, 244)
--diffs-background-gray:   rgb(243, 244, 246)
```

`.jest/setup.tests.ts` configures `customDiffConfig: { threshold: 0.1 }` (pixelmatch's
own default — not overridden here) and a separate `failureThreshold: 20` (an absolute
*count* of mismatched pixels tolerated, `failureThresholdType` defaults to `'pixel'`).
The `threshold: 0.1` setting is a **per-pixel perceptual color-distance** cutoff, checked
*before* `failureThreshold` ever comes into play. Verified directly with `pixelmatch`:

```js
pixelmatch(paleYellowImg, whiteImg, diffOut, w, h, { threshold: 0.1 })
// -> 0 mismatched pixels, for EVERY one of the four colors above
```

All four diff row-background colors are perceptually indistinguishable from
plain white at this threshold. A regression that makes a row's background
**disappear entirely** (as opposed to changing which color it is) produces
**zero** pixelmatch-detected mismatches, regardless of how large the affected
area is — `failureThreshold: 20` never even gets exercised, because the
per-pixel comparison already reports no difference.

**How this was found:** a real regression in `SideBySideLayout` (see the
`api-doc-viewer-authoring` skill's *`SideBySideLayout`/`OneSideLayout` width
contract* section) made `AddressRow`/`ServerAddressRow`'s diff background
collapse to content width instead of filling the row. The committed baseline
PNGs were correct (captured before the regression); the regression code ran
through the exact same Docker/Podman Jest+Puppeteer pipeline the IT suite
uses, in real terminal runs, and the suite reported **169/169 passed, no
diffs** every time — confirmed by deliberately re-running the real IT test
(not a substitute script) against the reverted, known-buggy code, both with
the pristine baseline (PASS) and by forcing a fresh write and pixel-sampling
the raw PNG bytes (which showed the row background was in fact missing).

**Practical implications:**

- Do **not** trust a passing screenshot test as proof that a row-background
  diff (or any near-white/near-background color) is actually rendering. This
  applies to all four `diffs-background_*` colors, anywhere they're used as a
  full-row/full-column background (not just AsyncAPI's `AddressRow`/
  `ServerAddressRow` — the same colors back `TextRowContent`, `TitleRowContent`,
  DDL's `AdditionalInfoRow`, and others).
- When changing a shared layout primitive that many row components render
  into (`SideBySideLayout`, `OneSideLayout`), do not rely on the existing
  screenshot suites to catch a width/sizing regression for consumers using
  these background colors — verify with a DOM/computed-style check
  (`getBoundingClientRect().width` against the column width) instead of, or
  in addition to, the screenshot diff.
- Lowering `customDiffConfig.threshold` to catch this reliably trades away
  tolerance for anti-aliasing and font-rendering noise elsewhere in the
  ~900+ existing snapshots — not a decision to make locally per-suite.

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

## Viewer-side unit tests and CSS imports (session lesson)

`packages/api-doc-viewer/tests/*.test.ts` runs plain Jest (`npm test`), not the IT/Puppeteer
config — and Jest's default transform does not parse `.css`. Many viewer `.tsx` components
transitively import CSS several hops away from the file you're testing (e.g.
`SchemaNodePlainContent.tsx` → `AdditionalInfoRow` → `DiffFloatingBadgeWrapper` →
`UxDiffFloatingBadge` → `UxDiffFloatingBadge.css`). Importing **any** symbol — even a pure,
non-React helper function defined at the top of that file — from such a `.tsx` in a unit test
fails with `SyntaxError: Unexpected token '.'`, with the stack pointing at the `.css` file, not
the helper you're actually testing.

**Fix:** when a piece of view-layer logic needs a direct unit test, extract it into a sibling
**CSS-free** `.ts` file (e.g. a `utils/` module) before writing the test, import it back into the
component, and point the test at the extracted file. Do not attempt a CSS mock or
`moduleNameMapper` workaround for one test file — extraction is simpler, keeps the logic reusable
outside the component, and matches how pure JSON Schema viewer logic is already organized
(see `JsonSchemaViewer/utils/`).
