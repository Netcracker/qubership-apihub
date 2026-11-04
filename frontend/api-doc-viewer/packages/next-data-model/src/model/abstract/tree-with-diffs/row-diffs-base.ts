import { Diff, DiffAction, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "../layout-side"
import { ITreeNode } from "../tree/tree-node.interface"
import { ChangedPropertyMetaData, HighlightVariant, ITreeNodeWithDiffs, NODE_LEVEL_DIFF_KEY, NodeDescendantDiffsSummary } from "./tree-node.interface"

/**
 * Spec-neutral row-diff helpers of the row-based viewers (OpenAPI, the security sections of OpenAPI
 * and AsyncAPI). They read only `node.diffs` (written by record-driven aggregators) and
 * `node.value()`; the per-spec accessors (`OpenApiRowDiffs`, `SecurityRowDiffs`) build on them.
 */

/** Any tree node a row-diff accessor reads (plain or with diffs). */
export type RowDiffsNode = ITreeNode

export type RowDiffsNodeWithDiffs = ITreeNodeWithDiffs

export const BOTH_LAYOUT_SIDES: readonly LayoutSide[] = [ORIGIN_LAYOUT_SIDE, CHANGED_LAYOUT_SIDE]

/** One chip of a side-aware list. */
export type SideListItem = {
  readonly text: string
  /** Tooltip text (OAuth scope description). */
  readonly hint?: string
  /** `added` on the changed side / `removed` on the origin side; absent for unchanged items. */
  readonly change?: 'added' | 'removed'
}

export function hasNodeDiffs(node: RowDiffsNode): node is RowDiffsNodeWithDiffs {
  return 'diffs' in node && 'descendantDiffsSummary' in node
}

function isChangedPropertyMetaData(value: unknown): value is ChangedPropertyMetaData {
  return typeof value === 'object' && value !== null && 'data' in value && 'styles' in value
}

/** The node's own diff of `key` (a value field or a synthetic row key). */
export function takeFieldDiff(node: RowDiffsNode, key: string): ChangedPropertyMetaData | undefined {
  if (!hasNodeDiffs(node)) {
    return undefined
  }
  const diff: unknown = Reflect.get(node.diffs, key)
  return isChangedPropertyMetaData(diff) ? diff : undefined
}

export function isWholeChangeDiff(diff: Diff | undefined): boolean {
  return diff !== undefined && (isDiffAdd(diff) || isDiffRemove(diff))
}

/** The value a diff shows on a side (`undefined` where it does not exist). */
export function takeSideValue(diff: Diff, side: LayoutSide): unknown {
  if (side === ORIGIN_LAYOUT_SIDE) {
    return isDiffRemove(diff) || isDiffReplace(diff) ? diff.beforeValue : undefined
  }
  return isDiffAdd(diff) || isDiffReplace(diff) ? diff.afterValue : undefined
}

/** A field of a node value (`undefined` for non-object values). */
export function takeValueField(node: RowDiffsNode, field: string): unknown {
  const value = node.value()
  return typeof value === 'object' && value !== null ? Reflect.get(value, field) : undefined
}

export function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function toStringMap(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value)) {
      result[key] = typeof item === 'string' ? item : ''
    }
  }
  return result
}

/**
 * A row diff derived from a list / map diff (one scope out of a `scopes` map replace): same type and
 * declaration paths as the parent, the row's own action and values.
 */
export function deriveRowDiff(parent: Diff, action: 'add' | 'remove' | 'replace', beforeValue: unknown, afterValue: unknown): Diff {
  const beforeDeclarationPaths = 'beforeDeclarationPaths' in parent ? parent.beforeDeclarationPaths : []
  const afterDeclarationPaths = 'afterDeclarationPaths' in parent ? parent.afterDeclarationPaths : []
  const base = { type: parent.type, scope: parent.scope }
  switch (action) {
    case 'add':
      return { ...base, action: DiffAction.add, afterValue, afterDeclarationPaths }
    case 'remove':
      return { ...base, action: DiffAction.remove, beforeValue, beforeDeclarationPaths }
    case 'replace':
      return { ...base, action: DiffAction.replace, beforeValue, afterValue, beforeDeclarationPaths, afterDeclarationPaths }
  }
}

/** The items of a side: unchanged, or `added` / `removed` against the other side. */
export function toSideListItems(before: readonly string[], after: readonly string[], side: LayoutSide, hints: Record<string, string> = {}): SideListItem[] {
  if (side === ORIGIN_LAYOUT_SIDE) {
    return before.map(text => ({ text, hint: hints[text], ...(after.includes(text) ? {} : { change: 'removed' as const }) }))
  }
  return after.map(text => ({ text, hint: hints[text], ...(before.includes(text) ? {} : { change: 'added' as const }) }))
}

