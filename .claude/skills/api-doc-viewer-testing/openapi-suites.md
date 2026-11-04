# OpenAPI fixtures, stories, and screenshot suites

How the two OpenAPI suites are built, extended, and maintained. Design (what is covered and why):
`docs/design/openapi/features/plain-case-matrix.md` and
`docs/design/openapi/features/diffs-case-matrix.md`. Report any disagreement between this file,
the design, and the code; the design wins.

## Everything is generated — edit definitions, never output

| Suite | Case definitions | Generator | Output (all recreated on every run) |
| --- | --- | --- | --- |
| `OpenAPI Operation Suite` (plain) | `packages/api-doc-viewer/bin/openapi-plain-case-definitions.mjs` | `node bin/generate-openapi-suite.mjs` | `packages/samples/openapi/**` (fixtures + catalogues), `src/stories/openapi-suite/<dialect>-<group>[-<sub-group>].stories.tsx`, `src/it/openapi-suite/<dialect>-<group>[-<sub-group>].it-test.ts`, generated block of `plain-case-matrix.md` |
| `OpenAPI Operation Diffs Suite` | `bin/openapi-diffs-case-definitions.mjs` | `node bin/generate-openapi-diffs-suite.mjs` | `packages/samples/openapi-diffs/**`, `src/stories/openapi-diffs-suite/<category>.stories.tsx`, `src/it/openapi-diffs-suite/<category>.it-test.ts`, generated block of `diffs-case-matrix.md` |

- Run generators from `packages/api-doc-viewer/`. They are **not** in `pnpm run generate-*`
  (those are compatibility-suite only); commit the output.
- Each generator **deletes** its sample root, its `*.stories.tsx` in the story folder, and its
  `*.it-test.ts` files in `src/it/openapi-[diffs-]suite/` (never its `__image_snapshots__/`) before
  writing. Never put hand-written files there;
  hand-written helpers live next to them under other names (`OpenApiSampleStory.tsx`,
  `OpenApiDiffSampleStory.tsx`, `openapi-story-args.ts`, `openapi-suite-utils.ts`).
- The design docs keep hand-written rules **outside** the
  `<!-- BEGIN generated … -->` / `<!-- END generated -->` markers; the generator rewrites only the
  block between them (it throws if the markers are missing).
- Story ids come from `bin/storybook-story-id-utils.mjs` (`toStorybookMetaId`,
  `toStorybookStorySlug` = lodash `kebabCase` of the `Case_<id>` export). That util imports
  `sanitize` from `storybook/internal/csf` (Storybook 9); `@storybook/csf` is not installed.

## Plain suite (`packages/samples/openapi/`)

Folder = `<dialect>/<group>[/<sub-group>]/<NN-slug>/sample.yaml`; one operation per document.
Every case definition is `{ slug, title, document, path, method, switchTo?, argVariants? }`;
`path` + `method` are written into the story, never guessed. Case ids are numbered per folder
(`digits` per group: E2E uses 3).

| Group | Storybook | Purpose |
| --- | --- | --- |
| `oas30/e2e` | `OAS 3.0/E2E` | How sections look **next to each other** (see below). |
| `oas30/minimal` | `OAS 3.0/Minimal` | Smallest valid operations: `default` only. |
| `oas30/http-methods` | `OAS 3.0/HTTP Methods` | Every method badge from **one** `template/sample.yaml` (see **Template groups**). |
| `oas30/fields/<sub-group>` | `OAS 3.0/Fields/<Sub-group>` | Required fields + exactly the covered field. Sub-groups: `operation`, `security` (one per scheme type), `parameters` (one per location), `request-body`, `request-combinations` (every pair of path / query / headers / cookies / request body), `responses/{2xx,3xx,4xx,5xx}`. |
| `oas30/structure` | `OAS 3.0/Document Structure` | Path items, `$ref`, ignored headers, response-code order, inherited / disabled security, deprecated operation. The data-layer unit tests depend on these. |
| `oas31/fields/{security,responses,schemas}`, `oas31/structure` | `OAS 3.1/…` | **Only** what displays differently from 3.0 (`features/oas-versions.md`). Never copy 3.0 cases here. |

### Template groups (`http-methods`)

A group may declare `template: { slug, document, path, method }` instead of per-case documents. The
generator writes only `<group>/template/sample.yaml` (with a header comment) and emits stories with
`sampleYaml` = the template, `methodTemplate: true`, and `argTypes`
`OPENAPI_METHOD_TEMPLATE_STORY_ARG_TYPES` (adds a `method` select). `OpenApiSampleStory` then serves
the template's only operation as the story's `method` (`serveTemplateOperationAs` in
`openapi-suite-utils.ts`, unit-tested in `tests/openapi-method-template.test.ts`). Cases carry
`path` + `method` only; ITs are unchanged (one row per case). Use this when cases differ by one
story arg, not by document content — do not add per-method fixtures.

