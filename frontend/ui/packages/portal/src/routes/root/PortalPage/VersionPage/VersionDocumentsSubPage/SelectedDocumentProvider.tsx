import { createContext, useContext } from 'react'
import type { Document } from '@portal/entities/documents'

type NullableDocument = Document | null

export const SelectedDocumentContext = createContext<NullableDocument>(null)

export function useSelectedDocument(): NullableDocument {
  return useContext(SelectedDocumentContext)
}
