import { isNonEmptyString } from "../../utilities"
import { DisplayMode } from "../abstract/display-mode"
import { DisplayModeRowCategories, DisplayModeRows } from "../abstract/display-mode-rows"
import { OpenApiTreeNodeValueTypeOperation, OpenApiTreeNodeValueTypeRequestBody, OpenApiTreeNodeValueTypeResponse } from "./types/node-value"

/** The rows of the operation header block, in their fixed display order. */
export const OPENAPI_OPERATION_HEADER_ROWS = ['title', 'operationId', 'address', 'description', 'externalDocs'] as const

export type OpenApiOperationHeaderRow = typeof OPENAPI_OPERATION_HEADER_ROWS[number]

/** The header row that carries the operation `deprecated` tag. */
export type OpenApiDeprecatedTagRow = Extract<OpenApiOperationHeaderRow, 'title' | 'operationId' | 'address'>

export type OpenApiOperationRowVisibility = {
  readonly showTitle: boolean
  readonly showOperationId: boolean
  readonly showExternalDocs: boolean
  readonly showDescription: boolean
  /** The title row, else the operation ID row, else the always-present address row. */
  readonly deprecatedTagRow: OpenApiDeprecatedTagRow
}

/** Operation header rows by display-mode category: only the description is an annotation. */
export const OPENAPI_OPERATION_HEADER_ROW_CATEGORIES: DisplayModeRowCategories<OpenApiOperationHeaderRow> = {
  title: 'structure',
  operationId: 'structure',
  address: 'structure',
  description: 'annotation',
  externalDocs: 'structure',
}

/** Request body and response rows of the OpenAPI layer by display-mode category. */
export const OPENAPI_DESCRIPTION_ROW_CATEGORIES: DisplayModeRowCategories<'description'> = {
  description: 'annotation',
}

/**
 * Row visibility of the OpenAPI layer. Works for plain and merged trees alike: a merged node value
 * keeps removed values (E18), so "has content on either side" is "has a merged value".
 * Security cards: `OPENAPI_SECURITY_NODE_VISIBILITY` (`./security-presentation`).
 * Display modes: `simple` hides annotations (`OPENAPI_*_ROW_CATEGORIES`).
 * Design: docs/design/openapi/features/diffs.md -> "Row visibility", docs/design/shared/features/display-mode-annotations.md.
 */
export class OpenApiNodeVisibility {
  public static resolveOperation(
    value: OpenApiTreeNodeValueTypeOperation | null,
    noHeading: boolean,
    displayMode: DisplayMode,
  ): OpenApiOperationRowVisibility {
    const shown = DisplayModeRows.apply({
      title: !noHeading && isNonEmptyString(value?.title),
      operationId: isNonEmptyString(value?.operationId),
      address: true,
      description: isNonEmptyString(value?.description),
      externalDocs: isNonEmptyString(value?.externalDocs?.url),
    }, OPENAPI_OPERATION_HEADER_ROW_CATEGORIES, displayMode)
    return {
      showTitle: shown.title,
      showOperationId: shown.operationId,
      showExternalDocs: shown.externalDocs,
      showDescription: shown.description,
      deprecatedTagRow: shown.title ? 'title' : shown.operationId ? 'operationId' : 'address',
    }
  }

  /** The visible header rows in display order (the address row always shows). */
  public static resolveOperationHeaderRows(visibility: OpenApiOperationRowVisibility): OpenApiOperationHeaderRow[] {
    const shown: Readonly<Record<OpenApiOperationHeaderRow, boolean>> = {
      title: visibility.showTitle,
      operationId: visibility.showOperationId,
      address: true,
      description: visibility.showDescription,
      externalDocs: visibility.showExternalDocs,
    }
    return OPENAPI_OPERATION_HEADER_ROWS.filter(row => shown[row])
  }

  public static showRequestBodyDescription(value: OpenApiTreeNodeValueTypeRequestBody | null, displayMode: DisplayMode): boolean {
    return OpenApiNodeVisibility.showDescription(value?.description, displayMode)
  }

  public static showResponseDescription(value: OpenApiTreeNodeValueTypeResponse | null, displayMode: DisplayMode): boolean {
    return OpenApiNodeVisibility.showDescription(value?.description, displayMode)
  }

  private static showDescription(description: string | undefined, displayMode: DisplayMode): boolean {
    return DisplayModeRows.apply({ description: isNonEmptyString(description) }, OPENAPI_DESCRIPTION_ROW_CATEGORIES, displayMode).description
  }
}
