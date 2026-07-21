import { GraphApiComponents } from "../types"

export const BUILT_IN_SCALARS = ["Int", "Float", "Boolean", "String", "ID"] as const

export const GRAPH_API_COMPONENT_KINDS =
  [
    "directives",
    "scalars",
    "objects",
    "interfaces",
    "unions",
    "enums",
    "inputObjects"
  ] as const

export const GRAPH_API_DEFAULT_INDENT = '  '

export type TypePrinter<T = any> = (name: string, type: T, components?: GraphApiComponents) => string

export type Maybe<T> = null | undefined | T
