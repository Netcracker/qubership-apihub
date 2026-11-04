---
name: api-doc-viewer-using
description: Integrate api-doc-viewer React components in a host application — imports, styles, merged documents, and diff configuration. Use when importing @netcracker/qubership-apihub-api-doc-viewer in a React app such as frontend/ui or frontend/apispec-view.
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
  OpenApiOperationViewer,
  OpenApiOperationDiffsViewer,
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
  type CustomizationOptions,
  type TopLevelPropsMediaTypesMap,
  type OpenApiOperationKeys,
  type AsyncApiOperationKeys,
  type TableKey,
  type NavigationLinkBuilder,
  type NavigationLinkProps,
  type NavigationLinkComponent,
  buildDiffCauseByPathCausedAt,
  buildOpenApiDiffCause, // deprecated
} from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'
```

Styles are **not** bundled into components — import the CSS once at the
application entry (root layout or app shell).

**CSS isolation:** every class the viewers render is prefixed `api-doc-viewer-`, and the stylesheet's
reset and element rules (`ul`, `a`, `button`, `:root` variables) apply only inside a viewer root
(`.api-doc-viewer-root`) — the host page is not restyled, and host classes with common names do not
reach the viewers. Bundled fonts are registered as `"api-doc-viewer Inter"` etc. Host overrides
target prefixed classes inside `.api-doc-viewer-root` and are not a stable API. A host
`navigationLinkComponent` receives an already prefixed `className` — apply it unchanged. Design:
`docs/design/shared/features/css-isolation.md`.

**Peer dependencies:** `react` and `react-dom` `^18.2.0` — the host provides
them; the bundle keeps them external.

**Key and option types** are exported from the package root — type props with
them instead of re-declaring shapes: `OpenApiOperationKeys` (`{ path, method }`),
`AsyncApiOperationKeys` (`{ operationKey, messageKey }`; named `OperationKeys` inside
next-data-model), `TableKey` (`{ schemaName, name }`), `CustomizationOptions`, and
`TopLevelPropsMediaTypesMap`. `firstRowPrecededBy` (JSON Schema viewers) is an internal
spacing hook for viewers that embed other viewers; its `PrecededBy` enum is not
exported, and hosts omit the prop.

## Plain vs diffs viewers

Each spec family has a plain viewer (single document) and a diffs viewer
(comparison mode). Pass the **merged document** from your document
build/normalisation pipeline — do not hand-merge before/after specs in UI code.

| API type | Plain | Diffs | Document prop |
| --- | --- | --- | --- |
| JSON Schema | `JsonSchemaViewer` | `JsonSchemaDiffsViewer` | `schema` (merged document for diffs) |
| GraphQL operation (legacy) | `GraphQLOperationViewer` | `GraphQLOperationDiffViewer` | `source` |
| OpenAPI operation | `OpenApiOperationViewer` | `OpenApiOperationDiffsViewer` | `source` / `mergedSource` |
| AsyncAPI operation | `AsyncApiOperationViewer` | `AsyncApiOperationDiffsViewer` | `source` / `mergedSource` |
| DDL table | `DdlTableViewer` | `DdlTableDiffsViewer` | `source` / `mergedSource` |

Shared optional props: `displayMode` (`'simple' | 'detailed'`, default
`'detailed'`); `expandedDepth` on JSON Schema, OpenAPI, and GraphQL viewers
(default `2`); `noHeading` and `devMode` on OpenAPI, AsyncAPI, and DDL viewers.

Layout: the legacy `GraphQLOperationDiffViewer` accepts `layoutMode` and severity
`filters`; JSON Schema, OpenAPI, AsyncAPI, and DDL diffs viewers always render side by
side and accept `diffTypes` (placeholder — accepted, not applied yet).

Every viewer renders nothing for a `null` document and catches its own render
errors with an inline fallback message.

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
- **JSON Schema, OpenAPI, AsyncAPI, and DDL diffs** — prop name `diffMetaKeys`.

Mismatch between merged-document keys and viewer props produces empty diff
highlights with no runtime error.

## OpenAPI-specific wiring

`OpenApiOperationViewer` renders one OpenAPI 3.0.x / 3.1.x operation — security,
parameters, request body, responses (with response-code and media-type selectors),
extensions; nested schemas go through the JSON Schema viewers.

- **`source`** (plain) — whole OpenAPI document after api-unifier `normalize` +
  `denormalize`, **`components` kept**.
- **`mergedSource`** (diffs) — `apiDiff` merged document of the two **whole** documents
  (`components` kept).
- **`operationKeys`** (optional, `OpenApiOperationKeys`) — `{ path, method }`; `path` is
  the `paths` key exactly as written (e.g. `/pets/{petId}`), `method` is case-insensitive.
  In a merged document a renamed path is addressed by its **after** key. Omitted → the
  first operation of the document.
- **`expandedDepth`** — forwarded to the nested JSON Schema viewers.
- **`hideUnchangedNodes`** (diffs, default `true`) — forwarded to the nested
  `JsonSchemaDiffsViewer`s; a security scheme card without content changes shows only
  its title row plus a "three dots" row.

```typescript
<OpenApiOperationDiffsViewer
  mergedSource={mergedOpenApiDocument}
  operationKeys={{ path: '/pets/{petId}', method: 'get' }}
  diffMetaKeys={diffMetaKeys}
/>
```

Design: `docs/design/openapi/features/operation-viewer.md`,
`docs/design/openapi/features/diffs.md`.

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
runs of unchanged nodes collapse behind a "Show N unchanged nodes" row). The `x-*` extension values
(JSO trees) follow the same setting, in `JsonSchemaDiffsViewer` and in `OpenApiOperationDiffsViewer`;
AsyncAPI bindings and extensions always show every row.

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
- **`navigationLinkComponent`** — receives `{ href, className?, children }` (`className` is
  already prefixed — apply it unchanged)
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
- **Plain OpenAPI** — `denormalize(normalize(document, options), options)`, `components` kept.
- **OpenAPI diffs** — `apiDiff(beforeDocument, afterDocument, { beforeSource, afterSource, metaKey, unify, … }).merged`
  of the whole documents.
- **JSON Schema diffs** — `apiDiff` merged document of the schemas (or of their
  enclosing OpenAPI documents), with diff meta properties attached.
- **DDL diffs** — merged ddlapi `Realm` produced by the ddlapi diff pipeline.
- **GraphQL diffs** — merged document from the builder pipeline with diff meta
  properties attached.

Replicate Storybook helpers (`prepareAsyncApiDocument`,
`prepareAsyncApiDiffsDocument` in the library's `stories/preprocess.ts`) only
in tests — production UI receives prepared documents from the host backend or
build pipeline.

## Helper exports

Use these over ad-hoc formatting when a host shows "caused by" annotations next to
change severities:

- **`buildDiffCauseByPathCausedAt(path)`** — `caused by <path joined by '.'> change`
  for the JSON path a change was caused at; `undefined` for an empty or missing path.
- **`buildOpenApiDiffCause(diff)`** — *deprecated*, kept for existing hosts: derives the
  path from an `apiDiff` `Diff`'s first after (else before) declaration path, only when it
  starts at `components`, and returns `''` when there is none. Migrate to
  `buildDiffCauseByPathCausedAt`.

## Scope note

When editing the library itself under `packages/api-doc-viewer/`, use
`api-doc-viewer-authoring` instead of this skill.