### E2E: pairs + consecutive windows + all sections (keep this approach)

The E2E group exists to review **section adjacency** — spacing, preceded-by rules, header levels,
frame and selector rows meeting each other. It is built from one ordered vocabulary of sections,
`SECTIONS` in the definitions file, in **display order**:

`summary`, `operation-id`, `address`, `description`, `security`, `operation-extensions`,
`path-parameters`, `query-parameters`, `headers`, `cookies`, `body`,
`responses-1-code-headers`, `responses-1-code-body`, `responses-2-codes-headers`,
`responses-2-codes-body`.

Each section is `{ id, apply(ctx), codes? }`; `buildE2eDocument(ids)` starts from a minimal
operation and applies the selected sections in vocabulary order. Three kinds of cases:

| Kind | Slug | What it proves | Count (15 sections) |
| --- | --- | --- | ---: |
| **Pair** | `pair--<a>--<b>` | Every possible "A directly above B" adjacency: with only two sections present, A is immediately followed by B whatever lies between them in the vocabulary. Pairs are the adjacency coverage. | C(15,2) − 4 conflicts = 101 |
| **Window** | `window-<k>--<first>--to--<last>` | Consecutive runs of k ≥ 3 sections in display order: how adjacencies **compose** — cumulative spacing, nested levels (Request h2 → parameter h3 → Body h3), long pages. Cheap (O(n²)) where all subsets would be 2ⁿ. | 66 (sizes 3–13: 11, 10, …, 1) |
| **All sections** | `all-sections` | The full page; also captured with `noHeading` (`argVariants`). Uses the 2-codes response sections. | 1 |

Rules that keep the matrix valid:

- **Conflicts.** A section may declare `codes: 1 | 2`; a combination containing both 1-code and
  2-codes sections is skipped (`conflicts()`). Consequence: windows never reach the 2-codes
  sections (any run of ≥3 that includes them also includes a 1-code section), so 2-codes sections
  appear in pairs and in all-sections only. This is intended — do not "fix" it by reordering.
- **Always-present rows.** The address row always renders: `address` "on" = a long literal path,
  "off" = `/orders`; `path-parameters` appends `/{orderId}`. OAS 3.0 requires `responses`, so a
  status-only `200` (`description: ''`) is always present; the 2-codes sections add `400`.
- **Adding a section.** Insert it into `SECTIONS` at its **display position** (the order must
  match `OPENAPI_SECTION_ORDER` and the header rows above it). Pairs and windows are derived
  automatically; ids after it are renumbered (fine — the suite is regenerated as a whole, and
  baselines are regenerated with it). Update the column map `SECTION_COLUMNS` in the generator
  (matrix grid header). Expect roughly n more pairs and n more windows.
- **Reordering sections in the viewer** (`config/section-order.ts`) means reordering `SECTIONS`
  the same way, then regenerating — the windows follow display order by design.
- The matrix doc renders E2E as a case × section ✓ grid; review windows top-down to see a page
  grow one section at a time.

### Fields conventions

- Parameter / header variants are one entry each: **required, optional, deprecated,
  `content`-described**. Path parameters are always `required: true` (spec), so the optional slot
  is a second required one, and the path template contains every path parameter.
- Request body variants: required / optional / deprecated × 1 / 2 media types. OpenAPI has no
  `deprecated` on Request Body or Media Type: "deprecated" = the media type schema root has
  `deprecated: true`.
- Response bodies: a Response Object has **no `required`** (only `description`, `headers`,
  `content`, `links`); presence of a body is `content` itself. Response body variants are
  1 / 2 media types × plain / deprecated schema root. Do not invent `x-required` cases.
- Response `description` is required by the spec: `''` stands for "no description" (the viewer
  hides empty text).
- Response cases put a `default` stub next to the target code and auto-switch to the target.

### Auto-switch (`switchTo`)

Cases list option test ids to select before review/capture, in order: `security-alternative-<i>`,
`response-code-<code>`, `request-media-type-<key>`, `response-media-type-<key>` (media-type ids are
prefixed per body because both bodies can show the same media type).

- One pure-DOM implementation, `switchOpenApiOptions(testIds, root = document)` in
  `src/utils/openapi/switch-openapi-options.ts` — same contract as
  `switchCombinerNodesToChangedVariant`: every constant/helper **inside** the function body, so
  `page.evaluate(switchOpenApiOptions, ids)` works.
