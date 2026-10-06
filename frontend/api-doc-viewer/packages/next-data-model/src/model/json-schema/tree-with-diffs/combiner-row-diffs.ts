import {
  AbstractNodeDiffsSeveritiesAggregator,
} from '@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator'
import {
  ChangedPropertyMetaData,
  DIFF_HIGHLIGHTING_MODES_DEFAULT,
  HighlightVariant,
  NODE_LEVEL_DIFF_KEY,
  NodeDiffsSeverities,
  NodeDiffsSeverity,
  NodeDiffsSeverityPlacemennt,
} from '@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import {
  JsonSchemaTreeNode,
  JsonSchemaTreeNodeWithDiffs,
} from '@apihub/next-data-model/model/json-schema/types/aliases'
import { isJsonSchemaTreeNodeWithDiffs } from '@apihub/next-data-model/shared/json-schema/guards/tree-node'
import {
  isChangedPropertyMetaData,
} from '@apihub/next-data-model/model/abstract/tree-with-diffs/changed-property-meta-data'
import {
  annotation,
  Diff,
  DiffAction,
  DiffType,
  isDiffAdd,
  isDiffRemove,
  isDiffReplace,
} from '@netcracker/qubership-apihub-api-diff'
import { JsonSchemaRowDiffs } from './property-row-diffs'

export type CombinerSelectorRowPresentation = {
  selectorRowDiff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
}

const COMBINER_ROW_REPLACE_STYLES: ChangedPropertyMetaData["styles"] = {
  before: {
    isContentVisible: true,
    isHeaderVisible: true,
    backgroundColor: HighlightVariant.Yellow,
  },
  after: {
    isContentVisible: true,
    isHeaderVisible: true,
    backgroundColor: HighlightVariant.Yellow,
  },
}

/**
 * Resolves the combiner-selector row's diff background and floating-badge severity for one
 * `CombinerSelectorRow` instance (`oneOf`/`anyOf`/`allOf`).
 *
 * This is deliberately a read-time resolver over the fully-built tree, not a builder-time
 * aggregated field on the node: `nestedNodes()` (a combinator's variants) are not
 * `childrenNodes()`, so they are not covered by `nodeDescendantDiffs`/`aggregateByDescendantDiffs`
 * (see `JsonSchemaNodeDiffsAggregatorKindAny.aggregateNestingIndicatorRowColorizingDiff`, which
 * only walks structural child keys). More fundamentally, at the point a combiner OWNER node's own
 * diffs are assigned during crawl, its nested variant nodes have not been created yet (a
 * complex/combinator node must exist before crawl can create the branches that reference it as
 * their `container`), so "are all my nested variants uniformly added/removed" cannot be computed
 * as a builder-time field the way `nestingIndicatorRowColorizingDiff` is for structural children.
 * Reading it here, after the whole tree exists, is the correct place for this specific signal -
 * same "model owns the logic, viewer only renders the result" contract as every other accessor in
 * `property-row-diffs.ts`, just evaluated on demand instead of stored on the node.
 *
 * OOP note: grouped under one static class rather than free functions, per the JSON Schema
 * combiner-diffs review action - domain logic invocation stays scoped to its own namespace.
 */
