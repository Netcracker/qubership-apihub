---
name: api-processor-notifications
description: Use when adding a diagnostic to api-processor, turning a throw into a reported problem, or deciding whether a failure aborts the build.
---

# Reporting a problem instead of throwing

A version publishes what it could build. One broken document must not cost the version the documents that
built cleanly, so a problem becomes a `NotificationMessage` and the build keeps going.

## Raise it where it happens, with a category and a slug

`NotificationMessage` is `{ category, severity, message, documentId? }`.

- **`category` comes from `MESSAGE_CATEGORY` (`src/consts.ts`): one value per problem a reader acts on the
  same way**, so a consumer filters on it instead of matching interpolated text. Conditions share a value when
  they are the same problem. `mcp-document-schema` covers a missing endpoint, an unsupported protocol version
  and a document that fails its schema. `ddl-parse-issue` covers every non-fatal DDL issue but the duplicate
  object, and `build-document` is what a throw gets when it classified itself as nothing else. Two problems
  that call for different action never share a value: each gets its own, and so does a new check whose results
  a filter must isolate.
- **`documentId` is the document's slug, and it is set where the problem is found** — never a `fileId`, never
  a path, never converted later by a pass that walks the finished list. Only the site that detects the problem
  still knows which document it belongs to; if a function needs a slug it does not have, give it the
  parameter rather than reconstructing the attribution afterwards.
- **`message` is one per document, even when the problem spans several of them.** A single message listing
  them all would leave every one of them unflagged.
- **`severity` comes from the source, not from the catch site.** A reference problem takes it from its
  `errorType`, a parse problem from the parser's own diagnostic. Take it only when it is a value
  `MESSAGE_SEVERITY` defines: the consumer rejects the whole archive over one it does not know. A `catch`
  block that stamps every message `Error` throws away what the producer knew.

A duplicate id is reported by whichever site can still see both claimants. Across documents that is
`createCrossDocumentDuplicateHandler` (`src/utils/document.ts`), for operations, MCP and DDL entities alike.

Its severity comes from both claimants, never from whichever document happened to arrive second. The operation
handler answers per api type: a `Warning` where published versions already carry the message, so tightening
cannot block their releases retroactively, an `Error` where the collision used to abort the build and there is
no such population to protect. Where the two sides disagree the milder one wins — two api types can produce
one id, and `config.files` order must not decide whether a release is refused.

Inside one document it is the api type's own category (`rest-duplicate-operation`,
`async-duplicate-operation`), raised against that document, which keeps the operations it did build. GraphQL
needs neither: its operation keys are unique object keys, and slugify folds no two valid names together. MCP
and DDL throw there instead of pushing, and the per-item catch turns the throw into the same thing: the
colliding entity is dropped, the rest of the document's entities are kept.

## A `$ref`-ed file is reported by the documents that bundle it

A referenced file has no slug: it never becomes a document of the version, so it cannot own a message. Every
document that bundles it does, and reporting there means a file two documents pull in flags both of them —
`parseFile` caches by `fileId` and would have reported it once, against whoever parsed it first.

- **`documentId` is the bundling document's slug**, for the reference errors (`ref-*`) and for the parse
  problems of the file itself alike.
- **The message names the referenced `fileId`** — `Invalid <type> file '<fileId>' referenced from this
  document.` It is the path the user wrote in the `$ref` and the one they will edit, and it is the only place
  that path survives: the archive inlines the bundled content into the root and keeps no record of where it
  came from. This is the one place a `fileId` belongs in a notification; `documentId` never carries one.
- **A referenced file that is also a configured document reports twice**: once as its own document, in the
  plain form, and once per document that bundles it, in the `referenced from` form. Both are correct — the
  file is broken and so is every bundle containing it.
- **Unless it will not be published.** `buildFiles` settles `publish` after every file is built, and only
  then does a document report the problems of its own file (`reportOwnParseErrors`). A configured file left
  unpublished is a `$ref` target like any other, and a message under its slug would name a document
  `documents.json` does not contain.

## The stream is the context's, not the call site's

There are two lists, and code never picks between them. It writes to `ctx.notifications`, and which list that
is was decided when the context was made: a builder context carries the build's list, and
`CompareContext.forPair` narrows a compare context to the list of the version pair being compared. A resolver
shared by both reaches the right list because it was bound to the context that called it.

Consequences worth knowing before you touch this:

- **Never reassign a notifications array.** A context bound through `bind` holds the array it was made with,
  so an assignment leaves it writing into a discarded list while the new one silently stays empty. Clear with
  `.length = 0` as `clearCaches` does, or swap contents with `replaceInPlace` (`src/utils/arrays.ts`) as
  `setBuildResult` does — the fields are `readonly` so the compiler catches an assignment.
- The comparison stream ships per version pair, and a comparison the host served from its cache ships **no
  row at all**. An empty row would wipe the messages stored by the build that actually calculated it.
- A message raised before any pair exists — resolving the baseline, enumerating references — ships under the
  pair the config declared (`DeclaredPair` in `src/components/build-result-index.ts`).

## A flagged document still publishes what it built

An `Error` marks a document; it does not empty it. Whatever the document managed to build — operations, MCP
entities, DDL entities — is published, and the notification says what is wrong with the rest. A draft
published for troubleshooting is more use with half an API readable than with none, and the flag is what tells
the reader not to trust it whole.

Only two things leave a document with nothing to show, and neither is a policy:

- **It never parsed.** There is no model to enumerate, so the document publishes its source bytes and no
  operations. That is a consequence, not a rule.
- **Nothing else.** The builders loop per item, so a single operation or entity that cannot be built is
  omitted on its own — see the per-item catches below.

**Failures are caught at the item, then at the document.** `buildRestOperations`, the AsyncAPI and GraphQL
equivalents, `buildDdlEntities` and `buildMcpEntities` each wrap one item: the failure becomes its own `Error`
against the document, that item is left out, and the loop carries on. The per-document `try` in
`buildAllDocuments` (`src/components/build-documents.ts`) is the outer net for whatever escapes them. Both
levels report; neither takes anything back.

**`document.operationIds` and `mcpEntityIds` must list only what was actually built.** They are assembled from
the array the builder returned, which is now shorter than the document's declarations by exactly the items
that failed. Listing more than that makes `rebuildFiles` evict index entries the document never produced —
the ownership problem duplicate resolution fixes from the other side.

**The pipeline is three named steps**, and `buildVersionContent` reads as them: `buildAllDocuments`,
`reportIdCollisions` and `indexBuiltIds` (`src/components/build-documents.ts`). Collisions are reported before
anything is claimed, over the whole claimant set — see `src/components/duplicate-resolution.ts` for why
severity is decided per collision rather than per id. Then the ids get their owners, the smallest slug wins a
contested one, and `reconcileOwnedIds` stops the losers announcing what they did not keep.

**Partial content can only ever ship as a draft.** Any `Error` still blocks a release, so publishing what a
flagged document built widens the diagnostic without touching the gate.

## Deciding whether a failure may be caught

Apply one test: **after this failure, is there still something worth publishing?** A document that failed to
parse leaves its neighbours intact, so it is caught, published with its source bytes and none of its content,
and reported. A failure that leaves nothing — or leaves a result that would mislead — is not.

The deliberate exceptions, all of them:

| Stays fatal | Why |
|-------------|-----|
| invalid build config, including a changelog with no baseline | there is no subject to build |
| packaging / zip failure | no artifact was produced |
| a host resolver was not wired | a deployment defect, identical for every build |
| api-processor version mismatch between the compared versions | a partial changelog would mask it beyond tracing |
| an operation in the index but not in the documents pair | internal inconsistency, not a user error |
| no DDL compare hook registered while DDL documents exist | the same |
| a dashboard reference whose comparison has errors | the aggregate has no correct part to keep |

The last one is the only comparison error that aborts a **draft** as well. Every other release rule is about
status: a draft publishes marked, a release throws. `src/components/release-gate.ts` owns that, and no other
site should be checking `status` to decide whether an error is fatal. `BuildStrategy` gates before the archive
is written, so `createVersionPackage` gates the comparison stream again, for `BUILD_TYPE.BUILD` only. Nothing
raised while writing the archive is an `Error` today: `comparison-serialization` reports what api-diff put in
the diff, which no document of the publisher's can fix, so it is a `Warning`. The second call is there for the
first packaging `Error` someone adds, and `test/release-gate.test.ts` covers it with a mock.

Fatal failures are covered by `test/fatal-failures.test.ts`, except the dashboard rule, which sits with the
other dashboard cases in `test/dashboards.test.ts`. Adding one means adding a case in the matching file — a
throw with no test is indistinguishable from a throw someone forgot to convert.

## A fatal failure still carries what was reported

A failed build writes no archive, so the messages it collected before the throw would never reach the client.
In a `build` or `changelog` build, a fatal leaves as a `NotificationsError` (`src/errors.ts`) that carries copies
of both streams. Three sites wrap it, all through `toNotificationsError` (`src/components/release-gate.ts`):
`BuildStrategy.execute`, `ChangelogStrategy.execute`, and `createVersionPackage` for those two build types.

- **Throw a plain `Error` at the fatal site.** The wrap sits above it, so a new fatal inside these paths needs
  nothing more. Never construct a `NotificationsError` yourself.
- **A new site that can fail after messages exist passes every array in scope.** A pair array that no
  comparison holds yet matters most: until `compareVersions` returns, a strategy's `rootNotifications` is the
  only place a baseline that did not resolve is reported. `toNotificationsError` copies, deduplicates by
  identity, and sorts, so passing an array twice is harmless.
- **The error reads as the original.** It copies `name` and `message`, and the original is its `cause`. Every
  client sends `${error}` to the backend, so a wrap must not change that text.

`test/fatal-failures.test.ts` asserts the lists at each site, and `test/release-gate.test.ts` asserts them for a
refused release.

## Adding a diagnostic, in order

1. Add the `MESSAGE_CATEGORY` value.
2. Push the message at the detection site, with the slug and the severity the producer knows.
3. Add a row to `test/notification-catalogue.test.ts`: what raises it, its severity, whether it names a
   document, whether a release still publishes. If nothing a publisher can write reaches it, say why in the
   comment above `publish` there and cover it where the collaborator is stubbed instead.
4. Cover attribution in `test/notification-attribution.test.ts`: the message reaches the right stream and
   names the right slug.
5. Check the existing fixtures if the new value can block a release. Enabling the gate is a detector, and a
   fixture that starts failing is usually telling the truth.
6. If it ships as an `Error`, check that the documents it names still publish what they built. A fixture that
   starts losing operations is a regression, not the new check working — the flag is the whole cost of an
   `Error` to a document's content.
