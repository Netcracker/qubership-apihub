---
name: api-processor-testing
description: Use when adding or changing api-processor tests or test helpers, such as choosing or naming a fixture, picking a package id, placing a spy, adding a helper, or proving a test can fail.
---

# Writing api-processor tests

A test must fail only when the behavior it guards breaks. Another scenario's fixture, a version another test
published, or a spy that never fires can each keep it green while `src` is broken.

Import helpers from `test/helpers`; a helper's JSDoc is the contract to rely on.

## Build the input by what the test asserts

- **A test that asserts nothing about the content takes a standard fixture.** Take one from
  `test/helpers/fixtures.ts` and build it with `contentEditor`, `buildPackageFromContent`,
  `publishChangeFromContent`, or `buildChangelogFromContent`. Rely only on what the fixture's JSDoc promises:
  `fixtures.test.ts` checks those promises and nothing else.

  ```typescript
  const result = await buildChangelogFromContent('annotation/summary-changed', ANY_REST_CHANGE)
  ```

- **A test that asserts on the content owns that content.** Write it inline and build it through the same helpers,
  or give the test a folder of its own under `test/projects`. Do not borrow another scenario's folder: an edit made
  for the tests that own it silently changes yours.

Most existing files build from a folder (`Editor.openProject`, `LocalRegistry.openPackage(folder).publish`, or a
wrapper in `builders.ts`). A new case in such a file follows the rules above, and the existing cases keep their style.

A fixture broken on purpose says so in its name or folder, so a reader who sees its build report an error knows the
error is the point: `broken-ref.yaml`, `invalid-critical-async.yaml`, `test/projects/broken/`, or the scenario it
breaks (`operation-id-collisions/`).

## Name a fixture by its role

A folder under `test/projects` is one case: kebab-case with the spec terms spelled out (`path-item`, `operation-id`),
no dots except the extension. A scenario of two packages keeps them in `<case>/previous-package` and
`<case>/current-package`. The folder names the document, and a file name says what varies from file to file:

| The folder holds | Name the files |
| --- | --- |
| One document in two versions | `before`, `after` |
| One document in three or more versions | `v1`, `v2`, and so on |
| Several documents of one version | `spec1`, `spec2`, and so on |
| Several documents in two versions | `before1`/`after1`, `before2`/`after2`, and so on |
| A single document, or one published unchanged in every version | a name that says what it is, or `spec` |
| A file the build reaches only through a `$ref` | what it holds: `reference.yaml`, `shared.yaml` |
| An expected output or a template the test reads itself | `result`, `template`; `spec1-result` for one per document |
| A document the test patches in code before the build | `base` |

Two different documents in one folder never share a name, and a version that republishes a document unchanged
publishes the same file. Each version series gets a package of its own: two series in one package would publish the
same version ids.

Keep a name a test depends on, and mark a new assertion on one with a comment:

- a slug inside an asserted id: a notification's `documentId` (`v1-spec1`) or a comparison document id
  (`before_v1_changelog_add-operation_after_v2_...`);
- a file name the output carries: `export/1.yaml` is asserted as `1.html`;
- a name that decides an order: duplicate operations go to the smallest `documentId`, `test/merge` merges in
  directory order, and `build-result-ordering` picks `alpha.yaml` and `zeta.yaml` for how they sort.

The file name becomes the document slug. A comparison pairs operations by id and then finds each operation's
document by slug within its own version, so a rename changes only the ids derived from the slug, not which documents
are compared.

Choose the folder with the project id and keep the file id a bare name:

```typescript
await registry.publish('new-deprecated/one-schema-usage', { packageId, version: 'v1', files: [{ fileId: 'before.yaml' }] })
```

A folder inside the file id (`one-schema-usage/before.yaml`, or a `before/` subfolder) makes the slug depend on the
build type. Only a `BUILD_TYPE.BUILD` config drops the folder the files share, and `publish` sets no build type, so
the same document gets one slug when `publish` builds it and another when the editor does.
`operation-id-collisions/same-path-different-documents-changelog` keeps a subfolder per version only because its test
asserts the slug it gives (`v1-spec1`); do not copy that layout.

## Publish under a package id of its own

Published versions live in one in-memory tree per test file, and under `npm run test:disk` in one directory per
Jest worker, shared by every file that worker runs. Publish under a `packageId` that no other test, in this file or
another, publishes: a path naming the subject and the case (`annotation/summary-changed`).

- **The content builders take any id, so pass one per test.**
- **The folder wrappers in `builders.ts` publish under the folder path they read**, such as `publishVersion`,
  `buildChangelogPackage`, and `prepareChangelogPackage`. The dashboard wrappers also publish the dashboard under
  the fixed id `dashboards/dashboard`: `prepareChangelogDashboard` and `buildChangelogDashboard` take no other, so
  under `npm run test:disk` two files that call them in one worker share that dashboard. To publish a folder under
  another id, call `publish` directly; it takes the folder and the id separately:

  ```typescript
  const registry = LocalRegistry.openPackage(folder)
  await registry.publish(folder, { packageId, version: 'v1', files: [{ fileId: 'spec.json' }] })
  ```

  Without `files`, `publish` takes the file list from the folder's `config.json`, and a folder without one fails
  the build with `Incorrect config: No files and refs`. A listed file the folder lacks throws before the build, here
  and in the editor's `run` and `update`, and `contentEditor` refuses one outside its contents. To test how a build
  reports a missing file, list it in the `files` of a `publishFromContent` call without giving its content.

