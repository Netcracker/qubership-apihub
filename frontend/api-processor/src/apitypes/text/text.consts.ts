import { KeyOfConstType } from '../../types'

export const TEXT_API_TYPE = 'text' as const

export const TEXT_DOCUMENT_TYPE = {
  MARKDOWN: 'markdown',
} as const

export type TextDocumentType = KeyOfConstType<typeof TEXT_DOCUMENT_TYPE>

export const TEXT_FILE_FORMAT = {
  MD: 'md',
} as const
