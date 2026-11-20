import { OpenAPIV3 } from 'openapi-types'

import type { ApiOperation, VersionDocument } from '../../types'
import { REST_DOCUMENT_TYPE } from './rest.consts'
import { NormalizedPath } from '../../utils'
import { CustomTags } from '../../utils/apihubSpecificationExtensions'
import { API_KIND_SPECIFICATION_EXTENSION } from '../../consts'

export type RestDocumentType = (typeof REST_DOCUMENT_TYPE)[keyof typeof REST_DOCUMENT_TYPE]
export type { CustomTags }  //TODOL just use new type for REST

export interface RestOperationMeta {
  path: NormalizedPath                    // `/packages/*/version/*`
  originalPath: string                    // `/packages/{packageId}/version/{version}`
  method: OpenAPIV3.HttpMethods           // `get` | `post` | ...
  tags?: string[]                         // operations tags
  customTags?: CustomTags
  operationIdV1: string                    // operation ID (legacy V1 format)
}

export interface RestDocumentInfo {
  title: string
  description: string
  version: string
  info?: Partial<OpenAPIV3.InfoObject>
  externalDocs?: Partial<OpenAPIV3.ExternalDocumentationObject>
  tags: OpenAPIV3.TagObject[]
}

export type VersionRestDocument = VersionDocument<OpenAPIV3.Document>
export type VersionRestOperation = ApiOperation<RestOperationData, RestOperationMeta>

export interface RestOperationData {
  openapi: string
  info?: OpenAPIV3.InfoObject
  servers?: OpenAPIV3.ServerObject[]
  paths: OpenAPIV3.PathsObject
  components?: OpenAPIV3.ComponentsObject
  security?: OpenAPIV3.SecurityRequirementObject[]
  externalDocs?: OpenAPIV3.ExternalDocumentationObject
  tags?: OpenAPIV3.TagObject[]
}

export interface OperationExtension {
  [API_KIND_SPECIFICATION_EXTENSION]?: string
}