/** Node-level accessors: the whole node, its presence per side, its fields per side. */
export class NodeLevelRowDiffs {
  /** Node-level diff of any action (rename included). */
  public static takeNodeLevelDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    return hasNodeDiffs(node) ? node.diffs[NODE_LEVEL_DIFF_KEY] : undefined
  }

  /** Node-level diff unless it is a rename: "the whole node was added / removed / replaced". */
  public static takeWholeNodeDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    const diff = NodeLevelRowDiffs.takeNodeLevelDiff(node)
    return diff && !isDiffRename(diff.data) ? diff : undefined
  }

  /** Whether the node exists on a side: false on the side where it was wholly added / removed. */
  public static isPresentOnSide(node: RowDiffsNode, side: LayoutSide): boolean {
    const diff = NodeLevelRowDiffs.takeNodeLevelDiff(node)?.data
    if (diff && isDiffAdd(diff)) {
      return side === CHANGED_LAYOUT_SIDE
    }
    if (diff && isDiffRemove(diff)) {
      return side === ORIGIN_LAYOUT_SIDE
    }
    return true
  }

  /** Field diff, else the whole-node diff (a row of a wholly added / removed node). */
  public static takeRowDiff(node: RowDiffsNode, field: string): ChangedPropertyMetaData | undefined {
    return takeFieldDiff(node, field) ?? NodeLevelRowDiffs.takeWholeNodeDiff(node)
  }

  /**
   * A string field as shown on a side: the diff's before / after value when the field changed,
   * else the merged value on the sides where the node exists.
   */
  public static resolveSideField(node: RowDiffsNode, field: string, side: LayoutSide): string | undefined {
    if (!NodeLevelRowDiffs.isPresentOnSide(node, side)) {
      return undefined
    }
    const diff = takeFieldDiff(node, field)?.data
    if (diff && !isDiffRename(diff)) {
      const value = takeSideValue(diff, side)
      return typeof value === 'string' ? value : undefined
    }
    const value = takeValueField(node, field)
    return typeof value === 'string' ? value : undefined
  }

  /** Key of an option per side (rename aware): media types, response codes. */
  public static resolveSideKey(node: RowDiffsNode, side: LayoutSide): string {
    const diff = NodeLevelRowDiffs.takeNodeLevelDiff(node)?.data
    if (diff && isDiffRename(diff)) {
      return String(side === ORIGIN_LAYOUT_SIDE ? diff.beforeKey : diff.afterKey)
    }
    return String(node.key)
  }

  /** Text highlighter of an option's key on a side: yellow for a renamed key, none otherwise. */
  public static resolveSideKeyHighlight(node: RowDiffsNode, side: LayoutSide): Exclude<HighlightVariant, HighlightVariant.Gray> | undefined {
    const diff = NodeLevelRowDiffs.takeNodeLevelDiff(node)
    if (!diff || !isDiffRename(diff.data)) {
      return undefined
    }
    return (side === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after).textHighlighterColor
  }

  /** Whether the node itself (not an ancestor) was wholly added / removed: an option with a green / red border. */
  public static isOwnWholeChange(node: RowDiffsNode): boolean {
    const diff = NodeLevelRowDiffs.takeNodeLevelDiff(node)
    return !!diff && !diff.inherited && isWholeChangeDiff(diff.data)
  }

  /**
   * Whether a boolean flag field (`deprecated`, `required`) is true on a side: never where the node
   * does not exist; else the flag diff's value on that side; else the merged value.
   */
  public static isFlagOnSide(node: RowDiffsNode, field: string, side: LayoutSide): boolean {
    if (!NodeLevelRowDiffs.isPresentOnSide(node, side)) {
      return false
    }
    const diff = takeFieldDiff(node, field)?.data
    if (diff && !isDiffRename(diff)) {
      return takeSideValue(diff, side) === true
    }
    return takeValueField(node, field) === true
  }

  /**
   * The changes a selector option's round marker shows (design note V9): the option's inner changes
   * only. Its own add / remove / rename is shown by its border shadow and title, never by the marker;
   * the descendant summary is empty for a wholly added / removed / inherited option.
   */
  public static takeChangesMarkerSummary(node: RowDiffsNode): NodeDescendantDiffsSummary {
    return hasNodeDiffs(node) ? node.descendantDiffsSummary : new Set()
  }
}

export class SectionRowDiffs {
  /** Header-row diff of a section / subsection: a whole add / remove only. */
  public static takeHeaderRowDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    const diff = NodeLevelRowDiffs.takeWholeNodeDiff(node)
    return diff && isWholeChangeDiff(diff.data) ? diff : undefined
  }
}
