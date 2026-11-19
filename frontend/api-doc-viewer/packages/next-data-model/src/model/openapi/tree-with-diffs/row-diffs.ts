import { isDiffRename } from "@netcracker/qubership-apihub-api-diff"
import { LayoutSide } from "../../abstract/layout-side"
import { RowChangedPropertyMetaData } from "../../abstract/tree-with-diffs/row-changed-property-metadata"
import {
  NodeLevelRowDiffs,
  SectionRowDiffs,
  takeFieldDiff,
  takeSideValue,
} from "../../abstract/tree-with-diffs/row-diffs-base"
import {
  ChangedPropertyMetaData,
  HighlightVariant,
  NodeDescendantDiffsSummary,
  NodeDiffsSeverityPlacemennt,
} from "../../abstract/tree-with-diffs/tree-node.interface"
import { OpenApiDeprecatedTagRow, OpenApiOperationHeaderRow } from "../node-visibility"
import { OpenApiTreeNode, OpenApiTreeNodeWithDiffs } from "../types/aliases"
import { OpenApiExternalDocs } from "../types/node-value"
import { OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY, OPENAPI_RESPONSE_OPTIONS_DIFF_KEY } from "./diff-keys"

type AnyOpenApiNode = OpenApiTreeNode | OpenApiTreeNodeWithDiffs

/** A synthetic selector-options field diff as a yellow row on both sides, without a text highlighter. */
function optionsRowReplace(node: AnyOpenApiNode, key: string): ChangedPropertyMetaData | undefined {
  const options = takeFieldDiff(node, key)
  return options ? RowChangedPropertyMetaData.buildRowReplace(options.data) : undefined
}

function toExternalDocs(value: unknown): OpenApiExternalDocs | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const url: unknown = Reflect.get(value, 'url')
  const description: unknown = Reflect.get(value, 'description')
  return typeof url === 'string'
    ? { url, ...(typeof description === 'string' ? { description } : {}) }
    : null
}

class Operation {
  /** Whole operation -> summary -> a deprecated change painted as a yellow title row. */
  public static takeTitleRowDiff(node: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    return NodeLevelRowDiffs.takeWholeNodeDiff(node)
      ?? takeFieldDiff(node, 'title')
      ?? Operation.takeDeprecatedRowReplace(node, 'title', 'title')
  }

  /** Whole operation -> operation ID -> a deprecated change when this row carries the tag (no title row). */
  public static takeOperationIdRowDiff(node: AnyOpenApiNode, deprecatedTagRow: OpenApiDeprecatedTagRow): ChangedPropertyMetaData | undefined {
    return NodeLevelRowDiffs.takeRowDiff(node, 'operationId') ?? Operation.takeDeprecatedRowReplace(node, deprecatedTagRow, 'operationId')
  }

  /** Whole operation -> path -> a deprecated change when this row carries the tag (no title, no operation ID). */
  public static takeAddressRowDiff(node: AnyOpenApiNode, deprecatedTagRow: OpenApiDeprecatedTagRow): ChangedPropertyMetaData | undefined {
    return NodeLevelRowDiffs.takeRowDiff(node, 'path') ?? Operation.takeDeprecatedRowReplace(node, deprecatedTagRow, 'address')
  }

  /**
   * Severity placement of the operation ID row: with the `deprecated` tag merged in when the row
   * carries the tag (the severities aggregator writes both variants; the strongest diff wins).
   */
  public static resolveOperationIdRowSeverityPlacement(deprecatedTagRow: OpenApiDeprecatedTagRow): NodeDiffsSeverityPlacemennt {
    return deprecatedTagRow === 'operationId'
      ? NodeDiffsSeverityPlacemennt.OperationIdRowWithDeprecatedTag
      : NodeDiffsSeverityPlacemennt.OperationIdRow
  }

