import { BuildConfigFile, DocumentBuilder, DocumentDumper, SourceFile, VersionDocument } from '../../types'
import {
  createBundlingErrorHandler,
  createVersionInternalDocument,
  getBundledFileDataWithDependencies,
  getDocumentTitle,
  isObject,
  isString,
} from '../../utils'
import { FILE_FORMAT } from '../../consts'

export const buildUnknownDocument: DocumentBuilder<unknown> = async (parsedFile, file, ctx): Promise<VersionDocument> => {
  const { fileId, slug = '', publish, ...metadata } = file
  const { type, format, source } = parsedFile
  const parsedData = parsedFile.data

  let description = ''
  let dependencies: string[] = []
  let bundledFileData = undefined

  if (format === FILE_FORMAT.JSON || format === FILE_FORMAT.YAML) {
    description = isObject(parsedData) && isString(parsedData.description) ? parsedData.description : ''

    if (ctx.configuration?.bundleComponents) {
      const {
        data,
        dependencies: fileDependencies,
      } = await getBundledFileDataWithDependencies(fileId, ctx.parsedFileResolver, createBundlingErrorHandler(ctx, slug))
      bundledFileData = data
      dependencies = fileDependencies
    }
  }

  return {
    fileId,
    type,
    format,
    data: bundledFileData || parsedData || '',
    slug,
    publish,
    filename: fileId,
    title: getDocumentTitle(fileId),
    dependencies,
    description,
    operationIds: [],
    metadata,
    errors: parsedFile.errors?.length ?? 0,
    source,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

export const buildBinaryDocument: (parsedFile: SourceFile, file: BuildConfigFile) => Promise<VersionDocument> = async (parsedFile, file): Promise<VersionDocument> => {
  const { fileId, slug = '', publish, ...metadata } = file
  const { type, format, source } = parsedFile

  return {
    data: '',
    fileId,
    type,
    format,
    slug,
    title: getDocumentTitle(fileId),
    dependencies: [],
    description: '',
    operationIds: [],
    publish,
    filename: fileId,
    metadata,
    source,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

// A sourceless document is a file that could not be fetched at all: it ships as a zero-byte entry, and the
// notification says why.
export const dumpUnknownDocument: DocumentDumper<unknown> = (document) => document.source ?? new Blob([])
