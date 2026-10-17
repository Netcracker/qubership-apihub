# Tolerant Publication: Per-Document Errors

Status: **Draft for review** · 2026-08-12

Today a `build` (publication) in api-processor fails entirely when processing of a single document throws.
This design makes publication tolerant: errors are caught per document, collected as notifications, associated
with the document(s), and — for `draft` publications — the version is still published and carries an error mark.
A `release` publication still fails, but reports the specific errors that blocked it.

The `changelog` build type is affected too: a changelog calculation may complete even when the version it
describes has errors, but a version that is *unsound* — errors of its own, or an unreliable changelog — may not
serve as the *previous* version of a comparison.

## Why

**To allow publishing draft versions for troubleshooting.** A failure in one document currently costs the user
the whole version, including the parts that built perfectly. For example: the AsyncAPI specifications in a
version have a problem, but the REST specifications are fine. Today nothing is published, so nobody can look at
anything. With this change the version publishes as a `draft`: the REST operations are browsable and reviewable
while the AsyncAPI errors are analyzed and fixed, and the version carries a visible error mark plus per-document
error details pointing at what to fix.

This is a diagnostic affordance, not a relaxation of quality gates — `release` publication stays strict.

## Scope and governing rules

Two build types are in scope: **`build`** (version publication — the tolerant path) and **`changelog`**
(comparison calculation — its own rule below). The transform and export build types raise no notifications at
all and are unaffected; see [Current Notification Revision](#current-notification-revision).

Governing rules after the latest decisions:

- **`Error` severity is the blocking condition.** An `Error`-severity notification in either stream blocks a
  `release`; everything below follows from that.
- **No automatic status downgrade.** Publishing in `release` status while any `Error` exists is a **fatal**
  error (publication fails). Publishing in `draft` status succeeds and the version is marked as having errors.
- **`release-candidate` is unused** — disregarded everywhere below.
- **Changelog build** is allowed to complete even when the *current* version has `Error` notifications, but an
  **unsound** version **must not be usable as the previous version** in a changelog calculation. A version is
  unsound when it has errors of its own *or* its changelog has errors — the single predicate all four backend
  refusals gate on, defined under [Backend — new refusals](#backend--new-refusals).
- **Dashboards:** an unsound package version **cannot be added** to a dashboard. If a dashboard somehow already
  references one, the UI must indicate it when viewing the dashboard's packages.

UI implementation is **out of scope**; UI source was analyzed only to identify the backend APIs that change.

## High-level design

1. **Publication becomes tolerant per document.** A failure while processing one document no longer aborts the
   build. It is recorded against that document; the document is still published — exposing every operation and
   entity that built, and carrying its original content so the user can inspect what did not — and every other
   document builds and publishes normally. A document that failed to parse at all has nothing to expose.
2. **Notifications are the single reporting mechanism.** Failures that used to abort the build become
   notifications. Each message carries a *category* and is attributed to the document it concerns.
3. **Build-phase and comparison-phase notifications are kept apart.** A version build and a changelog
   calculation are separate concerns that can occur separately or together, so their messages go to separate
   files: `notifications.json` for building the version's own documents, `comparison-notifications.json` for
   calculating a changelog. A problem in the comparison marks the *comparison*, never the version.
4. **`Error` severity is the blocking condition, in either stream.** A `draft` version publishes with errors
   and is marked. A `release` version does not publish at all — the build fails and reports what is wrong. A
   changelog error blocks a release too: a release that declares a `previousVersion` is expected to ship
   reliable changes, so an unreliable changelog disqualifies it just as a bad document does.
5. **Summary flags describe the outcome.** api-processor computes `hasErrors` for the version, for each
   document, and for each comparison, and carries them in the build result. The backend stores them and derives
   a further view: which API types and contract types contain errored documents.
6. **A small set of failures stays fatal**, for two distinct reasons: nothing publishable survives them (there
   is no version, or no artifact), or publishing degraded output would hide a defect that is hard to diagnose
   afterwards.
7. **Unsound versions are quarantined from composition.** A version with errors of its own, or with an
   unreliable changelog, cannot serve as the baseline of a changelog calculation and cannot be referenced by a
   dashboard.
8. **Some errors belong to a version pair, not to a document** (an unresolvable previous version,
   unresolvable references). These are comparison-phase only: they mark the comparison without marking any
   document, and are reachable through the comparison notifications endpoint. Every build-phase error is
   attributed to a document.

## Build phases and the shape of a build result

A version build and a changelog calculation are distinct phases. They combine into three possible build
results, and the notification files present in each follow directly:

| Build | Phases | Artifacts | Notification files |
|-------|--------|-----------|--------------------|
| `build`, no `previousVersion` | version build | version artifacts | `notifications.json` |
| `build` with `previousVersion` | version build, then comparison | version + comparison artifacts | `notifications.json`, `comparison-notifications.json` |
| `changelog` | comparison only | comparison artifacts | `comparison-notifications.json` |

A `changelog` build must declare a `previousVersion`: with no baseline there is nothing to compare, so the
config is rejected outright rather than reported — see
[A changelog with no baseline is a config error](#a-changelog-with-no-baseline-is-a-config-error).

Note the middle row is **one** build producing **one** archive — `BuildStrategy` calculates the comparison
inline after building the documents, it does not spawn a second build. The `changelog` build type is used when
both versions already exist: on demand via `POST /api/v2/compare`, and automatically by the backend's
`reCalculateChangelogs`, which refreshes the changelogs of every version that declares the just-published
version as its previous version.

The split matters because the two phases have different subjects. A build-phase error is about a **document**
of the version being published, and rolls up to the version's `hasErrors`. A comparison-phase error is about a
**version pair**, and rolls up to that comparison's `hasErrors` — it must never mark the version itself, which
may be perfectly sound while its changelog against some baseline is not.

The split governs the *flags*, not the `release` gate: an `Error` in either stream blocks a `release`
publication, because a release is expected to ship both sound documents and a reliable changelog.

## Public API changes at a glance

Detail in [api-processor](#api-processor) and [Backend](#backend); this is the summary of what consumers see.

### api-processor — library contract

| Item | Change |
|------|--------|
| `NotificationMessage` | `fileId` → `documentId` (a single document slug); new required `category`; `operationId` / `previousOperationId` removed. A problem concerning several documents yields one message per document. |
| `documents.json` — each document | new optional `hasErrors` (default `false`) |
| `info.json` — the version | new optional `hasErrors` (default `false`) |
| `notifications.json` | build-phase messages only; entries follow the new `NotificationMessage` shape |
| **new** `comparison-notifications.json` | comparison-phase messages, **grouped by comparison** so each maps to its version pair; same message shape as `notifications.json` |
| `comparisons.json`, `ddl-comparisons.json` — each comparison | new optional `hasErrors` (default `false`) |

### Backend — REST API

| Endpoint | Change |
|----------|--------|
| `GET /api/v3/packages/{packageId}/versions` | `hasErrors` and `changelogHasErrors` per version |
| `GET /api/v3/packages/{packageId}/versions/{version}` | `hasErrors` for the version; `hasErrors` per `operationTypes` entry and per `contractsSummary.ddl` / `.mcp`; `changelogHasErrors` when `includeSummary=true` |
| `GET /api/v3/packages/{packageId}/versions/{version}/revisions` | `hasErrors` and `changelogHasErrors` per revision |
| `GET /api/v2/packages/{packageId}/versions/{version}/documents` | `hasErrors` per document |
| `GET /api/v3/packages/{packageId}/versions/{version}/documents/{slug}` | `hasErrors` for the document |
| `GET /api/v2/packages/{packageId}/versions/{version}/changes/summary` | `hasErrors` for the comparison |
| **new** `GET /api/v2/packages/{packageId}/versions/{version}/notifications` | version's build notifications, filterable by `documentId`, `severity`, `category`, paged with `limit` / `page` |
| **new** `GET /api/v2/packages/{packageId}/versions/{version}/changes/notifications` | comparison notifications, same filters and paging plus `previousVersion` and `previousVersionPackageId` |

All added response fields are optional and default to `false`, so existing clients are unaffected.

### Backend — new refusals

All four gate on the same predicate. A version is **unsound** when either is true:

- the version itself has `hasErrors` — a problem in its own documents; or
- the version's comparison against its `previousVersion` has `hasErrors` — an unreliable changelog. Versions
  with no `previousVersion` have no comparison, and this half simply does not apply.

Both halves are exposed on `GET /api/v3/packages/{packageId}/versions` as `hasErrors` and
`changelogHasErrors`, so a client choosing a previous version or a dashboard reference can evaluate soundness
from the version list it already renders, rather than discovering the refusal at publish time.

| Action | Refused when |
|--------|--------------|
| Publishing a version in `release` status | the version being published is unsound |
| `PATCH /api/v2/packages/{packageId}/versions/{version}` promoting `status` to `release` | the version is unsound |
| Using a version as the previous version of a changelog | that version is unsound |
| Referencing a version from a dashboard | that version is unsound |

One predicate for all four keeps the rules coherent: a version is fit to be released, or to be built upon as a
baseline or a dashboard member, only when both its content and its changelog are trustworthy. Gating some
refusals on content alone would let an unreliable changelog propagate into exactly the places that consume it.

The `PATCH` refusal closes the back door around the publish-time gate: a version can legitimately be published
as a `draft` while unsound, and `PatchVersion` would otherwise let it be promoted straight to `release` without
any of the publish-time checks being re-run. It is scoped to promotion into `release` — other status changes,
notably `draft` → `archived`, stay allowed so an unsound version can still be cleaned up.

## api-processor

The publication path is `PackageVersionBuilder.run()` → `BuildStrategy.execute()`:
`validateConfig` → `buildFiles` (parse + build document per file) → per-document processing loop
(operations / MCP / DDL) → whole-set MCP validations → deprecated history → `compareVersions` (changelog) →
`createVersionPackage` (zip). Any uncaught throw currently fails the whole publication.

### Notifications Mechanism Redesign

#### Message shape

```ts
export interface NotificationMessage {
  category: MessageCategory
  severity: MessageSeverity
  message: string
  documentId?: string              // document slug; absent when the message is not about a document
}
```

Changes from today:

- `fileId` → `documentId` (the document **slug**, the natural/public id; `fileId` is internal).
- new required `category` (string enum, below).
- `operationId` / `previousOperationId` removed (too specific and not persisted by the backend anyway).

**Messages are denormalized by document.** `documentId` is a single optional slug, never a list. A problem
that concerns several documents at once — a duplicated operation id, an MCP endpoint missing its init —
produces **one notification per affected document**, all carrying the same `message`, `category` and
`severity`, each with its own `documentId`.

This keeps every consumer simple: `hasErrors` per document is a plain lookup, the endpoint's `documentId`
filter is a plain equality match, and the backend stores one row per notification with no splitting or array
containment. The cost is repeated message text, which is a fair trade — each copy is individually meaningful,
because a user looking at one document wants that document's problems regardless of what else the problem
touches.

**Attribute with the slug at the raising site — no late conversion.** Every site that knows which document it
is talking about passes `document.slug` directly. There is no `fileId → documentId` normalization pass.

`fileId` and slug are different strings — `createFileSlugs` strips the base path and extension, slugifies and
resolves collisions (`specs/petstore.yaml` → `petstore`; a second `specs/v2/petstore.json` → `petstore-1`).
Both are plain strings, so a mix-up is silent, and a `fileId` that reaches `documentId` names a document that
does not exist: `?documentId=specs/petstore.yaml` matches nothing and the document's `hasErrors` is never set.

The decisive argument against a late conversion pass is `parseFile` (`builder.ts:754`). It is reached not only
for configured files but for `$ref` targets — `getBundledFileDataWithDependencies` calls
`parsedFileResolver(filepath)` for arbitrary referenced paths (`utils/document.ts:189`), and such a file need
not appear in `config.files` at all. It never becomes a document and has no slug of its own. A conversion pass
has no map entry for it, so the raw `fileId` would **survive the pass and ship as if it were a slug** — a
plausible-looking wrong value, the worst failure mode.

Such a notification is not left unattributed, though: it is attributed to the **root document** that pulled the
file in — see [Errors in `$ref`-ed files](#errors-in-ref-ed-files) below.

This is cheap because the slug is available before parsing starts. `createFileSlugs` runs at the top of
`buildFiles`, and `BuildConfigFile.slug` is populated from then on; `VersionDocument.slug` carries it
afterwards. Of the sites that carry a document identifier, nearly all already have it in scope — several
destructure it on the line above and pass `fileId` anyway, e.g. `rest.document.ts:68` destructures `slug` and
then hands `fileId` to `createBundlingErrorHandler`. `validatePath` (`rest.operations.ts:71`) is called with
`document.fileId` while `document.slug` sits right there.

**Operation-level sites** need nothing extra: `ApiOperation.documentId` already holds the slug
(`rest.operation.ts:143`, `async.operation.ts:115`, `graphql.operation.ts:96`). **MCP and DDL entity sites do
not** — their `documentId` holds a `fileId` today, which is a pre-existing defect corrected by
[`documentId` Unification](#documentid-unification-mcp-and-ddl-entities) below. Once that lands, the
cross-document duplicate handlers (`mcp.ts:56`, `ddl.ts:43`) can use `entity.documentId` directly.

**Side effect of the rename.** `operations.ts:29` currently writes `fileId: duplicate.documentId` — a *slug*
stored in a field named `fileId`. The rename corrects this latent inconsistency rather than introducing a
change; no value conversion is needed at that site.

#### Errors in `$ref`-ed files

A file reached only through a `$ref` has no slug, but it is always pulled in *by* a document that does. That
root document is the right subject: its bundle is what ends up broken, and it is the thing the user can open
and fix.

Half of this already works. `createBundlingErrorHandler(ctx, fileId)` is constructed with the **root**
document's id (`rest.document.ts:73`, `async.document.ts:58`, `unknown.document.ts:44`), so
`broken-refs` is already attributed to the root — it only needs the slug instead of the `fileId`, which the
source-attribution change covers.

What is missing is `invalid-text-file` (`builder.ts:754`), raised inside `parseFile`, which knows nothing about
who asked for the file.

**Decision: move the emission out of `parseFile` and into the document build.** Parse errors are already stored
on the cached `SourceFile` (`TextFile.errors` — `rest.document.ts:95` already destructures `errors` from the
parsed file), and every bundling document already records its `dependencies`. So after bundling, the document
build emits one `Error` notification per parse error found in **its own file and in each of its dependencies**,
attributed to that document's slug:

```text
for each parse error in [own parsed file, ...dependencies.map(parsedFiles.get)]:
    notifications.push({
      category: <parse-file | invalid-text-file>,
      severity: Error,
      documentId: document.slug,
      message: <see message format below>,
    })
```

`parseFile` stops pushing notifications entirely; it keeps storing `errors` on the `SourceFile` as it does
today. Only REST, AsyncAPI and unknown documents bundle (`dependencies` is `[]` for GraphQL, DDL, MCP and
text), so for every other type this reduces to "report the errors of my own file", which is what happens now.

The alternative — threading a root-slug argument through `parsedFileResolver` into `parseFile` — was rejected:
`parseFile` caches by `fileId` and emits on first parse only, so a file `$ref`-ed by two documents would be
attributed to whichever parsed it first and the second document would never be flagged. Emitting at build time
gives every root that includes a broken file its own notification, which is exactly the denormalization rule
the design already applies to multi-document problems.

##### Message format

**The message must name the file the error came from.** Once a notification is attached to a document other
than the file that produced it, the existing text (`Invalid <type> file. <parser message>`) is unactionable —
the reader cannot tell which of the bundle's files is broken. The offending `fileId` is the one piece of
locating information available, and it is what the user needs to open.

| Case | Message |
|------|---------|
| Error in the document's **own** file | `Invalid <type> file. <parser message>` — unchanged |
| Error in a **`$ref`-ed** file | `Invalid <type> file '<fileId>' referenced from this document. <parser message>` |

Use the referenced file's raw `fileId` in the text: it is the path the user wrote in the `$ref` and the path
they will edit. Note this is the one place a `fileId` legitimately appears in a notification — inside the
human-readable `message`, never in the `documentId` field.

##### Other consequences

- **A `$ref` target that is itself a configured file** has its own slug and its own document, so it is flagged
  directly *and* its dependents are flagged. That is correct: both the file and everything bundling it are
  affected.
- The eager `parseFile` loop in the constructor (`fileSources`) stops emitting notifications; emission moves to
  build time. A file that is parsed but never used by any document then reports nothing, which is right.
- `invalid-text-file` is always attributed after this change and leaves the unattributed set.

#### No notification id

**Design decision.** `NotificationMessage` carries no identifier. The endpoints return a
filtered list, and the `(documentId, category, severity, message)` tuple is enough to render and filter it;
nothing in the UI addresses a single message. Adding an id would mean either inventing a stable identity
across rebuilds — which does not exist, since a rebuild recomputes messages from scratch — or emitting a
positional value that changes meaning between builds and invites clients to depend on it.

If the backend later needs stable row identity for storage or pagination, it can add a synthetic id on
persist, without changing the api-processor contract.

#### Two notification streams

`BuildResult` carries two independent collections of the same `NotificationMessage` type:

| Field | Emitted to | Populated during | Rolls up to |
|-------|-----------|------------------|-------------|
| `notifications` | `notifications.json` | building the version's own documents and operations | `hasErrors` on documents and on the version (`info.json`) |
| per-comparison `notifications` | `comparison-notifications.json` | `compareVersions` and comparison serialization | `hasErrors` on the matching entry of `comparisons.json` / `ddl-comparisons.json` — each message belongs to exactly one version pair, see [Every comparison notification belongs to one version pair](#every-comparison-notification-belongs-to-one-version-pair) |

The split falls out of the existing context separation almost for free: `builderContext()` and
`compareContext()` are already distinct, and today both point `notifications` at the same array. Pointing
`compareContext().notifications` at the comparison stream routes everything reached through the compare path.
Within that stream the scope narrows further to the version pair being compared — the apitype `*.changes.ts`
modules receive `ctx.notifications` from the *pair* context, so every message lands on the comparison it
belongs to; see
[Every comparison notification belongs to one version pair](#every-comparison-notification-belongs-to-one-version-pair).

The builder's own resolver methods are the one place this does not happen automatically: they push to
`this.notifications` directly rather than to a `ctx`, so they do not see which context invoked them.

**Route them through the context too, rather than by hand.** Manual routing is not merely clumsy here, it is
*wrong*: `builderContext()` and `compareContext()` bind the **same** method objects, and three resolvers —
`versionDeprecatedResolver`, `versionDocumentsResolver`, `rawDocumentResolver` — appear in **both**
(`builder.ts:229/239/232` and `:256/257/258`). A method cannot know its caller's stream, so any fixed
assignment misroutes one of its two call paths. `versionDocumentsResolver` makes this concrete: it pushes
`:563` and is reached from `compare.utils.ts:239/240` and `compare.ddl.ts:74` (comparison) *and* from
`export-version.strategy.ts:41` (build).

The fix is to let the context supply the target array, since the context already *is* the stream. Give each
notification-pushing resolver the array as a leading parameter and bind it at context construction:

```ts
private async versionDocumentsResolver(
  notifications: NotificationMessage[],        // NEW leading parameter
  version: VersionId,
  packageId: PackageId,
  apiType?: OperationsApiType,
  contractType?: ContractType,
): Promise<ResolvedVersionDocuments | null>
```

```ts
builderContext(config) {
  return {
    notifications: this.notifications,
    versionDocumentsResolver: this.versionDocumentsResolver.bind(this, this.notifications),
    ...
  }
}

private compareContext(config) {
  return {
    notifications: this.comparisonNotifications,
    versionDocumentsResolver: this.versionDocumentsResolver.bind(this, this.comparisonNotifications),
    ...
  }
}
```

`bind` supplies the leading argument, so the `CompareContext` / `BuilderContext` types and **every call site
stay unchanged** — `ctx.versionDocumentsResolver(version, packageId, apiType)` still reads the same. Routing
becomes structural: a resolver writes to whichever stream the context that produced it belongs to, and a future
resolver added to both contexts is correct without anyone reasoning about it.

Apply it to the five context resolvers that push notifications:

| Resolver | Notification | Contexts it appears in |
|----------|--------------|------------------------|
| `versionResolver` (`builder.ts:610`) | `:636` no such version | compare only |
| `versionReferencesResolver` (`:651`) | `:682` no version references | compare only |
| `versionOperationsResolver` (`:423`) | `:465` no data for operation | compare only |
| `versionDocumentsResolver` (`:527`) | `:563` no documents match | **both** |
| `groupDocumentsResolver` (`:474`) | `:496/:502` no group documents | builder only |

`parseFile` needs no routing at all: it stops emitting notifications entirely (see
[Errors in `$ref`-ed files](#errors-in-ref-ed-files)) and only records `errors` on the `SourceFile`. The
document build reads them and emits through `ctx.notifications` — the build context — so parse problems reach
the build stream structurally, like everything else.

**One site the automatic routing misses.** `comparison-serialization` (`components/package.ts:63`) belongs to
the comparison stream, but its `ctx` is the **builder** context — `createVersionPackage` is called with
`this.builderContext(this.config)` (`builder.ts:164`, `:170`). Pointing `compareContext().notifications` at the
comparison array therefore does nothing for it, and left alone it would land in `notifications.json` as an
unattributed build-stream error. It has to be moved deliberately, which the per-comparison `logError` closure
described in
[the attribution rule](#every-comparison-notification-belongs-to-one-version-pair) does anyway.

**Cost.** Two existing call sites reach these methods directly and need the extra argument:
`test/graphql.test.ts:76` (`pkg.versionOperationsResolver(...)`) and `test/helpers/registry/local.ts:768`,
a test-helper subclass that overrides `versionResolver` and calls `super`. Both are test code; no production
call site outside `builder.ts` invokes them.

**One hazard to close.** `bind` captures the array *reference*, and `clearCaches` / `clearRuntimeCachesOnly`
currently **reassign** (`this.notifications = []`), which would leave an already-built context writing to a
discarded array. Today's `ctx.notifications` has exactly the same exposure and is safe only because contexts
are constructed lazily, after clearing. Make it robust rather than incidental: clear with `length = 0` instead
of reassigning, for both arrays.

**The streams separate the flags, not the release gate.** The two streams determine *what gets marked*: a
comparison-phase error sets `hasErrors` on the comparison and never on the version or its documents. They do
**not** partition the `release` gate — an `Error` in either stream blocks a `release` publication. A release
version that declares a `previousVersion` is expected to ship a reliable changelog, so a failure while
calculating it means the published changes would be untrustworthy, which is not acceptable for a release even
when every document built cleanly.

Consequence for the severity review: comparison-phase `Error` severities carry the same release-blocking
weight as build-phase ones, and must be confirmed with that in mind.

#### `MessageCategory` string enum

**One category per diagnostic, named by its Id.** The category *is* the Id used throughout the revision
tables — a stable machine-readable code identifying exactly which check produced the message. Broad buckets
(`validation`, `duplicate`, `references`) were rejected: they cannot answer "which check fired", which is the
one question a category has to answer, and they would force consumers back to matching message text — text
that interpolates values and indices and therefore fragments the same defect across many groups.

```ts
export const MESSAGE_CATEGORY = {
  // parsing and document build
  ParseFile:               'parse-file',
  InvalidTextFile:         'invalid-text-file',
  FileNotParsed:           'file-not-parsed',
  BuildDocument:           'build-document',
  SwaggerConversion:       'swagger-conversion',
  // references
  RefHasSiblings:          'ref-has-siblings',
  RefNotAllowed:           'ref-not-allowed',
  RefNotFound:             'ref-not-found',
  RefNotValidFormat:       'ref-not-valid-format',
  // operations
  BuildOperations:         'build-operations',
  DuplicateOperationId:    'duplicate-operation-id',
  RestDuplicateOperation:  'rest-duplicate-operation',
  AsyncDuplicateOperation: 'async-duplicate-operation',
  EmptyPathParameter:      'empty-path-parameter',
  DoubleSlashPath:         'double-slash-path',
  // DDL
  DdlDuplicateObject:      'ddl-duplicate-object',
  DdlParseIssue:           'ddl-parse-issue',
  DdlEntityBuild:          'ddl-entity-build',
  DdlDuplicateEntity:      'ddl-duplicate-entity',
  // MCP
  McpEntityBuild:          'mcp-entity-build',
  McpDocumentSchema:       'mcp-document-schema',
  McpInitRequired:         'mcp-init-required',
  McpDuplicateEntity:      'mcp-duplicate-entity',
  McpCapabilityUnused:     'mcp-capability-unused',
  // deprecated items
  TolerantHashMissing:     'tolerant-hash-missing',
  TolerantHashFailed:      'tolerant-hash-failed',
  DeprecatedComponentPath: 'deprecated-component-path',
  // comparison phase
  VersionNotResolved:      'version-not-resolved',
  VersionRefsNotResolved:  'version-refs-not-resolved',
  VersionDocumentsMissing: 'version-documents-missing',
  RiskyBeforeValue:        'risky-before-value',
  RiskyOrigins:            'risky-origins',
  ComparisonSerialization: 'comparison-serialization',
  // transform build types (no notification file emitted)
  GroupDocumentsMissing:   'group-documents-missing',
  PartialGroupDocuments:   'partial-group-documents',
} as const
```

**The coarse view comes free from the prefixes.** `ref-*`, `mcp-*`, `ddl-*`, `tolerant-hash-*`, `risky-*` and
`version-*` group by domain without a second field, so a UI that wants "all reference problems" filters on a
prefix rather than needing a parallel taxonomy.

There is deliberately **no `changelog` category**: the phase is expressed by *which file* the message lands
in, so a category would duplicate it and mislead — the tolerant-hash messages would have carried `changelog`
while actually firing during operation building.

**Ids that do not become categories.** Four Ids are absent, because after the change no notification
originates from them:

| Id | Why it has no category |
|----|------------------------|
| `broken-refs-fatal` | The throw disappears — severity comes from the `errorType` and from `validationRulesSeverity.brokenRefs` instead, so these failures surface as `ref-not-found` / `ref-not-valid-format` |
| `document-no-source` | Eliminated; `dumpUnknownDocument` returns an empty Blob |
| `previous-version-missing` | `validateConfig` rejects a `changelog` with no baseline before any build runs, so this is a config error rather than a diagnostic and never becomes a message — see [A changelog with no baseline is a config error](#a-changelog-with-no-baseline-is-a-config-error) |
| `operation-data-missing` | Unreachable: `versionOperationsResolver` raises it only for `includeData`, and both call sites in `compare.operations.ts` pass `false`. Removed rather than kept as a category nothing can produce |

`ddl-duplicate-object` also merges its throw and notification rows: `ddl.validation.ts` pushes the message and
then throws for the same defect, and only the notification survives.

**`document-not-built` is removed**, along with the code that would have raised it. `buildDocument` is typed
`Promise<BuildDocumentResult>` and either returns an object or throws, so the `if (!result)` branch at
`files.ts:58-68` is unreachable — which the production data confirms with zero occurrences ever recorded.
Delete the branch and the `Cannot build document` notification with it; a genuine build failure arrives as an
exception and is handled by the catch described in
[Catch Points](#catch-points--make-publish-tolerant).

##### Carrying a category out of a nested throw

`swagger-conversion` gets its own category, which needs one small mechanism. The conversion failure is thrown
inside `buildRestDocument` (`rest.document.ts:84`) and then re-wrapped by `buildDocument`
(`components/document.ts:74`), so by the time `buildFile` catches it, only a generic
`Cannot process the "…" document. …` remains and the origin is lost.

Let the throw carry its own category:

```ts
export class DocumentBuildError extends Error {
  constructor(message: string, readonly category: MessageCategory) { super(message) }
}
```

- `rest.document.ts:84` throws `new DocumentBuildError(…, MESSAGE_CATEGORY.SwaggerConversion)`.
- `components/document.ts:74` keeps enriching the message with the file id but **preserves the category** when
  re-throwing, instead of flattening it into a plain `Error`.
- the catch in `buildFile` reads `error instanceof DocumentBuildError ? error.category :
  MESSAGE_CATEGORY.BuildDocument`.

`build-document` therefore stays the honest default for an unclassified failure, and any other nested site can
opt into its own category later by throwing the same typed error — no further plumbing.

**Severity was reviewed per site.** Every `Error` in **either** stream becomes a `release`-publication
blocker, so each was explicitly confirmed as `Error` or downgraded to `Warning` against usage data. The
`Severity decision` column in the tables below records the outcome; the reasoning is on each row.

##### What the specification's enum must match

`MessageCategory` is duplicated in `APIHUB_API.yaml` and `APIHUB_API_internal.yaml`, and both copies have to
carry the list above:

- **add** `async-duplicate-operation` — the intra-document AsyncAPI collision, which keeps its own category
  the way `rest-duplicate-operation` does for REST;
- **remove** `operation-data-missing` and `previous-version-missing` — neither becomes a message, for the
  reasons in the table above.

A consumer that validates against the schema sees an unknown value for the first and a value nothing can
produce for the other two, so the enum is not optional to update.

#### Severity must come from the source

Two sites hardcode `MESSAGE_SEVERITY.Error` for families that, based on usage data, need different answers.
In both the severity has to travel with the error rather than being fixed at the push site:

- **`createBundlingErrorHandler` (`utils/document.ts:157`)** already distinguishes error types — but only to
  decide whether to throw; every notification is pushed as `Error`. Severity comes from the error instead:
  `RICH_REF_NOT_ALLOWED` / `REF_NOT_ALLOWED` → Warning, while `REF_NOT_FOUND` / `REF_NOT_VALID_FORMAT` take
  theirs from the build config — see
  [Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config).
  This is the single highest-impact change in the whole severity review: `ref-has-siblings` alone accounts for
  the large majority of all `Error` notifications ever recorded, and it is not a broken reference.
- **`builder.ts:754`** applies one constant to three different parsers. Severity should come from the parser
  that produced the error (`TextFile<T, E>` already allows it): REST/AJV → Warning, AsyncAPI → use the
  `@asyncapi/parser` diagnostic's own severity, MCP → Error. Without this, MCP's structural errors would be
  silently downgraded along with AJV noise the moment MCP reaches production — usage data shows the current
  volume is entirely REST, so the constant has never been exercised by the other two parsers.

Both are why `ref-*` appear as four separate rows in the tables below rather than one `broken-refs` row: they
come from one site but need four different answers.

#### Broken references: severity comes from the build config

`validationRulesSeverity.brokenRefs` (`BuildConfig`) already governs the two broken-reference error types, and
is how [issue #113](https://github.com/Netcracker/qubership-apihub/issues/113) is enforced today. It is a
*throw switch*: when it is `error`, `createBundlingErrorHandler` throws on the first `REF_NOT_FOUND` /
`REF_NOT_VALID_FORMAT` and the whole publication fails; when it is `warning`, those same errors are pushed as
notifications — hardcoded to `Error` severity — and the build continues. The caller supplies the setting per
build; the backend derives it from the deployment-wide `failBuildOnBrokenRefs` business parameter, which
defaults to `true`, i.e. `error`.

**It becomes a severity switch.** The setting keeps its meaning — "are broken references fatal here?" — but
expresses it as a severity instead of a throw, for the same two error types and only those two:

| `brokenRefs` | `REF_NOT_FOUND`, `REF_NOT_VALID_FORMAT` |
|--------------|-----------------------------------------|
| `error` (the default) | notification with severity **Error** |
| `warning` | notification with severity **Warning** |

Everything else follows from the design already described: an `Error` publishes a `draft` — flagged, with the
message listed against its document — and blocks a `release` through
[the release gate](#release-publication-is-fatal-when-errors-exist); a `Warning` blocks nothing and flags
nothing. `RICH_REF_NOT_ALLOWED` and `REF_NOT_ALLOWED` are outside the setting's scope, exactly as they are
today, and keep the fixed `Warning` from their rows.

**The document is still built, at either setting.** That is not new: it is exactly what the `warning` path
does today. The unresolved `$ref` resolves to an empty object, and the document, its operations and every
reference that does resolve are published as usual — the notification is the only trace of the problem. This is
also why removing the throw needs no new [catch point](#catch-points--make-publish-tolerant): with the throw
gone nothing propagates out of the document build for a broken reference, so there is nothing left to catch.

**The setting is not the publisher's to choose, and it is not uniform across builds either.** The notification
is raised either way and says the same thing; only its severity moves. Nothing in a publish request selects it:
the value is stamped onto the build config when the build is **created**, and which value that is depends on
*how* it was created. The API paths — `addBuild`, `CreateBuildWithoutDependencies`, `CreateChangelogBuild`
(`BuildService.go:274/318/366`) — all stamp the same deployment-wide `failBuildOnBrokenRefs`, so for a
user-initiated publication the severity is a property of the installation. Migration stamps nothing, so its
builds are `warning` whatever the installation is set to. That split is today's behaviour, not something this
design introduces; what changes is that it now selects a severity instead of selecting whether to throw.

**Migration builds are the `warning` case, and stay that way.** Migration builds its `BuildConfig` directly
(`migration/stages/Utils.go:220/327/415`) and never calls `setValidationRulesSeverity`, so
`validationRulesSeverity` ships as the Go zero value — `{"brokenRefs": ""}`, since `omitempty` does not apply
to a struct field. That is not `error`, so it behaves as `warning`.

It does not inherit the value the version was originally built with, which is the obvious guess: one of the two
paths (`makeBuildSourceEntityFromSources`, `:280`) unmarshals the stored build config, and for a version
published after the flag was introduced that config does carry `brokenRefs: error` — but only `Files` and
`Refs` are taken from it. The config handed to the builder is a fresh literal listing its fields explicitly,
and `validationRulesSeverity` is not one of them. The other path (`makeBuildSourceEntityFromPublishedFiles`,
`:366`) has no original config to inherit from at all.

This design keeps the migration behaviour deliberately rather than aligning it with user builds: migration
rebuilds the entire published history, releases included, and `Error` there would fail every version that
carries a broken reference — see
[Migration builds are gated too](#migration-builds-are-gated-too).

Two consequences, both accepted:

- **The flag on a broken reference depends on which build last produced the version.** A version rebuilt by
  migration carries `ref-not-found` as a `Warning` and is not flagged; the same version republished by a user
  is flagged, and fails if the requested status is `release`. The message, the `documentId` and the `category`
  are identical in both — only the severity, and therefore `hasErrors`, differs.
- **Migration does not keep these two flags current.** For every other category a migration pass refreshes the
  flags on historical versions for free; for `ref-not-found` and `ref-not-valid-format` it does not. The
  population is therefore measured by `category`, not by `hasErrors` — which is what the notifications endpoint
  is for, and what the follow-up already prescribes.

The empty value must not be relied on as a spelling of `warning`: it reaches
`{...DEFAULT_VALIDATION_RULES_SEVERITY_CONFIG, ...config.validationRulesSeverity}` (`builder.ts:143`) and
overrides api-processor's own `warning` default with an empty string. The mapping above is written accordingly
— only `error` selects `Error`, and everything else, including empty and absent, means `Warning`.

**This is what closes the gap with issue #113.** All three messages the issue names — an internal `$ref`
pointing at a location that does not exist, an external file that does not exist, and an external file that is
not text — are `REF_NOT_FOUND` / `REF_NOT_VALID_FORMAT`. Under the default configuration a `release` carrying
any of them still fails, and now fails reporting *every* broken reference in the version rather than only the
first one hit. What is deliberately given up is strictness for `draft`: a draft with broken references used to
fail and now publishes, marked and with the references listed — which is the point of the whole activity, and
the escape hatch the release-failure message points at.

**No existing content becomes harder to publish.** The objection that normally blocks making `ref-not-found` an
`Error` — that hundreds of release versions already carry it — does not apply here: under today's default those
versions do not build *at all*, because the handler throws before any version is produced. Raising them as
`Error`-severity notifications is more permissive than the status quo at every setting of the flag:

| Setting and requested status | Today | After |
|------------------------------|-------|-------|
| `error`, `draft` | build fails | publishes, flagged, every broken ref listed |
| `error`, `release` | build fails on the first broken ref | build fails, naming all of them |
| `warning`, `draft` | publishes with `Error` notifications | publishes with `Warning` notifications |
| `warning`, `release` | publishes with `Error` notifications | publishes with `Warning` notifications |

**The flag is the staging mechanism, not the end state.** `ref-not-found` and `ref-not-valid-format` are still
scheduled to become `Error` unconditionally, at which point `validationRulesSeverity.brokenRefs` is retired —
see [Follow-up — severity tightening](#follow-up--severity-tightening). Until then the flag does for these two
what an interim `Warning` does for the other deferred categories, and does it more finely: an installation
whose content is already clean enforces today by leaving `failBuildOnBrokenRefs` at its default, and one whose
content is not sets it to `false`, enumerates the affected versions from the notifications endpoint by
`category`, and flips it back when they are fixed.

**`createBundlingErrorHandler` is removed.** Its only reason to exist was the throw; with the severity decided
per error type, nothing is left to encapsulate but a mapping. Replace it with a pure function that both call
shapes use:

```ts
const BROKEN_REF_ERROR_TYPES: RefErrorType[] = [RefErrorTypes.REF_NOT_FOUND, RefErrorTypes.REF_NOT_VALID_FORMAT]

const REF_ERROR_CATEGORY: Record<RefErrorType, MessageCategory> = {
  [RefErrorTypes.RICH_REF_NOT_ALLOWED]: MESSAGE_CATEGORY.RefHasSiblings,
  [RefErrorTypes.REF_NOT_ALLOWED]:      MESSAGE_CATEGORY.RefNotAllowed,
  [RefErrorTypes.REF_NOT_FOUND]:        MESSAGE_CATEGORY.RefNotFound,
  [RefErrorTypes.REF_NOT_VALID_FORMAT]: MESSAGE_CATEGORY.RefNotValidFormat,
}

export const refErrorNotification = (
  { message, errorType }: BundlingError,
  documentId: string,
  brokenRefs: ValidationRulesSeverityLevel,
): NotificationMessage => ({
  category: REF_ERROR_CATEGORY[errorType],
  severity: BROKEN_REF_ERROR_TYPES.includes(errorType) && brokenRefs === VALIDATION_RULES_SEVERITY_LEVEL_ERROR
    ? MESSAGE_SEVERITY.Error
    : MESSAGE_SEVERITY.Warning,
  documentId,
  message,
})
```

Both call sites push the result themselves, and no handler is left that could abort the build:

- the **bundling** path — the `onError` argument of `getBundledFileDataWithDependencies`, at
  `rest.document.ts:73`, `async.document.ts:58` and `unknown.document.ts:44` — maps the collected
  `BundlingError[]` and pushes all of them.
- the **normalization** path — `onRefResolveError`, at `rest.operations.ts:49` and `async.operations.ts:50` —
  pushes the single error it is handed.

Both pass the **root document's slug** as `documentId`, which is the attribution described in
[Errors in `$ref`-ed files](#errors-in-ref-ed-files) — today both pass a `fileId`.

### `documentId` Unification (MCP and DDL Entities)

A pre-existing defect, corrected as part of this activity because the notification design depends on
`documentId` meaning one thing.

#### The mix-up

`documentId` is emitted by three producers and means two different things:

| Producer | Code emits | Internal spec says | Public API says |
|----------|-----------|--------------------|-----------------|
| `ApiOperation` (`rest.operation.ts:143`, `async.operation.ts:115`, `graphql.operation.ts:96`) | **slug** | slug, pattern `^[a-z0-9-]`, e.g. `qitmf-v5-11-json` | slug |
| `DdlEntity` (`ddl.entities.ts:43`) | **fileId** | "fileId of the source DDL document", e.g. `ddl/shop.sql` | slug-shaped, e.g. `shop-sql` |
| `McpEntity` (`mcp.entities.ts:59`) | **fileId** | slug-shaped, e.g. `tools-forecast-json` | slug-shaped, e.g. `tools-forecast-json` |

Both contract documents already advertise a slug for MCP, and the public API advertises a slug for DDL too —
while the code ships a `fileId` in both cases. A consumer that takes `documentId` from `mcp.json` / `ddl.json`
(or from the corresponding REST responses) and looks the document up by it gets nothing back.

#### Decision — unify on the slug

The slug wins: it is what `ApiOperation` already uses, what both contracts already advertise, and the only id
the backend exposes documents under (`/documents/{slug}`, and the `documentId` filter on the notification
endpoints). `fileId` is an internal, build-time path.

#### Changes

##### api-processor

- `apitypes/mcp/mcp.entities.ts:59` — `const documentId = document.fileId` → `document.slug`.
- `apitypes/ddl/ddl.entities.ts:43` — same.
- Both files interpolate `documentId` into their throw messages (`mcp.entities.ts:51/70`,
  `ddl.entities.ts:57/67`); those messages will now name the slug, which is what a reader can act on.
- `components/mcp.ts:56` and `components/ddl.ts:43` build their duplicate-entity messages from
  `existing.documentId` / `duplicate.documentId`; after this change they can attribute notifications straight
  from `entity.documentId` with no lookup.

##### Build result contract — `APIHUB_API_internal.yaml`

- `BuildResultDdlContracts` entity `documentId`: description "fileId of the source DDL document…" → slug, and
  the example `ddl/shop.sql` → `shop-sql`.
- `BuildResultMcpContracts` entity `documentId`: description sharpened to say slug; the example
  (`tools-forecast-json`) is already correct.

##### Public API — `APIHUB_API.yaml`

No field or example changes: `DdlEntity` (`shop-sql`) and `McpEntity` (`tools-forecast-json`) already document
slugs. The change makes the documented behavior true. Sharpen both descriptions from "Source document
identifier" to name the slug explicitly.

##### Backend storage

`document_id` is persisted in `ddl_tables` and `mcp_entities` (`37_contracts.up.sql:20/104`, both indexed) and
returned as `documentId` by the DDL/MCP contract views. No Go change is required — the value simply becomes a
slug — but the stored data changes meaning.

No backfill is needed for already-published data: migration rebuilds published versions from their own sources
with the new api-processor, so `document_id` is rewritten to the slug as part of that pass.

### Current Throws Revision

The **Id is also the notification's `category`** — see
[`MessageCategory` string enum](#messagecategory-string-enum). Every uncaught throw on the publication path,
and what happens to it. A throw becomes an `Error` notification
when a partial version survives it. It stays fatal for one of two reasons, noted per row below: **nothing
publishable survives** it (no version can be built, or no artifact is produced), or it is a **deliberate design
decision** — a partial result *could* be published, but doing so would mask a defect that is hard to diagnose
afterwards.

Attribution is a separate concern from tolerance: some failures that cannot be pinned to a single document (a
duplicate spanning two documents, a whole-set MCP check) are still tolerated, because the rest of the version
survives them. Those emit one notification per affected document (denormalization).

**No usage data exists for throws, by construction.** `builder_notifications` rows are written by
`ReadBuilderNotificationsToEntities`, which runs inside `PublishPackage` — only for builds that completed. A
throw aborts the build before anything is published, so no row is ever written for it. The Occurrence column
is therefore empty for every row below, and its absence says nothing about how often these fire. The same
caveat bounds the notification tables: their grades reflect **successful** builds only.

#### `build` phase

| Id | Site | Severity today | DocumentId | Occurrence | Severity decision |
|----|------|----------------|------------|------------|-------------------|
| `parse-file` | `builder.ts:764` `parseFile` | Throw | slug | — | Error |
| `build-document` | `components/document.ts:74` | Throw | slug | — | Error |
| `swagger-conversion` | `rest.document.ts:84`, surfaced through `build-document` | Throw | slug | — | Error, with its own category — carried out of the wrapper by `DocumentBuildError` |
| `broken-refs-fatal` | `utils/document.ts:166` (via `build-document`) | Throw | slug | — | **throw removed** — severity comes from the `errorType` and from `validationRulesSeverity.brokenRefs`, so these surface as `ref-not-found` / `ref-not-valid-format`: `Error` under the default config, so a `release` still fails and a `draft` publishes marked. See [Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config) |
| `document-no-source` | `unknown.document.ts:93` `dumpUnknownDocument` — fires at **packaging/dump** time, not during document build | Throw | — | — | **eliminated** — the dumper returns an empty Blob instead of throwing, see [Error documents must carry their source](#error-documents-must-carry-their-source) |
| `build-operations` | `components/operations.ts:45` — `buildOperations` throws | Throw | slug | — | Error |
| `rest-duplicate-operation` | `rest.operations.ts:111` (message built by `createDuplicatesError`) | Throw | slug — a single document | — | Error |
| `async-duplicate-operation` | `async.operations.ts` — two operations of one document deriving one id | Throw | slug — a single document | — | Error, under its own category: the AsyncAPI counterpart of `rest-duplicate-operation` |
| `mcp-duplicate-entity` | `components/mcp.ts:56` | Throw | slug, one per document in the pair | — | Error |
| `ddl-duplicate-entity` | `components/ddl.ts:43` | Throw | slug, one per document in the pair | — | Error |
| `ddl-duplicate-object` | `ddl.validation.ts:53` | Throw | slug | — | **throw removed** — the notification at `ddl.validation.ts:31` already reports it |
| `ddl-entity-build` | `ddl.entities.ts:56,66` | Throw | slug | — | Error |
| `mcp-entity-build` | `mcp.entities.ts:45,51,70` | Throw | slug | — | Error |
| `mcp-document-schema` | `components/mcp.ts:144,158,164` | Throw | slug | — | Error |
| `mcp-init-required` | `components/mcp.ts:110` | Throw | slug, one per document of the endpoint | — | Error |
| `deprecated-component-path` | `components/deprecated.ts:128` `matchSharedComponent` | Throw | operation's slug | — | Error |
| `config-invalid` | `validators.ts:22`, `build.strategy.ts:56` | Throw | — | — | **stays fatal** |
| `packaging-failure` | `createVersionPackage` / zip tooling | Throw | — | — | **stays fatal** |

`config-invalid` (no `packageId`/`version`; no files and no refs) and `packaging-failure` stay fatal because
nothing survives them: there is no version to publish, or no artifact is produced at all. A third config
failure meets the same test in the `changelog` phase and is kept as its own Id — see
[A changelog with no baseline is a config error](#a-changelog-with-no-baseline-is-a-config-error).

#### `changelog` phase

Every throw reachable from `compareVersions` stays fatal. By the "is anything publishable left?" test they
could be converted — the version's documents are already built when they fire — but each would mask a defect
that is hard to trace afterwards, so they are kept fatal by design decision. One row moves the other way: a
`changelog` with no baseline becomes a throw instead of a notification.

| Id | Site | Severity today | DocumentId | Occurrence | Severity decision |
|----|------|----------------|------------|------------|-------------------|
| `processor-version-mismatch` | `validators.ts:51,58` via `compare.operations.ts:68,69` | Throw | — | — | **stays fatal** (design decision) |
| `resolver-missing` | `builder.ts:446`, `:548`, `:591`, `:627`, `:663` | Throw | — | — | **stays fatal** (design decision) |
| `compare-missing-operation-rest` | `rest.changes.ts:180` | Throw | — | — | **stays fatal** |
| `compare-missing-operation-graphql` | `graphql.changes.ts:136` | Throw | — | — | **stays fatal** |
| `compare-missing-operation-async` | `async.changes.ts:148` | Throw | — | — | **stays fatal** |
| `ddl-compare-hook-missing` | `compare.ddl.ts:192` | Throw | — | — | **stays fatal** |
| `ref-comparison-has-errors` | `compare.ts` `compareVersionsReferences` (**new**) — any dashboard reference comparison has `hasErrors`, whether recalculated or reused from cache | — | — | — | **fatal** (new) |
| `previous-version-missing` | moves to `validators.ts` `validateConfig` — a `changelog` with no `previousVersion`; the notification at `changelog.strategy.ts:36` is removed | Error notification | none (version-level) | never | **becomes fatal**, keeping its own Id, see below |

- `processor-version-mismatch` — a version-mismatch must not be hidden. Publishing a draft with a silently
  missing or partial changelog would defer the problem to whoever later notices the data is wrong, by which
  point the mismatch is hard to trace back. Note this also fails a standalone `changelog` build outright, the
  one exception to "a changelog may complete with errors".
- `resolver-missing` — a defect in the embedding host, not in the content. It fails identically for every
  build, so tolerance buys nothing; degrading it would silently ship changelog-less drafts from a broken
  deployment forever. Distinguish from `version-not-resolved` / `version-refs-not-resolved` below, which fire
  when the resolver *is* present but returns nothing — those are already notifications and stay that way.
  `packageResolver` (`:516`, `:521`) and `templateResolver` / `rawDocumentResolver` (`:366`, `:392`, `:397`)
  are reached only from export strategies and are out of scope.
- `ref-comparison-has-errors` — **new**, and the only fatal added by this design. When comparing a dashboard,
  `compareVersionsReferences` obtains a changelog for every referenced package, and the dashboard's changelog
  is the **aggregate** of those. If any of them has `hasErrors`, the aggregate is computed from a component
  already known to be wrong, so the build throws rather than publishing it.

  This is the "is anything publishable left?" test reaching the opposite conclusion from usual, for a reason
  specific to aggregates. For a package version, a bad document still leaves every other document useful — the
  artifact has salvageable parts. For a dashboard changelog the aggregate **is** the artifact; there is no
  part of it that is unaffected by a wrong input. Marking it and publishing anyway would ship a changes summary
  whose numbers are wrong, with nothing to indicate which of them.

  **Both origins trigger it.** A reference comparison reused from cache carries `hasErrors` from the backend,
  so it puts the same known-bad component into the same aggregate as one calculated here — the argument does
  not distinguish them, so neither does the check. In practice a flagged cached comparison should not reach
  api-processor at all: the backend already refuses to reference an unsound version from a dashboard and
  refuses an unsound previous version. This is the last line of defence for when one does anyway, not the
  primary guard.

  **Both build types trigger it.** `compareVersionsReferences` runs on the same path when a dashboard version
  is published with a `previousVersion`, so this also fails a dashboard `build`, including a `draft`. That is
  a deliberate exception to the rule that comparison errors never block a draft, and the only one: for an
  ordinary version a draft is still worth publishing because its documents are individually useful, whereas a
  dashboard changelog built on a wrong component has nothing worth looking at.

  It follows the same rule as the backend refusals — an unsound comparison must not be built upon. The
  difference is only where it is enforced: mid-build, because a recalculated reference comparison does not
  exist until this build produces it, so no up-front guard could have rejected it.
- `compare-missing-operation-*` and `ddl-compare-hook-missing` — internal index/document inconsistencies
  rather than user-caused input problems: an operation is present in the index but missing from its document
  pair, or a DDL compare hook is not registered. The salvageable test alone would convert them — the version's
  documents are already built when they fire — but the `processor-version-mismatch` reasoning applies equally:
  a silently-degraded changelog defers a hard-to-diagnose defect to whoever later notices the changes are
  wrong. Kept fatal, consistent with `processor-version-mismatch`.

##### A changelog with no baseline is a config error

**A changelog with no baseline is a config error, not a notification.** `validateConfig` rejects the build,
and `ChangelogStrategy` raises nothing. A changelog *is* the comparison, so with no baseline there is nothing
to compute and nothing to publish — the test the other fatal config failures meet. It also has no owner: the
message would be raised before `compareVersions`, and only per-pair arrays reach
`comparison-notifications.json`.

**It keeps its own Id, `previous-version-missing`.** It is a config failure of the same class as
`config-invalid`, which [stays fatal](#current-throws-revision), but the two are not folded together: they
have different causes and different fixes, and the Id is what makes a fatal build explainable. `config-invalid`
covers a config that cannot describe *any* build — no `packageId`, no `version`, no inputs; this one is a
config that is well-formed but wrong for the `changelog` build type. Merging them would put the one case a
caller can act on behind a generic message, and lose the continuity with the notification it replaces.

This covers the absent baseline only. A baseline that is named but cannot be resolved reports
`version-not-resolved`, which does belong to a pair.

### Current Notification Revision

Every notification site that exists today, with its stream and attribution. The **Id is the message's
`category`** — see [`MessageCategory` string enum](#messagecategory-string-enum). **DocumentId** shows
the target state — *add* marks the sites where attribution is newly introduced by this change. The stream
follows from the phase, so each row lands in `notifications.json` under `build` and in
`comparison-notifications.json` under `changelog`.

**Occurrence** grades how many existing **release** versions carry the message. That is the population that
would stop republishing if the message stays `Error`, so it is what the severity decision turns on.

#### `build` phase

| Id | Site | Severity today | DocumentId | Occurrence | Severity decision |
|----|------|----------------|------------|------------|-------------------|
| `ref-has-siblings` | `utils/document.ts:173`, `RICH_REF_NOT_ALLOWED` | Error | fileId → slug | often | **→ Warning.** Not a broken reference: a `$ref` with sibling keys, which OpenAPI 3.0 disallows stylistically and 3.1 permits. Resolution succeeds and operations build. Largest single blast radius in the whole set |
| `invalid-text-file` | `builder.ts:754` → moves to the document build | Error | *move* — slug of the document whose bundle contains the file; **message names the offending `fileId`** when it is a dependency | often | **→ Warning**, and take severity from the parser rather than the constant — see [Severity must come from the source](#severity-must-come-from-the-source). Usage data shows the volume is entirely REST/AJV metaschema nitpicking, and nearly every affected release version still has operations — the documents work |
| `ref-not-allowed` | `utils/document.ts:173`, `REF_NOT_ALLOWED` | Error | fileId → slug | often | **→ Warning.** The reference is valid, just not permitted at that position in the schema. Does not prevent the build, and thousands of releases already live with it |
| `duplicate-operation-id` | `components/operations.ts:29` | Error | slug (already carried) | sometimes | **→ Warning now, Error later.** The problem is real — one operation overwrites another — but the check is recent and hundreds of releases already contain it. Blocking retroactively is not acceptable. Deferred, see [Follow-up — severity tightening](#follow-up--severity-tightening). Detected **per api type** — see [An operation is identified by its api type and its id](#an-operation-is-identified-by-its-api-type-and-its-id) |
| `ref-not-found` | `utils/document.ts:173`, `REF_NOT_FOUND` | Error | fileId → slug | sometimes | **from `validationRulesSeverity.brokenRefs`** — Error under the default configuration, Warning where the installation sets `failBuildOnBrokenRefs: false`. Interim, like the deferred rows: still scheduled to become Error unconditionally once the flag is retired, see [Follow-up — severity tightening](#follow-up--severity-tightening). Nothing that builds today stops building, because today the same input throws. See [Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config). The grade understates the family: the `Unable to resolve the file …` messages counted separately in the analysis are the same error type, raised with api-processor's own text (`utils/document.ts:194/203`) |
| `double-slash-path` | `rest.operations.ts:134` | Warning | fileId → slug | rare | keep Warning |
| `file-not-parsed` | `files.ts:46` | Error | fileId → slug | rare | **keep Error.** The file did not parse at all. Last occurrence 2024-07-29 — two years quiet, negligible risk |
| `empty-path-parameter` | `rest.operations.ts:126` | Error | fileId → slug | rare | **→ Warning now, Error later.** The path is syntactically invalid, so Error is the right end state, and the affected set is small enough to fix — but not retroactively. Deferred, see [Follow-up — severity tightening](#follow-up--severity-tightening) |
| `tolerant-hash-missing` | `components/deprecated.ts:141` | Error | *add* — operation's slug | rare | **→ Warning.** An internal builder failure, not a defect in the user's contract — publication should not be blocked for it |
| `ref-not-valid-format` | `utils/document.ts:173`, `REF_NOT_VALID_FORMAT` | Error | fileId → slug | rare | **from `validationRulesSeverity.brokenRefs`** — Error under the default configuration, which is also the standalone decision for it: the reference is syntactically broken, and the volume is negligible either way. Tightens together with `ref-not-found` when the flag is retired. See [Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config) |
| `tolerant-hash-failed` | `components/deprecated.ts:149` | Error | *add* — operation's slug | never | **→ Warning**, for consistency with `tolerant-hash-missing`: same function, same class of internal failure. Zero occurrences makes either choice safe, but splitting them would be arbitrary |
| `mcp-capability-unused` | `components/mcp.ts:196` | Warning | slug (already carried) | never | keep Warning |
| `ddl-duplicate-object` | `ddl.validation.ts:31` (`duplicate-object`) | Error | fileId → slug | never | keep Error — no data; DDL has never been published to production |
| `ddl-parse-issue` | `ddl.validation.ts:31` (out-of-scope / unresolved ref) | Warning | fileId → slug | never | **→ Error.** An out-of-scope statement or unresolved reference means the built Realm is incomplete, and a release should not ship an incomplete DDL contract. Zero blast radius — DDL has never been published, so nothing existing is affected |

`ref-*` are four families raised from the **same** site, `createBundlingErrorHandler`, which today hardcodes
`Error` for all of them. They are listed separately because usage data splits them sharply and their
severities differ — two are fixed at `Warning`, two are configured. See
[Severity must come from the source](#severity-must-come-from-the-source) and
[Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config).

`tolerant-hash-*` belong to the build phase despite concerning deprecated items: they are called from
`rest.operation.ts:105` and `async.operation.ts:196/211` during *operation building*, not during comparison.

#### `changelog` phase

| Id | Site | Severity today | DocumentId | Occurrence | Severity decision |
|----|------|----------------|------------|------------|-------------------|
| `risky-before-value` | `rest.changes.ts:269` | Error | *add* — operation's slug | sometimes | **→ Warning.** Diagnostics of the changelog calculation, not validation of a document. Every one of its messages is unattributed today |
| `version-not-resolved` | `builder.ts:636` | Error | none (version-level) | rare | **keep Error.** A reference to a version that does not exist. The overwhelming majority of affected versions never published at all — the build was already failing |
| `risky-origins` | `rest.changes.ts:278` | Error | *add* — operation's slug | never | **→ Warning**, as `risky-before-value`. No release version affected |
| `version-refs-not-resolved` | `builder.ts:682` | Error | none (version-level) | never | keep Error — zero occurrences |
| `version-documents-missing` | `builder.ts:563` | Warning | none (version-level) | rare | **keep Warning now, Error later.** A comparison side whose documents cannot be resolved yields an unreliable changelog, so Error is the right end state — but releases already carry it. Deferred, see [Follow-up — severity tightening](#follow-up--severity-tightening) |
| `comparison-serialization` | `components/package.ts:64` | Error | none (comparison-level) | never | keep Error — zero occurrences |

¹ `version-documents-missing` (`:563`) and `group-documents-missing` (`:496`, transform build types) share the
message text `No documents for …`, so usage data counts them in one bucket. The grade is therefore an upper
bound for either alone.

**Every `never` in this table is weak evidence**, because of how comparison notifications are stored rather
than because the case does not happen. Standalone `changelog` builds publish through `PublishChanges`, which
never calls `ReadBuilderNotificationsToEntities` — so their notifications are **discarded today**. Comparison
messages appear in the data only when the comparison ran *inline* inside a `build`, which is why
`risky-before-value` is the only comparison-phase site with a substantial grade. This is independent
confirmation that comparison notifications need the separate storage the plan already specifies.

**`previous-version-missing` has left this table**, for the throws table. It was raised **only** by
`ChangelogStrategy`, for a `changelog` config with no `previousVersion` at all; `BuildStrategy` has no
equivalent — it silently skips the comparison when the baseline does not resolve, relying on
`version-not-resolved` having already reported it. The Id stays, now naming a fatal config rejection rather
than a message — see
[A changelog with no baseline is a config error](#a-changelog-with-no-baseline-is-a-config-error).
`ChangelogStrategy` remains the natural place to raise the "previous version has errors" refusal, which is a
different problem: a baseline that resolves but is untrustworthy.

`risky-before-value` and `risky-origins` fire inside `reclassifyBreakingChanges`, which reclassifies
breaking→risky by matching the previous version's deprecated items — deprecated-item matching failures that
happen to occur during comparison, which is why they sit in the comparison stream while `tolerant-hash-*` do
not.

#### Out of scope — transform build types

| Id | Site | Severity today | DocumentId | Occurrence | Severity decision |
|----|------|----------------|------------|------------|-------------------|
| `group-documents-missing` | `builder.ts:496` | Warning | none | rare | keep Warning |
| `partial-group-documents` | `builder.ts:502` | Warning | none | never | keep Warning. It cannot fire in the case its text names — it is raised inside the branch that already found no documents, where `[].every(...)` holds — but the nesting predates this design and is left alone here |

¹ Shared bucket with `version-documents-missing` — see the footnote under the `changelog` phase table.

`documentGroup`, `reducedSourceSpecifications` and `mergedSpecification` emit no notification file, so these
two warnings have nowhere to go. All five export build types emit no notification file either — they return
the artifact early from `createVersionPackage` and every failure there is a fatal throw.

One channel exists but is unused: `compare.ddl.ts:220` passes `ctx.notifications` into the
`compareDdlDocuments` hook, so a DDL comparison *could* emit notifications. None are emitted today; if any are
added they land in `comparison-notifications.json` automatically.

#### Attribution to add

Both *add* sites have the document in scope already; only the plumbing is missing.

**(i) `tolerant-hash-missing` / `tolerant-hash-failed`** — add a required `documentId` parameter to
`calculateTolerantHash` and populate the notification with it:

```ts
export function calculateTolerantHash(
  value: Jso,
  notifications: NotificationMessage[],
  documentId: string,          // NEW
): string | undefined
```

**A deprecated AsyncAPI channel does not ask for a tolerant hash.** The unifier stamps the hash flag on schema
and parameter nodes, never on a channel, so the request there could only ever report the hash missing — which
every build with a deprecated channel did. There is no deprecated-item reclassification for AsyncAPI channels
to need one, so the call is removed rather than the notification suppressed. The schema-derived deprecated
items of the same document still ask for theirs, and deprecation history is unaffected: matching needs a hash
on both sides and falls back to declaration paths otherwise, so items published by the old code still match.

Both call sites already have the slug in scope: `rest.operation.ts:105` (`documentSlug`, destructured at
`rest.operation.ts:87`) and `async.operation.ts:196/211` (`documentSlug`, used at `:115`). Making the
parameter required means the compiler enforces attribution at any future call site.

**(ii) `risky-before-value` / `risky-origins`** — `reclassifyBreakingChanges` (`rest.changes.ts:231`) needs
the document. At its only call site (`rest.changes.ts:212`) the operation pair is in scope and each operation
carries `documentId` as a slug:

```ts
await reclassifyBreakingChanges(
  previous?.operationId,
  merged,
  operationDiffs,
  ctx,
  current?.documentId ?? previous?.documentId,   // NEW
)
```

A removed operation attributes to the *previous* version's document slug, which may not exist in the current
version. That is acceptable: the notification is still returned by an unfiltered query, and the `documentId`
filter simply will not match a current document. The alternative — leave it unattributed when `current` is
absent — is simpler but loses the only locating information available, so it attributes.

Attribution is worth doing regardless of the severity review outcome for these four rows: it improves endpoint
filtering even for warnings, and is required if they stay `Error` so a blocked `release` can be explained.

#### Notifications with no `documentId`

Four sites remain unattributed by design, all in the comparison stream: `version-not-resolved`,
`version-refs-not-resolved`, `version-documents-missing` and `comparison-serialization`. The first three are
about a *version* as a whole; the last is about a version *pair*. There is no document to point at, and
inventing one would be wrong.

Consequence to accept: a comparison can have `hasErrors: true` while no document is flagged, and — for the
build stream — the same shape would arise for any future version-level build error. The UI must handle a mark
with no drill-down target; the unfiltered notifications endpoint is the only place those messages surface.
This is correct behavior, not a gap: an unresolvable previous version really is a version-level problem.

### Catch Points — make publish tolerant

Where the `build`-phase throws from [Current Throws Revision](#current-throws-revision) are caught and turned
into notifications.

- `components/files.ts` `buildFile`: wrap `buildDocument` in `try/catch`; on throw push an `Error` notification
  — category from `DocumentBuildError.category` when the throw carries one (so a swagger conversion failure
  reports as `swagger-conversion`), otherwise `build-document` — and return
  `buildErrorDocument(file, parsedFile)` so the file stays
  visible as `type: unknown` with a slug and its raw bytes — see
  [Error documents must carry their source](#error-documents-must-carry-their-source). Covers
  `build-document`, `swagger-conversion`, `broken-refs-fatal`. The `if (!result)` branch that produced
  `document-not-built` is deleted as dead code.
- `parseFile` degrades instead of throwing, so `parse-file` never reaches `buildFile` as an exception — see
  [Handling a parse throw](#handling-a-parse-throw).
- document build: after bundling, emit the parse errors of the document's own file and of each of its
  `dependencies`, attributed to the document's slug — see
  [Errors in `$ref`-ed files](#errors-in-ref-ed-files), including the required message format when the error
  comes from a `$ref`-ed file. Covers `invalid-text-file`, whose emission moves out of `parseFile`.
- `BuildStrategy.execute` per-document loop: wrap `processOperationDocument`, `validateDdlDocument` +
  `processDdlDocument`, `processMcpDocument` per document → `Error` notification, continue. This is the outer
  net for whatever escapes the per-item catches below; the failed document stays published, keeping every
  operation and entity that built. Covers `build-operations`, `ddl-duplicate-object`, `ddl-entity-build`,
  `mcp-entity-build`.
- per-item catches inside the builders, so one bad operation does not cost the document its other operations:
  `buildRestOperation` inside the path/method loop (`rest.operations.ts:82-105`), the equivalent AsyncAPI and
  GraphQL loops, the table `flatMap` in `buildDdlEntities` (`ddl.entities.ts:53`), and the per-item loops in
  `buildMcpEntities`. Each failure emits its own `Error` notification attributed to the document and omits
  that one operation or entity; the rest are built and indexed. `document.operationIds` / `mcpEntityIds` must
  then list only what was actually built, so `rebuildFiles` does not evict entries the document never
  produced.
- cross-document duplicate handlers: emit one `Error` notification **per involved document**, same text; do
  not throw. Which entity survives is decided by the rule in
  [Duplicate resolution](#duplicate-resolution) below. Covers `duplicate-operation-id`,
  `mcp-duplicate-entity`, `ddl-duplicate-entity`, all of which take the slug straight from
  `entity.documentId` / `operation.documentId` — for the MCP and DDL pair this depends on
  [`documentId` Unification](#documentid-unification-mcp-and-ddl-entities) landing first.
- `buildAsyncApiOperations`: the same **intra-document** check for AsyncAPI, reported under
  `async-duplicate-operation` — its own category, the counterpart of `rest-duplicate-operation`, not the
  cross-document `duplicate-operation-id`.
- `buildRestOperations` (`rest.operations.ts:109-112`): the duplicate check is **intra-document** —
  `operationIdMap` is built inside the function for a single document, and a collision means two
  `(path, method)` pairs compute the same operationId. Replace the throw with one `Error` notification
  (`rest-duplicate-operation`) attributed to that document, and keep building the remaining operations.
  Distinct from `duplicate-operation-id`, which is the cross-document case.
- whole-set MCP validations (`validateMcpInitRequired`, `validateMcpProtocolVersion`): convert throws to
  `Error` notifications, one per affected document (for `validateMcpInitRequired`, one per document of the
  endpoint); validate all documents rather than stopping at the first failure. Covers `mcp-init-required`,
  `mcp-document-schema`.
- `calculateHistoryForDeprecatedItems`: wrap per-operation processing; attribute to the operation's document
  slug. Covers `deprecated-component-path`.

The two `validateApiProcessorVersion` calls in `compare.operations.ts:68/69` are **not** wrapped — see
`processor-version-mismatch`.

Tolerant behavior applies to the **`build`** buildType. Export and document-group strategies keep fail-fast —
their result is a single artifact that is unusable on failure, and there is no partial version to salvage.

**Changelog baseline guard.** An unsound version must not be used as `previousVersion`. This is enforced
primarily by the backend (Backend §2). Defense in depth in api-processor: `versionResolver`, when resolving the
*previous* version, can raise an `Error` comparison notification (category `version-not-resolved`) if that version is
flagged, so a misconfigured build does not silently diff against a broken baseline. `VersionCache` would need
to carry the flags for this check. The natural raise point is `ChangelogStrategy`, where the baseline is
resolved. Note this is a baseline that resolves but is untrustworthy — a baseline that is absent altogether
never reaches here, because `validateConfig` has already rejected the build with `previous-version-missing`,
see [A changelog with no baseline is a config error](#a-changelog-with-no-baseline-is-a-config-error).

#### Error documents must carry their source

Without this the tolerant design does not work at all: an error document cannot be packaged.

`buildErrorDocument` produces `type: DOCUMENT_TYPE.UNKNOWN`, which resolves to `unknownApiBuilder` (its `types`
include `UNKNOWN`), whose dumper throws when the document has no `source`:

```ts
export const dumpUnknownDocument: DocumentDumper<unknown> = (document) => {
  if (!document.source) {
    throw new Error(`Document with fileId = ${document.fileId} does not have source`)
  }
  return document.source
}
```

Both `buildFile` call sites pass `buildErrorDocument(file)` **without** the optional `parsedFile`, so `source`
is `undefined`; error documents have `publish: true`, so `writeDocumentsToZip` does not skip them. Every error
document therefore fails in `createVersionPackage` — a `packaging-failure`, which stays fatal.

Today this is nearly unreachable, which is why it has gone unnoticed: content failures *throw* rather than
producing an error document, and the one path that does produce one (`parsedFileResolver` returning nothing —
the file could not be fetched) is rare. Even then the build dies, just with a misleading `does not have source`
message instead of the notification's real explanation. The tolerance is already illusory.

The catch points make it the normal path — every malformed spec now routes here — so the build would catch the
parse error, record a good notification, assemble a draft containing all the healthy documents, and then die at
packaging. That is exactly the outcome this story exists to eliminate.

**Save `source`, not `data`.** `data` is the parsed model and feeds operations, search and
`/files/{slug}/doc`; for an unparseable file there is no meaningful parsed model, so `data: ''` remains
correct. `source` is the raw bytes — what is written to `documents/<filename>` in the zip and served by
`/files/{slug}/raw`. That is the troubleshooting artifact: the broken file itself, downloadable.

**Sourcing per catch point:**

| Catch point | Where `source` comes from |
|-------------|---------------------------|
| parse throw (`parse-file`) | `parseFile` degrades instead of throwing — see [Handling a parse throw](#handling-a-parse-throw). The fallback carries `source`, and `buildDocument` → `buildBinaryDocument` yields a dumpable document, reusing working machinery instead of `buildErrorDocument`. |
| `buildDocument` throw (`build-document`, `swagger-conversion`, `broken-refs-fatal`) | `buildErrorDocument(file, parsedFile)` — the optional second parameter exists for exactly this and already sets `source: parsedFile?.source`; `parsedFile` is in scope at the catch. |
| `fileResolver` returned nothing (`file-not-parsed`) | Nothing to save — the content was never retrieved. |

##### Handling a parse throw

`parse-file` needs care because the throw happens *before* there is any `SourceFile`, so neither the source nor
an `errors` entry exists for the document build to pick up. Catching it in `buildFile` would produce a
sourceless error document — the very problem this subsection exists to prevent.

**`parseFile` degrades rather than throws.** Its existing `try/catch` (`builder.ts:763`) stops re-throwing and
instead returns a fallback `SourceFile` carrying **both** the raw `source` and an `errors` entry describing the
parse failure. Everything downstream then works unchanged:

- the document is dumpable, because `source` is present;
- the notification is emitted by the single document-build emission point defined in
  [Errors in `$ref`-ed files](#errors-in-ref-ed-files), attributed to the root document, with the offending
  `fileId` named in the message — no separate code path;
- a `$ref`-ed file that fails to parse is handled identically to one that parses but reports errors.

This eliminates the `parse-file` throw at its origin rather than catching it downstream, so `buildFile`'s
`try/catch` is needed only for `buildDocument`.

One small type change: `unknownParsedFile` returns a `BinaryFile`, which has no `errors` field. Either add an
optional `errors` to it or introduce a sibling helper (`unparsableFile(fileId, source, error)`) that returns
the same shape plus the error. The `errors` array is what the emission loop reads, so it has to be there.

**The fallback keeps the type its parser recognized.** A parser that throws after it has recognized the file,
such as `buildSchema` rejecting a GraphQL schema or a YAML error in an AsyncAPI file, raises a
`RecognizedFileParseError` that carries the type and format it settled on, and `unparsableFile` puts them on
the fallback. The document is then published under its own API type: the backend flags that type in
`operationTypes`, and a client can list the document in its own group. Only a file that no parser recognized
stays `unknown`. A typed fallback has no model, so it is dumped as its `source`, not by the typed dumper.

REST and DDL parsers do not raise this error and still fall back to `unknown`. Version export parses every
REST document it is handed, and the DDL comparison parses every document of type `ddl`, so each of them needs
its own guard before its fallback can keep the type.

**A `.graphql` file that does not build is a schema only when it defines one.** Whatever `buildSchema`
accepts is a GraphQL document, as before, a file of queries included: it builds into a schema that defines
nothing. When `buildSchema` throws, the file keeps the GraphQL type only if its text matches the start of a
type system definition, anywhere in it: `type`, `input`, `interface`, `enum`, `union`, or `scalar` followed by
a name on the same line, `schema` followed by `{` or `@`, or `directive` followed by `@`. GraphQL has no
version key, and this match is as approximate as the `openapi` key match of a REST document: prose that reads
`type of` passes it and is published as a GraphQL document that failed to parse. A file that does not build
and has no match, such as plain text, YAML, or an empty file, is not claimed: it is published as `unknown`
with no error, the way a JSON file without an `openapi` key is. Such a file no longer blocks a `release`,
because nothing reports it.

**`dumpUnknownDocument` must stop throwing.** The last row above is unavoidable, so the dumper becomes:

```ts
export const dumpUnknownDocument: DocumentDumper<unknown> = (document) =>
  document.source ?? new Blob([])
```

A zero-byte entry plus the notification explaining why is the honest outcome. The alternative — setting
`publish: false` on a sourceless error document — was rejected: it removes the document from the version
entirely, so the user never sees that the file failed, which defeats the purpose.

This eliminates the `document-no-source` throw rather than converting it to a notification: there is nothing to
report that the originating notification has not already said.

**Unify `filename` while here.** `buildErrorDocument` sets `filename: ${slug}.${getFileExtension(fileId)}`
while `buildUnknownDocument` and `buildBinaryDocument` set `filename: fileId`. Routing parse failures through
the binary path and build failures through `buildErrorDocument` would give the two flavors of error document
different filename conventions in the same build result. Pick one — `fileId` matches what unknown documents
already ship today.

#### An operation is identified by its api type and its id

Operations are discriminated by api type first: a REST `GET /pets` and an AsyncAPI `pets`/`get` are two
different operations even when both derive the `operationId` `pets-get`. The backend already addresses them
that way — `/versions/{version}/{apiType}/operations/{operationId}`.

The published operation index does not. It is one global map keyed by the `operationId` string alone, so the
second operation to arrive evicts the first, and the eviction is then reported as a cross-document duplicate.
That mixup is introduced by the duplicate-detection mechanism itself, not by the documents.

**The index is keyed by `(apiType, operationId)`, and duplicates are detected within one api type.** A
cross-api-type match is not a collision and raises nothing: both operations are published, and each document
announces the id it derived. Only documents of one api type can contest an id, and the contest is decided the
way it always was — the lexicographically smallest slug keeps the entry, and every claimant is told.

Two consequences follow for anything that reads the index:

- ownership is looked up by the claim a document made, never by a bare id, because a bare id no longer
  identifies an entry. That covers withdrawing a lost id from a document, evicting a document's operations on
  an incremental rebuild, and dropping them when the file leaves `config.files`;
- any list ordered by `operationId` needs the api type in its sort key, or two rows tie and the archive's row
  order follows `config.files`.

`calculateHistoryForDeprecatedItems` resolves history for one api type at a time and must therefore filter the
version's operations to that type before matching them by id; otherwise the history of a REST operation can
land on an AsyncAPI operation that happens to share its id.

**What this does not change.** Within one api type the diagnostic stands as designed: two documents deriving
one id still overwrite each other, still get one message each, and still carry the severity of their api type
— `Error` for AsyncAPI, the staged `Warning` for REST and GraphQL.

#### Duplicate resolution

Once duplicates stop throwing, both claimants survive the build and one of them ends up in the published
index. That makes "which one wins" a contract question, and today the answer depends on input ordering.

**Today: last-wins, ordered by `config.files`.** `setReportingDuplicate` (`utils/document.ts:120`) calls
`map.set(key, value)` unconditionally after invoking the handler, so the last document processed overwrites
the earlier one. Processing order is `config.files` order — `buildFiles` uses `Promise.all`, which preserves
input order, and `BuildStrategy` iterates the result sequentially. That order is deterministic for a given
config but carries no meaning: publishing the same set of files in a different order publishes a different
entity.

**Decision: keep the entity whose `documentId` sorts first lexicographically.** In `setReportingDuplicate`,
overwrite only when the incoming value wins the comparison:

```ts
const existing = map.get(key)
if (existing !== undefined) {
  onDuplicate?.(existing, value)
  if (!incomingWins(existing, value)) { return }   // keep the existing entry
}
map.set(key, value)
```

where `incomingWins` compares the two `documentId` slugs. The notification is still emitted for **both**
documents either way — the tie-break decides only which entity is indexed, never what is reported.

The result no longer depends on `config.files` ordering: the same set of files produces the same published
index however the config lists them. The winner is still arbitrary in the sense that neither document is more
correct — but it is *reproducible*, which is what a build artifact needs.

**This changes existing behavior** for REST and GraphQL duplicates, which are notification-only today and
therefore already publish a winner: republishing an affected version may flip which operation is indexed. That
is acceptable precisely because of this story — a duplicate now flags both documents with `hasErrors` and
blocks `release`, so it is a loud, visible error state rather than a silent one, and reproducibility is worth
more than preserving an arbitrary incumbent. For AsyncAPI, MCP and DDL there is no behavior to change: they
throw today.

**Incremental rebuild needs a matching fix.** `processOperationDocument` sets `document.operationIds` to every
operation it built, winner or not, and `processMcpDocument` does the same for `mcpEntityIds`. So a losing
document still lists the shared id, and when `rebuildFiles` (`builder.ts:914`) later rebuilds that loser, its
delete pass evicts the *winner's* entry before re-adding its own — flipping the winner although neither
document's content changed. Scope the delete to entries the document actually owns:

```ts
previousDocument.operationIds?.forEach(operationId => {
  if (this.operations.get(operationId)?.documentId === previousDocument.slug) {
    this.operations.delete(operationId)
  }
})
```

and the same for `mcpEntityIds`. This affects the editor preview path (`update()`), not the published artifact
(`run()`), so it is lower stakes — but without it the preview and the publish disagree. DDL is unaffected:
`processDdlDocument` deliberately tracks no entity ids on the document, so it has no incremental rebuild.

### `release` publication is fatal when errors exist

There is **no downgrade**. If the requested status is `release` and any `Error`-severity notification exists in
**either stream**, `BuildStrategy.execute` throws.

**Both streams block.** Build-phase errors mean the version's own documents are unsound. Comparison-phase
errors mean the changelog is unreliable — and a release version that declares a `previousVersion` is expected
to ship reliable changes, so an unreliable changelog is as disqualifying as a bad document. A version with no
`previousVersion` simply has no comparison stream, so nothing changes for it.

**Two checkpoints.** The build stream is checked first, right after the document loop and before
`compareVersions`, so a doomed release fails fast without spending time on a changelog that would be discarded.
The combined check runs after the comparison phase and covers both streams. The early checkpoint is an
optimization only — the late one is authoritative.

Note the flags stay partitioned even though the gate does not: a comparison-phase error blocks the release but
still sets `hasErrors` on the comparison only, never on the version or its documents. The gate asks "is this
release trustworthy?", the flags answer "what exactly is marked?", and those are different questions.

**The thrown message must not lose the specific problem.** A publisher who requested `release` should see what
is actually wrong without having to re-publish as a draft and go hunting. The message therefore depends on how
many errors there are:

**Exactly one error** — throw the notification's own message, enriched with the document when the notification
is attributed, and followed by the same draft-publication hint the multi-error message carries:

```text
<notification.message> (document: <documentId>). You can publish version in draft status for troubleshooting
```

with the `(document: …)` part omitted when the notification has no `documentId`. The message gives the
publisher the precise, actionable cause — the same text they would see in the notifications list — and the
hint names the way forward. Both branches end on the same sentence, so the escape hatch is discoverable
regardless of how many errors there are.

**More than one error** — summarize, and point at the same escape hatch. Let `N` be the total number of
`Error` notifications **across both streams** and `M` the number of them in the comparison stream. There are
three forms:

| Case | Message |
|------|---------|
| `M == 0` — all failures are in documents | `Cannot publish version in release status: N critical errors in following documents: <documentIds>. You can publish version in draft status for troubleshooting` |
| `0 < M < N` — mixed | `Cannot publish version in release status: N critical errors in following documents: <documentIds>, including M changelog errors. You can publish version in draft status for troubleshooting` |
| `M == N` — the changelog alone | `Cannot publish version in release status: N critical errors in the changelog. You can publish version in draft status for troubleshooting` |

`<documentIds>` is the distinct, sorted list of slugs the errors are attributed to.

**Why the changelog share is named.** `N` counts both streams, so a bare document list would under-describe a
mixed failure — a publisher would hunt through documents for what is actually a changelog problem. The
changelog-only form gets its own wording rather than degenerating to
`N critical errors, including N changelog errors`, which is both redundant and, since those errors are mostly
unattributed, would come with no document list to explain it.

**The three forms are exhaustive**, because after this change **every build-phase error is attributed to a
document** (see [Notifications with no `documentId`](#notifications-with-no-documentid)). So `N - M > 0`
guarantees a non-empty document list, and an empty one can only mean `M == N` — the third form. There is no
fourth case where the list is empty but the message still needs a document clause.

That is an invariant the design maintains, not something the code structure enforces: it holds because every
build-stream site either carries a slug already or gains one here, and because `comparison-serialization` —
the one unattributed site that writes through the *builder* context — is moved to the comparison stream. A
future unattributed notification added to the build stream would silently reintroduce the fourth case, so the
invariant is asserted directly in the tests rather than left implicit.

Because messages are denormalized, `N` counts *document-level* errors: a problem spanning two documents has
already become two notifications and counts as two. That reads correctly next to the document list — "2
critical errors in following documents: a, b" — and it means a cross-document duplicate never lands in the
single-error branch.

One consequence of the counting: comparison-phase errors that *are* attributed (`risky-before-value`,
`risky-origins`) contribute slugs in the mixed form, so a document can appear in the list for a changelog
problem rather than a problem with its own content. The `including M changelog errors` clause is what keeps
that from being misleading. In the changelog-only form their slugs are dropped along with the list.

The throw makes the publish fail (build status `error`) exactly as a fatal build does today, and the message
reaches the user through the existing build-error reporting path — no new transport is needed. `draft`
publications proceed and set `hasErrors`. Doing the check in api-processor keeps release-dependent logic (e.g.
`deprecatedInPreviousVersions`) from ever running for an errored release. The backend enforces the same
invariant defensively (see Backend §2).

#### Migration builds are gated too

Migration republishes each version with **its original status** (`Status: versionEnt.Status`,
`migration/stages/Utils.go:333`), so a migrated `release` version reaches the same gate as any other release
publication. **Decision: the gate applies, with no exemption for migration.** A historical release version
carrying an `Error` notification fails its migration build, exactly as a user republishing it would.

The alternative — exempting migration and publishing the version flagged — was rejected: it would mean the
gate's answer depends on who ran the build, and it would produce released versions marked `hasErrors`, a state
the design otherwise guarantees cannot exist for a release. The backend's defensive rule in
`ValidateBuildResultAgainstConfig` (Backend §2) rejects such a build result independently of api-processor, so
an exemption would have to relax that too — for the migration path specifically, which is the one path where
nobody is watching the response.

**The failure is contained and visible.** A failed migration build is recorded with status `error` and its
message; the migration run itself continues and reports the build under `ErrorBuilds` / `ErrorBuildsCount` in
the migration report (`migration/service/OperationsMigration.go:143`). So the affected versions are
enumerable with their reasons after the pass, rather than aborting it.

**The cost is that those versions are not rebuilt.** A version whose migration build fails keeps its
pre-migration data: `document_id` still holds a `fileId` for MCP and DDL entities, and its notification rows
keep the old shape. So the "no backfill is needed" argument in
[`documentId` Unification](#documentid-unification-mcp-and-ddl-entities) holds for every version that migrates
successfully, and those that do not are exactly the population the release gate would reject anyway. They are
listed in the migration report, and they converge once the content is fixed and republished.

**This raises the stakes on every `Error` severity.** A category that ships as `Error` can now fail a migration
pass, not only a user's release publication — which is an additional argument for the interim `Warning`
severities in [Follow-up — severity tightening](#follow-up--severity-tightening), and it is measured against
the same population, since the Occurrence column counts exactly the release versions a migration pass would
rebuild. Broken references are the one family that cannot fail a migration build, because migration does not
set `validationRulesSeverity.brokenRefs` — see
[Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config).

### `hasErrors` flags in the build result

All optional, default `false`, computed by api-processor at package-creation time from the final notification
lists.

- **Document** (`documents.json`, via `toPackageDocument` / `PackageDocument`) — `true` when at least one
  `Error`-severity **build** notification is attributed to that document's slug.
- **`info.json`** (the package version) — `true` when any `Error`-severity **build** notification exists.
  Comparison notifications never contribute.
- **Comparison** (each entry of `comparisons.json` and `ddl-comparisons.json`) — `true` when the comparison
  was calculated with at least one `Error`-severity **comparison** notification. For an entry with
  `fromCache: true` the flag is **passed through from the resolver** rather than derived; see
  [Cached comparisons](#cached-comparisons).

**Which flags each build type emits.** The document and version flags are emitted **only by a `build`**. A
`changelog` produces no `documents.json`, and its `info.json` describes a comparison rather than a publishable
version, so neither flag has a consumer there — emitting them would invite a reader to treat a changelog
artifact as if it said something about the version's own content, which it does not. A `changelog` therefore
carries the comparison flags and `comparison-notifications.json`, nothing else.

**A `changelog` archive carries no version content at all.** `notifications.json`, `documents.json`,
`operations.json` and `version-internal-documents.json` are not written for a `changelog`-only build, nor are
the document and operation data directories that belong to them. A changelog recalculates the changes of a
version that is already published; its own documents and operations are empty, and the backend replaces a
version's rows from what the archive holds. An empty `documents.json` would therefore describe the published
version as having no documents, and an empty `notifications.json` would delete the diagnostics the build that
did publish it recorded — the same hazard this design already closes for comparison rows. The archive holds
`info.json`, the comparisons and `comparison-notifications.json`.

This has to be confirmed against the backend's reader and stated in the API specification, which currently
describes the build result without distinguishing the build types.

| Build | `info.json.hasErrors` | document `hasErrors` | comparison `hasErrors` |
|-------|:---------------------:|:--------------------:|:----------------------:|
| `build`, no `previousVersion` | ✓ | ✓ | — (no comparisons) |
| `build` with `previousVersion` | ✓ | ✓ | ✓ |
| `changelog` | — | — | ✓ |

#### Specification descriptions this changes

Two descriptions in the API specification state the pre-tolerance behaviour and are now false. The wire format
is right — only the prose needs correcting, in both `APIHUB_API.yaml` and `APIHUB_API_internal.yaml`:

| Spec text | What is true after this change |
|-----------|-------------------------------|
| Document `hasErrors`: "published, but exposes **no operations** or contract entities" | A flagged document keeps whatever it managed to build. Only a document whose parse or build left no model has nothing to expose, and that is a consequence rather than the rule |
| Comparison `hasErrors`: "does **not** prevent publication in `release` status" | The release gate blocks on comparison-stream `Error`s as well as build-stream ones. What the flag still does *not* do is mark the version — that half of the sentence stands |

**A pre-existing typo, not caused by this design, worth fixing while the file is open.** `documents.json`
items list `operations` in `required` while defining `operationIds`; api-processor ships `operationIds`. The
required list should name the field that exists.

#### Every comparison notification belongs to one version pair

A build can produce several comparisons — the root pair plus one per dashboard reference, with a DDL
comparison alongside each. A flat `comparisonNotifications` array cannot say which pair a message belongs to.

**This is not only an attribution question — a flat array under-specifies the contract.** The backend stores
comparison notifications in `comparison_notifications` keyed by `comparison_id`, and with a flat array it has
no way to derive that key for a multi-comparison build. Inferring it works only when there is exactly one
comparison, which is precisely the case dashboards violate.

**Every comparison-phase notification is attributable to a single version pair — there is no build-level
bucket.** A message raised while comparing `A@2 → A@3` is reported for that comparison and for no other, even
when a dashboard build happens to be computing a dozen comparisons around it.

**The notifications live on the comparison itself.** Rather than a map keyed by an identity tuple, each
comparison carries its own list:

```ts
interface VersionsComparison {
  // …existing fields…
  notifications: NotificationMessage[]
}
```

`DdlComparison` gains the same field. This removes the key entirely — no tuple to construct, no lookup, no way
for a key mismatch to silently drop messages — and the grouping needed by the file and by the backend falls
out of walking the comparisons that already exist.

**Scoping.** One array per **version pair**, created when comparison of that pair begins and shared by the
pair's operation and DDL comparison entries — a failure to resolve one side degrades both, so both should
report it:

- `compareVersions` creates the root pair's array and passes it to `compareVersionsReferences`,
  `compareVersionsOperations` and `compareVersionsDdl` for the root pair.
- Inside `compareVersionsReferences`, each referenced pair gets its own array before its
  `compareVersionsOperations` / `compareVersionsDdl` calls.
- The pair context already exists and is today just an alias of the shared array
  (`compare.operations.ts:151`, `compare.ddl.ts:220`); point it at the pair's array and everything reached
  through it — `rest.changes.ts:268/277` included — lands in the right place.
- The compare-scoped resolvers take the pair's array as their notifications argument, the same
  leading-parameter mechanism used to separate the two streams, so `version-not-resolved`,
  `version-refs-not-resolved` and `version-documents-missing` attribute to the pair
  being computed when they fire.
- `comparison-serialization` (`components/package.ts:64`) is raised from the `logError` closure passed to
  `toVersionsComparisonDto` / `toDdlComparisonDto`, and each of those calls is already *for* one comparison —
  build the closure per comparison instead of once for the whole package.

**Resolver failures are not cached, so per-pair attribution is exact.** `versionResolver` and
`versionReferencesResolver` write to their caches **only on success** (`builder.ts:646`, `:703`); the failure
paths return `null` / `[]` without caching. A second pair involving the same unresolvable version therefore
calls the host resolver again and raises its own notification. Every pair that is genuinely affected reports
the problem, and no pair reports a problem it did not hit.

`version-refs-not-resolved` belongs to the **root** pair: `compareVersionsReferences` resolves the references
of the root versions, and a failure there means the reference set could not be enumerated at all.

**`hasErrors` per comparison** is then a direct read of that comparison's own list — nothing else contributes.

**File shape.** `comparison-notifications.json` groups by version pair, carrying the same identity as
`comparisons.json` entries:

```jsonc
{
  "comparisons": [
    {
      "packageId": "...", "version": "...", "revision": 3,
      "previousVersionPackageId": "...", "previousVersion": "...", "previousVersionRevision": 7,
      "notifications": [ /* everything raised while comparing this pair, and nothing else */ ]
    }
  ]
}
```

Identity is the version-pair tuple rather than `comparisonFileId`, because that field is optional — a
refs-only dashboard comparison has none. There is no top-level `notifications` array: a message with no owning
pair cannot occur.

The backend maps each entry to the `version_comparison` row it is already creating for that pair and writes
the rows with its `comparison_id`. Every row has one, so `comparison_id` is non-nullable.

##### Cached comparisons

`comparison-notifications.json` carries an entry **only for comparisons this build actually calculated**. A
comparison resolved from the backend — `fromCache: true`, pushed by `compareVersionsReferences`
(`compare.ts:83-93`) after `versionComparisonResolver` returns a stored summary — gets no entry at all.

This is not merely tidiness. Nothing is computed for a cached comparison, so its entry would be an **empty**
notification list, and the backend replaces a comparison's rows on republish
([Publish flow changes](#2-publish-flow-changes-qubership-apihub-service)). An empty entry would therefore
**delete the notifications recorded when that comparison was genuinely calculated** — losing the real
diagnostics every time an unrelated dashboard is republished. Omitting the entry leaves the stored rows
untouched, which is the correct outcome: the cached comparison has not been recalculated, so nothing about it
has changed.

**`hasErrors` still travels with it.** The flag is a property of the comparison, not of this build, so a
cached entry carries the value the backend already holds: `versionComparisonResolver` returns it as part of
the resolved summary and the existing `...comparison` spread copies it onto the pushed entry.
`ResolvedComparisonSummary` gains `hasErrors` for this. Hosts serving the resolver over REST already have it —
`/api/v2/packages/{packageId}/versions/{version}/changes/summary` returns `hasErrors` for exactly this pair.

So a dashboard build reports accurate `hasErrors` for every reference, whether recalculated or reused, while
only the recalculated ones ship notifications.

### Tests

Grouped by the decision each group guards, so a change to one part of the design maps to one group. Groups
**T1–T3** are the load-bearing ones: they cover the behaviors that do not exist today at all.

#### T1. Tolerant publication

The core promise: one bad document does not cost the version.

- per catch point: one bad document among good ones → good documents and operations published; bad document
  present with `hasErrors: true`; build completes; `info.json.hasErrors: true`.
- `parseFile` no longer throws: a file whose parser raises is returned as a fallback `SourceFile` carrying
  `source` and an `errors` entry — nothing escapes to `buildFile` as an exception.
- whole-set MCP validations report **everything**: with several non-conforming MCP documents,
  `validateMcpProtocolVersion` emits a notification for each rather than stopping at the first, and
  `validateMcpInitRequired` emits one per document of the endpoint that lacks an init — the denormalization
  rule applied to a non-duplicate check.
- the per-document loop isolates failures: a document that throws in `processOperationDocument`,
  `processDdlDocument` or `processMcpDocument` does not prevent later documents in the same build from being
  processed.
- the motivating scenario end to end: a version with valid REST documents and a broken AsyncAPI document
  publishes as `draft` with every REST operation present and browsable, `hasErrors: true` on the version and on
  the AsyncAPI document only, and the REST documents unflagged.
- regression: for a build with no errors, documents, operations, entities and comparisons are unchanged from
  today. Not byte-identical — `notifications.json` entries carry `category` and `documentId` instead of
  `fileId` even when nothing failed, and the new `hasErrors` fields may be present.

#### T2. Error documents

Guards the finding that a tolerated document must still survive packaging.

- **packageable**: a build whose only document fails to parse produces a **complete zip** — the regression that
  would otherwise surface as `does not have source` at `createVersionPackage`. Assert for both the parse-throw
  and `buildDocument`-throw catch points.
- content: `documents/<filename>` holds the **original bytes** of the failed file, so `/files/{slug}/raw`
  returns something a user can inspect; `data` stays empty and the document exposes no operations.
- sourceless: when the file could not be fetched at all, the document is still published, the zip entry is
  empty, and packaging does not throw.
- filename convention is the same whichever catch point produced the error document — a build containing both
  flavors has one naming scheme, not two.

#### T3. The `release` gate

- `release` + build-phase Error → build fails; `draft` + Error → succeeds with flags set.
- `release` + comparison-phase Error only (documents all clean) → build fails; the same build with `draft`
  succeeds, with `hasErrors` on the comparison and `false` on the version and every document.
- early checkpoint: a `release` blocked by a build-phase error fails before `compareVersions` runs (assert no
  comparison work is performed).
- message construction — one case each: a single attributed error throws the notification's own message plus
  the document; a single unattributed error throws it without the `(document: …)` part; several errors throw
  the summary with the correct count and the distinct sorted slug list; several errors none of which are
  attributed throw the summary without the "in following documents" clause. **Every** branch ends with the
  draft-publication hint.
- the three multi-error forms: `M == 0` produces the document list alone; `0 < M < N` appends
  `, including M changelog errors` with the correct `M`; `M == N` produces `N critical errors in the
  changelog` with no document list. Assert an empty document list occurs **only** in the third form.
- mixed streams: `N` counts errors from both streams, and a release blocked purely by changelog failures
  produces the no-document-list variant.
- a standalone `changelog` build completes and publishes its comparisons even when they carry `Error`
  notifications — it has no status to gate, so the release check never applies to it.
- a **migration** build is gated on the same terms: a config with `migrationBuild` set and `status: release`
  carrying an `Error` fails, and the same config with `status: draft` publishes flagged. There is no migration
  exemption — see [Migration builds are gated too](#migration-builds-are-gated-too).
- a migration build whose only problems are broken references succeeds even at `status: release`, because the
  config it arrives with has no `brokenRefs` value: assert the notifications are present as `Warning`, the
  version is not flagged, and the build completes.

#### T4. Notification streams and routing

- stream routing: a comparison-phase error lands in `comparison-notifications.json` only, sets `hasErrors` on
  the comparison, and leaves `info.json.hasErrors` and every document flag `false` — including the case where
  the same build also has build-phase errors, to prove the streams do not leak into each other.
- build result shapes: a `build` without `previousVersion` emits `notifications.json` and no
  `comparison-notifications.json`; a `build` with `previousVersion` emits both; a `changelog` emits only
  `comparison-notifications.json`.
- context-routed resolvers: `versionDocumentsResolver` writes `version-documents-missing` to the **build**
  stream when reached from `export-version.strategy.ts` and to the **comparison** stream when reached from
  `compare.utils.ts` — the dual-context case that a fixed assignment would get wrong.
- arrays are cleared in place: two successive `run()` calls on the same builder do not leak notifications
  between them, and a context built before the second run still writes to the live array — guards the
  `bind`-captured reference against a reintroduced `= []` reassignment.
- category assignment: each notification carries the `category` matching its Id, and every value emitted is a
  member of `MESSAGE_CATEGORY`. No notification carries a `changelog` category — the value does not exist.
- nested category survives the wrapper: a Swagger document that fails conversion yields a notification with
  category `swagger-conversion`, not `build-document`, even though `buildDocument` re-wraps the error; an
  unclassified `buildDocument` failure still reports `build-document`.

#### T5. Attribution — `documentId`

- **invariant**: every `Error` notification in `notifications.json` carries a `documentId`. This is what makes
  the release-message forms exhaustive, and it is not enforced by the code structure — assert it directly.
- **invariant**: every `documentId` emitted anywhere in a build result — notifications, `operations.json`,
  `mcp.json`, `ddl.json` — matches a `slug` in `documents.json`. A single assertion over the whole result
  catches both a leaked `fileId` and a regression of the MCP/DDL unification (T6).
- `tolerant-hash-*` and `risky-*` each carry the expected `documentId`, and the owning document is flagged
  `hasErrors: true`.
- unattributed errors: a comparison-level `Error` (e.g. `version-not-resolved`) flags the comparison while
  every document keeps `hasErrors: false` — assert the flags and that the notification is returned by an
  unfiltered query.

#### T6. `documentId` unification (MCP and DDL)

- `mcp.json` and `ddl.json` entries carry the document **slug**, not a `fileId` path.
- a cross-document duplicate message for MCP or DDL names slugs rather than paths.

#### T7. Errors in `$ref`-ed files

- a broken file pulled in only through a `$ref` raises `invalid-text-file` attributed to the **root**
  document's slug, and the message contains the referenced file's `fileId` — never a bare `fileId` in the
  `documentId` field.
- message format: an error in the document's *own* file keeps the unchanged text; an error in a `$ref`-ed file
  uses the `… file '<fileId>' referenced from this document …` form. Assert both texts.
- shared target: one broken file referenced by two documents produces one notification per root, both
  documents flagged `hasErrors: true` — the case the rejected threading approach would have got wrong.

#### T8. Duplicate resolution

- cross-document duplicates (`*-duplicate-*`): one notification per involved document with identical text and
  distinct `documentId`, all involved documents flagged.
- `rest-duplicate-operation` is **intra-document**: two `(path, method)` pairs in one document computing the
  same operationId produce a single notification on that document, the remaining operations of the document
  are still built, and no other document is flagged. Distinct from `duplicate-operation-id`.
- `async-duplicate-operation` is the same check for AsyncAPI, under its own category: two operations of one
  document deriving one id, one notification on that document. Cover it beside the REST case, so the pair
  cannot drift apart.
- order-independence: building the same file set with `config.files` in two different orders yields the same
  winner — the entity from the lexicographically-smallest `documentId` — and identical notifications. Cover all
  four duplicate kinds.
- incremental rebuild: with documents `a` and `b` claiming the same id and `a` winning, rebuilding `b` via
  `update()` leaves `a` the winner; the map still holds `a`'s entity.

#### T9. `hasErrors` flags

- the three flags are computed from the right stream: a build-phase Error sets the document's and the version's
  flags; a comparison-phase Error sets only the comparison's.
- per-comparison attribution: a dashboard build with several comparisons and an error raised while computing
  only one of them reports the message on that comparison and on **no** other, and flags only that comparison.
- resolver failures attribute per pair: two comparisons that both reference the same unresolvable version each
  report their own `version-not-resolved` — the failure is not cached, so neither pair is silently omitted.
- `version-refs-not-resolved` attributes to the **root** pair.
- `comparison-serialization` attributes to the comparison whose serialization failed, not to all of them.
- no message in `comparison-notifications.json` lacks an owning comparison — the file has no top-level
  `notifications` array.
- cached comparisons: a dashboard build where one reference resolves from cache emits **no**
  `comparison-notifications.json` entry for it — not an empty one — while its `comparisons.json` entry still
  carries the `hasErrors` the resolver returned, and the recalculated references are unaffected.
- a `changelog` build emits **no** version or document `hasErrors` — only the comparison flags — because it
  produces no `documents.json` and its `info.json` describes a comparison.

#### T10. Severity assignment

Severity is what the `release` gate turns on, so the sites where it stops being a constant need direct
coverage — see [Severity must come from the source](#severity-must-come-from-the-source).

- reference problems are assigned by `errorType`, not by one constant: a document producing all four yields
  `ref-has-siblings` and `ref-not-allowed` as **Warning** and — with `brokenRefs = error` — `ref-not-found` and
  `ref-not-valid-format` as **Error**, in one build. This is the highest-impact severity change in the design.
- nothing throws for `REF_NOT_FOUND` / `REF_NOT_VALID_FORMAT` any more, at either setting of
  `validationRulesSeverity.brokenRefs`: the build continues and the notifications carry the severity the
  setting selects. The same document is asserted twice — `brokenRefs = error` gives two **Error**
  notifications, a flagged `draft` and a failing `release`; `brokenRefs = warning` gives the same two messages
  and categories as **Warning**, no flag, and a `release` that succeeds. `ref-has-siblings` and
  `ref-not-allowed` stay **Warning** at both settings. See
  [Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config).
- every broken reference in a document is reported, not just the first — the old handler threw on the first
  one, so a document with several must yield one notification per reference.
- `builder.ts:754` takes severity from the parser rather than a constant: a REST/AJV metaschema complaint is
  **Warning**, an MCP structural error is **Error**, and an AsyncAPI diagnostic uses the severity
  `@asyncapi/parser` reported — asserted in one build containing all three document types, since the whole
  point is that one site now produces different severities.
- each deferred site ships at its interim severity: `duplicate-operation-id` and `empty-path-parameter` emit
  **Warning**, so a `release` build carrying only those succeeds; `ref-not-found` and `ref-not-valid-format`
  emit what `brokenRefs` selects, asserted by the two bullets above. Guards against the tightening being
  applied early — see [Follow-up — severity tightening](#follow-up--severity-tightening).
- the promoted site emits **Error**: `ddl-parse-issue`.

#### T11. Failures that stay fatal

- `processor-version-mismatch`: fails the build outright for both `draft` and `release`, and for a `changelog`
  build too — no partial version is emitted.
- changelog baseline: an unsound previous version is rejected as a baseline, and a `changelog` config with no
  `previousVersion` at all fails `validateConfig` with `previous-version-missing` — no build result and no
  notification, and `previous-version-missing` is not a member of `MESSAGE_CATEGORY`.
- `ref-comparison-has-errors`: a dashboard fails the build when a reference comparison has `hasErrors`,
  asserted for both origins — one recalculated here, and one reused from cache carrying the flag from the
  resolver — and for both build types: `changelog`, and a `build` publishing a `draft` with a
  `previousVersion`. A dashboard whose references all compare cleanly is unaffected.

## Backend

### 1. Internal contract — `APIHUB_API_internal.yaml` (build result shape)

In the `BuildResult` schema ("Build result for build"):

- **Add `notifications.json`** (currently consumed by `archive/BuildResultArchive.go` but missing from the
  spec) with the new shape:

  ```yaml
  notifications.json:
    type: object
    properties:
      notifications:
        type: array
        items:
          type: object
          required: [category, severity, message]
          properties:
            category:
              type: string
              description: Message category (document-parsing, document-build, duplicate, ...).
            severity:
              type: integer
              description: 0 - Error, 1 - Warning, 2 - Information, 3 - Hint
            message:
              type: string
            documentId:
              description: Slug of the document the message is attributed to.
              type: string
  ```

- **Add `comparison-notifications.json`** to the **build** and **changelog** variants. Same message shape as
  `notifications.json`, but **grouped by version pair** — a `comparisons` array whose entries carry the same
  identity as `comparisons.json` entries, each with its own `notifications`. No top-level `notifications`
  array: every message has an owning pair — see
  [the attribution rule](#every-comparison-notification-belongs-to-one-version-pair).
  `notifications.json` stays on the build variant only.
- `documents.json` item: add `hasErrors: { type: boolean, default: false }`.
- `info.json`: add `hasErrors: { type: boolean, default: false }`.
- `comparisons.json` and `ddl-comparisons.json` entries: add `hasErrors: { type: boolean, default: false }`.
  Both indexes share the `BuildResultComparisonData` base schema, so this is one addition covering both.

### 2. Publish flow changes (`qubership-apihub-service`)

- **`view.BuilderNotificationsFile` / entity `BuilderNotificationsEntity`** (`view/Package.go:346`,
  `entity/BuilderNotificationsEntity.go`, `archive/BuildResultToEntities.go:608`): replace `FileId` with
  `DocumentId` (a plain string) and add `Category`. SQL: `builder_notifications` table (`1_init.up.sql:476`) —
  rename `file_id` → `document_id`, add `category`. Requires a new migration. Because api-processor emits
  messages already denormalized by document, the reader stays a straight one-notification-to-one-row map:
  no splitting, no array column, and `documentId` filtering is a plain `WHERE document_id = ?`.
- **Comparison notifications storage.** `comparison-notifications.json` needs its own home, because
  `builder_notifications` is keyed by `build_id` and a comparison outlives the build that produced it (a
  `changelog` build publishes only comparisons, and `PublishChanges` — not `PublishPackage` — handles it). Add
  a `comparison_notifications` table keyed by the comparison identity already used for
  `version_comparison` (`comparison_id`), with `severity`, `category`, `message`, `document_id`. Both publish
  paths write it: `PublishPackage` for the inline comparison of a `build`, `PublishChanges` for a standalone
  `changelog`. Republishing a comparison replaces its rows, matching how comparison data is already refreshed —
  which is why a cached comparison ships no entry: replacing its rows with an empty set would discard the
  notifications from the build that actually calculated it (see [Cached comparisons](#cached-comparisons)).

  The `comparison_id` comes straight from the file: each `comparisons[]` entry in
  `comparison-notifications.json` carries the version-pair identity, which matches the `version_comparison`
  row the backend is already creating for that pair. Every message has an owning pair, so `comparison_id` is
  non-nullable. Without the grouping the backend would have no way to derive the key at all for a build with
  several comparisons, which is the normal case for dashboards.
- **Comparison `hasErrors`.** Persist the per-comparison flag from `comparisons.json` /
  `ddl-comparisons.json` onto the `version_comparison` row, so `/changes/summary` and the `changelogHasErrors`
  of the versions list and of the version content can be served without aggregating notifications.
- **Versions-list `changelogHasErrors`.** `GetReadonlyPackageVersionsWithLimit`
  (`repository/PublishedRepositoryPG.go:2308`), the query behind `GetPackageVersionsView`, gains a left join to
  `version_comparison` on `(package_id, version, revision)` plus the row's own previous-version columns, and
  selects that comparison's `hasErrors`. The join is left so that versions with no previous version stay in the
  result with the flag unset. This is the bulk form of the `isVersionUnsound` lookup below — both read the same
  stored flag, so a list row and a guard cannot disagree about a version.
- **Revisions-list flags.** `GetVersionRevisionsList` (`repository/PublishedRepositoryPG.go:363`) already
  selects `pv.*`, so version-level `hasErrors` arrives with `published_version.metadata` and only has to be
  read out in `MakePackageVersionRevisionView` (`entity/PublishedEntities.go:579`). `changelogHasErrors` needs
  the same left join to `version_comparison` as the versions list, keyed on the revision's own
  `(package_id, version, revision)` and previous-version columns. Both flags are revision-scoped in storage
  already, so a revision published with errors keeps its mark while a later, fixed revision of the same
  version reports neither — which is exactly why the revisions list has to carry them: the versions list shows
  only the latest revision, and the mark on an older one is otherwise unreachable.
- **`ValidateBuildResultAgainstConfig`** (`service/validation/PublishedValidator.go:121`): keep the strict
  `info.status == buildConfig.status` check (no downgrade). **Add** a defensive rule: if
  `buildConfig.status == release` and **either** `info.hasErrors == true` **or** any entry of
  `comparisons.json` / `ddl-comparisons.json` has `hasErrors == true`, reject with
  `ReleasePublishWithErrorsMsg` (see the shared error code below). This is the same unsound-version predicate
  as the guards below, evaluated
  against the incoming build result rather than stored rows, because the version does not exist yet. It
  backstops the api-processor check for non-standard build paths.
- **`ReadDocumentsToEntities`** (`archive/BuildResultToEntities.go:30`): persist per-document `hasErrors` into
  `published_version_content.metadata` (jsonb) — e.g. `fileEntMetadata.SetHasErrors(true)`. No content-table
  schema change.
- **`PublishPackage`** (`service/PublishedService.go`): persist version-level `hasErrors` (from `info.json`)
  into `published_version.metadata` (jsonb). No schema change.
- **One error code for all four refusals.** They are one class — "the version is unsound" — so they share a
  single code constant with four message constants, exactly as `InvalidReleaseVersionChain` (`8600`) already
  serves three messages across `BuildService`, `PublishedService` and `VersionService`. Add
  `VersionHasErrors = "8700"` to `exception/ErrorCodes.go` — `8700` is the next free class code, since the
  existing allocation runs `8000`, `8100`–`8102`, `8200`, `8300`–`8305`, `8400`, `8500`, `8600` — plus
  `ReleasePublishWithErrorsMsg`, `VersionStatusChangeWithErrorsMsg`, `PreviousVersionHasErrorsMsg` and
  `ReferencedVersionHasErrorsMsg`. Do **not** use `86xx` sub-codes: that range belongs to
  `InvalidReleaseVersionChain` and would imply these are variants of it.
- **Shared `isVersionUnsound` helper.** The three guards below and the `PATCH` guard all gate on the same
  predicate: the version has `hasErrors` on its `published_version` row, **or** its comparison against its
  `previousVersion` has `hasErrors` on the corresponding `version_comparison` row. A version with no
  `previousVersion` has no comparison and is judged on its own flag alone. Implement it once — as a repository
  query returning both flags for a `(packageId, version, revision)` — so all four guards cannot drift apart.
- **Changelog previous-version guard:** where the backend resolves/validates the previous version for a
  changelog or a `build` with `previousVersion` (previous-version lookup in `PublishPackage` around
  `GetVersionIncludingDeleted`, and wherever changelog build configs are assembled), reject when the previous
  version is unsound, with `PreviousVersionHasErrorsMsg`. This is the primary enforcement of
  the changelog rule.

  `reCalculateChangelogs` (`service/PublishedService.go:939`) creates these builds automatically after a
  publish, and the baseline it uses is **the version just published**. It **fails** on an unsound baseline
  rather than skipping: its error already propagates through `PublishPackage`
  (`service/PublishedService.go:824`), so the publish is rejected.

  The consequence is deliberate and worth stating: publishing a version in an unsound state is refused **when
  other versions declare it as their previous version**. A version nothing depends on still publishes as a
  `draft` with errors, which is the troubleshooting path this story exists for; a version others build their
  changelogs from does not, because doing so would silently invalidate every one of those changelogs. This
  mirrors the existing `VersionReferencedAsPreviousByRelease` rule, which already refuses to degrade a version
  that a release depends on. Skipping instead would leave those changelogs stale with no signal to anyone.
- **Dashboard references guard:** when publishing a package of kind `dashboard` (refs present), reject any ref
  pointing to an unsound version, with `ReferencedVersionHasErrorsMsg`. This implements "cannot add an
  errored version to a dashboard." The reference resolution already happens in
  `makePublishedReferencesEntities`; add the check there.
- **Release promotion guard — `PatchVersion`** (`service/VersionService.go:471`): reject promotion to
  `release` when the version is unsound, with `VersionStatusChangeWithErrorsMsg`. Without
  this the endpoint is a back door around the publish-time gate: publishing a `draft` while unsound is allowed
  by design, and `PatchVersion` would then promote it to `release` without re-running any publish-time
  validation.

  Scoped to promotion into `release` only, so it belongs **inside** the existing
  `if newStatus == string(view.Release)` block (`:500`), alongside the release-version-pattern and
  previous-version-status checks that already live there. Every other status change stays allowed — notably
  `draft` → `archived`, so an unsound version can still be cleaned up — and `versionLabels`-only patches are
  untouched.

  The check reads the *stored* flags; it recomputes nothing.

### 3. Public API — `APIHUB_API.yaml`

| Endpoint / schema | Change |
|---|---|
| `GET /api/v3/packages/{packageId}/versions` — `PackageVersion` | add `hasErrors: boolean` (default `false`) — from build result (`published_version.metadata`); add `changelogHasErrors: boolean` (default `false`) — from the `version_comparison` row of the version's comparison against its `previousVersion`, absent when it has none |
| `GET /api/v3/packages/{packageId}/versions/{version}` — `PackageVersionContent` | add `hasErrors: boolean` (from build result); add `hasErrors: boolean` on each `operationTypes.*` item and on `contractsSummary.ddl` / `contractsSummary.mcp` — **calculated by the backend** from the version's documents (a document with `hasErrors` contributes to its apiType/contractType) |
| `GET /api/v2/packages/{packageId}/versions/{version}/documents` — `PackageVersionFile` | add `hasErrors: boolean` (default `false`) — from build result (`published_version_content.metadata`) |
| `GET /api/v3/packages/{packageId}/versions/{version}/documents/{slug}` | add `hasErrors: boolean` (per-document detail already an on-demand fetch) |
| `GET /api/v3/packages/{packageId}/versions/{version}/revisions` — `PackageVersionRevision` | add `hasErrors: boolean` (default `false`) — from that revision's `published_version.metadata`; add `changelogHasErrors: boolean` (default `false`) — from the `version_comparison` row of that revision's comparison against its `previousVersion`, absent when it has none. Same two flags and same sources as `PackageVersion`, read per revision instead of per version |
| `GET /api/v3/packages/{packageId}/versions/{version}` — `includeSummary=true` | add `changelogHasErrors: boolean` — `true` when the version's own comparison (against its `previousVersion`) has `hasErrors` |
| `GET /api/v2/packages/{packageId}/versions/{version}/changes/summary` | add `hasErrors: boolean` — `true` when the comparison for the requested version pair has `hasErrors`. For a dashboard comparison the flag also appears per `refs[]` entry, since each ref is its own comparison. |
| **NEW** `GET /api/v2/packages/{packageId}/versions/{version}/notifications` | returns the version's **build** notifications, **filterable** by `documentId`, `severity`, `category` (comma-separated query params) and paged with the shared `limit` / `page` parameters. Served from `builder_notifications`. |
| **NEW** `GET /api/v2/packages/{packageId}/versions/{version}/changes/notifications` | returns the **comparison** notifications, same filters and paging plus `previousVersion` and `previousVersionPackageId` to select the comparison. Served from `comparison_notifications`. |

Both require **read permission on the package**, the same access the version content and documents endpoints
need — a notification exposes document slugs and message text from the version, so it is no less sensitive
than the documents it describes. Enforced with the existing package-read check; `403` when the caller lacks
it.

The two endpoints are deliberately separate rather than one endpoint with a phase filter: they identify
different subjects. A build notification is addressed by *(packageId, version)*; a comparison notification by
*(packageId, version, previousVersionPackageId, previousVersion)* — the same key `/changes/summary` already
uses. Merging them would make `previousVersion` a conditionally-required parameter and force callers to
disambiguate results by inspecting them.

New endpoint sketch:

```yaml
/api/v2/packages/{packageId}/versions/{version}/notifications:
  get:
    tags: [Versions]
    summary: Get package version build notifications
    parameters:
      - $ref: "#/components/parameters/packageId"
      - $ref: "#/components/parameters/version"
      - name: documentId
        in: query
        description: Filter by document slug.
        schema: { type: string }
      - name: severity
        in: query
        description: Filter by severity (comma-separated).
        schema:
          type: array
          items: { type: string, enum: [error, warning, information, hint] }
        style: form
        explode: false
      - name: category
        in: query
        description: Filter by message category (comma-separated).
        schema:
          type: array
          items: { type: string }
        style: form
        explode: false
      - $ref: "#/components/parameters/limit"
      - $ref: "#/components/parameters/page"
    responses:
      "200":
        description: Success
        content:
          application/json:
            schema:
              type: object
              properties:
                notifications:
                  type: array
                  items:
                    type: object
                    required: [category, severity, message]
                    properties:
                      category: { type: string }
                      severity: { type: string, enum: [error, warning, information, hint] }
                      message:  { type: string }
                      documentId: { type: string }
```

Paging uses the shared `limit` / `page` parameters, listed last as the majority of paged endpoints do —
including `/changes`, the closest sibling. The response carries no paging metadata, matching every other paged
collection in this API.

`/changes/notifications` is the same, plus the two comparison-selecting query parameters:

```yaml
      - $ref: "#/components/parameters/previousVersion"
      - $ref: "#/components/parameters/previousVersionPackageId"
```

Because messages are denormalized by document, an unfiltered response repeats the text of a
multi-document problem once per document, each row naming its own `documentId`. A UI listing all notifications
may group by `message` if it prefers to show such a problem once.

Comparison notifications carry a `documentId` only when the problem is about a specific document of one of the
compared versions; the resolution failures listed in
[Current Notification Revision](#current-notification-revision) have none, so `documentId` is empty more often on
`/changes/notifications` than on `/notifications`.

Notes:

- `operationTypes.*.hasErrors` and `contractsSummary.*.hasErrors` are computed by the backend from stored
  per-document `hasErrors`. Two cases produce a version-level mark with no API type highlighted, and the UI must
  tolerate both (see [Notifications with no `documentId`](#notifications-with-no-documentid)): a document that
failed before its type could be determined maps to no
  apiType/contractType; and a version-level `Error` (previous-version or reference resolution) flags no
  document at all. In both cases `hasErrors` on the version is the only signal, and the notifications endpoint
  is where the explanation lives.
- The comparison flag is one shared schema, `ChangelogHasErrors`, referenced from all five places it appears:
  `PackageVersion`, `PackageVersionRevision`, the `includeSummary` branch of the version content, and both the
  version pair and the `refs[]` entries of `/changes/summary`. It is named `changelogHasErrors` where it
  qualifies a version and `hasErrors` where it qualifies a comparison, but it is the same flag with the same
  meaning, so its wording is defined once. The version-level and per-document flags stay inline, because each
  of those names a different subject and the subject is what the text has to say.
- Flags are per revision (both tables are revision-keyed); the mark disappears when a fixed revision is
  published. The versions list and the version content report the latest revision, so the flags of an earlier
  revision are visible only on the revisions list — which is why it carries them too.
- Addressing a revision needs no new parameter. The shared `version` path parameter already resolves the
  `version@revision` mask and falls back to the latest revision when no `@revision` is given —
  `SplitVersionRevision` in `repository/PublishedRepositoryPG.go`, applied by the `GetVersion` family every
  version endpoint goes through. The mask was simply never documented on the shared parameter, so the spec
  change is to describe it there once rather than per endpoint. The revisions list returns `version` in
  exactly that mask, so a flagged revision row leads straight to the messages that flagged it without the
  caller assembling a key of its own.
- Dashboard viewing: `GET .../documents` resolves referenced packages' documents, so per-document `hasErrors`
  propagates to the dashboard document list automatically, satisfying "indicate an errored referenced version
  when viewing the dashboard's packages."

### 4. Tests

The api-processor groups above cover the build result. These cover what the backend adds on top of it — the
persistence, the derived views and the refusals, none of which the api-processor tests can reach.

#### Ingestion

- a build result with build-phase and comparison-phase notifications lands in `builder_notifications` and
  `comparison_notifications` respectively, with `category` and `document_id` populated and `severity` stored as
  `0` for `Error` — the `use_zero` fix, without which the `?severity=error` filter silently returns nothing.
- `comparison_id` is resolved from the version-pair identity in the file, including a dashboard build with
  several comparisons where each notification lands on the right one.
- a standalone `changelog` publish (`PublishChanges`) persists its comparison notifications — the path that
  discards them today.
- per-document and per-version `hasErrors` are persisted from the build result; comparison `hasErrors` lands on
  the `version_comparison` row.
- republishing a comparison replaces its notification rows rather than appending to them.

#### Derived views

- `operationTypes.*.hasErrors` and `contractsSummary.ddl|mcp.hasErrors` are computed from the documents: a
  version with one errored REST document flags `rest` and nothing else.
- a document that failed before its type could be determined flags the **version** but no API type — the
  mark-with-no-highlight case the UI has to tolerate.
- `changelogHasErrors` on the versions list and on version content reflects the version's own comparison
  against its `previousVersion`, and is absent when there is none. Both endpoints read the same
  `version_comparison` flag, so a version reports the same value in the list and on its own page.
- the revisions list reports `hasErrors` and `changelogHasErrors` per revision: a version whose revision 1 was
  published with errors and whose revision 2 fixed them shows the flags set on revision 1 and unset on
  revision 2, while the versions list and the version content — both reading revision 2 — report neither.

#### Endpoints

- both notification endpoints filter by `documentId`, `severity` and `category`, singly and combined, and
  comma-separated `severity` / `category` values OR together.
- paging: `limit` and `page` return disjoint slices that reassemble into the unfiltered set, ordering is
  stable across pages, and paging composes with the filters rather than being applied before them.
- `/changes/notifications` selects the comparison by `previousVersion` + `previousVersionPackageId`, and
  returns only that pair's messages in a build that produced several.
- an unfiltered query returns messages that carry no `documentId`.
- both endpoints resolve the `version@revision` mask through the shared parameter: querying an earlier
  revision returns that revision's messages, and querying without `@revision` returns the latest revision's.
- both endpoints require read permission on the package: a caller without it gets `403` from each, and a
  caller with it gets the notifications.

#### Refusals

One test each, all four on the same `isVersionUnsound` predicate:

- publishing `release` when the version has errors, and when only its comparison has errors;
- `PATCH` promoting to `release` in both those cases, while `draft` → `archived` on the same version still
  succeeds;
- a changelog whose previous version is unsound is refused, and `reCalculateChangelogs` **fails** on one —
  publishing an unsound version is rejected when another version declares it as its previous version, while an
  unsound version nothing depends on still publishes as a `draft`;
- publishing a dashboard that references an unsound version.

### 5. Suggested implementation order

1. api-processor: `documentId` unification for MCP and DDL entities — small, self-contained, and a
   prerequisite for attributing the entity duplicate handlers.
2. api-processor: new `NotificationMessage` shape + `MessageCategory` + slug attribution at every raising
   site; catch points; attribution plumbing for the four operation-level sites; `release`-with-errors fatal
   check; `hasErrors` on `documents.json`/`info.json`. (New optional fields — backward compatible for the
   no-error case.)
3. api-processor: apply the severities from
   [Current Notification Revision](#current-notification-revision), including the two severity-from-source
   changes (broken references by `errorType` and `brokenRefs`, replacing `createBundlingErrorHandler`;
   `builder.ts:754` from the parser). The
   `BuilderNotificationsEntity` `use_zero` fix belongs with the backend migration below — without it the
   `?severity=error` filter cannot work.
4. backend: internal spec + `builder_notifications` migration (`document_id`, `category`) +
   `comparison_notifications` table + metadata persistence + the shared `isVersionUnsound` helper and the four
   guards built on it (release publish, release promotion via `PATCH`, previous-version, dashboard reference).
5. backend: public API fields + the two notifications endpoints + `operationTypes`/`contractsSummary`
   computation.
6. agent packages: extend `api-processor-using` for the new library contract, and decide whether an
   `api-processor-authoring` package is created — see [Agent packages](#agent-packages).
7. UI (separate activity): consume the new fields/endpoint on the identified screens.

Step 1 stands alone and can land first. Steps 2 and 4 must land together for the fatal/guard behavior to be
consistent; step 3 gates which messages actually block `release`.

## Agent packages

The change alters the api-processor library contract, so the repo's APM packages have to move with it —
otherwise an agent working in a consumer repo will keep generating code against the old shape.

**`agent-packages/api-processor-using`** exists today and is affected. Its current scope is narrow — the light
root vs `/processor` import boundary — and says nothing about notifications or the build result, so this is an
extension rather than a correction:

- `NotificationMessage` is `{ category, severity, message, documentId? }`. `fileId` is gone; `documentId` is a
  document **slug**, never a path, and a problem touching several documents arrives as one message per
  document rather than one message with a list.
- `BuildResult` carries two notification collections, not one: build-phase messages, and comparison-phase
  messages that belong to a specific version pair.
- `hasErrors` on the version, on each document and on each comparison, and what each one is computed from.
- A `release` build now **throws** when any `Error` notification exists; a `draft` build publishes and is
  marked. A consumer that treats a failed release build as an infrastructure fault will misreport it.
- A document that failed to parse is published carrying its original source, with no operations — consumers
  iterating documents must not assume a document has parsed content. A document with `hasErrors` may be
  missing individual operations that failed to build.

**No `api-processor-authoring` package exists in this repo.** The sibling `apihub-ui-authoring` package in the
UI repo is the precedent for one, and the conventions this change introduces are exactly the kind that a
contributor to api-processor needs and cannot infer from the code:

- notifications are raised with a `category` from `MESSAGE_CATEGORY` — one stable code per diagnostic — and
  attributed with the document **slug** at the raising site, never a `fileId` and never converted later;
- which of the two streams a message belongs to, and that the stream follows from the context that produced it
  rather than from a decision at the call site;
- when a failure may be caught and turned into a notification, and when it must stay fatal — the "is anything
  publishable left?" test, and the deliberate exceptions to it;
- duplicate resolution is order-independent by lexicographically-smallest `documentId`.

Whether to create it is a scoping decision, not a technical one. If it is created, it should be authored with
the `apm-authoring` skill and follow the layout `apihub-ui-authoring` already uses. If it is not, these
conventions live only in this plan, which is a document that will stop being read once the work lands — so at
minimum they should move into `AGENTS.md`.

## Follow-up — severity tightening

Five categories ship at an interim severity and are meant to end as an unconditional `Error` once the existing
population is clean. In each case `Error` is the correct end state — the condition genuinely makes a document
or a changelog unreliable — but promoting it now would block release versions that already carry the message,
retroactively punishing content that was accepted when it was published.

| Category | Phase | Ships as | Releases affected | Why it must end as `Error` |
|----------|-------|----------|------------------:|----------------------------|
| `duplicate-operation-id` | build | `Warning` | sometimes | One operation silently overwrites another; the published version is missing an operation it appears to declare |
| `ref-not-found` | build | configured by `brokenRefs` | sometimes | The reference does not resolve, so the document is incomplete |
| `version-documents-missing` | changelog | `Warning` | rare¹ | A comparison side whose documents cannot be resolved produces an unreliable changelog |
| `empty-path-parameter` | build | `Warning` | rare | The path is syntactically invalid |
| `ref-not-valid-format` | build | configured by `brokenRefs` | rare | The reference is syntactically broken |

¹ Shared bucket with `group-documents-missing`; an upper bound.

**The sequence for the three that ship as `Warning`.** Ship as `Warning`, so the affected versions publish and
are marked; use the notifications endpoints to enumerate the affected packages and versions (filter by
`category`); drive those to be fixed and republished; then flip the severity to `Error` in a later release. The
flip is a one-line change per site — the only thing gating it is the population.

**The broken-reference pair tightens by retiring the flag.** `ref-not-found` and `ref-not-valid-format` are
already `Error` wherever `validationRulesSeverity.brokenRefs` says so, which under the default is everywhere —
so their staging is not a severity to raise but a configuration to remove. They reach the end state when
`brokenRefs` is dropped from `BuildConfig` and both are raised as `Error` unconditionally; see
[Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config).
Two conditions gate that removal rather than one:

- the population is clean, as for the other three — measured by `category`, because `hasErrors` under-reports
  these two whenever the version was last built by migration;
- migration no longer needs the exemption. Today it cannot fail on a broken reference, because it never sets
  the flag; retiring the flag makes broken references able to fail a migration pass exactly as every other
  `Error` can — see [Migration builds are gated too](#migration-builds-are-gated-too).

Two properties make this workable. The category is a stable code, so "list every version still carrying
`duplicate-operation-id`" is a single filtered query rather than a text match. And because migration republishes
existing versions with the new builder, the flags on historical versions stay current without a separate
backfill — the remaining population shrinks as content is fixed, and can be measured at any time. Two
qualifications: broken references are excluded, because migration builds them as `Warning` (see
[Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config)),
and a version whose migration build fails the release gate is not rebuilt at all (see
[Migration builds are gated too](#migration-builds-are-gated-too)).

Do not tighten all five at once: each has a different owner population, and a single flip that blocks several
unrelated teams at once is how a gate gets rolled back. The broken-reference pair is one step, not two — the
flag governs both, and there is no way to retire it for one of them.

## UI follow-up (out of scope here, to be planned separately)

Recorded so the UI activity has the full set of requirements. The backend changes above provide the data for all
of it; no further backend work is implied.

### Version-level errors with no document

**The UI must provide a way to see errors that are not attributable to any specific document.** Four `Error`
notifications are inherently version-level: `version-not-resolved` (a previous version that is deleted or does
not exist), `version-refs-not-resolved` and `comparison-serialization`. They set the
version's
`hasErrors` flag but flag **no document** and **no API type**, so a UI that only surfaces errors through the
documents list or the API type dropdown would show an error mark the user cannot explain or act on.

Required behavior:

- the version-level error mark must be actionable on its own — it cannot assume a document to drill into;
- there must be a path to the unfiltered notifications list
  (`GET /api/v2/packages/{packageId}/versions/{version}/notifications` with no `documentId` filter), which is
  the only place these messages appear;
- ideally, distinguish "version has errors that belong to documents" from "version has errors that belong to
  the version itself", since the remediation differs — fix a document versus fix the version's previous-version
  or reference configuration.

Note the same "mark with no drill-down target" shape also arises when a document fails before its type can be
determined (it maps to no API type); that case *does* have a document to point at, so the documents list
remains the right entry point for it.

### Other screens

- version error mark wherever a version is shown — reuse the placement of the existing
  `WarningApiProcessorVersion` indicator (`VersionPageToolbar`, `VersionDialogForm`,
  `CompareVersionsDialogForm`, `CompareRevisionsDialogForm`, `OperationPage`/`OperationContent`,
  `VersionCompareContent`, `DashboardsCompareContent`, `AddPackageDialog`), plus version lists and selectors
  fed by `GET /api/v3/packages/{packageId}/versions`.
- version selectors that pick a baseline or a dashboard reference should mark — or disable — unsound versions
  using both list flags, `hasErrors` and `changelogHasErrors`, since those are exactly the versions the backend
  refuses. An unreliable changelog disqualifies a baseline just as its own errors do, so a selector that reads
  only `hasErrors` would still offer versions that are then rejected.
- revision list and revision selectors: mark a revision that was published with errors, from the revisions
  list flags. `CompareRevisionsDialogForm` picks a revision the way the version selectors pick a baseline, so
  it should mark unsound revisions the same way. Because the flags are per revision, the list is where a
  version's error history is legible: the revision that carried a problem stays marked after a later revision
  fixed it.
- per-document error mark in the documents list, and error details on the document details screen.
- error icon per API type in the `ApiTypeSelector` dropdown and on the overview page, from
  `operationTypes.*.hasErrors` and `contractsSummary.ddl|mcp.hasErrors`.
- dashboard package list: indicate a referenced package version that has errors (publishing such a reference is
  refused going forward, but pre-existing dashboards may already contain one).
- notifications view with filtering by `documentId`, `severity` and `category`. Based on usage data this is a
  **log, not a short list** — an affected version routinely carries hundreds of messages — so it needs text
  search, grouping by document, pagination or virtualization, and a severity filter. Downgrading severities
  moves volume from `Error` to `Warning` rather than removing it, so the view must cope either way.
- a version-level error mark with no document to drill into is the **exception, not the rule** once the
  severity downgrades are applied, so a tooltip is likely sufficient; a dedicated version-level
  notifications screen is probably unnecessary.

## Decisions

All open questions are closed. Recorded here so they are not reopened:

- **Severities are confirmed per site** — the `Severity decision` column in
  [Current Notification Revision](#current-notification-revision) is the decision, not a proposal. Five
  categories ship at an interim severity and are scheduled to tighten later — three as `Warning`, and the
  broken-reference pair as whatever `brokenRefs` selects; see
  [Follow-up — severity tightening](#follow-up--severity-tightening).
- **Broken references keep their existing switch, as a severity rather than a throw** —
  `validationRulesSeverity.brokenRefs` selects `Error` or `Warning` for `ref-not-found` and
  `ref-not-valid-format`, and `createBundlingErrorHandler` is removed with its throw. Under the default
  configuration a `release` with a broken reference still fails — issue #113 holds — while a `draft` publishes
  marked. No content that builds today stops building. The flag is interim: both categories are still scheduled
  to become unconditional `Error`, at which point it is retired. See
  [Broken references: severity comes from the build config](#broken-references-severity-comes-from-the-build-config).
- **Migration builds are gated like any other publication** — a migrated `release` version carrying an `Error`
  fails its build and is reported under the migration run's `ErrorBuilds`, rather than being exempted or
  published flagged. It keeps its pre-migration data until the content is fixed. See
  [Migration builds are gated too](#migration-builds-are-gated-too).
- **Migration keeps building broken references as `Warning`** — it does not set
  `validationRulesSeverity.brokenRefs`, and this design deliberately leaves that alone, so a migration pass is
  never failed by a broken reference. The accepted cost is that `hasErrors` for those two categories depends on
  whether the version was last built by migration or by a user.
- **Comparison notifications attribute per version pair** — there is no build-wide bucket and no
  build-wide `hasErrors` fallback; see
  [the attribution rule](#every-comparison-notification-belongs-to-one-version-pair).
- **No notification id** in the api-processor shape — see
  [Notifications Mechanism Redesign](#notifications-mechanism-redesign).
- **Comparison-phase errors block a `release`** — a release that declares a `previousVersion` is expected to
  ship a reliable changelog. The two-stream split governs which entity gets flagged, not the release gate, so
  the severity of every comparison-phase `Error` carries release-blocking weight, and was reviewed on that
  basis.
- **One unsound-version predicate for all four backend refusals** — version `hasErrors` **or** its comparison's
  `hasErrors`. See [Backend — new refusals](#backend--new-refusals).
- **The revisions list carries the same two flags as the versions list** — `hasErrors` and
  `changelogHasErrors` per revision, from the same stored sources. The flags are revision-scoped, so without
  this the mark on any revision but the latest is unreachable through the API. Drilling into a flagged
  revision's messages needs no API change: the shared `version` path parameter already accepts the
  `version@revision` mask, it was only undocumented.
- **Version and document `hasErrors` are emitted only by a `build`** — a `changelog` carries the comparison
  flags and `comparison-notifications.json` only. See
  [`hasErrors` flags in the build result](#haserrors-flags-in-the-build-result).
- **A `changelog` with no baseline is a config error, not a notification** — `validateConfig` rejects it and
  `previous-version-missing` is removed from `MESSAGE_CATEGORY`. An absent baseline leaves nothing to compute
  and belongs to no version pair; a baseline that is named but unresolvable still reports
  `version-not-resolved`. The Id stays **separate from `config-invalid`** rather than folded into it — the two
  have different causes and different fixes, and the Id is what makes the fatal explainable. See
  [A changelog with no baseline is a config error](#a-changelog-with-no-baseline-is-a-config-error).
- **All changelog-phase throws stay fatal** — `processor-version-mismatch`, `resolver-missing`,
  `compare-missing-operation-*` and `ddl-compare-hook-missing`. None is converted to a notification; see
  [Current Throws Revision](#current-throws-revision).
- **A dashboard build fails when any reference comparison has errors** (`ref-comparison-has-errors`) —
  recalculated or reused from cache, and in a `build` as well as a `changelog`. An aggregate built from a
  component known to be wrong has no salvageable part. This is the one case where a comparison error blocks a
  `draft`.
- **The release-failure message names the changelog share** — `, including M changelog errors` when both
  streams contribute, and a dedicated `N critical errors in the changelog` when the changelog alone is at
  fault. See [`release` publication is fatal when errors exist](#release-publication-is-fatal-when-errors-exist).
- **The `PATCH` guard covers promotion to `release` only** — other status changes, including
  `draft` → `archived`, stay allowed so an unsound version can be cleaned up.
- **Duplicates resolve by lexicographically-smallest `documentId`**, replacing today's order-dependent
  last-wins — see [Duplicate resolution](#duplicate-resolution). Accepts a behavior change for REST and GraphQL
  duplicates in exchange for reproducible output.
