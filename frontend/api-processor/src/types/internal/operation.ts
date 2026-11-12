import { DeprecateItem, OperationsApiType } from '../external'
import { ApiAudience } from '../package'
import { OpenAPIV3 } from 'openapi-types'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { ApihubApiCompatibilityKind } from '../../consts'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'

export interface OperationSearch {
  useOperationDataAsSearchText: boolean
  searchTextFilePath?: string
}

export interface ApiOperation<T = any, M = any> {
  operationId: string
  documentId: string
  apiType: OperationsApiType
  apiKind: ApihubApiCompatibilityKind
  deprecated: boolean
  tags: string[]
  metadata: M
  data?: T

  // new properties
  deprecatedItems?: DeprecateItem[]     // deprecated items
  deprecatedInfo?: string
  deprecatedInPreviousVersions?: string[]
  models?: Record<string, string>       // schema models { name: hash }

  // other params (not used in builder logic)
  // [key: string]: unknown

  title: string
  search: OperationSearch
  searchText?: string
  // refPackage?: PackageRef
  // changes?: OperationChanges[]
  // changeSummary?: ChangeSummary
  hasExample?: boolean
  apiAudience?: ApiAudience
  versionInternalDocumentId: string
}

// `Realm` is included so the DDL version-internal / comparison documents serialize through the same
// `serializeDocument` / `denormalize` path as REST (AD3; plan Tasks 3 & 8).
export type ApiDocument = OpenAPIV3.Document | GraphApiSchema | AsyncAPIV3.AsyncAPIObject | Realm
