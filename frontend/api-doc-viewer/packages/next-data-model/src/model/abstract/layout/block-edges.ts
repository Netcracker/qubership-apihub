import {
  ChangedPropertyMetaData,
  NodeDiffsSeverity,
  NodeDiffsSeverityPlacemennt,
} from "../tree-with-diffs/tree-node.interface"
import { hasNodeDiffs, RowDiffsNode, SectionRowDiffs } from "../tree-with-diffs/row-diffs-base"
import { LayoutBlockEdge, LayoutBlockEdgePair, LayoutEdgeTones } from "./types"

/** A row as the layout sees it: the diff that paints it and the severity its floating badge shows. */
export type LayoutPaintedRow = {
  readonly diff?: ChangedPropertyMetaData
  readonly severity?: NodeDiffsSeverity
}

/**
 * Edges of the layout elements every row-based tree has, built from the same row diffs and severity
 * placements the rows render, so a separator band always continues its neighbour. One accessor per
 * element (a row, a card, a nested viewer); containers take the head of their first child and the
 * tail of their last one. API types extend it with the edges of their own rows (`OpenApiBlockEdges`,
 * `SecurityBlockEdges`). Design: docs/design/openapi/features/vertical-gaps.md -> "Algorithm".
 */
export class BlockEdges {
  /** Per-side background of a row painted by `diff`. */
  public static tones(diff: ChangedPropertyMetaData | undefined): LayoutEdgeTones {
    return { before: diff?.styles.before.backgroundColor, after: diff?.styles.after.backgroundColor }
  }

  /** The severity a node's row of `placement` shows (plain trees: none). */
  public static severityOf(node: RowDiffsNode, placement: NodeDiffsSeverityPlacemennt): NodeDiffsSeverity | undefined {
    return hasNodeDiffs(node) ? node.diffsSeverities?.[placement] : undefined
  }

  /** A row: its own tones and badge. */
  public static row(row: LayoutPaintedRow): LayoutBlockEdge {
    return { kind: 'row', tones: BlockEdges.tones(row.diff), badge: row.severity?.type }
  }

  /** A nested JSON Schema / JSO viewer: its rows are not visible here, only its owner's whole add / remove. */
  public static nested(owner: RowDiffsNode): LayoutBlockEdge {
    return { ...BlockEdges.wholeBlock(owner), kind: 'nested' }
  }

  /** A card seen from outside its border: the whole-card add / remove only. */
  public static card(card: RowDiffsNode): LayoutBlockEdge {
    return { ...BlockEdges.wholeBlock(card), kind: 'card' }
  }

  /** A block made of one element. */
  public static single(edge: LayoutBlockEdge): LayoutBlockEdgePair {
    return { head: edge, tail: edge }
  }

  /** A container: the head of its first child, the tail of its last one. */
  public static container(children: readonly [LayoutBlockEdgePair, ...LayoutBlockEdgePair[]]): LayoutBlockEdgePair {
    return { head: children[0].head, tail: children[children.length - 1].tail }
  }

  /** A section / subsection title row (a parameter group, Extensions, Headers, …): a whole add / remove. */
  public static sectionTitleRow(node: RowDiffsNode): LayoutBlockEdge {
    return BlockEdges.row({ diff: SectionRowDiffs.takeHeaderRowDiff(node), severity: BlockEdges.severityOf(node, NodeDiffsSeverityPlacemennt.TitleRow) })
  }

  /** Tones and badge of a wholly added / removed node, nothing otherwise. */
  private static wholeBlock(node: RowDiffsNode): Omit<LayoutBlockEdge, 'kind'> {
    const whole = SectionRowDiffs.takeHeaderRowDiff(node)
    return {
      tones: BlockEdges.tones(whole),
      badge: whole ? BlockEdges.severityOf(node, NodeDiffsSeverityPlacemennt.TitleRow)?.type : undefined,
    }
  }
}
