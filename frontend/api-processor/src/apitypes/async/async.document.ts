import { DocumentBuilder, DocumentDumper, VersionDocument } from '../../types'
import { FILE_FORMAT } from '../../consts'
import {
  createBundlingErrorHandler,
  createVersionInternalDocument,
  getBundledFileDataWithDependencies,
  getDocumentTitle,
  getStringValue,
  isObject,
} from '../../utils'
import { dump } from '../../utils/apihubSpecificationExtensions'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { AsyncDocumentInfo } from './async.types'
import { toExternalDocumentationObject, toTagObjects } from './async.utils'

const asyncApiDocumentMeta = (data: AsyncAPIV3.AsyncAPIObject): AsyncDocumentInfo => {
  if (!isObject(data)) {
    return { title: '', description: '', version: '', tags: [] }
  }

  const { title = '', version = '', description = '', externalDocs: _externalDocs, tags: _tags, ...otherInfo  } = data.info || {}

  return {
    title: getStringValue(title),
    description: getStringValue(description),
    version: getStringValue(version),
    info: Object.keys(otherInfo ).length ? otherInfo  : undefined,
    externalDocs: toExternalDocumentationObject(data),
    tags: toTagObjects(data),
  }
}

export const buildAsyncApiDocument: DocumentBuilder<AsyncAPIV3.AsyncAPIObject> = async (parsedFile, file, ctx): Promise<VersionDocument> => {
  const { fileId, slug = '', publish = true, apiKind, ...fileMetadata } = file

  const {
    data,
    dependencies,
  } = await getBundledFileDataWithDependencies(fileId, ctx.parsedFileResolver, createBundlingErrorHandler(ctx, slug))

  const bundledFileData = data as AsyncAPIV3.AsyncAPIObject

  const { description, title, version, info, externalDocs, tags } = asyncApiDocumentMeta(bundledFileData)
  const metadata = {
    ...fileMetadata,
    info,
    externalDocs,
    tags,
  }
  const { type, fileId: parsedFileId, source, errors } = parsedFile
  return {
    fileId: parsedFileId,
    type,
    format: FILE_FORMAT.JSON,
    data: bundledFileData,
    slug, // unique slug should be already generated
    apiKind,
    filename: `${slug}.${FILE_FORMAT.JSON}`,
    title: title || getDocumentTitle(fileId),
    operationIds: [],
    dependencies,
    description,
    version,
    metadata,
    publish,
    source,
    errors: errors?.length ?? 0,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

export const dumpAsyncApiDocument: DocumentDumper<AsyncAPIV3.AsyncAPIObject> = (document, format) => {
  return new Blob(...dump(document.data, format ?? FILE_FORMAT.JSON))
}

