# Test data: the packing engine

QA cannot publish thousands of fixtures one by one. The engine packs them into a few dozen packages, checks that
packing changed nothing, and records each case's operations and screenshot baseline in a manifest.

## Commands

From the repository root, with `S=.agents/skills/api-doc-viewer-feature-test-plan/scripts`, Node.js 22.15 or later,
after `pnpm install`:

```bash
pnpm exec nx run-many -t build -p api-diff compatibility-suites ddlapi
node $S/packing/pack.mjs --qa qa-<feature>       # writes qa-<feature>/samples/packages/
node $S/packing/verify.mjs --qa qa-<feature>     # 0 failures expected
node $S/results-sheet.mjs --qa qa-<feature>      # after the case lists exist
node $S/bundle.mjs --qa qa-<feature>             # the zip for QA (handover.md)
```

## The config

`qa-<feature>/config/test-plan.config.mjs` default-exports an async function. The engine calls it with
`{ load, lib }`: `load('<builder>')` imports a module of `scripts/packing/builders/`, and `lib` is
`scripts/packing/lib.mjs`. It returns:

| Field | Meaning |
| --- | --- |
| `packages` | The package definitions below, in the order of the index README |
| `caseLists` | The case lists of the results sheet, relative to the QA folder; a folder stands for its Markdown files (not `README.md`), sorted by name |
| `nfCases` | A regular expression of case IDs that include the mandatory NF check (rows whose Expected names NF are added) |
| `checkedCaseLists` | A regular expression of case lists whose "Open" column must name only existing package cases |

Start from `templates/test-plan.config.mjs`. A plan that needs a builder of its own (plan-specific case IDs, cases
built in code) keeps it next to the config in `config/` and passes it `lib`.

## Package definitions

```js
{ name: 'QA-DIFFS-SECURITY', layout: 'diffs', description: '…', sources: [{ dir: 'openapi-diffs/security', code: 'dsec' }] }
```

| Field | Values |
| --- | --- |
| `name` | `QA-<AREA>`; it is the package name QA creates |
| `layout` | `plain` (one version, `1.0`) or `diffs` (`1.0` and `2.0`, compared) |
| `format` | Absent: OpenAPI packing. `files`: one document per case. `versions`: copied samples (from `builders/copied.mjs`) |
| `sources` | `{ dir, code }`: a fixture folder of `packages/samples` and the case-ID code; `{ dir, code, methods }`: one template served as each HTTP method; `{ build }`: a function that returns cases |

A case is `{ id, fixture, sides, title?, extension?, baselineHint? }`: `sides` holds one document (plain) or two
(diffs); `fixture` names the source for QA and for the baseline lookup.

## Packing modes

**OpenAPI packing (default).** Each case's path items move under `/<case-id>/…`, so QA finds a case by searching the
prefix. Cases share a document only when:

- their root keys other than `info`, `paths`, `components` are equal (the `openapi` version, root `security`,
  `servers`), and a case that adds or removes the whole `components` object stays apart (apiDiff classifies that
  removal differently from the removal of one component);
- every component both use (defined, referenced by `$ref`, or named by a security requirement, even when undefined)
  has the same value on each side.

Summaries, operation IDs, and component names stay as the fixture has them; repeated `operationId` values are fine,
because APIHUB builds operation IDs from the path and the method.

