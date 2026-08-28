import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import {
  LayoutSide,
  ORIGIN_LAYOUT_SIDE,
} from "../../abstract/layout-side"
import { ChangedPropertyMetaData } from "../../abstract/tree-with-diffs/tree-node.interface"

export type DdlListSideSegment = {
  readonly text: string
  readonly diff?: ChangedPropertyMetaData
}

export type DdlListSideItem = {
  readonly text: string
  readonly diff?: ChangedPropertyMetaData
}

export type DdlCommaSeparatedListParenthesesStyle = "none" | "tight" | "spaced"

export function resolveListSideItems(
  mergedOrder: readonly string[],
  itemDiffs: Partial<Record<string, ChangedPropertyMetaData>> | undefined,
  layoutSide: LayoutSide,
): readonly DdlListSideItem[] {
  const isOrigin = layoutSide === ORIGIN_LAYOUT_SIDE
  const processedDiffs = new Set<ChangedPropertyMetaData>()
  const items: DdlListSideItem[] = []

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
  sideItems: readonly DdlListSideItem[],
  parenthesesStyle: DdlCommaSeparatedListParenthesesStyle = "none",
): readonly DdlListSideSegment[] {
  if (sideItems.length === 0) {
    return []
  }

  const segments: DdlListSideSegment[] = []
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
