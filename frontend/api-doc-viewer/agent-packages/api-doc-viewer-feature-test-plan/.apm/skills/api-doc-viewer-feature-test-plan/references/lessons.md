# Lessons

What was not obvious from the request or the documentation in earlier runs. Each lesson cost a wrong first attempt
or a correction, and stands on its own: the plan folders that prompted them are deleted. Every run adds to this file
(phase 9). The first lessons came from the plan of the OpenAPI operation viewers.

## About the request

- The user's first ask was for organization variants, not a plan. Three variants (feature matrix, scenario tours,
  hybrid automation) were written and two were dropped later. Ask which shape the user wants before writing variants;
  default to the feature matrix over packed fixtures, which was chosen.
- Scope grew in steps: circular references, a performance pass, a separate JSON Schema track, the backlog, special
  regression samples, a results sheet, a start page. Expect it, and keep counts in every document in sync each time.
- The user wants the finished artifact, not a plan of it: "generate the remaining packages without my approvals".

## About the host app

- The portal cannot reach every cell of the viewer: comparisons have no `Simple` mode, `hideUnchangedNodes` is never
  passed (hiding is always on), and the compared document is cut to one path and one method. Find these in the host
  code before writing cases, and record them as decisions for the team.
- A version comparison lists only changed operations. Fixtures without a change (an unchanged security card) or with a
  change `apiDiff` does not report could not be opened at all; the marker description fixes that.
- Operations of two versions match by a normalized ID, so a renamed path parameter is one changed operation, while a
  changed operation ID is not.

## About the fixtures

- Fixture shapes differ by suite: `sample.yaml`, `before.yaml` and `after.yaml`, `document.yaml`, `.json`, `.sql`,
  `beforeSchema` with `beforeAdditionalComponents`, OpenAPI pairs inside a JSON Schema suite, and suites built in
  TypeScript (hiding, arrows, combiners, value range) with no files at all.
- Node cannot import the TypeScript builders: extensionless relative imports and types imported as values. The
  `typescript-loader.mjs` hooks compile them with the workspace's TypeScript. Some builders need options the stories
  pass (`includeOas31Only`).
- Two fixture folders can share a number (`2.3-…` twice); case IDs get a letter suffix.
- 86 DDL fixtures name their table `t`; APIHUB identifies a table by schema and name, so DDL cases need their own
  schemas. Domains and types move with the tables, and schema names must stay within 63 characters.
- AsyncAPI operation IDs come from the operation key and the message ID, GraphQL ones from the root type and the
  field: documents of one version clash unless those names carry the case ID.

## About packing

- Security scheme names repeat across fixtures with different definitions; a scheme a case names but does not define
  (an unresolved card) must not get a definition from another case. Conflict-aware packing handles both.
- Removing the whole `components` object is classified differently from removing one component: such a case must not
  share a document with cases that keep theirs.
- `apiDiff` resolves a cyclic `$ref` into a cyclic object: comparisons need a cycle-safe stringify.
- A check that never fails proves nothing: tamper with one file once and see the check fail.

## About expected results

- Write expected results from the design and from `apiDiff`, not from the issue text. Two claims were wrong at first:
  that OAS 3.1 keywords are all ignored (`propertyNames` has a row, `const` is an intentional gap), and that a renamed
  media type of a parameter shows nested schema changes (the design compares the two sides only at the top level).
- `apiDiff` reports a media type rename inside a parameter's `content` as a remove and an add (no rename), so deeper
  changes vanish at the source: that is an `api-diff` finding, not a viewer one.

## About the documents

- IDE Markdown previews do not follow cross-file section anchors, and a link to a folder does not resolve.
- Shell heredocs mangle backslashes and backticks in replacement scripts; edit files directly or write the script to
  a file first.
- Keep Markdown at 120 characters; generated READMEs wrap their prose.
- The baselines live elsewhere in the repository, so a zip of the plan folder alone is useless to QA: `bundle.mjs`
  copies them in. A link to the branch works too, but only while the plan folder is committed, which it should not be.
- Plan folders are temporary: a reference to an earlier plan breaks once it is deleted. Keep lessons and code in the
  skill.
