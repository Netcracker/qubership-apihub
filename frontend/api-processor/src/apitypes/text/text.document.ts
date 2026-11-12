import { DocumentBuilder, DocumentDumper, VersionDocument } from '../../types'
import { TEXT_DOCUMENT_TYPE } from './text.consts'
import { createVersionInternalDocument } from '../../utils'

export const buildTextDocument: DocumentBuilder<string> = async (parsedFile, file): Promise<VersionDocument<string>> => {
  const { fileId, slug = '', publish = true, ...metadata } = file
  return {
    fileId,
    type: TEXT_DOCUMENT_TYPE.MARKDOWN,
    format: parsedFile.format,
    data: '',
    slug,
    publish,
    filename: fileId,
    title: fileId.split('/').pop()!.replace(/\.[^/.]+$/, ''),
    dependencies: [],
    description: parsedFile.data,
    operationIds: [],
    metadata,
    source: parsedFile.source,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

export const dumpTextDocument: DocumentDumper<string> = (document) => {
  return new Blob([document.description], { type: 'text/plain' })
}
