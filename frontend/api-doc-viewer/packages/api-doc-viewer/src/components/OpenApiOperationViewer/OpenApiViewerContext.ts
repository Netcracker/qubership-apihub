import { DEFAULT_OPENAPI_SPACING_CONFIG, OpenApiSpacingConfig } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { createContext, useContext } from "react"

/** Values the nested OpenAPI containers need from the root viewer. */
export type OpenApiViewerContextValue = {
  readonly devMode: boolean
  /** Forwarded to nested JSON Schema viewers; their own default when omitted. */
  readonly expandedDepth?: number
  /** Forwarded to nested `JsonSchemaDiffsViewer`s; their own default when omitted. */
  readonly hideUnchangedNodes?: boolean
  /** Vertical layout numbers and rules (row padding, separators, card frame rows). */
  readonly spacing: OpenApiSpacingConfig
}

export const OpenApiViewerContext = createContext<OpenApiViewerContextValue>({ devMode: false, spacing: DEFAULT_OPENAPI_SPACING_CONFIG })

export function useOpenApiViewerContext(): OpenApiViewerContextValue {
  return useContext(OpenApiViewerContext)
}
