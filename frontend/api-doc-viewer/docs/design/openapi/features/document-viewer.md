# OpenAPI document viewer and portable bundle

Status: **planned** (recorded 2026-11-06, not started). This file is the TODO for replacing the legacy
`<apispec-view>` web component of [`frontend/apispec-view`](../../../../../apispec-view/README.md) with
`api-doc-viewer`. It lists what depends on `<apispec-view>`, what `api-doc-viewer` lacks, the open questions, and
the steps. The first step turns it into a design.

`apispec-view` is a Stoplight fork that is no longer developed. Do not extend it or fix it to close these gaps: build
the replacement here.

## What depends on `<apispec-view>`

`<apispec-view>` is the only viewer that renders a whole OpenAPI document, and the only one shipped as a
self-contained script. Single operations and comparisons already use [`OpenApiOperationViewer` and
`OpenApiOperationDiffsViewer`](operation-viewer.md).

| Consumer | How it loads the viewer | Element properties it sets |
| --- | --- | --- |
| Portal document preview (Documents tab), specification dialog of the Portal and Agents | `ui` imports the package and creates `<apispec-view>` (`ui/packages/shared/src/components/ApispecView/`) | `apiDescriptionDocument`, `router="hash"`, `layout` (`sidebar`, `partial`), `selectedNodeUri`, `searchPhrase`, `schemaViewMode`, `hideTryIt`, `proxyServer` (Agents calls services through the proxy) |
| Pages that users embed with the Portal "Copy page template" action | `<script src="<host>/portal/apispec-view/index.js">`; the Portal build copies the bundle there | `apiDescriptionUrl`, `router="hash"`, `layout="stacked"`, `hideExport` |
| Interactive HTML export (builder) | `api-processor` inlines `build-task-consumer/src/templates/scripts/apispec-view.js` into each exported page | `apiDescriptionDocument`, `router="hash"`, `layout="sidebar"`, `hideExport` |
| Deprecated `portal-backend` endpoints `/api/v2/packages/{packageId}/versions/{version}/doc` and `/files/{slug}/doc` with `docType=INTERACTIVE` | `backend/portal-backend/static/templates/scripts/apispec-view.js` | the same as the export |

The export and backend scripts are prebuilt bundles from June 2025, not built from the workspace. That is accepted
while `apispec-view` does not change.

## Gaps in `api-doc-viewer`

1. **No whole-document viewer.** `OpenApiOperationViewer` renders one operation of a normalized document (`api-unifier`
   `normalize` and `denormalize`), selected by `{ path, method }`. Navigation, the document overview, models, deep
   links, and search do not exist.
2. **No portable distribution.** The package is an ES module library with `react` and `react-dom` as peer
   dependencies and a separate `dist/style.css`. A host has to bundle it, so it cannot be loaded with a `<script>`
   tag or inlined into an offline HTML page.

## Goal

`api-doc-viewer` renders a whole OpenAPI document both as a React component for `ui` and as a portable bundle for the
embed snippet and the HTML export. Then nothing in the product needs `apispec-view`, and the module is deleted.

## Open questions

The design step answers these.

| Id | Question | Notes |
| --- | --- | --- |
| Q1 | Layout and navigation: how are operations grouped (tags, paths), what does the overview show (info, servers, security), and how are models from `components` listed? | `<apispec-view>` has the `sidebar`, `stacked`, and `partial` layouts; `ui` uses `sidebar` and `partial`, the embed snippet `stacked`. |
| Q2 | Deep links and routing: hash router, the equivalent of `selectedNodeUri`, and the links that the Portal preview and already embedded pages use. | Existing embedded pages must keep working. |
| Q3 | Search highlighting (`searchPhrase`) and the schema view mode (`simple`, `detailed`). | The display mode of the operation viewer is the likely mapping for the view mode. |
| Q4 | Try It: reuse `rest-playground`, leave it out of the first version, or keep `<apispec-view>` for the Agents specification dialog until it exists? | Agents sends Try It requests through `proxyServer`. |
| Q5 | Input: the document as text, as an object, or as a URL; JSON or YAML; which OpenAPI versions; where normalization runs. | The viewers take OpenAPI 3.0 and 3.1, so 2.0 has to be converted. |
| Q6 | Element contract: keep the `<apispec-view>` tag name and properties, so that embedded pages and export templates work unchanged, or define a new element and keep `/portal/apispec-view/index.js` working for existing embedded pages? | |
| Q7 | Style isolation of the bundle: is [CSS isolation](../../shared/features/css-isolation.md) enough on a host page, or does the element also need a shadow root? | Tailwind preflight is already scoped to the viewer root. |
| Q8 | The deprecated `portal-backend` interactive endpoints: switch them to the new bundle, or remove `docType=INTERACTIVE`? | Removing it changes a REST API: spec, docs, and Postman E2E. |

## Steps

Each step can be its own pull request. Step 1 follows the [design workflow](../../README.md#workflow).

| Step | Work | Status | Exit criterion |
| --- | --- | --- | --- |
| 1 | Design: answer Q1–Q8 in this file, add the entities and the coverage rows. | planned | Questions answered; status of this file changes to a design. |
| 2 | React component (name to be decided, for example `OpenApiDocumentViewer`) with fixtures, stories, and screenshot ITs. | planned | Screenshot ITs green for OpenAPI 2.0, 3.0, and 3.1 documents. |
| 3 | `ui`: the Portal document preview and the specification dialog use the component instead of the `ApispecView` wrapper; `tests/ui-tests` `ApiSpecView` locates the new viewer. | planned | `ui` no longer imports `apispec-view`. |
| 4 | Portable bundle: a second build of `api-doc-viewer` that registers a custom element and bundles React and the styles in one script. The Portal build and the builder copy it from the build output; no copy is committed. | planned | The bundle renders a document on a plain HTML page and offline when inlined. |
| 5 | Retirement: the embed snippet and the export templates load the new bundle; Q8 is carried out; `frontend/apispec-view` is deleted. | planned | No build reads `frontend/apispec-view`; pages embedded with an earlier snippet still render. |

## Out of scope

- AsyncAPI, GraphQL, and DDL documents. The bundle can grow to them later; `<apispec-view>` never rendered them in
  these places.