  /**
   * Severity placement each operation header row renders (its floating badge). One accessor for the
   * rows and the layout edges, so a separator's badge stub always matches the row's real badge.
   */
  public static resolveHeaderRowSeverityPlacement(row: OpenApiOperationHeaderRow, deprecatedTagRow: OpenApiDeprecatedTagRow): NodeDiffsSeverityPlacemennt {
    switch (row) {
      case 'title':
        return NodeDiffsSeverityPlacemennt.TitleRow
      case 'operationId':
        return Operation.resolveOperationIdRowSeverityPlacement(deprecatedTagRow)
      case 'address':
        return Operation.resolveAddressRowSeverityPlacement(deprecatedTagRow)
      case 'description':
        return NodeDiffsSeverityPlacemennt.DescriptionRow
      case 'externalDocs':
        return NodeDiffsSeverityPlacemennt.ExternalDocsRow
    }
  }

  /** Severity placement of the address row, as {@link resolveOperationIdRowSeverityPlacement}. */
  public static resolveAddressRowSeverityPlacement(deprecatedTagRow: OpenApiDeprecatedTagRow): NodeDiffsSeverityPlacemennt {
    return deprecatedTagRow === 'address'
      ? NodeDiffsSeverityPlacemennt.AddressRowWithDeprecatedTag
      : NodeDiffsSeverityPlacemennt.AddressRow
  }

  /** The row diff of one operation header row (the diff that paints it). */
  public static takeHeaderRowDiff(node: AnyOpenApiNode, row: OpenApiOperationHeaderRow, deprecatedTagRow: OpenApiDeprecatedTagRow): ChangedPropertyMetaData | undefined {
    switch (row) {
      case 'title':
        return Operation.takeTitleRowDiff(node)
      case 'operationId':
        return Operation.takeOperationIdRowDiff(node, deprecatedTagRow)
      case 'address':
        return Operation.takeAddressRowDiff(node, deprecatedTagRow)
      case 'description':
        return Operation.takeDescriptionRowDiff(node)
      case 'externalDocs':
        return Operation.takeExternalDocsRowDiff(node)
    }
  }

  /**
   * A deprecated change as a yellow row (no text highlighter) on the row that carries the tag
   * (`buildRowReplace` keeps the row's text on both sides).
   */
  private static takeDeprecatedRowReplace(node: AnyOpenApiNode, deprecatedTagRow: OpenApiDeprecatedTagRow, row: OpenApiDeprecatedTagRow): ChangedPropertyMetaData | undefined {
    const deprecated = takeFieldDiff(node, 'deprecated')?.data
    return deprecated && deprecatedTagRow === row
      ? RowChangedPropertyMetaData.buildRowReplace(deprecated)
      : undefined
  }

  public static takeDescriptionRowDiff(node: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    return NodeLevelRowDiffs.takeRowDiff(node, 'description')
  }

  /** The deprecated tag's own diff; never borrowed from the node. */
  public static takeDeprecatedTagDiff(node: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    return takeFieldDiff(node, 'deprecated')
  }

  public static isDeprecatedOnSide(node: AnyOpenApiNode, side: LayoutSide): boolean {
    return NodeLevelRowDiffs.isFlagOnSide(node, 'deprecated', side)
  }

  /**
   * Row diff of the external docs link: a whole add / remove, or a replace of the URL or of the
   * description (Q16, option A: the row is yellow and the link text highlighted; each side's tooltip
   * shows its own description).
   */
  public static takeExternalDocsRowDiff(node: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    return takeFieldDiff(node, 'externalDocs') ?? NodeLevelRowDiffs.takeWholeNodeDiff(node)
  }

  public static resolveExternalDocsSide(node: AnyOpenApiNode, side: LayoutSide): OpenApiExternalDocs | null {
    if (!NodeLevelRowDiffs.isPresentOnSide(node, side)) {
      return null
    }
    const diff = takeFieldDiff(node, 'externalDocs')?.data
    if (!diff || isDiffRename(diff)) {
      const value = node.value()
      return toExternalDocs(value && 'externalDocs' in value ? value.externalDocs : undefined)
    }
    return toExternalDocs(takeSideValue(diff, side))
  }
}

class RequestBody {
  /**
   * Whole body add / remove -> a required change or a media-type option wholly added / removed /
   * renamed, painted as a yellow header row.
   */
  public static takeHeaderRowDiff(node: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    const required = takeFieldDiff(node, 'required')
    return SectionRowDiffs.takeHeaderRowDiff(node)
      ?? (required ? RowChangedPropertyMetaData.buildRowReplace(required.data) : undefined)
      ?? optionsRowReplace(node, OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY)
  }

