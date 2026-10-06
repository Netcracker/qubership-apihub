import { createContext, useContext } from "react"
import { JsoEmbeddedSchemaComponent, JsoEmbeddedSchemaDiffsComponent } from "./jso-embedding-types"

export type JsoEmbeddingContextValue = {
  EmbeddedSchemaComponent?: JsoEmbeddedSchemaComponent
  EmbeddedSchemaDiffsComponent?: JsoEmbeddedSchemaDiffsComponent
}

export const JsoEmbeddingContext = createContext<JsoEmbeddingContextValue>({})

export function useJsoEmbeddingContext(): JsoEmbeddingContextValue {
  return useContext(JsoEmbeddingContext)
}
