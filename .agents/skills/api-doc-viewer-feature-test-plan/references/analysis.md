# Analyzing the change and the host app

## What changed

```bash
git diff --stat <base>...HEAD -- frontend/api-doc-viewer frontend/ui
git log --oneline <base>..HEAD
```

Map the changed paths to viewers and API types:

| Changed path | Means |
| --- | --- |
| `packages/api-doc-viewer/src/components/<Viewer>/` | That viewer; its stories and ITs are the catalogue |
| `packages/api-doc-viewer/src/components/shared-components/` | Every viewer that renders the component: regression scope |
| `packages/next-data-model/src/building-service/<api-type>/` | Tree building of that API type; lazy building affects performance |
| `packages/next-data-model/src/.../json-schema/` | JSON Schema everywhere it is embedded (OpenAPI bodies and parameters, AsyncAPI payloads) |
| `src/utils/common/cn.ts`, `postcss/css-isolation.cjs`, global styles | Every viewer and the host app: shared-styles regression |
| `frontend/ui/packages/portal/…` | Host-app glue: how documents reach the viewer, which props it passes |

Find who imports a changed shared module to scope the regression pass:

```bash
grep -rl "<ChangedModule>" frontend/api-doc-viewer/packages/api-doc-viewer/src/components
```

## What the design says

- `docs/design/<api-type>/display-coverage.md`: what is shown and what is intentionally absent. A missing row listed
  there as an intentional gap is not a defect; say so in the case.
- `docs/design/<api-type>/features/*.md` and `entities/*.md`: the rules of each row and of diffs (for example, the
  parameters design compares the two sides of a renamed media type only at the top level).
- The case matrices (`features/plain-case-matrix.md`, `diffs-case-matrix.md`) and the fixture catalogues
  (`packages/samples/*/README.md`) list the cases and their expected effect.

## What the host app lets QA reach

Read how the host app mounts the changed viewers before writing any case. In the portal, start from the operation
view (`OperationView.tsx`, `OperationContent.tsx`), the view-mode constants
(`shared/src/entities/operation-view-mode.ts`), and the comparison flows (`VersionPage/`, `OperationsComparisonPage/`,
`CompareOperationPathsDialog.tsx`). Record:

| Fact to record | Example from the first run |
| --- | --- |
| Which display modes the host offers, plain and in comparisons | Plain: `Doc` (detailed) and `Simple`; comparisons: `Doc` and `Raw` only, so diffs in `simple` cannot be reached |
| Which viewer props the host never sets | `hideUnchangedNodes` is never passed: hiding is always on |
| How the host cuts or rewrites the document | The compared document is cut to one path and one method; other shapes log a warning |
| How operations of two versions are matched | By a normalized ID (base path, path with parameter names wildcarded, method) |
| What the comparison lists | Only changed operations: a case without a change cannot be opened in a comparison |
| What filters do | Severity filters reach the viewer but did not hide OpenAPI rows |
| Where JSON Schema (or another embedded type) shows standalone | The Documents tab, a specification dialog, a schema panel |

Cells the host cannot reach go into the plan README as decisions for the team: add a control to the host, test those
cells elsewhere (a published Storybook), or record them as not tested.
