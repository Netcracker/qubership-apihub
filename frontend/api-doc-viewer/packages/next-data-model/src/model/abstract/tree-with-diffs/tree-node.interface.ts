import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { Diff, DiffType } from "@netcracker/qubership-apihub-api-diff";
import { JsonPath } from "@netcracker/qubership-apihub-json-crawl";
import { ITreeNode, TreeNodeComplexityTypes, TreeNodeParams } from "../tree/tree-node.interface";

export interface TreeNodeWithDiffsParams<
  V extends object | boolean | null,
  K extends string,
  M extends object,
  D extends object | boolean | null,
> extends TreeNodeParams<V, K, M> {
  parent: ITreeNodeWithDiffs<V, K, M, D> | null
  container: ITreeNodeWithDiffs<V, K, M, D> | null
}

export interface SimpleTreeNodeWithDiffsParams<
  V extends object | boolean | null,
  K extends string,
  M extends object,
  D extends object | boolean | null,
> extends TreeNodeWithDiffsParams<V, K, M, D> {
  type: typeof TreeNodeComplexityTypes.SIMPLE
}

export interface ComplexTreeNodeWithDiffsParams<
  V extends object | boolean | null,
  K extends string,
  M extends object,
  D extends object | boolean | null,
> extends TreeNodeWithDiffsParams<V, K, M, D> {
  type: typeof TreeNodeComplexityTypes.COMPLEX
}

export enum HighlightVariant {
  Red = 'red',
  Green = 'green',
  Yellow = 'yellow',
  Gray = 'gray',
}
export type DiffStyles = {
  isContentVisible: boolean
  isHeaderVisible: boolean
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  backgroundColor?: HighlightVariant
  borderShadowColor?: HighlightVariant
  isFontMuted?: boolean
}
export type DiffFlags = {
  increaseLevel: boolean
}

export enum DiffHiglightingApplicationArea {
  Default = 'default',
  JsoPropertyKey = 'jso-property-key',
  JsoPropertyValue = 'jso-property-value',
}
export enum DiffHighlightingApplicationMode {
  Default = 'default',
  Immutable = 'immutable',
  Invisible = 'invisible',
}
export type DiffHighlightingModesByArea = Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>
export const DIFF_HIGHLIGHTING_MODES_DEFAULT: DiffHighlightingModesByArea = new Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>([
  [DiffHiglightingApplicationArea.Default, DiffHighlightingApplicationMode.Default],
])
export const DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_DIRECTLY: DiffHighlightingModesByArea = new Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>([
  [DiffHiglightingApplicationArea.JsoPropertyKey, DiffHighlightingApplicationMode.Invisible],
  [DiffHiglightingApplicationArea.JsoPropertyValue, DiffHighlightingApplicationMode.Default],
])
export const DIFF_HIGHLIGHTING_MODES_JSO_PROPERTY_CHANGED_INDIRECTLY: DiffHighlightingModesByArea = new Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>([
  [DiffHiglightingApplicationArea.JsoPropertyKey, DiffHighlightingApplicationMode.Immutable],
  [DiffHiglightingApplicationArea.JsoPropertyValue, DiffHighlightingApplicationMode.Default],
])
/** Whole-node add/remove flags: side visibility only; badge chrome stays plain. */
export const DIFF_HIGHLIGHTING_MODES_DDL_FLAG_BADGE_SIDE_VISIBILITY_ONLY: DiffHighlightingModesByArea = new Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>([
  [DiffHiglightingApplicationArea.Default, DiffHighlightingApplicationMode.Invisible],
])
/** DDL title rows: highlight the row and keep its name, whatever values the diff holds. */
export const DIFF_HIGHLIGHTING_MODES_DDL_TITLE_ROW: DiffHighlightingModesByArea = new Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>([
  [DiffHiglightingApplicationArea.Default, DiffHighlightingApplicationMode.Immutable],
])

export const NODE_LEVEL_DIFF_KEY = "" as const

export type ChangedPropertyKey<V extends object | boolean | null = object | boolean | null> =
  | typeof NODE_LEVEL_DIFF_KEY
  | (V extends object ? keyof V : never)
export type ChangedPropertyMetaData = {
  data: Diff<DiffType>
  styles: {
    before: DiffStyles
    after: DiffStyles
  }
  flags: {
    before: DiffFlags
    after: DiffFlags
  }
  highlightingMode: Map<DiffHiglightingApplicationArea, DiffHighlightingApplicationMode>
  inherited?: boolean
}
export type NodeDiffs<V extends object | boolean | null = object | boolean | null> = Partial<Record<ChangedPropertyKey<V>, ChangedPropertyMetaData>>

