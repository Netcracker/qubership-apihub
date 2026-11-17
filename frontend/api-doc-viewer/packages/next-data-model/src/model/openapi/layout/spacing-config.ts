import { DEFAULT_LAYOUT_SPACING_CONFIG, LayoutSpacingConfig } from "../../abstract/layout/spacing-config"
import { OpenApiLayoutLevel } from "./types"

/**
 * Every adjustable number and rule of the OpenAPI vertical layout, in one object: the shared
 * separator layout config over the OpenAPI levels, plus the OpenAPI-only entries. Change the look by
 * editing `DEFAULT_OPENAPI_SPACING_CONFIG` (or merging an override over it); the planner and the
 * viewer read only this. Design: docs/design/openapi/features/vertical-gaps.md -> "Configuration".
 */
export type OpenApiSpacingConfig = LayoutSpacingConfig<OpenApiLayoutLevel> & {
  /** Inset of a nested JSON Schema viewer's first row under an OpenAPI row (px; its own row padding). */
  readonly nestedViewerInset: number
  /** Keep the first element's upper half and the last element's lower half at the viewer's top / bottom. */
  readonly viewerEdges: boolean
  /**
   * Expander column of the collapsible 2nd-level sections (parameter groups, Body, response Headers /
   * Extensions, Responses Object Extensions): its fixed `width` and the title row's `gap` after it
   * (`gap-2` of the row) — px. Their content is indented by both (`OpenApiSpacing.sectionContentIndent`).
   */
  readonly sectionExpander: { readonly width: number, readonly gap: number }
}

export const DEFAULT_OPENAPI_SPACING_CONFIG: OpenApiSpacingConfig = {
  ...DEFAULT_LAYOUT_SPACING_CONFIG,
  // EXPERIMENT (x2 separators): 8 + 8 + 8 = 24 between the top-level blocks; 8 + 8 = 16 everywhere
  // else; 8 next to a nested viewer. Baseline: halfGap { row: 4, card: 4, nested: 0 }, operation 4.
  halfGap: { row: 8, card: 8, nested: 0 },
  levelGap: { ...DEFAULT_LAYOUT_SPACING_CONFIG.levelGap, operation: 8, operationHeader: 0, request: 0, responses: 0 },
  nestedViewerInset: 4,
  viewerEdges: true,
  sectionExpander: { width: 16, gap: 8 },
  // A level gap takes the neighbours' tone / badge only when both match; otherwise it stays white with
  // no badge stub, so a changed row at a block edge is coloured 8 / 8 like a row inside a block.
  splitBands: (above, below, height) => [{ height, tone: above === below ? above : undefined }],
  splitBadge: (above, below, height) => [{ height, type: above === below ? above : undefined }],
}

export class OpenApiSpacing {
  /** Indent of a collapsible section's content: it stays under the title text, past the expander column. */
  public static sectionContentIndent(config: OpenApiSpacingConfig): number {
    return config.sectionExpander.width + config.sectionExpander.gap
  }

  /** The default config with some entries replaced. */
  public static withOverrides(overrides: Partial<OpenApiSpacingConfig>): OpenApiSpacingConfig {
    return { ...DEFAULT_OPENAPI_SPACING_CONFIG, ...overrides }
  }
}