- Stories: `play: playOpenApiAutoSwitch` (control `autoSwitch`, default on).
- ITs: `waitForOpenApiOperationViewer(page, { switchTo })` and story arg `autoSwitch: '!false'`
  (the IT selects the options itself; do not rely on `play` under `iframe.html`).

## Diffs suite (`packages/samples/openapi-diffs/`)

- **Minimal operation per category** (design: `diffs-case-matrix.md` → Minimal operation): each
  category has its own base (`createOperationBase`, `createParametersBase(location)`,
  `createSecurityBase`, …) holding only its fragment on `POST /orders` (`/orders/{orderId}` for path
  parameters); a case's `setup` adds anything else it needs (a summary next to `deprecated`, a
  second scheme via `defineSchemes`, document-level security). OAS 3.0 bases outside the response
  categories keep a status-only `200`; the OAS 3.1 base has no `responses`. Never put content into a
  base that its category does not cover: a shared "realistic" base makes every case fail when an
  unrelated fragment's rendering changes. Every case changes one thing via mutators. `pair([...])` emits a change **and its opposite** on adjacent
  ids (add ↔ remove, on ↔ off, A → B ↔ B → A for moves; `reversed: true` when `apply` removes
  something). `change(...)` = a value replace, **no** reverse case (decided: it would only swap
  texts).
- Parameter-like fragments (path / query / header / cookie parameters, response headers) share one
  case list; the two bodies share another. **Same id = same change in every folder.** A fragment
  that cannot express a change is skipped and its number stays unused (gap), so numbers never
  drift between folders. Fragment-only extras are appended after the shared list.
- Path parameters cannot be added / removed / made optional (the path template would change and
  `apiDiff` pairs different paths = a different operation).
- Response cases: whole add / remove per code kind; everything else changes the initially
  selected `200`, except one non-initial-code marker case. `clicks` select the changed option in ITs.
- JSON Schema internals are not fanned out (one representative property add / remove + one schema
  replace per body).
- Stories pick `POST` and the first `paths` key of the **after** document (merged documents key a
  renamed path by its after key); diff meta keys are api-diff's `DIFF_META_KEY` /
  `DIFFS_AGGREGATED_META_KEY` (what `mergeOpenApiDocuments` writes).
- Known `apiDiff` gap kept as cases: OAS 3.1 roles on a non-OAuth scheme produce no diff
  (`oas31/04-role-scopes-*`; titles say so).

## Stories and ITs — shared rules

- **One story per case, `detailed` only.** Display mode is the story control `displayMode`
  (default `detailed`); these suites' ITs capture the default only. `simple` is covered once per
  hideable element by `OpenAPI Operation [Diffs ]Suite (Display Mode = simple)`
  (`bin/generate-display-mode-simple-suites.mjs`, see SKILL.md → Display mode suites), the only ITs
  that run `describe.each(['detailed', 'simple'])`. Never add a per-mode export, fixture, or IT
  branch here. Plain stories also have `autoSwitch` and `noHeading` controls
  (`OPENAPI_PLAIN_STORY_ARG_TYPES`); diff stories `displayMode` and `hideUnchangedNodes`
  (`OPENAPI_DIFFS_STORY_ARG_TYPES`, default `false` — hiding is off in the diffs suite, for the
  OpenAPI layer and every embedded JSON Schema / JSO viewer; only the "Hiding Unchanged Nodes"
  suite sets `true`).
- Storybook URL args encode booleans as `!true` / `!false`; a bare `'false'` arrives as a string.
- Waits: `waitForOpenApiOperationViewer` / `waitForOpenApiOperationDiffsViewer`
  (`src/it/service/viewer-waits.ts`); never local wait helpers.
- Suite ids for `bin/run-screenshot-test-suite.mjs`: `openapi-suite`, `openapi-diffs-suite`
  (folders `src/it/openapi-[diffs-]suite/`, baselines in their `__image_snapshots__/`).

## Maintenance workflow

1. Change the design (`plain-case-matrix.md` / `diffs-case-matrix.md` rules) if the coverage
   intent changes.
2. Edit the case definitions; run the generator. Run it twice and compare hashes — output must be
   deterministic.
3. Smoke-render without Docker when needed: bundle a scratch entry with the root `esbuild`
   (`--platform=node --jsx=automatic --tsconfig=tsconfig.json --loader:.css=empty`) that renders
   every case with `react-dom/server` and checks every `switchTo` test id is
   present. Keep the entry file out of the repo (delete it after bundling).
4. Data-layer unit tests load fixtures by id (`tests/helpers/openapi-fixtures.ts`:
   `loadNormalizedOpenApiSample('oas30/structure/01-…')`, `loadMergedOpenApiSample('request-body/04-…')`).
   Renumbering a folder breaks them — remap ids and keep the assertions.