- **Publish a fixture that reports an `Error` as a draft.** `publish` and `publishFromContent` default to a release,
  and a release build throws on any `Error` notification, so pass `status: VERSION_STATUS.DRAFT`. `publish` sets the
  release over a `status` in `config.json`, so the status goes in the call.

**Reach published output through the registry helpers.** Under `npm test`, CI included, a build's output never
touches the disk; only `npm run test:disk` writes it under `test/versions/worker-<id>`. Read and write it with
`loadJsonFromRegistry`, `loadFileAsStringFromRegistry`, `registryFs`, and `VERSIONS_PATH`, never with `fs` or a
literal `test/versions` path: that works in one mode and fails in the other. Fixtures under `test/projects` are
always read from disk.

## Find the helper before writing one

A lookup, count check, or matcher written inline drifts from the shared one, and the next fix lands in only one of
them. Look in the category under `test/helpers/` first:

- `builders`: publishing versions; building packages, changelogs, and dashboards.
- `fixtures`: the standard documents.
- `accessors`: looking up an operation, document, change, or notification in a build result.
- `assertions`: change and impact counts, and other checks shared across files.
- `matchers`: partial matchers for `expect`.
- `factories`: REST documents and operations built in code.
- `files`, `documents`: reading fixture files and packed archives; parsing and normalizing documents.
- `registry`: the local registry, and reading back what a build published.
- `editor`: the editor that runs a build against a registry's resolvers.

## Add a helper or a standard fixture

1. **Check that it earns its place.** A helper does when a test other than the helper's own tests calls it in the
   same change; a wrapper that only shortens a call does not. A standard fixture does when a test needs any
   document of a kind, or a kind of change, that no fixture promises. No dead-code check runs over `test/`, so
   nothing flags an export that no test uses.
2. **Place it by its callers.** A helper any test could use goes in its category, even with one caller, because
   the next caller looks there and nowhere else. A helper tied to one file's cases stays in that file: the AsyncAPI
   generators in `asyncapi-changelog-apikind.test.ts` place the api kind where that file's expected verdicts need
   it. A standard fixture goes in `fixtures.ts`.
3. **Make it reachable from `test/helpers`.** `index.ts` and `editor/index.ts` re-export with `export *`, and so
   does `registry/index.ts` for `local.ts`, but it names the exports of `fs.ts` and `utils.ts` one by one: a new
   helper in either needs its name added there. A new category file, or a new file under `editor/` or `registry/`,
   needs a line in the nearest `index.ts`.
4. **Grep `test/` for a local declaration of the new name.** Importing the export into a file that declares the
   same name fails to compile, or binds the wrong name when the local sits in an inner scope. Rename the local to say
   what it means there, or choose another export name.
5. **Test what it promises.** A helper with behavior of its own (a lookup that throws with the ids it saw, a count
   check, an editor that refuses a file) gets tests in `test/<category>.test.ts`; the first such test of a category
   creates the file. Run a keyed lookup over a real build, because a hand-written result repeats your own
   assumption about its keys. A hand-written result is enough for the nothing-found case and for a helper that
   depends only on a constant, such as a severity. A standard fixture gets a case in `fixtures.test.ts` for each
   promise its JSDoc makes, one per promised file id or extension, published under a `fixtures/...` id.

## Place a spy where the call goes through

- **Spy on the module that defines the function, never on a barrel** (`../src`, `../src/processor`, or a folder
  `index.ts` such as `../src/utils`). `src` calls the function through its defining module, so a spy on the barrel
  installs without an error and intercepts nothing.
- **A call from inside the same module is intercepted only when the function is an `export const`.** A call to an
  `export function` from its own module goes straight to the local binding, and the spy misses it. Spy instead on
  the nearest caller up the chain that another module calls, or that is an `export const`. Calls from another
  module are intercepted either way.

  ```typescript
  // rest.operations.ts imports buildRestOperation, so this spy sees the call
  import * as restOperation from '../src/apitypes/rest/rest.operation'

  jest.spyOn(restOperation, 'buildRestOperation').mockImplementation(() => {
    throw new Error('operation exploded')
  })
  ```

- **The editor binds its registry's resolvers when it is created.** Spy on the registry you pass to the editor
  before you create the editor. An editor created without a registry (`changelogEditor(id)`,
  `prepareChangelogPackage`) opens its own, so only a spy on `LocalRegistry.prototype` installed first reaches it.
  A spy on `editor.builder` methods works after construction.

`jest.config.ts` sets no `restoreMocks`, so a spy on a module or a prototype leaks into later tests in the file.
Restore it, for example with `afterEach(() => { jest.restoreAllMocks() })`.

## Prove the test can fail

A new or changed assertion is done when you have seen it fail for the reason it exists.

1. Break the code path the assertion guards, in `src` or, for a helper test, in the helper: remove a call, invert
   a condition, or return early.
2. Run the test (`npm test -- test/<file>.test.ts`) and check that it fails **at this assertion's line**, not at an
   earlier one or with a crash.
3. Undo the edit and rerun the test to see it pass.

A failure produced by injecting a value into the result (a spy that pushes a message) proves only that the assertion
is live, not that it catches a regression; say so in a comment on the assertion.

An assertion that no single `src` change can fail, such as a shape the types already force, is structural. Keep one
only when a later assertion would pass vacuously without it, as an `every` over an empty list does, and name that
later assertion in a comment.