export enum NodeDiffsSeverityPlacemennt {
  TitleRow = 'title-row',
  DescriptionRow = 'description-row',
  /** @deprecated Shared placement used when a node renders at most one `AdditionalInfoRow`. Nodes with several such rows (e.g. JSON Schema's Default/Examples/Allowed values/validation-constraint rows) must use a dedicated placement per row instead - see the `*Row` members below. */
  AdditionalInfoRow = 'additional-info-row',
  SummaryRow = 'summary-row',
  AddressRow = 'address-row',
  BindingVersionRow = 'binding-version-row',
  ServerAddressRow = 'server-address-row',
  NestingIndicatorRow = 'nesting-indicator-row',
  /** JSON Schema `Extensions` nesting-indicator row (the `x-*` sub-tree header). */
  ExtensionsRow = 'extensions-row',
  /** JSON Schema `Default` additional-info row. */
  DefaultRow = 'default-row',
  /** JSON Schema `Allowed values` (enum) additional-info row. */
  EnumRow = 'enum-row',
  /** JSON Schema `Examples` additional-info row. */
  ExamplesRow = 'examples-row',
  /** JSON Schema `Allowed additional property names` row (parent `propertyNames`, shown on the `additionalProperties` child). */
  AllowedAdditionalPropertyNamesRow = 'allowed-additional-property-names-row',
  /** JSON Schema `Value length` validation row. */
  ValueLengthRow = 'value-length-row',
  /** JSON Schema `Value pattern` validation row. */
  ValuePatternRow = 'value-pattern-row',
  /** JSON Schema `Value range` validation row. */
  ValueRangeRow = 'value-range-row',
  /** JSON Schema `Multiple of` validation row. */
  ValueMultipleOfRow = 'value-multiple-of-row',
  /** JSON Schema `Properties count` validation row. */
  PropertiesCountRow = 'properties-count-row',
  /** JSON Schema `Items count` validation row. */
  ItemsCountRow = 'items-count-row',
  /** JSON Schema `Unique items` validation row. */
  UniqueItemsRow = 'unique-items-row',
  /**
   * JSON Schema generic custom-annotation additional-info row (a spec-agnostic extension point -
   * e.g. AsyncAPI's "Location"). Shared across every `customAnnotations` entry on a node; see the
   * accepted v1 limitation on multiple simultaneous entries in `JsonSchemaKindAnyNodeDiffs.customAnnotationDiffs`.
   */
  CustomAnnotationRow = 'custom-annotation-row',
}
export type NodeDiffsSeverity = {
  type: DiffType
  causedAt: JsonPath
}
export type NodeDiffsSeverities = Partial<Record<NodeDiffsSeverityPlacemennt, NodeDiffsSeverity>>

export type NodeDescendantDiffs = Partial<Record<NodeId, ChangedPropertyMetaData>>

export type NodeDescendantDiffsSummary = Set<DiffType>

export type NodeDiffsSummary = Set<DiffType>

export interface ITreeNodeWithDiffs<
  V extends object | boolean | null = object | boolean | null,
  K extends string = string,
  M extends object = object,
  D extends object | boolean | null = object | boolean | null
> extends ITreeNode<V, K, M> {
  parent: ITreeNodeWithDiffs | null
  container: ITreeNodeWithDiffs | null

  diffs: NodeDiffs<D>
  diffsSummary: NodeDiffsSummary
  descendantDiffs: NodeDescendantDiffs
  descendantDiffsSummary: NodeDescendantDiffsSummary
  diffsSeverities: NodeDiffsSeverities

  addDiffsSummary(diffsSummary: NodeDiffsSummary): void
  addDescendantDiffsSummary(descendantDiffsSummary: NodeDescendantDiffsSummary): void

  createCycledClone(
    id: NodeId,
    key: NodeKey,
    parent: ITreeNodeWithDiffs | null,
  ): ITreeNodeWithDiffs<V, K, M, D>

  value(nestedNodeId?: NodeId): V | null;

  meta(): M;

  childrenNodes(nestedNodeId?: NodeId): ITreeNodeWithDiffs<V, K, M, D>[]

  nestedNodes(): ITreeNodeWithDiffs<V, K, M, D>[]

  findNestedNode(nestedNodeId?: NodeId, recursive?: boolean): ITreeNodeWithDiffs<V, K, M, D> | null

  addChildNode(node: ITreeNodeWithDiffs<V, K, M, D>): void

  addNestedNode(node: ITreeNodeWithDiffs<V, K, M, D>): void
}
