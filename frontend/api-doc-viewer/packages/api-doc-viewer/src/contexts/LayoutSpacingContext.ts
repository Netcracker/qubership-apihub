import { LayoutSpacingConfig } from '@netcracker/qubership-apihub-next-data-model/model/abstract/layout'
import { createContext, useContext } from 'react'

/**
 * Numbers and rules of the separator layout (`StackLayout`, security cards), provided by each root
 * viewer that renders one: the OpenAPI roots pass the OpenAPI config, the AsyncAPI roots the shared
 * defaults. No default value: a layout outside a root viewer is a wiring error, not "OpenAPI's numbers".
 */
export const LayoutSpacingContext = createContext<LayoutSpacingConfig<string> | undefined>(undefined)

export function useLayoutSpacing(): LayoutSpacingConfig<string> {
  const spacing = useContext(LayoutSpacingContext)
  if (!spacing) {
    throw new Error('LayoutSpacingContext is not provided: render the layout inside a root viewer')
  }
  return spacing
}