5. `pnpm exec tsc --noEmit -p .`, eslint on the generated files, `pnpm exec jest` in both packages.
6. Refresh `packages/samples/openapi-review-checklist.md` (it lists every case; keep existing ticks
   for unchanged ids).
7. `node bin/run-screenshot-test-suite.mjs regenerate openapi-suite` (and `openapi-diffs-suite`),
   then `bin/audit-story-id-mismatches.mjs` against the built `index.json`; review the images.

## Before running a generator

- **Check the samples are reproducible first.** A generator recreates its whole sample root, so
  any hand edit to a `sample.yaml` / `before.yaml` / `after.yaml` is lost. Port hand edits into the
  case definitions before regenerating. To check, write the definitions' documents to a scratch
  folder (import `collectGroups` / `collectCategories` and `stringify` each case into a temp dir,
  not into the repo) and run `diff -rq --exclude=README.md <samples> <scratch>`; an empty diff means
  regeneration is safe.
- **Windows `EPERM` leaves a half-deleted folder.** `fs.rmSync(samplesRoot, { recursive: true })`
  can fail on the root folder after deleting part of its content (a file manager, IDE, or Storybook
  watcher holds a handle). The generator stops before writing anything. Recover from git, restoring
  only the deleted paths (never a blanket checkout over uncommitted edits):
  `git status --short <samples-root> | awk '$1=="D"{print $2}'` → `git restore --source=HEAD -- <paths>`.
  Then close the program holding the folder and rerun.

## Traps found while building these suites

- **Integer-like object keys enumerate first in JS.** Response codes stored in an object come out
  as `101, 200, 500, 2XX, default` whatever the insertion order. Canonical order is restored on
  the tree (`OpenApiTreeBuilder.sortResponseCodes`); the `structure/04-response-code-order` case
  guards it. Expect the same trap for any numeric-looking map key.
- `api-unifier` merges path-item parameters **after** the operation's own parameters.
- Mixed, multi-purpose fixtures hide bugs (the code-order bug survived nine hand-written
  fixtures); prefer one concern per case and generated combinations.

## Arrow buttons suites (programmatic, hand-written; three screenshots per test)

`OpenAPI Operation Suite (Arrow Buttons)/{Security Toolbar,Response Codes}` and
`OpenAPI Operation Diffs Suite (Arrow Buttons)/{Security Toolbar,Response Codes}` exercise the shared
`ArrowScrollStrip` (design: `docs/design/shared/features/arrow-scroll-strip.md` → Tests). Cases
come from `packages/samples/src/openapi-arrow-buttons.ts` (`single` / `every` lineups per toolbar;
the security `every` lineup adds `A + B` alternatives because the 9 scheme kinds alone fit the 1800px
viewport). An overflowing strip is **one test with three `toMatchImageSnapshot()` calls** (snapshot
files `-1`, `-2`, `-3`) through `expectArrowScrollStripStates` (`src/it/service/arrow-scroll-strip.ts`):
left edge, the median option (⌊n / 2⌋ + 1) scrolled to the strip's centre, right edge — each with
its arrow states asserted. "Median option visible" is not a middle state: in the plain security
case it is visible from the start. Arrows are clicked in the DOM (`element.click()`, no hover
background captured), then the helper waits until `scrollLeft` is stable for 5 frames (smooth
scroll). In diffs the strips are one per side: index `0` origin, `1` changed. Display mode
`detailed` only. Suite ids for the runner: `openapi-arrow-buttons-suite`,
`openapi-diffs-arrow-buttons-suite`.

## Hiding unchanged nodes suite (programmatic, hand-written)

`OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes)/Security Schemes` is **not** produced by
`generate-openapi-diffs-suite.mjs` and has no YAML: cases come from one template plus one fragment
per scheme kind toggled by `hasChanges` in `packages/samples/src/openapi-diffs-hiding-unchanged-nodes.ts`
(design: `docs/design/openapi/features/hiding-unchanged-nodes.md`). Stories pass the built documents
as JSON strings to `OpenApiDiffSampleStory` (`parseYamlSource` reads JSON) and add a
`hideUnchangedNodes` control. The IT captures every case collapsed (`detailed`) and, for cases with
an unchanged card, a `revealed` capture after clicking every `[data-testid="security-show-unchanged"] button`.
When cases change, update the story exports and the IT `CASES` together (ids from
`bin/storybook-story-id-utils.mjs` — `oauth2` slugs to `oauth-2`). Suite id for the runner:
`openapi-diffs-hiding-unchanged-nodes-suite`.

`OpenApiOperationDiffsViewer` hides unchanged card content by default, so every
`openapi-diffs-suite` security case that keeps an unchanged scheme (the `oauth` card of the security
base) renders that card collapsed — regenerate those baselines together with card changes.
