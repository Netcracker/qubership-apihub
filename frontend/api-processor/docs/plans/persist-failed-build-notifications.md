# Persist Notifications of a Failed Build

Status: **Draft for review** · 2026-09-24

A failed build publishes nothing, so the notifications it collected are lost and its publish status keeps one
summary sentence. This design stores the notifications of a failed package build against the build, and serves them
through two endpoints addressed by `publishId`. It follows
[Tolerant Publication: Per-Document Errors](tolerant-publication-critical-errors.md), whose release gate made such
failures routine.

## Problem

A `release` publication with an `Error` notification fails by design. The publisher gets a sentence such as
`Cannot publish version in release status: 2 critical errors in following documents: …` and has to republish as a
draft to read the messages. A build that failed on a fatal error loses its messages the same way, and a draft
republish does not help there.

Two paths lose the messages:

- **api-processor throws.** `assertReleaseIsPublishable` (`src/components/release-gate.ts:62`), or any other fatal,
  throws out of the strategy before the archive is written. The consumer posts `status=error` with the error text
  only (`build-task-consumer/src/modules/builder/builder.service.ts:134`), and the backend stores that text in
  `build.details`.
- **The backend rejects the archive.** `ValidateBuildResultAgainstConfig`
  (`qubership-apihub-service/service/validation/PublishedValidator.go:211`) refuses a release build result with
  errors. The archive stays in `build_result`, but nothing reads it.

The messages have nowhere to go either. Migration 41 dropped `builder_notifications`, and the tables that replaced it
are keyed by a published version (`published_version_notification`) or a comparison
(`version_comparison_notification`). A failed build has neither.

## Scope

- Every failed build of a package of kind `package` stores the notifications it collected before it failed, at every
  severity, with no cap.
