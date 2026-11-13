# Operation

The root of the viewer: operation lookup, the header rows (title, address, external docs,
description), and the **Extensions** section. Status: **implemented** (first iteration; deviations in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)).

## Lookup (`OpenApiSpecTransformer.resolveOperation`)

| Step | Rule |
| --- | --- |
| 1 | `source` must be an object with a string `openapi` field; the dialect is resolved from it ([../features/oas-versions.md](../features/oas-versions.md#dialect-resolution)). Otherwise: log, return `null`. |
| 2 | Keys: `operationKeys ?? defaults` ([../features/operation-viewer.md](../features/operation-viewer.md#public-api)). `method` is lower-cased before lookup. |
| 3 | `pathItem = source.paths?.[path]`; `operation = pathItem?.[method]`. No match: log `Cannot find operation <METHOD> <path>`, return `null`. |
| 4 | Path-item `$ref` and `components.pathItems` (OAS 3.1) are already resolved by `api-unifier`; path-item `parameters`, `servers`, `summary`, `description` are already merged into the operation (E11). The transformer reads the operation object only. |

The transformer never walks other operations; nothing outside `paths[path][method]`, root
`security`, and `components.securitySchemes` is read.

## Node

Kind `operation` — the tree root, a simple node.

```typescript
// model/openapi/types/node-value.ts
export interface OpenApiTreeNodeValueTypeOperation {
  readonly path: string
  readonly method: OpenApiHttpMethod            // lower case
  readonly specVersion: OpenApiSpecVersion      // 'openapi-3.0' | 'openapi-3.1' (api-unifier)
  readonly title?: string                       // summary
  readonly operationId?: string
  readonly description?: string
  readonly externalDocs?: OpenApiExternalDocs   // { url: string; description?: string }
  readonly deprecated?: boolean                 // tag in the title subheader
}
```

## Title row

| Item | Rule |
| --- | --- |
| Component | `TitleRow`, `variant={TextValueVariant.h1}`, `expandable={false}`; spacing from the header block's one pass ([Spacing](../features/operation-viewer.md#spacing-data-precededby)) |
| Text | `title` (operation `summary`) — **no fallback** (Q10) |
| Shown when | `summary` exists (diffs: on either side, or a `title` diff exists) and not `noHeading` |
| Subheader | **deprecated** tag when `deprecated === true` (below) |
| Diff (diffs viewer) | `summary` diff on `title` key → `TitleRow` `diff`; severity `TitleRow`. A whole-operation add / remove paints the row through the node-level diff. A `deprecated` change paints the row as a synthetic yellow replace (JSON Schema meta-flag rule). |

## Operation ID row

Secondary information directly under the title (Q10): the bare value, **no label** (the
`Operation ID:` label was removed on 2026-11-03).

```text
Upload a photo of a pet                    h1
uploadPetPhoto                             operation ID row (small, grey)
[POST] /pets/{petId}/photos                address row
```

| Item | Rule |
| --- | --- |
| Component | `TextRow`, `variant={TextValueVariant.body2}` — small and muted, never a heading. Only the `value` prop; no `label`. |
| Value | `operationId` as is; `textFontWeight='normal'`, `textColor` = secondary grey (`TextColors.SECONDARY`, `#626D82`, the address-row text color) |
| Shown when | `operationId` exists (diffs: on either side, or an `operationId` diff exists). Independent of the title row: `noHeading` and a missing `summary` hide the title only. |
| Spacing | each header row (title, operation ID, address, description, external docs) is its own element of the `operationHeader` level (level gap 0: 8px apart); the rows have no vertical padding (`PrecededBy.SEPARATOR_LAYOUT_ROW`), every gap is a separator row ([vertical-gaps.md](../features/vertical-gaps.md)) |
| Diff | `operationId` key → row `diff`; severity: new placement `OperationIdRow`. The row background follows the diff (green / red / yellow). On a replace the value gets the yellow text highlighter. On add / remove the side where `operationId` does not exist renders **no text** (`TextValue` returns `null` for an invisible side). |

## Deprecated tag

| Item | Rule |
| --- | --- |
| Where | title-row subheader, `TagsWithDiffs` with the single tag `deprecated` (`UxBadge` kind `tag-amber`, as JSON Schema) |
| No title row | the tag moves to the operation ID row, after the value (`TextRow` `trailing` slot); without an operation ID too, to the address row, after the path (`AddressRow` `trailing` slot). The host row is `OpenApiOperationRowVisibility.deprecatedTagRow` (`title` / `operationId` / `address`) |
| Plain | shown when `deprecated === true` |
| Diffs | shown on a side where `deprecated` is `true` or where it has its own diff; highlighted only by its own diff (JSON Schema "Flag tags" rule); a wholly added / removed operation shows a plain tag. A `deprecated` change paints the **host row** with a synthetic yellow `replace` (no text highlighter; built from a value-less copy so both sides keep their text) when the row has no diff of its own, and its severity joins the host row's floating badge: the severities aggregator writes a merged placement per candidate host (`TitleRow`, `OperationIdRowWithDeprecatedTag`, `AddressRowWithDeprecatedTag`) and the viewer reads the one `OpenApiRowDiffs.Operation.resolveOperationIdRowSeverityPlacement` / `resolveAddressRowSeverityPlacement` returns |

## Address row

Shared `AddressRow` (moved from `AsyncApiOperationViewer/AddressRow/` to
`shared-components/AddressRow/`, D9).

```typescript
export type AddressRowBadge = {
  text: string            // 'POST', 'SEND', …
  colorClass: string      // tailwind background class
}

export type AddressRowProps = WithPrecededByProps & {
  badge: AddressRowBadge | null
  address: string
  /** Content after the address, per side (OpenAPI: the deprecated tag when there is no title row). */
  trailing?: (layoutSide: LayoutSide) => ReactElement | null
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
}
```

Behaviour is unchanged from AsyncAPI: the badge is hidden on the side where a whole-node add /
remove does not exist; a `replace` of `address` with a common prefix highlights only the differing
suffix (`detectPartialReplaceCase`). AsyncAPI passes `resolveAsyncApiActionBadge(action)` (`utils/async-api/action-badge-config.ts`); its
screenshot ITs must stay unchanged after the move.

| Item | Rule |
| --- | --- |
| Badge text | `method.toUpperCase()` |
| Address text | `path` exactly as in the document (`/pets/{petId}/photos`); server URLs are not prefixed (`servers` is out of v1 scope). |
| Diff | `address` key of the operation node. The with-diffs transformer converts the `paths` **rename** diff (`beforeKey` → `afterKey`) into a `replace` with `beforeValue = beforeKey`, `afterValue = afterKey`, so the existing partial-replace highlighting works ([../features/diffs.md](../features/diffs.md#operation)). Severity `AddressRow`. |
| Long address | The grey container hugs its content but never grows past its side (row padding included: 32px between the two sides' containers). When the value does not fit on one line, **only the address value** shrinks in proportion, from 18px down to 12px; the badge and the trailing content keep their size. Both sides use the same size: the smaller of the two sides' fitted sizes. Still too long at 12px: the value wraps (break opportunities after every `/`, line height 1.25). Sizes and rules: `utils/common/address-value-fit.ts` (`ADDRESS_VALUE_FONT_SIZE`, `AddressValueFit`); `AddressRow` measures each side (a hidden one-line probe at 18px against the width left in the row) with a `ResizeObserver`. Applies to the AsyncAPI address rows too (shared component). Fixtures: operation `25-long-path-summary-changed` (shrinks), `26-very-long-path-summary-changed` (wraps). |

### HTTP method badge config

One exported config map (D13, Q9) in `packages/api-doc-viewer/src/utils/openapi/http-method-badge-config.ts`
maps a method to a class; `resolveHttpMethodBadge(method)` reads it and falls back to `DEFAULT` for an
unknown method. The colors live in `components/shared-styles/colors/openapi.css`
([../../shared/features/color-config.md](../../shared/features/color-config.md)); changing a color is
a one-line edit there, and no component holds method colors.

```typescript
export const OPENAPI_HTTP_METHOD_BADGE_CONFIG: Readonly<Record<OpenApiHttpMethod | 'DEFAULT', { colorClass: string }>> = {
  get:     { colorClass: 'openapi-http-method-badge_get' },
  post:    { colorClass: 'openapi-http-method-badge_post' },
  // … one class per method …
  DEFAULT: { colorClass: 'openapi-http-method-badge_default' },
}
```

| Method | Background (text is white `#FFF` for all) |
| --- | --- |
| GET | `#00BB5B` |
| POST | `#4FC0F8` |
| PUT, PATCH | `#FFB02E` |
| DELETE | `#FF5260` |
| HEAD | `#A855F7` |
| OPTIONS | `#6366F1` |
| TRACE, unknown | `#64748B` |

A host-level override prop is not part of v1; the color file is the extension point.

## External docs row

New shared component `shared-components/ExternalDocsRow/ExternalDocsRow.tsx` — generic, usable by
AsyncAPI later (AsyncAPI objects have `externalDocs` too). The row is **one link** with a static
text; the URL is never shown as text, and `externalDocs.description` lives in a hover tooltip.

```text
View external documentation ↗            ← link; hover shows the description in a UxTooltip
```

### Props

```typescript
export type ExternalDocsRowProps = WithPrecededByProps & {
  /** Per side: the url and description of that side (diff-aware, resolved in next-data-model). */
  resolveSide: (layoutSide: LayoutSide) => { url: string; description?: string } | null
  diff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
}
```

`resolveSide` is fed by `OpenApiRowDiffs.Operation.resolveExternalDocsSide(node, side)`; `null`
means "no external docs on this side" (nothing rendered on that side).

### Plain

| Item | Rule |
| --- | --- |
| Shown when | `externalDocs.url` is a non-empty string, in `detailed` mode only: `simple` hides the row as an annotation ([display-mode-annotations.md](../../shared/features/display-mode-annotations.md)) |
| Element | `<a href={url} target="_blank" rel="noopener noreferrer">` — a real link, keyboard-focusable |
| Link text | static **`View external documentation`** (constant `EXTERNAL_DOCS_LINK_TEXT` in the component), never the URL or the description |
| Arrow | an up-right arrow icon **after** the text, inside the link (so it is clickable too): new `kit/icons/ArrowUpRightIcon.tsx`, same shape as the existing `ArrowRightIcon` / `ArrowUpIcon` (inline SVG, `currentColor`, ~12px, `aria-hidden="true"`), small gap before it |
| Description | when `externalDocs.description` is non-empty, the link is wrapped in `UxTooltip` (`kit/ux/UxTooltip`) with `text={description}` — shown on hover. No description → no tooltip wrapper. The description is CommonMark in the specification but `UxTooltip` takes plain `text: string`: render it as plain text (Markdown source as is). |
| Accessibility | no `title` attribute (it would show a second, native tooltip); when a description exists, set `aria-label` to `View external documentation: <description>` so screen readers get the hover-only text |
| Typography | body2, link color, underline on hover; same horizontal padding as `AddressRow` (`X_AXIS_PADDING_ROWS`) |
| Layout | `OneSideLayout` / `SideBySideLayout` + `DiffFloatingBadgeWrapper`, like `AddressRow`; the row content div carries `flex w-full` (width contract, `api-doc-viewer-authoring`) |

**`UxTooltip` constraint.** Its popup is `w-max` with no wrapping, positioned to the right of the
child. A long description becomes one very long line that can overflow the viewer. Before
implementation, give `UxTooltip` an optional max width with wrapping (e.g. a `maxWidthClass` prop,
default unchanged so existing tooltips do not move) and use it here.

### With diffs

| Diff | Row | Link | Tooltip |
| --- | --- | --- | --- |
| `externalDocs` added / removed (whole object) | green / red background | rendered only on the side where it exists | that side's description |
| `externalDocs.url` replaced | yellow background | yellow text highlighter on the static text; each side's link points to **its own** URL (`href` = before URL on the origin side, after URL on the changed side) | unchanged |
| `externalDocs.description` added / removed / replaced | yellow background (Q16, option A) | yellow text highlighter on the static text | each side shows its own description |

Severity: new placement `ExternalDocsRow`, built from the same diff that colors the row. Because
the link text is static, a URL change is visible only through the highlight and the per-side
`href`.

### Q16 — description diffs (decided 2026-10-15: option A)

How to show a change of `externalDocs.description` when the description is only visible on hover.
**Decision: option A** — the row is painted with `diff replace` (yellow background) and the static
link text gets the yellow text highlighter; each side's tooltip shows that side's description; the
`ExternalDocsRow` floating badge appears. Candidates that were considered:

| Option | Idea | Trade-off |
| --- | --- | --- |
| A | Each side's tooltip shows that side's description; the row is painted (yellow on replace, green / red on add / remove of the description) and the floating badge appears | Simple; the change is announced by the row color, but *what* changed is visible only by hovering both sides |
| B | As A, plus the tooltip text itself carries diff styling (yellow highlighter on replace; the tooltip of the side without a description is absent) | Needs `UxTooltip` to accept styled content (today `text: string`) |
| C | As A, plus a small change marker (round dot, `UxDiffMarker` style) next to the arrow, meaning "the hidden description changed" | Makes a hover-only change discoverable without hovering; one more visual element |
| D | In the diffs viewer only, show the description as a visible secondary text row under the link (with normal text diffs); plain mode keeps the tooltip | Most explicit; plain and diffs layouts differ |

B–D stay possible refinements on top of A.

## Description row

| Item | Rule |
| --- | --- |
| Component | `MarkdownTextRow` (OpenAPI descriptions are CommonMark), `variant=body2`, default usage |
| Position | after the address row, before the external docs row (swapped 2026-10-15) |
| Diff | `description` key; severity `DescriptionRow` (the component default) |

## Extensions section

| Item | Rule |
| --- | --- |
| Source | every `x-*` key of the operation object, copied by the transformer into `data.extensions` (AsyncAPI `copyExtensions`) |
| Node | kind `extensions`, value `{ rawValues }` via the `collectRawValues` crawl transformer |
| Component | shared `ExtensionsSection` (extracted from AsyncAPI `ExtensionsNodeViewer`): `TitleRow` "Extensions" **h2** with `TitleRowUsage.AsyncApiJsoSection`, then `JsoViewer` / `JsoDiffsViewer` over `rawValues`, `initialLevel={1}`. AsyncAPI keeps h3; the heading variant is a prop. |
| Diff | per-key diffs move into `extensions[diffsMetaKey]`; the section header follows the shared colorizing rule ([../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes)) |

**Trap — path-item extensions.** `api-unifier` copies path-item `x-*` keys into each operation
(unless the operation defines the same key), but **only when the path item also declares
`parameters`, `servers`, `summary`, or `description`** (`pathItemsUnification` returns early
otherwise). Both outcomes are correct input for the viewer; tests must not assume either one
without such a path-item field.

## Related documents

- Row stack: [../features/operation-viewer.md](../features/operation-viewer.md#row-stack)
- Diff sources: [../features/diffs.md](../features/diffs.md#operation)
