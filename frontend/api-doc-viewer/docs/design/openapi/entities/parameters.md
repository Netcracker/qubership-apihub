# Parameters (and the schema synthesizer)

The **Request** section header and its four parameter subsections, plus the schema synthesizer that
turns parameters — and response headers ([responses.md](responses.md#headers)) — into one JSON
Schema object per group. Status: **implemented** (first iteration; deviations in [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)).

## Request section header

`TitleRow` "Request", **h2**. Node kind `request` (simple, empty value) — exists so the header has
a node for diffs and visibility. Shown when at least one parameter group or the request body is
shown. Children: up to four `parameters` nodes, then `requestBody`.

## Groups

The operation's `parameters` (already merged with the path item's by `api-unifier`, E11) are split
by `in`, in this fixed order:

| `in` | Node key | Title (h3) | Test id |
| --- | --- | --- | --- |
| `path` | `path` | Path Parameters | `openapi-parameters-path` |
| `query` | `query` | Query Parameters | `openapi-parameters-query` |
| `header` | `header` | Headers | `openapi-parameters-header` |
| `cookie` | `cookie` | Cookies | `openapi-parameters-cookie` |

A parameter with any other `in` value is dropped with a dev-mode log. Inside a group, parameters
keep the order of the (merged) `parameters` array. A group without parameters has no node.

Header parameters named `Accept`, `Content-Type`, `Authorization` are shown like any other (Q5).

## Node

Kind `parameters`, simple, key = location.

```typescript
export interface OpenApiTreeNodeValueTypeParameters {
  readonly location: OpenApiParameterLocation   // 'path' | 'query' | 'header' | 'cookie'
  readonly schema: OpenApiSynthesizedObjectSchema
}
```

## Rendering

`buildParametersBlock` (`parameters-blocks.tsx`) — the same block renders response headers.

| Item | Rule |
| --- | --- |
| Header | `TitleRow` with the group title, **h3**, collapsible (expander column, expanded by default; the schema indented past it — [collapsible-sections.md](../features/collapsible-sections.md)) |
| Content | `JsonSchemaViewer` / `JsonSchemaDiffsViewer` over `value.schema`, `customizationOptions={SUPPRESS_ROOT_NESTING_INDICATOR_CUSTOMIZATION_OPTIONS}`, `expandedDepth` from `OpenApiViewerContext` (default `2`, as AsyncAPI address parameters), `firstRowPrecededBy={SEPARATOR_LAYOUT_NESTED_VIEWER_START}` (the first schema row takes the in-block gap under the h3, [Spacing](../features/operation-viewer.md#spacing-data-precededby)) |
| Diffs viewer | passes `diffMetaKeys`, `diffTypes`, `hideUnchangedNodes`; **no** wrapping or stamping in the viewer — the synthesizer already attached every diff ([With diffs](#with-diffs)) |

Each parameter becomes one property row of the JSON Schema viewer: name + required `*`, type
label, deprecated tag, description, constraints, enum, default, examples — everything the JSON
Schema stack shows for a property.

## Schema synthesizer

Classes in `packages/next-data-model/src/building-service/openapi/shared/`:

| Class | File | Role |
| --- | --- | --- |
| `OpenApiObjectSchemaSynthesizer` | `object-schema-synthesizer.ts` | plain synthesis |
| `OpenApiObjectSchemaWithDiffsSynthesizer` | `object-schema-with-diffs-synthesizer.ts` | extends it; attaches diffs |

Used only by `OpenApiSpecTransformer` / `OpenApiSpecWithDiffsTransformer` (constructed in the
transformer, no exported free functions). Input: a list of **entries** — `{ name, value }` — where a
parameter entry comes from the `parameters` array and a header entry from a `headers` map entry
(name = map key). It replaces the story helper
`src/stories/json-schema-diffs-suite/parameters-schema-synthesis.ts`; the property-rename stories
switch to the data-layer class when it lands.

### Output shape

```typescript
type OpenApiSynthesizedObjectSchema = {
  type: 'object'
  properties: Record<string, object | boolean>
  required: string[]
}
```

### Property schema of one entry

| Source field | Goes to | Rule |
| --- | --- | --- |
| `schema` | the property schema itself | shallow copy of the (already resolved) schema; never mutate the source object |
| `content` (no `schema`) | the property schema | `content[<mt>].schema` of the single entry (the specification allows exactly one); in diffs the source is resolved per side ([Description and schema sources](#description-and-schema-sources)) |
| `content` media type | `customAnnotations.mediaType = { label: 'Media type', value: <media type> }` | Q12; rendered by the JSON Schema custom-annotation row in both modes |
| neither | `{}` | an empty schema (type `any`) |
| `description` | `description` | the **entry** description wins over the schema's own `description`; without an entry description the schema description stays |
| `deprecated` | `deprecated` | only when `true` (or when it carries a diff) — JSON Schema renders the deprecated tag |
| `required` | parent `required` array | `true` → name appended; path parameters are required by the specification and must declare it |
| `x-*` (entry-level extensions) | the same `x-*` keys, **flat** on the property schema | moved one by one, no grouping object — the JSON Schema stack groups them itself (`transformJsonSchemaExtensions` → node `extensions`) and renders them as the property's **Extensions** sub-tree, with diffs ([Entry extensions](#entry-extensions)). An entry key wins over a schema-root key with the same name. |
| `name`, `in` | — | consumed by grouping and keys |
| `style`, `explode`, `allowEmptyValue`, `allowReserved`, `example`, `examples` | — | not displayed in v1 (Q11) |

A boolean schema (`true` / `false`, OAS 3.1) is kept as is; the JSON Schema stack renders boolean
property schemas.

### Dialect

The synthesizer does not branch on the OpenAPI version: it copies schemas verbatim, so the JSON
Schema stack sees each dialect's own keywords (OAS 3.0 `nullable`, boolean exclusive bounds;
OAS 3.1 type arrays unified into `anyOf`, numeric exclusive bounds). See
[../features/oas-versions.md](../features/oas-versions.md#schemas).

## With diffs

`OpenApiObjectSchemaWithDiffsSynthesizer` reads diffs from the merged entries and writes JSON
Schema diff records onto the synthesized schema, so `JsonSchemaDiffsViewer` paints them without any
help from the OpenAPI viewer. It generalizes the rules of the story helper and adds the
whole-group and description cases.

| Merged-document diff (E3–E5) | Synthesized diff record |
| --- | --- |
| Entry added / removed: `parameters[diffsMetaKey][index]` (or `headers[diffsMetaKey][name]`) | `properties[diffsMetaKey][name]` = the same diff |
| Path parameter renamed: `parameters[i][diffsMetaKey].name` (`replace`) | `properties[diffsMetaKey][afterName]` = `rename` (`beforeKey`, `afterKey`) — see [JSON Schema node key rename](../../json-schema/features/node-key-rename.md) |
| `required` changed: `parameters[i][diffsMetaKey].required` | `required[diffsMetaKey][k]` = `add` (became required) / `remove` (became optional) of the name; no diff when the effective value did not change |
| `deprecated`, `description` (entry level) | `properties[name][diffsMetaKey][key]` |
| `schema` / `content` entry added or removed as a whole (the schema source switched) | per-key synthesized diffs between the two source schemas — [Description and schema sources](#description-and-schema-sources), step 2 |
| Any diff inside `schema` | stays where it is — the property schema **is** the merged schema object |
| Entry-level `x-*`: `parameters[i][diffsMetaKey]['x-…']` | `properties[name][diffsMetaKey]['x-…']`, after per-side precedence ([Entry extensions](#entry-extensions)); diffs nested inside an extension value stay on that value |
| Entry-level `style`, `explode`, … | dropped (not displayed) |

Rules:

1. **Removed entries are in the merged array.** `apiDiff` keeps removed parameters at their before
   index and appends added ones (E3). Iterate the merged array; never index into the before or
   after document.
2. **`required` defaults.** A diff can report `required: false → true` although the before document
   omits `required` — `api-unifier` compared against its default (E5). Treat a missing value as
   `false`; drop diffs whose effective value is unchanged.
3. **Description precedence with diffs.** Resolve the shown description per side: entry
   description if present on that side, else the schema description of that side; emit one diff
   computed from the two shown values. Full algorithm and scenarios:
   [Description and schema sources](#description-and-schema-sources).
4. **Container changed as a whole.** When an ancestor that holds the entries is added / removed as
   a whole, its diff is stamped as `properties[diffsMetaKey][name]` for **every** entry — never as
   a synthetic diff on the wrapper's own top-level keys. Ancestors: the operation (inherited
   node-level diff), the whole `parameters` array (`op[diffsMetaKey].parameters`), for response
   headers the whole `headers` map (`response[diffsMetaKey].headers`) or the response. (AsyncAPI
   stamps the top-level keys of the parameters object, which hijacks JSON Schema's
   nesting-indicator detection; see the comment in `MessageChannelParametersNodeViewer.tsx`.)
5. **Moved between locations.** A parameter whose `in` changed is a `remove` in one group and an
   `add` in another (E4) — no cross-group logic.
6. **Content media type and schema source.** A parameter can switch between `schema` and
   `content`, or between two `content` media types; the property schema and the `Media type`
   annotation then come from different places per side. See
   [Description and schema sources](#description-and-schema-sources).

### Description and schema sources

A parameter's description can live in **two places** — the entry (`parameters[i].description`) and
the root of its schema (`parameters[i].schema.description`, or
`parameters[i].content[<media type>].schema.description`) — and the schema itself in **two kinds of
places** (`schema`, or the single `content` entry). The synthesized property has one `description`
and one schema, so the synthesizer resolves what each side shows and diffs the **shown** values,
not the raw records. Response headers follow the same rules (same fields on the Header Object).

#### Step 1 — reconstruct each side from the merged entry

`apiDiff` keeps removed keys in the merged object with their **before** value (E18), so every
field has a merged value plus, possibly, a diff. For a field at path `p` inside the entry:

| Side | Value |
| --- | --- |
| before | absent if `p` **or any ancestor up to the entry** carries an `add`; else the diff's `beforeValue` for a `replace` on `p`; else the merged value |
| after | absent if `p` **or any ancestor up to the entry** carries a `remove`; else the merged value |

Ancestors matter: when the whole `schema` is removed (it switched to `content`), `schema.description`
has no diff of its own but is absent on the after side.

#### Step 2 — schema source per side

| Side has | Schema source | Media type |
| --- | --- | --- |
| `schema` | `schema` | — |
| `content` (exactly one entry present on that side) | `content[<mt>].schema` | `<mt>` |
| neither | — (empty schema `{}`) | — |

**Same source on both sides** (same `schema`, or the same `content` key): the merged schema object
is used as the property schema; every diff inside it passes through unchanged.

**Different sources** (`schema` ↔ `content`, or `content` media type A → B): the two sides hold two
unrelated schema objects. Build the property schema from them:

1. Start from the **after** source's merged object; add the keys that exist only in the **before**
   source with their before values (merged-document convention, so the origin side can show them).
2. For each top-level key **except `description` and `x-*`** (steps 4 and 5 own them): only in after → `add`; only in
   before → `remove`; in both and not deep equal → `replace` (`beforeValue` / `afterValue` = the two
   values); deep equal → no diff.
3. Diffs nested inside either source object are **dropped** — they are relative to other documents'
   versions of those objects, not to each other. A changed nested subtree is shown as a replace of
   its top-level key (shallow comparison is the accepted v1 precision).
4. `type`, `scope`, declaration paths: from the source switch diff (`schema` / `content` entry
   `add` or `remove`); the highest diff type of the two switch diffs wins.

`apiDiff` **does not map media types inside a parameter's `content`** (only request and response
bodies use `contentMediaTypeMappingResolver`): `application/json` → `application/json;
charset=utf-8` arrives as a `remove` + an `add`, never as a `rename` (E17). It is therefore always
the "different sources" case, even when both schemas are identical (then step 2 yields no schema
diffs at all and only the media type changes).

#### Step 3 — media type annotation

`customAnnotations.mediaType` per side = that side's media type (step 2). Diff on the synthesized
property, using the JSON Schema custom-annotation shapes (tiers in
`JsonSchemaNodeDiffsAggregatorKindAny.aggregateCustomAnnotationsDiffs`):

| Before → after | Diff |
| --- | --- |
| none → `mt` | `customAnnotations[diffsMetaKey].mediaType` = `add` |
| `mt` → none | `customAnnotations[diffsMetaKey].mediaType` = `remove` (entry kept with the before value) |
| `mt1` → `mt2` | `customAnnotations.mediaType[diffsMetaKey].value` = `replace` (`mt1` → `mt2`) |
| equal | none |

#### Step 4 — description

Per side: `shown = entryDescription ?? schemaRootDescription` (from steps 1–2; empty strings count
as absent). Then:

| `shown` before → after | Property `description` | Diff on `properties[name][diffsMetaKey].description` |
| --- | --- | --- |
| equal (both absent, or the same text) | the after value (or before when after is absent) | **none** — even if the raw records say the text moved |
| absent → text | after text | `add` |
| text → absent | before text (kept for the origin side) | `remove` |
| text1 → text2 | after text | `replace` (`beforeValue` = text1, `afterValue` = text2) |

Rules:

- The raw `description` diffs of the entry and of the schema root are **replaced** by this one diff
  on the property; they are never copied as they are. Only when the entry has no description on
  either side **and** the schema source is the same on both sides is this a no-op — the schema
  root's own diff is exactly the computed one, so it can stay untouched.
- Diff metadata: `beforeDeclarationPaths` from the raw diff that covers the before source,
  `afterDeclarationPaths` from the one that covers the after source (empty when that side had no
  diff); `type` = the highest of the contributing raw diff types (`annotation` in practice).
- The schema root description of a side is **shadowed** whenever that side has an entry
  description: its changes are not shown, because the reader never sees that text.

#### Step 5 — extensions

Same situation as the description: an `x-*` key can live on the entry and on the schema root; see
[Entry extensions](#entry-extensions).

#### Scenarios

Fixtures `packages/samples/openapi-diffs/<fragment>/11-…` to `13-…` and `21-…` to `26-…` (every parameter fragment, [diffs-case-matrix.md](../features/diffs-case-matrix.md)); raw diffs measured with `apiDiff`
(E17, E18).

| # | Before | After | Raw diffs in the merged document | Shown (origin → changed) | Synthesized diff |
| --- | --- | --- | --- | --- | --- |
| 11 | entry `T` | schema root `T` | entry `description` remove; `schema.description` add | `T` → `T` | none — the reader sees the same text |
| 12 | entry `T1` | schema root `T2` | entry remove; schema add | `T1` → `T2` | `replace` |
| 13 | schema root `T1` | entry `T2` | entry add; schema remove | `T1` → `T2` | `replace` |
| 14 | entry `E1` + schema `S1` | entry `E2` + schema `S2` | entry replace; schema replace | `E1` → `E2` | `replace` `E1` → `E2`; the `S1` → `S2` change is shadowed and dropped |
| 15 | entry `E` + schema `S1` | entry `E` + schema `S2` | schema replace only | `E` → `E` | none (shadowed) |
| — | entry `E` + schema `S` | schema `S` | entry remove | `E` → `S` | `replace` (or none when `E` equals `S`) |
| — | schema `S` | entry `E` + schema `S` | entry add | `S` → `E` | `replace` (or none when equal) |
| 16 | `schema` (`boolean`, root `D1`) | `content: application/json` (`object`, root `D2`) | `schema` remove; `content` add | `D1` → `D2` | description `replace`; schema keys: `type` replace, `properties` add; `Media type` add |
| 17 | `content: application/json` | `content: application/json; charset=utf-8`, same schema | `content` entry remove + entry add (no rename) | unchanged | no description or schema diffs; `Media type` value `replace` |
| 18 | `content: application/json` (`object`, `D1`) | `content: text/plain` (`string`, `D2`) | `content` entry remove + entry add | `D1` → `D2` | description `replace`; `type` replace; `Media type` value `replace` |

The row stays one property in all scenarios: a description or schema-source change never turns a
parameter into a removed + added pair (that only happens when its name or `in` changes, E3 / E4).

### Entry extensions

Specification extensions of a Parameter Object (and of a Header Object, for response headers) are
**moved into the synthetic property schema as flat `x-*` keys** — not wrapped into an object, not
grouped per parameter. That reuses the JSON Schema extensions pipeline unchanged:

| JSON Schema stack piece | What it does with the moved keys |
| --- | --- |
| `transformJsonSchemaExtensions` (crawl transformer) | collects every `x-*` key of the property schema into the node value's `extensions` |
| `aggregateExtensionsDiffs` (`node-diffs/kind-any.ts`) | reads per-key diffs from the property schema's own diff record, keyed by the `x-*` name |
| whole-node add / remove → `extensionsDiffs` | a wholly added / removed parameter paints all its extensions too |
| `aggregateExtensionsUniformRowColorizingDiff` | colors the property's **Extensions** header when all extensions were added / removed uniformly |
| `JsonSchemaExtensionsSection` + embedded `JsoViewer` / `JsoDiffsViewer` | renders the **Extensions** sub-tree of the property row (both display modes), diffs inside values included |

So on screen a parameter's extensions appear exactly like a schema property's extensions — under
the parameter's row, never as a separate OpenAPI section.

**Plain synthesis.** For every `x-*` key of the entry: `property[key] = entry[key]` (value by
reference; never mutate the source). Schema-root `x-*` keys stay as they are. On a name collision
the **entry** value wins (the schema-root value is shadowed), as for `description`.

**With diffs.** Per `x-*` key, using the per-side reconstruction of step 1 and the schema source of
step 2:

```text
shown(side) = entry[key](side) ?? schemaRoot[key](side)          // undefined when absent on that side

shown(before) deep-equals shown(after) → no diff (even if the key moved between entry and schema root)
absent → value                         → property[M][key] = add
value → absent                         → property[M][key] = remove    (property keeps the before value)
value1 → value2                        → property[M][key] = replace
```

- Fast path: a key that exists only on the entry (on both sides) keeps the entry's own diff
  object, copied as is to `property[M][key]`; a key that exists only on the schema root (same
  source on both sides) is untouched — it already sits on the merged schema with its diff.
- Diffs **inside** an extension value (e.g. an item added to `x-owners`) are not touched: the value
  is the merged object by reference and carries its own nested diff records, which `JsoDiffsViewer`
  renders.
- Synthetic `add` / `remove` / `replace`: metadata from the contributing raw diffs (highest `type`,
  declaration paths per side), as in step 4.
- A wholly added / removed entry, and stamping of rule 4, need nothing extra: the property-level
  `add` / `remove` reaches the extensions through the JSON Schema whole-node path.
- Change markers and rollups count these diffs normally (they are displayed changes).

Raw diffs (E21): an entry key change is `parameters[i][M]['x-…']`; moving a key to the schema root
is an entry `remove` plus a `schema[M]['x-…']` `add`; a change inside a value stays inside it
(`x-audience.owners[M][1]` `add`).

| Case | Result on the parameter row |
| --- | --- |
| `x-internal: true` added, `x-owner` replaced on the entry (`query-parameters/16-extension-changed`) | Extensions sub-tree: `x-internal` added (green), `x-owner` replaced (yellow) |
| `x-owner` moved from the entry to the schema root, same value (`query-parameters/17-extension-moved-to-schema`) | no diff |
| item added inside `x-audience.owners` (`query-parameters/16-extension-changed`) | nested add inside the `x-audience` JSO tree |
| entry `x-owner: a`, schema root `x-owner: b`, entry key removed | `x-owner` replace `a` → `b` (the schema value becomes visible) |
| parameter wholly added | every extension shown as added, with the property row |

### Whole group added / removed

A parameter group (**Path Parameters**, **Query Parameters**, **Headers**, **Cookies**, response
**Headers**) is **not an object of the OpenAPI document** — it is derived by splitting `parameters`
by `in` (or from a `headers` map). It therefore never has an add / remove diff of its own.

**Definition.** A group is wholly added (removed) **if and only if every property of its synthetic
schema carries an `add` (`remove`) diff in `properties[diffsMetaKey]`.** Counted over all
properties of the merged schema — removed parameters are present in it (rule 1), unchanged ones
have no record and therefore break the condition.

The synthesizer makes both sources of "everything added / removed" end in this same state, so the
section rule needs only one check:

| Source | Example | How every property gets its `add` / `remove` |
| --- | --- | --- |
| Each entry added / removed individually | every header parameter removed (`request-headers/20-all-removed`); before had no query parameters, after has two | the per-entry array-item diffs (first row of the table above) |
| An ancestor added / removed as a whole | whole operation added (`operation/23-operation-added`); `parameters` array added; response `headers` map removed | stamping (rule 4) |

Not wholly added / removed (header stays uncolored; property rows show their own diffs):

| Case | Why |
| --- | --- |
| One entry added, another removed (`request-headers/03-entry-renamed`) | directions differ |
| All but one entry added, one unchanged | the unchanged property has no diff record |
| Every entry renamed / changed inside (`required`, `description`, schema) | `rename` / field diffs are not `add` / `remove` |
| Mix of whole-entry adds and field changes on another entry | the changed entry has no `add` |

**Consequences on screen** (the shared [section header colorizing](../../shared/features/section-header-colorizing.md)
rule, implemented by the with-diffs transformer: `OpenApiSectionPresence.writeSectionDiff` per
parameter location, from the entries' presence per side —
[../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes)):

| Group state | Origin side | Changed side |
| --- | --- | --- |
| Wholly added | header row hidden (grey, no content) | header row green; every property row green |
| Wholly removed | header row red; every property row red | header row hidden (grey, no content) |
| Otherwise | header uncolored on both sides | header uncolored on both sides |

The header's floating severity badge is built from the same synthetic group diff (one of the
property diffs — they are all the same direction; `type` = the max severity among them).

This is the presence rule of
[../features/diffs.md](../features/diffs.md#section-presence-and-whole-section-changes) for a group
(present on a side = ≥1 entry on that side): "every property `add`" is exactly "no entry before,
≥1 after". `OpenApiSectionPresence` computes presence from the reconstructed sides, so it also covers diffs
that land on a container instead of each entry.

The **Request** section header (h2) uses the same presence rule one level up: present on a side when
at least one parameter group **or** the request Body is present there. It is wholly added / removed
only when that flips — e.g. the last header parameter removed while the request Body stays keeps
**Request** uncolored, only **Headers** turns red.

## Related documents

- [responses.md](responses.md#headers) — response headers use the same synthesizer
- [../features/diffs.md](../features/diffs.md)
- Fixtures: `packages/samples/openapi/oas30/fields/parameters/*` (one case per location), `oas30/structure/01-path-item-parameters-with-override/`, `packages/samples/openapi-diffs/{path-parameters,query-parameters,request-headers,cookies,response-headers}/`
