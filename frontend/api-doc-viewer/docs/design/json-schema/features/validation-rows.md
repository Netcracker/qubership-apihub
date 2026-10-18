# Validation rows

Constraint rows rendered under a JSON Schema node in detailed display mode. Each row is an
`AdditionalInfoRow` with a label and a list of chips (`AdditionalInfoPiece`). `enum` is not a
validation row — it renders as **Allowed values**.

## Row catalogue

| Row key | Label | Schema fields | Chips |
| --- | --- | --- | --- |
| `valueLength` | Value length | `minLength`, `maxLength` | `>= n`, `<= n` |
| `valuePattern` | Value pattern | `pattern` | the pattern |
| `valueRange` | Value range | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum` | `>= n` / `> n`, `<= n` / `< n` |
| `valueMultipleOf` | Value multipleOf | `multipleOf` | the number |
| `propertiesCount` | Properties count | `minProperties`, `maxProperties` | `>= n`, `<= n` |
| `itemsCount` | Items count | `minItems`, `maxItems` | `>= n`, `<= n` |
| `uniqueItems` | Unique items | `uniqueItems` | `true` / `false` |

A row is hidden when none of its fields yields a chip.

## Order

Rows follow one canonical, type-grouped order, re-applied after diff-only rows are merged in:

1. String — `valueLength`, `valuePattern`
2. Number (also `integer`) — `valueRange`, `valueMultipleOf`
3. Object — `propertiesCount`
4. Array — `uniqueItems`, `itemsCount`

`Default`, `Allowed values`, and `Examples` precede the validation rows and are not part of this
order.

## Value range dialects

| Dialect | Exclusive bound | Example | Chips |
| --- | --- | --- | --- |
| OAS 3.0 | boolean flag paired with the bound | `minimum: 1, maximum: 10, exclusiveMaximum: true` | `>= 1`, `< 10` |
| OAS 3.1 | numeric bound on its own | `minimum: 1, exclusiveMaximum: 10` | `>= 1`, `< 10` |

The dialect is inferred from the merged node fields; never assume one dialect in tests or cases.

## With diffs

Three layers per row, all computed in next-data-model:

| Layer | Field | Effect |
| --- | --- | --- |
| Whole row | `validationRowDiffs[rowKey]` | the row appears (`add`) or disappears (`remove`) |
| Row background | `validationRowColorizingDiffs[rowKey]` | green add, red remove, yellow replace |
| Chip | `validationRowValueDiffs[rowKey][chipKey]` | per-chip highlight; chip keys are `"0"` / `"1"` (value range) or the source field name |

| Change | Row | Chips |
| --- | --- | --- |
| The whole row appears | green, whole-row `add` | no chip diffs |
| The whole row disappears | red, whole-row `remove` | no chip diffs |
| One bound added or removed while the row stays visible | yellow `replace` | the changed chip is green / red |
| A bound value or exclusivity changes (`>= 1` → `> 1`) | yellow `replace` | the changed chip is highlighted |
| Single-value row replaced (`pattern`, `multipleOf`, `uniqueItems`) | yellow `replace` | chip `0` highlighted |

Rules:

- **Other content blocks a whole-row add/remove.** If the row keeps pre-existing, unchanged fields,
  the change is a yellow partial replace — for every bound-range row.
- **Boolean values use a border, not a text fill.** A replace whose side value is a boolean
  (`uniqueItems`, boolean `default`, boolean enum or example items) highlights the chip border; the
  check is on each side's value, not on the node type.
- **Whole-list rows suppress chip highlight.** When every item of `enum`, `examples`, or allowed
  additional property names is uniformly added or removed, the row color carries the change and
  the chips render plain (still side-visible). A partial list change keeps per-chip highlight.
- **One severity badge per row.** Each row has its own `NodeDiffsSeverityPlacemennt`
  (`DefaultRow`, `EnumRow`, `ExamplesRow`, `ValueLengthRow`, `ValuePatternRow`, `ValueRangeRow`,
  `ValueMultipleOfRow`, `PropertiesCountRow`, `ItemsCountRow`, `UniqueItemsRow`), built only from
  that row's own diffs.
- **Every node kind is diffed.** `items`, `additionalProperties`, and combiner variants get the same
  row diffs as properties.
- **Diff-only rows.** A row whose fields exist only on one side (for example after a type change)
  is still rendered with its diff and sorted into the canonical order.

## Fixtures

- Plain: `packages/samples/json-schema/*-validations/` and the programmatic value-range cases.
- With diffs: `packages/samples/json-schema-diffs/type-changes/` (YAML) and the programmatic value-range
  cases (53 OAS 3.0, 57 OAS 3.1).
