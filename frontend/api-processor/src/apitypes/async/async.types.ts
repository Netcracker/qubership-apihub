import { ApiOperation, VersionDocument } from '../../types'
import { ASYNC_DOCUMENT_TYPE } from './async.consts'
import { CustomTags } from '../../utils/apihubSpecificationExtensions'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'

export type AsyncDocumentType = (typeof ASYNC_DOCUMENT_TYPE)[keyof typeof ASYNC_DOCUMENT_TYPE]
export type AsyncOperationActionType = 'send' | 'receive'

/**
 * AsyncAPI 3.0 operation metadata
 */
export interface AsyncOperationMeta {
  action: AsyncOperationActionType  // Operation action
  channel: string                   // Channel name
  protocol: string                  // Protocol (e.g., 'kafka', 'amqp', 'mqtt')
  customTags: CustomTags            // Custom x-* extensions
  messageId: string                 // Message key from the channel's messages map (e.g., 'UserSignedUp')
  asyncOperationId: string          // Operation key from the AsyncAPI operations map (e.g., 'sendUserSignedup')
}

/**
 * AsyncAPI document info
 */
export interface AsyncDocumentInfo {
  title: string
  description: string
  version: string
  info?: Partial<AsyncAPIV3.InfoObject>
  externalDocs?: Partial<AsyncAPIV3.ExternalDocumentationObject>
  tags: AsyncAPIV3.TagObject[]
}

/**
 * AsyncAPI operation data (single operation spec)
 */
export interface AsyncOperationData {
  asyncapi: string
  id?: string
  info: AsyncAPIV3.InfoObject
  defaultContentType?: string
  servers?: AsyncAPIV3.ServersObject
  channels?: AsyncAPIV3.ChannelsObject
  operations?: AsyncAPIV3.OperationsObject
  components?: AsyncAPIV3.ComponentsObject
  // Root-level specification extensions (`x-*`) from the source AsyncAPI document
  // are copied onto the spec but are not statically typed here.
}

export type VersionAsyncDocument = VersionDocument<AsyncAPIV3.AsyncAPIObject>
export type VersionAsyncOperation = ApiOperation<AsyncOperationData, AsyncOperationMeta>
