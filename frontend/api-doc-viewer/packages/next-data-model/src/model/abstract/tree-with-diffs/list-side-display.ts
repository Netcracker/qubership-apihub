import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import {
  LayoutSide,
  ORIGIN_LAYOUT_SIDE,
} from "../layout-side"
import { ChangedPropertyMetaData } from "./tree-node.interface"

export type ListSideSegment = {
  readonly text: string
  readonly diff?: ChangedPropertyMetaData
  /** Rendered detached from the previous segment (with a gap) instead of abutting it. */
  readonly spacedBefore?: boolean
}

export type ListSideItem = {
  readonly text: string
  readonly diff?: ChangedPropertyMetaData
}

/** How a side-aware comma-separated value is rendered in the viewer. */
export const SideListDisplayKinds = {
  /** Merged text with no diff styling. */
  NO_DIFFS: "no-diffs",
  /** Single string with one diff applied to the whole value. */
  WHOLE_DIFFS: "whole-diffs",
  /** Text split into segments; each may carry its own diff. */
  PARTIAL_DIFFS: "partial-diffs",
} as const

export type SideListDisplayKind = (typeof SideListDisplayKinds)[keyof typeof SideListDisplayKinds]

export type SideListDisplay =
  | {
    readonly kind: typeof SideListDisplayKinds.NO_DIFFS
    readonly text: string
  }
  | {
    readonly kind: typeof SideListDisplayKinds.WHOLE_DIFFS
    readonly text: string
    readonly diff: ChangedPropertyMetaData
  }
  | {
    readonly kind: typeof SideListDisplayKinds.PARTIAL_DIFFS
    readonly segments: readonly ListSideSegment[]
  }

export type CommaSeparatedListParenthesesStyle = "none" | "tight" | "spaced"

export function resolveListSideItems(
  mergedOrder: readonly string[],
  itemDiffs: Partial<Record<string, ChangedPropertyMetaData>> | undefined,
  layoutSide: LayoutSide,
): readonly ListSideItem[] {
  const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE
  const processedDiffs = new Set<ChangedPropertyMetaData>()
  const items: ListSideItem[] = []

  const findDiffForMergedItem = (text: string): ChangedPropertyMetaData | undefined => {
    const directDiff = itemDiffs?.[text]
    if (directDiff) {
      return directDiff
    }
    for (const diff of Object.values(itemDiffs ?? {})) {
      if (diff && isDiffReplace(diff.data) && diff.data.afterValue === text) {
        return diff
      }
    }
    return undefined
  }

  for (const text of mergedOrder) {
    const diff = findDiffForMergedItem(text)
    if (!diff) {
      items.push({ text })
      continue
    }
    if (processedDiffs.has(diff)) {
      continue
    }
    processedDiffs.add(diff)

    const { data } = diff
    if (isDiffAdd(data)) {
      if (!isOrigin && typeof data.afterValue === "string") {
        items.push({ text: data.afterValue, diff })
      }
      continue
    }
    if (isDiffRemove(data)) {
      if (isOrigin && typeof data.beforeValue === "string") {
        items.push({ text: data.beforeValue, diff })
      }
      continue
    }
    if (isDiffReplace(data)) {
      const displayText = isOrigin
        ? (typeof data.beforeValue === "string" ? data.beforeValue : text)
        : (typeof data.afterValue === "string" ? data.afterValue : text)
      items.push({ text: displayText, diff })
    }
  }

  for (const [itemKey, diff] of Object.entries(itemDiffs ?? {})) {
    if (!diff || processedDiffs.has(diff)) {
      continue
    }
    if (isDiffRemove(diff.data) && isOrigin) {
      items.push({ text: itemKey, diff })
      processedDiffs.add(diff)
    }
  }

  const indexOf = (text: string): number => {
    const index = mergedOrder.indexOf(text)
    return index >= 0 ? index : mergedOrder.length
  }

  return items.sort((left, right) => indexOf(left.text) - indexOf(right.text))
}

export function buildCommaSeparatedListSideSegments(
  sideItems: readonly ListSideItem[],
  parenthesesStyle: CommaSeparatedListParenthesesStyle = "none",
): readonly ListSideSegment[] {
  if (sideItems.length === 0) {
    return []
  }

  const segments: ListSideSegment[] = []
  if (parenthesesStyle === "tight") {
    segments.push({ text: "(" })
  } else if (parenthesesStyle === "spaced") {
    segments.push({ text: " (" })
  }

  sideItems.forEach((sideItem, index) => {
    if (index > 0) {
      segments.push({ text: ", " })
    }
    segments.push({
      text: sideItem.text,
      diff: sideItem.diff,
    })
  })

  if (parenthesesStyle === "tight" || parenthesesStyle === "spaced") {
    segments.push({ text: ")" })
  }

  return segments
}

export function resolveFieldSideText(
  mergedValue: string | number | undefined,
  diff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): string | undefined {
  if (!diff) {
    return mergedValue !== undefined ? String(mergedValue) : undefined
  }

  const { data } = diff
  const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE

  if (isDiffAdd(data)) {
    return isOrigin ? undefined : String(data.afterValue ?? mergedValue ?? "")
  }
  if (isDiffRemove(data)) {
    return isOrigin ? String(data.beforeValue ?? mergedValue ?? "") : undefined
  }
  if (isDiffReplace(data)) {
    return isOrigin
      ? String(data.beforeValue ?? mergedValue ?? "")
      : String(data.afterValue ?? mergedValue ?? "")
  }

  return mergedValue !== undefined ? String(mergedValue) : undefined
}

export function isListItemVisibleOnSide(
  diff: ChangedPropertyMetaData,
  layoutSide: LayoutSide,
): boolean {
  const styles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? diff.styles.before
    : diff.styles.after
  return styles.isContentVisible
}

export function isDiffSideContentVisible(
  diff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): boolean {
  if (!diff) {
    return true
  }
  return isListItemVisibleOnSide(diff, layoutSide)
}

export function isDiffSideHeaderVisible(
  diff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): boolean {
  if (!diff) {
    return true
  }

  const styles = layoutSide === ORIGIN_LAYOUT_SIDE
    ? diff.styles.before
    : diff.styles.after

  return styles.isHeaderVisible
}

export function takeAddRemoveDiffIfPresent(
  diff: ChangedPropertyMetaData | undefined,
): ChangedPropertyMetaData | undefined {
  if (!diff) {
    return undefined
  }
  if (isDiffAdd(diff.data) || isDiffRemove(diff.data)) {
    return diff
  }
  return undefined
}