  /** Side-exclusive required star. */
  public static isRequiredStarVisibleOnSide(node: AnyOpenApiNode, side: LayoutSide): boolean {
    return NodeLevelRowDiffs.isFlagOnSide(node, 'required', side)
  }

  /** The `required` tag: only for a required change of a body that exists on both sides. */
  public static takeRequiredTagDiff(node: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    return SectionRowDiffs.takeHeaderRowDiff(node) ? undefined : takeFieldDiff(node, 'required')
  }
}

class ResponseBody {
  /** Response Body header (painted by its `content` node): whole add / remove -> a media-type option wholly added / removed / renamed (yellow row). */
  public static takeHeaderRowDiff(content: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    return SectionRowDiffs.takeHeaderRowDiff(content) ?? optionsRowReplace(content, OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY)
  }
}

class MediaType {
  /** Title of a media-type option per side (rename aware). */
  public static resolveSideTitle(node: AnyOpenApiNode, side: LayoutSide): string {
    return NodeLevelRowDiffs.resolveSideKey(node, side)
  }

  /** Text highlighter of the option title: yellow on both sides of a renamed media type. */
  public static resolveSideTitleHighlight(node: AnyOpenApiNode, side: LayoutSide): Exclude<HighlightVariant, HighlightVariant.Gray> | undefined {
    return NodeLevelRowDiffs.resolveSideKeyHighlight(node, side)
  }

  /**
   * Inner changes of the media type only (its schema and cloned extensions): the option's own add /
   * remove / rename is shown by its border shadow / per-side title and the yellow Body row, never by
   * the marker. Empty for a wholly added / removed / inherited option.
   */
  public static takeChangesMarkerSummary(node: AnyOpenApiNode): NodeDescendantDiffsSummary {
    return NodeLevelRowDiffs.takeChangesMarkerSummary(node)
  }
}

class Responses {
  /** Responses title row: whole add / remove -> a response-code option wholly added / removed / renamed (yellow row). */
  public static takeTitleRowDiff(node: AnyOpenApiNode): ChangedPropertyMetaData | undefined {
    return SectionRowDiffs.takeHeaderRowDiff(node) ?? optionsRowReplace(node, OPENAPI_RESPONSE_OPTIONS_DIFF_KEY)
  }
}

class Response {
  /** Code of a response option per side (rename aware, e.g. `4xx` -> `4XX`). */
  public static resolveSideCode(node: AnyOpenApiNode, side: LayoutSide): string {
    return NodeLevelRowDiffs.resolveSideKey(node, side)
  }

  /** Text highlighter of the code: yellow on both sides of a renamed code. */
  public static resolveSideCodeHighlight(node: AnyOpenApiNode, side: LayoutSide): Exclude<HighlightVariant, HighlightVariant.Gray> | undefined {
    return NodeLevelRowDiffs.resolveSideKeyHighlight(node, side)
  }

  /**
   * Whether the option keeps its response-code tone: false for a response wholly added / removed on
   * its own (default look, green / red border shadow only). Inherited whole changes keep the tone.
   */
  public static keepsCodeTone(node: AnyOpenApiNode): boolean {
    return !NodeLevelRowDiffs.isOwnWholeChange(node)
  }

  /** Inner changes of the response only - empty for a wholly added / removed / inherited response. */
  public static takeChangesMarkerSummary(node: AnyOpenApiNode): NodeDescendantDiffsSummary {
    return NodeLevelRowDiffs.takeChangesMarkerSummary(node)
  }
}

/**
 * Row-level diff accessors of the OpenAPI tree. Viewer containers read these instead of
 * `node.diffs[...]`, so row semantics stay in the data layer. The Security section's accessors are
 * the spec-neutral `SecurityRowDiffs` (`../../security/tree-with-diffs/row-diffs`).
 * Design: docs/design/openapi/features/diffs.md -> "Row diff accessors".
 */
export class OpenApiRowDiffs {
  public static readonly NodeLevel = NodeLevelRowDiffs
  public static readonly Section = SectionRowDiffs
  public static readonly Operation = Operation
  public static readonly RequestBody = RequestBody
  public static readonly ResponseBody = ResponseBody
  public static readonly MediaType = MediaType
  public static readonly Responses = Responses
  public static readonly Response = Response
}
