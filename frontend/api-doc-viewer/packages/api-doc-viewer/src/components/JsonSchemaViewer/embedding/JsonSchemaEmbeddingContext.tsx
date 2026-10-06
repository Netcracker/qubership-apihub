import { createContext, useContext } from "react"
import {
  JsonSchemaExtensionsJsoComponent,
  JsonSchemaExtensionsJsoDiffsComponent,
} from "./json-schema-embedding-types"

export type JsonSchemaEmbeddingContextValue = {
  ExtensionsJsoComponent: JsonSchemaExtensionsJsoComponent
  ExtensionsJsoDiffsComponent: JsonSchemaExtensionsJsoDiffsComponent
}

export const JsonSchemaEmbeddingContext = createContext<JsonSchemaEmbeddingContextValue | null>(null)

export function useJsonSchemaEmbeddingContext(): JsonSchemaEmbeddingContextValue {
  const context = useContext(JsonSchemaEmbeddingContext)
  if (!context) {
    throw new Error('useJsonSchemaEmbeddingContext must be used within JsonSchemaViewer or JsonSchemaDiffsViewer')
  }
  return context
}