- Only failed builds are stored. A successful build's notifications still go to the published-version tables.
- Dashboards are out of scope. See [Dashboards are out of scope](#dashboards-are-out-of-scope).
- Notifications are kept for 30 days, like the failed build's sources.
- Migration builds are included, so each entry in a migration run's `ErrorBuilds` has its messages.
- Reading requires read permission on the package.
- The release gate is unchanged.

### Dashboards are out of scope

A package build calculates at most one changelog: its version against the previous version. The backend refuses a
`package` version with references (`qubership-apihub-service/service/validation/PublishedValidator.go:89`), so a
package build has no reference pairs to compare. With one comparison per build, a comparison message needs no version
pair, and every structure in this design stays flat.

A dashboard compares one pair per reference, and supporting it needs the additions listed in
[Follow-ups](#follow-ups). Until then:

- The backend stores nothing for a dashboard build. It checks the package kind in the function that stores
  notifications, which both paths call. api-processor and the consumer do not check the kind.
- A failed dashboard publish keeps today's behavior: the summary sentence in its publish status.
- When a dashboard fails because a reference's comparison has errors, that comparison's messages are still reachable.
  A comparison stored earlier returns them from `/changes/notifications`. For one calculated inside the failed build,
  `POST /api/v2/compare` on the reference's pair calculates and stores it.

## Design

### Contract changes

#### `APIHUB_API_internal.yaml`

`BuildErrors`, the payload of `POST /api/v3/packages/{packageId}/publish/{publishId}/status` with `status=error`,
gets an optional `notifications` property of a new schema:

```yaml
FailedBuildNotifications:
  type: object
  properties:
    notifications:
      type: array
      items:
        $ref: "#/components/schemas/BuildResultNotificationMessage"
    comparisonNotifications:
      type: array
      items:
        $ref: "#/components/schemas/BuildResultNotificationMessage"
```

The messages reuse the archive's message schema, with integer severities. The part is sent only with
`status=error`, and it is optional because a build that failed outside the builder has nothing to send. The backend
stores the two lists as one. For a dashboard build it accepts the part and stores nothing from it.

#### `APIHUB_API.yaml`

- **`hasNotifications`** on `GET /api/v2/packages/{packageId}/publish/{publishId}/status` and on each entry of
  `GET /api/v2/packages/{packageId}/publish/statuses`. The shared schema `PublishHasNotifications` defaults to
  `false`. The flag is `true` while a failed package build has stored notifications, and `false` for a dashboard
  build.
- **The fields the status responses already return.** `view.PublishStatusResponse`
  (`qubership-apihub-service/view/Build.go:149`) returns `publishId`, `hasErrors`, and `changelogHasErrors`. The
  single status declared none of them, and the bulk one declared only `publishId`. Both now declare all three.
  `hasErrors` uses a new schema, `PublishHasErrors`, because on a publish process it describes the version the process
  published, and a running or failed process has published none.
- **`GET /api/v2/packages/{packageId}/publish/{publishId}/notifications`** returns `VersionNotification` items and
  takes the filters of `GET .../versions/{version}/notifications`: the shared `notificationDocumentId`,
  `notificationEmptyDocumentId`, `notificationSeverity`, and `notificationCategory` parameters, plus `limit` and
  `page`. Messages about the documents and messages about the
  changelog come in one list. The category tells them apart, because each category is raised in one phase of a
  `build` or `changelog` build. For a dashboard build the endpoint returns an empty list.
- **`GET /api/v2/packages/{packageId}/publish/{publishId}/export/notifications`** returns the same messages as xlsx,
  in the sheet of `GET .../versions/{version}/export/notifications`: Severity, Category, Message, and Document ID.
  Neither export has a Go implementation yet, so they can share one writer.
- **Order.** Both endpoints sort by severity, most severe first (`error`, `warning`, `information`, `hint`), then by
  category, then by message text. `documentId`, with unattributed messages first, breaks the remaining ties, such as
  one problem reported for several documents. Offset paging needs a total order.
- **`NotificationCategoryEnum`** states that on the publish endpoints a category identifies the phase too, since
  its description said that the endpoint defines the phase.
- **`notificationSeverity` and `notificationCategory`** are new shared parameters, used by all five notification
  endpoints in place of their inline copies. The copies differed only in the category example; the shared one is
  `["build-document", "version-not-resolved"]`, one category from each phase.
- **`publishId`** is a new shared path parameter, used by every endpoint under `.../publish/{publishId}` in place of
  six identical inline copies. `APIHUB_API_internal.yaml` gets its own for the status endpoint.

Both new endpoints require read permission on the package, the check `GetPublishStatus` already makes. An unknown
`publishId` returns `404` with the existing `BuildNotFoundById` (`2611`) and the message `Build with $id not found`.
The endpoints add no error codes.

### Flow

1. api-processor attaches the collected notifications to the error it throws.
2. The consumer sends them as a new part of the existing `status=error` request.
3. The backend stores them in a new `build_notification` table keyed by `build_id`, in the transaction that marks the
   build failed.
4. The publish status gets a `hasNotifications` flag.
5. Two new endpoints return the notifications as JSON and as xlsx.

### api-processor

The consumer cannot read the notifications from the builder after a throw. The build stream survives in
`PackageVersionBuilder.notifications` (`src/builder.ts:126`), which the build mutates in place. The comparison stream
does not: each comparison keeps its messages in its own `notifications` array, reachable only through
`buildResult.comparisons`, and `setBuildResult` (`src/builder.ts:211`) copies that property to the builder only when
the strategy returns.

Add an exported error type:

```ts
export class NotificationsError extends Error {
  readonly notifications: NotificationMessage[]           // build stream
  readonly comparisonNotifications: NotificationMessage[] // comparison stream
}
```

- `message` and `cause` are those of the original error, so a consumer that reports only `message` is unaffected.
- `comparisonNotifications` is the list the release gate counts, from `comparisonPhaseNotifications`
  (`src/components/release-gate.ts:29`), plus `BuildStrategy`'s local `rootNotifications`, which holds messages raised
  before a comparison exists. The same message can sit in two of these arrays: when no comparison runs,
  `BuildStrategy` copies `rootNotifications` into `buildResult.comparisonNotifications` with `replaceInPlace`
  (`src/strategies/build.strategy.ts:91`). The list therefore keeps each message object once.
- Both lists are sorted with `buildNotifications` (`src/components/build-result-index.ts`), the order of
  `notifications.json`.
- Both lists are new arrays. `run()` starts with `clearCaches`, which empties the builder's arrays in place, so an
  error holding those arrays would lose its content on the next build.

Three sites wrap their body in a `try`/`catch` and rethrow the error as a `NotificationsError`:

| Site | Streams in scope |
|---|---|
| `BuildStrategy.execute` | build stream, `rootNotifications`, and the comparisons once `compareVersions` has returned |
| `ChangelogStrategy.execute` | comparison stream |
| `createVersionPackage` (`src/components/package.ts:186`) | both streams; it runs after `run()` returns |

No site is nested in another. A site that does catch a `NotificationsError` rethrows it unchanged. Every fatal inside
a site is wrapped, not only the release gate. `createVersionPackage` wraps only in `build` and `changelog` builds.
Export and transform builds are out of scope and fail as today, although they raise notifications of their own, such
as `group-documents-missing`.

### build-task-consumer

Paths are relative to `build-task-consumer/`.

On a `NotificationsError`, `startBuildJob` (`src/modules/builder/builder.service.ts:134`) passes
`{ notifications, comparisonNotifications }` to `RegistryService.postBuildStatus`
(`src/modules/registry/registry.service.ts:82`), which adds it to the form as a `notifications` file part. Any other
error is posted as today.

The payload goes in a file part because it has no cap: `r.ParseMultipartForm` keeps non-file parts in memory and
writes file parts to disk above its memory limit. The existing `MaxBytesReader` limit on the request still applies.
Severities stay the builder's integers, as in `notifications.json`.

### Backend

Paths are relative to `qubership-apihub-service/`.

`publishId` and `buildId` are the same value: `addBuild` (`service/BuildService.go:409`) stores `config.PublishId`
as `build.build_id`. The endpoints read `build_notification` by the path parameter directly.

#### Storage (migration 42)

```sql
CREATE TABLE IF NOT EXISTS build_notification
(
    id          bigint GENERATED ALWAYS AS IDENTITY,
    build_id    varchar NOT NULL,
    severity    varchar NOT NULL,
    category    varchar NOT NULL,
    message     varchar NOT NULL,
    document_id varchar,
    CONSTRAINT pk_build_notification PRIMARY KEY (id),
    CONSTRAINT build_notification_build_id_fk FOREIGN KEY (build_id)
        REFERENCES build (build_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS build_notification_build_id_idx ON build_notification (build_id);

ALTER TABLE build_cleanup_run ADD COLUMN IF NOT EXISTS build_notification integer DEFAULT 0;
```

The two lists of the part are stored together, and the phase is not kept. Severities are stored as strings (`error`,
`warning`, `information`, `hint`), converted with `view.NotificationSeverityFromBuilder`, as in the published-version
tables. The index serves the reads and the cascade from `build`.

#### Write path

- One function stores the notifications of a build. It stores nothing unless the build's package has kind `package`.
- `PostPublishStatus` (`controller/PublishController.go:488`) reads the optional part on `status=error`, unmarshals
  it into two `[]view.BuilderNotification`, and validates each message with `validateNotification`
  (`service/validation/PublishedValidator.go:1176`), as it validates the archive. It passes the part on with the
  `errors` text. `UpdateBuildStatus` stores it in the transaction that sets the status, replacing any rows the build
  already has, and sets `hasNotifications` in `build.metadata`.
- When `ValidateBuildResultAgainstConfig` rejects an archive, `SaveBuildResult` (`service/BuildResultService.go:88`)
  stores the messages of `notifications.json` and of the single entry of `comparison-notifications.json`.

#### Read path

Both endpoints select the build's rows with the filters and this order:

```sql
ORDER BY CASE severity
           WHEN 'error' THEN 0
           WHEN 'warning' THEN 1
           WHEN 'information' THEN 2
           ELSE 3
         END,
         category,
         message,
         document_id NULLS FIRST,
         id
```

The `CASE` ranks the severities, because as strings they would sort `error`, `hint`, `information`, `warning`. The
`id` column breaks the ties left by identical rows. The JSON endpoint applies `limit` and `page` after the order.
The version notifications endpoints order by `id` (`repository/PublishedRepositoryPG.go:2635`), so the two sets of
endpoints return messages in different orders.

#### Retention

Nothing deletes `build` rows, so the foreign key alone would keep the notifications forever. The periodic cleanup job
deletes them with the build's sources, 30 days after a build fails (`repository/BuildCleanupRepository.go:63`). The
job has two branches, chosen by whether Minio storage is active (`service/BuildCleanupService.go:135`), and both
delete them:

- `RemoveOldBuildEntities` deletes them in its transaction.
- `cleanupOldBuilds` deletes them for the ids it passes to `RemoveOldBuildSourcesByIds`.

Each branch clears `hasNotifications` in the same transaction and records the count in
`build_cleanup_run.build_notification`. The migration `Cleanup` stage (`migration/stages/Cleanup.go:40`) deletes a
migration build's sources when the run ends and leaves its notifications. Deleting a package removes them through the
cascade.

## Tests

api-processor, in `test/fatal-failures.test.ts` and `test/release-gate.test.ts`:

- A failed `release` carries every build-stream message, and its `message` is the release gate's text.
- A failure at the late release gate carries the root comparison's messages.
- A message raised while resolving the baseline appears once, whether or not a comparison ran.
- A fatal in `buildFiles` carries the parse messages raised before it.
- A `changelog` failure carries an empty build stream.
- A failure in `createVersionPackage` during an export build is not wrapped.
- Both lists are in `buildNotifications` order, and every site keeps the original `message` and `cause`.
- A second build on the same builder leaves the first error's lists intact.

build-task-consumer:

- A `NotificationsError` adds a `notifications` file part that matches the internal contract. Any other error adds
  none.

Backend:

- Ingestion stores one row per message of both lists, with a string severity, in the status transaction. A storage
  failure leaves the status unchanged.
- A request without the part stores nothing. A malformed part returns `BadRequestBody` and leaves the status
  unchanged.
- A rejected release archive stores its notifications.
- A dashboard stores nothing on either path. Its status is set, `hasNotifications` is `false`, and both endpoints
  return empty results.
- The filters, paging, and the `6013` refusal of `documentId` together with `emptyDocumentId`.
- The order: a `warning` follows every `error` although it sorts before `error` as text, category and message break
  severity ties, an unattributed message precedes attributed ones with the same text, and consecutive pages neither
  overlap nor skip a row.
- The export's rows match the JSON endpoint's, in the same order, under the same filters. With no messages, it holds
  only the header row.
- Both endpoints return `403` without read permission and `404` for an unknown `publishId`.
- Both cleanup branches delete the rows and clear the flag after 30 days, and record the count. The migration
  `Cleanup` stage keeps the rows. Deleting the package removes them.
- `hasNotifications` is `false` for a running build, a completed build, and a failed build with no notifications.

## Skills

The copies under `.claude/skills/` are installed from these sources:

- `agent-packages/api-processor-authoring/.apm/skills/api-processor-notifications/SKILL.md`: a fatal is raised as a
  `NotificationsError` that carries copies of both streams, at the three sites above.
- `agent-packages/api-processor-using/.apm/skills/api-processor-using/SKILL.md`: a failed build may throw a
  `NotificationsError`, and its two lists form the part the status endpoint accepts.

## Follow-ups

**Listing a version's builds.** The notifications are reachable only by `publishId`, and no endpoint lists a
version's builds. A client that loses the id, such as after a page reload or for a CI publication, cannot find the
build again.

**Dashboards.** Supporting dashboards extends this design without replacing any of it:

- Store a version pair per comparison message and return both sides, because a reference pair's current side is the
  referenced package. The pair has to be stored: the previous side comes from references fetched during the build
  (`src/components/compare/compare.ts:84`), and the migration `Cleanup` stage deletes a migration build's config when
  the run ends.
- Raise the error in `assertReferencesAreSound` (`src/components/compare/compare.ts:151`), the only scope that holds
  the reference comparisons, and have the outer sites merge into it.
- Add a message for a reference comparison reused from the backend with errors, which arrives without messages of its
  own.

## Decisions

- **Send the notifications with the terminal status, not in a separate `PATCH`.** Two requests leave a window in which
  the build has failed with no notifications attached.
- **`hasNotifications` is a boolean, not a count.** A stored flag keeps the polled status endpoint a single-row read.
- **One list, without the phase.** api-processor keeps two lists in the internal part, and the backend stores and
  returns them as one. A reader does not need the phase, and the category identifies it for a reader who does.
- **Sort by severity, category, and message.** The most severe problems come first, grouped by kind.
  `documentId` and `id` only break ties.
- **Leave the version notifications endpoints in `id` order.** Changing them is outside this design, so the version
  and publish endpoints return messages in different orders.
- **Exclude dashboards in the backend.** One check in the storing function covers both write paths. A check in
  api-processor would miss the rejected archive.
