import { NodeDiffsSeverityPlacemennt } from "../abstract/tree-with-diffs/tree-node.interface"
import { RowDiffsNode } from "../abstract/tree-with-diffs/row-diffs-base"
import { BlockEdges } from "../abstract/layout/block-edges"
import { LayoutBlockEdge } from "../abstract/layout/types"
import { SecurityRowDiffs } from "./tree-with-diffs/row-diffs"

/**
 * Edges of the Security section rows, shared by every API type that mounts the section (OpenAPI
 * operation, AsyncAPI operation / server). Cards use `BlockEdges.card`.
 */
export class SecurityBlockEdges extends BlockEdges {
  /** The security toolbar row, painted by the section's `securityAlternatives` container. */
  public static toolbarRow(alternatives: RowDiffsNode): LayoutBlockEdge {
    return BlockEdges.row({
      diff: SecurityRowDiffs.Alternatives.takeToolbarRowDiff(alternatives),
      severity: BlockEdges.severityOf(alternatives, NodeDiffsSeverityPlacemennt.SelectorRow),
    })
  }

  /** The Security title row (yellow when anonymous access, the `Optional` badge, changed). */
  public static titleRow(security: RowDiffsNode): LayoutBlockEdge {
    return BlockEdges.row({
      diff: SecurityRowDiffs.Security.takeTitleRowDiff(security),
      severity: BlockEdges.severityOf(security, NodeDiffsSeverityPlacemennt.TitleRow),
    })
  }
}
