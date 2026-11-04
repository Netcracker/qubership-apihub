import { annotation, breaking, deprecated, Diff, DiffType, isDiffAdd, nonBreaking, risky, unclassified } from "@netcracker/qubership-apihub-api-diff"
import { ChangedPropertyMetaData, NodeDiffsSeverity } from "./tree-node.interface"

/**
 * The order of diff types, strongest first: breaking > risky > deprecated > non-breaking >
 * annotation > unclassified. Model code: aggregators, row accessors and viewers share this one table.
 */
export class DiffTypeOrder {
  public static readonly RANKS: Readonly<Record<DiffType, number>> = {
    [breaking]: 6,
    [risky]: 5,
    [deprecated]: 4,
    [nonBreaking]: 3,
    [annotation]: 2,
    [unclassified]: 1,
  }

  /** Positive when `a` is stronger than `b`; an absent type is weaker than any type. */
  public static compare(a: DiffType | undefined, b: DiffType | undefined): number {
    return (a ? DiffTypeOrder.RANKS[a] : 0) - (b ? DiffTypeOrder.RANKS[b] : 0)
  }

  /** The strongest of `types`; `undefined` for none. */
  public static strongestType(types: Iterable<DiffType>): DiffType | undefined {
    let strongest: DiffType | undefined
    for (const type of types) {
      if (DiffTypeOrder.compare(type, strongest) > 0) {
        strongest = type
      }
    }
    return strongest
  }

  /** The diff with the strongest type (the first of equals); `undefined` for none. */
  public static strongestDiff(...diffs: (Diff | undefined)[]): Diff | undefined {
    let strongest: Diff | undefined
    for (const diff of diffs) {
      if (diff && DiffTypeOrder.compare(diff.type, strongest?.type) > 0) {
        strongest = diff
      }
    }
    return strongest
  }

  /** The row diff with the strongest type (the first of equals); `undefined` for none. */
  public static strongestChangedPropertyMetaData(...diffs: (ChangedPropertyMetaData | undefined)[]): ChangedPropertyMetaData | undefined {
    let strongest: ChangedPropertyMetaData | undefined
    for (const diff of diffs) {
      if (diff && DiffTypeOrder.compare(diff.data.type, strongest?.data.type) > 0) {
        strongest = diff
      }
    }
    return strongest
  }

  /**
   * The floating-badge severity of a row painted by `diff`: its type, caused at its first
   * declaration path (the after path of an add, the before path otherwise).
   */
  public static toSeverity(diff: Diff): NodeDiffsSeverity {
    const causedAt = isDiffAdd(diff)
      ? diff.afterDeclarationPaths[0]
      : 'beforeDeclarationPaths' in diff ? diff.beforeDeclarationPaths[0] : undefined
    return { type: diff.type, causedAt: causedAt ?? [] }
  }
}
