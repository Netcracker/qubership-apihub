import { LayoutBlockEdge, SharedLayoutLevel } from "../../abstract/layout/types"
import { OpenApiTreeNode, OpenApiTreeNodeWithDiffs } from "../types/aliases"

/**
 * Container levels of the OpenAPI operation layout: the shared ones plus `operation` (the top-level
 * blocks), `operationHeader` (the header rows), `request` and `responses` (their sections).
 */
export type OpenApiLayoutLevel = SharedLayoutLevel | 'operation' | 'operationHeader' | 'request' | 'responses'

/** View state of a collapsible section (Body) as its edges see it: collapsed = its title row only. */
export type OpenApiSectionViewState = {
  readonly expanded: boolean
}

/**
 * One element of a Body (request / response), in render order: `id` says which row the component
 * renders for it; the schema element carries the selected media type whose schema it shows.
 */
export type OpenApiBodyElement =
  | { readonly id: 'title', readonly edge: LayoutBlockEdge }
  | { readonly id: 'description', readonly edge: LayoutBlockEdge }
  | { readonly id: 'schema', readonly edge: LayoutBlockEdge, readonly mediaType: OpenApiTreeNode | OpenApiTreeNodeWithDiffs }

/** The elements of a Body: always its title row first. */
export type OpenApiBodyElements = readonly [OpenApiBodyElement, ...OpenApiBodyElement[]]
