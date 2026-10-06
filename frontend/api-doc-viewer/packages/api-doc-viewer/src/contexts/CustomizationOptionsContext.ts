import { createContext, useContext } from "react"

export const CustomizationOptionsContext = createContext<CustomizationOptions | undefined>(undefined)

export function useCustomizationOptions(): CustomizationOptions | undefined {
  return useContext(CustomizationOptionsContext)
}

export type CustomizationOptions = {
  headerRowTitle?: string
  /**
   * Root-only: suppresses the root node's own title row and the nesting-indicator row before its
   * children, so a synthetic wrapper schema's properties render as a flat top-level list instead
   * of one nested "object" row. Mirrors the removed legacy (api-data-model based) `JsonSchemaViewer`'s
   * `overriddenKind === 'parameters'` behavior for hosts (AsyncAPI message content/parameters,
   * JSO-embedded schema values) that wrap a raw value in `{type: 'object', properties: {...}}`
   * purely to get a property row per key.
   */
  suppressRootNestingIndicator?: boolean
}

/** Shared immutable instance for hosts that only ever need {@link CustomizationOptions.suppressRootNestingIndicator}. */
export const SUPPRESS_ROOT_NESTING_INDICATOR_CUSTOMIZATION_OPTIONS: CustomizationOptions = {
  suppressRootNestingIndicator: true,
}