export class JsonSchemaCombinerSelectorRowResolver {
  private static buildCombinerSyntheticReplaceDiff(
    existingDiff?: ChangedPropertyMetaData,
  ): ChangedPropertyMetaData {
    if (existingDiff && isDiffReplace(existingDiff.data)) {
      return {
        ...existingDiff,
        styles: COMBINER_ROW_REPLACE_STYLES,
      }
    }

    return {
      data: {
        type: annotation,
        action: DiffAction.replace,
        scope: "root",
        description: "",
        beforeValue: undefined,
        afterValue: undefined,
        beforeDeclarationPaths: [],
        afterDeclarationPaths: [],
      },
      styles: COMBINER_ROW_REPLACE_STYLES,
      flags: {
        before: { increaseLevel: false },
        after: { increaseLevel: false },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    }
  }

  private static buildNodeDiffsSeverityFromChangedProperty(
    propertyDiff: ChangedPropertyMetaData,
  ): NodeDiffsSeverity {
    const diff = propertyDiff.data
    const nodeDiffsSeverity: NodeDiffsSeverity = {
      type: diff.type,
      causedAt: [],
    }
    if (isDiffRemove(diff) || isDiffReplace(diff)) {
      nodeDiffsSeverity.causedAt = diff.beforeDeclarationPaths[0] ?? []
    } else if (isDiffAdd(diff)) {
      nodeDiffsSeverity.causedAt = diff.afterDeclarationPaths[0] ?? []
    }
    return nodeDiffsSeverity
  }

  private static buildNodeDiffsSeverityFromDiff(diff: Diff): NodeDiffsSeverity {
    return this.buildNodeDiffsSeverityFromChangedProperty({
      data: diff,
      styles: COMBINER_ROW_REPLACE_STYLES,
      flags: {
        before: { increaseLevel: false },
        after: { increaseLevel: false },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    })
  }

  /**
   * `node.diffs` is a flat-looking record, but some entries (`typeLabelFieldDiffs`,
   * `validationRowDiffs`, `validationRowColorizingDiffs`, `enumValueDiffs`, ...) are themselves
   * nested maps of `ChangedPropertyMetaData` rather than a `ChangedPropertyMetaData` directly (see
   * the equivalent recursion in `JsonSchemaNodeDiffsSummaryKindAny`). Walk down until real diff
   * leaves are found instead of assuming every top-level value is a leaf.
   */
  private static collectChangedPropertyMetaData(
    value: unknown,
    out: ChangedPropertyMetaData[],
  ): void {
    if (!value || typeof value !== "object") {
      return
    }
    if (isChangedPropertyMetaData(value)) {
      out.push(value)
      return
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
      this.collectChangedPropertyMetaData(nested, out)
    }
  }

  private static maxNodeDiffsSeverity(
    ...severities: (NodeDiffsSeverity | undefined)[]
  ): NodeDiffsSeverity | undefined {
    let maxSeverity: NodeDiffsSeverity | undefined
    for (const severity of severities) {
      if (!severity) {
        continue
      }
      if (
        !maxSeverity
        || AbstractNodeDiffsSeveritiesAggregator.compareDiffTypes(severity.type, maxSeverity.type) > 0
      ) {
        maxSeverity = severity
      }
    }
    return maxSeverity
  }

  /**
   * Every `nestedNodes()` variant was uniformly added, or uniformly removed - without the owner
   * itself being wholly added/removed (that case is covered separately by
   * `JsonSchemaRowDiffs.NodeLevel.isWholePropertyAddOrRemove(combinerNode)`, reused as-is for a combiner owner node in
   * {@link resolveCombinerSelectorLevelReductionAction}). No existing structural-child signal
   * covers this (`JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff` only inspects
   * properties/items children, never `nestedNodes()`).
   */
  private static resolveUniformNestedNodesAction(
    combinerNode: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
  ): typeof DiffAction.add | typeof DiffAction.remove | undefined {
    const nestedNodes = combinerNode.nestedNodes()
    if (nestedNodes.length === 0) {
      return undefined
    }

    let action: typeof DiffAction.add | typeof DiffAction.remove | undefined
    for (const nestedNode of nestedNodes) {
      if (!isJsonSchemaTreeNodeWithDiffs(nestedNode)) {
        return undefined
      }
      const nestedDiff = nestedNode.diffs[NODE_LEVEL_DIFF_KEY]
      const nestedAction = nestedDiff && isDiffAdd(nestedDiff.data)
        ? DiffAction.add
        : nestedDiff && isDiffRemove(nestedDiff.data)
          ? DiffAction.remove
          : undefined
      if (!nestedAction) {
        return undefined
      }
      if (!action) {
        action = nestedAction
        continue
      }
      if (action !== nestedAction) {
        return undefined
      }
    }
    return action
  }

  /**
   * Level-reduction action for one `CombinerSelectorRow` instance (one `selectorLevels` entry,
   * evaluated independently per level - so a nested combiner-in-combiner chain gets its own correct
   * answer per level). `undefined` means no reduction: either nothing qualifies, or the viewer's
   * outer level-freeze wrap (whole-node add/remove on this same owner node, via
   * `JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff`) already pins the ambient level at the owner's
   * own level, so an additional reduction here would go one level too low - hence the
   * `JsonSchemaRowDiffs.NodeLevel.isWholePropertyAddOrRemove` guard below.
   */
  public static resolveCombinerSelectorLevelReductionAction(
    combinerNode: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
  ): typeof DiffAction.add | typeof DiffAction.remove | undefined {
    if (!isJsonSchemaTreeNodeWithDiffs(combinerNode)) {
      return undefined
    }
    if (JsonSchemaRowDiffs.NodeLevel.isWholePropertyAddOrRemove(combinerNode)) {
      return undefined
    }
    return this.resolveUniformNestedNodesAction(combinerNode)
  }

  private static nestedNodeHasDiffSignals(node: JsonSchemaTreeNodeWithDiffs): boolean {
    if (node.diffsSummary.size > 0) {
      return true
    }
    if (node.descendantDiffsSummary.size > 0) {
      return true
    }
    if (Object.keys(node.diffs).length > 0) {
      return true
    }
    if (Object.keys(node.descendantDiffs).length > 0) {
      return true
    }
    return false
  }

  private static hasCombinerOwnerChanges(
    ownerNode: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
  ): boolean {
    if (!isJsonSchemaTreeNodeWithDiffs(ownerNode)) {
      return false
    }

    if (ownerNode.diffsSummary.size > 0) {
      return true
    }
    if (Object.keys(ownerNode.descendantDiffs).length > 0) {
      return true
    }
    if (ownerNode.descendantDiffsSummary.size > 0) {
      return true
    }

    return ownerNode.nestedNodes().some((nestedNode) => (
      isJsonSchemaTreeNodeWithDiffs(nestedNode) && this.nestedNodeHasDiffSignals(nestedNode)
    ))
  }

  /**
   * Fallback for a combiner row that changed but was not itself wholly added/removed (e.g. a
   * description/type edit on an existing variant) - always a yellow "replace" indication. Whole
   * add/remove is handled upstream by {@link resolveCombinerSelectorRowPresentation} via the
   * precomputed `nestingIndicatorRowColorizingDiff`.
   */
  private static buildCombinerSelectorRowDiff(
    combinerNode: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
  ): ChangedPropertyMetaData | undefined {
    if (!isJsonSchemaTreeNodeWithDiffs(combinerNode) || !this.hasCombinerOwnerChanges(combinerNode)) {
      return undefined
    }

    return this.buildCombinerSyntheticReplaceDiff(combinerNode.diffs[NODE_LEVEL_DIFF_KEY])
  }

  private static buildCombinerSelectorRowDiffsSeverities(
    combinerNode: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
  ): NodeDiffsSeverities | undefined {
    if (!isJsonSchemaTreeNodeWithDiffs(combinerNode) || !this.hasCombinerOwnerChanges(combinerNode)) {
      return undefined
    }

    const severityCandidates: NodeDiffsSeverity[] = []

    for (const severity of Object.values(combinerNode.diffsSeverities)) {
      if (severity) {
        severityCandidates.push(severity)
      }
    }

    for (const descendantDiff of Object.values(combinerNode.descendantDiffs)) {
      if (descendantDiff) {
        severityCandidates.push(this.buildNodeDiffsSeverityFromChangedProperty(descendantDiff))
      }
    }

    for (const nestedNode of combinerNode.nestedNodes()) {
      if (!isJsonSchemaTreeNodeWithDiffs(nestedNode)) {
        continue
      }

      for (const severity of Object.values(nestedNode.diffsSeverities)) {
        if (severity) {
          severityCandidates.push(severity)
        }
      }

      const nestedChangedProperties: ChangedPropertyMetaData[] = []
      for (const nestedDiff of Object.values(nestedNode.diffs)) {
        this.collectChangedPropertyMetaData(nestedDiff, nestedChangedProperties)
      }
      for (const nestedChangedProperty of nestedChangedProperties) {
        severityCandidates.push(this.buildNodeDiffsSeverityFromChangedProperty(nestedChangedProperty))
      }

      const nestedSummaryMaxType = this.maxDiffType([
        ...nestedNode.diffsSummary,
        ...nestedNode.descendantDiffsSummary,
      ])
      if (nestedSummaryMaxType) {
        severityCandidates.push({ type: nestedSummaryMaxType, causedAt: [] })
      }
    }

    const combinerNodeLevelDiff = combinerNode.diffs[NODE_LEVEL_DIFF_KEY]
    if (combinerNodeLevelDiff) {
      severityCandidates.push(this.buildNodeDiffsSeverityFromChangedProperty(combinerNodeLevelDiff))
    }

    const ownChangedProperties: ChangedPropertyMetaData[] = []
    for (const propertyDiff of Object.values(combinerNode.diffs)) {
      this.collectChangedPropertyMetaData(propertyDiff, ownChangedProperties)
    }
    for (const ownChangedProperty of ownChangedProperties) {
      severityCandidates.push(this.buildNodeDiffsSeverityFromChangedProperty(ownChangedProperty))
    }

    const summaryMaxType = this.maxDiffType([
      ...combinerNode.diffsSummary,
      ...combinerNode.descendantDiffsSummary,
    ])
    if (summaryMaxType) {
      severityCandidates.push({ type: summaryMaxType, causedAt: [] })
    }

    const maxSeverity = this.maxNodeDiffsSeverity(...severityCandidates)
    if (!maxSeverity) {
      const syntheticDiff = this.buildCombinerSyntheticReplaceDiff(combinerNodeLevelDiff)
      return {
        [NodeDiffsSeverityPlacemennt.TitleRow]: this.buildNodeDiffsSeverityFromDiff(syntheticDiff.data),
      }
    }

    return {
      [NodeDiffsSeverityPlacemennt.TitleRow]: maxSeverity,
    }
  }

  private static maxDiffType(types: Iterable<DiffType>): DiffType | undefined {
    let max: DiffType | undefined
    for (const type of types) {
      if (!max || AbstractNodeDiffsSeveritiesAggregator.compareDiffTypes(type, max) > 0) {
        max = type
      }
    }
    return max
  }

  /**
   * A combiner variant can itself be a nested combiner (`oneOf`/`anyOf`/`allOf` inside a
   * variant). When that nested combiner node was wholly added or removed, the structural-child
   * diff cascade already computes the correct single-side-only add/remove colorizing diff and
   * matching severity for it (`nestingIndicatorRowColorizingDiff` / `diffsSeverities[
   * NestingIndicatorRow]` - the same fields `NestingIndicatorTitleRow` consumes elsewhere), via the
   * generic parent/container diff-inheritance cascade in `JsonSchemaNodeDiffsAggregatorKindAny` -
   * this applies recursively at any nesting depth without extra wiring. Prefer that precomputed
   * data over the ad-hoc yellow "replace" fallback below, which is reserved for partial (non
   * whole-node) changes.
   */
  public static resolveCombinerSelectorRowPresentation(
    combinerNode: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
  ): CombinerSelectorRowPresentation {
    if (isJsonSchemaTreeNodeWithDiffs(combinerNode)) {
      const wholeNodeRowDiff = JsonSchemaRowDiffs.NodeLevel.takeNestingIndicatorRowColorizingDiff(combinerNode)
      if (wholeNodeRowDiff) {
        const wholeNodeSeverity = combinerNode.diffsSeverities[NodeDiffsSeverityPlacemennt.NestingIndicatorRow]
        return {
          selectorRowDiff: wholeNodeRowDiff,
          diffsSeverities: wholeNodeSeverity
            ? { [NodeDiffsSeverityPlacemennt.TitleRow]: wholeNodeSeverity }
            : undefined,
        }
      }
    }

    return {
      selectorRowDiff: this.buildCombinerSelectorRowDiff(combinerNode),
      diffsSeverities: this.buildCombinerSelectorRowDiffsSeverities(combinerNode),
    }
  }
}
