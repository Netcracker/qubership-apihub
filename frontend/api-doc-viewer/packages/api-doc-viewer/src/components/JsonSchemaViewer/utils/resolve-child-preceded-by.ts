import { PrecededBy } from "../../shared-components/WithPrecededByProps"

/**
 * `data-precededby` of a child row. With a suppressed root nesting indicator the root renders no
 * title row, so its first child is the viewer's first row and takes the viewer's opt-in
 * `firstRowPrecededBy` (passed to the root as its `data-precededby`); every other child follows a
 * sibling property.
 */
export function resolveChildPrecededBy(suppressRootNesting: boolean, rootPrecededBy: PrecededBy | undefined, index: number): PrecededBy {
  return suppressRootNesting && index === 0 && rootPrecededBy ? rootPrecededBy : PrecededBy.JSON_SCHEMA_PROPERTY
}
