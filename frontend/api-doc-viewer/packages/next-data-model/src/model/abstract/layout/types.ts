import { DiffType } from "@netcracker/qubership-apihub-api-diff"
import { HighlightVariant } from "../tree-with-diffs/tree-node.interface"

/**
 * Types of the separator layout plan, shared by every row-based viewer that plans its vertical gaps
 * (the OpenAPI operation, the Security sections of OpenAPI and AsyncAPI): elements (rows, cards,
 * nested viewers) grouped into blocks, the separator rows between them, and the card frame rows.
 * Design: docs/design/openapi/features/vertical-gaps.md -> "Algorithm".
 */

/** Background of a row on one side: green / red / yellow / gray, or `undefined` = unchanged. */
export type LayoutSideTone = HighlightVariant | undefined

export type LayoutEdgeTones = {
  readonly before: LayoutSideTone
  readonly after: LayoutSideTone
}

/**
 * What a layout stacks: a row, a security card (seen from outside its border), or a nested JSON
 * Schema / JSO viewer. The kind decides the element's own half-gap (config `halfGap`).
 */
export type LayoutElementKind = 'row' | 'card' | 'nested'

/** The top or bottom edge of a block: the element there, its own tones and floating badge. */
export type LayoutBlockEdge = {
  readonly kind: LayoutElementKind
  readonly tones: LayoutEdgeTones
  /** Diff type of the floating badge the edge element shows (one per row, both sides); absent = none. */
  readonly badge?: DiffType
}

/** The edges of a block, as the planner sees it. */
export type LayoutBlockEdgePair = {
  readonly head: LayoutBlockEdge
  readonly tail: LayoutBlockEdge
}

/** A block to plan (one element, or a container of planned children); `payload` is what the consumer renders it from. */
export type LayoutBlock<TPayload> = LayoutBlockEdgePair & {
  readonly id: string
  readonly payload: TPayload
}

/**
 * Container levels every separator layout has: `security` (a Security section), `section` (the rows
 * of a subsection), `card` (inside a framed card). An API type adds its own levels.
 */
export type SharedLayoutLevel = 'security' | 'section' | 'card'

/** One coloured band of a separator side. */
export type LayoutBand = {
  readonly height: number
  readonly tone: LayoutSideTone
}

/** One segment of a decorative badge stub (no hover, no text); no `type` = no bar there. */
export type LayoutBadgeSegment = {
  readonly height: number
  readonly type?: DiffType
}

/**
 * A content-less row: per side a stack of bands, both summing to `height`, plus one badge stub stack
 * for the whole row (the floating badge is per row, not per side). `signature` encodes every band and
 * badge segment: equal separators have equal signatures, so consumers memoise on it.
 */
export type LayoutSeparatorRow = {
  readonly height: number
  readonly before: readonly LayoutBand[]
  readonly after: readonly LayoutBand[]
  readonly badge: readonly LayoutBadgeSegment[]
  readonly signature: string
}

/** A card opening / closing row (inside the border): its height, tones and badge stub. */
export type LayoutFrameRow = {
  readonly height: number
  readonly tones: LayoutEdgeTones
  /** A full-height badge stub: the whole card's badge when it is wholly added / removed. */
  readonly badge?: DiffType
}

/** Planning options of one level. */
export type LayoutPlanOptions = {
  /** Also emit the first element's upper half and the last element's lower half (viewer edges, inside a card). */
  readonly outerHalves?: boolean
}

export type LayoutItem<TPayload> =
  | { readonly type: 'block', readonly block: LayoutBlock<TPayload> }
  | { readonly type: 'separator', readonly id: string, readonly separator: LayoutSeparatorRow }
