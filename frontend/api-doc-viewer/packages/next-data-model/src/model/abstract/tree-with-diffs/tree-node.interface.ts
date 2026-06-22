import { NodeId, NodeKey } from "@apihub/next-data-model/utility-types";
import { Diff } from "@netcracker/qubership-apihub-api-diff";
import { DiffType } from "@netcracker/qubership-apihub-api-diff/dist/types";
import { JsonPath } from "@netcracker/qubership-apihub-json-crawl";
import { ITreeNode, TreeNodeComplexityTypes, TreeNodeParams } from "../tree/tree-node.interface";

export interface TreeNodeWithDiffsParams<
  V extends object | null,
  K extends string,
  M extends object,
  D extends object | null,
> extends TreeNodeParams<V, K, M> {
  parent: ITreeNodeWithDiffs<V, K, M, D> | null
  container: ITreeNodeWithDiffs<V, K, M, D> | null
}

export interface SimpleTreeNodeWithDiffsParams<
  V extends object | null,
  K extends string,
  M extends object,
  D extends object | null,
> extends TreeNodeWithDiffsParams<V, K, M, D> {
  type: typeof TreeNodeComplexityTypes.SIMPLE
}

export interface ComplexTreeNodeWithDiffsParams<
  V extends object | null,
  K extends string,
  M extends object,
  D extends object | null,
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

export const NODE_LEVEL_DIFF_KEY = "" as const

export type ChangedPropertyKey<V extends object | null = object | null> =
  | typeof NODE_LEVEL_DIFF_KEY
  | (V extends null ? never : keyof V)
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
export type NodeDiffs<V extends object | null = object | null> = Partial<Record<ChangedPropertyKey<V>, ChangedPropertyMetaData>>

export enum NodeDiffsSeverityPlacemennt {
  TitleRow = 'title-row',
  DescriptionRow = 'description-row',
  SummaryRow = 'summary-row',
  AddressRow = 'address-row',
  BindingVersionRow = 'binding-version-row',
  ServerAddressRow = 'server-address-row',
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
  V extends object | null = object | null,
  K extends string = string,
  M extends object = object,
  D extends object | null = object | null
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
