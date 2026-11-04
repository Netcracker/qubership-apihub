# Hiding unchanged nodes

OpenAPI application of the shared mechanism in
[../../shared/features/hiding-unchanged-nodes.md](../../shared/features/hiding-unchanged-nodes.md).
Applies only to `OpenApiOperationDiffsViewer` (`hideUnchangedNodes`, default `true` — the same
default as `JsonSchemaDiffsViewer`). Status: **implemented** for security scheme cards.

| Where | Behaviour |
| --- | --- |
| Nested JSON Schema trees (parameters, headers, bodies) | The JSON Schema rules ([../../json-schema/features/hiding-unchanged-nodes.md](../../json-schema/features/hiding-unchanged-nodes.md)); `hideUnchangedNodes` is forwarded. |
| `Extensions` section values (JSO) | The JSO rules ([../../jso/features/hiding-unchanged-nodes.md](../../jso/features/hiding-unchanged-nodes.md)); the embedded `JsoDiffsViewer` takes the operation viewer's mode. The section title row is never hidden. |
| **Security scheme card** | The only OpenAPI-layer place with a "three dots" row (below). |
| Every other OpenAPI row (sections, toolbar, address, responses, …) | Never hidden. |

**One switch.** `hideUnchangedNodes` hides unchanged content in the OpenAPI layer and in every
embedded JSON Schema and JSO viewer alike; with `false`, none of them hides anything.

## Security scheme card

| Rule | Detail |
| --- | --- |
| Title row | **Always visible** (scheme name + gray type text): the structure of the security requirement stays readable at first sight. |
| Hidden content | Every other row of the card — unresolved text, description, props, the scheme's own `Scopes` / `Roles` list, and **all** OAuth flow parts (headers, URLs, scope toggles, scope rows) — goes behind **one** "three dots" row inside the frame. Flow parts are never hidden one by one: all of them are shown or all hidden. |
| When hidden | `hideUnchangedNodes` and the card has **no content change**: `SecurityRowDiffs.Scheme.isContentChanged(node)` is false. |
| When shown | Any content change, even in one row (one prop, one scope, one URL of one flow), shows the whole card. A wholly added / removed card is always shown. |
| Title-only change | A change of the title row alone (the scheme type) is not content: the card stays collapsed, the title row keeps its yellow row and type highlighter. |
| Trigger | `ShowUnchangedTrigger` (the JSON Schema three-dots button) in a `SecurityRow` (test id `security-show-unchanged`), tooltip `Show N unchanged row(s)` where N = hidden rows. |
| Reveal | Click reveals the card; the card's node id is the block id in the viewer-level `UnchangedBlocksContext`, so it stays revealed while switching alternatives, scope toggles, or display modes. |
| `simple` mode | Same rule: cards keep their props, flows and scope names (only descriptions are hidden), so an unchanged card collapses behind the trigger as in `detailed`. |
| Plain viewer, AsyncAPI | No `UnchangedBlocksContext` provider → every row shown. |

### Anonymous access changes

**Important.** Adding or removing the anonymous alternative `{}` changes the Security **title row
only** (the `Optional` badge, [../entities/security.md](../entities/security.md#optional-badge-anonymous-access)).
It is unlike any other alternative change:

| Change | Toolbar | Cards |
| --- | --- | --- |
| `{}` added / removed | not colored (no option changed) | **still collapsed** when their own content is unchanged |
| Any other alternative added / removed | yellow row, green / red option | the added / removed alternative's cards are shown whole |

So when nothing changed in the other security schemes but anonymous access changed, every card keeps
its three-dots row: the `allowsAnonymous` diff lives on the `security` node and never counts in
`SecurityRowDiffs.Scheme.isContentChanged`. Fixtures: hiding cases `22`, `23`. When `{}` is
replaced by a scheme in the same slot (`security/33`, `34`), that scheme's alternative is wholly
added / removed, so its card is shown whole as for any added alternative.

### "Content change" (`SecurityRowDiffs.Scheme.isContentChanged`)

True when any of:

1. the card has a whole-node add / remove diff;
2. the scheme has a field diff other than `name`, `type`, `requiredScopesKind` (no row of their own
   besides the title) — `requiredScopes` is ignored when the scheme ignores scopes (OAS 3.0
   non-OAuth types, `requiredScopesKind: 'ignored'`: no row shows them);
3. any OAuth flow child has a diff.

The predicate is precomputed data (next-data-model); the card only reads it.

## Fixtures and tests

Programmatic, not YAML: one operation template and one fragment per scheme kind rendered with a
`hasChanges` flag — `packages/samples/src/openapi-diffs-hiding-unchanged-nodes.ts`
(`OPENAPI_SECURITY_SCHEME_FRAGMENTS`, `openApiHidingUnchangedCases`). Catalogue:
[packages/samples/README.md](../../../../packages/samples/README.md) → OpenAPI hiding unchanged nodes.

| Layer | Location |
| --- | --- |
| Unit tests | `packages/next-data-model/tests/unit-tests/openapi-security-hiding-unchanged.test.ts`, `openapi-security-anonymous.test.ts` |
| Stories | `OpenAPI Operation Diffs Suite (Hiding Unchanged Nodes)/Security Schemes` — `src/stories/openapi-diffs-hiding-unchanged-nodes-suite/security-schemes.stories.tsx` (control `hideUnchangedNodes`) |
| Screenshot ITs | `src/it/openapi-diffs-hiding-unchanged-nodes-suite/security-schemes.it-test.ts` — every case collapsed in `detailed`, plus a `revealed` capture of every case with an unchanged card |
