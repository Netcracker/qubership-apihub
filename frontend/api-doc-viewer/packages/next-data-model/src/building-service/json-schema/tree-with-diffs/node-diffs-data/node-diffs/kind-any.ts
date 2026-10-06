import { DiffMetaKeys } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/diff-meta-keys"
import { AbstractNodeDiffsAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-aggregator"
import { AbstractNodeDiffsSeveritiesAggregator } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator"
import { takeAggregatedDiffs } from "@apihub/next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/aggregated-diff-types"
import {
  ChangedPropertyKey,
  ChangedPropertyMetaData,
  DIFF_HIGHLIGHTING_MODES_DEFAULT,
  DiffStyles,
  HighlightVariant,
  ITreeNodeWithDiffs,
  NODE_LEVEL_DIFF_KEY,
  NodeDescendantDiffs,
  NodeDiffs,
  NodeDiffsSummary,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import {
  JSON_SCHEMA_META_FLAG_DIFF_KEYS,
  JSON_SCHEMA_TITLE_ROW_DIFF_KEY,
  JSON_SCHEMA_TYPE_LABEL_FIELD_DIFF_KEYS,
  JsonSchemaKindAnyNodeDiffs,
  JsonSchemaListValueDiffs,
  JsonSchemaMetaFlagDiffKey,
  JsonSchemaSharedRowDiffs,
  JsonSchemaTypeLabelFieldDiffKey,
  JsonSchemaTypeLabelFieldDiffs,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/property-row-diffs.types"
import {
  JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS,
  JSON_SCHEMA_VALIDATION_SOURCE_KEY_CHIP_INDEX,
  JsonSchemaValidationRowKey,
  JsonSchemaValidationRowKeys,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-source-keys"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import {
  JsonSchemaValueRangeDiffResolver,
  VALUE_RANGE_LOWER_CHIP_DIFF_KEY,
  VALUE_RANGE_UPPER_CHIP_DIFF_KEY,
} from "@apihub/next-data-model/model/json-schema/value-range-diff-side-display"
import { formatJsonSchemaValidationRowChipDisplay } from "@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-chip-display"
import {
  isJsonSchemaPrimitiveValueType,
  isJsonSchemaSpecialValueType,
} from "@apihub/next-data-model/shared/json-schema/guards/schema-value"
import { isObject } from "@apihub/next-data-model/utilities"
import { NodeKey } from "@apihub/next-data-model/utility-types"
import {
  isOpenApiExtensionKey,
  OpenApiExtensionKey,
} from "@apihub/next-data-model/shared/json-schema/types/extension-key"
import {
  Diff,
  DiffAction,
  DiffAdd,
  DiffRemove,
  DiffReplace,
  DiffType,
  isDiffAdd,
  isDiffRemove,
  isDiffRename,
  isDiffReplace,
} from "@netcracker/qubership-apihub-api-diff"

export class JsonSchemaNodeDiffsAggregatorKindAny
  extends AbstractNodeDiffsAggregator<
    JsonSchemaTreeNodeStoredValue | null,
    JsonSchemaTreeNodeKind,
    JsonSchemaTreeNodeMeta,
    JsonSchemaTreeNodeStoredValue | null
  > {
  private readonly DEFAULT_DIFF_STYLES: DiffStyles = {
    isContentVisible: true,
    isHeaderVisible: true,
  }

  public aggregate(
    crawlValue: JsonSchemaTreeNodeStoredValue | null,
    diffsMetaKeys: DiffMetaKeys,
    nodeKey: NodeKey,
    parentNode?: ITreeNodeWithDiffs<
      JsonSchemaTreeNodeStoredValue | null,
      JsonSchemaTreeNodeKind,
      JsonSchemaTreeNodeMeta,
      JsonSchemaTreeNodeStoredValue | null
    >,
    containerNode?: ITreeNodeWithDiffs<
      JsonSchemaTreeNodeStoredValue | null,
      JsonSchemaTreeNodeKind,
      JsonSchemaTreeNodeMeta,
      JsonSchemaTreeNodeStoredValue | null
    >,
  ): NodeDiffs<JsonSchemaTreeNodeStoredValue | null> | undefined {
    const { diffsMetaKey } = diffsMetaKeys

    const nodeDiffs: JsonSchemaKindAnyNodeDiffs = {}

    // Whole-node inheritance (container/parent wholly added/removed) must run for EVERY crawl
    // value shape, including primitives like the boolean `additionalProperties: false` (only
    // `additionalProperties: true` is pre-transformed into an object - see
    // additional-properties-node-value.ts). The `aggregateWholeNodeInherited*` helpers below
    // already guard internally with their own `isObject(crawlValue)` checks and safely no-op for
    // a primitive, so it's safe to reach them before the object/array guard further down - moving
    // that guard above this block would silently drop inherited whole-node styling for any
    // primitive-valued node sitting under a wholly-added/removed ancestor.
    if (containerNode) {
      const containerNodeDiff = containerNode.diffs[NODE_LEVEL_DIFF_KEY]
      if (containerNodeDiff && (isDiffAdd(containerNodeDiff.data) || isDiffRemove(containerNodeDiff.data))) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = { ...containerNodeDiff, inherited: true }
        this.aggregateWholeNodeInheritedValidationRowDiffs(crawlValue, nodeDiffs)
        this.aggregateWholeNodeInheritedExtensionsDiffs(crawlValue, nodeDiffs)
        this.aggregateWholeNodeInheritedCustomAnnotationsDiffs(crawlValue, nodeDiffs)
        return nodeDiffs
      }
      const maybeNodeDiffs = containerNode.descendantDiffs[nodeKey]
      if (maybeNodeDiffs) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = maybeNodeDiffs
        // A renamed key is still the same node: its own field diffs below apply as usual
        if (!isDiffRename(maybeNodeDiffs.data)) {
          this.aggregateWholeNodeInheritedValidationRowDiffs(crawlValue, nodeDiffs)
          this.aggregateWholeNodeInheritedExtensionsDiffs(crawlValue, nodeDiffs)
          this.aggregateWholeNodeInheritedCustomAnnotationsDiffs(crawlValue, nodeDiffs)
          return nodeDiffs
        }
      }
    } else if (parentNode) {
      const parentNodeDiff = parentNode.diffs[NODE_LEVEL_DIFF_KEY]
      if (parentNodeDiff && (isDiffAdd(parentNodeDiff.data) || isDiffRemove(parentNodeDiff.data))) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = { ...parentNodeDiff, inherited: true }
        this.aggregateWholeNodeInheritedValidationRowDiffs(crawlValue, nodeDiffs)
        this.aggregateWholeNodeInheritedExtensionsDiffs(crawlValue, nodeDiffs)
        this.aggregateWholeNodeInheritedCustomAnnotationsDiffs(crawlValue, nodeDiffs)
        return nodeDiffs
      }
      const maybeNodeDiffs = parentNode.descendantDiffs[nodeKey]
      if (maybeNodeDiffs) {
        nodeDiffs[NODE_LEVEL_DIFF_KEY] = maybeNodeDiffs
        // A renamed key is still the same node: its own field diffs below apply as usual
        if (!isDiffRename(maybeNodeDiffs.data)) {
          this.aggregateWholeNodeInheritedValidationRowDiffs(crawlValue, nodeDiffs)
          this.aggregateWholeNodeInheritedExtensionsDiffs(crawlValue, nodeDiffs)
          this.aggregateWholeNodeInheritedCustomAnnotationsDiffs(crawlValue, nodeDiffs)
          return nodeDiffs
        }
      }
    }

    // No inherited whole-node diff applies - now it's safe to fall through to this node's OWN
    // field diffs, which do need an object/array crawl value (a primitive like `false` never
    // carries its own symbol-keyed diffs record).
    if (!isObject(crawlValue) && !Array.isArray(crawlValue)) {
      if (nodeDiffs[NODE_LEVEL_DIFF_KEY]) {
        this.aggregateTitleRowDiff(nodeDiffs)
        return nodeDiffs
      }
      return undefined
    }

    const diffs = (crawlValue as Record<PropertyKey, unknown>)[diffsMetaKey]

    // `customAnnotations` diffs may live entirely inside a nested entry (see
    // `aggregateCustomAnnotationsDiffs`'s doc comment, Tiers 2/3) even when this node's OWN
    // top-level diffs record is empty (e.g. only `customAnnotations.location.value` changed).
    // So that case must not be gated behind `isDiffsRecord(diffs)` the way the rest of this
    // node's own field diffs are - mirrors how `kind-property.ts`'s `aggregate()` computes
    // `enum`/`examples` independently of `super.aggregate()`'s own top-level-diffs check.
    const validDiffs = AbstractNodeDiffsAggregator.isDiffsRecord(diffs) ? diffs : undefined

    if (validDiffs) {
      const wholeNodeDiff = validDiffs[NODE_LEVEL_DIFF_KEY]
      wholeNodeDiff && this.aggregateTextDiff(wholeNodeDiff, NODE_LEVEL_DIFF_KEY, nodeDiffs)

      const titleDiff = validDiffs["title"]
      const formatDiff = validDiffs["format"]
      const typeDiff = validDiffs["type"]
      const nullableDiff = this.normalizeNullableDiff(validDiffs["nullable"])

      this.aggregateTypeLabelFieldDiffs(
        { type: typeDiff, format: formatDiff, title: titleDiff, nullable: nullableDiff },
        nodeDiffs,
      )

      const descriptionDiff = validDiffs["description"]
      descriptionDiff && this.aggregateTextDiff(descriptionDiff, "description", nodeDiffs)

      const suppressMetaFlagDiffs = this.hasWholeNodeAddOrRemoveDiff(nodeDiffs)
      if (!suppressMetaFlagDiffs) {
        for (const metaFlagKey of JSON_SCHEMA_META_FLAG_DIFF_KEYS) {
          const metaFlagDiff = validDiffs[metaFlagKey]
          if (AbstractNodeDiffsAggregator.isDiff(metaFlagDiff)) {
            this.aggregateMetaFlagDiff(metaFlagDiff, metaFlagKey, nodeDiffs)
          }
        }
      }

      if (isObject(crawlValue)) {
        this.aggregateValidationRowDiffs(crawlValue, validDiffs, nodeDiffs)
      }

      this.aggregateExtensionsDiffs(validDiffs, nodeDiffs)
    }

    this.aggregateCustomAnnotationsDiffs(crawlValue, validDiffs ?? {}, diffsMetaKey, nodeDiffs)

    this.stripMetaFlagDiffsWhenWholeNode(nodeDiffs)
    this.aggregateTitleRowDiff(nodeDiffs)

    return Object.keys(nodeDiffs).length > 0 ? nodeDiffs : undefined
  }

  public aggregateByDescendantDiffs(
    crawlValue: object | boolean | null,
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
    nodeDescendantDiffs: NodeDescendantDiffs,
    diffMetaKeys: DiffMetaKeys,
  ): NodeDiffs<JsonSchemaTreeNodeStoredValue | null> | undefined {
    this.aggregateNestingIndicatorRowColorizingDiff(
      crawlValue,
      nodeDiffs as JsonSchemaKindAnyNodeDiffs,
      nodeDescendantDiffs,
    )
    this.aggregateExtensionsUniformRowColorizingDiff(crawlValue, nodeDiffs as JsonSchemaKindAnyNodeDiffs)
    this.aggregateNodeChangesSummary(
      crawlValue,
      nodeDiffs as JsonSchemaKindAnyNodeDiffs,
      diffMetaKeys,
    )
    return nodeDiffs
  }

  /**
   * "Node changes summary": the merged set of diff types found anywhere in this node's subtree
   * (its own diffs plus every descendant's, recursively) - excluding this node's OWN `type`/
   * `title`/`format`/`nullable` diffs (already conveyed by the always-visible type label, so
   * redundant in a collapsed-node summary marker). The own `nullable` diff is matched by its raw
   * crawl entry: the stored type-label copy is normalized (see {@link normalizeNullableDiff}), so
   * it is not the same object as the rolled-up one. A descendant's own type-label change is NOT
   * excluded - collapsing hides that descendant's row entirely, so the summary is the only
   * remaining signal.
   *
   * Reuses the document-level `aggregatedDiffsMetaKey` rollup (`takeAggregatedDiffs`) read off
   * this node's OWN `crawlValue` - since JSON Schema's crawl rules map each data-model node 1:1
   * onto the raw JSON fragment at that same path (properties/oneOf/anyOf/allOf/items entries),
   * the rollup already correctly scopes to exactly this node's subtree, with no raw-level/
   * model-level mapping needed (contrast AsyncAPI's channel/parameters case, where the mapping
   * differs).
   */
  private aggregateNodeChangesSummary(
    crawlValue: object | boolean | null,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
    diffMetaKeys: DiffMetaKeys,
  ): void {
    const ownTypeLabelDiffs = new Set<Diff<DiffType>>()
    for (const fieldDiff of Object.values(nodeDiffs.typeLabelFieldDiffs ?? {})) {
      if (fieldDiff?.data) {
        ownTypeLabelDiffs.add(fieldDiff.data)
      }
    }
    const ownDiffs = isObject(crawlValue)
      ? (crawlValue as Record<PropertyKey, unknown>)[diffMetaKeys.diffsMetaKey]
      : undefined
    const ownNullableDiff = AbstractNodeDiffsAggregator.isDiffsRecord(ownDiffs) ? ownDiffs["nullable"] : undefined
    if (AbstractNodeDiffsAggregator.isDiff(ownNullableDiff)) {
      ownTypeLabelDiffs.add(ownNullableDiff)
    }

    const summary: NodeDiffsSummary = new Set()
    for (const diff of takeAggregatedDiffs(crawlValue, diffMetaKeys)) {
      if (ownTypeLabelDiffs.has(diff)) {
        continue
      }
      if (diff?.type) {
        summary.add(diff.type)
      }
    }
    // Only assign when non-empty: an always-present key (even with an empty Set) would make
    // `Object.keys(node.diffs).length > 0` true for every node, breaking "changed only" filtering
    // (`hasOwnChangeSignals` in changed-only/has-own-change-signals.ts treats any key on
    // `node.diffs` as a change signal).
    if (summary.size > 0) {
      nodeDiffs.nodeChangesSummary = summary
    }
  }

  /**
   * Background for the nesting-indicator header row above a node's children list:
   * - node itself (or an inherited parent/container) was wholly added/removed -> reuse that
   *   whole-node diff, single-side only (green add-only / red remove-only);
   * - otherwise, every visible child was uniformly added, or uniformly removed -> synthesize
   *   the same single-side-only styling from that uniform child diff.
   * Mixed or partially-unchanged children leave the row uncolored.
   *
   * Also seeds {@link JsonSchemaKindAnyNodeDiffs.extensionsRowColorizingDiff} for the
   * `Extensions` nesting-indicator row from the first (whole-node add/remove) branch - see that
   * field's doc comment for why the type-label-replace and uniform-*schema*-children branches
   * below are deliberately excluded. The `Extensions` row's *own* uniform-children case (every
   * `x-*` extension uniformly added/removed) is a separate, narrower signal - handled by
   * {@link aggregateExtensionsUniformRowColorizingDiff}, called right after this method.
   */
  protected aggregateNestingIndicatorRowColorizingDiff(
    crawlValue: object | boolean | null,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
    nodeDescendantDiffs: NodeDescendantDiffs,
  ): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (nodeLevelDiff && (isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))) {
      const wholeNodeRowColorizingDiff = this.withNestingLevelFlags(
        this.buildWholeNodeInheritedRowColorizingDiff(nodeLevelDiff),
      )
      nodeDiffs.nestingIndicatorRowColorizingDiff = wholeNodeRowColorizingDiff
      nodeDiffs.extensionsRowColorizingDiff = wholeNodeRowColorizingDiff
      return
    }

    const typeLabelFieldDiffs = nodeDiffs.typeLabelFieldDiffs
    if (typeLabelFieldDiffs && Object.keys(typeLabelFieldDiffs).length > 0) {
      const representativeDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
        ...Object.values(typeLabelFieldDiffs),
      )
      if (representativeDiff) {
        const crossing = this.resolveTypePrimitivenessCrossing(typeLabelFieldDiffs)
        const colorizedDiff = crossing && typeLabelFieldDiffs.type
          ? this.buildTypePrimitivenessCrossingRowColorizingDiff(typeLabelFieldDiffs.type, crossing)
          : this.asReplaceRowColorizingDiff(representativeDiff)
        nodeDiffs.nestingIndicatorRowColorizingDiff = {
          ...colorizedDiff,
          flags: this.resolveTypeLabelNestingLevelFlags(typeLabelFieldDiffs),
        }
        return
      }
    }

    if (!isObject(crawlValue)) {
      return
    }

    const childKeys = this.collectJsonSchemaChildKeys(crawlValue)
    if (childKeys.length === 0) {
      return
    }

    const childDiffs = childKeys.map((key) => nodeDescendantDiffs[key])
    if (childDiffs.some((diff) => !diff)) {
      // Some child has no diff of its own (unchanged) - children are not uniformly changed.
      return
    }

    const [firstDiff, ...restDiffs] = childDiffs as ChangedPropertyMetaData[]
    if (!isDiffAdd(firstDiff.data) && !isDiffRemove(firstDiff.data)) {
      return
    }

    const firstAction = firstDiff.data.action
    const isUniform = restDiffs.every((diff) => (
      diff.data.action === firstAction && (isDiffAdd(diff.data) || isDiffRemove(diff.data))
    ))
    if (!isUniform) {
      return
    }

    nodeDiffs.nestingIndicatorRowColorizingDiff = this.withNestingLevelFlags(
      this.buildChangedPropertyMetaDataFromDiff(firstDiff.data),
    )
  }

  /**
   * Background for the `Extensions` nesting-indicator header row, for the case the owning node
   * itself was untouched but its `x-*` extensions were not: every extension present on this node
   * was uniformly added, or uniformly removed - single-side visibility only, mirroring
   * {@link aggregateNestingIndicatorRowColorizingDiff}'s uniform-children branch but scoped to
   * `extensionsDiffs` (already populated by {@link aggregateExtensionsDiffs} earlier in
   * `aggregate()`) instead of the node's schema children. No-op when the whole-node branch above
   * already populated the field, when there are no extension diffs, when they are mixed
   * add/remove/replace, or when they don't cover every extension present on the node (a genuinely
   * partial change - e.g. one `x-*` extension added while another sits unchanged alongside it -
   * must leave this row uncolored, not wholly-green/red; mirrors `kind-property.ts`'s
   * `aggregateListRowColorizingDiff` full-coverage check for enum/examples).
   */
  protected aggregateExtensionsUniformRowColorizingDiff(
    crawlValue: object | boolean | null,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    if (nodeDiffs.extensionsRowColorizingDiff) {
      return
    }

    const extensionDiffs = Object.values(nodeDiffs.extensionsDiffs ?? {}) as Diff<DiffType>[]
    if (extensionDiffs.length === 0) {
      return
    }

    const extensions = isObject(crawlValue) ? Reflect.get(crawlValue, "extensions") : undefined
    const totalExtensionCount = isObject(extensions) ? Object.keys(extensions).length : 0
    if (extensionDiffs.length !== totalExtensionCount) {
      return
    }

    const [firstDiff, ...restDiffs] = extensionDiffs
    if (!isDiffAdd(firstDiff) && !isDiffRemove(firstDiff)) {
      return
    }

    const firstAction = firstDiff.action
    const isUniform = restDiffs.every((diff) => (
      diff.action === firstAction && (isDiffAdd(diff) || isDiffRemove(diff))
    ))
    if (!isUniform) {
      return
    }

    nodeDiffs.extensionsRowColorizingDiff = this.withNestingLevelFlags(
      this.buildChangedPropertyMetaDataFromDiff(firstDiff),
    )
  }

  /**
   * Sets `flags.before/after.increaseLevel` on a nesting-indicator-row colorizing diff so the view
   * layer can decide, per side, whether to increment nesting depth or stay flat when providing
   * `AsyncLevelContext` to a node's children/nesting-indicator-row - mirrors JSO's
   * `JsoNodeDiffsAggregatorKindAny` use of the same field for the same purpose. Add: content absent
   * on origin -> freeze origin (`increaseLevel: false`), increment changed normally. Remove: mirror.
   * Replace or anything else: increment both sides normally - today's default depth behaviour,
   * unaffected. Not used for the type/format/title-replace branch - see
   * {@link resolveTypeLabelNestingLevelFlags} for that one, which additionally accounts for a
   * primitive<->complex `type` transition.
   */
  private withNestingLevelFlags(diff: ChangedPropertyMetaData): ChangedPropertyMetaData {
    const { data } = diff
    if (isDiffAdd(data)) {
      return { ...diff, flags: { before: { increaseLevel: false }, after: { increaseLevel: true } } }
    }
    if (isDiffRemove(data)) {
      return { ...diff, flags: { before: { increaseLevel: true }, after: { increaseLevel: false } } }
    }
    return { ...diff, flags: { before: { increaseLevel: true }, after: { increaseLevel: true } } }
  }

  /**
   * `flags.before/after.increaseLevel` for the type/format/title-replace nesting-indicator branch.
   * Normally both sides increment (a metadata-only rename never changes what children exist). But
   * when the `type` keyword itself flips between a childless value (a primitive - string/number/
   * integer/boolean - or the special `any`/`nothing` pseudo-types, see
   * {@link isChildlessTypeValue}) and a complex type (object/array), the childless side has no
   * real children while the complex side's children only exist because of the type change - treat
   * that exactly like Case 1's add/remove freeze: pin the childless side, increment the complex
   * side. A childless<->childless or complex<->complex change (e.g. object->array, or
   * `any`->`nothing`) leaves both sides incrementing normally, since neither side gained or lost
   * real nested content because of this change.
   */
  private resolveTypeLabelNestingLevelFlags(
    typeLabelFieldDiffs: JsonSchemaTypeLabelFieldDiffs,
  ): { before: { increaseLevel: boolean }; after: { increaseLevel: boolean } } {
    const crossing = this.resolveTypePrimitivenessCrossing(typeLabelFieldDiffs)
    if (crossing) {
      return {
        before: { increaseLevel: !crossing.beforeIsPrimitive },
        after: { increaseLevel: !crossing.afterIsPrimitive },
      }
    }
    return { before: { increaseLevel: true }, after: { increaseLevel: true } }
  }

  /**
   * True for any `type` keyword value with no real nested children: JSON Schema's actual
   * primitive types (string/number/integer/boolean) PLUS the schema-merge pipeline's special
   * `any`/`nothing` pseudo-types (see {@link isJsonSchemaSpecialValueType}) - an `allOf`-combiner
   * node whose merged type resolves to `any` (no real constraint) or `nothing` (mutually
   * exclusive branches, e.g. an `array` option intersected with a `string` option) has no genuine
   * children either. Kept as its own helper - not folded into
   * {@link isJsonSchemaPrimitiveValueType} itself - because `any`/`nothing` are not primitive
   * JSON Schema value types, only childless like primitives are; conflating the two would make
   * `isJsonSchemaPrimitiveValueType`'s own name misleading for its other callers.
   */
  private isChildlessTypeValue(type: string | undefined): boolean {
    return isJsonSchemaPrimitiveValueType(type) || isJsonSchemaSpecialValueType(type)
  }

  /**
   * Detects whether the `type` field diff (if present and a replace) crosses the childless
   * (primitive, or the special `any`/`nothing` pseudo-types)<->non-primitive boundary (vs.
   * object/array, the only types with real nested children). Shared by
   * {@link resolveTypeLabelNestingLevelFlags} (nesting-depth flags) and
   * {@link aggregateNestingIndicatorRowColorizingDiff} (row background) - both need to know
   * which side, if either, gained/lost the ability to have children. The returned field names
   * keep the historical "IsPrimitive" spelling for callers already checking it, but the boolean
   * they carry means "has no children" - true for a real primitive AND for `any`/`nothing`.
   */
  private resolveTypePrimitivenessCrossing(
    typeLabelFieldDiffs: JsonSchemaTypeLabelFieldDiffs,
  ): { beforeIsPrimitive: boolean; afterIsPrimitive: boolean } | undefined {
    const typeDiff = typeLabelFieldDiffs.type?.data
    if (!typeDiff || !isDiffReplace(typeDiff)) {
      return undefined
    }
    const beforeType = typeof typeDiff.beforeValue === "string" ? typeDiff.beforeValue : undefined
    const afterType = typeof typeDiff.afterValue === "string" ? typeDiff.afterValue : undefined
    const beforeIsPrimitive = this.isChildlessTypeValue(beforeType)
    const afterIsPrimitive = this.isChildlessTypeValue(afterType)
    if (beforeIsPrimitive === afterIsPrimitive) {
      return undefined
    }
    return { beforeIsPrimitive, afterIsPrimitive }
  }

  /**
   * Single-side add/remove colorizing for the nesting-indicator row when the `type` keyword
   * itself crosses the childless<->non-primitive boundary (e.g. `string` -> `array`, or an
   * `allOf`-combiner's merged type flipping between the special `any`/`nothing` pseudo-types and
   * `object`/`array` - e.g. `array` -> `nothing` when an incompatible `string` option is added to
   * an `allOf`) - the children row only exists on the non-primitive side, so the default
   * symmetric yellow replace background (see {@link asReplaceRowColorizingDiff}) is wrong.
   * Mirrors {@link buildWholeNodeInheritedRowColorizingDiff}'s single-side shape. Built from the
   * `type` field diff specifically (its declaration paths identify which side introduced/removed
   * the children) - not necessarily whichever field diff `maxChangedPropertyMetaDataByDiffType`
   * picked as the highest-severity "representative" across type/format/title.
   */
  private buildTypePrimitivenessCrossingRowColorizingDiff(
    typeDiff: ChangedPropertyMetaData,
    crossing: { beforeIsPrimitive: boolean; afterIsPrimitive: boolean },
  ): ChangedPropertyMetaData {
    const { data } = typeDiff
    if (!isDiffReplace(data)) {
      // Unreachable in practice - resolveTypePrimitivenessCrossing only returns a value when
      // isDiffReplace(typeDiff) already holds. Kept for TS narrowing to declarationPaths below.
      return this.asReplaceRowColorizingDiff(typeDiff)
    }
    if (!crossing.afterIsPrimitive) {
      // Non-primitive lands on the changed/after side -> children newly appear -> add.
      return this.buildChangedPropertyMetaDataFromDiff({
        type: data.type,
        scope: data.scope,
        description: data.description,
        action: DiffAction.add,
        afterValue: true,
        afterDeclarationPaths: data.afterDeclarationPaths,
      })
    }
    // Non-primitive was on the origin/before side -> children disappear -> remove.
    return this.buildChangedPropertyMetaDataFromDiff({
      type: data.type,
      scope: data.scope,
      description: data.description,
      action: DiffAction.remove,
      beforeValue: true,
      beforeDeclarationPaths: data.beforeDeclarationPaths,
    })
  }

  /** Raw-source keys that become this node's visible `childrenNodes()` (not `nestedNodes()`). */
  private collectJsonSchemaChildKeys(crawlValue: object): string[] {
    const keys: string[] = []

    const properties = Reflect.get(crawlValue, "properties")
    if (isObject(properties)) {
      keys.push(...Object.keys(properties))
    }

    const patternProperties = Reflect.get(crawlValue, "patternProperties")
    if (isObject(patternProperties)) {
      keys.push(...Object.keys(patternProperties))
    }

    const items = Reflect.get(crawlValue, "items")
    if (Array.isArray(items)) {
      items.forEach((_, index) => keys.push(String(index)))
    } else if (items !== undefined && items !== null) {
      keys.push("items")
    }

    const additionalProperties = Reflect.get(crawlValue, "additionalProperties")
    if (additionalProperties !== undefined && additionalProperties !== null) {
      keys.push("additionalProperties")
    }

    const additionalItems = Reflect.get(crawlValue, "additionalItems")
    if (additionalItems !== undefined && additionalItems !== null) {
      keys.push("additionalItems")
    }

    return keys
  }

  protected aggregateTextDiff(
    diff: Diff<DiffType>,
    key: ChangedPropertyKey<JsonSchemaTreeNodeStoredValue | null>,
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
  ): void {
    nodeDiffs[key] = this.buildChangedPropertyMetaDataFromDiff(diff)
  }

  protected aggregateMetaFlagDiff(
    diff: Diff<DiffType>,
    key: JsonSchemaMetaFlagDiffKey,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    nodeDiffs[key] = this.buildChangedPropertyMetaDataFromDiff(this.normalizeBooleanFlagDiffReplace(diff))
  }

  /**
   * OAS 3.0 `nullable` defaults to `false` and only surfaces in the type label as the ` or null`
   * suffix, so - like the meta flags (see {@link normalizeBooleanFlagDiffReplace}) - its boolean
   * replace is normalized to add/remove of that suffix. Diffs that leave the suffix unchanged on
   * both sides (absent <-> `false`) are dropped: there is nothing in the label to highlight.
   */
  private normalizeNullableDiff(diff: unknown): Diff<DiffType> | undefined {
    if (!AbstractNodeDiffsAggregator.isDiff(diff)) {
      return undefined
    }
    if (isDiffAdd(diff) && diff.afterValue !== true) {
      return undefined
    }
    if (isDiffRemove(diff) && diff.beforeValue !== true) {
      return undefined
    }
    if (isDiffReplace(diff) && !!diff.beforeValue === !!diff.afterValue) {
      return undefined
    }
    return this.normalizeBooleanFlagDiffReplace(diff)
  }

  /**
   * `readOnly`/`writeOnly`/`deprecated` default to `false` per the JSON Schema spec, so a flag
   * going from absent/false to `true` (or vice versa) surfaces from the diff engine as a boolean
   * `DiffReplace` (e.g. `beforeValue: false, afterValue: true`), not a genuine add/remove. The
   * flag BADGE (`BadgeWithDiffs`/`TagsWithDiffs`) only knows how to render add/remove - a badge
   * either appears or disappears, there is no "replace" badge chrome - so a raw replace silently
   * renders nothing (`BadgeWithDiffs` falls through to `return null` for any action other than
   * add/remove). Mirrors ddlapi's identical `normalizeFlagDiffReplace` for the exact same reason
   * (boolean row flags there - `isUnique`/`isNotNull`/`isGenerated` - have the same DiffReplace
   * shape). `asReplaceFlagDiffForTitleRow` already expects this normalized add/remove shape (its
   * `isDiffAdd`/`isDiffRemove` branches convert back to a synthetic replace for the title row) -
   * it tolerates a raw, un-normalized replace too, which is why the title row's own yellow
   * highlighting was never visibly broken by this gap, only the badge was.
   */
  private normalizeBooleanFlagDiffReplace(diff: Diff<DiffType>): Diff<DiffType> {
    if (!isDiffReplace(diff) || typeof diff.afterValue !== "boolean") {
      return diff
    }
    if (diff.afterValue) {
      return {
        type: diff.type,
        scope: diff.scope,
        description: diff.description,
        action: DiffAction.add,
        afterValue: true,
        afterDeclarationPaths: diff.afterDeclarationPaths,
      }
    }
    return {
      type: diff.type,
      scope: diff.scope,
      description: diff.description,
      action: DiffAction.remove,
      beforeValue: true,
      beforeDeclarationPaths: diff.beforeDeclarationPaths,
    }
  }

  private aggregateTypeLabelFieldDiffs(
    crawlDiffs: Partial<Record<JsonSchemaTypeLabelFieldDiffKey, Diff<DiffType>>>,
    nodeDiffs: JsonSchemaSharedRowDiffs,
  ): void {
    const typeLabelFieldDiffs: JsonSchemaTypeLabelFieldDiffs = {}

    for (const fieldKey of JSON_SCHEMA_TYPE_LABEL_FIELD_DIFF_KEYS) {
      const diff = crawlDiffs[fieldKey]
      if (!AbstractNodeDiffsAggregator.isDiff(diff)) {
        continue
      }
      typeLabelFieldDiffs[fieldKey] = this.buildTypeLabelFieldDiffMetadata(diff)
    }

    if (Object.keys(typeLabelFieldDiffs).length > 0) {
      nodeDiffs.typeLabelFieldDiffs = typeLabelFieldDiffs
    }
  }

  protected aggregateTitleRowDiff(nodeDiffs: JsonSchemaKindAnyNodeDiffs): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (nodeLevelDiff && (isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))) {
      nodeDiffs[JSON_SCHEMA_TITLE_ROW_DIFF_KEY] = nodeLevelDiff
      return
    }
    if (nodeLevelDiff && isDiffRename(nodeLevelDiff.data)) {
      nodeDiffs[JSON_SCHEMA_TITLE_ROW_DIFF_KEY] = this.asReplaceRowColorizingDiff(nodeLevelDiff)
      return
    }

    for (const flagKey of JSON_SCHEMA_META_FLAG_DIFF_KEYS) {
      const flagDiff = nodeDiffs[flagKey]
      if (flagDiff) {
        nodeDiffs[JSON_SCHEMA_TITLE_ROW_DIFF_KEY] = this.asReplaceFlagDiffForTitleRow(flagDiff)
        return
      }
    }

    this.aggregateTypeLabelTitleRowDiff(nodeDiffs)
  }

  protected aggregateTypeLabelTitleRowDiff(nodeDiffs: JsonSchemaSharedRowDiffs): void {
    const typeLabelFieldDiffs = nodeDiffs.typeLabelFieldDiffs
    if (!typeLabelFieldDiffs || Object.keys(typeLabelFieldDiffs).length === 0) {
      return
    }

    const representativeDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...Object.values(typeLabelFieldDiffs),
    )
    if (!representativeDiff) {
      return
    }

    nodeDiffs[JSON_SCHEMA_TITLE_ROW_DIFF_KEY] = this.asReplaceRowColorizingDiff(representativeDiff)
  }

  private buildTypeLabelFieldDiffMetadata(diff: Diff<DiffType>): ChangedPropertyMetaData {
    if (isDiffReplace(diff)) {
      return this.buildChipReplaceDiffMetadata(diff, {
        textHighlighterColor: HighlightVariant.Yellow,
      })
    }

    return this.buildChipAddRemoveDiffMetadata(diff, {
      addAfter: { textHighlighterColor: HighlightVariant.Green },
      removeBefore: { textHighlighterColor: HighlightVariant.Red },
    })
  }

  protected buildChangedPropertyMetaDataFromDiff(diff: Diff<DiffType>): ChangedPropertyMetaData {
    let beforeStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    let afterStyles: DiffStyles = this.DEFAULT_DIFF_STYLES
    if (isDiffAdd(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: false,
        isHeaderVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Green,
      }
    }
    if (isDiffRemove(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        isHeaderVisible: true,
        backgroundColor: HighlightVariant.Red,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: false,
        isHeaderVisible: false,
        backgroundColor: HighlightVariant.Gray,
      }
    }
    if (isDiffRename(diff) || isDiffReplace(diff)) {
      beforeStyles = {
        ...beforeStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
        textHighlighterColor: HighlightVariant.Yellow,
      }
      afterStyles = {
        ...afterStyles,
        isContentVisible: true,
        backgroundColor: HighlightVariant.Yellow,
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
        before: {
          increaseLevel: false,
        },
        after: {
          increaseLevel: false,
        },
      },
      highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
    }
  }

  protected readonly ROW_PARTIAL_CHANGE_STYLES: { before: DiffStyles; after: DiffStyles } = {
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

  protected asReplaceRowColorizingDiff(
    sourceDiff: ChangedPropertyMetaData,
  ): ChangedPropertyMetaData {
    const { data } = sourceDiff

    if (isDiffReplace(data) || isDiffRename(data)) {
      return {
        ...sourceDiff,
        styles: this.ROW_PARTIAL_CHANGE_STYLES,
      }
    }

    if (isDiffAdd(data)) {
      return {
        ...sourceDiff,
        data: {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: "replace" as const,
          beforeValue: false,
          afterValue: data.afterValue ?? true,
          beforeDeclarationPaths: [],
          afterDeclarationPaths: data.afterDeclarationPaths,
        },
        styles: this.ROW_PARTIAL_CHANGE_STYLES,
      }
    }

    if (isDiffRemove(data)) {
      return {
        ...sourceDiff,
        data: {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: "replace" as const,
          beforeValue: data.beforeValue ?? true,
          afterValue: false,
          beforeDeclarationPaths: data.beforeDeclarationPaths,
          afterDeclarationPaths: [],
        },
        styles: this.ROW_PARTIAL_CHANGE_STYLES,
      }
    }

    return sourceDiff
  }

  protected buildChipAddRemoveDiffMetadata(
    diff: Diff<DiffType>,
    chipHighlight?: {
      addAfter?: Pick<DiffStyles, "textHighlighterColor" | "borderShadowColor" | "isFontMuted">
      removeBefore?: Pick<DiffStyles, "textHighlighterColor" | "borderShadowColor" | "isFontMuted">
    },
  ): ChangedPropertyMetaData {
    if (isDiffAdd(diff)) {
      return {
        data: diff,
        styles: {
          before: {
            isContentVisible: false,
            isHeaderVisible: true,
          },
          after: {
            isContentVisible: true,
            isHeaderVisible: true,
            ...chipHighlight?.addAfter,
          },
        },
        flags: {
          before: { increaseLevel: false },
          after: { increaseLevel: false },
        },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
      }
    }

    if (isDiffRemove(diff)) {
      return {
        data: diff,
        styles: {
          before: {
            isContentVisible: true,
            isHeaderVisible: true,
            ...chipHighlight?.removeBefore,
          },
          after: {
            isContentVisible: false,
            isHeaderVisible: true,
          },
        },
        flags: {
          before: { increaseLevel: false },
          after: { increaseLevel: false },
        },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_DEFAULT,
      }
    }

    return this.buildChangedPropertyMetaDataFromDiff(diff)
  }

  protected buildChipReplaceDiffMetadata(
    diff: Diff<DiffType>,
    chipHighlight: Pick<DiffStyles, "textHighlighterColor" | "borderShadowColor">,
  ): ChangedPropertyMetaData {
    const metadata = this.buildChangedPropertyMetaDataFromDiff(diff)
    return {
      ...metadata,
      styles: {
        before: {
          ...metadata.styles.before,
          backgroundColor: undefined,
          textHighlighterColor: chipHighlight.textHighlighterColor,
          borderShadowColor: chipHighlight.borderShadowColor,
        },
        after: {
          ...metadata.styles.after,
          backgroundColor: undefined,
          textHighlighterColor: chipHighlight.textHighlighterColor,
          borderShadowColor: chipHighlight.borderShadowColor,
        },
      },
    }
  }

  /**
   * Chip replace-diff styling for a value that may itself be a JS boolean (Default, Enum/
   * Examples items, scalar validation-row values like `uniqueItems`) - per side, a boolean
   * value gets `borderShadowColor` instead of `textHighlighterColor` (matches DDL's
   * `TypeKind.BoolType` column-default rule and JSO's predefined-value-set rule). Checking the
   * diff's own before/after value (not the owning node's `type` keyword) is what lets this
   * correctly cover `uniqueItems`-style keywords whose value is always boolean regardless of
   * the owning node's own type.
   */
  protected buildBooleanAwareChipReplaceDiffMetadata(
    diff: DiffReplace<DiffType>,
  ): ChangedPropertyMetaData {
    const metadata = this.buildChangedPropertyMetaDataFromDiff(diff)
    const beforeIsBoolean = typeof diff.beforeValue === "boolean"
    const afterIsBoolean = typeof diff.afterValue === "boolean"
    return {
      ...metadata,
      styles: {
        before: {
          ...metadata.styles.before,
          backgroundColor: undefined,
          textHighlighterColor: beforeIsBoolean ? undefined : HighlightVariant.Yellow,
          borderShadowColor: beforeIsBoolean ? HighlightVariant.Yellow : undefined,
        },
        after: {
          ...metadata.styles.after,
          backgroundColor: undefined,
          textHighlighterColor: afterIsBoolean ? undefined : HighlightVariant.Yellow,
          borderShadowColor: afterIsBoolean ? HighlightVariant.Yellow : undefined,
        },
      },
    }
  }

  protected buildWholeNodeInheritedRowColorizingDiff(
    nodeLevelDiff: ChangedPropertyMetaData,
  ): ChangedPropertyMetaData {
    const { data } = nodeLevelDiff

    if (isDiffAdd(data)) {
      return this.buildChangedPropertyMetaDataFromDiff({
        type: data.type,
        scope: data.scope,
        description: data.description,
        action: DiffAction.add,
        afterValue: true,
        afterDeclarationPaths: data.afterDeclarationPaths ?? [],
      })
    }

    if (isDiffRemove(data)) {
      return this.buildChangedPropertyMetaDataFromDiff({
        type: data.type,
        scope: data.scope,
        description: data.description,
        action: DiffAction.remove,
        beforeValue: true,
        beforeDeclarationPaths: data.beforeDeclarationPaths ?? [],
      })
    }

    return nodeLevelDiff
  }

  protected hasWholeNodeAddOrRemoveDiff(
    nodeDiffs: NodeDiffs<JsonSchemaTreeNodeStoredValue | null>,
  ): boolean {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    return !!nodeLevelDiff && (isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))
  }

  protected stripMetaFlagDiffsWhenWholeNode(nodeDiffs: JsonSchemaKindAnyNodeDiffs): void {
    if (!this.hasWholeNodeAddOrRemoveDiff(nodeDiffs)) {
      return
    }

    for (const metaFlagKey of JSON_SCHEMA_META_FLAG_DIFF_KEYS) {
      delete nodeDiffs[metaFlagKey]
    }
  }

  protected readonly TITLE_ROW_FLAG_AS_REPLACE_STYLES: { before: DiffStyles; after: DiffStyles } = {
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

  protected asReplaceFlagDiffForTitleRow(
    flagDiff: ChangedPropertyMetaData,
  ): ChangedPropertyMetaData {
    const { data } = flagDiff

    if (isDiffReplace(data)) {
      return {
        ...flagDiff,
        styles: this.TITLE_ROW_FLAG_AS_REPLACE_STYLES,
      }
    }

    if (isDiffAdd(data)) {
      return {
        ...flagDiff,
        data: {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.replace,
          beforeValue: false,
          afterValue: data.afterValue ?? true,
          beforeDeclarationPaths: [],
          afterDeclarationPaths: data.afterDeclarationPaths,
        },
        styles: this.TITLE_ROW_FLAG_AS_REPLACE_STYLES,
      }
    }

    if (isDiffRemove(data)) {
      return {
        ...flagDiff,
        data: {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.replace,
          beforeValue: data.beforeValue ?? true,
          afterValue: false,
          beforeDeclarationPaths: data.beforeDeclarationPaths,
          afterDeclarationPaths: [],
        },
        styles: this.TITLE_ROW_FLAG_AS_REPLACE_STYLES,
      }
    }

    return flagDiff
  }

  /**
   * Background for validation-constraint rows (`Value range`, `Value length`, `Properties count`,
   * `Items count`, `Unique items`, ...) when the whole node is inherited-added/removed from an
   * ancestor container/parent - the node's own crawl fragment carries no per-field diffs in that
   * case, so paint every row whose source keys are present with the single whole-node diff color.
   */
  private aggregateWholeNodeInheritedValidationRowDiffs(
    crawlValue: JsonSchemaTreeNodeStoredValue | null,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff || !(isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))) {
      return
    }
    if (!isObject(crawlValue)) {
      return
    }

    for (const [rowKey, sourceKeys] of Object.entries(JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS)) {
      const validationRowKey = rowKey as JsonSchemaValidationRowKey
      const hasRowContent = sourceKeys.some((sourceKey) => Reflect.get(crawlValue, sourceKey) !== undefined)
      if (!hasRowContent) {
        continue
      }

      nodeDiffs.validationRowColorizingDiffs ??= {}

      if (!nodeDiffs.validationRowColorizingDiffs[validationRowKey]) {
        nodeDiffs.validationRowColorizingDiffs[validationRowKey] =
          this.buildWholeNodeInheritedRowColorizingDiff(nodeLevelDiff)
      }
    }
  }

  /**
   * Background/content for the "Extensions" section when the whole node is inherited-added/
   * removed from an ancestor container/parent - the node's own crawl fragment carries no
   * per-field diffs in that case, so synthesize a uniform add/remove diff (keeping each
   * extension's real value, not a placeholder) for every extension key present on the merged
   * fragment. Mirrors {@link aggregateWholeNodeInheritedValidationRowDiffs}.
   */
  private aggregateWholeNodeInheritedExtensionsDiffs(
    crawlValue: JsonSchemaTreeNodeStoredValue | null,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff || !(isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))) {
      return
    }
    if (!isObject(crawlValue)) {
      return
    }

    const extensions = Reflect.get(crawlValue, "extensions")
    if (!isObject(extensions)) {
      return
    }

    const extensionKeys = Object.keys(extensions).filter(isOpenApiExtensionKey)
    if (extensionKeys.length === 0) {
      return
    }

    const { data } = nodeLevelDiff
    const extensionValues = extensions as Record<OpenApiExtensionKey, unknown>
    const extensionsDiffs: Partial<Record<OpenApiExtensionKey, Diff<DiffType>>> = {}

    if (isDiffAdd(data)) {
      for (const key of extensionKeys) {
        extensionsDiffs[key] = {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.add,
          afterValue: extensionValues[key],
          afterDeclarationPaths: data.afterDeclarationPaths ?? [],
        }
      }
    } else if (isDiffRemove(data)) {
      for (const key of extensionKeys) {
        extensionsDiffs[key] = {
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.remove,
          beforeValue: extensionValues[key],
          beforeDeclarationPaths: data.beforeDeclarationPaths ?? [],
        }
      }
    }

    nodeDiffs.extensionsDiffs = extensionsDiffs
  }

  /**
   * Per-key diffs for specification-extension (`x-*`) properties, read directly off the raw
   * crawl diffs record (keyed by the ORIGINAL property name, same as `title`/`type`/etc. above -
   * `transformJsonSchemaExtensions` preserves the symbol-keyed diffs record verbatim when it
   * reshapes extension keys into the flattened `extensions` value). Kept as raw `Diff` objects for
   * the view layer to re-embed onto `extensions` under the tree's `diffsMetaKey`, so `JsoDiffsViewer`
   * (an independent JSON diff engine) can render add/remove/replace for each extension itself.
   */
  private aggregateExtensionsDiffs(
    diffs: Partial<Record<string, Diff<DiffType>>>,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    const extensionsDiffs: Partial<Record<OpenApiExtensionKey, Diff<DiffType>>> = {}
    for (const [key, diff] of Object.entries(diffs)) {
      if (!isOpenApiExtensionKey(key) || !AbstractNodeDiffsAggregator.isDiff(diff)) {
        continue
      }
      extensionsDiffs[key] = diff
    }
    if (Object.keys(extensionsDiffs).length > 0) {
      nodeDiffs.extensionsDiffs = extensionsDiffs
    }
  }

  /**
   * Per-key diffs for `customAnnotations` entries - a generic extension point letting a
   * consuming spec (e.g. AsyncAPI's "Location") attach a labeled, diff-aware value to any node
   * without this layer ever knowing the spec-specific concept by name.
   *
   * `customAnnotations` is an unrecognized property as far as the diff engine is concerned, so it
   * follows plain structural JSON diffing rather than a fixed convention - confirmed empirically
   * (see session notes) to land at one of three different depths depending on how much structure
   * matches between the before/after sides:
   * 1. Whole `customAnnotations` key added/removed as a unit (absent on one side entirely) ->
   *    `diffs["customAnnotations"]` on this node's own raw diffs record, `before`/`afterValue`
   *    holding the *entire* entries map.
   * 2. A single key added/removed within an otherwise-structurally-matching `customAnnotations`
   *    object -> `customAnnotations[diffsMetaKey][key]`, mirroring `enum`/`examples`'s per-item
   *    diffs convention.
   * 3. An existing entry's `.value` replaced (key present, same shape, on both sides) -> the diff
   *    recurses one level further, landing on `entry[diffsMetaKey].value`.
   * Checked in that order, per key, mirroring ddlapi's own multi-depth `resolveDefaultValueDiff`
   * fallback chain for the same underlying reason (structural JSON diffing, not a single fixed
   * attachment point).
   */
  private aggregateCustomAnnotationsDiffs(
    crawlValue: JsonSchemaTreeNodeStoredValue | null,
    diffs: Partial<Record<string, Diff<DiffType>>>,
    diffsMetaKey: symbol,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    const chipDiffs: Partial<Record<string, ChangedPropertyMetaData>> = {}
    const colorizingDiffs: Partial<Record<string, ChangedPropertyMetaData>> = {}

    const setEntry = (key: string, fieldDiff: Diff<DiffType>): void => {
      if (isDiffReplace(fieldDiff)) {
        const chipDiff = this.buildBooleanAwareChipReplaceDiffMetadata(fieldDiff)
        chipDiffs[key] = chipDiff
        colorizingDiffs[key] = this.asReplaceRowColorizingDiff(chipDiff)
        return
      }
      const metadata = this.buildChangedPropertyMetaDataFromDiff(fieldDiff)
      chipDiffs[key] = metadata
      colorizingDiffs[key] = metadata
    }

    // Tier 1: whole `customAnnotations` key added/removed as a unit.
    const wholeDiff = diffs["customAnnotations"]
    if (AbstractNodeDiffsAggregator.isDiff(wholeDiff)) {
      const { type, scope, description } = wholeDiff
      if (isDiffAdd(wholeDiff) && isObject(wholeDiff.afterValue)) {
        for (const [key, entry] of Object.entries(wholeDiff.afterValue as Record<string, { value?: unknown }>)) {
          setEntry(key, {
            type, scope, description,
            action: DiffAction.add,
            afterValue: entry?.value,
            afterDeclarationPaths: wholeDiff.afterDeclarationPaths ?? [],
          })
        }
      } else if (isDiffRemove(wholeDiff) && isObject(wholeDiff.beforeValue)) {
        for (const [key, entry] of Object.entries(wholeDiff.beforeValue as Record<string, { value?: unknown }>)) {
          setEntry(key, {
            type, scope, description,
            action: DiffAction.remove,
            beforeValue: entry?.value,
            beforeDeclarationPaths: wholeDiff.beforeDeclarationPaths ?? [],
          })
        }
      }
      this.assignCustomAnnotationDiffs(nodeDiffs, chipDiffs, colorizingDiffs)
      return
    }

    // Tiers 2/3: `customAnnotations` exists (structurally) on both sides - check each merged
    // key for a per-key add/remove diff first, then an entry-level `.value` replace diff.
    if (!isObject(crawlValue)) {
      return
    }
    const customAnnotations = Reflect.get(crawlValue, "customAnnotations")
    if (!isObject(customAnnotations)) {
      return
    }

    const perKeyDiffs = Reflect.get(customAnnotations, diffsMetaKey)
    const perKeyDiffsRecord = AbstractNodeDiffsAggregator.isDiffsRecord(perKeyDiffs) ? perKeyDiffs : {}

    for (const key of Object.keys(customAnnotations)) {
      const keyDiff = perKeyDiffsRecord[key]
      if (AbstractNodeDiffsAggregator.isDiff(keyDiff)) {
        setEntry(key, keyDiff)
        continue
      }

      const entry = Reflect.get(customAnnotations, key)
      if (!isObject(entry)) {
        continue
      }
      const entryDiffs = Reflect.get(entry, diffsMetaKey)
      const valueDiff = AbstractNodeDiffsAggregator.isDiffsRecord(entryDiffs) ? entryDiffs.value : undefined
      if (AbstractNodeDiffsAggregator.isDiff(valueDiff)) {
        setEntry(key, valueDiff)
      }
    }

    this.assignCustomAnnotationDiffs(nodeDiffs, chipDiffs, colorizingDiffs)
  }

  private assignCustomAnnotationDiffs(
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
    chipDiffs: Partial<Record<string, ChangedPropertyMetaData>>,
    colorizingDiffs: Partial<Record<string, ChangedPropertyMetaData>>,
  ): void {
    if (Object.keys(chipDiffs).length > 0) {
      nodeDiffs.customAnnotationDiffs = chipDiffs
    }
    if (Object.keys(colorizingDiffs).length > 0) {
      nodeDiffs.customAnnotationRowColorizingDiffs = colorizingDiffs
    }
  }

  /**
   * Synthesizes uniform add/remove diffs (with the entry's real value, not a placeholder) for
   * every `customAnnotations` key present on the merged fragment, when the owning node itself is
   * inherited-added/removed from a parent/container. Mirrors
   * {@link aggregateWholeNodeInheritedExtensionsDiffs}.
   */
  private aggregateWholeNodeInheritedCustomAnnotationsDiffs(
    crawlValue: JsonSchemaTreeNodeStoredValue | null,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    const nodeLevelDiff = nodeDiffs[NODE_LEVEL_DIFF_KEY]
    if (!nodeLevelDiff || !(isDiffAdd(nodeLevelDiff.data) || isDiffRemove(nodeLevelDiff.data))) {
      return
    }
    if (!isObject(crawlValue)) {
      return
    }

    const customAnnotations = Reflect.get(crawlValue, "customAnnotations")
    if (!isObject(customAnnotations)) {
      return
    }

    const annotationKeys = Object.keys(customAnnotations)
    if (annotationKeys.length === 0) {
      return
    }

    const { data } = nodeLevelDiff
    const annotationEntries = customAnnotations as Record<string, { value?: unknown }>
    const customAnnotationDiffs: Partial<Record<string, ChangedPropertyMetaData>> = {}

    if (isDiffAdd(data)) {
      for (const key of annotationKeys) {
        customAnnotationDiffs[key] = this.buildChangedPropertyMetaDataFromDiff({
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.add,
          afterValue: annotationEntries[key]?.value,
          afterDeclarationPaths: data.afterDeclarationPaths ?? [],
        })
      }
    } else if (isDiffRemove(data)) {
      for (const key of annotationKeys) {
        customAnnotationDiffs[key] = this.buildChangedPropertyMetaDataFromDiff({
          type: data.type,
          scope: data.scope,
          description: data.description,
          action: DiffAction.remove,
          beforeValue: annotationEntries[key]?.value,
          beforeDeclarationPaths: data.beforeDeclarationPaths ?? [],
        })
      }
    }

    if (Object.keys(customAnnotationDiffs).length > 0) {
      nodeDiffs.customAnnotationDiffs = customAnnotationDiffs
      nodeDiffs.customAnnotationRowColorizingDiffs = customAnnotationDiffs
    }
  }

  private aggregateValidationRowDiffs(
    crawlValue: object,
    crawlDiffs: Partial<Record<string, Diff<DiffType>>>,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
  ): void {
    for (const [rowKey, sourceKeys] of Object.entries(JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS)) {
      const activeSourceKeys = sourceKeys.filter((sourceKey) => crawlDiffs[sourceKey])
      if (activeSourceKeys.length === 0) {
        continue
      }

      const validationRowKey = rowKey as JsonSchemaValidationRowKey
      const valueRangeCrawlDiffs = validationRowKey === JsonSchemaValidationRowKeys.VALUE_RANGE
        ? {
          minimum: crawlDiffs.minimum,
          exclusiveMinimum: crawlDiffs.exclusiveMinimum,
          maximum: crawlDiffs.maximum,
          exclusiveMaximum: crawlDiffs.exclusiveMaximum,
        }
        : undefined

      if (valueRangeCrawlDiffs) {
        nodeDiffs.valueRangeCrawlDiffs = valueRangeCrawlDiffs
      }

      const semanticKeys = validationRowKey === JsonSchemaValidationRowKeys.VALUE_RANGE
        ? JsonSchemaValueRangeDiffResolver.filterValueRangeSemanticSourceKeys(activeSourceKeys, crawlDiffs)
        : activeSourceKeys

      const rowDiffs = activeSourceKeys
        .map((sourceKey) => crawlDiffs[sourceKey])
        .filter((diff): diff is Diff<DiffType> => AbstractNodeDiffsAggregator.isDiff(diff))

      if (rowDiffs.length === 0) {
        continue
      }

      nodeDiffs.validationRowColorizingDiffs ??= {}

      const valueRangeSideInput = JsonSchemaValueRangeDiffResolver.resolveValueRangeSideInputFromNodeValue(crawlValue)

      const valueRangeWholeRowAction = valueRangeCrawlDiffs
        ? JsonSchemaValueRangeDiffResolver.classifyValueRangeWholeRowAction(valueRangeSideInput, valueRangeCrawlDiffs)
        : undefined

      if (
        valueRangeCrawlDiffs
        && (valueRangeWholeRowAction === DiffAction.add || valueRangeWholeRowAction === DiffAction.remove)
      ) {
        const syntheticDiff = valueRangeWholeRowAction === DiffAction.add
          ? this.mergeDiffActionFragment(
            rowDiffs,
            DiffAction.add,
            this.resolveWholeRowDisplayValues(validationRowKey, activeSourceKeys, rowDiffs, DiffAction.add),
          ) as DiffAdd
          : this.mergeDiffActionFragment(
            rowDiffs,
            DiffAction.remove,
            this.resolveWholeRowDisplayValues(validationRowKey, activeSourceKeys, rowDiffs, DiffAction.remove),
          ) as DiffRemove
        const syntheticRowDiff = this.buildChangedPropertyMetaDataFromDiff(syntheticDiff)
        nodeDiffs.validationRowDiffs ??= {}
        nodeDiffs.validationRowDiffs[validationRowKey] = syntheticRowDiff
        nodeDiffs.validationRowColorizingDiffs[validationRowKey] = syntheticRowDiff
        continue
      }

      if (
        valueRangeCrawlDiffs
        && JsonSchemaValueRangeDiffResolver.isValueRangePartialBoundChange(valueRangeSideInput, valueRangeCrawlDiffs)
      ) {
        this.mergeValueRangeLabelChipDiffs(crawlValue, valueRangeCrawlDiffs, nodeDiffs, validationRowKey)
        this.applyValueRangeFormattingRowColorizingDiff(
          activeSourceKeys,
          crawlDiffs,
          nodeDiffs,
          validationRowKey,
        )
        continue
      }

      // A row is only genuinely wholly added/removed if none of its OTHER source keys already
      // carry unchanged content - e.g. `maxItems` added while `minItems` is pre-existing and
      // untouched is a partial row change (should fall through to the replace path below,
      // with `maxItems`'s own chip highlighted via add/remove borderShadowColor), not a
      // whole-row add. Without this guard, `rowDiffs.every(isDiffAdd)` trivially passes for a
      // single newly-active key even though the row already existed.
      const rowHasOtherUnchangedContent = sourceKeys.some((sourceKey) => (
        !activeSourceKeys.includes(sourceKey) && Reflect.get(crawlValue, sourceKey) !== undefined
      ))

      const allAdd = !rowHasOtherUnchangedContent && rowDiffs.every(isDiffAdd)
      const allRemove = !rowHasOtherUnchangedContent && rowDiffs.every(isDiffRemove)

      if (allAdd) {
        const displayValues = this.resolveWholeRowDisplayValues(
          validationRowKey,
          activeSourceKeys,
          rowDiffs,
          DiffAction.add,
        )
        const syntheticRowDiff = this.buildChangedPropertyMetaDataFromDiff(this.mergeDiffActionFragment(
          rowDiffs,
          DiffAction.add,
          displayValues,
        ) as DiffAdd)
        nodeDiffs.validationRowDiffs ??= {}
        nodeDiffs.validationRowDiffs[validationRowKey] = syntheticRowDiff
        nodeDiffs.validationRowColorizingDiffs[validationRowKey] = syntheticRowDiff
        continue
      }

      if (allRemove) {
        const displayValues = this.resolveWholeRowDisplayValues(
          validationRowKey,
          activeSourceKeys,
          rowDiffs,
          DiffAction.remove,
        )
        const syntheticRowDiff = this.buildChangedPropertyMetaDataFromDiff(this.mergeDiffActionFragment(
          rowDiffs,
          DiffAction.remove,
          displayValues,
        ) as DiffRemove)
        nodeDiffs.validationRowDiffs ??= {}
        nodeDiffs.validationRowDiffs[validationRowKey] = syntheticRowDiff
        nodeDiffs.validationRowColorizingDiffs[validationRowKey] = syntheticRowDiff
        continue
      }

      if (semanticKeys.length === 0) {
        if (valueRangeCrawlDiffs) {
          this.mergeValueRangeLabelChipDiffs(crawlValue, valueRangeCrawlDiffs, nodeDiffs, validationRowKey)
          this.applyValueRangeFormattingRowColorizingDiff(
            activeSourceKeys,
            crawlDiffs,
            nodeDiffs,
            validationRowKey,
          )
        }
        continue
      }

      const metadatas = semanticKeys
        .map((sourceKey) => crawlDiffs[sourceKey])
        .filter((diff): diff is Diff<DiffType> => AbstractNodeDiffsAggregator.isDiff(diff))
        .map((diff) => this.buildChangedPropertyMetaDataFromDiff(diff))
      const representativeDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
        ...metadatas,
      )
      if (!representativeDiff) {
        continue
      }

      const valueDiffs = this.buildValidationRowValueDiffs(
        validationRowKey,
        semanticKeys,
        crawlDiffs,
      )

      nodeDiffs.validationRowValueDiffs ??= {}
      nodeDiffs.validationRowValueDiffs[validationRowKey] = valueDiffs
      nodeDiffs.validationRowColorizingDiffs[validationRowKey] =
        this.asReplaceRowColorizingDiff(representativeDiff)

      if (valueRangeCrawlDiffs) {
        this.mergeValueRangeLabelChipDiffs(crawlValue, valueRangeCrawlDiffs, nodeDiffs, validationRowKey)
      }
    }
  }

  private mergeValueRangeLabelChipDiffs(
    crawlValue: object,
    valueRangeCrawlDiffs: NonNullable<JsonSchemaKindAnyNodeDiffs["valueRangeCrawlDiffs"]>,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
    validationRowKey: JsonSchemaValidationRowKey,
  ): void {
    const chipStringDiffs = JsonSchemaValueRangeDiffResolver.buildValueRangeChipStringDiffs(
      JsonSchemaValueRangeDiffResolver.resolveValueRangeSideInputFromNodeValue(crawlValue),
      valueRangeCrawlDiffs,
    )
    const chipDiffKeys = [VALUE_RANGE_LOWER_CHIP_DIFF_KEY, VALUE_RANGE_UPPER_CHIP_DIFF_KEY] as const
    const hasChipStringDiffs = chipDiffKeys.some((key) => chipStringDiffs[key])
    if (!hasChipStringDiffs) {
      return
    }

    nodeDiffs.validationRowValueDiffs ??= {}
    const existingValueDiffs = nodeDiffs.validationRowValueDiffs[validationRowKey] ?? {}
    const mergedValueDiffs: JsonSchemaListValueDiffs = { ...existingValueDiffs }

    for (const chipDiffKey of chipDiffKeys) {
      const chipDiff = chipStringDiffs[chipDiffKey]
      if (!chipDiff || mergedValueDiffs[chipDiffKey]) {
        continue
      }
      const slot = chipDiffKey === VALUE_RANGE_LOWER_CHIP_DIFF_KEY ? "lower" : "upper"
      const chipDiffWithPaths = this.attachValueRangeChipDiffPaths(chipDiff, slot, valueRangeCrawlDiffs)
      mergedValueDiffs[chipDiffKey] = this.buildValueRangeLabelChipDiffMetadata(chipDiffWithPaths)
    }

    nodeDiffs.validationRowValueDiffs[validationRowKey] = mergedValueDiffs
  }

  private applyValueRangeFormattingRowColorizingDiff(
    activeSourceKeys: readonly string[],
    crawlDiffs: Partial<Record<string, Diff<DiffType>>>,
    nodeDiffs: JsonSchemaKindAnyNodeDiffs,
    validationRowKey: JsonSchemaValidationRowKey,
  ): void {
    const chipValueDiffs = nodeDiffs.validationRowValueDiffs?.[validationRowKey]
    if (!chipValueDiffs || !Object.values(chipValueDiffs).some((diff) => diff !== undefined)) {
      return
    }

    const crawlDiffList = activeSourceKeys
      .map((sourceKey) => crawlDiffs[sourceKey])
      .filter((diff): diff is Diff<DiffType> => AbstractNodeDiffsAggregator.isDiff(diff))
    if (crawlDiffList.length === 0) {
      return
    }

    const metadatas = crawlDiffList.map((diff) => this.buildChangedPropertyMetaDataFromDiff(diff))
    const representativeDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
      ...metadatas,
    )
    if (!representativeDiff) {
      return
    }

    nodeDiffs.validationRowColorizingDiffs![validationRowKey] =
      this.asReplaceRowColorizingDiff(representativeDiff)
  }

  private attachValueRangeChipDiffPaths(
    chipDiff: DiffAdd | DiffRemove | DiffReplace,
    slot: "lower" | "upper",
    valueRangeCrawlDiffs: NonNullable<JsonSchemaKindAnyNodeDiffs["valueRangeCrawlDiffs"]>,
  ): DiffAdd | DiffRemove | DiffReplace {
    const sourceDiffs = slot === "lower"
      ? [valueRangeCrawlDiffs.minimum, valueRangeCrawlDiffs.exclusiveMinimum]
      : [valueRangeCrawlDiffs.maximum, valueRangeCrawlDiffs.exclusiveMaximum]

    const beforeDeclarationPaths: DiffRemove["beforeDeclarationPaths"] = []
    const afterDeclarationPaths: DiffAdd["afterDeclarationPaths"] = []

    for (const sourceDiff of sourceDiffs) {
      if (!sourceDiff) {
        continue
      }
      if ("beforeDeclarationPaths" in sourceDiff && sourceDiff.beforeDeclarationPaths) {
        beforeDeclarationPaths.push(...sourceDiff.beforeDeclarationPaths)
      }
      if ("afterDeclarationPaths" in sourceDiff && sourceDiff.afterDeclarationPaths) {
        afterDeclarationPaths.push(...sourceDiff.afterDeclarationPaths)
      }
    }

    return {
      ...chipDiff,
      ...(beforeDeclarationPaths.length > 0 ? { beforeDeclarationPaths } : {}),
      ...(afterDeclarationPaths.length > 0 ? { afterDeclarationPaths } : {}),
    }
  }

  private buildValueRangeLabelChipDiffMetadata(
    diff: DiffAdd | DiffRemove | DiffReplace,
  ): ChangedPropertyMetaData {
    if (isDiffReplace(diff)) {
      // Legacy draft-04 schemas can express exclusiveMinimum/exclusiveMaximum as booleans.
      return this.buildBooleanAwareChipReplaceDiffMetadata(diff)
    }
    return this.buildChipAddRemoveDiffMetadata(diff, {
      addAfter: { borderShadowColor: HighlightVariant.Green },
      removeBefore: { borderShadowColor: HighlightVariant.Red, isFontMuted: true },
    })
  }

  private buildValidationRowValueDiffs(
    rowKey: JsonSchemaValidationRowKey,
    activeSourceKeys: readonly string[],
    crawlDiffs: Partial<Record<string, Diff<DiffType>>>,
  ): JsonSchemaListValueDiffs {
    const chipIndexBySourceKey = JSON_SCHEMA_VALIDATION_SOURCE_KEY_CHIP_INDEX[rowKey]
    const itemDiffs: JsonSchemaListValueDiffs = {}

    for (const sourceKey of activeSourceKeys) {
      const diff = crawlDiffs[sourceKey]
      if (!AbstractNodeDiffsAggregator.isDiff(diff)) {
        continue
      }
      const chipIndex = chipIndexBySourceKey[sourceKey]
      if (chipIndex === undefined) {
        continue
      }
      const metadata = this.buildListValueDiffMetadata(diff)
      itemDiffs[sourceKey] = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(
        itemDiffs[sourceKey],
        metadata,
      ) ?? metadata
    }

    return itemDiffs
  }

  /** Formats the row's chip texts for the transitioning side, so the whole-row entry keeps the actual before/after values instead of losing them to a null placeholder. */
  private resolveWholeRowDisplayValues(
    rowKey: JsonSchemaValidationRowKey,
    activeSourceKeys: readonly string[],
    rowDiffs: readonly Diff<DiffType>[],
    action: typeof DiffAction.add | typeof DiffAction.remove,
  ): string[] {
    const displayValues: string[] = []
    activeSourceKeys.forEach((sourceKey, index) => {
      const diff = rowDiffs[index]
      const rawValue = action === DiffAction.add
        ? (isDiffAdd(diff) ? diff.afterValue : undefined)
        : (isDiffRemove(diff) ? diff.beforeValue : undefined)
      if (rawValue === undefined) {
        return
      }
      displayValues.push(formatJsonSchemaValidationRowChipDisplay(rowKey, sourceKey, rawValue))
    })
    return displayValues
  }

  private mergeDiffActionFragment(
    rowDiffs: Diff<DiffType>[],
    action: typeof DiffAction.add | typeof DiffAction.remove,
    displayValues: string[],
  ): DiffAdd | DiffRemove {
    const representative = rowDiffs[0]
    const beforeDeclarationPaths = rowDiffs.flatMap((diff) => (
      isDiffRemove(diff) || isDiffReplace(diff) ? diff.beforeDeclarationPaths : []
    ))
    const afterDeclarationPaths = rowDiffs.flatMap((diff) => (
      isDiffAdd(diff) || isDiffReplace(diff) ? diff.afterDeclarationPaths : []
    ))

    if (action === DiffAction.add) {
      return {
        type: representative.type,
        scope: representative.scope,
        description: representative.description,
        action: DiffAction.add,
        afterValue: displayValues,
        afterDeclarationPaths,
      }
    }

    return {
      type: representative.type,
      scope: representative.scope,
      description: representative.description,
      action: DiffAction.remove,
      beforeValue: displayValues,
      beforeDeclarationPaths,
    }
  }

  /** Shared by validation-row and enum/examples list-item chip diffing (kind-property). */
  protected buildListValueDiffMetadata(diff: Diff<DiffType>): ChangedPropertyMetaData {
    if (isDiffReplace(diff)) {
      return this.buildBooleanAwareChipReplaceDiffMetadata(diff)
    }

    return this.buildChipAddRemoveDiffMetadata(diff, {
      addAfter: { borderShadowColor: HighlightVariant.Green },
      removeBefore: { borderShadowColor: HighlightVariant.Red, isFontMuted: true },
    })
  }
}
