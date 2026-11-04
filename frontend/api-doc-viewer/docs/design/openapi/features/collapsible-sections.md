# Collapsible 2nd-level sections

Status: **implemented 2026-10-20.**

Every 2nd-level (h3) section of the operation viewer can be collapsed and expanded; all of them are
**expanded by default**.

| Section | Parent | Section node (view-state key) |
| --- | --- | --- |
| Path / Query / Header / Cookie Parameters | Request | `parameters` node |
| Body | Request | `requestBody` node |
| Headers | selected response | `responseHeaders` node |
| Extensions | selected response | response `extensions` node |
| Body | selected response | response `content` node |
| Extensions (Responses Object) | Responses | `responsesExtensions` node |

1st-level (h2) sections — Security, the operation's Extensions, Request, Responses — are not
collapsible.

## Title row

```text
Request                                   h2
›  Path Parameters                        collapsed: the title row only
⌄  Query Parameters                       expanded (default)
   ├─ dryRun  boolean                     content indented past the expander column
   └─ expand  string
⌄  Body*  [application/json] [required]   the subheader (selector, tags) stays on the title row
   New order state.
   └─ Type  object
```

| Item | Rule |
| --- | --- |
| Expander column | `TitleRow` with `usage={TitleRowUsage.CollapsibleSection}`, `expandable`, `expanded`, `onClickExpander`: the default row's `level-indicator-column` with the caret, fixed at `sectionExpander.width` (16px) so the title does not move when the caret icon changes |
| Toggle | the caret and the title text both toggle (`TextValue onClick`; the Body passes it to its custom title) |
| Collapsed | the title row only: description, nested JSON Schema / JSO viewer are not rendered; the subheader (media-type selector, `required` tag) stays |
| Diffs | unchanged: the title row keeps its own diff colouring and badge; a collapsed section shows no change of its content (no marker is added for hidden changes) |

## Content indent

Content elements (the Body description, the nested JSON Schema / JSO viewer) are shifted right by
the expander column plus the title row's gap: `OpenApiSpacing.sectionContentIndent(config)` =
`sectionExpander.width + sectionExpander.gap` = 16 + 8 = **24px**, so they keep their position
relative to the title text.

The shift is a **transparent left border** on every per-side row element inside the content
(`.openapi-section-content .one-side-layout > *`, `.openapi-section-content .side-by-side-layout > div > *`,
`CollapsibleSection.css`), not a padding or a wrapper inset:

- the row's own padding stays as it is (OpenAPI rows `px-4`, JSON Schema / JSO rows their own);
- the diff background is painted under the border (`background-clip: border-box`), so a highlighted
  row still fills its whole side — the full-width row rule;
- floating badges (outside the rows) and separators (no content) do not move.

The viewer root writes `--collapsible-section-expander-width` and `--openapi-section-content-indent`
from the spacing config.

## View state and layout

The collapsed state is one more input of the operation's view-state store
(`OpenApiViewStateContext.collapsed`: a set of section node ids, empty = everything expanded;
`toggleCollapsed`), owned by `OperationNodeViewer` and reset with the selections when the operation
node changes. A collapsed section is planned as its title row alone
(`buildCollapsibleSectionElements`; for the Body `OpenApiBlockEdges.bodyElements(…, { expanded })`), so its
tail edge — and the tail of its container — is the title row; separator heights do not change
([vertical-gaps.md](vertical-gaps.md), [block-separators.md](block-separators.md) §7.9).
