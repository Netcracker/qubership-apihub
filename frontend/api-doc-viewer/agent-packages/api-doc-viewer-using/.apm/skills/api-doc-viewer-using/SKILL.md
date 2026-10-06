---
description: Integrate api-doc-viewer React components in a host application — imports, styles, merged documents, and diff configuration.
---

# Using api-doc-viewer

Embed human-readable API specification viewers from
`@netcracker/qubership-apihub-api-doc-viewer` in a React host application.
Import only from the **package root** and the published CSS subpath — internal
module paths are not part of the public contract.

**Documentation scope:** describe integration in terms of the host application
or integrator. Do **not** name or reference consuming applications, their
repositories, file paths, or UI components in this skill.

This skill derives from the authoring and testing skills and the design in
`docs/design/`; what each viewer displays is listed in
`docs/design/<api-type>/display-coverage.md`.

```typescript
import {
  JsonSchemaViewer,
  JsonSchemaDiffsViewer,
  GraphQLOperationViewer,
  GraphQLOperationDiffViewer,
  AsyncApiOperationViewer,
  AsyncApiOperationDiffsViewer,
  DdlTableViewer,
  DdlTableDiffsViewer,
  DOCUMENT_LAYOUT_MODE,
  SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
  INLINE_DIFFS_LAYOUT_MODE,
  type DisplayMode,
  type LayoutMode,
  type DiffMetaKeys,
  type NavigationLinkBuilder,
  type NavigationLinkProps,
  type NavigationLinkComponent,
  buildOpenApiDiffCause,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'
```

Styles are **not** bundled into components — import the CSS once at the
application entry (root layout or app shell).

## Plain vs diffs viewers

Each spec family has a plain viewer (single document) and a diffs viewer
(comparison mode). Pass the **merged document** from your document
build/normalisation pipeline — do not hand-merge before/after specs in UI code.

| API type | Plain | Diffs | Document prop |
| --- | --- | --- | --- |
| JSON Schema | `JsonSchemaViewer` | `JsonSchemaDiffsViewer` | `schema` (merged document for diffs) |
| GraphQL operation (legacy) | `GraphQLOperationViewer` | `GraphQLOperationDiffViewer` | `source` |
| AsyncAPI operation | `AsyncApiOperationViewer` | `AsyncApiOperationDiffsViewer` | `source` / `mergedSource` |
| DDL table | `DdlTableViewer` | `DdlTableDiffsViewer` | `source` / `mergedSource` |

Shared optional props: `displayMode` (`'simple' | 'detailed'`, default
`'detailed'`); `expandedDepth` on JSON Schema and GraphQL viewers.

Layout: the legacy `GraphQLOperationDiffViewer` accepts `layoutMode` and severity
`filters`; JSON Schema, AsyncAPI, and DDL diffs viewers always render side by
side and accept `diffTypes`.

## Diff meta keys

Diffs viewers need the same `DiffMetaKeys` the build pipeline stamped on the
merged document:

```typescript
import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'

const diffMetaKeys: DiffMetaKeys = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}
```

- **GraphQL diffs (legacy)** — prop name `metaKeys`.
- **JSON Schema, AsyncAPI, and DDL diffs** — prop name `diffMetaKeys`.

Mismatch between merged-document keys and viewer props produces empty diff
highlights with no runtime error.

## AsyncAPI-specific wiring

AsyncAPI viewers require a stable **`referenceNamePropertyKey`** symbol shared
with the normalisation/diff pipeline — use `FIRST_REFERENCE_KEY_PROPERTY` from
`@netcracker/qubership-apihub-api-processor` (same symbol in normalize and
`apiDiff` calls).

Optional **`operationKeys`** narrow which operation/message to render when the
merged document contains several:

```typescript
operationKeys={{ operationKey: asyncOperationId, messageKey: messageId }}
```

Typical host integration: pass `mergedDocument` from your data layer, toggle
plain vs `AsyncApiOperationDiffsViewer` with a comparison flag, and reuse the
same `FIRST_REFERENCE_KEY_PROPERTY` and `DiffMetaKeys` as the build pipeline.

## GraphQL-specific wiring

Legacy viewers. Build a GraphAPI schema with `@netcracker/qubership-apihub-graphapi`
before passing it as `source`. Select the operation with `operationType`
(`query`, `mutation`, `subscription`) and `operationName`.

## JSON Schema-specific wiring

`JsonSchemaViewer` takes `schema` plus optional `expandedDepth`, `displayMode`,
`initialLevel`, and `customizationOptions` (`headerRowTitle` replaces the root title;
`suppressRootNestingIndicator` renders a wrapper object's properties as a flat
top-level list). `JsonSchemaDiffsViewer` takes the merged document as `schema`,
plus `diffMetaKeys`, optional `diffTypes` (placeholder: accepted but ignored — no diff-type
filtering yet), and `hideUnchangedNodes` (default `true`:
runs of unchanged nodes collapse behind a "Show N unchanged nodes" row).

