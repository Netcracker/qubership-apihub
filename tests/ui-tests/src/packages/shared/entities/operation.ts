import type { GraphQlOperationType, OperationsApiType } from '@shared/entities'

export type OperationTest = Operation | GraphQlOperationTest

export type Operation = OperationMetadataTest & RestOperation

export type GraphQlOperationTest = OperationMetadataTest & GraphQlOperation

type OperationMetadataTest = {
  operationId: string
  title: string
  apiType: OperationsApiType
  apiKind: ApiKind
  tags?: string
  changes?: Partial<{
    breaking: {
      description: string
    }
    risky: {
      description: string
    }
    nonBreaking: {
      description: string
    }
    deprecated: {
      description: string
    }
    annotation: {
      description: string
    }
    unclassified: {
      description: string
    }
  }>
  deprecated?: {
    details?: string
    since?: string
  }
  deprecatedItem?: {
    description: string
    since: string
  }
  customMetadata?: string
  testJsonString?: string
  testYamlString?: string
  testExampleString?: string
}

export type RestOperation = {
  method: MethodType
  path: string
}

export type GraphQlOperation = {
  method: string
  type: GraphQlOperationType
}

export type MethodType = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type ApiKind = 'all' | 'bwc' | 'no-bwc' | 'experimental'
