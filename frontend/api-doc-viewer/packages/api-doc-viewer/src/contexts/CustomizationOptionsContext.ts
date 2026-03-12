import { createContext, useContext } from "react"

export const CustomizationOptionsContext = createContext<CustomizationOptions | undefined>(undefined)

export function useCustomizationOptions(): CustomizationOptions | undefined {
  return useContext(CustomizationOptionsContext)
}

export type CustomizationOptions = {
  headerRowTitle?: string
}
