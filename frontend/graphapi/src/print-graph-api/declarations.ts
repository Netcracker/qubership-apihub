import { GraphApiComponents } from "../types"

export const BUILT_IN_SCALARS = ["Int", "Float", "Boolean", "String", "ID"] as const

export const NAMED_TYPE_COMPONENT_KINDS =
  [
    "scalars",
    "objects",
    "interfaces",
    "unions",
    "enums",
    "inputObjects"
  ] as const

// Keep this derived from NAMED_TYPE_COMPONENT_KINDS so name-collision checks
// automatically cover every named type (add new named kinds there, not here).
export const GRAPH_API_COMPONENT_KINDS =
  [
    "directives",
    ...NAMED_TYPE_COMPONENT_KINDS
  ] as const

export const GRAPH_API_DEFAULT_INDENT = '  '

export type TypePrinter<T = any> = (name: string, type: T, components?: GraphApiComponents) => string

export type Maybe<T> = null | undefined | T