**`files`.** For AsyncAPI, DDL, GraphQL, and standalone JSON Schema: one document per case, because their documents
cannot be merged without renaming what the viewers show. Only the names APIHUB builds IDs from carry the case ID:
AsyncAPI operation keys (`prefixAsyncApiOperations`), DDL schema names (`prefixDdlSchemas`: `public` and unqualified
tables move into `<case>`, other schemas into `<case>_<name>`, types and domains with them; keep schema names within
PostgreSQL's 63 characters), GraphQL root fields (`prefixGraphqlRootFields`). A format module checks each of them
(below).

**`versions`.** Samples copied byte for byte under one document name per package (`builders/copied.mjs`:
`pair`, `single`, `folderPair`, `copiedPackage`). One item: versions `1.0` and `2.0`. Several items: `<item>-1.0` and
`<item>-2.0` each, because one issue's samples often share paths.

## Builders

| Module | Exports |
| --- | --- |
| `json-schema` | `wrapSchema` (a schema as the request body of `POST /orders`), `plainFolderCases`, `diffsFolderCases`, `combinerPlainCases`, `combinerDiffsCases`, `valueRangePlainCases`, `valueRangeDiffsCases` (from the TypeScript builders of the stories), `standaloneFileCases`, `asyncApiMessageCases` |
| `regression` | `asyncApiPlainCases`, `asyncApiDiffsCases`, `ddlPlainCases`, `ddlDiffsCases`, `graphqlPlainCases`, `graphqlDiffsCases`, `jsoDiffsCases` (a JSO pair as the `x-payload` extension of an operation) |
| `openapi-hiding-and-arrows` | `hidingDiffsCases`, `arrowsPlainCases`, `arrowsDiffsCases` (from `packages/samples/src/*.ts`) |
| `compatibility` | `compatibilitySampleCases` (the first case of each OpenAPI suite per OAS version pair), `graphqlCompatibilityPairs` |
| `copied` | `pair`, `single`, `folderPair`, `versionsOf`, `copiedPackage` |
| `composite` | `compositeCases`: many single-operation cases merged into a few big operations (below) |

A config can also read a fixture folder itself with `lib.sourceCases({ dir, code }, layout)` and filter the result
(one case of a suite, a suite without the cases another package takes).

A builder that imports the TypeScript builders of `packages/samples/src` or `packages/api-doc-viewer/src/stories`
goes through `typescript-loader.mjs`: Node cannot load them directly (extensionless imports, types imported as
values). A builder the plan needs that is not generic (plan-specific case IDs, new cases) lives in the plan's
`config/` and receives `lib` from the config function.

## Composite cases

A compact plan (30–60 manual cases) cannot open a thousand operations. `builders/composite.mjs` merges the operations
of many fixture cases (its members) into one big operation, so that one manual case opens one operation and checks one
of its sections:

```js
{ build: () => compositeCases({ code: 'cprm', layout: 'diffs', title: 'Parameters',
  sources: [{ dir: 'openapi-diffs/query-parameters', code: 'dqp' }, { dir: 'openapi-diffs/cookies', code: 'dck' }] }) }
```

| Option | Meaning |
| --- | --- |
| `code`, `title` | The composite case IDs (`cprm-01`, `cprm-02`, …) and the title of their documents |
| `layout` | `plain` or `diffs`, as the package |
| `sources` | The member sources, as a package's (`{ dir, code }` or `{ build }`); every member case ID must be unique |
| `mode` | `operation` (default) merges section by section; `schema-properties` makes each member's request body schema (from `wrapSchema`) the property `<case ID>` of one object schema |
| `maxMembers` | The most members per composite (default: no limit); 60–90 keeps a JSON Schema composite readable |

In `operation` mode, lists and maps merge (parameters, security alternatives, response headers and links, media
types, extensions, components); a name another member uses with a different value gets the member's case ID
(`status_dqp-07`, `application/vnd.drsb-02+json`, `Order_dsec-11`). Other fields have one owner; two members that
need the same field with different values go into different composites. In diffs, a member needs what it changes and
what refers to a component it changes; the rest is context, dropped where it collides. Path parameters of later members
are appended to the first member's path.

The check is built in: apiDiff of every diffs composite, with the renaming undone, must find exactly its members'
diffs. A member that fails is evicted and returned as a case of its own; `pack.mjs` prints them. `COMPOSITE_DEBUG=1`
prints the missing and unexpected diffs. The manifest gives a composite its `members` (fixture and baseline each), the
package README lists them in a "Composite cases" table, and the results sheet names every member's baseline.

What does not merge, found on the OpenAPI suites: security alternatives that a member adds or removes (apiDiff matches
them by position), media type renames (apiDiff detects a rename only between two lone media types), a whole request
body or response code added or removed next to another member's change of the same body or code, and added or removed
operations. Expect 75–98% of a diffs suite in composites (parameters merge almost whole; operation header and
security cases split most), the rest on their own.

## Format modules

`scripts/packing/formats/` holds one module per document type of "files" packages: `asyncapi.mjs`, `ddl.mjs`,
`graphql.mjs`. The interface is at the top of `formats/index.mjs`; the engine loads every module of the folder, so a
new API type adds a file and changes nothing else ([extending.md](extending.md)).

| Member | Used by | Does |
| --- | --- | --- |
| `matches(content, item)` | both | Whether a written case side belongs to the format |
| `lookFor(content)` | `pack.mjs` | What QA searches in the portal (the "Look for" column of the package README) |
| `ids(content, item)` | `verify.mjs` | The IDs APIHUB builds from the document; they must be unique within a version |
| `compare({ content, item, side, fixtureFile })` | `verify.mjs` | A message when the document differs from its fixture beyond the builder's renaming |

A document without a format (OpenAPI, a standalone JSON Schema file) is checked by equality with its case only.

## Marker cases

A version comparison lists only changed operations. A diffs case in which `apiDiff` finds no change (an unchanged
security card, a known `apiDiff` gap) gets a description "QA marker: …" in version `2.0` and "(marker)" in its package
README, so that QA can open it. Look at the list of marker cases after every run: a fixture that expects a change
`apiDiff` does not report may be a finding.

## The checks

`verify.mjs` reads every case again and compares:

| Format | Check |
| --- | --- |
| OpenAPI plain | Every packed path item and component equals the case's |
| OpenAPI diffs | `apiDiff` of each packed document pair finds exactly the diffs of the case pairs, path prefixes removed, a whole `components` add or remove split into single components |
| `files` | Every file equals its case; AsyncAPI without the prefix equals its fixture; ddlapi and `graphql` parse the written document and the fixture into the same model, and ddlapi reports no issue (api-processor publishes each one as an `Error`); IDs are unique in each version |
| `versions` | Every copied file equals its source byte for byte; no other file is in the package |

## Baselines

`baselines.mjs` finds the screenshot baseline of each case in `packages/api-doc-viewer/src/it/**/__image_snapshots__`
by the Storybook kebab case of the fixture folder (`3.1-oneOf` becomes `3-1-one-of`, `int4` becomes `int-4`) and its
parent group. Expect about 98% coverage; programmatic cases need a `baselineHint` with the story's case name.