**Synthesized schemas — renamed keys.** When the host builds a schema itself (for example one
property per API parameter) and a property's key changed between versions, it can express the
change as a rename instead of a removed plus an added property: in the parent's `properties` diff
record (`properties[diffsMetaKey]`), key the diff by the property's **after** key with
`action: 'rename'`, `beforeKey`, and `afterKey`. `JsonSchemaDiffsViewer` then shows the old key on
the origin side and the new key on the changed side, highlighted, and keeps the property's own diffs.
`apiDiff` never produces such a diff for plain JSON Schema documents. Design:
`docs/design/json-schema/features/node-key-rename.md`.

**Synthesized schemas — media types of top-level properties.** `JsonSchemaViewer` (plain only)
accepts `topLevelPropsMediaTypes: Record<string, string>` — root's direct property key → media type
(for example an API parameter described with `content` rather than `schema`). Each listed property
gets an outline badge with the media type after its type label and tags; nested properties with the
same key are not matched. `JsonSchemaDiffsViewer` does not support it. Design:
`docs/design/json-schema/features/top-level-props-media-types.md`.

## DDL table-specific wiring

`DdlTableViewer` and `DdlTableDiffsViewer` require:

- **`source`** (or **`mergedSource`** on the diffs viewer) — a ddlapi **`Realm`**
  (or compatible tree root) containing the table.
- **`tableKey`** — `{ schemaName, name }` selecting which table to render.
- **`navigationLinkBuilder`** — builds href targets for foreign-key links.
- **`navigationLinkComponent`** (optional) — custom link renderer for FK rows;
  defaults to `DefaultNavigationLink` (`<a href>`). Pass a host-router wrapper
  for client-side navigation without full page reload.

```typescript
import {
  DdlTableViewer,
  type NavigationLinkBuilder,
  type NavigationLinkComponent,
  type NavigationLinkProps,
} from '@netcracker/qubership-apihub-api-doc-viewer'

const navigationLinkBuilder: NavigationLinkBuilder = (schemaName, tableName, _column) => {
  const tableEntityId = buildTableEntityId(schemaName, tableName) // host-specific
  return `/path/to/table/${tableEntityId}` // pathname + search your router accepts
}

const HostNavigationLink: NavigationLinkComponent = ({ href, className, children }) => (
  <RouterLink to={href} className={className}>
    {children}
  </RouterLink>
)

<DdlTableViewer
  source={normalizedRealm}
  tableKey={{ schemaName: data.schemaName, name: data.name }}
  navigationLinkBuilder={navigationLinkBuilder}
  navigationLinkComponent={HostNavigationLink}
  displayMode="detailed"
/>
```

Replace `RouterLink` with whatever link primitive the host router exposes
(e.g. React Router `NavLink`, Remix `Link`, Next.js `Link`).

**Contract:**

- **`navigationLinkBuilder`** — signature `(schema, table, column) => string`.
  Must return a URL string (absolute or app-relative path). The host owns
  routing — return a pathname and optional search string the host router
  understands. The **`column`** argument identifies the referenced column;
  table-level navigation may ignore it when building the link.
- **`navigationLinkComponent`** — receives `{ href, className?, children }`
  where `href` comes from `navigationLinkBuilder`. Omit for static hosts and
  Storybook that rely on plain anchors (`DefaultNavigationLink`).

## Layout modes

Exported constants: `DOCUMENT_LAYOUT_MODE`, `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE`,
`INLINE_DIFFS_LAYOUT_MODE`. Only the legacy GraphQL diff viewer accepts
`layoutMode`; the other diffs viewers always use side-by-side internally.

## Document preparation

Viewers expect documents already normalised/merged before they reach the UI:

- **Plain AsyncAPI** — normalised AsyncAPI object (often passed as
  `mergedDocument` even when not comparing versions).
- **AsyncAPI diffs** — output of `apiDiff(before, after, { metaKey, firstReferenceKeyProperty, unify, … }).merged`.
- **JSON Schema diffs** — `apiDiff` merged document of the schemas (or of their
  enclosing OpenAPI documents), with diff meta properties attached.
- **DDL diffs** — merged ddlapi `Realm` produced by the ddlapi diff pipeline.
- **GraphQL diffs** — merged document from the builder pipeline with diff meta
  properties attached.

Replicate Storybook helpers (`prepareAsyncApiDocument`,
`prepareAsyncApiDiffsDocument` in the library's `stories/preprocess.ts`) only
in tests — production UI receives prepared documents from the host backend or
build pipeline.

## Helper export

`buildOpenApiDiffCause` formats human-readable diff cause strings for OpenAPI
diff tooltips. Prefer it over ad-hoc diff message formatting when displaying
OpenAPI change annotations.

## Scope note

When editing the library itself under `packages/api-doc-viewer/`, use
`api-doc-viewer-authoring` instead of this skill.
