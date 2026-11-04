import { NodeDiffsSeverityPlacemennt } from "./tree-node.interface"

/**
 * Field diff -> the row it badges: one placement, or several alternative rows (the viewer reads the
 * one it renders). Read by the record-driven severities aggregators and by row descriptors.
 */
export type FieldPlacements = Readonly<Record<string, NodeDiffsSeverityPlacemennt | readonly NodeDiffsSeverityPlacemennt[]>>

/** Placement lookups over a `FieldPlacements` table. */
export class FieldPlacementsTable {
  /** The placement a single-host row reads: the field's only placement, or its first one. */
  public static primary(placements: FieldPlacements | undefined, field: string): NodeDiffsSeverityPlacemennt | undefined {
    const placement = placements?.[field]
    return typeof placement === 'string' ? placement : placement?.[0]
  }
}
