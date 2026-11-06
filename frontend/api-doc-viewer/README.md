# APIHUB API doc viewer

The API doc viewer is a pnpm workspace of React libraries that render API documents in a human-readable way, with or
without the differences between two versions shown side by side. The module is published as the npm packages
`@netcracker/qubership-apihub-api-doc-viewer` (the React viewers) and `@netcracker/qubership-apihub-next-data-model`
(the tree builders and diff aggregators that feed them).

| API type | Viewer | Diffs viewer | Renders |
| --- | --- | --- | --- |
| JSON Schema | `JsonSchemaViewer` | `JsonSchemaDiffsViewer` | One schema as an expandable property tree |
| OpenAPI 3.0 / 3.1 | `OpenApiOperationViewer` | `OpenApiOperationDiffsViewer` | One operation (`path` + `method`): security, parameters, request body, responses |
| AsyncAPI 3.0 | `AsyncApiOperationViewer` | `AsyncApiOperationDiffsViewer` | One operation and one of its messages: headers, payload, channel, bindings |
| DDL (PostgreSQL) | `DdlTableViewer` | `DdlTableDiffsViewer` | One table: columns, indexes, foreign-key links |
| GraphQL *(legacy)* | `GraphQLOperationViewer` | `GraphQLOperationDiffViewer` | One query, mutation, or subscription |

