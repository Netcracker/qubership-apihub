# TODO: workarounds in the legacy OpenAPI compatibility-suite code (2026-10-29)

Collected while porting the OpenAPI compatibility suite from `qubership-apihub-apispec-view`
(`develop`, `8df1741`) to api-doc-viewer ([../features/compatibility-suite.md](../features/compatibility-suite.md)).
**Not fixed** on purpose. The port reuses api-doc-viewer's own merge (`mergeOpenApiDocuments`) and
IT services, so the files marked "not ported" carry no workaround into this repository; they are
listed because they define the legacy stories' behaviour.

| # | Where (apispec-view, `packages/elements/`) | Workaround | Ported? |
| --- | --- | --- | --- |
| 1 | `src/web-components/__stories__/helpers/getMergedDocument.ts:54` (`onMergeError`) | `values: any[]` callback parameter | no |
| 2 | same, `:62` (`onUnifyError`), `:71` (`onValidateError`) | `value: any` callback parameters | no |
| 3 | same, `:91`–`:92` (`removeComponents`) | `// eslint-disable-next-line @typescript-eslint/no-unused-vars` plus `// @ts-ignore` on `const { components, ...rest } = source` (`source` is `object`) | no |
| 4 | same, `:111` (`getCopyWithEmptyPaths`) | `document as any` | no |
| 5 | same, `getCompareResult` / `normalizeOpenApiDocument` | `merged.toJSON = () => stringifyCyclicJso(merged)` monkey-patch "to avoid circular serializing in storybook" | no |
| 6 | same, `getCompareResult` | `COMPARE_MODE_DEFAULT` "we do not really have guarantee that we have specs with single operation" (the cases do: see the design, "Operation") | no |
| 7 | `bin/generate-openapi-compatibility-suite-stories.mjs` (generated story header) | `import { Meta, StoryObj } from '@storybook/react/*'` — a wildcard sub-path import of types | no (api-doc-viewer imports `@storybook/react-vite`) |
| 8 | `src/web-components/__stories__/helpers/compatibility-suite-utils.tsx` (`StoryComponent`) | font loading: `Promise.all(…).then(setFontLoaded)` started in the render body on every render (no effect), plus `console.log(stringifyDiffs(diffs))` in render | **yes** — api-doc-viewer's `useFontLoaded` (`src/stories/utils/compatibility-suite-utils.tsx`), shared by every compatibility story, starts the same promise in the render body; the diff logging is not ported |
| 9 | `bin/compatibility-suite-generation-utils.mjs` | `getCompatibilitySuiteSpecificationVersionPairs` is called for every case, then the pair is always passed to `getCompatibilitySuite`, including cases without `metadata.yaml` (the API returns those as-is) | yes, same behaviour (harmless) |

Related, already in api-doc-viewer (not from the port): `src/stories/utils/compatibility-suite-utils.tsx`
`printDiffs` casts `{ ...diff } as DiffReplace` (`// TODO 14.10.25`).
