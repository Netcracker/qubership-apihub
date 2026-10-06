import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { AbstractNodeDescendantsDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-descendants-diffs-aggregator"
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator"
import {
  DIFF_HIGHLIGHTING_MODES_DEFAULT,
  DiffFlags,
  DiffHighlightingModesByArea,
  DiffStyles,
  HighlightVariant,
  NODE_LEVEL_DIFF_KEY,
  NodeDescendantDiffs,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DiffsRecord, isArray, isObject, takeIfDiffsRecord } from "@apihub/next-data-model/utilities"
import { Diff, DiffAction, DiffAdd, DiffRemove } from "@netcracker/qubership-apihub-api-diff"
import { isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"

const JSON_SCHEMA_CHILD_DIFF_BAG_KEYS = [
  "properties",
  "patternProperties",
  "allOf",
  "anyOf",
  "oneOf",
  "items",
] as const

/** Keyed maps (property name -> schema); a whole add/remove of the bag decomposes per property key. */
const JSON_SCHEMA_OBJECT_CHILD_DIFF_BAG_KEYS = new Set<string>(["properties", "patternProperties"])

export class JsonSchemaNodeDescendantDiffsAggregatorKindAny extends AbstractNodeDescendantsDiffsAggregator {
  private readonly DEFAULT_DIFF_STYLES: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
  }

  private readonly DEFAULT_DIFF_FLAGS: DiffFlags = {
    increaseLevel: true,
  }

  public aggregate(
    crawlValue: JsonSchemaTreeNodeStoredValue | null,
    diffsMetaKeys: DiffMetaKeys,
  ): NodeDescendantDiffs | undefined {
    if (!isObject(crawlValue)) {
      return undefined
    }

    const { diffsMetaKey } = diffsMetaKeys
    const nodeDescendantDiffs: NodeDescendantDiffs = {}

    for (const diffs of this.resolveDescendantDiffsRecords(crawlValue, diffsMetaKey)) {
      for (const [key, diff] of Object.entries(diffs)) {
        if (!diff || key === NODE_LEVEL_DIFF_KEY || !AbstractNodeDiffsAggregator.isDiff(diff)) {
          continue
        }

        nodeDescendantDiffs[key] = this.buildDescendantDiffMetadata(diff)
      }
    }

    return Object.keys(nodeDescendantDiffs).length > 0 ? nodeDescendantDiffs : undefined
  }

  private resolveDescendantDiffsRecords(
    crawlValue: object,
    diffsMetaKey: symbol,
  ): readonly DiffsRecord[] {
    const records: DiffsRecord[] = []

    const ownDiffs = takeIfDiffsRecord(Reflect.get(crawlValue, diffsMetaKey))
    if (ownDiffs) {
      records.push(ownDiffs)
    }

    for (const childBagKey of JSON_SCHEMA_CHILD_DIFF_BAG_KEYS) {
      const childBag = Reflect.get(crawlValue, childBagKey)
      if (!isObject(childBag) && !isArray(childBag)) {
        continue
      }

      const bagDiffs = takeIfDiffsRecord(Reflect.get(childBag, diffsMetaKey))
      if (bagDiffs) {
        records.push(bagDiffs)
        continue
      }

      // Whole bag replaced by a type change (e.g. string -> object): api-diff reports one
      // add/remove Diff keyed by the bag name instead of per-entry diffs on the bag itself.
      // Decompose it so each existing child key (property name or tuple index) is recognised
      // as wholly added/removed too - matching the per-entry case above.
      const wholeBagDiff = ownDiffs?.[childBagKey]
      if (wholeBagDiff && (isDiffAdd(wholeBagDiff) || isDiffRemove(wholeBagDiff))) {
        const isObjectMapBag = JSON_SCHEMA_OBJECT_CHILD_DIFF_BAG_KEYS.has(childBagKey)
        const canDecompose = isObjectMapBag ? isObject(childBag) : isArray(childBag)
        if (canDecompose) {
          const decomposed = this.decomposeWholeChildBagDiff(childBag, wholeBagDiff)
          if (decomposed) {
            records.push(decomposed)
          }
        }
      }
    }

    return records
  }

  private decomposeWholeChildBagDiff(
    childBag: Record<PropertyKey, unknown> | unknown[],
    wholeBagDiff: DiffAdd | DiffRemove,
  ): DiffsRecord | undefined {
    const keys = isArray(childBag) ? childBag.map((_, index) => String(index)) : Object.keys(childBag)
    if (keys.length === 0) {
      return undefined
    }

    const record: DiffsRecord = {}
    for (const key of keys) {
      record[key] = this.buildDecomposedChildBagEntryDiff(wholeBagDiff)
    }
    return record
  }

  private buildDecomposedChildBagEntryDiff(wholeBagDiff: DiffAdd | DiffRemove): Diff {
    if (isDiffAdd(wholeBagDiff)) {
      return {
        type: wholeBagDiff.type,
        scope: wholeBagDiff.scope,
        description: wholeBagDiff.description,
        action: DiffAction.add,
        afterValue: null,
        afterDeclarationPaths: wholeBagDiff.afterDeclarationPaths,
      }
    }

    return {
      type: wholeBagDiff.type,
      scope: wholeBagDiff.scope,
      description: wholeBagDiff.description,
      action: DiffAction.remove,
      beforeValue: null,
      beforeDeclarationPaths: wholeBagDiff.beforeDeclarationPaths,
    }
  }

  private buildDescendantDiffMetadata(diff: Diff) {
    let beforeStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let beforeFlags: DiffFlags = this.DEFAULT_DIFF_FLAGS
    let afterFlags: DiffFlags = this.DEFAULT_DIFF_FLAGS
    const highlightingMode: DiffHighlightingModesByArea = DIFF_HIGHLIGHTING_MODES_DEFAULT

    if (isDiffAdd(diff)) {
      beforeStyles = {
        isContentVisible: false,
        isHeaderVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
      beforeFlags = { ...beforeFlags, increaseLevel: false }
      afterStyles = {
        isContentVisible: false,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Green,
        borderShadowColor: HighlightVariant.Green,
      }
      afterFlags = { ...afterFlags, increaseLevel: true }
    }

    if (isDiffRemove(diff)) {
      beforeStyles = {
        isContentVisible: false,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Red,
        borderShadowColor: HighlightVariant.Red,
      }
      beforeFlags = { ...beforeFlags, increaseLevel: true }
      afterStyles = {
        isContentVisible: false,
        isHeaderVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
      afterFlags = { ...afterFlags, increaseLevel: false }
    }

    if (isDiffReplace(diff)) {
      beforeStyles = {
        isContentVisible: false,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Yellow,
        textHighlighterColor: HighlightVariant.Yellow,
      }
      afterStyles = {
        isContentVisible: false,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Yellow,
        textHighlighterColor: HighlightVariant.Yellow,
      }
    }

    // Renamed key: the same node with a new name, so its content stays visible. The yellow row
    // background comes from the title row diff, the highlighter marks the name itself.
    if (isDiffRename(diff)) {
      beforeStyles = {
        isContentVisible: true,
        isHeaderVisible: true,
        textHighlighterColor: HighlightVariant.Yellow,
      }
      afterStyles = {
        isContentVisible: true,
        isHeaderVisible: true,
        textHighlighterColor: HighlightVariant.Yellow,
      }
    }

    return {
      data: diff,
      styles: {
        before: beforeStyles,
        after: afterStyles,
      },
      flags: {
        before: beforeFlags,
        after: afterFlags,
      },
      highlightingMode,
    }
  }
}