The UI and `apispec-view` use the viewers. See the
[processing libraries guide](../../docs/architecture/processing-libraries.md) and the
[architecture overview](../../docs/architecture/overview.md).

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Preparing documents](#preparing-documents)
- [Common props](#common-props)
- [Styling](#styling)
- [Components](#components)
  - [JsonSchemaViewer / JsonSchemaDiffsViewer](#jsonschemaviewer--jsonschemadiffsviewer)
  - [OpenApiOperationViewer / OpenApiOperationDiffsViewer](#openapioperationviewer--openapioperationdiffsviewer)
  - [AsyncApiOperationViewer / AsyncApiOperationDiffsViewer](#asyncapioperationviewer--asyncapioperationdiffsviewer)
  - [DdlTableViewer / DdlTableDiffsViewer](#ddltableviewer--ddltablediffsviewer)
  - [GraphQLOperationViewer / GraphQLOperationDiffViewer
    (legacy)](#graphqloperationviewer--graphqloperationdiffviewer-legacy)
- [Other exports](#other-exports)
- [Development](#development)
- [License](#license)

## Installation

Inside this repository the consumers depend on the package as `workspace:^`. Other applications install it from the
registry:

```bash
npm add @netcracker/qubership-apihub-api-doc-viewer
```

**Peer dependencies:** `react` and `react-dom` `^18.2.0`, provided by the host application (not bundled).

Documents are prepared with the companion APIHUB libraries — install the ones for the API types
you render:

| Package | Used for |
| --- | --- |
| `@netcracker/qubership-apihub-api-unifier` | `normalize` / `denormalize` — resolves `$ref`s for plain viewers |
| `@netcracker/qubership-apihub-api-diff` | `apiDiff` — produces merged documents for diffs viewers, `DIFF_META_KEY` |
| `@netcracker/qubership-apihub-ddlapi` | `buildFromDdl` — parses SQL DDL into a `Realm` |
| `@netcracker/qubership-apihub-graphapi` | `buildFromSchema` — converts a GraphQL schema to GraphAPI (legacy viewers) |

## Quick start

Import the stylesheet **once** at the application entry, then render a viewer:

```tsx
import { JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'

const schema = {
  title: 'Pet',
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', format: 'int64' },
    name: { type: 'string', maxLength: 64 },
    tags: { type: 'array', items: { type: 'string' } },
  },
}

export const PetSchema = () => <JsonSchemaViewer schema={schema} />
```

Only the package root and `dist/style.css` are public entry points — do not import internal module
paths.

## Preparing documents

Viewers render documents that are **already prepared**; they do not fetch, parse, or diff anything
themselves. Prepare documents in your data layer (or backend), not in render code.

**Plain viewers** take a document with references resolved — the output of `normalize` followed by
`denormalize`:

```ts
import { denormalize, normalize, type NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'

const options: NormalizeOptions = { source: document, unify: true, validate: true, liftCombiners: true }
const prepared = denormalize(normalize(document, options), options)
```

**Diffs viewers** take the **merged document** that `apiDiff` builds from two versions. Diffs are
stored on the merged document under a symbol meta key; pass the same symbol to the viewer through
`DiffMetaKeys`:

```ts
import { apiDiff, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import type { DiffMetaKeys } from '@netcracker/qubership-apihub-api-doc-viewer'

const mergedDocument = apiDiff(beforeDocument, afterDocument, {
  beforeSource: beforeDocument,
  afterSource: afterDocument,
  metaKey: DIFF_META_KEY,
  unify: true,
  validate: true,
  liftCombiners: true,
}).merged

const diffMetaKeys: DiffMetaKeys = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}
```

> A `diffsMetaKey` that differs from the `metaKey` passed to `apiDiff` renders the document with
> **no** diff highlights and no error. Use the same symbol instances on both sides.

## Common props

Props shared by most viewers. Each component section lists which ones it accepts.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `displayMode` | `'simple' \| 'detailed'` | `'detailed'` | `simple` shows names and types only; `detailed` shows descriptions, validations, examples, and the rest |
| `expandedDepth` | `number` | `2` | Number of tree levels expanded initially |
| `noHeading` | `boolean` | `false` | Hides the viewer's own title row, for hosts that render their own heading |
| `devMode` | `boolean` | `false` | Logs tree-building diagnostics to the browser console |
| `diffMetaKeys` | `DiffMetaKeys` | — | **Diffs viewers, required.** Meta keys the merged document was built with |
| `diffTypes` | `DiffType[]` | — | **Diffs viewers.** Reserved for filtering diffs by severity; accepted but not applied yet |

Every viewer renders nothing when its document prop is `null`, and shows an inline error message
instead of crashing the host page when rendering fails.

## Styling

The stylesheet is isolated from the host application:

- **Every class is prefixed.** The viewers render classes such as `api-doc-viewer-flex` and
  `api-doc-viewer-selected`, and `dist/style.css` only contains selectors for those names, so it
  cannot restyle host elements that use common class names (`flex`, `selected`), and host classes
  cannot restyle the viewers.
- **No global rules.** The CSS reset and element defaults (`ul`, `a`, `button`, `h1`, CSS variables)
  apply only inside a viewer's root element, `.api-doc-viewer-root`. The host page, its `body`, and
  its buttons and links are not touched. Host element rules (for example a global `button { … }`)
  can still reach elements inside a viewer when they come later in the cascade.
- **Own font names.** The bundled Inter and Fira Code faces are registered as
  `"api-doc-viewer Inter"`, `"api-doc-viewer Fire Code"`, and so on, so they never replace or merge
  with the host's fonts of the same name.

To adjust a viewer's look from the host, target the prefixed classes inside
`.api-doc-viewer-root`. These class names are an implementation detail and may change between
releases.

A custom `navigationLinkComponent` receives a `className` that is already prefixed — pass it to the
rendered element unchanged.

## Components

### JsonSchemaViewer / JsonSchemaDiffsViewer

Renders one JSON Schema as a property tree: types, formats, validations, combiners (`oneOf`,
`anyOf`, `allOf`), `additionalProperties`, `patternProperties`, circular references, and `x-*`
extensions. Deep subtrees are built lazily on expand, so large schemas stay responsive.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `schema` | `unknown` | yes | Prepared JSON Schema; for `JsonSchemaDiffsViewer`, the merged schema |
| `expandedDepth` | `number` | no | See [Common props](#common-props). **Default:** `2` |
| `displayMode` | `DisplayMode` | no | See [Common props](#common-props) |
| `devMode` | `boolean` | no | See [Common props](#common-props) |
| `initialLevel` | `number` | no | Nesting level of the root row when the viewer is embedded into another viewer. **Default:** `0` |
| `customizationOptions` | `CustomizationOptions` | no | `headerRowTitle` replaces the root title; `suppressRootNestingIndicator` renders a wrapper object's properties as a flat top-level list |
| `topLevelPropsMediaTypes` | `TopLevelPropsMediaTypesMap` | no | **Plain only.** Root property key → media type, shown as a badge next to the property name |
| `firstRowPrecededBy` | — | no | Internal spacing hook used when the library embeds this viewer in another one; hosts omit it |

`JsonSchemaDiffsViewer` additionally accepts:

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `diffMetaKeys` | `DiffMetaKeys` | yes | See [Preparing documents](#preparing-documents) |
| `diffTypes` | `DiffType[]` | no | Accepted, not applied yet |
| `hideUnchangedNodes` | `boolean` | no | Collapses runs of unchanged properties behind a "Show N unchanged nodes" row. **Default:** `true` |

```tsx
<JsonSchemaViewer schema={schema} expandedDepth={3} displayMode="detailed" />
```

`apiDiff` compares whole documents, so a schema is usually diffed inside its enclosing document (for
example an OpenAPI document) and then taken from the merged result:

```tsx
const merged = apiDiff(beforeOpenApi, afterOpenApi, {
  beforeSource: beforeOpenApi,
  afterSource: afterOpenApi,
  metaKey: DIFF_META_KEY,
  unify: true,
}).merged as any

<JsonSchemaDiffsViewer
  schema={merged.components.schemas.Pet}
  diffMetaKeys={diffMetaKeys}
  hideUnchangedNodes={false}
/>
```

### OpenApiOperationViewer / OpenApiOperationDiffsViewer

Renders one OpenAPI 3.0.x / 3.1.x operation: title, method and path, security requirements,
parameters, request body (with a media-type selector), responses (with response-code and media-type
selectors), and extensions. Schemas inside the operation are rendered with the JSON Schema viewer.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `unknown` | yes | **Plain.** Prepared OpenAPI document (`normalize` + `denormalize`, `components` kept) |
| `mergedSource` | `unknown` | yes | **Diffs.** `apiDiff` merged document of two whole OpenAPI documents (`components` kept) |
| `operationKeys` | `OpenApiOperationKeys` | no | `path` is the `paths` key exactly as in the document (e.g. `/pets/{petId}`); `method` is case-insensitive. In a merged document a renamed path is addressed by its **after** key. **Default:** the first operation |
| `expandedDepth` | `number` | no | Forwarded to the nested schema viewers. **Default:** `2` |
| `displayMode`, `devMode`, `noHeading` | | no | See [Common props](#common-props) |
| `diffMetaKeys` | `DiffMetaKeys` | **Diffs**, yes | See [Preparing documents](#preparing-documents) |
| `diffTypes` | `DiffType[]` | no | **Diffs.** Accepted, not applied yet |
| `hideUnchangedNodes` | `boolean` | no | **Diffs.** Collapses unchanged schema properties; a security scheme without changes shows only its title row. **Default:** `true` |

```tsx
<OpenApiOperationViewer
  source={preparedOpenApi}
  operationKeys={{ path: '/pets/{petId}', method: 'get' }}
/>

<OpenApiOperationDiffsViewer
  mergedSource={mergedOpenApi}
  operationKeys={{ path: '/pets/{petId}', method: 'get' }}
  diffMetaKeys={diffMetaKeys}
/>
```

### AsyncApiOperationViewer / AsyncApiOperationDiffsViewer

Renders one AsyncAPI 3.0 operation together with one of its messages: message headers and payload
(as JSON Schema), channel, operation, bindings, and extensions.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `unknown` | yes | **Plain.** Prepared AsyncAPI 3.0 document |
| `mergedSource` | `unknown` | yes | **Diffs.** `apiDiff` merged document of two AsyncAPI documents |
| `referenceNamePropertyKey` | `symbol` | yes | The symbol passed as `firstReferenceKeyProperty` to `normalize` / `apiDiff`; the viewer uses it to read message keys behind resolved `$ref`s |
| `operationKeys` | `AsyncApiOperationKeys` | no | Operation key under `operations` and message key of that operation. **Default:** the first operation and its first message |
| `displayMode`, `devMode`, `noHeading` | | no | See [Common props](#common-props) |
| `diffMetaKeys` | `DiffMetaKeys` | **Diffs**, yes | See [Preparing documents](#preparing-documents) |
| `diffTypes` | `DiffType[]` | no | **Diffs.** Accepted, not applied yet |

`referenceNamePropertyKey` must be the **same symbol instance** used during preparation:

```tsx
const REFERENCE_NAME = Symbol('reference-name') // share one instance across your app

const options = {
  source: document,
  firstReferenceKeyProperty: REFERENCE_NAME,
  unify: true,
  validate: true,
  liftCombiners: true,
}
const prepared = denormalize(normalize(document, options), options)

<AsyncApiOperationViewer
  source={prepared}
  referenceNamePropertyKey={REFERENCE_NAME}
  operationKeys={{ operationKey: 'send-order', messageKey: 'order-created' }}
/>
```

For the diffs viewer, pass the same `firstReferenceKeyProperty` to `apiDiff`.

### DdlTableViewer / DdlTableDiffsViewer

Renders one PostgreSQL table from a ddlapi `Realm`: columns (types, defaults, constraints,
generated expressions), indexes, and foreign keys as navigation links to the referenced tables.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `Realm` | yes | **Plain.** Realm built with `buildFromDdl` |
| `mergedSource` | `Realm` | yes | **Diffs.** `apiDiff` merged Realm of two versions |
| `tableKey` | `TableKey` | yes | Table to render, e.g. `{ schemaName: 'public', name: 'orders' }` |
| `navigationLinkBuilder` | `NavigationLinkBuilder` | yes | `(schema, table, column) => string` — builds the URL of a foreign-key target |
| `navigationLinkComponent` | `NavigationLinkComponent` | no | Renders foreign-key links; receives `{ href, className, children }`; apply `className` unchanged. **Default:** a plain `<a href>` |
| `displayMode`, `devMode`, `noHeading` | | no | See [Common props](#common-props) |
| `diffMetaKeys` | `DiffMetaKeys` | **Diffs**, yes | See [Preparing documents](#preparing-documents) |
| `diffTypes` | `DiffType[]` | no | **Diffs.** Accepted, not applied yet |

```tsx
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import {
  DdlTableViewer,
  type NavigationLinkBuilder,
  type NavigationLinkComponent,
} from '@netcracker/qubership-apihub-api-doc-viewer'

const realm = await buildFromDdl(sql)

const navigationLinkBuilder: NavigationLinkBuilder = (schema, table) => `/tables/${schema}.${table}`

// Optional: route foreign-key links through the host router instead of full page loads
const RouterNavigationLink: NavigationLinkComponent = ({ href, className, children }) => (
  <Link to={href} className={className}>{children}</Link>
)

<DdlTableViewer
  source={realm}
  tableKey={{ schemaName: 'public', name: 'orders' }}
  navigationLinkBuilder={navigationLinkBuilder}
  navigationLinkComponent={RouterNavigationLink}
/>
```

Merged Realms for `DdlTableDiffsViewer` come from `apiDiff(beforeRealm, afterRealm, { metaKey,
unify: true, validate: true, normalizedResult: false }).merged`.

### GraphQLOperationViewer / GraphQLOperationDiffViewer (legacy)

Renders one GraphQL operation with its arguments, output type, and referenced types. These viewers
are maintained for compatibility and receive no new features.

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `unknown` | yes | Prepared GraphAPI schema; for the diff viewer, the `apiDiff` merged GraphAPI schema |
| `operationType` | `string` | no | `'query'`, `'mutation'`, or `'subscription'` |
| `operationName` | `string` | no | Operation name, e.g. `getFruit` |
| `expandedDepth` | `number` | no | **Default:** `2` |
| `displayMode` | `DisplayMode` | no | See [Common props](#common-props) |
| `metaKeys` | `DiffMetaKeys` | **Diff**, yes | Note the name: `metaKeys`, not `diffMetaKeys` |
| `layoutMode` | `LayoutMode` | no | **Diff.** `DOCUMENT_LAYOUT_MODE`, `INLINE_DIFFS_LAYOUT_MODE`, or `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE`. **Default:** `'document'` |
| `filters` | `DiffType[]` | no | **Diff.** Diff severities filter. **Default:** `[]` |

```tsx
import { buildSchema } from 'graphql'
import { buildFromSchema } from '@netcracker/qubership-apihub-graphapi'

const graphApi = buildFromSchema(buildSchema(sdl, { noLocation: true }))
const options = { unify: true, validate: true, liftCombiners: true }
const prepared = denormalize(normalize(graphApi, options), options)

<GraphQLOperationViewer source={prepared} operationType="mutation" operationName="createEntity" />
```

## Other exports

| Export | Kind | Description |
| --- | --- | --- |
| `<Viewer>Props` (e.g. `JsonSchemaViewerProps`) | type | Props type of every component above |
| `DisplayMode`, `SIMPLE_DISPLAY_MODE`, `DETAILED_DISPLAY_MODE` | type, constants | Values of `displayMode` |
| `LayoutMode`, `DOCUMENT_LAYOUT_MODE`, `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE`, `INLINE_DIFFS_LAYOUT_MODE` | type, constants | Values of `layoutMode` (legacy GraphQL diff viewer; the other diffs viewers are always side by side) |
| `DiffMetaKeys` | type | `{ diffsMetaKey: symbol, aggregatedDiffsMetaKey: symbol }` |
| `CustomizationOptions` | type | `{ headerRowTitle?: string, suppressRootNestingIndicator?: boolean }` — JSON Schema viewers |
| `TopLevelPropsMediaTypesMap` | type | `Record<string, string>` — root property key → media type, `JsonSchemaViewer` |
| `OpenApiOperationKeys` | type | `{ path: string, method: string }` — OpenAPI viewers |
| `AsyncApiOperationKeys` | type | `{ operationKey: string, messageKey: string }` — AsyncAPI viewers |
| `TableKey` | type | `{ schemaName: string, name: string }` — DDL viewers |
| `NavigationLinkBuilder` | type | `(schema: string, table: string, column: string) => string` |
| `NavigationLinkComponent`, `NavigationLinkProps` | type | Foreign-key link renderer and its props `{ href, className?, children }` |
| `buildDiffCauseByPathCausedAt` | function | `(path: JsonPath \| undefined) => string \| undefined` — formats `caused by <path> change` for a change caused at `path`; `undefined` for an empty or missing path |
| `buildOpenApiDiffCause` | function | *Deprecated — use `buildDiffCauseByPathCausedAt`.* Formats `caused by components.… change` from an `apiDiff` `Diff`'s declaration paths |

## Development

The module is a pnpm workspace with these packages:

| Package | Path | Role |
|---------|------|------|
| `api-doc-viewer` | `packages/api-doc-viewer/` | The published React viewers (this README) |
| `next-data-model` | `packages/next-data-model/` | Tree builders, crawl rules, diff aggregators |
| `api-data-model`, `api-state-model` | `packages/` | Legacy GraphQL data model and state |
| `samples` | `packages/samples/` | Fixtures for stories and screenshot tests; see [packages/samples/README.md](packages/samples/README.md) |

The libraries read no configuration file; the viewer components take their settings as properties.

### Build, test, and lint

The Nx projects are `api-doc-viewer`, `api-doc-viewer-next-data-model`, `api-doc-viewer-samples`,
`api-doc-viewer-api-data-model`, `api-doc-viewer-api-state-model`, and `api-doc-viewer-root`. Run from the
repository root:

```bash
pnpm exec nx run api-doc-viewer:build
pnpm exec nx run api-doc-viewer:test
pnpm exec nx run api-doc-viewer-next-data-model:test
pnpm exec nx run api-doc-viewer-root:lint:check
pnpm exec nx run api-doc-viewer:screenshot-test
```

The screenshot tests start Chrome in a container and need Podman, Docker, or `wslc` on Windows; see
[Build and test: Screenshot tests](../../docs/development/build-and-test.md#screenshot-tests).

### Run and debug locally

The viewers run in Storybook. From `packages/api-doc-viewer`, `pnpm development:storybook` starts it on port 9099.
Build the static Storybook the way CI does with `pnpm exec nx run-many -t build:showcase -p api-doc-viewer`. CI
publishes the [Storybook of every branch](https://netcracker.github.io/qubership-apihub/storybook/) on GitHub Pages.
Details: [Debugging: Storybook](../../docs/development/debugging.md#storybook).

### Further reading

- [Design documents](docs/design/README.md): the source of truth per API type, with display coverage, architecture,
  entities, and features
- [Fixture catalog](packages/samples/README.md)

## License

[Apache License 2.0](LICENSE)
